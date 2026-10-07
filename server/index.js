import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import hazardRoutes from './routes/hazardRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import mlRoutes from './routes/mlRoutes.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/ml', mlRoutes);

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

startServer().catch((error) => {
  console.error('SafeRoute API startup failed:', error.message);
  process.exit(1);
});
