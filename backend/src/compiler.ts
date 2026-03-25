import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Maps sessionId → path to compiled binary
const sessions = new Map<string, string>();

function getCompilerFlags(
  standard: string,
  optimization: string,
  warnings: boolean
): string[] {
  const flags: string[] = [`-std=${standard}`, `-${optimization}`];
  if (warnings) flags.push('-Wall', '-Wextra');
  return flags;
}

export async function compileCode(
  sessionId: string,
  code: string,
  standard = 'c++17',
  optimization = 'O0',
  warnings = true
): Promise<{ success: boolean; output: string }> {
  const tmpDir = os.tmpdir();
  const isWindows = os.platform() === 'win32';
  const srcFile = path.join(tmpDir, `cppshell_${sessionId}.cpp`);
  const outFile = path.join(tmpDir, `cppshell_${sessionId}${isWindows ? '.exe' : ''}`);

  fs.writeFileSync(srcFile, code, 'utf-8');

  const flags = getCompilerFlags(standard, optimization, warnings);

  return new Promise((resolve) => {
    const proc = spawn('g++', [...flags, srcFile, '-o', outFile], {
      shell: isWindows,
    });

    let output = '';
    proc.stdout.on('data', (d: Buffer) => (output += d.toString()));
    proc.stderr.on('data', (d: Buffer) => (output += d.toString()));

    proc.on('close', (code) => {
      // always clean up source
      try { fs.unlinkSync(srcFile); } catch { /* ignore */ }

      if (code === 0) {
        sessions.set(sessionId, outFile);
        resolve({ success: true, output: output || '✔ Compiled successfully.' });
      } else {
        resolve({ success: false, output: output || 'Compilation failed with no output.' });
      }
    });

    proc.on('error', (err) => {
      try { fs.unlinkSync(srcFile); } catch { /* ignore */ }
      resolve({
        success: false,
        output: `Failed to start compiler: ${err.message}\n\nMake sure g++ is installed and available in your PATH.\nOn Windows, install MinGW-w64 or use WSL.`,
      });
    });
  });
}

export function runSession(sessionId: string, ws: WebSocket): void {
  const execPath = sessions.get(sessionId);

  if (!execPath) {
    ws.send(JSON.stringify({ type: 'error', data: 'Session not found or expired.' }));
    ws.close();
    return;
  }

  const isWindows = os.platform() === 'win32';
  const proc = spawn(execPath, [], { stdio: 'pipe', shell: isWindows });

  const send = (type: string, data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  };

  proc.stdout.on('data', (d: Buffer) => send('stdout', d.toString()));
  proc.stderr.on('data', (d: Buffer) => send('stderr', d.toString()));

  proc.on('close', (code) => {
    send('exit', `\r\n\x1b[2m── Process exited with code ${code} ──\x1b[0m\r\n`);
    if (ws.readyState === WebSocket.OPEN) ws.close();
    // cleanup
    sessions.delete(sessionId);
    try { fs.unlinkSync(execPath); } catch { /* ignore */ }
  });

  proc.on('error', (err) => {
    send('error', `Failed to run process: ${err.message}`);
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; data: string };
      if (msg.type === 'stdin' && proc.stdin && !proc.stdin.destroyed) {
        proc.stdin.write(msg.data);
      } else if (msg.type === 'kill') {
        proc.kill('SIGTERM');
      }
    } catch { /* ignore malformed */ }
  });

  ws.on('close', () => {
    if (!proc.killed) proc.kill('SIGTERM');
    sessions.delete(sessionId);
  });
}
