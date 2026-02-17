// ============================================
// BrainBolt - Configuration
// ============================================

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001'),
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'brainbolt-dev-secret-change-in-prod',
  jwtExpiresIn: '24h',
  
  // Database
  dbPath: process.env.DB_PATH || './data/brainbolt.db',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Adaptive Algorithm Constants
  adaptive: {
    minDifficulty: 1,
    maxDifficulty: 10,
    defaultDifficulty: 5,
    momentumCorrect: 0.3,    // Momentum gain on correct answer
    momentumWrong: -0.4,     // Momentum loss on wrong answer (asymmetric for stability)
    momentumDecay: 0.9,      // Decay factor per answer
    threshold: 0.6,          // Hysteresis threshold to change difficulty
  },
  
  // Scoring
  scoring: {
    baseMultiplier: 10,      // difficulty * 10 = base score
    streakMultiplierRate: 0.1, // Each streak point adds 10% bonus
    maxStreakMultiplier: 3.0,  // Cap at 3x
  },
  
  // Rate Limiting
  rateLimit: {
    windowSeconds: 1,        // 1 answer per second max
  },
  
  // Leaderboard
  leaderboard: {
    topN: 10,                // Show top 10 users
  },
  
  // Idempotency
  idempotency: {
    ttlSeconds: 300,         // 5 minutes
  },
};
