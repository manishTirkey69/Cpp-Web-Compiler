import { create } from 'zustand'
import type { CompileOptions, OutputLine, RunPhase } from '@/types'

interface EditorStore {
  // ── Compile options ────────────────────────────────────
  options: CompileOptions
  setOption: <K extends keyof CompileOptions>(key: K, value: CompileOptions[K]) => void

  // ── Stdin ──────────────────────────────────────────────
  stdin: string
  setStdin: (stdin: string) => void

  // ── Session / run state ────────────────────────────────
  sessionId: string | null
  setSessionId: (id: string | null) => void

  phase: RunPhase
  setPhase: (phase: RunPhase) => void

  // ── Output ─────────────────────────────────────────────
  outputLines: OutputLine[]
  compileOutput: string
  exitCode: number | null

  appendOutput: (line: Omit<OutputLine, 'id'>) => void
  setCompileOutput: (out: string) => void
  setExitCode: (code: number | null) => void
  clearOutput: () => void

  // ── Active tab in Terminal ─────────────────────────────
  activeTab: 'console' | 'errors'
  setActiveTab: (tab: 'console' | 'errors') => void

  // ── cin detection ──────────────────────────────────────
  usesCin: boolean
  setUsesCin: (v: boolean) => void
}

let lineId = 0

export const useEditorStore = create<EditorStore>((set) => ({
  // ── Options ────────────────────────────────────────────
  options: {
    standard: 'c++17',
    optimization: 'O0',
    warnings: true,
    wextra: false,
  },
  setOption: (key, value) =>
    set((s) => ({ options: { ...s.options, [key]: value } })),

  // ── Stdin ──────────────────────────────────────────────
  stdin: '',
  setStdin: (stdin) => set({ stdin }),

  // ── Session ────────────────────────────────────────────
  sessionId: null,
  setSessionId: (sessionId) => set({ sessionId }),

  phase: 'idle',
  setPhase: (phase) => set({ phase }),

  // ── Output ─────────────────────────────────────────────
  outputLines: [],
  compileOutput: '',
  exitCode: null,

  appendOutput: (line) =>
    set((s) => ({
      outputLines: [...s.outputLines, { ...line, id: lineId++ }],
    })),

  setCompileOutput: (compileOutput) => set({ compileOutput }),
  setExitCode: (exitCode) => set({ exitCode }),

  clearOutput: () =>
    set({ outputLines: [], compileOutput: '', exitCode: null }),

  // ── Tab ────────────────────────────────────────────────
  activeTab: 'console',
  setActiveTab: (activeTab) => set({ activeTab }),

  // ── cin ────────────────────────────────────────────────
  usesCin: false,
  setUsesCin: (usesCin) => set({ usesCin }),
}))
