// ============================================
// BrainBolt - Leaderboard Routes
// ============================================

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getLeaderboardScore,
  getLeaderboardStreak,
  getUserScoreRank,
  getUserStreakRank,
  getUserState,
  getUserUsername,
} from '../db/redis';
import { config } from '../config';
import { AuthenticatedRequest, LeaderboardResponse, LeaderboardEntry } from '../types';

const router = Router();

// ============================================
// GET /leaderboard/score - Top users by score
// ============================================
router.get('/score', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // Get top N users
    const topUsers = await getLeaderboardScore(config.leaderboard.topN);
    
    // Build leaderboard with usernames
    const leaderboard: LeaderboardEntry[] = await Promise.all(
      topUsers.map(async (entry, index) => ({
        rank: index + 1,
        username: (await getUserUsername(entry.userId)) || 'Unknown',
        value: entry.score,
      }))
    );
    
    // Get current user's rank and score
    let currentUser: LeaderboardEntry | null = null;
    const userRank = await getUserScoreRank(userId);
    const userState = await getUserState(userId);
    
    if (userRank && userState) {
      currentUser = {
        rank: userRank,
        username: req.user!.username,
        value: userState.totalScore,
      };
    }
    
    const response: LeaderboardResponse = {
      leaderboard,
      currentUser,
    };
    
    return res.json(response);
    
  } catch (error) {
    console.error('Get score leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ============================================
// GET /leaderboard/streak - Top users by max streak
// ============================================
router.get('/streak', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // Get top N users
    const topUsers = await getLeaderboardStreak(config.leaderboard.topN);
    
    // Build leaderboard with usernames
    const leaderboard: LeaderboardEntry[] = await Promise.all(
      topUsers.map(async (entry, index) => ({
        rank: index + 1,
        username: (await getUserUsername(entry.userId)) || 'Unknown',
        value: entry.score,
      }))
    );
    
    // Get current user's rank and streak
    let currentUser: LeaderboardEntry | null = null;
    const userRank = await getUserStreakRank(userId);
    const userState = await getUserState(userId);
    
    if (userRank && userState) {
      currentUser = {
        rank: userRank,
        username: req.user!.username,
        value: userState.maxStreak,
      };
    }
    
    const response: LeaderboardResponse = {
      leaderboard,
      currentUser,
    };
    
    return res.json(response);
    
  } catch (error) {
    console.error('Get streak leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ============================================
// GET /leaderboard/stream - SSE for real-time updates
// ============================================
router.get('/stream', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial connection message
  res.write(`event: connected\ndata: {"message": "Connected to leaderboard stream"}\n\n`);
  
  // Send updates every 2 seconds (polling-based SSE for simplicity)
  // In production, would use Redis Pub/Sub for true real-time
  const interval = setInterval(async () => {
    try {
      const [scoreLeaderboard, streakLeaderboard] = await Promise.all([
        getLeaderboardScore(5), // Top 5 for updates
        getLeaderboardStreak(5),
      ]);
      
      const scoreData = await Promise.all(
        scoreLeaderboard.map(async (entry, index) => ({
          rank: index + 1,
          username: (await getUserUsername(entry.userId)) || 'Unknown',
          value: entry.score,
        }))
      );
      
      const streakData = await Promise.all(
        streakLeaderboard.map(async (entry, index) => ({
          rank: index + 1,
          username: (await getUserUsername(entry.userId)) || 'Unknown',
          value: entry.score,
        }))
      );
      
      res.write(`event: leaderboard-update\ndata: ${JSON.stringify({ score: scoreData, streak: streakData })}\n\n`);
    } catch (error) {
      // Client likely disconnected
    }
  }, 2000);
  
  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
