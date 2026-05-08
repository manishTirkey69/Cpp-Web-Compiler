import type { editor } from 'monaco-editor'

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

export type EditorTheme = 'vs-dark' | 'vs-light' | 'hc-black'

export interface EditorSettings {
  theme: EditorTheme
  fontSize: number
  lineHeight: number
  tabSize: number
  lineNumbers: 'on' | 'off' | 'relative' | 'interval'
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
  minimapEnabled: boolean
  folding: boolean
  glyphMargin: boolean
  stickyScrollEnabled: boolean
  quickSuggestions: boolean
  suggestOnTriggerCharacters: boolean
  acceptSuggestionOnEnter: 'on' | 'off' | 'smart'
  tabCompletion: 'off' | 'on' | 'onlySnippets'
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never'
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never'
  autoIndent: 'none' | 'keep' | 'brackets' | 'advanced' | 'full'
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid'
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin'
  cursorSmoothCaretAnimation: 'off' | 'explicit' | 'on'
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all'
  renderControlCharacters: boolean
  fontLigatures: boolean
  bracketPairColorization: boolean
  guidesIndentation: boolean
  guidesBracketPairs: boolean
  lineNumbersMinChars: number
  roundedSelection: boolean
  selectionHighlight: boolean
  scrollBeyondLastLine: boolean
  smoothScrolling: boolean
  mouseWheelZoom: boolean
  formatOnPaste: boolean
  formatOnType: boolean
  linkedEditing: boolean
  readOnly: boolean
  rawOptions: string
}

export type MonacoEditorOptions = editor.IStandaloneEditorConstructionOptions

export interface EditorSettingsApiResponse {
  success: boolean
  defaultPath: string
  userPath: string
  settings: MonacoEditorOptions
  defaults?: MonacoEditorOptions
  user?: MonacoEditorOptions
  error?: string
}

export interface RecentProject {
  path: string
  projectName: string
  openedAt: string
}

export interface RecentProjectsApiResponse {
  success: boolean
  path: string
  projects: RecentProject[]
}

export interface UntitledFileTemplate {
  headerfile: string[]
  body: string[]
}

export interface UntitledFileTemplateApiResponse {
  success: boolean
  path: string
  template: UntitledFileTemplate
}

export interface ScratchpadTemplateApiResponse {
  success: boolean
  path: string
  template: UntitledFileTemplate
}

export interface SavedFileWritable {
  write: (data: string) => Promise<void>
  close: () => Promise<void>
}

export interface SavedFileHandle {
  name: string
  createWritable: () => Promise<SavedFileWritable>
}

// ── File System ──────────────────────────────────────────────────────────────

export interface FsFile {
  kind: 'file'
  id: string
  name: string
  content: string
  savedHandle: SavedFileHandle | null
}

export interface ScratchTab {
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
