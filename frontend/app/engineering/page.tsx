'use client';

// ============================================
// BrainBolt - Engineering Documentation
// ============================================

import { useState } from 'react';

type Tab = 'overview' | 'architecture' | 'algorithm' | 'stack' | 'details';

export default function EngineeringPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'algorithm', label: 'Adaptive Algorithm' },
    { id: 'stack', label: 'Tech Stack' },
    { id: 'details', label: 'Implementation Details' },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🧠</span>
            <h1 className="text-2xl font-bold">BrainBolt</h1>
          </div>
          <p className="text-slate-400">
            Technical documentation for the Adaptive Quiz Platform
          </p>
          <div className="flex gap-4 mt-6 text-sm">
            <a href="/quiz" className="text-primary-400 hover:underline">Try the Quiz →</a>
            <a href="/" className="text-slate-500 hover:text-white">Home</a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'algorithm' && <AlgorithmTab />}
        {activeTab === 'stack' && <StackTab />}
        {activeTab === 'details' && <DetailsTab />}
      </div>
    </main>
  );
}

// ============================================
// Tab: Overview
// ============================================
function OverviewTab() {
  return (
    <div className="space-y-8">
      <Section title="What is BrainBolt?">
        <p>
          An infinite quiz platform where difficulty adapts based on how well you're doing. 
          Get questions right → harder questions. Struggle → easier ones. The goal is keeping 
          users in that sweet spot where they're challenged but not frustrated.
        </p>
        <p>
          On top of that, there's a streak system (consecutive correct answers multiply your score), 
          and real-time leaderboards so you can see how you stack up against others.
        </p>
      </Section>

      <Section title="Core Features">
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Adaptive Difficulty (1-10)</strong> — Uses momentum + hysteresis to prevent ping-pong oscillation</li>
          <li><strong>Streak System</strong> — Consecutive correct answers multiply score (up to 3x)</li>
          <li><strong>Real-time Leaderboards</strong> — Score and streak rankings, updates immediately</li>
          <li><strong>Idempotent Submissions</strong> — Network retries won't double-count answers</li>
          <li><strong>Optimistic Locking</strong> — Multiple tabs can't both submit for same question</li>
        </ul>
      </Section>

      <Section title="The Core Loop">
        <ol className="list-decimal list-inside space-y-2">
          <li>User logs in (or creates account) — we hand them a JWT token</li>
          <li>They request a question — system picks one at their current difficulty level</li>
          <li>They submit an answer — we check if it's correct</li>
          <li>Based on that, we update their difficulty (adaptive algorithm), update streak, calculate score</li>
          <li>Leaderboards update immediately</li>
          <li>Rinse and repeat — it's infinite, no end state</li>
        </ol>
      </Section>
    </div>
  );
}

