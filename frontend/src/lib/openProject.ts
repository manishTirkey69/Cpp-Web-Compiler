import type {
  OpenProjectSelection,
  ProjectBrowserApiResponse,
  ProjectFileWriteApiResponse,
  ProjectTreeApiResponse,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

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
