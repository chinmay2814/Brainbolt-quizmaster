// ============================================
// BrainBolt - Score Calculation Service
// ============================================
//
// FORMULA:
//   scoreDelta = difficulty * 10 * streakMultiplier
//   streakMultiplier = min(1 + (streak * 0.1), 3.0)
//
// EXAMPLE (difficulty=7, streak=5):
//   baseScore = 7 * 10 = 70
//   streakMultiplier = min(1 + 5*0.1, 3.0) = min(1.5, 3.0) = 1.5
//   scoreDelta = 70 * 1.5 = 105 points
//
// WRONG ANSWERS: scoreDelta = 0 (no penalty, but streak resets)
//
// ============================================

import { config } from '../config';

const { baseMultiplier, streakMultiplierRate, maxStreakMultiplier } = config.scoring;

/**
 * Calculate streak multiplier (capped at 3x)
 */
export function getStreakMultiplier(streak: number): number {
  const multiplier = 1 + (streak * streakMultiplierRate);
  return Math.min(multiplier, maxStreakMultiplier);
}

/**
 * Calculate score delta for a correct answer
 * 
 * @param difficulty - Current difficulty level (1-10)
 * @param streak - Current streak count (before this answer)
 * @returns Score points earned
 */
export function calculateScore(difficulty: number, streak: number): number {
  const baseScore = difficulty * baseMultiplier;
  const multiplier = getStreakMultiplier(streak);
  return Math.floor(baseScore * multiplier);
}

/**
 * Example calculations:
 * 
 * | Difficulty | Streak | Base  | Multiplier | Score |
 * |------------|--------|-------|------------|-------|
 * | 1          | 0      | 10    | 1.0        | 10    |
 * | 5          | 0      | 50    | 1.0        | 50    |
 * | 5          | 5      | 50    | 1.5        | 75    |
 * | 10         | 10     | 100   | 2.0        | 200   |
 * | 10         | 20     | 100   | 3.0 (cap)  | 300   |
 * | 10         | 100    | 100   | 3.0 (cap)  | 300   |
 */
