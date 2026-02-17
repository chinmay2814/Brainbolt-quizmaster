# 🧠 BrainBolt - Adaptive Infinite Quiz Platform

An adaptive quiz platform that dynamically adjusts difficulty based on user performance, featuring streak-based scoring and real-time leaderboards.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/chinmay2814/Brainbolt-quizmaster.git
cd Brainbolt-quizmaster #folder where this is cloned

# Run with Docker (single command)
docker-compose up --build
```

Open **http://localhost:3000** in your browser.

---

### 📖 Engineering Documentation

Want to understand how it works under the hood? Check out the **[Engineering Architecture page →](http://localhost:3000/engineering)**

Covers system design, the adaptive difficulty algorithm (momentum + hysteresis), database schema, API design, consistency strategies, and all the technical decisions.

---

## Features

### Core Functionality
- ✅ **Adaptive Difficulty** (1-10): Uses momentum + hysteresis algorithm to prevent ping-pong oscillation
- ✅ **Streak System**: Consecutive correct answers build streak multiplier (up to 3x)
- ✅ **Real-time Leaderboards**: Score and streak rankings updated immediately
- ✅ **Idempotent Submissions**: Duplicate answers return cached response
- ✅ **Optimistic Locking**: Prevents race conditions with stateVersion

### Tech Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (persistent file)
- **Cache/RT**: Redis (sorted sets for leaderboards)
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Auth**: JWT (stateless)
- **Container**: Docker + docker-compose

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌───────────┐
│   Browser   │────▶│  Next.js    │────▶│  Express  │
│  (React)    │◀────│  Frontend   │◀────│  Backend  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                    ┌──────────┐        ┌──────────┐        ┌──────────┐
                    │  Redis   │        │  SQLite  │        │ Redis    │
                    │  State   │        │  Users   │        │ ZSET     │
                    │  Cache   │        │  Logs    │        │ Leaders  │
                    └──────────┘        └──────────┘        └──────────┘
```

---

## Adaptive Algorithm

### Problem: Ping-Pong Oscillation
Naive algorithms cause difficulty to flip between levels when users alternate correct/wrong answers.

### Solution: Momentum + Hysteresis

```
momentum = momentum * 0.9 + (correct ? +0.3 : -0.4)

if momentum > 0.6:  difficulty += 1, momentum = 0
if momentum < -0.6: difficulty -= 1, momentum = 0
```

**Why it works:**
- Ping-pong: momentum oscillates but never reaches ±0.6
- Consistent performance: 3 correct answers triggers difficulty increase

### Scoring Formula

```
scoreDelta = difficulty * 10 * streakMultiplier
streakMultiplier = min(1 + streak * 0.1, 3.0)
```

| Difficulty | Streak | Base | Multiplier | Score |
|------------|--------|------|------------|-------|
| 5          | 0      | 50   | 1.0x       | 50    |
| 5          | 5      | 50   | 1.5x       | 75    |
| 10         | 20+    | 100  | 3.0x (cap) | 300   |

---

## API Endpoints

### Authentication
```
POST /v1/auth/register  { username, password } → { token, user }
POST /v1/auth/login     { username, password } → { token, user }
```

### Quiz
```
GET  /v1/quiz/next      → { questionId, difficulty, prompt, choices, stateVersion, ... }
POST /v1/quiz/answer    { questionId, answerIndex, stateVersion, idempotencyKey } → { correct, scoreDelta, ... }
GET  /v1/quiz/metrics   → { currentDifficulty, momentum, streak, accuracy, ... }
```

### Leaderboard
```
GET /v1/leaderboard/score   → { leaderboard: [...], currentUser }
GET /v1/leaderboard/streak  → { leaderboard: [...], currentUser }
GET /v1/leaderboard/stream  → SSE real-time updates
```

---

## Data Model

### Redis (Real-time State)
```
user:state:{userId}     → Hash { difficulty, momentum, streak, ... }
leaderboard:score       → Sorted Set (userId → score)
leaderboard:streak      → Sorted Set (userId → maxStreak)
idempotency:{userId}:{key} → String (cached response, TTL 5min)
ratelimit:{userId}      → String (TTL 1sec)
```

### SQLite (Persistent)
```sql
users (id, username, password_hash, created_at)
questions (id, difficulty, prompt, choices, correct_index, category)
user_state (user_id, difficulty, momentum, streak, max_streak, total_score, ...)
answer_log (id, user_id, question_id, answer_index, correct, score_delta, ...)
```

---

## Edge Cases Handled

| Case | Handling |
|------|----------|
| Ping-pong oscillation | Momentum + hysteresis threshold |
| Duplicate submission | Idempotency key returns cached response |
| Race condition | Optimistic locking with stateVersion |
| Rate limiting | 1 answer/second via Redis SET NX EX |
| Difficulty bounds | Clamped to 1-10 |
| Streak cap | Multiplier capped at 3.0x |

---

## Development

### Without Docker

**Backend:**
```bash
cd backend
npm install
npm run seed  # Seed questions
npm run dev   # Start with hot reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Redis:**
```bash
docker run -p 6379:6379 redis:7-alpine
```

---

## Project Structure

```
brainbolt/
├── docker-compose.yml          # Single command orchestration
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.ts            # Express server entry
│   │   ├── config.ts           # Configuration
│   │   ├── types.ts            # TypeScript types
│   │   ├── seed.ts             # Database seeder
│   │   ├── db/
│   │   │   ├── sqlite.ts       # SQLite setup
│   │   │   └── redis.ts        # Redis client
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts         # Auth endpoints
│   │   │   ├── quiz.ts         # Quiz endpoints
│   │   │   └── leaderboard.ts  # Leaderboard endpoints
│   │   └── services/
│   │       ├── adaptive.ts     # Difficulty algorithm
│   │       └── scoring.ts      # Score calculation
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx            # Auth page
    │   ├── globals.css
    │   ├── quiz/
    │   │   └── page.tsx        # Quiz interface
    │   └── engineering/
    │       └── page.tsx        # Technical documentation
    └── lib/
        ├── api.ts              # API client
        └── auth.tsx            # Auth context
```

---

## License

MIT
