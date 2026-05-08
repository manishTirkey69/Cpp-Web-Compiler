import { useCallback, useEffect, useRef, useState } from 'react'
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
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [terminalWidth, setTerminalWidth] = useState(420)
  const [leftPaneVisible, setLeftPaneVisible] = useState(true)
  const [rightPaneVisible, setRightPaneVisible] = useState(true)

  useEditorSettingsSync()

  // ── Run: compile → then stream via WebSocket ────────
  const handleRun = useCallback(async () => {
    setRightPaneVisible(true)
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

  useEffect(() => {
    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const blockDoubleClick = (event: MouseEvent) => {
      event.preventDefault()
    }

    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('dblclick', blockDoubleClick)

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('dblclick', blockDoubleClick)
    }
  }, [])

  const startResize = useCallback((target: 'sidebar' | 'terminal') => {
    const workspace = workspaceRef.current
    if (!workspace) return

    const rect = workspace.getBoundingClientRect()
    const minSidebarWidth = 180
    const maxSidebarWidth = Math.max(280, rect.width * 0.4)
    const minTerminalWidth = 320
    const maxTerminalWidth = Math.max(420, rect.width * 0.55)
    const minEditorWidth = 360
    const dividerAllowance = 8

    const handlePointerMove = (event: PointerEvent) => {
      const currentRect = workspace.getBoundingClientRect()

      if (target === 'sidebar') {
        const nextSidebarWidth = Math.min(
          maxSidebarWidth,
          Math.max(minSidebarWidth, event.clientX - currentRect.left),
        )

        const maxAllowedByEditor = currentRect.width - terminalWidth - minEditorWidth - dividerAllowance
        setSidebarWidth(Math.min(nextSidebarWidth, Math.max(minSidebarWidth, maxAllowedByEditor)))
        return
      }

      const nextTerminalWidth = Math.min(
        maxTerminalWidth,
        Math.max(minTerminalWidth, currentRect.right - event.clientX),
      )

      const maxAllowedByEditor = currentRect.width - sidebarWidth - minEditorWidth - dividerAllowance
      setTerminalWidth(Math.min(nextTerminalWidth, Math.max(minTerminalWidth, maxAllowedByEditor)))
    }

    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
  }, [sidebarWidth, terminalWidth])

  return (
    <Layout>
      {/* ── Toolbar spans full width above workspace ─── */}
      <div className={styles.workspaceWrapper}>
        <Toolbar
          onRun={handleRun}
          onKill={kill}
          leftPaneVisible={leftPaneVisible}
          rightPaneVisible={rightPaneVisible}
          onToggleLeftPane={() => setLeftPaneVisible((visible) => !visible)}
          onToggleBothPanes={() => {
            const shouldShowBoth = !leftPaneVisible && !rightPaneVisible
            setLeftPaneVisible(shouldShowBoth)
            setRightPaneVisible(shouldShowBoth)
          }}
          onToggleRightPane={() => setRightPaneVisible((visible) => !visible)}
        />

        <div className={styles.workspace} ref={workspaceRef}>
          {/* File sidebar */}
          {leftPaneVisible && (
            <>
              <div
                className={styles.sidebarCol}
                style={{ width: `${sidebarWidth}px` }}
              >
                <FileExplorer />
              </div>

              <div
                className={styles.divider}
                onPointerDown={() => startResize('sidebar')}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize explorer"
              />
            </>
          )}

          {/* Editor + stdin */}
          <div className={styles.editorCol}>
            <Editor />
          </div>

          {/* Resizer handle */}
          {rightPaneVisible && (
            <div
              className={styles.divider}
              onPointerDown={() => startResize('terminal')}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize terminal"
            />
          )}

          {/* Terminal output */}
          {rightPaneVisible && (
            <div
              className={styles.terminalCol}
              style={{ width: `${terminalWidth}px` }}
            >
              <Terminal onClear={clearOutput} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
