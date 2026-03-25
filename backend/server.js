// server.js — Express API server

const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const { compileAndRun } = require('./compile');

const app  = express();
const PORT = 3000;

// ── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '512kb' }));

// ── Input validation ─────────────────────────────────────
const ALLOWED_STD = ['c++14', 'c++17', 'c++20'];
const ALLOWED_OPT = ['O0', 'O1', 'O2', 'O3'];
const MAX_CODE_LEN = 64 * 1024; // 64 KB

// ── Routes ───────────────────────────────────────────────

app.get('/health', (_, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/compile', async (req, res) => {
  const {
    code   = '',
    std    = 'c++17',
    opt    = 'O2',
    wall   = true,
    wextra = false,
    stdin  = '',
  } = req.body;

  // Validate
  if (!code.trim()) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  if (code.length > MAX_CODE_LEN) {
    return res.status(400).json({ error: 'Code too large (max 64 KB).' });
  }
  if (!ALLOWED_STD.includes(std)) {
    return res.status(400).json({ error: `Invalid std: ${std}` });
  }
  if (!ALLOWED_OPT.includes(opt)) {
    return res.status(400).json({ error: `Invalid opt: ${opt}` });
  }

  const id = uuidv4();
  console.log(`[${new Date().toISOString()}] Compile request ${id} | std=${std} opt=${opt}`);

  try {
    const result = await compileAndRun({
      id,
      code,
      std,
      opt,
      wall:   Boolean(wall),
      wextra: Boolean(wextra),
      stdin:  String(stdin).slice(0, 4096),
    });

    console.log(`[${id}] exit=${result.exitCode} compileError=${result.compileError}`);
    res.json(result);

  } catch (err) {
    console.error(`[${id}] Unhandled error:`, err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 C++ Shell backend running at http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/compile`);
  console.log(`   GET  http://localhost:${PORT}/health\n`);
});
