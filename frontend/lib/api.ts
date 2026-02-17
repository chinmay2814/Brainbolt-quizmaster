// ============================================
// BrainBolt - API Client
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types matching backend
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
  value: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

// Helper for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
}

// Auth API
export const auth = {
  register: (username: string, password: string) =>
    apiCall<AuthResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    
  login: (username: string, password: string) =>
    apiCall<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

// Quiz API
export const quiz = {
  getNext: () => apiCall<NextQuestionResponse>('/v1/quiz/next'),
  
  submitAnswer: (questionId: string, answerIndex: number, stateVersion: number) =>
    apiCall<AnswerResponse>('/v1/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({
        questionId,
        answerIndex,
        stateVersion,
        idempotencyKey: `${questionId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }),
    }),
    
  getMetrics: () => apiCall<MetricsResponse>('/v1/quiz/metrics'),
};

// Leaderboard API
export const leaderboard = {
  getScore: () => apiCall<LeaderboardResponse>('/v1/leaderboard/score'),
  getStreak: () => apiCall<LeaderboardResponse>('/v1/leaderboard/streak'),
};
