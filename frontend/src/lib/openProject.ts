import type {
  OpenProjectSelection,
  ProjectBrowserApiResponse,
  ProjectDirectoryApiResponse,
  ProjectFileWriteApiResponse,
  ProjectFileApiResponse,
  ProjectWatchMessage,
  ProjectTreeApiResponse,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

function getWorkspaceWatcherUrl() {
  if (API_BASE) {
    return `${API_BASE.replace(/^http/, 'ws')}/ws/project-watch`
  }

  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.hostname}:3001/ws/project-watch`
  }

  return `${window.location.origin.replace(/^http/, 'ws')}/ws/project-watch`
}

export async function browseHostedDirectories(path?: string) {
  const searchParams = new URLSearchParams()
  if (path) searchParams.set('path', path)

  const res = await fetch(
    `${API_BASE}/api/project-browser${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`,
  )
  const data = await res.json() as ProjectBrowserApiResponse

  if (!res.ok || !data.success || !data.currentPath || !data.rootPath) {
    throw new Error(data.error ?? `Failed to browse directories (${res.status}).`)
  }

  return {
    rootPath: data.rootPath,
    currentPath: data.currentPath,
    parentPath: data.parentPath ?? null,
    directories: data.directories ?? [],
  }
}

export async function pickProjectTree(projectPath: string): Promise<OpenProjectSelection> {
  const searchParams = new URLSearchParams({ path: projectPath })
  const res = await fetch(`${API_BASE}/api/project-tree?${searchParams.toString()}`)
  const data = await res.json() as ProjectTreeApiResponse

  if (!res.ok || !data.success || !data.tree || !data.projectName || !data.projectPath) {
    throw new Error(data.error ?? `Failed to load project (${res.status}).`)
  }

  return {
    tree: data.tree,
    projectName: data.projectName,
    projectPath: data.projectPath,
  }
}

export async function readHostedDirectory(projectPath: string) {
  const searchParams = new URLSearchParams({ path: projectPath })
  const res = await fetch(`${API_BASE}/api/project-directory?${searchParams.toString()}`)
  const data = await res.json() as ProjectDirectoryApiResponse

  if (!res.ok || !data.success || !data.path || !data.children) {
    throw new Error(data.error ?? `Failed to load directory (${res.status}).`)
  }

  return {
    path: data.path,
    children: data.children,
  }
}

export async function readHostedFile(projectPath: string) {
  const searchParams = new URLSearchParams({ path: projectPath })
  const res = await fetch(`${API_BASE}/api/project-file?${searchParams.toString()}`)
  const data = await res.json() as ProjectFileApiResponse

  if (!res.ok || !data.success || typeof data.content !== 'string' || !data.path) {
    throw new Error(data.error ?? `Failed to load file (${res.status}).`)
  }

  return {
    path: data.path,
    content: data.content,
  }
}

export async function saveHostedProjectFile(path: string, content: string) {
  const res = await fetch(`${API_BASE}/api/project-file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })

  const data = await res.json() as ProjectFileWriteApiResponse
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `Failed to save file (${res.status}).`)
  }
}

export function connectWorkspaceWatcher(
  roots: string[],
  onRefresh: (message: ProjectWatchMessage) => void,
) {
  if (roots.length === 0) return () => undefined

  const socket = new WebSocket(getWorkspaceWatcherUrl())
  let isDisposed = false

  socket.addEventListener('open', () => {
    if (isDisposed || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type: 'subscribe', roots }))
  })

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(String(event.data)) as ProjectWatchMessage
      if (message.type === 'refresh') onRefresh(message)
    } catch {
      // ignore malformed messages
    }
  })

  socket.addEventListener('error', () => {
    // Prevent dev-time websocket proxy failures from surfacing as uncaught client errors.
  })

  return () => {
    isDisposed = true
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close()
    }
  }
}
