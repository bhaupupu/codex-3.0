# DEVCEPTION

> **Code together. Trust no one.**  
> *Project by Team Tarnished | CodeX 3.0*

**Devception** is a real-time multiplayer social-deduction coding game for the browser. Players collaborate to solve real algorithmic and software engineering challenges in a shared live editor while one or more hidden Impostors secretly sabotage the codebase.

When unexpected bugs appear or test suites break, players call **Emergency Meetings** to analyze code diffs, present evidence from the edit audit ledger, debate, and vote to eliminate suspects.

---

## 🌟 Key Features

- **⚡ Real-Time CRDT Collaboration:** Monaco Editor synchronized with sub-millisecond Yjs CRDTs and live cursor presence.
- **🕵️ Social Deduction & Sabotage:** Secret role distribution (`good-coder` vs. `imposter`) with anonymous sabotages (subtle bugs, syntax traps, editor blurs).
- **🚨 Emergency Meetings & Evidence Ledger:** Pause the match to debate, review chronological line-by-line code edit diffs, and cast elimination votes.
- **🛡️ Sandboxed Code Execution:** Secure, multi-language test execution for **JavaScript**, **Python**, and **C++** via Judge0 API with automatic local sandboxed fallback.
- **🧩 Devception Jr.:** Zero-backend, block-based collaborative programming mode (Blockly) for accessible team puzzle solving.
- **💾 Resilient Persistence:** Hybrid persistence using PostgreSQL for authoritative match audits and MongoDB for high-frequency room state.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEVCEPTION ARCHITECTURE                         │
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

---

## 🔄 Core Gameplay Loop

1. **Lobby & Role Assignment:** Host configures room language and difficulty. Players join instantly with 1-click guest authentication. Server securely unicasts secret roles.
2. **Collaborative Coding & Mini-Tasks:** Developers write code to pass the main test suite and solve individual mini-tasks to advance team progress.
3. **Covert Sabotage:** Impostors covertly trigger sabotages and inject subtle flaws without being detected.
4. **Emergency Meetings & Trials:** Players call emergency meetings, inspect the **Code Evidence Ledger** to trace suspicious diffs, debate in chat, and vote to eliminate suspects.
5. **Win Conditions:**
   - **Developers Win:** Achieve 100% test completion or successfully eject all Impostors.
   - **Impostors Win:** Match countdown expires (15 min) or Impostors match the surviving Developer count.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Monaco Editor, Yjs CRDTs
- **Backend:** Node.js, Express, Socket.IO, Redis (scaling & pub/sub)
- **Database:** PostgreSQL (match records, audits, stats), MongoDB (active sessions)
- **Code Execution:** Judge0 CE API / Local V8 & native compiler fallback

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`
- Optional: PostgreSQL & MongoDB (server includes in-memory / zero-config fallbacks for local dev)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/bhaupupu/codex-3.0.git
cd "codex 3.0"

# Install backend dependencies
cd devception-server && npm install

# Install frontend dependencies
cd ../devception-client && npm install
```

### 3. Environment Setup
```bash
# Backend config
cd ../devception-server
cp .env.example .env

# Frontend config
cd ../devception-client
cp .env.example .env.local
```

### 4. Run Development Servers
Open two terminal windows:

```bash
# Terminal 1: Backend Server (http://localhost:5000)
cd devception-server
npm run dev
```

```bash
# Terminal 2: Frontend Client (http://localhost:3000)
cd devception-client
npm run dev
```

Visit **`http://localhost:3000`**, click **"Play as Guest"**, create a room, and share the room code to start playing!

---

## 🧪 Testing

Run backend unit and game-loop integration tests:
```bash
cd devception-server
npm test
```

---

## 📄 License & Credits

Built by **Team Tarnished** for **CodeX 3.0**.  
Licensed under the [MIT License](LICENSE).
