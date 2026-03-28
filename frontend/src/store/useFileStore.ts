import { create } from 'zustand'
import type { FsNode, FsFile, FsFolder } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 0
const uid = () => `node_${++_id}`

const SCRATCH_DEFAULT = `#include <iostream>

int main() {
    // ⚡ Scratch pad — write and run without saving a file
    std::cout << "Hello from scratch!\\n";
    return 0;
}
`

const STARTER: FsFile = {
  kind:    'file',
  id:      'main',
  name:    'main.cpp',
  content: `#include <iostream>
#include <vector>
#include <algorithm>
#include <string>

int main() {
    std::vector<int> nums = {5, 2, 8, 1, 9, 3};

    std::sort(nums.begin(), nums.end());

    std::cout << "Sorted: ";
    for (int n : nums) std::cout << n << " ";
    std::cout << "\\n";

    std::cout << "Enter your name: ";
    std::string name;
    std::cin >> name;
    std::cout << "Hello, " << name << "!\\n";

    return 0;
}
`,
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

// ── Store ─────────────────────────────────────────────────────────────────────

interface FileStore {
  // ── Project file tree ─────────────────────────────────
  tree:         FsNode[]
  activeFileId: string | null

  openFile:      (id: string) => void
  activeFile:    () => FsFile | null
  getActiveFile: () => FsFile | null

  createFile:   (parentId: string | null, name: string) => void
  createFolder: (parentId: string | null, name: string) => void
  renameNode:   (id: string, name: string) => void
  deleteNode:   (id: string) => void
  toggleFolder: (id: string) => void
  updateContent:  (id: string, content: string) => void
  setFileContent: (id: string, content: string) => void

  // ── Scratch pad ───────────────────────────────────────
  /** true when the editor should show scratch code, not a project file */
  scratchActive: boolean
  scratchCode:   string
  /** Activate scratch mode (deselects any open file) */
  activateScratch: () => void
  /** Update scratch content on keystroke */
  setScratchCode: (code: string) => void
  /** Clear scratch back to default template */
  clearScratch: () => void
}

export const useFileStore = create<FileStore>((set, get) => ({
  // ── Project file tree ─────────────────────────────────
  tree:         [STARTER],
  activeFileId: STARTER.id,

  openFile: (id) => set({ activeFileId: id, scratchActive: false }),

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
    const newFile: FsFile = {
      kind:    'file',
      id:      uid(),
      name:    name.includes('.') ? name : `${name}.cpp`,
      content: `#include <iostream>\n\nint main() {\n    return 0;\n}\n`,
    }
    set((s) => ({
      tree: parentId === null
        ? [...s.tree, newFile]
        : insertIn(s.tree, parentId, newFile),
      activeFileId: newFile.id,
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
      const nextActive =
        s.activeFileId === id || !remaining.includes(s.activeFileId ?? '')
          ? (remaining[0] ?? null)
          : s.activeFileId
      return { tree: newTree, activeFileId: nextActive }
    }),

  toggleFolder: (id) =>
    set((s) => ({ tree: toggleIn(s.tree, id) })),

  updateContent: (id, content) =>
    set((s) => ({ tree: updateContentIn(s.tree, id, content) })),

  setFileContent: (id, content) =>
    set((s) => ({ tree: updateContentIn(s.tree, id, content) })),

  // ── Scratch pad ───────────────────────────────────────
  scratchActive: false,
  scratchCode:   SCRATCH_DEFAULT,

  activateScratch: () =>
    set({ scratchActive: true, activeFileId: null }),

  setScratchCode: (scratchCode) =>
    set({ scratchCode }),

  clearScratch: () =>
    set({ scratchCode: SCRATCH_DEFAULT }),
}))
