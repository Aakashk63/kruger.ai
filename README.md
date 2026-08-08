# Kruger.ai - AI Image & Social Content Platform 🚀

Kruger.ai is a social media content generation web application integrated with **MongoDB Atlas** for persistent cloud storage and dynamic public URL generation.

---

## 🌟 Key Features

- **Automated MongoDB Atlas Integration**: Automatically saves generated base64 images and user prompts to MongoDB Atlas (`image_generation` database ➔ `generated data` collection).
- **Public Image URLs**: Generates unique, shareable public streaming URLs (`/api/images/<ID>/file`).
- **Interactive Cloud Gallery & Lightbox**:
  - View all stored images and prompts in a sleek modal gallery (`🖼️ View Gallery`).
  - Search prompts in real-time.
  - Inspect high-resolution images in a full-screen Lightbox.
  - 1-click **📋 Copy Public URL** and **⬇️ Download** buttons.
- **Vite & Vercel Serverless Architecture**: Configured for deployment on Vercel with optimized serverless connection pooling.

---

## 🛠️ Technology Stack

- **Frontend**: Vite, HTML5, CSS3 (Glassmorphism design system).
- **Backend API**: Node.js, MongoDb.
- **Database**: MongoDB Atlas (`image_generation` database, `generated data` collection).
- **Deployment**: Vercel Serverless Functions (`api/index.js`).

## ☁️ Deploying on Vercel

1. Push code to GitHub repository.
2. Import project into Vercel.
3. Configure environment variable: `MONGO_URI`.
4. Deploy! Vercel automatically uses `npm run build` (`vite build`) and routes `/api/*` to `api/index.js`.
