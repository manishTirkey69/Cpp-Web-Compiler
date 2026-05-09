import { useState, useRef, useEffect, useCallback } from 'react'
import { readHostedDirectory } from '@/lib/openProject'
import { useFileStore } from '@/store/useFileStore'
import { saveFileAs } from '@/lib/saveFile'
import type { FsFile, FsFolder, FsNode } from '@/types'
import styles from './FileExplorer.module.css'

// ── VS Code-like icon by extension ────────────────────────────────────────────
function fileIconMeta(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'cpp':
    case 'cc':
    case 'cxx':
      return { label: 'C++', className: styles.fileIconCpp }
    case 'h':
    case 'hpp':
      return { label: 'H', className: styles.fileIconHeader }
    case 'c':
      return { label: 'C', className: styles.fileIconC }
    case 'json':
      return { label: '{}', className: styles.fileIconJson }
    case 'md':
      return { label: 'MD', className: styles.fileIconMarkdown }
    case 'txt':
      return { label: 'TXT', className: styles.fileIconText }
    default:
      return { label: '•', className: styles.fileIconDefault }
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
  onCommit: (name: string) => void
  onCancel: () => void
}

function NewItemInput({ onCommit, onCancel }: NewItemInputProps) {
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
      <span className={`${styles.iconToken} ${styles.folderToken} ${styles.folderTokenClosed}`} aria-hidden="true" />
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
  onSaveAs?:   () => void
  onRename:    () => void
  onDelete:    () => void
  onNewFile:   () => void
  onNewFolder: () => void
}

function ContextMenu({
  x, y, node, onClose,
  onSaveAs, onRename, onDelete, onNewFile, onNewFolder,
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
      {node.kind === 'file' && onSaveAs && item('💾  Save As...', onSaveAs)}
      {node.kind === 'file' && <li className={styles.ctxDivider} />}
      {item('✏️  Rename', onRename)}
      {item('🗑️  Delete', onDelete, true)}
    </ul>
  )
}

// ── Tree node ─────────────────────────────────────────────────────────────────
interface TreeNodeProps {
  node: FsNode
  depth: number
  pendingNew: { parentId: string | null; kind: 'folder' } | null
  onNewCreated: () => void
  onCancelNew:  () => void
}

