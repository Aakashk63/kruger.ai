require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from current directory
app.use(express.static(__dirname));

// MongoDB Atlas Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://pavanskumar547_db_user:rampavan123@cluster0.8namazy.mongodb.net/image_generation?retryWrites=true&w=majority&appName=Cluster0';

let dbStatus = {
  error: null,
  databaseName: 'image_generation'
};

function connectDB() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }
  console.log('Connecting to MongoDB Atlas (image_generation)...');
  mongoose.connect(MONGO_URI)
    .then((conn) => {
      dbStatus.databaseName = conn.connection.name;
      dbStatus.error = null;
      console.log(`✅ MongoDB Atlas Connected successfully! Database: ${conn.connection.name}`);
    })
    .catch((err) => {
      dbStatus.error = err.message;
      console.error('❌ MongoDB Atlas Connection Error:', err.message);
    });
}

connectDB();

mongoose.connection.on('connected', () => {
  dbStatus.error = null;
  dbStatus.databaseName = mongoose.connection.name || 'image_generation';
  console.log(`✅ MongoDB Atlas connection active. Database: ${dbStatus.databaseName}`);
});

mongoose.connection.on('error', (err) => {
  dbStatus.error = err.message;
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Reconnecting in 3s...');
  setTimeout(connectDB, 3000);
});

// Schema matching MongoDB structure (Database: image_generation, Collection: "generated data")
const generatedDataSchema = new mongoose.Schema({
  prompt: { type: String, required: true, trim: true },
  title: { type: String, default: 'Generated AI Photo', trim: true },
  image: { type: String, required: true }, // Base64 image data string or URL
  data: { type: Buffer },                  // Binary buffer
  contentType: { type: String, default: 'image/png' },
  size: { type: Number, default: 0 },
  platform: { type: String, default: 'Instagram' },
  createdAt: { type: Date, default: Date.now },
  timestamp: { type: Number, default: () => Date.now() },
  publicUrl: { type: String }
}, { collection: 'generated data' });

generatedDataSchema.index({ prompt: 'text', title: 'text' });

const GeneratedData = mongoose.models.GeneratedData || mongoose.model('GeneratedData', generatedDataSchema, 'generated data');

// Configure Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Robust Helper function to parse Base64 or URL image inputs
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
  if (!isConnected && mongoose.connection.readyState === 0) {
    connectDB();
  }
  res.json({
    status: isConnected ? 'online' : 'offline',
    connected: isConnected,
    error: dbStatus.error,
    database: mongoose.connection.name || dbStatus.databaseName,
    collection: 'generated data'
  });
});

// Save Generated Image and User Prompt to MongoDB Atlas ("image_generation" -> "generated data")
app.post('/api/save-image', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      connectDB();
      return res.status(503).json({ error: 'Connecting to MongoDB Atlas... Please retry in a moment.' });
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
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const publicUrl = `${protocol}://${host}/api/images/${saved._id}/file`;

    saved.publicUrl = publicUrl;
    await saved.save();

    console.log(`[MongoDB Atlas] Automatically stored prompt & image in "image_generation"."generated data"! ID: ${saved._id}`);

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
    console.error('Save Generated Data Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save to MongoDB Atlas' });
  }
});

// Multipart File Upload Endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      connectDB();
      return res.status(503).json({ error: 'Connecting to MongoDB Atlas...' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const { prompt, platform } = req.body;
    const base64Str = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const newDoc = new GeneratedData({
      prompt: prompt || req.file.originalname,
      title: req.file.originalname,
      image: base64Str,
      data: req.file.buffer,
      contentType: req.file.mimetype,
      size: req.file.size,
      platform: platform || 'Instagram',
      createdAt: new Date(),
      timestamp: Date.now()
    });

    const saved = await newDoc.save();
    const publicUrl = `${req.protocol}://${req.get('host')}/api/images/${saved._id}/file`;
    saved.publicUrl = publicUrl;
    await saved.save();

    res.status(201).json({
      message: 'Image uploaded and stored in MongoDB Atlas!',
      data: {
        _id: saved._id,
        prompt: saved.prompt,
        platform: saved.platform,
        createdAt: saved.createdAt,
        timestamp: saved.timestamp,
        publicUrl: saved.publicUrl
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List All Generated Data
app.get('/api/images', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      connectDB();
      return res.status(503).json({ error: 'Database disconnected.' });
    }

    const items = await GeneratedData.find().select('-data -image').sort({ createdAt: -1 });

    const host = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;

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
    res.status(500).json({ error: 'Failed to retrieve generated data' });
  }
});

// Serve Public Image File directly from MongoDB Atlas
app.get('/api/images/:id/file', async (req, res) => {
  try {
    const item = await GeneratedData.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Image not found');
    }

    if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))) {
      return res.redirect(item.image);
    }

    let buffer = item.data;
    if ((!buffer || buffer.length === 0) && item.image) {
      const match = item.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (match) {
        buffer = Buffer.from(match[2], 'base64');
      }
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

// Download Endpoint
app.get('/api/images/:id/download', async (req, res) => {
  try {
    const item = await GeneratedData.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Image not found');
    }

    let buffer = item.data;
    if (!buffer && item.image) {
      const match = item.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (match) buffer = Buffer.from(match[2], 'base64');
    }

    res.set({
      'Content-Type': item.contentType || 'image/png',
      'Content-Disposition': `attachment; filename="generated_${item._id}.png"`,
      'Content-Length': buffer ? buffer.length : 0
    });

    res.send(buffer);
  } catch (error) {
    res.status(500).send('Error downloading image');
  }
});

// Fallback SPA route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Kruger.ai Server running at http://localhost:${PORT}`);
});
