import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

interface WSMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  projectId: number
  onMessage?: (msg: WSMessage) => void
  onNodeAdded?: (data: any) => void
  onNodeDeleted?: (data: any) => void
  onEdgeAdded?: (data: any) => void
  onEdgeDeleted?: (data: any) => void
  onUserJoined?: (data: any) => void
  onUserLeft?: (data: any) => void
}

export const useWebSocket = ({
  projectId,
  onMessage,
  onNodeAdded,
  onNodeDeleted,
  onEdgeAdded,
  onEdgeDeleted,
  onUserJoined,
  onUserLeft,
}: UseWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connections, setConnections] = useState(0)
  const [messages, setMessages] = useState<WSMessage[]>([])
  const pingRef = useRef<NodeJS.Timeout | null>(null)
  const { accessToken } = useAuthStore()

  const connect = useCallback(() => {
    if (!accessToken || !projectId) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/projects/${projectId}?token=${accessToken}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      // Ping every 30 seconds to keep alive
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        setMessages((prev) => [...prev.slice(-49), msg])

        if (msg.connections !== undefined) setConnections(msg.connections)

        switch (msg.type) {
          case 'node_added': onNodeAdded?.(msg); break
          case 'node_deleted': onNodeDeleted?.(msg); break
          case 'edge_added': onEdgeAdded?.(msg); break
          case 'edge_deleted': onEdgeDeleted?.(msg); break
          case 'user_joined': onUserJoined?.(msg); break
          case 'user_left': onUserLeft?.(msg); break
          case 'connected': setConnections(msg.connections); break
        }

        onMessage?.(msg)
      } catch { }
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (pingRef.current) clearInterval(pingRef.current)
      // Reconnect after 3 seconds
      setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [projectId, accessToken])

  useEffect(() => {
    connect()
    return () => {
      if (pingRef.current) clearInterval(pingRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { isConnected, connections, messages, sendMessage }
}
