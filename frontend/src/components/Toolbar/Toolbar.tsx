import { useEditorStore } from '@/store/useEditorStore'
import type { CppStandard, Optimization } from '@/types'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  onRun: () => void
  onKill: () => void
}

export function Toolbar({ onRun, onKill }: ToolbarProps) {
  const { options, setOption, phase } = useEditorStore()

  const isRunning  = phase === 'compiling' || phase === 'running'
  const canKill    = phase === 'running'

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>

        {/* C++ Standard */}
        <label className={styles.label} htmlFor="std-select">Standard</label>
        <select
          id="std-select"
          className={styles.select}
          value={options.standard}
          onChange={(e) => setOption('standard', e.target.value as CppStandard)}
          disabled={isRunning}
        >
          <option value="c++14">C++14</option>
          <option value="c++17">C++17</option>
          <option value="c++20">C++20</option>
        </select>

        <div className={styles.divider} />

        {/* Optimisation */}
        <label className={styles.label} htmlFor="opt-select">Optimise</label>
        <select
          id="opt-select"
          className={styles.select}
          value={options.optimization}
          onChange={(e) => setOption('optimization', e.target.value as Optimization)}
          disabled={isRunning}
        >
          <option value="O0">-O0 (none)</option>
          <option value="O1">-O1</option>
          <option value="O2">-O2</option>
          <option value="O3">-O3 (max)</option>
        </select>

        <div className={styles.divider} />

        {/* Warnings */}
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={options.warnings}
            onChange={(e) => setOption('warnings', e.target.checked)}
            disabled={isRunning}
          />
          <span>-Wall</span>
        </label>

        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={options.wextra}
            onChange={(e) => setOption('wextra', e.target.checked)}
            disabled={isRunning}
          />
          <span>-Wextra</span>
        </label>
      </div>

      <div className={styles.right}>
        {/* Kill button — only shown while running */}
        {canKill && (
          <button className={`${styles.btn} ${styles.killBtn}`} onClick={onKill}>
            ■ Stop
          </button>
        )}

        {/* Run / Compiling button */}
        <button
          className={`${styles.btn} ${styles.runBtn} ${isRunning ? styles.busy : ''}`}
          onClick={onRun}
          disabled={isRunning}
          title="Run (Ctrl+Enter)"
        >
          {phase === 'compiling' && (
            <><span className={styles.spinner} /> Compiling…</>
          )}
          {phase === 'running' && (
            <><span className={styles.spinner} /> Running…</>
          )}
          {!isRunning && '▶ Run'}
        </button>
      </div>
    </div>
  )
}
