import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import type { OutputLine } from '@/types'
import styles from './Terminal.module.css'

interface TerminalProps {
  onClear: () => void
}

export function Terminal({ onClear }: TerminalProps) {
  const {
    outputLines,
    compileOutput,
    phase,
    exitCode,
    activeTab,
    setActiveTab,
  } = useEditorStore()

  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom whenever new output arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [outputLines])

  const phaseLabel: Record<string, string> = {
    idle:      'Ready',
    compiling: 'Compiling…',
    running:   'Running…',
    done:      exitCode === 0 ? `Exit 0 ✓` : `Exit ${exitCode ?? '?'}`,
    error:     'Error',
  }

  const phaseColor: Record<string, string> = {
    idle:      'var(--text-dim)',
    compiling: 'var(--yellow)',
    running:   'var(--yellow)',
    done:      exitCode === 0 ? 'var(--green)' : 'var(--red)',
    error:     'var(--red)',
  }

  function lineClass(line: OutputLine): string {
    switch (line.type) {
      case 'stdout':  return styles.stdout
      case 'stderr':  return styles.stderr
      case 'info':    return styles.info
      case 'success': return styles.success
      case 'error':   return styles.error
      default:        return ''
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* ── Tab bar ─────────────────────────────────────── */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'console' ? styles.active : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Console
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'errors' ? styles.active : ''}`}
            onClick={() => setActiveTab('errors')}
          >
            Errors / Warnings
            {compileOutput && <span className={styles.badge} />}
          </button>
        </div>

        <div className={styles.tabRight}>
          <span
            className={styles.phaseTag}
            style={{ color: phaseColor[phase] }}
          >
            {phaseLabel[phase]}
          </span>
          <button
            className={styles.clearBtn}
            onClick={onClear}
            title="Clear output"
          >
            ✕ Clear
          </button>
        </div>
      </div>

      {/* ── Console pane ────────────────────────────────── */}
      {activeTab === 'console' && (
        <div className={styles.pane}>
          {outputLines.length === 0 ? (
            <span className={styles.placeholder}>
              Output will appear here after you click Run…
            </span>
          ) : (
            outputLines.map((line) => (
              <div key={line.id} className={`${styles.line} ${lineClass(line)}`}>
                {line.text}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Errors pane ─────────────────────────────────── */}
      {activeTab === 'errors' && (
        <div className={styles.pane}>
          {!compileOutput ? (
            <span className={styles.placeholder}>No errors or warnings.</span>
          ) : (
            compileOutput.split('\n').map((line, i) => {
              let cls = styles.info
              if (/error:/i.test(line))   cls = styles.stderr
              else if (/warning:/i.test(line)) cls = styles.warn
              else if (/note:/i.test(line))    cls = styles.note
              return (
                <div key={i} className={`${styles.line} ${cls}`}>
                  {line}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
