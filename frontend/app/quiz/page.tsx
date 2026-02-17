'use client';

// ============================================
// BrainBolt - Quiz Page
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { quiz, leaderboard, NextQuestionResponse, AnswerResponse, LeaderboardResponse } from '@/lib/api';

export default function QuizPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // Quiz state
  const [question, setQuestion] = useState<NextQuestionResponse | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScoreAnimation, setShowScoreAnimation] = useState(false);
  
  // Leaderboard state
  const [scoreBoard, setScoreBoard] = useState<LeaderboardResponse | null>(null);
  const [streakBoard, setStreakBoard] = useState<LeaderboardResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'score' | 'streak'>('score');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // Load initial question and leaderboards
  useEffect(() => {
    if (user) {
      loadQuestion();
      loadLeaderboards();
    }
  }, [user]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError('');
      setSelectedAnswer(null);
      setAnswerResult(null);
      setShowScoreAnimation(false);
      const q = await quiz.getNext();
      setQuestion(q);
    } catch (err: any) {
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboards = async () => {
    try {
      const [score, streak] = await Promise.all([
        leaderboard.getScore(),
        leaderboard.getStreak(),
      ]);
      setScoreBoard(score);
      setStreakBoard(streak);
    } catch (err) {
      console.error('Failed to load leaderboards:', err);
    }
  };

  const submitAnswer = async (answerIndex: number) => {
    if (!question || selectedAnswer !== null) return;
    
    setSelectedAnswer(answerIndex);
    
    try {
      const result = await quiz.submitAnswer(
        question.questionId,
        answerIndex,
        question.stateVersion
      );
      setAnswerResult(result);
      
      // Trigger score animation if correct
      if (result.correct) {
        setShowScoreAnimation(true);
        setTimeout(() => setShowScoreAnimation(false), 500);
      }
      
      // Refresh leaderboards
      loadLeaderboards();
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
      setSelectedAnswer(null);
    }
  };

  const nextQuestion = () => {
    loadQuestion();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentScore = answerResult?.totalScore ?? question?.currentScore ?? 0;
  const currentStreak = answerResult?.newStreak ?? question?.currentStreak ?? 0;
  const currentDifficulty = answerResult?.newDifficulty ?? question?.difficulty ?? 5;
  const maxStreak = question?.maxStreak ?? 0;

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-xl">🧠</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            BrainBolt
          </span>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-300">{user.username}</span>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Quiz Card - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard 
              label="Score" 
              value={currentScore} 
              icon={<DiamondIcon />}
              type="score"
              animate={showScoreAnimation}
            />
            <StatCard 
              label="Streak" 
              value={currentStreak} 
              icon={<FireIcon />}
              type="streak"
              highlight={currentStreak >= 3}
            />
            <StatCard 
              label="Best Streak" 
              value={maxStreak} 
              icon={<StarIcon />}
              type="default"
            />
            <StatCard 
              label="Difficulty" 
              value={currentDifficulty} 
              max={10}
              icon={<ChartIcon />}
              type="difficulty"
            />
          </div>

          {/* Question Card */}
          <div className="card-elevated p-6 md:p-8">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading next question...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-xl mb-6 border border-red-200 dark:border-red-800/50 animate-fade-in">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1">{error}</span>
                <button
                  onClick={loadQuestion}
                  className="font-medium hover:underline whitespace-nowrap"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Question */}
            {question && !loading && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getDifficultyColor(question.difficulty)}`}>
                    <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                    Level {question.difficulty}
                  </span>
                  {currentStreak >= 3 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium animate-streak-fire">
                      <FireIcon className="w-4 h-4" />
                      {currentStreak}x Streak!
                    </span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-white leading-relaxed mb-8">
                  {question.prompt}
                </h2>

                {/* Answer Choices */}
                <div className="space-y-3">
                  {question.choices.map((choice, index) => (
                    <AnswerButton
                      key={index}
                      index={index}
                      text={choice}
                      selected={selectedAnswer === index}
                      correct={answerResult?.correctIndex === index}
                      showResult={answerResult !== null}
                      disabled={selectedAnswer !== null}
                      onClick={() => submitAnswer(index)}
                    />
                  ))}
                </div>

                {/* Result & Next Button */}
                {answerResult && (
                  <div className="mt-8 animate-slide-up">
                    <div className={`p-5 rounded-xl mb-5 ${
                      answerResult.correct 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50' 
                        : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800/50'
                    }`}>
                      <div className={`flex items-center gap-3 text-lg font-semibold mb-2 ${
                        answerResult.correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {answerResult.correct ? (
                          <>
                            <span className="text-2xl">🎉</span>
                            Correct!
                          </>
                        ) : (
                          <>
                            <span className="text-2xl">😔</span>
                            Not quite right
                          </>
                        )}
                      </div>
                      {answerResult.correct && (
                        <p className="text-green-600 dark:text-green-400 font-medium">
                          +{answerResult.scoreDelta} points earned
                        </p>
                      )}
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Your rank: #{answerResult.leaderboardRankScore} by score · #{answerResult.leaderboardRankStreak} by streak
                      </p>
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="w-full btn-primary py-4 text-base group"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Next Question
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div className="lg:col-span-1">
          <div className="card-elevated p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <TrophyIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Leaderboard</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl mb-5">
              <button
                onClick={() => setActiveTab('score')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'score'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Score
              </button>
              <button
                onClick={() => setActiveTab('streak')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'streak'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Streak
              </button>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-2">
              {(activeTab === 'score' ? scoreBoard : streakBoard)?.leaderboard.map((entry, idx) => (
                <LeaderboardEntry
                  key={entry.rank}
                  rank={entry.rank}
                  username={entry.username}
                  value={entry.value}
                  isCurrentUser={entry.username === user.username}
                  type={activeTab}
                />
              ))}
              
              {/* Empty state */}
              {!(activeTab === 'score' ? scoreBoard : streakBoard)?.leaderboard.length && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <TrophyIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No rankings yet</p>
                  <p className="text-sm">Be the first!</p>
                </div>
              )}
              
              {/* Current user if not in top 10 */}
              {(activeTab === 'score' ? scoreBoard : streakBoard)?.currentUser && 
               (activeTab === 'score' ? scoreBoard : streakBoard)!.currentUser!.rank > 10 && (
                <>
                  <div className="flex items-center justify-center gap-1 py-2 text-slate-300 dark:text-slate-600">
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                  </div>
                  <LeaderboardEntry
                    rank={(activeTab === 'score' ? scoreBoard : streakBoard)!.currentUser!.rank}
                    username={user.username}
                    value={(activeTab === 'score' ? scoreBoard : streakBoard)!.currentUser!.value}
                    isCurrentUser={true}
                    type={activeTab}
                  />
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadLeaderboards}
              className="w-full mt-5 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Engineering Documentation Link */}
          <a 
            href="/engineering"
            className="block mt-4 card p-5 group hover:border-primary-300 dark:hover:border-primary-600 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Engineering Architecture
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  System design, adaptive algorithm & tech decisions
                </p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}

// ============================================
// Components
// ============================================

function StatCard({ 
  label, 
  value, 
  icon,
  type = 'default',
  max,
  highlight = false,
  animate = false
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode;
  type?: 'score' | 'streak' | 'difficulty' | 'default';
  max?: number;
  highlight?: boolean;
  animate?: boolean;
}) {
  const bgClass = {
    score: 'stat-score',
    streak: 'stat-streak',
    difficulty: 'stat-difficulty',
    default: 'bg-slate-100 dark:bg-slate-700/50',
  }[type];

  return (
    <div className={`${bgClass} rounded-xl p-4 transition-all ${highlight ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold text-slate-800 dark:text-white ${animate ? 'animate-score-pop' : ''}`}>
        {value.toLocaleString()}{max ? <span className="text-sm font-normal text-slate-400">/{max}</span> : ''}
      </div>
    </div>
  );
}

function AnswerButton({
  index,
  text,
  selected,
  correct,
  showResult,
  disabled,
  onClick,
}: {
  index: number;
  text: string;
  selected: boolean;
  correct: boolean;
  showResult: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const letters = ['A', 'B', 'C', 'D'];
  
  let containerClass = 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-700';
  let letterClass = 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300';
  
  if (showResult) {
    if (correct) {
      containerClass = 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600';
      letterClass = 'bg-green-500 text-white';
    } else if (selected && !correct) {
      containerClass = 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600';
      letterClass = 'bg-red-500 text-white';
    }
  } else if (selected) {
    containerClass = 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600';
    letterClass = 'bg-primary-500 text-white';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                ${containerClass}
                ${disabled ? 'cursor-default' : 'cursor-pointer'}
                ${!disabled && !showResult ? 'hover:scale-[1.01] active:scale-[0.99]' : ''}
                ${showResult && correct ? 'animate-pulse-success' : ''}
                ${showResult && selected && !correct ? 'animate-pulse-error' : ''}`}
    >
      <div className="flex items-center gap-4">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all ${letterClass}`}>
          {letters[index]}
        </span>
        <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{text}</span>
        {showResult && correct && (
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {showResult && selected && !correct && (
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
    </button>
  );
}

function LeaderboardEntry({
  rank,
  username,
  value,
  isCurrentUser,
  type,
}: {
  rank: number;
  username: string;
  value: number;
  isCurrentUser: boolean;
  type: 'score' | 'streak';
}) {
  const getRankDisplay = () => {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-semibold text-slate-400">{rank}</span>;
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
      isCurrentUser
        ? 'bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800/50'
        : 'bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50'
    }`}>
      <div className="w-8 h-8 flex items-center justify-center">
        {getRankDisplay()}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`font-medium truncate block ${isCurrentUser ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}>
          {username}
          {isCurrentUser && <span className="text-xs ml-1 opacity-60">(You)</span>}
        </span>
      </div>
      <div className={`font-bold ${isCurrentUser ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300'}`}>
        {value.toLocaleString()}
        {type === 'streak' && <span className="text-xs ml-0.5">🔥</span>}
      </div>
    </div>
  );
}

function getDifficultyColor(level: number) {
  if (level <= 3) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (level <= 6) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
  if (level <= 8) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

// ============================================
// Icons
// ============================================

function DiamondIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 9l10 13L22 9l-10-7zm0 3.5L18 9l-6 8-6-8 6-3.5z"/>
    </svg>
  );
}

function FireIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.58 5-8.05V4c0-1.1.9-2 2-2s2 .9 2 2v1.95c2.96 1.47 5 4.52 5 8.05 0 4.97-4.03 9-9 9zm0-16c-3.87 0-7 3.13-7 7 0 3.53 2.61 6.43 6 6.92V18c0-.55.45-1 1-1s1 .45 1 1v2.92c3.39-.49 6-3.39 6-6.92 0-3.87-3.13-7-7-7z"/>
    </svg>
  );
}

function StarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  );
}

function ChartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
    </svg>
  );
}

function TrophyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
    </svg>
  );
}
