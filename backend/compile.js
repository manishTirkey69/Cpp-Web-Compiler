// compile.js — shells out to em++ (Emscripten) to compile C++ → WebAssembly/JS
// then runs the produced JS via Node for stdout/stderr capture

const { execFile, spawn } = require('child_process');
const path  = require('path');
const fs    = require('fs');

const TEMP_DIR    = path.join(__dirname, 'temp');
const TIMEOUT_MS  = 15000;   // 15 s compile + run limit

/**
 * Compile and run C++ code via Emscripten.
 *
 * @param {object} opts
 * @param {string} opts.id       - Unique session ID
 * @param {string} opts.code     - C++ source code
 * @param {string} opts.std      - e.g. "c++17"
 * @param {string} opts.opt      - e.g. "O2"
 * @param {boolean} opts.wall
 * @param {boolean} opts.wextra
 * @param {string} opts.stdin    - stdin data to feed the program
 * @returns {Promise<{stdout, stderr, exitCode, compileError}>}
 */
async function compileAndRun({ id, code, std, opt, wall, wextra, stdin }) {
  const srcFile  = path.join(TEMP_DIR, `${id}.cpp`);
  const outJS    = path.join(TEMP_DIR, `${id}.js`);
  // Emscripten also produces a .wasm next to the .js
  const outWasm  = path.join(TEMP_DIR, `${id}.wasm`);

  // 1. Write source
  fs.writeFileSync(srcFile, code, 'utf8');

  // 2. Build em++ flags
  const flags = [
    srcFile,
    `-std=${std}`,
    `-${opt}`,
    '-o', outJS,
    // Emscripten flags for Node-runnable output
    '-s', 'ENVIRONMENT=node',
    '-s', 'EXIT_RUNTIME=1',
  ];
  if (wall)   flags.push('-Wall');
  if (wextra) flags.push('-Wextra');

  // 3. Compile
  const compileResult = await runProcess('em++', flags, '', TIMEOUT_MS);

  if (compileResult.exitCode !== 0) {
    cleanup(srcFile, outJS, outWasm);
    return {
      stdout:       '',
      stderr:       compileResult.stderr,
      exitCode:     compileResult.exitCode,
      compileError: true,
    };
  }

  // 4. Run the produced JS with Node, feeding stdin
  const runResult = await runProcess('node', [outJS], stdin, TIMEOUT_MS);

  cleanup(srcFile, outJS, outWasm);

  return {
    stdout:       runResult.stdout,
    stderr:       compileResult.stderr + runResult.stderr,  // include any warnings
    exitCode:     runResult.exitCode,
    compileError: false,
  };
}

/**
 * Run a child process, capturing stdout/stderr.
 */
function runProcess(cmd, args, stdinData, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (stdinData) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({
          stdout,
          stderr: stderr + '\n[Killed: execution timed out after ' + timeoutMs / 1000 + 's]',
          exitCode: -1,
        });
      } else {
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout: '',
        stderr: `Failed to launch '${cmd}': ${err.message}\n\nMake sure Emscripten (em++) is installed and on your PATH.\nInstall: https://emscripten.org/docs/getting_started/downloads.html`,
        exitCode: -1,
      });
    });
  });
}

function cleanup(...files) {
  for (const f of files) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  }
}

module.exports = { compileAndRun };
