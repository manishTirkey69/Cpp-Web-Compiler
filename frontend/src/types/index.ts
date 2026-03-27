// ── Compile Options ──────────────────────────────────────────────────────────

export type CppStandard = 'c++14' | 'c++17' | 'c++20'
export type Optimization = 'O0' | 'O1' | 'O2' | 'O3'

export interface CompileOptions {
  standard: CppStandard
  optimization: Optimization
  warnings: boolean
  wextra: boolean
}

// ── REST: POST /api/compile ──────────────────────────────────────────────────

export interface CompileRequest {
  code: string
  options: {
    standard: CppStandard
    optimization: Optimization
    warnings: boolean
  }
}

export interface CompileResponse {
  success: true
  sessionId: string
  compilationOutput: string
}

export interface CompileError {
  success: false
  error: string
}

export type CompileResult = CompileResponse | CompileError

// ── WebSocket messages ───────────────────────────────────────────────────────

export type WsMessageType = 'stdout' | 'stderr' | 'exit' | 'error'

export interface WsMessage {
  type: WsMessageType
  data: string
}

export interface WsStdinMessage {
  type: 'stdin'
  data: string
}

export interface WsKillMessage {
  type: 'kill'
}

// ── Editor State ─────────────────────────────────────────────────────────────

export type RunPhase = 'idle' | 'compiling' | 'running' | 'done' | 'error'

export interface OutputLine {
  id: number
  type: 'stdout' | 'stderr' | 'info' | 'success' | 'error'
  text: string
}

// ── File System ──────────────────────────────────────────────────────────────

export interface FsFile {
  kind: 'file'
  id: string
  name: string
  content: string
}

export interface FsFolder {
  kind: 'folder'
  id: string
  name: string
  collapsed: boolean
  children: FsNode[]
}

export type FsNode = FsFile | FsFolder

// ── Legacy (kept for compatibility) ──────────────────────────────────────────

export interface SourceFile {
  id: string
  name: string
  language: string
}
