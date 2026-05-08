import { create } from 'zustand'
import type { FsNode, FsFile, FsFolder, ScratchTab, UntitledFileTemplate } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 0
const uid = () => `node_${++_id}`
let scratchCounter = 0

function createScratchName() {
  scratchCounter += 1
  return `scratch_${scratchCounter}.cpp`
}

// ── Recursive tree helpers ────────────────────────────────────────────────────

function findNode(nodes: FsNode[], id: string): FsNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.kind === 'folder') {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

function renameIn(nodes: FsNode[], id: string, name: string): FsNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name }
    if (n.kind === 'folder') return { ...n, children: renameIn(n.children, id, name) }
    return n
  })
}

function deleteIn(nodes: FsNode[], id: string): FsNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.kind === 'folder' ? { ...n, children: deleteIn(n.children, id) } : n
    )
}

function toggleIn(nodes: FsNode[], id: string): FsNode[] {
  return nodes.map((n) => {
    if (n.id === id && n.kind === 'folder') return { ...n, collapsed: !n.collapsed }
    if (n.kind === 'folder') return { ...n, children: toggleIn(n.children, id) }
    return n
  })
}

function insertIn(nodes: FsNode[], parentId: string, child: FsNode): FsNode[] {
  return nodes.map((n) => {
    if (n.id === parentId && n.kind === 'folder')
      return { ...n, collapsed: false, children: [...n.children, child] }
    if (n.kind === 'folder') return { ...n, children: insertIn(n.children, parentId, child) }
    return n
  })
}

function updateContentIn(nodes: FsNode[], id: string, content: string): FsNode[] {
  return nodes.map((n) => {
    if (n.kind === 'file' && n.id === id) return { ...n, content }
    if (n.kind === 'folder') return { ...n, children: updateContentIn(n.children, id, content) }
    return n
  })
}

function allFileIds(nodes: FsNode[]): string[] {
  const ids: string[] = []
  for (const n of nodes) {
    if (n.kind === 'file') ids.push(n.id)
    else ids.push(...allFileIds(n.children))
  }
  return ids
}

function nextUntitledFileName(nodes: FsNode[]): string {
  const names = new Set<string>()

  const collect = (items: FsNode[]) => {
    for (const item of items) {
      names.add(item.name)
      if (item.kind === 'folder') collect(item.children)
    }
  }

  collect(nodes)

  if (!names.has('untitled.cpp')) return 'untitled.cpp'

  let counter = 2
  while (names.has(`untitled_${counter}.cpp`)) counter += 1
  return `untitled_${counter}.cpp`
}