// ============================================
// Tab: Architecture
// ============================================
function ArchitectureTab() {
  return (
    <div className="space-y-8">
      <Section title="System Architecture">
        <p>
          Standard three-tier setup. Nothing fancy, but it gets the job done:
        </p>
        <Pre>{`┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                                                              │
│   Next.js App (React)                                        │
│   - Landing page with login/register                         │
│   - Quiz interface                                           │
│   - Leaderboard display                                      │
│   - This engineering docs page                               │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/REST (JSON)
                           │ JWT in Authorization header
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API SERVER                              │
│                                                              │
│   Express.js + TypeScript                                    │
│   - Auth routes (register, login)                            │
│   - Quiz routes (get question, submit answer)                │
│   - Leaderboard routes                                       │
│   - Adaptive algorithm lives here                            │
│   - Scoring logic lives here                                 │
│                                                              │
└─────────────┬─────────────────────────────┬─────────────────┘
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│        REDIS            │   │         SQLITE              │
│                         │   │                             │
│  Real-time stuff:       │   │  Persistent stuff:          │
│  - User state (live)    │   │  - User accounts            │
│  - Leaderboards         │   │  - Questions                │
│  - Rate limiting        │   │  - Answer history           │
│  - Idempotency keys     │   │                             │
│                         │   │                             │
└─────────────────────────┘   └─────────────────────────────┘`}</Pre>
      </Section>

      <Section title="Why This Split?">
        <p>
          <strong>Separating Redis and SQLite</strong> — User state changes on every single answer, 
          and I need it fast. SQLite is great for durability but not for high-frequency writes. 
          Redis gives me sub-millisecond reads/writes, which matters when you're checking state, 
          updating leaderboards, and validating idempotency keys on every request.
        </p>
        <p>
          <strong>Stateless API server</strong> — All state lives in Redis/SQLite. The Express server 
          doesn't hold any user state in memory. This means I could spin up multiple instances 
          behind a load balancer if needed (though for this demo, one is plenty).
        </p>
        <p>
          <strong>JWT for auth</strong> — No session storage needed on the server. The token contains 
          the user ID, server just verifies the signature. Simple and scalable.
        </p>
      </Section>

      <Section title="Answer Submission Flow">
        <p>
          This is the most complex flow in the system. Here's what happens when someone clicks an answer:
        </p>
        <Pre>{`Client                     Server                     Redis          SQLite
  │                           │                          │               │
  │  POST /answer             │                          │               │
  │  (questionId, answer,     │                          │               │
  │   stateVersion, idempKey) │                          │               │
  │──────────────────────────▶│                          │               │
  │                           │                          │               │
  │                           │  1. Check idempotency    │               │
  │                           │─────────────────────────▶│               │
  │                           │     (seen this before?)  │               │
  │                           │                          │               │
  │                           │  2. Check rate limit     │               │
  │                           │─────────────────────────▶│               │
  │                           │     (1 req/sec max)      │               │
  │                           │                          │               │
  │                           │  3. Get user state       │               │
  │                           │─────────────────────────▶│               │
  │                           │                          │               │
  │                           │  4. Verify stateVersion  │               │
  │                           │     matches              │               │
  │                           │                          │               │
  │                           │  5. Check answer         │               │
  │                           │     correctness          │───────────────▶│
  │                           │                          │               │
  │                           │  6. Run adaptive algo    │               │
  │                           │     (calc new difficulty)│               │
  │                           │                          │               │
  │                           │  7. Calculate score      │               │
  │                           │                          │               │
  │                           │  8. Atomic state update  │               │
  │                           │─────────────────────────▶│               │
  │                           │     (WATCH/MULTI/EXEC)   │               │
  │                           │                          │               │
  │                           │  9. Update leaderboards  │               │
  │                           │─────────────────────────▶│               │
  │                           │                          │               │
  │                           │  10. Store idempotency   │               │
  │                           │─────────────────────────▶│               │
  │                           │                          │               │
  │◀──────────────────────────│                          │               │
  │  Response (correct?,      │                          │               │
  │  newScore, newDifficulty) │                          │               │
  │                           │                          │               │
  │                           │  11. Log answer (async)  │               │
  │                           │──────────────────────────┼──────────────▶│
  │                           │      (non-blocking)      │               │`}</Pre>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
          The answer logging to SQLite happens asynchronously — we don't make the user wait for that.
        </p>
      </Section>
    </div>
  );
}

