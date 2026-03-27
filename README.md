# C++ Shell — Online Compiler

A **cpp.sh-inspired** online C++ compiler with a modern React + TypeScript frontend,
a Node.js/TypeScript backend, and **live streaming output** via WebSocket.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser  (React + Vite + CodeMirror 6 + Zustand)              │
│                                                                 │
│  FileExplorer │ Editor (CodeMirror) │ Terminal (stdout/stderr)  │
│               │        Toolbar      │                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          ┌────────────┴─────────────┐
          │  POST /api/compile       │  REST — compile request
          │  WS   /ws/run/:sessionId │  WebSocket — live output stream
          └────────────┬─────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  Backend  (Node.js + Express + ws)                              │
│                                                                 │
│  src/                                                           │
│  ├── server.ts         Express + WebSocket server (:3001)       │
│  ├── compiler.ts       g++ compile → binary, runSession → WS    │
│  └── routes/compile.ts POST /api/compile handler                │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User clicks Run
    │
    ▼
POST /api/compile  { code, options }
    │
    ▼  g++ compiles → binary stored in os.tmpdir()
    │
    ◄── { success: true, sessionId: "uuid" }
    │
    ▼
WebSocket  ws://localhost/ws/run/:sessionId
    │
    ▼  binary spawned, stdin piped in
    │
    ◄── { type: "stdout", data: "…" }   ← streamed live
    ◄── { type: "stderr", data: "…" }
    ◄── { type: "exit",   data: "…code 0…" }
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **UI framework** | React 18 + TypeScript |
| **Build tool** | Vite 5 |
| **Editor** | CodeMirror 6 (`@uiw/react-codemirror`) |
| **State** | Zustand |
| **Backend** | Node.js + Express 4 + `ws` |
| **Compiler** | `g++` (swap for `em++` for WebAssembly output) |
| **Styling** | CSS Modules — Dracula dark theme |
| **Containerisation** | Docker + docker-compose + nginx |

---

## Local Development (no Docker)

### Prerequisites

- Node.js 18+
- `g++` on your PATH  
  - **Linux/macOS:** `sudo apt install g++` / `brew install gcc`  
  - **Windows:** Install [MinGW-w64](https://www.mingw-w64.org/) or use WSL2

### 1 — Start the backend

```bash
cd backend
npm install
npm run dev          # ts-node-dev watches src/ and auto-restarts
```

Server starts at **http://localhost:3001**

### 2 — Start the frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server with HMR
```

Open **http://localhost:5173**

> Vite proxies `/api/*` and `/ws/*` to `localhost:3001` automatically.

---

## Docker (production)

### Multi-container — recommended

```bash
docker compose up --build
```

| Service | Port | URL |
|---|---|---|
| `frontend` | 8080 | http://localhost:8080 |
| `backend`  | 3001 | http://localhost:3001 (debug only) |

nginx serves the Vite build and proxies `/api/` and `/ws/` to the backend container.

### Single-container — dev/CI

```bash
docker build -t cpp-shell .
docker run -p 8080:8080 -p 3001:3001 cpp-shell
```

Both backend and frontend run inside one container via `concurrently`.

---

## Project Structure

```
web_assembly/
│
├── frontend/                   React + Vite app
│   ├── src/
│   │   ├── main.tsx            Entry point
│   │   ├── App.tsx             Root layout — wires all panels together
│   │   ├── index.css           Global CSS design tokens (dark theme)
│   │   ├── types/index.ts      Shared TypeScript types
│   │   ├── store/
│   │   │   └── useEditorStore.ts  Zustand global state
│   │   ├── hooks/
│   │   │   ├── useCompiler.ts  POST /api/compile
│   │   │   └── useTerminal.ts  WebSocket /ws/run/:sessionId
│   │   └── components/
│   │       ├── Layout/         Header + footer shell
│   │       ├── Toolbar/        Compiler options + Run/Stop buttons
│   │       ├── Editor/         CodeMirror 6 editor + stdin panel
│   │       ├── Terminal/       Live output console + errors tab
│   │       └── FileExplorer/   Sidebar (extensible for multi-file)
│   │
│   ├── nginx.conf              Nginx config (prod) — serves + proxies
│   ├── Dockerfile              Multi-stage: Vite build → nginx
│   ├── vite.config.ts          Dev proxy for /api and /ws
│   └── package.json
│
├── backend/                    Node.js + TypeScript API
│   ├── src/
│   │   ├── server.ts           Express + WebSocket server
│   │   ├── compiler.ts         g++ compile + streaming run via WS
│   │   └── routes/compile.ts   POST /api/compile
│   │
│   ├── temp/                   Temporary per-session files (auto-cleaned)
│   ├── Dockerfile              node:20-slim + g++ + tsc build
│   ├── tsconfig.json
│   └── package.json
│
├── Dockerfile                  Single-container build (dev/CI)
├── docker-compose.yml          Multi-container prod setup
├── docker-entrypoint.sh        Single-container startup script
└── README.md
```

---

## Features

| Feature | Detail |
|---|---|
| **Live streaming output** | stdout/stderr streamed token-by-token via WebSocket |
| **Interactive stdin** | Pre-supply stdin before running; sent on WS open |
| **Kill process** | Stop button sends `{ type: "kill" }` over WebSocket |
| **cin detection** | Editor warns if code uses `cin` but stdin is empty |
| **C++ standard** | C++14 / C++17 / C++20 selectable |
| **Optimisation** | -O0 through -O3 |
| **Warnings** | -Wall and -Wextra toggles |
| **Syntax highlighting** | CodeMirror 6 with Dracula theme + bracket matching |
| **Keyboard shortcut** | `Ctrl+Enter` / `Cmd+Enter` to compile and run |
| **Errors tab** | Compiler errors/warnings colour-coded (red/yellow/dim) |
| **Docker ready** | One command: `docker compose up --build` |

---

## Extending

### Swap g++ → em++ (WebAssembly)
In `backend/src/compiler.ts`, change:
```ts
const proc = spawn('g++', [...flags, srcFile, '-o', outFile])
```
to:
```ts
const proc = spawn('em++', [...flags, srcFile, '-o', outJS,
  '-s', 'ENVIRONMENT=node', '-s', 'EXIT_RUNTIME=1'])
```
And run the `.js` output with Node instead of executing the binary directly.

### Multi-file support
The `FileExplorer` component is already structured to support multiple files.
Extend `useEditorStore` with a `files: Map<string, string>` and update the
compile route to write all files before invoking `g++`.