function buildTemplateContent(template: UntitledFileTemplate | null) {
  if (!template) {
    return {
      content: '',
      lineNumber: 1,
      column: 1,
    }
  }

  const includeLines = template.headerfile.map((header) => `#include <${header}>`)
  const bodyLines = [...template.body]
  const contentLines = [...includeLines, ...bodyLines]

  let lineNumber = 1
  let column = 1

  const normalizedContentLines = contentLines.map((line, index) => {
    const cursorIndex = line.indexOf('<CURSOR>')
    if (cursorIndex < 0) return line

    lineNumber = index + 1
    column = cursorIndex + 1
    return line.replace('<CURSOR>', '')
  })

  if (normalizedContentLines.length === 0) {
    return {
      content: '',
      lineNumber: 1,
      column: 1,
    }
  }

  return {
    content: normalizedContentLines.join('\n'),
    lineNumber,
    column,
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface FileStore {
  // ── Project file tree ─────────────────────────────────
  tree:         FsNode[]
  activeFileId: string | null
  openFileIds:  string[]
  untitledTemplate: UntitledFileTemplate | null
  scratchpadTemplate: UntitledFileTemplate | null
  pendingCursorPlacement: {
    targetId: string
    targetKind: 'file' | 'scratch'
    lineNumber: number
    column: number
  } | null

  openFile:      (id: string) => void
  closeFileTab:  (id: string) => void
  openFirstFile: () => void
  newProject:    () => void
  setUntitledTemplate: (template: UntitledFileTemplate) => void
  setScratchpadTemplate: (template: UntitledFileTemplate) => void
  consumePendingCursorPlacement: () => void
  activeFile:    () => FsFile | null
  getActiveFile: () => FsFile | null

  createFile:   (parentId: string | null, name?: string) => void
  createFolder: (parentId: string | null, name: string) => void
  renameNode:   (id: string, name: string) => void
  deleteNode:   (id: string) => void
  toggleFolder: (id: string) => void
  updateContent:  (id: string, content: string) => void
  setFileContent: (id: string, content: string) => void

  // ── Scratch pad ───────────────────────────────────────
  scratchActive: boolean
  activeScratchId: string | null
  scratchTabs: ScratchTab[]
  activateScratch: (id?: string) => void
  setScratchCode: (code: string) => void
  clearScratch: (id?: string) => void
  closeScratchTab: (id: string) => void
}

export const useFileStore = create<FileStore>((set, get) => ({
  // ── Project file tree ─────────────────────────────────
  tree:         [],
  activeFileId: null,
  openFileIds:  [],
  untitledTemplate: null,
  scratchpadTemplate: null,
  pendingCursorPlacement: null,

  openFile: (id) =>
    set((s) => ({
      activeFileId: id,
      scratchActive: false,
      openFileIds: s.openFileIds.includes(id) ? s.openFileIds : [...s.openFileIds, id],
    })),

  closeFileTab: (id) =>
    set((s) => {
      const nextOpenFileIds = s.openFileIds.filter((fileId) => fileId !== id)
      if (s.activeFileId !== id) return { openFileIds: nextOpenFileIds }

      const fallbackId = nextOpenFileIds[nextOpenFileIds.length - 1] ?? null
      return {
        openFileIds: nextOpenFileIds,
        activeFileId: fallbackId,
      }
    }),

  openFirstFile: () =>
    set((s) => {
      const firstFileId = allFileIds(s.tree)[0] ?? null
      if (!firstFileId) return s

      return {
        activeFileId: firstFileId,
        scratchActive: false,
        openFileIds: s.openFileIds.includes(firstFileId)
          ? s.openFileIds
          : [...s.openFileIds, firstFileId],
      }
    }),

  newProject: () =>
    set(() => ({
      tree: [],
      activeFileId: null,
      openFileIds: [],
      pendingCursorPlacement: null,
      scratchActive: false,
      activeScratchId: null,
      scratchTabs: [],
    })),

  setUntitledTemplate: (untitledTemplate) => set({ untitledTemplate }),
  setScratchpadTemplate: (scratchpadTemplate) => set({ scratchpadTemplate }),
  consumePendingCursorPlacement: () => set({ pendingCursorPlacement: null }),

  activeFile: () => {
    const { tree, activeFileId, scratchActive } = get()
    if (scratchActive || !activeFileId) return null
    const node = findNode(tree, activeFileId)
    return node?.kind === 'file' ? node : null
  },

  getActiveFile: () => {
    const { tree, activeFileId, scratchActive } = get()
    if (scratchActive || !activeFileId) return null
    const node = findNode(tree, activeFileId)
    return node?.kind === 'file' ? node : null
  },

  createFile: (parentId, name) => {
    const templateResult = buildTemplateContent(get().untitledTemplate)
    const newFile: FsFile = {
      kind:    'file',
      id:      uid(),
      name:    name?.trim()
        ? (name.includes('.') ? name : `${name}.cpp`)
        : nextUntitledFileName(get().tree),
      content: templateResult.content,
    }
    set((s) => ({
      tree: parentId === null
        ? [...s.tree, newFile]
        : insertIn(s.tree, parentId, newFile),
      activeFileId: newFile.id,
      openFileIds: s.openFileIds.includes(newFile.id) ? s.openFileIds : [...s.openFileIds, newFile.id],
      pendingCursorPlacement: {
        targetId: newFile.id,
        targetKind: 'file',
        lineNumber: templateResult.lineNumber,
        column: templateResult.column,
      },
      scratchActive: false,
    }))
  },

  createFolder: (parentId, name) => {
    const newFolder: FsFolder = {
      kind:      'folder',
      id:        uid(),
      name,
      collapsed: false,
      children:  [],
    }
    set((s) => ({
      tree: parentId === null
        ? [...s.tree, newFolder]
        : insertIn(s.tree, parentId, newFolder),
    }))
  },

  renameNode: (id, name) =>
    set((s) => ({ tree: renameIn(s.tree, id, name) })),

  deleteNode: (id) =>
    set((s) => {
      const newTree   = deleteIn(s.tree, id)
      const remaining = allFileIds(newTree)
      const nextOpenFileIds = s.openFileIds.filter((fileId) => remaining.includes(fileId))
      const nextActive =
        s.activeFileId === id || !remaining.includes(s.activeFileId ?? '')
          ? (nextOpenFileIds[nextOpenFileIds.length - 1] ?? remaining[0] ?? null)
          : s.activeFileId
      return { tree: newTree, activeFileId: nextActive, openFileIds: nextOpenFileIds }
    }),

  toggleFolder: (id) =>
    set((s) => ({ tree: toggleIn(s.tree, id) })),

  updateContent: (id, content) =>
    set((s) => ({ tree: updateContentIn(s.tree, id, content) })),

  setFileContent: (id, content) =>
    set((s) => ({ tree: updateContentIn(s.tree, id, content) })),

  // ── Scratch pad ───────────────────────────────────────
  scratchActive: false,
  activeScratchId: null,
  scratchTabs: [],

  activateScratch: (id) =>
    set((s) => {
      if (id) {
        const target = s.scratchTabs.find((tab) => tab.id === id)
        if (!target) return s
        return { scratchActive: true, activeScratchId: id }
      }

      const templateResult = buildTemplateContent(s.scratchpadTemplate)
      const nextScratch: ScratchTab = {
        id: `scratch_${uid()}`,
        name: createScratchName(),
        content: templateResult.content,
      }
      return {
        scratchActive: true,
        activeScratchId: nextScratch.id,
        scratchTabs: [...s.scratchTabs, nextScratch],
        pendingCursorPlacement: {
          targetId: nextScratch.id,
          targetKind: 'scratch',
          lineNumber: templateResult.lineNumber,
          column: templateResult.column,
        },
      }
    }),

  setScratchCode: (content) =>
    set((s) => ({
      scratchTabs: s.scratchTabs.map((tab) =>
        tab.id === s.activeScratchId ? { ...tab, content } : tab
      ),
    })),

  clearScratch: (id) =>
    set((s) => {
      const targetId = id ?? s.activeScratchId
      if (!targetId) return s

      const templateResult = buildTemplateContent(s.scratchpadTemplate)

      return {
        scratchTabs: s.scratchTabs.map((tab) =>
          tab.id === targetId
            ? { ...tab, content: templateResult.content }
            : tab
        ),
        pendingCursorPlacement: {
          targetId,
          targetKind: 'scratch',
          lineNumber: templateResult.lineNumber,
          column: templateResult.column,
        },
      }
    }),

  closeScratchTab: (id) =>
    set((s) => {
      const nextScratchTabs = s.scratchTabs.filter((tab) => tab.id !== id)

      if (s.activeScratchId !== id) {
        return { scratchTabs: nextScratchTabs }
      }

      const fallbackScratch = nextScratchTabs[nextScratchTabs.length - 1] ?? null
      return {
        scratchTabs: nextScratchTabs,
        activeScratchId: fallbackScratch?.id ?? null,
        scratchActive: Boolean(fallbackScratch),
      }
    }),
}))
