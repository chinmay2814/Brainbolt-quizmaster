// ============================================
// BrainBolt - Main Server Entry Point
// ============================================

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initializeDatabase } from './db/sqlite';
import { redis } from './db/redis';

// Import routes
import authRoutes from './routes/auth';
import quizRoutes from './routes/quiz';
import leaderboardRoutes from './routes/leaderboard';

const app = express();

// ============================================
// Middleware
// ============================================
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.includes('/stream')) { // Don't log SSE
      console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// ============================================
// Routes
// ============================================
app.use('/v1/auth', authRoutes);
app.use('/v1/quiz', quizRoutes);
app.use('/v1/leaderboard', leaderboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'BrainBolt API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /v1/auth/register',
        login: 'POST /v1/auth/login',
      },
      quiz: {
        next: 'GET /v1/quiz/next',
        answer: 'POST /v1/quiz/answer',
        metrics: 'GET /v1/quiz/metrics',
      },
      leaderboard: {
        score: 'GET /v1/leaderboard/score',
        streak: 'GET /v1/leaderboard/streak',
        stream: 'GET /v1/leaderboard/stream (SSE)',
      },
    },
  });
});

// ============================================
// Error handling
// ============================================
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Startup
// ============================================
async function start() {
  try {
    // Initialize SQLite
    initializeDatabase();
    
    // Wait for Redis connection
    await new Promise<void>((resolve, reject) => {
      if (redis.status === 'ready') {
        resolve();
      } else {
        redis.once('ready', resolve);
        redis.once('error', reject);
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
      }
    });
    
    // Start server
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🧠 BrainBolt API Server                                ║
║                                                          ║
║   Port: ${config.port}                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                          ║
║   Endpoints:                                             ║
║   • POST /v1/auth/register                               ║
║   • POST /v1/auth/login                                  ║
║   • GET  /v1/quiz/next                                   ║
║   • POST /v1/quiz/answer                                 ║
║   • GET  /v1/quiz/metrics                                ║
║   • GET  /v1/leaderboard/score                           ║
║   • GET  /v1/leaderboard/streak                          ║
║   • GET  /v1/leaderboard/stream (SSE)                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
