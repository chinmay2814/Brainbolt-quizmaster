// ============================================
// BrainBolt - Quiz Routes
// ============================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { queries } from '../db/sqlite';
import {
  getUserState,
  initUserState,
  atomicStateUpdate,
  checkIdempotencyKey,
  setIdempotencyKey,
  checkRateLimit,
  updateLeaderboardScore,
  updateLeaderboardStreak,
  getUserScoreRank,
  getUserStreakRank,
} from '../db/redis';
import { updateDifficulty } from '../services/adaptive';
import { calculateScore } from '../services/scoring';
import {
  AuthenticatedRequest,
  AnswerRequest,
  NextQuestionResponse,
  AnswerResponse,
  MetricsResponse,
  Question,
  UserState,
} from '../types';

const router = Router();

// All quiz routes require authentication
router.use(authMiddleware);

// ============================================
// GET /quiz/next - Get next question
// ============================================
router.get('/next', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // Get or initialize user state
    let state = await getUserState(userId);
    if (!state) {
      state = await initUserState(userId);
    }
    
    // Get questions at current difficulty
    const questions = queries.getQuestionsByDifficulty.all(state.currentDifficulty) as any[];
    
    if (questions.length === 0) {
      // Fallback: get any question if none at exact difficulty
      const allQuestions = queries.getQuestionsByDifficulty.all(5) as any[];
      if (allQuestions.length === 0) {
        return res.status(500).json({ error: 'No questions available' });
      }
      questions.push(...allQuestions);
    }
    
    // Select random question (avoid repeating last question if possible)
    let question: any;
    if (questions.length > 1 && state.lastQuestionId) {
      const filtered = questions.filter(q => q.id !== state.lastQuestionId);
      question = filtered[Math.floor(Math.random() * filtered.length)] || questions[0];
    } else {
      question = questions[Math.floor(Math.random() * questions.length)];
    }
    
    // Update last question in state and get the NEW stateVersion
    const updateResult = await atomicStateUpdate(userId, state.stateVersion, (s) => ({
      ...s,
      lastQuestionId: question.id,
    }));
    
    // Use the new stateVersion from the update result
    const newStateVersion = updateResult.success && updateResult.newState 
      ? updateResult.newState.stateVersion 
      : state.stateVersion;
    
    const response: NextQuestionResponse = {
      questionId: question.id,
      difficulty: question.difficulty,
      prompt: question.prompt,
      choices: JSON.parse(question.choices),
      stateVersion: newStateVersion,
      currentScore: state.totalScore,
      currentStreak: state.streak,
      maxStreak: state.maxStreak,
    };
    
    return res.json(response);
    
  } catch (error) {
    console.error('Get next question error:', error);
    return res.status(500).json({ error: 'Failed to get question' });
  }
});

