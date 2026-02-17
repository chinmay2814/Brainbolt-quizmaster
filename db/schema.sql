-- ============================================
-- BrainBolt - Database Schema Reference
-- ============================================
-- This file documents the SQLite schema.
-- Schema is created programmatically in backend/src/db/sqlite.ts
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Questions table (seeded with quiz questions)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 10),
    prompt TEXT NOT NULL,
    choices TEXT NOT NULL,  -- JSON array
    correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    category TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- User state backup (Redis is primary, this is for recovery)
CREATE TABLE IF NOT EXISTS user_state (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    current_difficulty INTEGER DEFAULT 5,
    momentum REAL DEFAULT 0,
    streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    total_answers INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    state_version INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Answer log (audit trail)
CREATE TABLE IF NOT EXISTS answer_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    question_id TEXT NOT NULL REFERENCES questions(id),
    difficulty_at_answer INTEGER NOT NULL,
    answer_index INTEGER NOT NULL,
    correct INTEGER NOT NULL,  -- SQLite uses 0/1 for boolean
    score_delta INTEGER NOT NULL,
    streak_at_answer INTEGER NOT NULL,
    answered_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_answer_log_user_time ON answer_log(user_id, answered_at DESC);
