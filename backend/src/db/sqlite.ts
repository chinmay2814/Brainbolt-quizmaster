// ============================================
// BrainBolt - SQLite Database Setup
// ============================================

import Database from 'better-sqlite3';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Initialize schema - MUST be called before using queries
export function initializeDatabase() {
  db.exec(`
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
      correct INTEGER NOT NULL,
      score_delta INTEGER NOT NULL,
      streak_at_answer INTEGER NOT NULL,
      answered_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_answer_log_user_time ON answer_log(user_id, answered_at DESC);
  `);
  
  console.log('✅ SQLite database initialized');
  
  // Initialize prepared statements AFTER tables are created
  initializeQueries();
}

// Query helpers - initialized lazily after tables exist
export let queries: {
  createUser: Database.Statement;
  getUserByUsername: Database.Statement;
  getUserById: Database.Statement;
  upsertUserState: Database.Statement;
  getUserState: Database.Statement;
  getQuestionsByDifficulty: Database.Statement;
  getQuestionById: Database.Statement;
  insertQuestion: Database.Statement;
  getQuestionCount: Database.Statement;
  insertAnswerLog: Database.Statement;
};

function initializeQueries() {
  queries = {
    // Users
    createUser: db.prepare(`
      INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)
    `),
    
    getUserByUsername: db.prepare(`
      SELECT * FROM users WHERE username = ?
    `),
    
    getUserById: db.prepare(`
      SELECT * FROM users WHERE id = ?
    `),
    
    // User State (backup)
    upsertUserState: db.prepare(`
      INSERT INTO user_state (user_id, current_difficulty, momentum, streak, max_streak, total_score, total_answers, correct_answers, state_version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        current_difficulty = excluded.current_difficulty,
        momentum = excluded.momentum,
        streak = excluded.streak,
        max_streak = excluded.max_streak,
        total_score = excluded.total_score,
        total_answers = excluded.total_answers,
        correct_answers = excluded.correct_answers,
        state_version = excluded.state_version,
        updated_at = datetime('now')
    `),
    
    getUserState: db.prepare(`
      SELECT * FROM user_state WHERE user_id = ?
    `),
    
    // Questions
    getQuestionsByDifficulty: db.prepare(`
      SELECT * FROM questions WHERE difficulty = ?
    `),
    
    getQuestionById: db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `),
    
    insertQuestion: db.prepare(`
      INSERT OR IGNORE INTO questions (id, difficulty, prompt, choices, correct_index, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    
    getQuestionCount: db.prepare(`
      SELECT COUNT(*) as count FROM questions
    `),
    
    // Answer Log
    insertAnswerLog: db.prepare(`
      INSERT INTO answer_log (id, user_id, question_id, difficulty_at_answer, answer_index, correct, score_delta, streak_at_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
  };
}