// ============================================
// POST /quiz/answer - Submit answer
// ============================================
router.post('/answer', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionId, answerIndex, stateVersion, idempotencyKey } = req.body as AnswerRequest;
    
    // Validation
    if (!questionId || answerIndex === undefined || stateVersion === undefined || !idempotencyKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // ============================================
    // IDEMPOTENCY CHECK
    // If we've already processed this request, return cached response
    // ============================================
    const cachedResponse = await checkIdempotencyKey(userId, idempotencyKey);
    if (cachedResponse) {
      console.log(`♻️ Returning cached response for idempotency key: ${idempotencyKey}`);
      return res.json(JSON.parse(cachedResponse));
    }
    
    // ============================================
    // RATE LIMITING
    // Max 1 answer per second per user
    // ============================================
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      return res.status(429).json({ error: 'Too many requests. Please wait.' });
    }
    
    // Get question
    const question = queries.getQuestionById.get(questionId) as any;
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Verify it's the expected question
    const currentState = await getUserState(userId);
    if (!currentState) {
      return res.status(400).json({ error: 'User state not found' });
    }
    
    if (currentState.lastQuestionId !== questionId) {
      return res.status(400).json({ error: 'Invalid question. Please fetch a new question.' });
    }
    
    // ============================================
    // OPTIMISTIC LOCKING
    // Reject if state has changed since client fetched question
    // ============================================
    if (currentState.stateVersion !== stateVersion) {
      return res.status(409).json({ 
        error: 'State has changed. Please refresh and try again.',
        currentVersion: currentState.stateVersion,
      });
    }
    
    // Check answer
    const isCorrect = answerIndex === question.correct_index;
    const difficulty = question.difficulty;
    
    // Calculate new state
    const { newDifficulty, newMomentum } = updateDifficulty(
      currentState.currentDifficulty,
      currentState.momentum,
      isCorrect
    );
    
    const scoreDelta = isCorrect ? calculateScore(difficulty, currentState.streak) : 0;
    const newStreak = isCorrect ? currentState.streak + 1 : 0;
    const newMaxStreak = Math.max(currentState.maxStreak, newStreak);
    const newTotalScore = currentState.totalScore + scoreDelta;
    
    // ============================================
    // ATOMIC STATE UPDATE
    // Uses Redis WATCH/MULTI/EXEC for atomicity
    // ============================================
    const updateResult = await atomicStateUpdate(userId, stateVersion, (state: UserState) => ({
      ...state,
      currentDifficulty: newDifficulty,
      momentum: newMomentum,
      streak: newStreak,
      maxStreak: newMaxStreak,
      totalScore: newTotalScore,
      totalAnswers: state.totalAnswers + 1,
      correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
      lastQuestionId: null, // Clear to prevent re-answering
    }));
    
    if (!updateResult.success) {
      return res.status(409).json({ error: 'Concurrent modification detected. Please retry.' });
    }
    
    // Update leaderboards
    await Promise.all([
      updateLeaderboardScore(userId, newTotalScore),
      updateLeaderboardStreak(userId, newMaxStreak),
    ]);
    
    // Get ranks
    const [rankScore, rankStreak] = await Promise.all([
      getUserScoreRank(userId),
      getUserStreakRank(userId),
    ]);
    
    // Log answer (async, non-blocking)
    setImmediate(() => {
      queries.insertAnswerLog.run(
        uuidv4(),
        userId,
        questionId,
        difficulty,
        answerIndex,
        isCorrect ? 1 : 0,
        scoreDelta,
        currentState.streak
      );
    });
    
    // Build response
    const response: AnswerResponse = {
      correct: isCorrect,
      correctIndex: question.correct_index,
      scoreDelta,
      newDifficulty,
      newStreak,
      totalScore: newTotalScore,
      stateVersion: updateResult.newState!.stateVersion,
      leaderboardRankScore: rankScore || 0,
      leaderboardRankStreak: rankStreak || 0,
    };
    
    // ============================================
    // STORE IDEMPOTENCY KEY
    // Cache response for 5 minutes to handle retries
    // ============================================
    await setIdempotencyKey(userId, idempotencyKey, JSON.stringify(response));
    
    console.log(`📝 Answer: user=${req.user!.username} correct=${isCorrect} streak=${newStreak} score=${newTotalScore}`);
    
    return res.json(response);
    
  } catch (error) {
    console.error('Submit answer error:', error);
    return res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// ============================================
// GET /quiz/metrics - Get user metrics
// ============================================
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const state = await getUserState(userId);
    if (!state) {
      return res.status(404).json({ error: 'User state not found' });
    }
    
    const accuracy = state.totalAnswers > 0
      ? Math.round((state.correctAnswers / state.totalAnswers) * 1000) / 1000
      : 0;
    
    const response: MetricsResponse = {
      currentDifficulty: state.currentDifficulty,
      momentum: state.momentum,
      streak: state.streak,
      maxStreak: state.maxStreak,
      totalScore: state.totalScore,
      accuracy,
      totalAnswers: state.totalAnswers,
    };
    
    return res.json(response);
    
  } catch (error) {
    console.error('Get metrics error:', error);
    return res.status(500).json({ error: 'Failed to get metrics' });
  }
});

export default router;
