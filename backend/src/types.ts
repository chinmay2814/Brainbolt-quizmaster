// ============================================
// BrainBolt - Core Type Definitions
// ============================================

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface Question {
  id: string;
  difficulty: number; // 1-10
  prompt: string;
  choices: string[]; // Array of 4 choices
  correctIndex: number; // 0-3
  category: string;
}

// User state stored in Redis (source of truth for real-time)
export interface UserState {
  userId: string;
  currentDifficulty: number; // 1-10
  momentum: number; // -1.0 to +1.0 (for adaptive algorithm)
  streak: number; // Current consecutive correct answers
  maxStreak: number; // All-time max streak
  totalScore: number;
  totalAnswers: number;
  correctAnswers: number;
  lastQuestionId: string | null;
  stateVersion: number; // For optimistic locking
}

export interface AnswerLog {
  id: string;
  userId: string;
  questionId: string;
  difficultyAtAnswer: number;
  answerIndex: number;
  correct: boolean;
  scoreDelta: number;
  streakAtAnswer: number;
  answeredAt: string;
}

// API Request/Response Types
export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string };
}

export interface NextQuestionResponse {
  questionId: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  stateVersion: number;
  currentScore: number;
  currentStreak: number;
  maxStreak: number;
}

export interface AnswerRequest {
  questionId: string;
  answerIndex: number;
  stateVersion: number;
  idempotencyKey: string;
}

export interface AnswerResponse {
  correct: boolean;
  correctIndex: number;
  scoreDelta: number;
  newDifficulty: number;
  newStreak: number;
  totalScore: number;
  stateVersion: number;
  leaderboardRankScore: number;
  leaderboardRankStreak: number;
}

export interface MetricsResponse {
  currentDifficulty: number;
  momentum: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  accuracy: number;
  totalAnswers: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  value: number; // score or streak
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  username: string;
}

// Express extended request
import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
