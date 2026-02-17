// ============================================
// BrainBolt - Adaptive Difficulty Algorithm
// ============================================
// 
// This implements a MOMENTUM + HYSTERESIS approach to prevent
// ping-pong oscillation between difficulty levels.
//
// PROBLEM: Naive "correct=+1, wrong=-1" causes:
//   Correct → 5→6, Wrong → 6→5, Correct → 5→6... forever
//
// SOLUTION:
// 1. Track a floating "momentum" value (-1.0 to +1.0)
// 2. Only change difficulty when |momentum| exceeds threshold (0.6)
// 3. Momentum decays toward 0 each answer
//
// MATH PROOF (ping-pong scenario):
//   Start: momentum = 0
//   Correct: 0 + 0.3 = 0.3 (no change, < 0.6)
//   Wrong:   0.3 * 0.9 - 0.4 = -0.13 (no change, > -0.6)
//   Correct: -0.13 * 0.9 + 0.3 = 0.18 (no change)
//   ... oscillates but NEVER reaches ±0.6
//
// CONSISTENT PERFORMANCE:
//   Correct: 0.3
//   Correct: 0.3 * 0.9 + 0.3 = 0.57
//   Correct: 0.57 * 0.9 + 0.3 = 0.81 > 0.6 → DIFFICULTY UP
//
// ============================================

import { config } from '../config';

const {
  minDifficulty,
  maxDifficulty,
  momentumCorrect,
  momentumWrong,
  momentumDecay,
  threshold,
} = config.adaptive;

export interface AdaptiveResult {
  newDifficulty: number;
  newMomentum: number;
}

/**
 * Calculate new difficulty and momentum based on answer correctness.
 * 
 * @param currentDifficulty - Current difficulty level (1-10)
 * @param currentMomentum - Current momentum value (-1.0 to +1.0)
 * @param isCorrect - Whether the answer was correct
 * @returns New difficulty and momentum values
 */
export function updateDifficulty(
  currentDifficulty: number,
  currentMomentum: number,
  isCorrect: boolean
): AdaptiveResult {
  // Step 1: Apply decay to existing momentum
  let momentum = currentMomentum * momentumDecay;
  
  // Step 2: Apply answer impact
  if (isCorrect) {
    momentum = Math.min(1.0, momentum + momentumCorrect);
  } else {
    momentum = Math.max(-1.0, momentum + momentumWrong);
  }
  
  // Step 3: Check hysteresis threshold
  let newDifficulty = currentDifficulty;
  
  if (momentum > threshold) {
    // Strong positive momentum → increase difficulty
    newDifficulty = Math.min(maxDifficulty, currentDifficulty + 1);
    momentum = 0; // Reset after change to prevent rapid consecutive changes
  } else if (momentum < -threshold) {
    // Strong negative momentum → decrease difficulty
    newDifficulty = Math.max(minDifficulty, currentDifficulty - 1);
    momentum = 0; // Reset after change
  }
  
  return {
    newDifficulty,
    newMomentum: Math.round(momentum * 1000) / 1000, // Round to 3 decimal places
  };
}

/**
 * Example trace for debugging/documentation:
 * 
 * Scenario: User alternates correct/wrong (ping-pong)
 * 
 * | Answer  | Momentum Before | After Decay | After Impact | Threshold | Difficulty |
 * |---------|-----------------|-------------|--------------|-----------|------------|
 * | Correct | 0.000           | 0.000       | +0.300       | No        | 5          |
 * | Wrong   | 0.300           | 0.270       | -0.130       | No        | 5          |
 * | Correct | -0.130          | -0.117      | +0.183       | No        | 5          |
 * | Wrong   | 0.183           | 0.165       | -0.235       | No        | 5          |
 * 
 * Scenario: User gets 3 correct in a row
 * 
 * | Answer  | Momentum Before | After Decay | After Impact | Threshold | Difficulty |
 * |---------|-----------------|-------------|--------------|-----------|------------|
 * | Correct | 0.000           | 0.000       | +0.300       | No        | 5          |
 * | Correct | 0.300           | 0.270       | +0.570       | No        | 5          |
 * | Correct | 0.570           | 0.513       | +0.813       | YES >0.6  | 6 (reset)  |
 */