// ============================================
// Tab: Adaptive Algorithm
// ============================================
function AlgorithmTab() {
  return (
    <div className="space-y-8">
      <Section title="The Problem">
        <p>
          The naive approach (correct → difficulty+1, wrong → difficulty-1) causes <strong>ping-pong oscillation</strong> 
          when users hover at their skill boundary:
        </p>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-sm mt-4">
          <p className="font-mono text-red-700 dark:text-red-400">
            Correct → difficulty 5 → 6<br/>
            Wrong → difficulty 6 → 5<br/>
            Correct → difficulty 5 → 6<br/>
            Wrong → difficulty 6 → 5<br/>
            ... forever bouncing
          </p>
        </div>
        <p className="mt-4">
          This happens when a user can handle level 5, struggles with 6, and the system just keeps 
          flipping back and forth. Terrible user experience.
        </p>
      </Section>

      <Section title="Alternatives Considered">
        <div className="space-y-4">
          <div className="border-l-4 border-slate-300 dark:border-slate-600 pl-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Rolling Window Average</h4>
            <p className="text-sm">
              Track last N answers, only change if accuracy above/below threshold (e.g., 70% of last 10).
            </p>
            <p className="text-sm text-slate-500 mt-1">
              <strong>Problem:</strong> Needs to store answer history, threshold feels arbitrary, users notice 
              "nothing happened" for several answers.
            </p>
          </div>

          <div className="border-l-4 border-slate-300 dark:border-slate-600 pl-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Streak-Based Threshold</h4>
            <p className="text-sm">
              Only increase after 3+ correct in a row, decrease after 2+ wrong in a row.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              <strong>Problem:</strong> Too rigid. Someone getting 2 right, 1 wrong, 2 right, 1 wrong is doing 
              okay but difficulty never changes.
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-green-700 dark:text-green-400">Momentum + Hysteresis ✓</h4>
            <p className="text-sm">
              Track floating-point "momentum" that accumulates. Only change when it crosses a threshold, then reset.
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              <strong>Why this wins:</strong> Captures trends without being rigid. A few good answers build momentum, 
              but one bad answer doesn't undo everything. Minimal state (just one number).
            </p>
          </div>
        </div>
      </Section>

      <Section title="The Solution">
        <p>
          Track a "momentum" value (-1.0 to +1.0):
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>On every answer: momentum decays by 10% (multiplied by 0.9)</li>
          <li>Correct answer: add +0.3</li>
          <li>Wrong answer: add -0.4 (slightly harsher — careful about making it too hard)</li>
          <li>If momentum &gt; +0.6: difficulty++, momentum resets to 0</li>
          <li>If momentum &lt; -0.6: difficulty--, momentum resets to 0</li>
        </ul>

        <Pre>{`function updateDifficulty(currentDifficulty, momentum, isCorrect) {
  // Decay previous momentum
  momentum = momentum * 0.9;
  
  // Apply answer impact
  if (isCorrect) {
    momentum = Math.min(1.0, momentum + 0.3);
  } else {
    momentum = Math.max(-1.0, momentum - 0.4);
  }
  
  // Check thresholds
  let newDifficulty = currentDifficulty;
  
  if (momentum > 0.6) {
    newDifficulty = Math.min(10, currentDifficulty + 1);
    momentum = 0; // Reset after change
  } else if (momentum < -0.6) {
    newDifficulty = Math.max(1, currentDifficulty - 1);
    momentum = 0; // Reset after change
  }
  
  return { newDifficulty, newMomentum: momentum };
}`}</Pre>
      </Section>

      <Section title="Why It Prevents Ping-Pong">
        <p>With alternating correct/wrong answers:</p>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg font-mono text-sm mt-2">
          <p>
            Start: momentum = 0<br/><br/>
            Correct: 0 × 0.9 + 0.3 = <strong>0.30</strong> (below 0.6, no change)<br/>
            Wrong: 0.30 × 0.9 - 0.4 = <strong>-0.13</strong> (above -0.6, no change)<br/>
            Correct: -0.13 × 0.9 + 0.3 = <strong>0.18</strong> (below 0.6, no change)<br/>
            Wrong: 0.18 × 0.9 - 0.4 = <strong>-0.24</strong> (above -0.6, no change)<br/><br/>
            <span className="text-green-600 dark:text-green-400">
              Momentum oscillates between ~-0.3 and ~+0.3, never hitting ±0.6. Difficulty stays stable.
            </span>
          </p>
        </div>

        <p className="mt-4">But 3 correct in a row:</p>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg font-mono text-sm mt-2">
          <p>
            Start: momentum = 0<br/><br/>
            Correct: 0.30<br/>
            Correct: 0.57<br/>
            Correct: 0.81 → <span className="text-green-600 dark:text-green-400">Exceeds 0.6! Difficulty UP!</span>
          </p>
        </div>
      </Section>

      <Section title="Scoring Formula">
        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg text-center">
          <p className="text-lg font-mono text-primary-700 dark:text-primary-400">
            score = difficulty × 10 × streakMultiplier
          </p>
          <p className="text-sm font-mono text-primary-600 dark:text-primary-500 mt-2">
            streakMultiplier = min(1 + streak × 0.1, 3.0)
          </p>
        </div>
        <p className="mt-4">
          Higher difficulty = more points. Longer streak = multiplier (caps at 3x when streak hits 20). 
          Wrong answers give 0 points and reset streak.
        </p>
      </Section>
    </div>
  );
}

