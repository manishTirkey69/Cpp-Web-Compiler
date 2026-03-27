import { useRef, useCallback } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import type { WsMessage } from '@/types'

// In dev:  Vite proxies /ws/* → ws://localhost:3001  (see vite.config.ts)
// In prod: nginx proxies /ws/* → http://backend:3001 with Upgrade header
// Either way, we connect to the same host as the page — no env var needed.
function getWsBase(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function useTerminal() {
  const wsRef = useRef<WebSocket | null>(null)

  const {
    stdin,
    setPhase,
    appendOutput,
    setExitCode,
    setActiveTab,
  } = useEditorStore()

  // Strip ANSI escape codes for clean text output
  const stripAnsi = (str: string) =>
    str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')

  const connect = useCallback((sessionId: string) => {
    // Close any lingering socket from a previous run
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const url = `${getWsBase()}/ws/run/${sessionId}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    setPhase('running')
    appendOutput({ type: 'info', text: '▶  Running…\n' })

    ws.onopen = () => {
      // Feed pre-supplied stdin the moment the socket opens
      if (stdin.trim()) {
        ws.send(JSON.stringify({ type: 'stdin', data: stdin + '\n' }))
      }
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string)
        const text = stripAnsi(msg.data)

        switch (msg.type) {
          case 'stdout':
            appendOutput({ type: 'stdout', text })
            break

          case 'stderr':
            appendOutput({ type: 'stderr', text })
            setActiveTab('errors')
            break

          case 'exit': {
            const match = text.match(/code\s+(-?\d+)/)
            const code  = match ? parseInt(match[1], 10) : 0
            setExitCode(code)
            appendOutput({
              type: code === 0 ? 'success' : 'error',
              text: `\nProcess exited with code ${code}`,
            })
            setPhase('done')
            break
          }

          case 'error':
            appendOutput({ type: 'error', text: `Runtime error: ${text}` })
            setPhase('error')
            break
        }
      } catch {
        // Ignore malformed frames
      }
    }

    ws.onerror = () => {
      appendOutput({ type: 'error', text: 'WebSocket connection error.' })
      setPhase('error')
    }

    ws.onclose = (e) => {
      // 1000 = normal closure (server sent it after process exited)
      if (e.code !== 1000 && e.code !== 1001) {
        appendOutput({ type: 'info', text: 'Connection closed.' })
      }
      wsRef.current = null
    }
  }, [stdin, setPhase, appendOutput, setExitCode, setActiveTab])

  const kill = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }))
    }
  }, [])

  const sendStdin = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stdin', data }))
    }
  }, [])

  return { connect, kill, sendStdin }
}
