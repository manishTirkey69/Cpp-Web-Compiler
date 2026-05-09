import { create } from 'zustand'
import type { FsNode, FsFile, FsFolder, SavedFileHandle, ScratchTab, UntitledFileTemplate } from '@/types'

let _id = 0
const uid = () => `node_${++_id}`
let scratchCounter = 0

function createScratchName() {
  scratchCounter += 1
  return `scratch_${scratchCounter}.cpp`
}

function findNode(nodes: FsNode[], id: string): FsNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.kind === 'folder') {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

function mapNodes(nodes: FsNode[], mapper: (node: FsNode) => FsNode): FsNode[] {
  return nodes.map((node) => {
    const nextNode =
      node.kind === 'folder'
        ? { ...node, children: mapNodes(node.children, mapper) }
        : node
    return mapper(nextNode)
  })
}

function deleteIn(nodes: FsNode[], id: string): FsNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.kind === 'folder' ? { ...node, children: deleteIn(node.children, id) } : node,
    )
}

function allFileIds(nodes: FsNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.kind === 'file') ids.push(node.id)
    else ids.push(...allFileIds(node.children))
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
    return { content: '', lineNumber: 1, column: 1 }
  }

  const includeLines = template.headerfile.map((header) => `#include <${header}>`)
  const contentLines = [...includeLines, ...template.body]

  let lineNumber = 1
  let column = 1

  const normalizedContentLines = contentLines.map((line, index) => {
    const cursorIndex = line.indexOf('<CURSOR>')
    if (cursorIndex < 0) return line
    lineNumber = index + 1
    column = cursorIndex + 1
    return line.replace('<CURSOR>', '')
  })

  return {
    content: normalizedContentLines.join('\n'),
    lineNumber,
    column,
  }
}

function insertIn(nodes: FsNode[], parentId: string, child: FsNode): FsNode[] {
  return nodes.map((node) => {
    if (node.kind === 'folder' && node.id === parentId) {
      return {
        ...node,
        collapsed: false,
        isLoaded: true,
        children: [...node.children, child],
      }
    }

    return node.kind === 'folder'
      ? { ...node, children: insertIn(node.children, parentId, child) }
      : node
  })
}

function replaceFolderChildren(nodes: FsNode[], id: string, children: FsNode[]): FsNode[] {
  return mapNodes(nodes, (node) => {
    if (node.kind === 'folder' && node.id === id) {
      return {
        ...node,
        children,
        isLoaded: true,
      }
    }
    return node
  })
}

function updateFileIn(nodes: FsNode[], id: string, updater: (file: FsFile) => FsFile): FsNode[] {
  return mapNodes(nodes, (node) => {
    if (node.kind === 'file' && node.id === id) return updater(node)
    return node
  })
}

function updateFolderIn(nodes: FsNode[], id: string, updater: (folder: FsFolder) => FsFolder): FsNode[] {
  return mapNodes(nodes, (node) => {
    if (node.kind === 'folder' && node.id === id) return updater(node)
    return node
  })
}

interface FileStore {
  tree: FsNode[]
  activeFileId: string | null
  openFileIds: string[]
  untitledTemplate: UntitledFileTemplate | null
  scratchpadTemplate: UntitledFileTemplate | null
  pendingCursorPlacement: {
    targetId: string
    targetKind: 'file' | 'scratch'
    lineNumber: number
    column: number
  } | null

  openFile: (id: string) => void
  closeFileTab: (id: string) => void
  newProject: () => void
  loadProject: (tree: FsNode[]) => void
  replaceProjectTree: (tree: FsNode[]) => void
  replaceWorkspaceRoot: (root: FsFolder) => void
  setFolderChildren: (id: string, children: FsNode[]) => void
  setFolderLoaded: (id: string, isLoaded: boolean) => void
  setFileLoadedContent: (id: string, content: string) => void
  setUntitledTemplate: (template: UntitledFileTemplate) => void
  setScratchpadTemplate: (template: UntitledFileTemplate) => void
  consumePendingCursorPlacement: () => void
  activeFile: () => FsFile | null
  getActiveFile: () => FsFile | null
  createFile: (parentId: string | null, name?: string) => void
  createFolder: (parentId: string | null, name: string) => void
  renameNode: (id: string, name: string) => void
  bindFileHandle: (id: string, name: string, savedHandle: SavedFileHandle | null) => void
  deleteNode: (id: string) => void
  toggleFolder: (id: string) => void
  setFileContent: (id: string, content: string) => void
  removeUntitledFiles: (ids: string[]) => void

