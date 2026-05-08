import { useEffect, useRef, useState } from 'react'
import { parseRawMonacoOptions } from '@/lib/editorSettings'
import { useEditorStore } from '@/store/useEditorStore'
import type { CppStandard, EditorSettings, Optimization } from '@/types'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  onRun: () => void
  onKill: () => void
}

export function Toolbar({ onRun, onKill }: ToolbarProps) {
  const {
    options,
    setOption,
    phase,
    editorSettings,
    setEditorSetting,
    resetEditorSettings,
  } = useEditorStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  const isRunning  = phase === 'compiling' || phase === 'running'
  const canKill    = phase === 'running'
  const { error: rawOptionsError } = parseRawMonacoOptions(editorSettings.rawOptions)

  useEffect(() => {
    if (!settingsOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [settingsOpen])

  const toggleSetting = <K extends keyof EditorSettings>(key: K) => {
    setEditorSetting(key, !editorSettings[key] as EditorSettings[K])
  }

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

        <div className={styles.settingsWrap} ref={settingsRef}>
          <button
            type="button"
            className={`${styles.btn} ${styles.settingsBtn} ${settingsOpen ? styles.settingsBtnOpen : ''}`}
            onClick={() => setSettingsOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            title="Editor settings"
          >
            ⚙ Settings
          </button>

          {settingsOpen && (
            <div className={styles.popover} role="dialog" aria-label="Editor settings">
              <div className={styles.popoverHeader}>
                <div>
                  <h3 className={styles.popoverTitle}>Monaco settings</h3>
                  <p className={styles.popoverSubtitle}>Quick controls plus full Monaco options JSON.</p>
                </div>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={resetEditorSettings}
                >
                  Reset
                </button>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Appearance</span>

                <label className={styles.field}>
                  <span>Theme</span>
                  <select
                    className={styles.select}
                    value={editorSettings.theme}
                    onChange={(e) => setEditorSetting('theme', e.target.value as EditorSettings['theme'])}
                  >
                    <option value="vs-dark">VS Dark</option>
                    <option value="vs-light">VS Light</option>
                    <option value="hc-black">High Contrast</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Font size</span>
                  <select
                    className={styles.select}
                    value={String(editorSettings.fontSize)}
                    onChange={(e) => setEditorSetting('fontSize', Number(e.target.value))}
                  >
                    <option value="12">12 px</option>
                    <option value="13">13 px</option>
                    <option value="14">14 px</option>
                    <option value="15">15 px</option>
                    <option value="16">16 px</option>
                    <option value="18">18 px</option>
                    <option value="20">20 px</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Line height</span>
                  <select
                    className={styles.select}
                    value={String(editorSettings.lineHeight)}
                    onChange={(e) => setEditorSetting('lineHeight', Number(e.target.value))}
                  >
                    <option value="18">18 px</option>
                    <option value="20">20 px</option>
                    <option value="22">22 px</option>
                    <option value="24">24 px</option>
                    <option value="28">28 px</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Tab size</span>
                  <select
                    className={styles.select}
                    value={String(editorSettings.tabSize)}
                    onChange={(e) => setEditorSetting('tabSize', Number(e.target.value))}
                  >
                    <option value="2">2 spaces</option>
                    <option value="4">4 spaces</option>
                    <option value="8">8 spaces</option>
                  </select>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.fontLigatures}
                    onChange={() => toggleSetting('fontLigatures')}
                  />
                  <span>Font ligatures</span>
                </label>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Layout</span>

                <label className={styles.field}>
                  <span>Line numbers</span>
                  <select
                    className={styles.select}
                    value={editorSettings.lineNumbers}
                    onChange={(e) => setEditorSetting('lineNumbers', e.target.value as EditorSettings['lineNumbers'])}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                    <option value="relative">Relative</option>
                    <option value="interval">Interval</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Word wrap</span>
                  <select
                    className={styles.select}
                    value={editorSettings.wordWrap}
                    onChange={(e) => setEditorSetting('wordWrap', e.target.value as EditorSettings['wordWrap'])}
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                    <option value="wordWrapColumn">Word wrap column</option>
                    <option value="bounded">Bounded</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Whitespace</span>
                  <select
                    className={styles.select}
                    value={editorSettings.renderWhitespace}
                    onChange={(e) => setEditorSetting('renderWhitespace', e.target.value as EditorSettings['renderWhitespace'])}
                  >
                    <option value="none">None</option>
                    <option value="boundary">Boundary</option>
                    <option value="selection">Selection</option>
                    <option value="trailing">Trailing</option>
                    <option value="all">All</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Line number width</span>
                  <select
                    className={styles.select}
                    value={String(editorSettings.lineNumbersMinChars)}
                    onChange={(e) => setEditorSetting('lineNumbersMinChars', Number(e.target.value))}
                  >
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.minimapEnabled}
                    onChange={() => toggleSetting('minimapEnabled')}
                  />
                  <span>Minimap</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.folding}
                    onChange={() => toggleSetting('folding')}
                  />
                  <span>Code folding</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.glyphMargin}
                    onChange={() => toggleSetting('glyphMargin')}
                  />
                  <span>Glyph margin</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.stickyScrollEnabled}
                    onChange={() => toggleSetting('stickyScrollEnabled')}
                  />
                  <span>Sticky scroll</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.guidesIndentation}
                    onChange={() => toggleSetting('guidesIndentation')}
                  />
                  <span>Indent guides</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.guidesBracketPairs}
                    onChange={() => toggleSetting('guidesBracketPairs')}
                  />
                  <span>Bracket pair guides</span>
                </label>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Editing</span>

                <label className={styles.field}>
                  <span>Cursor style</span>
                  <select
                    className={styles.select}
                    value={editorSettings.cursorStyle}
                    onChange={(e) => setEditorSetting('cursorStyle', e.target.value as EditorSettings['cursorStyle'])}
                  >
                    <option value="line">Line</option>
                    <option value="block">Block</option>
                    <option value="underline">Underline</option>
                    <option value="line-thin">Line thin</option>
                    <option value="block-outline">Block outline</option>
                    <option value="underline-thin">Underline thin</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Cursor blinking</span>
                  <select
                    className={styles.select}
                    value={editorSettings.cursorBlinking}
                    onChange={(e) => setEditorSetting('cursorBlinking', e.target.value as EditorSettings['cursorBlinking'])}
                  >
                    <option value="blink">Blink</option>
                    <option value="smooth">Smooth</option>
                    <option value="phase">Phase</option>
                    <option value="expand">Expand</option>
                    <option value="solid">Solid</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Caret animation</span>
                  <select
                    className={styles.select}
                    value={editorSettings.cursorSmoothCaretAnimation}
                    onChange={(e) => setEditorSetting('cursorSmoothCaretAnimation', e.target.value as EditorSettings['cursorSmoothCaretAnimation'])}
                  >
                    <option value="off">Off</option>
                    <option value="explicit">Explicit</option>
                    <option value="on">On</option>
                  </select>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.quickSuggestions}
                    onChange={() => toggleSetting('quickSuggestions')}
                  />
                  <span>Quick suggestions</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.suggestOnTriggerCharacters}
                    onChange={() => toggleSetting('suggestOnTriggerCharacters')}
                  />
                  <span>Suggestions on trigger</span>
                </label>

                <label className={styles.field}>
                  <span>Accept suggestion on Enter</span>
                  <select
                    className={styles.select}
                    value={editorSettings.acceptSuggestionOnEnter}
                    onChange={(e) => setEditorSetting('acceptSuggestionOnEnter', e.target.value as EditorSettings['acceptSuggestionOnEnter'])}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                    <option value="smart">Smart</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Tab completion</span>
                  <select
                    className={styles.select}
                    value={editorSettings.tabCompletion}
                    onChange={(e) => setEditorSetting('tabCompletion', e.target.value as EditorSettings['tabCompletion'])}
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                    <option value="onlySnippets">Only snippets</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Auto-close brackets</span>
                  <select
                    className={styles.select}
                    value={editorSettings.autoClosingBrackets}
                    onChange={(e) => setEditorSetting('autoClosingBrackets', e.target.value as EditorSettings['autoClosingBrackets'])}
                  >
                    <option value="always">Always</option>
                    <option value="languageDefined">Language defined</option>
                    <option value="beforeWhitespace">Before whitespace</option>
                    <option value="never">Never</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Auto-close quotes</span>
                  <select
                    className={styles.select}
                    value={editorSettings.autoClosingQuotes}
                    onChange={(e) => setEditorSetting('autoClosingQuotes', e.target.value as EditorSettings['autoClosingQuotes'])}
                  >
                    <option value="always">Always</option>
                    <option value="languageDefined">Language defined</option>
                    <option value="beforeWhitespace">Before whitespace</option>
                    <option value="never">Never</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Auto-indent</span>
                  <select
                    className={styles.select}
                    value={editorSettings.autoIndent}
                    onChange={(e) => setEditorSetting('autoIndent', e.target.value as EditorSettings['autoIndent'])}
                  >
                    <option value="none">None</option>
                    <option value="keep">Keep</option>
                    <option value="brackets">Brackets</option>
                    <option value="advanced">Advanced</option>
                    <option value="full">Full</option>
                  </select>
                </label>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Behavior</span>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.bracketPairColorization}
                    onChange={() => toggleSetting('bracketPairColorization')}
                  />
                  <span>Bracket pair colors</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.renderControlCharacters}
                    onChange={() => toggleSetting('renderControlCharacters')}
                  />
                  <span>Render control characters</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.roundedSelection}
                    onChange={() => toggleSetting('roundedSelection')}
                  />
                  <span>Rounded selection</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.selectionHighlight}
                    onChange={() => toggleSetting('selectionHighlight')}
                  />
                  <span>Selection highlight</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.scrollBeyondLastLine}
                    onChange={() => toggleSetting('scrollBeyondLastLine')}
                  />
                  <span>Scroll past EOF</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.smoothScrolling}
                    onChange={() => toggleSetting('smoothScrolling')}
                  />
                  <span>Smooth scrolling</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.mouseWheelZoom}
                    onChange={() => toggleSetting('mouseWheelZoom')}
                  />
                  <span>Mouse wheel zoom</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.formatOnPaste}
                    onChange={() => toggleSetting('formatOnPaste')}
                  />
                  <span>Format on paste</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.formatOnType}
                    onChange={() => toggleSetting('formatOnType')}
                  />
                  <span>Format on type</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.linkedEditing}
                    onChange={() => toggleSetting('linkedEditing')}
                  />
                  <span>Linked editing</span>
                </label>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={editorSettings.readOnly}
                    onChange={() => toggleSetting('readOnly')}
                  />
                  <span>Read only</span>
                </label>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Advanced JSON</span>
                <p className={styles.helperText}>
                  Any Monaco editor option can go here. Advanced JSON overrides the quick controls above.
                </p>
                <textarea
                  className={`${styles.jsonArea} ${rawOptionsError ? styles.jsonAreaInvalid : ''}`}
                  value={editorSettings.rawOptions}
                  onChange={(e) => setEditorSetting('rawOptions', e.target.value)}
                  spellCheck={false}
                />
                {rawOptionsError && (
                  <p className={styles.errorText}>Invalid JSON: {rawOptionsError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
