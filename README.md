# C++ Shell — Online Compiler

A **cpp.sh clone** that compiles C++ in the browser via **Emscripten → WebAssembly**.

---

## Architecture

```
Browser (Vanilla JS + CodeMirror)
        │
        │  POST /compile  { code, std, opt, wall, wextra, stdin }
        ▼
Node.js + Express (backend/server.js)
        │
        │  shells out to em++
        ▼
Emscripten compiler  →  produces .js + .wasm
        │
        │  runs the .js with Node, feeds stdin
        ▼
stdout / stderr / exitCode  →  JSON response back to browser
```

---

## Prerequisites

### 1. Node.js
Download from https://nodejs.org (v18+ recommended)

### 2. Emscripten SDK
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh        # Linux/macOS
# OR on Windows:
emsdk_env.bat
```

Make sure `em++` is on your PATH:
```bash
em++ --version
```

---

## Running

### Start the backend
```bash
cd backend
npm install
node server.js
```
Server starts at **http://localhost:3000**

### Open the frontend
Just open `frontend/index.html` in your browser.
> No build step required — it's plain HTML/CSS/JS.

---

## Features

| Feature | Details |
|---|---|
| **Syntax highlighting** | CodeMirror 5 with Dracula theme |
| **C++ standard** | C++14 / C++17 / C++20 |
| **Optimisation** | -O0 through -O3 |
| **Warnings** | -Wall and -Wextra toggles |
| **Stdin support** | Feed input to your program |
| **Coloured output** | Errors in red, warnings in yellow, stdout in white |
| **Timeout protection** | 15 s max compile + run |
| **Keyboard shortcut** | Ctrl+Enter / Cmd+Enter to Run |

---

## Project Structure

```
web_assembly/
├── frontend/
│   ├── index.html     # UI shell
│   ├── style.css      # Dark theme styles
│   ├── editor.js      # CodeMirror setup + tab/clear logic
│   └── runner.js      # Run button handler + output rendering
├── backend/
│   ├── server.js      # Express server + input validation
│   ├── compile.js     # em++ invocation + Node execution
│   ├── temp/          # Temporary per-request files (auto-cleaned)
│   └── package.json
└── README.md
```
