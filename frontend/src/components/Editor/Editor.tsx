import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { buildMonacoOptions } from '@/lib/editorSettings'
import { useEditorStore } from '@/store/useEditorStore'
import { useFileStore }   from '@/store/useFileStore'
import { useEffect, useRef } from 'react'
import styles from './Editor.module.css'

export function Editor() {
  const {
    stdin,
    setStdin,
    usesCin,
    setUsesCin,
    editorSettings,
  } = useEditorStore()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)

  const scratchActive  = useFileStore((s) => s.scratchActive)
  const activeScratchId = useFileStore((s) => s.activeScratchId)
  const scratchTabs    = useFileStore((s) => s.scratchTabs)
  const setScratchCode = useFileStore((s) => s.setScratchCode)
  const activateScratch = useFileStore((s) => s.activateScratch)
  const closeScratchTab = useFileStore((s) => s.closeScratchTab)
  const activeFile     = useFileStore((s) => s.activeFile())
  const setFileContent = useFileStore((s) => s.setFileContent)
  const activeFileId   = useFileStore((s) => s.activeFileId)
  const activeScratch  = scratchTabs.find((tab) => tab.id === activeScratchId) ?? null

  // Determine what to show in the editor
  const code     = scratchActive ? (activeScratch?.content ?? '') : (activeFile?.content ?? '')
  const filename = scratchActive ? (activeScratch?.name ?? 'scratch.cpp') : (activeFile?.name ?? 'untitled')

  // Detect cin / getline usage whenever code changes
  useEffect(() => {
    setUsesCin(/\bcin\b|\bgetline\s*\(/.test(code))
  }, [code, setUsesCin])

  const handleChange = (value: string | undefined) => {
    const nextValue = value ?? ''

    if (scratchActive) {
      setScratchCode(nextValue)
    } else if (activeFileId) {
      setFileContent(activeFileId, nextValue)
    }
  }

  const { options: monacoOptions } = buildMonacoOptions(editorSettings)

  useEffect(() => {
    const currentEditor = editorRef.current
    if (!currentEditor) return

    currentEditor.updateOptions(monacoOptions)
    currentEditor.getModel()?.updateOptions({
      tabSize: editorSettings.tabSize,
      indentSize: editorSettings.tabSize,
      insertSpaces: true,
      trimAutoWhitespace: true,
    })
  }, [editorSettings, monacoOptions])

  useEffect(() => {
    const tabsEl = tabsRef.current
    if (!tabsEl) return

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      tabsEl.scrollLeft += event.deltaY
    }

    tabsEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => tabsEl.removeEventListener('wheel', handleWheel)
  }, [scratchTabs.length])

  return (
    <div className={styles.wrapper}>
      {/* ── Code Editor ────────────────────────────────── */}
      <div className={styles.editorPane}>
        <div className={`${styles.panelLabel} ${scratchActive ? styles.panelLabelScratch : ''}`}>
          {scratchActive ? (
            // Scratch mode indicator
            <>
              <span className={styles.scratchIconSm}>⚡</span>
              <span className={`${styles.filename} ${styles.filenameScratch}`}>{filename}</span>
              <span className={styles.scratchTag}>scratch · unsaved</span>
            </>
          ) : (
            // Normal file mode
            <>
              <span className={styles.dot} style={{ background: '#ff5f57' }} />
              <span className={styles.dot} style={{ background: '#febc2e' }} />
              <span className={styles.dot} style={{ background: '#28c840' }} />
              <span className={styles.filename}>{filename}</span>
            </>
          )}
          <span className={styles.hint}>Ctrl+Enter to run</span>
        </div>

        {scratchTabs.length > 0 && (
          <div className={styles.tabsBar} ref={tabsRef}>
            {scratchTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.editorTab} ${activeScratchId === tab.id ? styles.editorTabActive : ''}`}
                onClick={() => activateScratch(tab.id)}
                title={tab.name}
              >
                <span className={styles.editorTabName}>{tab.name}</span>
                <span
                  className={styles.editorTabClose}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeScratchTab(tab.id)
                  }}
                  aria-hidden="true"
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.cm}>
          <MonacoEditor
            key={scratchActive ? (activeScratchId ?? 'scratch') : (activeFileId ?? 'empty')}
            value={code}
            height="100%"
            defaultLanguage="cpp"
            language="cpp"
            path={filename}
            theme={editorSettings.theme}
            options={monacoOptions}
            onMount={(editorInstance) => {
              editorRef.current = editorInstance
              editorInstance.getModel()?.updateOptions({
                tabSize: editorSettings.tabSize,
                indentSize: editorSettings.tabSize,
                insertSpaces: true,
                trimAutoWhitespace: true,
              })
            }}
            onChange={handleChange}
            loading={<div className={styles.loadingState}>Loading Monaco editor…</div>}
          />
        </div>
      </div>

      {/* ── Stdin ───────────────────────────────────────── */}
      <div className={styles.stdinPane}>
        <div className={styles.panelLabel}>
          <span className={styles.stdinTitle}>stdin</span>
          {usesCin && !stdin.trim() && (
            <span className={styles.cinWarning}>
              ⚠ your program reads from cin — add input here
            </span>
          )}
        </div>
        <textarea
          className={`${styles.stdinArea} ${usesCin && !stdin.trim() ? styles.stdinHighlight : ''}`}
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="Type program input here (one value per line)…"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
