import type { SavedFileHandle } from '@/types'

type SaveFilePickerWindow = Window & typeof globalThis & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
  }) => Promise<SavedFileHandle>
}

export interface SaveFileAsResult {
  status: 'saved' | 'downloaded' | 'cancelled'
  name: string
  fileHandle: SavedFileHandle | null
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function saveFileAs(name: string, content: string) {
  const pickerWindow = window as SaveFilePickerWindow

  try {
    if (pickerWindow.showSaveFilePicker) {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: name,
        types: [
          {
            description: 'C++ source file',
            accept: {
              'text/plain': ['.cpp', '.cc', '.cxx', '.h', '.hpp', '.txt'],
            },
          },
        ],
      })

      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return {
        status: 'saved',
        name: handle.name,
        fileHandle: handle,
      } satisfies SaveFileAsResult
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        status: 'cancelled',
        name,
        fileHandle: null,
      } satisfies SaveFileAsResult
    }
  }

  downloadFile(name, content)

  return {
    status: 'downloaded',
    name,
    fileHandle: null,
  } satisfies SaveFileAsResult
}

export async function saveToFileHandle(handle: SavedFileHandle, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}
