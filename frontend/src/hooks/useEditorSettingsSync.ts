import { useEffect, useRef } from 'react'
import {
  buildMonacoOptions,
  defaultEditorSettings,
  fromMonacoOptions,
} from '@/lib/editorSettings'
import { useEditorStore } from '@/store/useEditorStore'
import type { EditorSettingsApiResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useEditorSettingsSync() {
  const editorSettings = useEditorStore((s) => s.editorSettings)
  const replaceDefaultEditorSettings = useEditorStore((s) => s.replaceDefaultEditorSettings)
  const replaceEditorSettings = useEditorStore((s) => s.replaceEditorSettings)

  const hasLoadedRef = useRef(false)
  const skipNextSaveRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/editor-settings`)
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`)

        const data = await res.json() as EditorSettingsApiResponse
        if (!cancelled && data.success) {
          const defaults = fromMonacoOptions(data.defaults ?? {})
          replaceDefaultEditorSettings(defaults)
          skipNextSaveRef.current = true
          replaceEditorSettings(fromMonacoOptions(data.settings ?? {}))
        }
      } catch {
        if (!cancelled) {
          replaceDefaultEditorSettings(defaultEditorSettings)
          skipNextSaveRef.current = true
          replaceEditorSettings(defaultEditorSettings)
        }
      } finally {
        if (!cancelled) hasLoadedRef.current = true
      }
    }

    loadSettings()

    return () => { cancelled = true }
  }, [replaceDefaultEditorSettings, replaceEditorSettings])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    const timeoutId = window.setTimeout(async () => {
      const { options, rawOptionsError } = buildMonacoOptions(editorSettings)
      if (rawOptionsError) return

      try {
        await fetch(`${API_BASE}/api/editor-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        })
      } catch {
        // Ignore persistence failures and keep the in-memory editor state responsive.
      }
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [editorSettings])
}
