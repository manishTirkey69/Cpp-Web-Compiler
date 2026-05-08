import { useCallback, useEffect } from 'react'
import { Layout }       from '@/components/Layout'
import { Toolbar }      from '@/components/Toolbar'
import { Editor }       from '@/components/Editor'
import { Terminal }     from '@/components/Terminal'
import { FileExplorer } from '@/components/FileExplorer'
import { useCompiler }  from '@/hooks/useCompiler'
import { useEditorSettingsSync } from '@/hooks/useEditorSettingsSync'
import { useTerminal }  from '@/hooks/useTerminal'
import { useEditorStore } from '@/store/useEditorStore'
import styles from './App.module.css'

export default function App() {
  const { compile }          = useCompiler()
  const { connect, kill }    = useTerminal()
  const { clearOutput, phase } = useEditorStore()

  useEditorSettingsSync()

  // ── Run: compile → then stream via WebSocket ────────
  const handleRun = useCallback(async () => {
    const sessionId = await compile()
    if (sessionId) connect(sessionId)
  }, [compile, connect])

  // ── Global keyboard shortcut: Ctrl/Cmd+Enter ────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (phase !== 'compiling' && phase !== 'running') {
          handleRun()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleRun, phase])

  return (
    <Layout>
      {/* ── Toolbar spans full width above workspace ─── */}
      <div className={styles.workspaceWrapper}>
        <Toolbar onRun={handleRun} onKill={kill} />

        <div className={styles.workspace}>
          {/* File sidebar */}
          <FileExplorer />

          {/* Editor + stdin */}
          <div className={styles.editorCol}>
            <Editor />
          </div>

          {/* Resizer handle */}
          <div className={styles.divider} />

          {/* Terminal output */}
          <div className={styles.terminalCol}>
            <Terminal onClear={clearOutput} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
