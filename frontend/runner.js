// runner.js — handles the Run button click, API call, and output rendering

const runBtn       = document.getElementById('run-btn');
const runLabel     = document.getElementById('run-label');
const runSpinner   = document.getElementById('run-spinner');
const consoleOut   = document.getElementById('console-output');
const errorOut     = document.getElementById('error-output');
const statusText   = document.getElementById('status-text');
const compileTime  = document.getElementById('compile-time');

// In Docker: set via BACKEND_URL env var → injected into window.__CPP_SHELL_BACKEND_URL__ by docker-entrypoint.sh
// Local dev (no Docker): falls back to localhost:3000
const BACKEND_URL = window.__CPP_SHELL_BACKEND_URL__ || 'http://localhost:3000/compile';

// ── Helpers ─────────────────────────────────────────────

function setRunning(state) {
  runBtn.disabled = state;
  runLabel.classList.toggle('hidden', state);
  runSpinner.classList.toggle('hidden', !state);
}

function setStatus(msg, color = '') {
  statusText.textContent = msg;
  statusText.style.color = color || 'var(--text-dim)';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Color-code stderr lines (errors vs warnings)
function colorizeErrors(text) {
  return text.split('\n').map(line => {
    if (!line.trim()) return '';
    if (/error:/i.test(line))   return `<span class="out-stderr">${escapeHtml(line)}</span>`;
    if (/warning:/i.test(line)) return `<span class="out-warn">${escapeHtml(line)}</span>`;
    if (/note:/i.test(line))    return `<span class="out-info">${escapeHtml(line)}</span>`;
    return `<span class="out-info">${escapeHtml(line)}</span>`;
  }).filter(Boolean).join('\n');
}

// Switch to a specific tab
function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.output-pane').forEach(p => {
    const id = p.id.replace('tab-', '');
    p.classList.toggle('hidden', id !== name);
    p.classList.toggle('active', id === name);
  });
}

// ── cin detection: warn user if code uses cin but stdin is empty ────
const stdinInput   = document.getElementById('stdin-input');
const stdinHint    = document.getElementById('stdin-hint');
const stdinSection = document.getElementById('stdin-section');

function checkCinUsage() {
  const code = window.editor ? window.editor.getValue() : '';
  const usesCin = /\bcin\b|\bgetline\s*\(/.test(code);
  const empty   = !stdinInput.value.trim();
  stdinHint.classList.toggle('hidden', !(usesCin && empty));
  stdinSection.classList.toggle('stdin-needs-input', usesCin && empty);
}

// Re-check whenever the editor or stdin changes
document.addEventListener('DOMContentLoaded', () => {
  if (window.editor) window.editor.on('change', checkCinUsage);
  stdinInput.addEventListener('input', checkCinUsage);
});
// Also check after editor initialises (editor.js runs before runner.js)
window.addEventListener('load', () => {
  if (window.editor) window.editor.on('change', checkCinUsage);
  checkCinUsage();
});

// ── Main Run Handler ─────────────────────────────────────

runBtn.addEventListener('click', async () => {
  const code  = window.editor.getValue().trim();
  if (!code) {
    setStatus('Nothing to compile.', 'var(--yellow)');
    return;
  }

  const std     = document.getElementById('std-select').value;
  const opt     = document.getElementById('opt-select').value;
  const wall    = document.getElementById('wall-check').checked;
  const wextra  = document.getElementById('wextra-check').checked;
  const stdin   = stdinInput.value;

  // Clear output
  consoleOut.innerHTML = '<span class="out-info">Compiling...</span>';
  errorOut.innerHTML   = '<span class="out-info">Waiting...</span>';
  showTab('console');
  setRunning(true);
  setStatus('Compiling...', 'var(--yellow)');

  const t0 = performance.now();

  try {
    const res = await fetch(BACKEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, std, opt, wall, wextra, stdin })
    });

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    if (!res.ok) {
      const err = await res.text();
      consoleOut.innerHTML = `<span class="out-stderr">Server error: ${escapeHtml(err)}</span>`;
      setStatus('Server error', 'var(--red)');
      setRunning(false);
      return;
    }

    const data = await res.json();
    // data: { stdout, stderr, exitCode, compileError }

    // ── Errors / Warnings tab
    if (data.stderr && data.stderr.trim()) {
      errorOut.innerHTML = colorizeErrors(data.stderr);
    } else {
      errorOut.innerHTML = '<span class="out-ok">✓ No warnings or errors.</span>';
    }

    // ── Console tab
    if (data.compileError) {
      // Compilation failed — show errors
      consoleOut.innerHTML =
        `<span class="out-stderr">Compilation failed.\nSee the Errors/Warnings tab for details.</span>`;
      showTab('errors');
      setStatus(`Compilation failed · ${elapsed}s`, 'var(--red)');
      compileTime.textContent = '';
    } else {
      // Ran successfully
      const stdout = data.stdout || '';

      // Render stdout lines cleanly — no stdin echoing.
      // The program's own output already includes whatever it printed after
      // reading from cin (e.g. "Hello, manish!"), so we never inject the
      // raw stdin value ourselves to avoid doubling.
      const lines = stdout.split('\n').map(l =>
        `<span class="out-stdout">${escapeHtml(l)}</span>`
      ).join('\n');

      const exitBadge = data.exitCode === 0
        ? `<span class="out-ok">Process exited with code 0</span>`
        : `<span class="out-stderr">Process exited with code ${data.exitCode}</span>`;

      consoleOut.innerHTML = (stdout.trim() ? lines + '\n\n' : '') + exitBadge;

      const color = data.exitCode === 0 ? 'var(--green)' : 'var(--red)';
      setStatus(`Exit ${data.exitCode} · ${elapsed}s`, color);
      compileTime.textContent = `Compile + run: ${elapsed}s`;

      if (data.stderr && data.stderr.trim()) showTab('errors');
    }

  } catch (err) {
    consoleOut.innerHTML =
      `<span class="out-stderr">Could not reach the backend.\n\nMake sure the Node.js server is running:\n  cd backend && node server.js\n\nError: ${escapeHtml(err.message)}</span>`;
    setStatus('Connection error', 'var(--red)');
  }

  setRunning(false);
  checkCinUsage(); // re-evaluate hint after run
});
