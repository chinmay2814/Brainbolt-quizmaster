// ============================================
// BrainBolt - Authentication Routes
// ============================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queries } from '../db/sqlite';
import { initUserState, setUserUsername, updateLeaderboardScore, updateLeaderboardStreak } from '../db/redis';
import { generateToken } from '../middleware/auth';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types';

const router = Router();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as RegisterRequest;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    // Check if username exists
    const existing = queries.getUserByUsername.get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    // Create user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    queries.createUser.run(userId, username, passwordHash);
    
    // Initialize Redis state
    await initUserState(userId);
    await setUserUsername(userId, username);
    
    // Initialize leaderboard entries (start at 0)
    await updateLeaderboardScore(userId, 0);
    await updateLeaderboardStreak(userId, 0);
    
    // Generate token
    const token = await generateToken({ userId, username });
    
    const response: AuthResponse = {
      token,
      user: { id: userId, username },
    };
    
    console.log(`✅ User registered: ${username}`);
    return res.status(201).json(response);
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Find user
    const user = queries.getUserByUsername.get(username) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = await generateToken({ userId: user.id, username: user.username });
    
    // Ensure username mapping exists in Redis
    await setUserUsername(user.id, user.username);
    
    const response: AuthResponse = {
      token,
      user: { id: user.id, username: user.username },
    };
    
    console.log(`✅ User logged in: ${username}`);
    return res.json(response);
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
