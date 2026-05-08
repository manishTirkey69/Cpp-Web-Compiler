import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { buildMonacoOptions } from '@/lib/editorSettings'
import { saveFileAs, saveToFileHandle } from '@/lib/saveFile'
import { useEditorStore } from '@/store/useEditorStore'
import { useFileStore }   from '@/store/useFileStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  RecentProject,
  RecentProjectsApiResponse,
  ScratchpadTemplateApiResponse,
  UntitledFileTemplateApiResponse,
} from '@/types'
import styles from './Editor.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

function recentProjectStamp(openedAt: string): string {
  const openedDate = new Date(openedAt)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfOpened = new Date(openedDate.getFullYear(), openedDate.getMonth(), openedDate.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfOpened.getTime()) / 86400000)

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 6) return `${diffDays} days ago`
  if (diffDays <= 13) return '1 week ago'
  if (diffDays <= 20) return '2 weeks ago'
  if (diffDays <= 44) return '1 month ago'

  const months = Math.max(2, Math.round(diffDays / 30))
  return `${months} months ago`
}

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
  const [recentProjectsOpen, setRecentProjectsOpen] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [recentProjectsLoading, setRecentProjectsLoading] = useState(false)
  const [recentProjectsError, setRecentProjectsError] = useState<string | null>(null)

  const scratchActive  = useFileStore((s) => s.scratchActive)
  const openFileIds    = useFileStore((s) => s.openFileIds)
  const activeScratchId = useFileStore((s) => s.activeScratchId)
  const scratchTabs    = useFileStore((s) => s.scratchTabs)
  const setScratchCode = useFileStore((s) => s.setScratchCode)
  const activateScratch = useFileStore((s) => s.activateScratch)
  const closeScratchTab = useFileStore((s) => s.closeScratchTab)
  const openFile       = useFileStore((s) => s.openFile)
  const closeFileTab   = useFileStore((s) => s.closeFileTab)
  const openFirstFile  = useFileStore((s) => s.openFirstFile)
  const newProject     = useFileStore((s) => s.newProject)
  const setUntitledTemplate = useFileStore((s) => s.setUntitledTemplate)
  const setScratchpadTemplate = useFileStore((s) => s.setScratchpadTemplate)
  const bindFileHandle = useFileStore((s) => s.bindFileHandle)
  const pendingCursorPlacement = useFileStore((s) => s.pendingCursorPlacement)
  const consumePendingCursorPlacement = useFileStore((s) => s.consumePendingCursorPlacement)
  const activeFile     = useFileStore((s) => s.activeFile())
  const tree           = useFileStore((s) => s.tree)
  const setFileContent = useFileStore((s) => s.setFileContent)
  const activeFileId   = useFileStore((s) => s.activeFileId)
  const activeScratch  = scratchTabs.find((tab) => tab.id === activeScratchId) ?? null

  const fileTabs = openFileIds
    .map((id) => {
      const stack: typeof tree = [...tree]
      while (stack.length > 0) {
        const node = stack.shift()
        if (!node) break
        if (node.kind === 'file' && node.id === id) return node
        if (node.kind === 'folder') stack.unshift(...node.children)
      }
      return null
    })
    .filter((file): file is NonNullable<typeof file> => Boolean(file))

  // Determine what to show in the editor
  const code     = scratchActive ? (activeScratch?.content ?? '') : (activeFile?.content ?? '')
  const filename = scratchActive ? (activeScratch?.name ?? 'scratch.cpp') : (activeFile?.name ?? 'untitled')
  const hasSelectableProjectFile = fileTabs.length > 0 || tree.length > 0
  const showEmptyProjectState = !scratchActive && !activeFile

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

  const handleSave = useCallback(async () => {
    if (scratchActive || !activeFile) return

    if (activeFile.savedHandle) {
      try {
        await saveToFileHandle(activeFile.savedHandle, activeFile.content)
        return
      } catch {
        // Fall through to Save As if direct overwrite is no longer available.
      }
    }

    const result = await saveFileAs(activeFile.name, activeFile.content)
    if (result.status === 'saved' && result.fileHandle) {
      bindFileHandle(activeFile.id, result.name, result.fileHandle)
    }
  }, [activeFile, bindFileHandle, scratchActive])

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
  }, [scratchTabs.length, fileTabs.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
      if (!scratchActive && !activeFile) return

      event.preventDefault()
      if (scratchActive) return
      void handleSave()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFile, handleSave, scratchActive])

  useEffect(() => {
    let cancelled = false

    const loadTemplates = async () => {
      try {
        const [untitledRes, scratchpadRes] = await Promise.all([
          fetch(`${API_BASE}/api/templates/untitled-file`),
          fetch(`${API_BASE}/api/templates/scratchpad`),
        ])

        if (!untitledRes.ok) throw new Error(`Failed to load untitled template (${untitledRes.status})`)
        if (!scratchpadRes.ok) throw new Error(`Failed to load scratchpad template (${scratchpadRes.status})`)

        const untitledData = await untitledRes.json() as UntitledFileTemplateApiResponse
        const scratchpadData = await scratchpadRes.json() as ScratchpadTemplateApiResponse
        if (!cancelled) {
          if (untitledData.success) setUntitledTemplate(untitledData.template)
          if (scratchpadData.success) setScratchpadTemplate(scratchpadData.template)
        }
      } catch {
        // Leave templates empty if loading fails.
      }
    }

    loadTemplates()

    return () => { cancelled = true }
  }, [setScratchpadTemplate, setUntitledTemplate])

  useEffect(() => {
    const currentEditor = editorRef.current
    if (!currentEditor || !pendingCursorPlacement) return
    if (!scratchActive && pendingCursorPlacement.targetKind === 'file' && activeFileId !== pendingCursorPlacement.targetId) return
    if (scratchActive && pendingCursorPlacement.targetKind === 'scratch' && activeScratchId !== pendingCursorPlacement.targetId) return
    if (!scratchActive && pendingCursorPlacement.targetKind === 'scratch') return
    if (scratchActive && pendingCursorPlacement.targetKind === 'file') return

    currentEditor.focus()
    currentEditor.setPosition({
      lineNumber: pendingCursorPlacement.lineNumber,
      column: pendingCursorPlacement.column,
    })
    currentEditor.revealPositionInCenter({
      lineNumber: pendingCursorPlacement.lineNumber,
      column: pendingCursorPlacement.column,
    })
    consumePendingCursorPlacement()
  }, [
    activeFileId,
    activeScratchId,
    consumePendingCursorPlacement,
    pendingCursorPlacement,
    scratchActive,
  ])

  useEffect(() => {
    if (!recentProjectsOpen) return

    let cancelled = false

    const loadRecentProjects = async () => {
      setRecentProjectsLoading(true)
      setRecentProjectsError(null)

      try {
        const res = await fetch(`${API_BASE}/api/recent-projects`)
        if (!res.ok) throw new Error(`Failed to load recent projects (${res.status})`)

        const data = await res.json() as RecentProjectsApiResponse
        if (!cancelled) {
          setRecentProjects(data.projects ?? [])
        }
      } catch (error) {
        if (!cancelled) {
          setRecentProjectsError(error instanceof Error ? error.message : 'Failed to load recent projects.')
        }
      } finally {
        if (!cancelled) setRecentProjectsLoading(false)
      }
    }

    loadRecentProjects()

    return () => { cancelled = true }
  }, [recentProjectsOpen])

  return (
    <div className={styles.wrapper}>
      {/* ── Code Editor ────────────────────────────────── */}
      <div className={styles.editorPane}>
        {!showEmptyProjectState && (
          <>
            <div className={`${styles.panelLabel} ${scratchActive ? styles.panelLabelScratch : ''}`}>
              <span className={`${styles.filename} ${scratchActive ? styles.filenameScratch : ''}`}>{filename}</span>
              {scratchActive && <span className={styles.scratchTag}>scratch · unsaved</span>}
              <span className={styles.hint}>Ctrl+Enter to run</span>
            </div>

            {(fileTabs.length > 0 || scratchTabs.length > 0) && (
              <div className={styles.tabsBar} ref={tabsRef}>
                {fileTabs.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className={`${styles.editorTab} ${!scratchActive && activeFileId === file.id ? styles.editorTabActive : ''}`}
                    onClick={() => openFile(file.id)}
                    title={file.name}
                  >
                    <span className={styles.editorTabName}>{file.name}</span>
                    <span
                      className={styles.editorTabClose}
                      onClick={(event) => {
                        event.stopPropagation()
                        closeFileTab(file.id)
                      }}
                      aria-hidden="true"
                    >
                      ×
                    </span>
                  </button>
                ))}
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
          </>
        )}

        {showEmptyProjectState && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>⌘</div>
            <h2 className={styles.emptyStateTitle}>Project workspace</h2>
            <p className={styles.emptyStateText}>
              No file is selected. Start a fresh project or reopen a file from the current project tree.
            </p>
            <div className={styles.emptyStateActions}>
              <button
                type="button"
                className={`${styles.emptyActionBtn} ${styles.emptyActionPrimary}`}
                onClick={newProject}
              >
                <span className={styles.emptyActionIcon}>✦</span>
                <span>New Project</span>
              </button>
              <button
                type="button"
                className={styles.emptyActionBtn}
                onClick={openFirstFile}
                disabled={!hasSelectableProjectFile}
              >
                <span className={styles.emptyActionIcon}>⤴</span>
                <span>Open Project</span>
              </button>
              <button
                type="button"
                className={styles.emptyActionBtn}
                onClick={() => setRecentProjectsOpen(true)}
              >
                <span className={styles.emptyActionIcon}>🕘</span>
                <span>Recent Projects</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {recentProjectsOpen && (
        <div
          className={styles.recentOverlay}
          onClick={() => setRecentProjectsOpen(false)}
        >
          <div
            className={styles.recentModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.recentHeader}>
              <div>
                <h3 className={styles.recentTitle}>Recent Projects</h3>
                <p className={styles.recentSubtitle}>Loaded from `recent_files/recent_opened_projects.json`</p>
              </div>
              <button
                type="button"
                className={styles.recentClose}
                onClick={() => setRecentProjectsOpen(false)}
              >
                ×
              </button>
            </div>

            {recentProjectsLoading && (
              <div className={styles.recentState}>Loading recent projects…</div>
            )}

            {recentProjectsError && !recentProjectsLoading && (
              <div className={styles.recentStateError}>{recentProjectsError}</div>
            )}

            {!recentProjectsLoading && !recentProjectsError && (
              <div className={styles.recentList}>
                {recentProjects.map((project) => (
                  <div key={`${project.path}_${project.openedAt}`} className={styles.recentItem}>
                    <div className={styles.recentItemIcon}>📁</div>
                    <div className={styles.recentItemBody}>
                      <div className={styles.recentItemTop}>
                        <span className={styles.recentProjectName}>{project.projectName}</span>
                        <span className={styles.recentProjectStamp}>{recentProjectStamp(project.openedAt)}</span>
                      </div>
                      <div className={styles.recentProjectPath}>{project.path}</div>
                      <div className={styles.recentProjectDate}>
                        {new Date(project.openedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stdin ───────────────────────────────────────── */}
      {!showEmptyProjectState && (
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
      )}
    </div>
  )
}
