# CODE SLAYER

> **Code together. Trust no one.**  
> *Project by Team Tarnished | CodeX 3.0*

**Code Slayer** is a real-time multiplayer social-deduction coding game for the browser. Players collaborate to solve real algorithmic and software engineering challenges in a shared live editor while one or more hidden Impostors secretly sabotage the codebase.

When unexpected bugs appear or test suites break, players call **Emergency Meetings** to analyze code diffs, present evidence from the edit audit ledger, debate, and vote to eliminate suspects.

---

## Table of Contents

1. [Product Architecture & Gameplay Loop](#1-product-architecture--gameplay-loop)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Environment Setup](#4-environment-setup)
5. [Database Setup & Persistence (PostgreSQL & MongoDB)](#5-database-setup--persistence-postgresql--mongodb)
6. [Starting the Multiplayer Server](#6-starting-the-multiplayer-server)
7. [Starting the Frontend Application](#7-starting-the-frontend-application)
8. [Connecting Judge0 Code Execution](#8-connecting-judge0-code-execution)
9. [Running a Local Multiplayer Match](#9-running-a-local-multiplayer-match)
10. [Running Automated Tests](#10-running-automated-tests)
11. [Deployment Guide](#11-deployment-guide)
12. [Feature Availability Matrix](#12-feature-availability-matrix)

---

## 1. Product Architecture & Gameplay Loop

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CODE SLAYER ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Next.js 14 (App Router) ◄─── Socket.IO Events ───► Node.js Server    │
│   • Monaco Code Editor          (Match lifecycle,   • State Machine    │
│   • Yjs CRDT Synchronization    Voting, Sabotage)   • Role Secrecy     │
│   • Live Execution Console                          • Evidence Ledger  │
│                                                            │           │
│                           ▲                                │           │
│                           │                                ▼           │
│                    Yjs CRDT Stream                Sandbox Execution    │
│                           │                       • Judge0 API         │
│                           ▼                       • Local Dev Runner   │
│                   PostgreSQL Database             (JS, Python, C++)    │
│                   (Matches, Participants,                              │
│                    Votes, Event Audit)                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### The 8-Phase Gameplay Lifecycle

1. **Room Creation:** Host creates a room, sets language (Python, JavaScript, C++), difficulty, and invite code.
2. **Lobby & Join:** 4 to 8 players join via 6-character room code or invite link. Guest mode allows instant 1-click entry without registration.
3. **Secret Role Assignment:** Server assigns roles (`good-coder` vs. `imposter`) and unicasts them privately. Roles are never broadcast to the room.
4. **Collaborative Coding:** Players edit in real-time with Monaco Editor and Yjs CRDT synchronization. Protected function signatures prevent accidental deletion.
5. **Solo Mini-Tasks:** Developers solve targeted mini-tasks (bug fixes, edge cases) to advance shared team progress toward 100%.
6. **Covert Sabotage:** Impostors inject subtle runtime/syntax bugs, apply code blurs, or trigger deceptive suggestions. Sabotage is recorded anonymously in the server evidence ledger.
7. **Emergency Meetings & Evidence Presentation:** Players pause the game to debate. Players can review the **Code Evidence Ledger**, cite suspicious line diffs in chat, and cast votes. Ties result in no ejection.
8. **Authoritative Win Resolution:**
   - **Team Victory:** Team achieves 100% test progress or ejects all Impostors.
    - **Impostor Victory:** Match timer expires (15 min) or Impostors achieve parity with remaining Developers.

### Devception Jr. — local pilot

Open **`/jr`**, or choose **Devception Jr.** in the site navigation or Play menu.
The junior route requires no account or backend. Robot Rescue is a hand-authored
5×5 mission: collect the star and reach home using a short block program.

- Native Blockly dragging plus large tap/keyboard buttons; Start and Finish are fixed anchors.
- One, two, or three players sharing a device. Add, insert, change, remove, or pass;
  each accepted action advances the visible turn. Running is a separate team confirmation.
- Deterministic command interpreter with allowlist/size validation, wall and edge checks,
  visible step playback, failure highlighting, and encouraging repair hints.
- Optional browser narration, adjustable playback speed, and automatic local plan/progress saving.

This implements the initial local-loop milestone. Network rooms, remote turn authority,
and the next two missions are future milestones. Local turn validation is not a
multiplayer security boundary. No Jr. free-form chat or AI is used.

Core modules are in `devception-client/src/lib/jr`; the isolated UI is in
`devception-client/src/components/jr` and `src/app/jr`.

---

## 2. Prerequisites

Before running Code Slayer locally, ensure the following are installed:

- **Node.js:** `>= 20.0.0` (Recommended: Node.js 22 LTS or 24 LTS)
- **npm:** `>= 10.0.0`
- **Git**
- **Optional Local Compilers (for offline fallback sandbox):**
  - `python3` (for local Python sandbox fallback)
  - `g++` / `clang++` (for local C++ sandbox fallback)
- **Optional Database Instances:**
  - **PostgreSQL 14+** (Local or hosted via Neon, Supabase, Railway)
  - **MongoDB 6+** (Local or MongoDB Atlas)

---

## 3. Installation

Clone the repository and install dependencies for both the backend server and frontend client:

```bash
# 1. Clone repository
git clone https://github.com/bhaupupu/codex-3.0.git
cd "codex 3.0"

# 2. Install backend dependencies
cd devception-server
npm install

# 3. Install frontend dependencies
cd ../devception-client
npm install

# Return to root
cd ..
```

---

## 4. Environment Setup

Copy the environment templates in both services:

### Server Environment (`devception-server/.env`)

```bash
cd devception-server
cp .env.example .env
```

Key variables in `devception-server/.env`:

| Variable | Description | Default / Recommended |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP & WebSocket port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/codeslayer` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/codex` |
| `CLIENT_ORIGIN` | Allowed CORS origin for frontend | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Shared JWT signing secret | Generate with `openssl rand -hex 32` |
| `JUDGE0_API_URL` | Judge0 endpoint (Optional) | `https://judge0-ce.p.rapidapi.com` or blank |
| `JUDGE0_API_KEY` | Judge0 API Key (Optional) | RapidAPI key or blank for local sandbox |
| `GAME_DURATION_MS` | Standard match length (15 min) | `900000` |
| `MIN_PLAYERS` | Minimum players to launch match | `4` |
| `MAX_PLAYERS` | Maximum room capacity | `8` |

### Client Environment (`devception-client/.env.local`)

```bash
cd ../devception-client
cp .env.example .env.local
```

Key variables in `devception-client/.env.local`:

| Variable | Description | Default / Recommended |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Server REST API URL | `http://localhost:5000/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Server WebSocket endpoint | `http://localhost:5000` |
| `NEXTAUTH_URL` | Frontend URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth secret (Must match server) | Same as server `NEXTAUTH_SECRET` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (Optional) | Optional (Guest mode works out of the box) |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret (Optional)| Optional |

---

## 5. Database Setup & Persistence (PostgreSQL & MongoDB)

Code Slayer uses a dual-persistence model:
1. **PostgreSQL:** Server-authoritative match records, participant statistics, voting histories, and evidence audit trails.
2. **MongoDB:** High-frequency active room sessions, ready states, and persistent user profile tracking.

### PostgreSQL Automatic Schema Setup

You do **not** need to manually run SQL migration scripts. The server's PostgreSQL service (`src/services/postgres.service.ts`) automatically validates and creates all relational tables on startup:

- `users` — Registered accounts and persistent stats
- `rooms` — Room settings and configuration
- `matches` — Completed match outcomes, winner, progress, and duration
- `match_participants` — Individual player roles, alive states, tasks, and XP
- `match_votes` — Authoritative emergency meeting voting audit records
- `match_events` — Sabotage, test regressions, and evidence timelines

To create the local PostgreSQL database:
```sql
CREATE DATABASE codeslayer;
```

> **Zero-Config Resiliency:** If `DATABASE_URL` is omitted or PostgreSQL is unreachable, the server logs a clean warning and falls back to MongoDB / in-memory persistence without crashing or interrupting gameplay.

---

## 6. Starting the Multiplayer Server

Start the backend Node.js game server:

```bash
cd devception-server
npm run dev
```

The game server starts on `http://localhost:5000`. You will see output confirming:
- Express HTTP & Socket.IO initialization
- MongoDB connection status
- PostgreSQL connection and schema initialization
- Python and C++ local sandbox availability detection

To run a production build:
```bash
npm run build
npm start
```

---

## 7. Starting the Frontend Application

In a separate terminal, start the Next.js development server:

```bash
cd devception-client
npm run dev
```

The client application will be accessible at `http://localhost:3000`.

---

## 8. Connecting Judge0 Code Execution

Code Slayer executes untrusted player submissions in a sandboxed execution environment.

### Option A: Cloud Judge0 (RapidAPI)
1. Sign up for a free key on [RapidAPI Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce).
2. Add your credentials to `devception-server/.env`:
   ```env
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your-rapidapi-key
   JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
   ```

### Option B: Self-Hosted Docker Judge0
Run Judge0 CE locally using Docker Compose:
```bash
docker run -d -p 2358:2358 judge0/judge0:latest
```
Set in `devception-server/.env`:
```env
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=
JUDGE0_API_HOST=
```

### Option C: Built-in Local Development Fallback (Default)
If `JUDGE0_API_URL` is omitted, Code Slayer automatically falls back to the internal development sandbox:
- **JavaScript:** Isolated V8 VM context (`node:vm`) with captured stdout, memory guards, and execution timeout.
- **Python:** Local sandboxed `python3` process with argument isolation.
- **C++:** Local `g++` compilation and execution with strict time bounds.

The client's **Execution Console** dynamically displays a `⚡ LOCAL DEV SANDBOX` or `🛡️ JUDGE0 SANDBOX` badge so players and developers always know the active execution engine.

---

## 9. Running a Local Multiplayer Match

To test a full 4-player game on your local machine:

1. Open `http://localhost:3000` in your primary browser window.
2. Click **"Play as Guest"** or sign in with Google.
3. Click **"Create Room"**. Select your challenge language (JavaScript, Python, or C++) and difficulty.
4. Copy the generated **Room Code** (e.g. `XK92A1`).
5. Open **3 additional private/incognito browser windows** (or different browser profiles).
6. In each window, open `http://localhost:3000`, enter a guest name (e.g. *Bob*, *Charlie*, *Diana*), click **"Join Room"**, and enter the Room Code.
7. In the lobby, click **"Ready Up"** in all four windows.
8. The host (or room admin) clicks **"Start Match"**.
9. **Experience the full game loop:**
   - Observe private role assignment (each player privately sees their own role).
   - Edit code in the Monaco Editor and observe instant real-time synchronization.
   - Run tests using the **Execution Console** ("RUN TESTS" / "SUBMIT").
   - As the Impostor, trigger a sabotage action.
   - In any window, click **"🚨 EMERGENCY MEETING"**.
   - Open the **"🔍 CODE EVIDENCE"** tab to view suspicious line edits and test regressions.
   - Switch to **"🗳️ VOTING"** to cast votes. Watch tie resolution or player elimination!

---

## 10. Running Automated Tests

Code Slayer includes an automated integration and game loop test suite.

Run all tests from `devception-server`:

```bash
cd devception-server
npm test
```

### What the Test Suite Verifies:
- **Evaluator Suite (`evaluator.test.ts`):**
  - JavaScript, Python, and C++ challenge test runners
  - False-positive guards (hollow shell / deleted body rejection)
  - Edge case handling
- **Full Multiplayer Game Loop Suite (`gameLoop.test.ts`):**
  - Room creation, player limits clamping, and connection tracking
  - Secret role assignment and role secrecy verification
  - Sanitization of sensitive task solutions before client broadcasts
  - Monaco editor operational transformation & stale-version rejection
  - Protected signature violation detection
  - Impostor sabotage anonymity & evidence ledger recording
  - Test regression tracking
  - Mini-task progress tracking and anti-spoofing guards
  - Emergency meetings, voting constraints, tie resolution, and elimination
  - Server-authoritative win condition evaluation (Team vs. Impostor victory)
  - Sandboxed execution diagnostics

---

## 11. Deployment Guide

### Deploying Frontend (`devception-client`) to Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Root Directory to `devception-client`.
4. Configure environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://codeslayer-server.onrender.com/api`)
   - `NEXT_PUBLIC_SOCKET_URL`: Your deployed backend URL (e.g. `https://codeslayer-server.onrender.com`)
   - `NEXTAUTH_URL`: Your Vercel domain (e.g. `https://codeslayer.vercel.app`)
   - `NEXTAUTH_SECRET`: Your generated secret
5. Deploy.

### Deploying Backend (`devception-server`) to Render / Railway / Cloud
Because the backend maintains persistent WebSockets and in-memory Yjs CRDT rooms, it must be hosted on a persistent container service:

- **Docker:** Use the included `devception-server/Dockerfile`:
  ```bash
  cd devception-server
  docker build -t codeslayer-server .
  docker run -p 5000:5000 codeslayer-server
  ```
- **Render:** Connect the repo and use the included `render.yaml`.
- **Railway:** Connect the repo and use the included `railway.json`. Set environment variables in the Railway dashboard.

---

## 12. Feature Availability Matrix

| Feature | Works Out of the Box (Zero Config) | Requires External Credentials | Configuration Key |
| :--- | :---: | :---: | :--- |
| **Guest Authentication** | ✅ Yes | — | None |
| **Google Sign-In** | Optional (fallback to Guest) | Optional | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Real-time Lobby (4–8 Players)** | ✅ Yes | — | None |
| **Secret Role Assignment** | ✅ Yes | — | None |
| **Monaco + Yjs Shared Coding** | ✅ Yes | — | None |
| **Protected Code Signatures** | ✅ Yes | — | None |
| **Mini-Task System** | ✅ Yes | — | None |
| **Impostor Sabotage Actions** | ✅ Yes | — | None |
| **Code Evidence Ledger** | ✅ Yes | — | None |
| **Emergency Meetings & Voting** | ✅ Yes | — | None |
| **JavaScript / Python / C++ Sandbox** | ✅ Yes (Local Dev Fallback) | Optional (for Cloud Sandbox) | `JUDGE0_API_URL`, `JUDGE0_API_KEY` |
| **PostgreSQL Durable Persistence** | ✅ Yes (with Postgres running) | Optional (falls back gracefully) | `DATABASE_URL` |
| **Redis Multi-Pod Scaling** | Single instance default | Optional (for clustering) | `REDIS_URL` |

---

## License & Credits

Built with pride by **Team Tarnished** for **CodeX 3.0**.  
Licensed under the [MIT License](LICENSE).