// ============================================
// Tab: Tech Stack
// ============================================
function StackTab() {
  return (
    <div className="space-y-8">
      <Section title="Backend: Node.js + Express + TypeScript">
        <p>
          Considered Go (fast, great concurrency) and Python/FastAPI (quick to write), but landed on Node:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Most productive in it — and time was tight</li>
          <li>TypeScript gives type safety without heavy compile step</li>
          <li>Mature Redis and SQLite libraries</li>
          <li>Non-blocking I/O handles concurrent quiz sessions well</li>
        </ul>
        <p className="text-sm text-slate-500 mt-2">
          Any of those would've worked. Picked what I could move fastest with.
        </p>
      </Section>

      <Section title="Database: SQLite (not PostgreSQL)">
        <p>
          Initial plan was PostgreSQL — it's what I'd use in production. But for this:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>This is a demo, not a distributed system</li>
          <li>SQLite is zero-config — no separate server</li>
          <li>Single file, easy to reset, easy to inspect</li>
          <li>For the read patterns here (lookup by ID, filter by difficulty), plenty fast</li>
        </ul>
        <p className="mt-2">
          The limitation is SQLite only allows one writer at a time. But heavy writes (user state, leaderboards) 
          go to Redis, SQLite mostly handles reads and occasional audit logs. Not a bottleneck.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          If this needed thousands of concurrent users, swap to Postgres. Code is structured for easy migration.
        </p>
      </Section>

      <Section title="Cache & Real-time: Redis">
        <p>Redis was a no-brainer. Needed:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Fast reads/writes for user state (happens every answer)</li>
          <li>Sorted sets for leaderboards (O(log N) rank queries)</li>
          <li>Atomic operations for rate limiting and idempotency</li>
        </ul>
        
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Why Redis for Leaderboards?</h4>
          <p className="text-sm">
            In SQL, getting a user's rank means counting everyone with higher score:
          </p>
          <p className="font-mono text-xs mt-2 bg-white dark:bg-slate-800 p-2 rounded">
            SELECT COUNT(*) FROM users WHERE score &gt; my_score
          </p>
          <p className="text-sm mt-2">
            That's O(N) — gets slower with more users. Redis Sorted Sets give O(log N) with ZREVRANK. 
            For leaderboards updating on every answer, this matters.
          </p>
        </div>
      </Section>

      <Section title="Frontend: Next.js 14 + Tailwind">
        <ul className="list-disc list-inside space-y-1">
          <li>File-based routing (create a file, get a route)</li>
          <li>Built-in optimizations</li>
          <li>Easy to deploy as static or with SSR</li>
          <li>Tailwind for rapid styling without context-switching to CSS files</li>
        </ul>
      </Section>

      <Section title="Auth: JWT">
        <p>
          Token contains user ID, signed with secret. Server just verifies signature — no database or session 
          store hit on every request.
        </p>
        <p className="mt-2">
          Tradeoff: can't easily revoke tokens. For this use case, fine — tokens expire in 7 days, 
          no sensitive data requiring immediate revocation.
        </p>
      </Section>

      <Section title="Deployment: Docker Compose">
        <p>One command to start everything:</p>
        <Pre>{`docker-compose up --build

# Frontend: http://localhost:3000
# API: http://localhost:3001
# Redis: localhost:6379`}</Pre>
      </Section>
    </div>
  );
}

