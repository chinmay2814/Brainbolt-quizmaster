// ============================================
// BrainBolt - Redis Client & Operations
// ============================================

import Redis from 'ioredis';
import { config } from '../config';
import { UserState } from '../types';

export const redis = new Redis(config.redisUrl, {
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 200, 1000);
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

// Key patterns
const keys = {
  userState: (userId: string) => `user:state:${userId}`,
  idempotency: (userId: string, key: string) => `idempotency:${userId}:${key}`,
  rateLimit: (userId: string) => `ratelimit:${userId}`,
  leaderboardScore: 'leaderboard:score',
  leaderboardStreak: 'leaderboard:streak',
  userUsername: (userId: string) => `user:username:${userId}`,
};

// ============================================
// User State Operations (Redis is source of truth)
// ============================================

export async function getUserState(userId: string): Promise<UserState | null> {
  const data = await redis.hgetall(keys.userState(userId));
  if (!data || Object.keys(data).length === 0) return null;
  
  return {
    userId,
    currentDifficulty: parseInt(data.currentDifficulty) || config.adaptive.defaultDifficulty,
    momentum: parseFloat(data.momentum) || 0,
    streak: parseInt(data.streak) || 0,
    maxStreak: parseInt(data.maxStreak) || 0,
    totalScore: parseInt(data.totalScore) || 0,
    totalAnswers: parseInt(data.totalAnswers) || 0,
    correctAnswers: parseInt(data.correctAnswers) || 0,
    lastQuestionId: data.lastQuestionId || null,
    stateVersion: parseInt(data.stateVersion) || 0,
  };
}

export async function setUserState(state: UserState): Promise<void> {
  await redis.hset(keys.userState(state.userId), {
    currentDifficulty: state.currentDifficulty.toString(),
    momentum: state.momentum.toString(),
    streak: state.streak.toString(),
    maxStreak: state.maxStreak.toString(),
    totalScore: state.totalScore.toString(),
    totalAnswers: state.totalAnswers.toString(),
    correctAnswers: state.correctAnswers.toString(),
    lastQuestionId: state.lastQuestionId || '',
    stateVersion: state.stateVersion.toString(),
  });
}

export async function initUserState(userId: string): Promise<UserState> {
  const state: UserState = {
    userId,
    currentDifficulty: config.adaptive.defaultDifficulty,
    momentum: 0,
    streak: 0,
    maxStreak: 0,
    totalScore: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    lastQuestionId: null,
    stateVersion: 0,
  };
  await setUserState(state);
  return state;
}

// ============================================
// Atomic State Update with Optimistic Locking
// Uses Redis WATCH/MULTI/EXEC for atomicity
// ============================================

export async function atomicStateUpdate(
  userId: string,
  expectedVersion: number,
  updateFn: (state: UserState) => UserState
): Promise<{ success: boolean; newState?: UserState }> {
  const stateKey = keys.userState(userId);
  
  // Watch the key for changes
  await redis.watch(stateKey);
  
  try {
    const state = await getUserState(userId);
    if (!state) {
      await redis.unwatch();
      return { success: false };
    }
    
    // Optimistic locking: check version matches
    if (state.stateVersion !== expectedVersion) {
      await redis.unwatch();
      return { success: false };
    }
    
    // Apply update
    const newState = updateFn(state);
    newState.stateVersion = state.stateVersion + 1;
    
    // Execute atomically
    const multi = redis.multi();
    multi.hset(stateKey, {
      currentDifficulty: newState.currentDifficulty.toString(),
      momentum: newState.momentum.toString(),
      streak: newState.streak.toString(),
      maxStreak: newState.maxStreak.toString(),
      totalScore: newState.totalScore.toString(),
      totalAnswers: newState.totalAnswers.toString(),
      correctAnswers: newState.correctAnswers.toString(),
      lastQuestionId: newState.lastQuestionId || '',
      stateVersion: newState.stateVersion.toString(),
    });
    
    const result = await multi.exec();
    
    if (result === null) {
      // WATCH detected concurrent modification
      return { success: false };
    }
    
    return { success: true, newState };
  } catch (error) {
    await redis.unwatch();
    throw error;
  }
}

// ============================================
// Idempotency Key Operations
// ============================================

export async function checkIdempotencyKey(userId: string, key: string): Promise<string | null> {
  return redis.get(keys.idempotency(userId, key));
}

export async function setIdempotencyKey(userId: string, key: string, response: string): Promise<void> {
  await redis.setex(keys.idempotency(userId, key), config.idempotency.ttlSeconds, response);
}

// ============================================
// Rate Limiting (1 request per second)
// Uses SET NX EX pattern for atomic check
// ============================================

export async function checkRateLimit(userId: string): Promise<boolean> {
  // SET NX EX: Set if not exists, with expiry
  // Returns 'OK' if set (allowed), null if already exists (rate limited)
  const result = await redis.set(
    keys.rateLimit(userId),
    '1',
    'EX',
    config.rateLimit.windowSeconds,
    'NX'
  );
  return result === 'OK';
}

// ============================================
// Leaderboard Operations (Redis Sorted Sets)
// ============================================

export async function updateLeaderboardScore(userId: string, score: number): Promise<void> {
  await redis.zadd(keys.leaderboardScore, score, userId);
}

export async function updateLeaderboardStreak(userId: string, streak: number): Promise<void> {
  await redis.zadd(keys.leaderboardStreak, streak, userId);
}

export async function getLeaderboardScore(limit: number = config.leaderboard.topN): Promise<Array<{ userId: string; score: number }>> {
  // ZREVRANGE returns highest first
  const result = await redis.zrevrange(keys.leaderboardScore, 0, limit - 1, 'WITHSCORES');
  return parseLeaderboardResult(result);
}

export async function getLeaderboardStreak(limit: number = config.leaderboard.topN): Promise<Array<{ userId: string; score: number }>> {
  const result = await redis.zrevrange(keys.leaderboardStreak, 0, limit - 1, 'WITHSCORES');
  return parseLeaderboardResult(result);
}

export async function getUserScoreRank(userId: string): Promise<number | null> {
  // ZREVRANK returns 0-indexed rank (highest = 0)
  const rank = await redis.zrevrank(keys.leaderboardScore, userId);
  return rank !== null ? rank + 1 : null; // Convert to 1-indexed
}

export async function getUserStreakRank(userId: string): Promise<number | null> {
  const rank = await redis.zrevrank(keys.leaderboardStreak, userId);
  return rank !== null ? rank + 1 : null;
}

// Store username mapping for leaderboard display
export async function setUserUsername(userId: string, username: string): Promise<void> {
  await redis.set(keys.userUsername(userId), username);
}

export async function getUserUsername(userId: string): Promise<string | null> {
  return redis.get(keys.userUsername(userId));
}

// Helper to parse ZRANGE WITHSCORES result
function parseLeaderboardResult(result: string[]): Array<{ userId: string; score: number }> {
  const entries: Array<{ userId: string; score: number }> = [];
  for (let i = 0; i < result.length; i += 2) {
    entries.push({
      userId: result[i],
      score: parseInt(result[i + 1]),
    });
  }
  return entries;
}
