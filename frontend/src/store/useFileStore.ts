import { create } from 'zustand'
import type { FsNode, FsFile, FsFolder } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 1
const uid = () => String(_id++)

const STARTER: FsNode[] = [
  {
    kind: 'file',
    id: uid(),
    name: 'main.cpp',
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
  },
]

// ── Tree utilities ────────────────────────────────────────────────────────────

/** Walk the tree and return the node with the given id */
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

/** Find the parent array that contains the node with the given id */
function findParentList(nodes: FsNode[], id: string): FsNode[] | null {
  for (const n of nodes) {
    if (n.id === id) return nodes
    if (n.kind === 'folder') {
      const found = findParentList(n.children, id)
      if (found) return found
    }
  }
  return null
}

/** Deep-clone the tree */
function cloneTree(nodes: FsNode[]): FsNode[] {
  return nodes.map((n) =>
    n.kind === 'file'
      ? { ...n }
      : { ...n, children: cloneTree(n.children) }
  )
}

/** Update a node in place (returns new tree) */
function updateNode(nodes: FsNode[], id: string, updater: (n: FsNode) => FsNode): FsNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n)
    if (n.kind === 'folder') return { ...n, children: updateNode(n.children, id, updater) }
    return n
  })
}

/** Remove a node by id (returns new tree) */
function removeNode(nodes: FsNode[], id: string): FsNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.kind === 'folder' ? { ...n, children: removeNode(n.children, id) } : n
    )
}

/** Insert a node into a folder (or root if folderId is null) */
function insertNode(nodes: FsNode[], folderId: string | null, node: FsNode): FsNode[] {
  if (folderId === null) return [...nodes, node]
  return nodes.map((n) => {
    if (n.id === folderId && n.kind === 'folder')
      return { ...n, children: [...n.children, node] }
    if (n.kind === 'folder')
      return { ...n, children: insertNode(n.children, folderId, node) }
    return n
  })
}

/** Collect all file ids under a folder (including nested) */
function collectFileIds(nodes: FsNode[]): string[] {
  const ids: string[] = []
  for (const n of nodes) {
    if (n.kind === 'file') ids.push(n.id)
    else ids.push(...collectFileIds(n.children))
  }
  return ids
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface FileStore {
  tree: FsNode[]
  activeFileId: string | null

  // ── Getters ────────────────────────────────────────────
  activeFile: () => FsFile | null

  // ── File switching ──────────────────────────────────────
  openFile: (id: string) => void

  // ── Content edit (driven by CodeMirror) ────────────────
  setFileContent: (id: string, content: string) => void

  // ── CRUD ───────────────────────────────────────────────
  createFile:   (parentFolderId: string | null, name: string) => string
  createFolder: (parentFolderId: string | null, name: string) => string
  renameNode:   (id: string, newName: string) => void
  deleteNode:   (id: string) => void

  // ── Folder collapse ─────────────────────────────────────
  toggleFolder: (id: string) => void
}

export const useFileStore = create<FileStore>((set, get) => {
  const initialActiveId = (STARTER[0] as FsFile).id

  return {
    tree: cloneTree(STARTER),
    activeFileId: initialActiveId,

    // ── Active file getter ──────────────────────────────
    activeFile: () => {
      const { tree, activeFileId } = get()
      if (!activeFileId) return null
      const node = findNode(tree, activeFileId)
      return node?.kind === 'file' ? node : null
    },

    // ── Open a file ─────────────────────────────────────
    openFile: (id) => {
      const node = findNode(get().tree, id)
      if (node?.kind === 'file') set({ activeFileId: id })
    },

    // ── Update file content ─────────────────────────────
    setFileContent: (id, content) => {
      set((s) => ({
        tree: updateNode(s.tree, id, (n) =>
          n.kind === 'file' ? { ...n, content } : n
        ),
      }))
    },

    // ── Create file ─────────────────────────────────────
    createFile: (parentFolderId, name) => {
      const id = uid()
      const node: FsFile = { kind: 'file', id, name, content: '' }
      set((s) => ({
        tree: insertNode(s.tree, parentFolderId, node),
        activeFileId: id,
      }))
      return id
    },

    // ── Create folder ────────────────────────────────────
    createFolder: (parentFolderId, name) => {
      const id = uid()
      const node: FsFolder = { kind: 'folder', id, name, collapsed: false, children: [] }
      set((s) => ({ tree: insertNode(s.tree, parentFolderId, node) }))
      return id
    },

    // ── Rename ───────────────────────────────────────────
    renameNode: (id, newName) => {
      set((s) => ({
        tree: updateNode(s.tree, id, (n) => ({ ...n, name: newName })),
      }))
    },

    // ── Delete ───────────────────────────────────────────
    deleteNode: (id) => {
      const { tree, activeFileId } = get()

      // Collect all file ids that will be removed
      const node = findNode(tree, id)
      const removedFileIds = node
        ? node.kind === 'file'
          ? [id]
          : collectFileIds([node])
        : []

      const newTree = removeNode(tree, id)

      // If active file was deleted, switch to first available file
      let newActiveId = activeFileId
      if (activeFileId && removedFileIds.includes(activeFileId)) {
        const remaining = collectFileIds(newTree)
        newActiveId = remaining[0] ?? null
      }

      set({ tree: newTree, activeFileId: newActiveId })
    },

    // ── Toggle folder collapse ───────────────────────────
    toggleFolder: (id) => {
      set((s) => ({
        tree: updateNode(s.tree, id, (n) =>
          n.kind === 'folder' ? { ...n, collapsed: !n.collapsed } : n
        ),
      }))
    },
  }
})

// ── Find parent folder id for a given node id ─────────────────────────────────
export function getParentFolderId(tree: FsNode[], targetId: string): string | null {
  function walk(nodes: FsNode[], parentId: string | null): string | null | undefined {
    for (const n of nodes) {
      if (n.id === targetId) return parentId
      if (n.kind === 'folder') {
        const result = walk(n.children, n.id)
        if (result !== undefined) return result
      }
    }
    return undefined
  }
  return walk(tree, null) ?? null
}

export { findNode, findParentList, cloneTree }