  scratchActive: boolean
  activeScratchId: string | null
  scratchTabs: ScratchTab[]
  activateScratch: (id?: string) => void
  setScratchCode: (code: string) => void
  clearScratch: (id?: string) => void
  closeScratchTab: (id: string) => void
}

export const useFileStore = create<FileStore>((set, get) => ({
  tree: [],
  activeFileId: null,
  openFileIds: [],
  untitledTemplate: null,
  scratchpadTemplate: null,
  pendingCursorPlacement: null,

  openFile: (id) =>
    set((state) => ({
      activeFileId: id,
      scratchActive: false,
      openFileIds: state.openFileIds.includes(id) ? state.openFileIds : [...state.openFileIds, id],
    })),

  closeFileTab: (id) =>
    set((state) => {
      const nextOpenFileIds = state.openFileIds.filter((fileId) => fileId !== id)
      if (state.activeFileId !== id) return { openFileIds: nextOpenFileIds }

      return {
        openFileIds: nextOpenFileIds,
        activeFileId: nextOpenFileIds[nextOpenFileIds.length - 1] ?? null,
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

  loadProject: (tree) =>
    set((state) => {
      const roots = tree.filter((node): node is FsFolder => node.kind === 'folder')
      const dedupedExisting = state.tree.filter(
        (node) =>
          node.kind !== 'folder' ||
          !roots.some((root) => root.serverPath && root.serverPath === node.serverPath),
      )

      const nextTree = [...dedupedExisting, ...roots]
      const firstFileId = allFileIds(nextTree)[0] ?? state.activeFileId

      return {
        tree: nextTree,
        activeFileId: firstFileId ?? null,
        openFileIds: firstFileId
          ? Array.from(new Set([...state.openFileIds, firstFileId]))
          : state.openFileIds,
        pendingCursorPlacement: null,
        scratchActive: false,
      }
    }),

  replaceProjectTree: (tree) =>
    set(() => {
      const nextTree = tree.filter((node): node is FsFolder => node.kind === 'folder')
      const firstFileId = allFileIds(nextTree)[0] ?? null

      return {
        tree: nextTree,
        activeFileId: firstFileId,
        openFileIds: firstFileId ? [firstFileId] : [],
        pendingCursorPlacement: null,
        scratchActive: false,
      }
    }),

  replaceWorkspaceRoot: (root) =>
    set((state) => ({
      tree: state.tree.map((node) =>
        node.kind === 'folder' && node.serverPath === root.serverPath ? root : node,
      ),
    })),

  setFolderChildren: (id, children) =>
    set((state) => ({
      tree: replaceFolderChildren(state.tree, id, children),
    })),

  setFolderLoaded: (id, isLoaded) =>
    set((state) => ({
      tree: updateFolderIn(state.tree, id, (folder) => ({ ...folder, isLoaded })),
    })),

  setFileLoadedContent: (id, content) =>
    set((state) => ({
      tree: updateFileIn(state.tree, id, (file) => ({
        ...file,
        content,
        isLoaded: true,
      })),
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
      kind: 'file',
      id: uid(),
      name: name?.trim()
        ? (name.includes('.') ? name : `${name}.cpp`)
        : nextUntitledFileName(get().tree),
      content: templateResult.content,
      isLoaded: true,
      savedHandle: null,
      serverPath: null,
    }

    set((state) => ({
      tree: parentId === null ? [...state.tree, newFile] : insertIn(state.tree, parentId, newFile),
      activeFileId: newFile.id,
      openFileIds: state.openFileIds.includes(newFile.id) ? state.openFileIds : [...state.openFileIds, newFile.id],
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
      kind: 'folder',
      id: uid(),
      name,
      collapsed: false,
      isLoaded: true,
      savedHandle: null,
      serverPath: null,
      children: [],
    }

    set((state) => ({
      tree: parentId === null ? [...state.tree, newFolder] : insertIn(state.tree, parentId, newFolder),
    }))
  },

  renameNode: (id, name) =>
    set((state) => ({
      tree: mapNodes(state.tree, (node) => (node.id === id ? { ...node, name } : node)),
    })),

  bindFileHandle: (id, name, savedHandle) =>
    set((state) => ({
      tree: updateFileIn(state.tree, id, (file) => ({
        ...file,
        name,
        savedHandle,
      })),
    })),

  deleteNode: (id) =>
    set((state) => {
      const nextTree = deleteIn(state.tree, id)
      const remaining = allFileIds(nextTree)
      const nextOpenFileIds = state.openFileIds.filter((fileId) => remaining.includes(fileId))
      const nextActive =
        state.activeFileId === id || !remaining.includes(state.activeFileId ?? '')
          ? (nextOpenFileIds[nextOpenFileIds.length - 1] ?? null)
          : state.activeFileId

      return {
        tree: nextTree,
        activeFileId: nextActive,
        openFileIds: nextOpenFileIds,
      }
    }),

  toggleFolder: (id) =>
    set((state) => ({
      tree: updateFolderIn(state.tree, id, (folder) => ({
        ...folder,
        collapsed: !folder.collapsed,
      })),
    })),

  setFileContent: (id, content) =>
    set((state) => ({
      tree: updateFileIn(state.tree, id, (file) => ({ ...file, content, isLoaded: true })),
    })),

  removeUntitledFiles: (ids) =>
    set((state) => {
      const nextTree = ids.reduce((currentTree, id) => deleteIn(currentTree, id), state.tree)
      const remaining = allFileIds(nextTree)
      const nextOpenFileIds = state.openFileIds.filter((fileId) => remaining.includes(fileId))
      return {
        tree: nextTree,
        openFileIds: nextOpenFileIds,
        activeFileId: remaining.includes(state.activeFileId ?? '') ? state.activeFileId : (nextOpenFileIds[nextOpenFileIds.length - 1] ?? null),
      }
    }),

  scratchActive: false,
  activeScratchId: null,
  scratchTabs: [],

  activateScratch: (id) =>
    set((state) => {
      if (id) {
        const target = state.scratchTabs.find((tab) => tab.id === id)
        if (!target) return state
        return { scratchActive: true, activeScratchId: id }
      }

      const templateResult = buildTemplateContent(state.scratchpadTemplate)
      const nextScratch: ScratchTab = {
        id: `scratch_${uid()}`,
        name: createScratchName(),
        content: templateResult.content,
      }

      return {
        scratchActive: true,
        activeScratchId: nextScratch.id,
        scratchTabs: [...state.scratchTabs, nextScratch],
        pendingCursorPlacement: {
          targetId: nextScratch.id,
          targetKind: 'scratch',
          lineNumber: templateResult.lineNumber,
          column: templateResult.column,
        },
      }
    }),

  setScratchCode: (content) =>
    set((state) => ({
      scratchTabs: state.scratchTabs.map((tab) =>
        tab.id === state.activeScratchId ? { ...tab, content } : tab,
      ),
    })),

  clearScratch: (id) =>
    set((state) => {
      const targetId = id ?? state.activeScratchId
      if (!targetId) return state

      const templateResult = buildTemplateContent(state.scratchpadTemplate)

      return {
        scratchTabs: state.scratchTabs.map((tab) =>
          tab.id === targetId ? { ...tab, content: templateResult.content } : tab,
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
    set((state) => {
      const nextScratchTabs = state.scratchTabs.filter((tab) => tab.id !== id)

      if (state.activeScratchId !== id) {
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
