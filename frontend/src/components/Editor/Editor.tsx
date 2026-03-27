import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { useEditorStore } from '@/store/useEditorStore'
import { useFileStore }   from '@/store/useFileStore'
import { useEffect } from 'react'
import styles from './Editor.module.css'

export function Editor() {
  const { stdin, setStdin, usesCin, setUsesCin } = useEditorStore()

  const activeFile      = useFileStore((s) => s.activeFile())
  const setFileContent  = useFileStore((s) => s.setFileContent)
  const activeFileId    = useFileStore((s) => s.activeFileId)

  const code     = activeFile?.content ?? ''
  const filename = activeFile?.name    ?? 'untitled'

  // Detect cin / getline usage any time the code changes
  useEffect(() => {
    setUsesCin(/\bcin\b|\bgetline\s*\(/.test(code))
  }, [code, setUsesCin])

  const handleChange = (value: string) => {
    if (activeFileId) setFileContent(activeFileId, value)
  }

  return (
    <div className={styles.wrapper}>
      {/* ── Code Editor ────────────────────────────────── */}
      <div className={styles.editorPane}>
        <div className={styles.panelLabel}>
          <span className={styles.dot} style={{ background: '#ff5f57' }} />
          <span className={styles.dot} style={{ background: '#febc2e' }} />
          <span className={styles.dot} style={{ background: '#28c840' }} />
          <span className={styles.filename}>{filename}</span>
          <span className={styles.hint}>Ctrl+Enter to run</span>
        </div>
        <div className={styles.cm}>
          <CodeMirror
            key={activeFileId ?? 'empty'}   // remount when switching files
            value={code}
            height="100%"
            theme={dracula}
            extensions={[cpp()]}
            onChange={handleChange}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
              autocompletion: true,
              bracketMatching: true,
              closeBrackets: true,
              indentOnInput: true,
            }}
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
