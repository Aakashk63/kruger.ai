require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Atlas Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://pavanskumar547_db_user:rampavan123@cluster0.8namazy.mongodb.net/image_generation?retryWrites=true&w=majority&appName=Cluster0';

// Serverless Mongoose connection caching
let cachedPromise = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false
    }).then(m => m.connection);
  }
  try {
    return await cachedPromise;
  } catch (err) {
    cachedPromise = null;
    throw err;
  }
}

// Middleware to ensure DB connection per API request
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectToDatabase();
    } catch (err) {
      console.error('Vercel Serverless MongoDB Atlas Connection Error:', err.message);
    }
  }
  next();
});

// Mongoose Schema (Collection: "generated data")
const generatedDataSchema = new mongoose.Schema({
  prompt: { type: String, required: true, trim: true },
  title: { type: String, default: 'Generated AI Photo', trim: true },
  image: { type: String, required: true }, // Base64 image string or URL
  data: { type: Buffer },                  // Binary buffer
  contentType: { type: String, default: 'image/png' },
  size: { type: Number, default: 0 },
  platform: { type: String, default: 'Instagram' },
  createdAt: { type: Date, default: Date.now },
  timestamp: { type: Number, default: () => Date.now() },
  publicUrl: { type: String }
}, { collection: 'generated data' });

const GeneratedData = mongoose.models.GeneratedData || mongoose.model('GeneratedData', generatedDataSchema, 'generated data');

// Robust Helper to parse base64 or URL image inputs
function parseBase64Image(dataString) {
  if (!dataString) {
    return {
      contentType: 'image/png',
      buffer: Buffer.from([]),
      fullDataUrl: ''
    };
  }

  // Handle direct Data URL
  const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      contentType: matches[1],
      buffer: Buffer.from(matches[2], 'base64'),
      fullDataUrl: dataString
    };
  }

  // Handle HTTP/HTTPS external image URLs
  if (dataString.startsWith('http://') || dataString.startsWith('https://')) {
    return {
      contentType: 'image/png',
      buffer: Buffer.from([]),
      fullDataUrl: dataString
    };
  }

  // Handle raw base64 string
  const cleanStr = dataString.replace(/^data:image\/\w+;base64,/, '').trim();
  const defaultUrl = dataString.startsWith('data:') ? dataString : `data:image/png;base64,${cleanStr}`;
  let buf;
  try {
    buf = Buffer.from(cleanStr, 'base64');
  } catch (e) {
    buf = Buffer.from([]);
  }

  return {
    contentType: 'image/png',
    buffer: buf,
    fullDataUrl: defaultUrl
  };
}

// API Routes

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'online' : 'offline',
    connected: isConnected,
    database: mongoose.connection.name || 'image_generation',
    collection: 'generated data'
  });
});

// Save Generated Image & Prompt to MongoDB Atlas
app.post('/api/save-image', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      try {
        await connectToDatabase();
      } catch (dbErr) {
        return res.status(503).json({ error: 'MongoDB Atlas connection initializing... Please retry in a moment.' });
      }
    }

    const { imageData, prompt, title, platform } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided.' });
    }
    const cleanPrompt = (prompt && prompt.trim()) ? prompt.trim() : 'Generated AI Photo';
    const parsed = parseBase64Image(imageData);

    const newDoc = new GeneratedData({
      prompt: cleanPrompt,
      title: title || cleanPrompt.substring(0, 50),
      image: parsed.fullDataUrl,
      data: parsed.buffer,
      contentType: parsed.contentType,
      size: parsed.buffer.length,
      platform: platform || 'Instagram',
      createdAt: new Date(),
      timestamp: Date.now()
    });

    const saved = await newDoc.save();

    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const publicUrl = `${protocol}://${host}/api/images/${saved._id}/file`;

    saved.publicUrl = publicUrl;
    await saved.save();

    console.log(`[MongoDB Atlas] Successfully stored in "image_generation"."generated data"! ID: ${saved._id}`);

    res.status(201).json({
      message: 'Generated image and prompt automatically stored in MongoDB Atlas!',
      data: {
        _id: saved._id,
        prompt: saved.prompt,
        image: saved.image ? (saved.image.substring(0, 60) + '...') : '',
        platform: saved.platform,
        createdAt: saved.createdAt,
        timestamp: saved.timestamp,
        publicUrl: saved.publicUrl,
        url: `/api/images/${saved._id}/file`
      }
    });
  } catch (error) {
    console.error('Save Image Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save to MongoDB Atlas' });
  }
});

// List All Images (Lightweight for Gallery Modal)
app.get('/api/images', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      try { await connectToDatabase(); } catch (e) {}
    }

    const items = await GeneratedData.find().select('-data -image').sort({ createdAt: -1 });

    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || 'https';

    const formatted = items.map(item => ({
      _id: item._id,
      prompt: item.prompt,
      title: item.title,
      platform: item.platform,
      createdAt: item.createdAt,
      timestamp: item.timestamp,
      publicUrl: item.publicUrl || `${protocol}://${host}/api/images/${item._id}/file`,
      url: `/api/images/${item._id}/file`
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get Images Error:', error);
    res.status(500).json({ error: 'Failed to retrieve generated data' });
  }
});

// Serve Public Image File directly
app.get('/api/images/:id/file', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      try { await connectToDatabase(); } catch (e) {}
    }

    const item = await GeneratedData.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Image not found');
    }

    // If external URL stored
    if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))) {
      return res.redirect(item.image);
    }

    let buffer = item.data;
    if ((!buffer || buffer.length === 0) && item.image) {
      const match = item.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (match) buffer = Buffer.from(match[2], 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(404).send('Image data missing');
    }

    res.set({
      'Content-Type': item.contentType || 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable'
    });

    res.send(buffer);
  } catch (error) {
    res.status(500).send('Error serving image');
  }
});

// Delete Image
app.delete('/api/images/:id', async (req, res) => {
  try {
    const deleted = await GeneratedData.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json({ message: 'Deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Catch-all 404 for API routes
app.use((req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Export App for Vercel Serverless Function
module.exports = app;
