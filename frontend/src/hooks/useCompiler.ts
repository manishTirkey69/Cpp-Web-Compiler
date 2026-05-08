import { useCallback } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useFileStore }   from '@/store/useFileStore'
import type { CompileResult } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useCompiler() {
  const {
    options,
    setPhase,
    setSessionId,
    setCompileOutput,
    clearOutput,
    appendOutput,
    setActiveTab,
  } = useEditorStore()

  const scratchActive = useFileStore((s) => s.scratchActive)
  const activeScratchId = useFileStore((s) => s.activeScratchId)
  const scratchTabs   = useFileStore((s) => s.scratchTabs)
  const activeFile    = useFileStore((s) => s.activeFile())
  const activeScratch = scratchTabs.find((tab) => tab.id === activeScratchId) ?? null

  const compile = useCallback(async (): Promise<string | null> => {
    // Source: scratch buffer if scratch mode, otherwise the active file
    const code = scratchActive ? (activeScratch?.content ?? '') : (activeFile?.content ?? '')

    if (!code.trim()) {
      appendOutput({ type: 'info', text: 'Nothing to compile.' })
      return null
    }

    clearOutput()
    setPhase('compiling')
    setSessionId(null)
    setActiveTab('console')

    const sourceLabel = scratchActive ? `⚡ ${activeScratch?.name ?? 'scratch.cpp'}` : (activeFile?.name ?? 'file')
    appendOutput({ type: 'info', text: `⟳  Compiling ${sourceLabel}…` })

    try {
      const res = await fetch(`${API_BASE}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          options: {
            standard:     options.standard,
            optimization: options.optimization,
            warnings:     options.warnings || options.wextra,
          },
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        appendOutput({ type: 'error', text: `Server error (${res.status}): ${text}` })
        setPhase('error')
        return null
      }

      const data: CompileResult = await res.json()

      if (!data.success) {
        setCompileOutput(data.error)
        appendOutput({ type: 'error', text: 'Compilation failed. See Errors tab.' })
        setPhase('error')
        setActiveTab('errors')
        return null
      }

      if (data.compilationOutput && data.compilationOutput.trim() !== '✔ Compiled successfully.') {
        setCompileOutput(data.compilationOutput)
        appendOutput({ type: 'info', text: '⚠  Compiled with warnings. See Errors tab.' })
      } else {
        setCompileOutput('')
        appendOutput({ type: 'success', text: '✔  Compiled successfully.' })
      }

      setSessionId(data.sessionId)
      return data.sessionId

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendOutput({
        type: 'error',
        text: `Cannot reach backend.\n\nMake sure the server is running:\n  cd backend && npm run dev\n\nError: ${msg}`,
      })
      setPhase('error')
      return null
    }
  }, [
    scratchActive, activeScratch, activeFile,
    options, clearOutput, setPhase, setSessionId,
    setCompileOutput, appendOutput, setActiveTab,
  ])

  return { compile }
}