// ============================================
// Tab: Implementation Details (Data, API, Consistency, Edge Cases)
// ============================================
function DetailsTab() {
  return (
    <div className="space-y-12">
      {/* Data Model */}
      <Section title="Data Model">
        <Table
          headers={['Data', 'Storage', 'Reason']}
          rows={[
            ['User state', 'Redis Hash', 'Fast read/write on every answer'],
            ['Leaderboards', 'Redis Sorted Set', 'O(log N) rank queries'],
            ['Rate limits', 'Redis (1s TTL)', 'Atomic SET NX EX pattern'],
            ['Idempotency', 'Redis (5min TTL)', 'Prevent duplicate processing'],
            ['Users, Questions', 'SQLite', 'Persistent, queryable'],
            ['Answer logs', 'SQLite', 'Audit trail, async writes'],
          ]}
        />

        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-2">Redis Keys</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">user:state:&#123;userId&#125;</code> — Hash with difficulty, momentum, streak, score, stateVersion</li>
          <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">leaderboard:score</code> / <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">leaderboard:streak</code> — Sorted Sets</li>
          <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">idempotency:&#123;userId&#125;:&#123;key&#125;</code> — Cached response, 5min TTL</li>
          <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">ratelimit:&#123;userId&#125;</code> — 1 second TTL</li>
        </ul>
      </Section>

      {/* API Endpoints */}
      <Section title="API Endpoints">
        <div className="space-y-3 text-sm">
          <Endpoint method="POST" path="/v1/auth/register" desc="Create account → JWT token" />
          <Endpoint method="POST" path="/v1/auth/login" desc="Login → JWT token" />
          <Endpoint method="GET" path="/v1/quiz/next" desc="Get question at current difficulty + stateVersion" />
          <Endpoint method="POST" path="/v1/quiz/answer" desc="Submit answer with stateVersion + idempotencyKey" />
          <Endpoint method="GET" path="/v1/quiz/metrics" desc="Current user stats (difficulty, momentum, streak, accuracy)" />
          <Endpoint method="GET" path="/v1/leaderboard/score" desc="Top 10 + current user rank" />
          <Endpoint method="GET" path="/v1/leaderboard/streak" desc="Top 10 + current user rank" />
        </div>
      </Section>

      {/* Consistency */}
      <Section title="Consistency Mechanisms">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Optimistic Locking</h3>
        <p>
          Every user state has a version number. Client sends the version they read, server rejects if it changed. 
          Prevents multiple tabs from double-submitting.
        </p>

        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-2">Idempotency</h3>
        <p>
          Client generates unique key per submission. If same key arrives again (network retry), return cached response.
        </p>

        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-2">Rate Limiting</h3>
        <p>
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">SET ratelimit:userId 1 EX 1 NX</code> — 
          if key exists, reject with 429. Max 1 answer per second.
        </p>

        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-2">Atomic Updates</h3>
        <p>
          Redis WATCH/MULTI/EXEC for state updates. If anything modified the watched key between WATCH and EXEC, 
          transaction aborts. Atomicity without blocking.
        </p>
      </Section>

      {/* Edge Cases */}
      <Section title="Edge Cases Handled">
        <Table
          headers={['Case', 'Handling']}
          rows={[
            ['Ping-pong oscillation', 'Momentum + hysteresis threshold (±0.6)'],
            ['Duplicate submission', 'Idempotency key → return cached response'],
            ['Multiple tabs', 'stateVersion mismatch → 409 Conflict'],
            ['Spam clicking', 'Rate limit (1/sec) + frontend button disable'],
            ['Difficulty bounds', 'Clamped to 1-10'],
            ['Streak multiplier abuse', 'Capped at 3x'],
            ['Page refresh mid-question', 'lastQuestionId preserved in state'],
            ['Invalid questionId', 'Verify matches lastQuestionId → 400 if not'],
            ['JWT expired', '401 Unauthorized, frontend redirects to login'],
            ['No questions at difficulty', 'Fallback to difficulty 5 or any available'],
          ]}
        />
      </Section>
    </div>
  );
}

// ============================================
// Reusable Components
// ============================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
        {title}
      </h2>
      <div className="text-slate-600 dark:text-slate-400 space-y-3">
        {children}
      </div>
    </section>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4 text-slate-600 dark:text-slate-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color = method === 'GET' ? 'bg-green-600' : 'bg-blue-600';
  return (
    <div className="flex items-center gap-3">
      <span className={`${color} text-white text-xs font-bold px-2 py-0.5 rounded w-14 text-center`}>
        {method}
      </span>
      <code className="text-slate-700 dark:text-slate-300 font-mono text-xs">{path}</code>
      <span className="text-slate-500 dark:text-slate-500 text-xs">— {desc}</span>
    </div>
  );
}
