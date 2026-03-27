import { useCallback } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useFileStore }   from '@/store/useFileStore'
import type { CompileResult } from '@/types'

// REST endpoint — proxied via Vite in dev, direct in prod/Docker
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

  const activeFile = useFileStore((s) => s.activeFile())

  const compile = useCallback(async (): Promise<string | null> => {
    const code = activeFile?.content ?? ''
    if (!code.trim()) return null

    clearOutput()
    setPhase('compiling')
    setSessionId(null)
    setActiveTab('console')

    appendOutput({ type: 'info', text: '⟳  Compiling…' })

    try {
      const res = await fetch(`${API_BASE}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          options: {
            standard: options.standard,
            optimization: options.optimization,
            warnings: options.warnings || options.wextra,
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
  }, [activeFile, options, clearOutput, setPhase, setSessionId, setCompileOutput, appendOutput, setActiveTab])

  return { compile }
}
