import { useState, useRef, useEffect, useCallback } from 'react'
import { useFileStore } from '@/store/useFileStore'
import type { FsNode } from '@/types'
import styles from './FileExplorer.module.css'

// ── File icon by extension ────────────────────────────────────────────────────
function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'cpp': case 'cc': case 'cxx': return '⚙'
    case 'h':   case 'hpp':            return '📋'
    case 'c':                          return '📄'
    case 'txt':                        return '📝'
    case 'md':                         return '📖'
    default:                           return '📄'
  }
}

// ── Inline rename input ───────────────────────────────────────────────────────
interface RenameInputProps {
  initial: string
  onCommit: (name: string) => void
  onCancel: () => void
}

function RenameInput({ initial, onCommit, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initial) onCommit(trimmed)
    else onCancel()
  }

  return (
    <input
      ref={ref}
      className={styles.renameInput}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter')  { e.preventDefault(); commit() }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

// ── New-item input ────────────────────────────────────────────────────────────
interface NewItemInputProps {
  icon: string
  onCommit: (name: string) => void
  onCancel: () => void
}

function NewItemInput({ icon, onCommit, onCancel }: NewItemInputProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed) onCommit(trimmed)
    else onCancel()
  }

  return (
    <li className={styles.newItem}>
      <span className={styles.fileIcon}>{icon}</span>
      <input
        ref={ref}
        className={styles.renameInput}
        value={value}
        placeholder="name…"
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
      />
    </li>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────
interface ContextMenuProps {
  x: number
  y: number
  node: FsNode
  onClose: () => void
  onRename:    () => void
  onDelete:    () => void
  onNewFile:   () => void
  onNewFolder: () => void
}

function ContextMenu({
  x, y, node, onClose,
  onRename, onDelete, onNewFile, onNewFolder,
}: ContextMenuProps) {
  const ref = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const style: React.CSSProperties = {
    position: 'fixed',
    top:  Math.min(y, window.innerHeight - 160),
    left: Math.min(x, window.innerWidth  - 170),
  }

  const item = (label: string, action: () => void, danger = false) => (
    <li
      className={`${styles.ctxItem} ${danger ? styles.ctxDanger : ''}`}
      onMouseDown={(e) => { e.preventDefault(); action(); onClose() }}
    >
      {label}
    </li>
  )

  return (
    <ul ref={ref} className={styles.contextMenu} style={style}>
      {node.kind === 'folder' && item('📄  New File',   onNewFile)}
      {node.kind === 'folder' && item('📁  New Folder', onNewFolder)}
      {node.kind === 'folder' && <li className={styles.ctxDivider} />}
      {item('✏️  Rename', onRename)}
      {item('🗑️  Delete', onDelete, true)}
    </ul>
  )
}

// ── Tree node ─────────────────────────────────────────────────────────────────
interface TreeNodeProps {
  node: FsNode
  depth: number
  pendingNew: { parentId: string | null; kind: 'file' | 'folder' } | null
  onNewCreated: () => void
  onCancelNew:  () => void
}

function TreeNode({ node, depth, pendingNew, onNewCreated, onCancelNew }: TreeNodeProps) {
  const {
    activeFileId,
    scratchActive,
    openFile,
    renameNode,
    deleteNode,
    toggleFolder,
    createFile,
    createFolder,
  } = useFileStore()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu]       = useState<{ x: number; y: number } | null>(null)

  const isActive = !scratchActive && node.kind === 'file' && node.id === activeFileId
  const indent   = { paddingLeft: `${12 + depth * 14}px` }

  const handleCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleClick = () => {
    if (node.kind === 'file')   openFile(node.id)
    if (node.kind === 'folder') toggleFolder(node.id)
  }

  const commitRename = (newName: string) => {
    renameNode(node.id, newName)
    setRenamingId(null)
  }

  const pendingHere =
    node.kind === 'folder' && !node.collapsed && pendingNew?.parentId === node.id
      ? pendingNew
      : null

  return (
    <>
      <li
        className={`${styles.row} ${isActive ? styles.active : ''}`}
        style={indent}
        onClick={handleClick}
        onContextMenu={handleCtx}
        title={node.name}
      >
        {node.kind === 'folder' ? (
          <span className={styles.chevron}>{node.collapsed ? '▶' : '▾'}</span>
        ) : (
          <span className={styles.fileIcon}>{fileIcon(node.name)}</span>
        )}

        {node.kind === 'folder' && (
          <span className={styles.folderIcon}>{node.collapsed ? '📁' : '📂'}</span>
        )}

        {renamingId === node.id ? (
          <RenameInput
            initial={node.name}
            onCommit={commitRename}
            onCancel={() => setRenamingId(null)}
          />
        ) : (
          <span className={styles.label}>{node.name}</span>
        )}
      </li>

      {node.kind === 'folder' && !node.collapsed && (
        <>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              pendingNew={pendingNew}
              onNewCreated={onNewCreated}
              onCancelNew={onCancelNew}
            />
          ))}
          {pendingHere && (
            <NewItemInput
              icon={pendingHere.kind === 'file' ? '📄' : '📁'}
              onCommit={(name) => {
                if (pendingHere.kind === 'file') createFile(node.id, name)
                else                             createFolder(node.id, name)
                onNewCreated()
              }}
              onCancel={onCancelNew}
            />
          )}
        </>
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          node={node}
          onClose={() => setCtxMenu(null)}
          onRename={() => setRenamingId(node.id)}
          onDelete={() => deleteNode(node.id)}
          onNewFile={() => {
            window.dispatchEvent(new CustomEvent('fs:new', {
              detail: { parentId: node.id, kind: 'file' },
            }))
          }}
          onNewFolder={() => {
            window.dispatchEvent(new CustomEvent('fs:new', {
              detail: { parentId: node.id, kind: 'folder' },
            }))
          }}
        />
      )}
    </>
  )
}

