import { useState, useEffect, useCallback, useRef } from 'react'
import BulletWall from './components/BulletWall'
import SendBar from './components/SendBar'

export interface Bullet {
  id: string
  text: string
  color: string
  y: number
  speed: number
  fontSize: number
  likes: number
  reported: boolean
  createdAt: number
}

export const COLOR_PRESETS: string[] = [
  'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  'linear-gradient(135deg, #feca57, #ff9f43)',
  'linear-gradient(135deg, #ff9ff3, #f368e0)',
  'linear-gradient(135deg, #54a0ff, #2e86de)',
  'linear-gradient(135deg, #5f27cd, #341f97)',
  'linear-gradient(135deg, #00d2d3, #01a3a4)',
  'linear-gradient(135deg, #1dd1a1, #10ac84)',
  'linear-gradient(135deg, #ee5a6f, #ff6b6b)',
  'linear-gradient(135deg, #a29bfe, #6c5ce7)',
  'linear-gradient(135deg, #fd79a8, #e84393)',
  'linear-gradient(135deg, #00cec9, #00b894)',
  'linear-gradient(135deg, #fdcb6e, #e17055)'
]

export const THEMES = [
  { id: 'auto', name: '自动切换', colors: null },
  { id: 'deep-blue', name: '深蓝', colors: ['#0a0a1a', '#0d1b3d', '#1a1a3a'] },
  { id: 'dark-purple', name: '暗紫', colors: ['#1a0a1a', '#2d1b3d', '#2a1a3a'] },
  { id: 'ink-green', name: '墨绿', colors: ['#0a1a1a', '#1b3d2d', '#1a3a2a'] }
]

function App() {
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [selectedTheme, setSelectedTheme] = useState('auto')
  const [showSettings, setShowSettings] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)

  const connectWS = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[WS] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleWSMessage(msg)
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting...')
      reconnectTimer.current = window.setTimeout(connectWS, 3000)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      ws.close()
    }

    wsRef.current = ws
  }, [])

  const handleWSMessage = useCallback((msg: { type: string; data: any }) => {
    switch (msg.type) {
      case 'history':
        setBullets(msg.data || [])
        break
      case 'new_bullet':
        setBullets((prev) => {
          if (prev.some((b) => b.id === msg.data.id)) return prev
          return [...prev, msg.data]
        })
        break
      case 'like':
        setBullets((prev) =>
          prev.map((b) =>
            b.id === msg.data.bulletId
              ? { ...b, likes: msg.data.likes }
              : b
          )
        )
        break
      case 'report':
        setBullets((prev) =>
          prev.map((b) =>
            b.id === msg.data.bulletId
              ? { ...b, reported: msg.data.reported }
              : b
          )
        )
        break
    }
  }, [])

  useEffect(() => {
    connectWS()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
    }
  }, [connectWS])

  const sendBullet = useCallback(
    (text: string, colorIndex: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      if (!text.trim()) return

      const isMobile = window.innerWidth < 480
      const minSize = isMobile ? 14 : 18
      const maxSize = isMobile ? 18 : 24
      const fontSize = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize
      const speed = Math.floor(Math.random() * 101) + 100

      const payload = {
        type: 'new_bullet',
        data: {
          text: text.trim(),
          color: COLOR_PRESETS[colorIndex] || COLOR_PRESETS[0],
          y: 0,
          speed,
          fontSize
        }
      }

      wsRef.current.send(JSON.stringify(payload))
    },
    []
  )

  const handleLike = useCallback((bulletId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(
      JSON.stringify({
        type: 'like',
        data: { bulletId }
      })
    )
  }, [])

  const handleReport = useCallback((bulletId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(
      JSON.stringify({
        type: 'report',
        data: { bulletId }
      })
    )
  }, [])

  return (
    <div className="app-container">
      <BulletWall
        bullets={bullets}
        selectedTheme={selectedTheme}
        onLike={handleLike}
        onReport={handleReport}
      />

      <button
        className="settings-btn"
        onClick={() => setShowSettings((s) => !s)}
        title="设置"
      >
        ⚙
      </button>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-title">主题背景</div>
          <div className="theme-options">
            {THEMES.map((t) => (
              <div
                key={t.id}
                className={`theme-option ${
                  selectedTheme === t.id ? 'selected' : ''
                }`}
                onClick={() => {
                  setSelectedTheme(t.id)
                  setShowSettings(false)
                }}
              >
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="send-bar-wrapper">
        <SendBar onSend={sendBullet} colorPresets={COLOR_PRESETS} />
      </div>
    </div>
  )
}

export default App