function TreeNode({ node, depth, pendingNew, onNewCreated, onCancelNew }: TreeNodeProps) {
  const {
    activeFileId,
    scratchActive,
    openFile,
    renameNode,
    bindFileHandle,
    deleteNode,
    setFolderChildren,
    toggleFolder,
    createFile,
    createFolder,
  } = useFileStore()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu]       = useState<{ x: number; y: number } | null>(null)

  const isActive = !scratchActive && node.kind === 'file' && node.id === activeFileId
  const indent   = { paddingLeft: `${12 + depth * 14}px` }
  const iconMeta = node.kind === 'file' ? fileIconMeta(node.name) : null

  const handleCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLLIElement>) => {
    if (node.kind !== 'file') return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setCtxMenu({
      x: Math.min(rect.left + 24, window.innerWidth - 170),
      y: Math.min(rect.bottom + 6, window.innerHeight - 160),
    })
  }, [node.kind])

  const handleSaveAs = useCallback(() => {
    if (node.kind !== 'file') return
    const fileNode = node as FsFile
    void saveFileAs(fileNode.name, fileNode.content).then((result) => {
      if (result?.status === 'saved' && result.fileHandle) {
        bindFileHandle(fileNode.id, result.name, result.fileHandle)
      }
    })
  }, [bindFileHandle, node])

  const handleClick = async () => {
    if (node.kind === 'file') {
      openFile(node.id)
      return
    }

    if (node.serverPath && !node.isLoaded) {
      try {
        const data = await readHostedDirectory(node.serverPath)
        setFolderChildren(node.id, data.children)
      } catch {
        // Ignore browse failures here; the folder can be retried.
      }
    }

    toggleFolder(node.id)
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
        onClick={() => { void handleClick() }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleCtx}
        title={node.name}
      >
        {node.kind === 'folder' ? (
          <span className={styles.chevron}>{node.collapsed ? '▶' : '▾'}</span>
        ) : (
          <span className={`${styles.iconToken} ${styles.fileToken} ${iconMeta?.className ?? styles.fileIconDefault}`} aria-hidden="true">
            {iconMeta?.label ?? '•'}
          </span>
        )}

        {node.kind === 'folder' && (
          <span
            className={`${styles.iconToken} ${styles.folderToken} ${node.collapsed ? styles.folderTokenClosed : styles.folderTokenOpen}`}
            aria-hidden="true"
          />
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
              onCommit={(name) => {
                createFolder(node.id, name)
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
          onSaveAs={node.kind === 'file' ? handleSaveAs : undefined}
          onRename={() => setRenamingId(node.id)}
          onDelete={() => deleteNode(node.id)}
          onNewFile={() => createFile(node.id)}
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
  const {
    scratchActive,
    activeScratchId,
    scratchTabs,
    activateScratch,
    clearScratch,
  } = useFileStore()
  const activeScratch = scratchTabs.find((tab) => tab.id === activeScratchId) ?? null
  const lineCount = (activeScratch?.content ?? '').split('\n').length

  return (
    <div className={`${styles.scratchSection} ${scratchActive ? styles.scratchSectionActive : ''}`}>

      {/* Header row */}
      <div
        className={`${styles.scratchHeader} ${scratchActive ? styles.scratchHeaderActive : ''}`}
        onClick={() => activateScratch()}
        title="Create a new scratch tab"
      >
        <span className={styles.scratchIcon}>⚡</span>
        <div className={styles.scratchTitles}>
          <span className={styles.scratchTitle}>Scratch Pad</span>
          <span className={styles.scratchSub}>new scratch tab</span>
        </div>
        {scratchTabs.length > 0 && <span className={styles.scratchBadge}>{scratchTabs.length}</span>}
      </div>

      {/* Expanded info when active */}
      {scratchActive && activeScratch && (
        <div className={styles.scratchMeta}>
          <span className={styles.scratchMetaLine}>
            {activeScratch.name} · {lineCount} line{lineCount !== 1 ? 's' : ''} · unsaved
          </span>
          <button
            className={styles.scratchClearBtn}
            onClick={(e) => { e.stopPropagation(); clearScratch(activeScratch.id) }}
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
  const hostedRoots = tree.filter((node): node is FsFolder => node.kind === 'folder' && Boolean(node.serverPath))
  const singleHostedRoot = hostedRoots.length === 1 && tree.length === 1 ? hostedRoots[0] : null
  const hasOpenedProject = hostedRoots.length > 0
  const headerTitle =
    hostedRoots.length > 1
      ? 'Workspace'
      : singleHostedRoot?.name ?? 'Project'
  const visibleTree = singleHostedRoot ? singleHostedRoot.children : tree
  const rootParentId = singleHostedRoot?.id ?? null
  const [pendingNew, setPendingNew]   = useState<{
    parentId: string | null
    kind: 'folder'
  } | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { parentId, kind } = (e as CustomEvent).detail
      if (kind !== 'folder') return
      setPendingNew({ parentId, kind })
    }
    window.addEventListener('fs:new', handler)
    return () => window.removeEventListener('fs:new', handler)
  }, [])

  return (
    <aside className={styles.sidebar}>

      {/* ── Top header ─────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.title} title={headerTitle}>{headerTitle}</span>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            title="New File"
            onClick={() => createFile(rootParentId)}
          >📄+</button>
          {hasOpenedProject && (
            <button
              className={styles.iconBtn}
              title="New Folder"
              onClick={() => setPendingNew({ parentId: rootParentId, kind: 'folder' })}
            >📁+</button>
          )}
        </div>
      </div>

      {/* ── Project file tree ───────────────────────────── */}
      <div className={styles.section}>
        <ul className={styles.tree}>
          {visibleTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              pendingNew={pendingNew}
              onNewCreated={() => setPendingNew(null)}
              onCancelNew={() => setPendingNew(null)}
            />
          ))}

          {pendingNew?.parentId === rootParentId && (
            <NewItemInput
              onCommit={(name) => {
                createFolder(rootParentId, name)
                setPendingNew(null)
              }}
              onCancel={() => setPendingNew(null)}
            />
          )}
        </ul>
      </div>

      {/* ── Scratch Pad (pinned above footer) ──────────── */}
      <ScratchSection />

      {/* ── Footer ─────────────────────────────────────── */}
      <div className={styles.footer}>g++ · WebAssembly</div>
    </aside>
  )
}