// ── Scratch Pad section ───────────────────────────────────────────────────────
function ScratchSection() {
  const { scratchActive, scratchCode, activateScratch, clearScratch } = useFileStore()
  const lineCount = scratchCode.split('\n').length

  return (
    <div className={`${styles.scratchSection} ${scratchActive ? styles.scratchSectionActive : ''}`}>

      {/* Header row */}
      <div
        className={`${styles.scratchHeader} ${scratchActive ? styles.scratchHeaderActive : ''}`}
        onClick={activateScratch}
        title="Open scratch pad — no file needed"
      >
        <span className={styles.scratchIcon}>⚡</span>
        <div className={styles.scratchTitles}>
          <span className={styles.scratchTitle}>Scratch Pad</span>
          <span className={styles.scratchSub}>no file needed</span>
        </div>
        {scratchActive && <span className={styles.scratchBadge}>active</span>}
      </div>

      {/* Expanded info when active */}
      {scratchActive && (
        <div className={styles.scratchMeta}>
          <span className={styles.scratchMetaLine}>
            {lineCount} line{lineCount !== 1 ? 's' : ''} · unsaved
          </span>
          <button
            className={styles.scratchClearBtn}
            onClick={(e) => { e.stopPropagation(); clearScratch() }}
            title="Reset scratch to default template"
          >
            reset
          </button>
        </div>
      )}
    </div>
  )
}

// ── Root FileExplorer ─────────────────────────────────────────────────────────
export function FileExplorer() {
  const { tree, createFile, createFolder } = useFileStore()

  const [projectOpen, setProjectOpen] = useState(true)
  const [pendingNew, setPendingNew]   = useState<{
    parentId: string | null
    kind: 'file' | 'folder'
  } | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { parentId, kind } = (e as CustomEvent).detail
      setPendingNew({ parentId, kind })
    }
    window.addEventListener('fs:new', handler)
    return () => window.removeEventListener('fs:new', handler)
  }, [])

  return (
    <aside className={styles.sidebar}>

      {/* ── Top header ─────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.title}>Explorer</span>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            title="New File"
            onClick={() => setPendingNew({ parentId: null, kind: 'file' })}
          >📄+</button>
          <button
            className={styles.iconBtn}
            title="New Folder"
            onClick={() => setPendingNew({ parentId: null, kind: 'folder' })}
          >📁+</button>
        </div>
      </div>

      {/* ── Project file tree ───────────────────────────── */}
      <div className={styles.section}>
        <div
          className={styles.sectionHeader}
          onClick={() => setProjectOpen((v) => !v)}
        >
          <span className={styles.chevron}>{projectOpen ? '▾' : '▶'}</span>
          <span>PROJECT</span>
        </div>

        {projectOpen && (
          <ul className={styles.tree}>
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                pendingNew={pendingNew}
                onNewCreated={() => setPendingNew(null)}
                onCancelNew={() => setPendingNew(null)}
              />
            ))}

            {pendingNew?.parentId === null && (
              <NewItemInput
                icon={pendingNew.kind === 'file' ? '📄' : '📁'}
                onCommit={(name) => {
                  if (pendingNew.kind === 'file') createFile(null, name)
                  else                            createFolder(null, name)
                  setPendingNew(null)
                }}
                onCancel={() => setPendingNew(null)}
              />
            )}
          </ul>
        )}
      </div>

      {/* ── Scratch Pad (pinned above footer) ──────────── */}
      <ScratchSection />

      {/* ── Footer ─────────────────────────────────────── */}
      <div className={styles.footer}>g++ · WebAssembly</div>
    </aside>
  )
}
