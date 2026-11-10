import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/database.js';

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) });
import authRoutes from './routes/authRoutes.js';
import hazardRoutes from './routes/hazardRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import mlRoutes from './routes/mlRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://safe-route-seven-beryl.vercel.app',
  ...((process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean)),
].filter((origin, index, array) => origin && array.indexOf(origin) === index);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
// Raised from 100kb so hazard photos (compressed in the browser) fit.
app.use(express.json({ limit: '2mb' }));

// Serverless: connect once per warm instance, reuse after.
let dbReady = null;
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    dbReady ??= connectDatabase().catch((error) => { dbReady = null; throw error; });
    dbReady.then(() => next(), next);
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: process.env.MONGODB_URI ? 'configured' : 'not_configured',
  });
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Internal server error.' });
});

async function startServer() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await connectDatabase();
  app.listen(port, () => {
    console.log(`SafeRoute API listening on port ${port}`);
  });
}

// On Vercel the app runs as a serverless function (api/index.js); locally it listens.
if (!process.env.VERCEL) {
  startServer().catch((error) => {
    console.error('SafeRoute API startup failed:', error.message);
    process.exit(1);
  });
}

export default app;
