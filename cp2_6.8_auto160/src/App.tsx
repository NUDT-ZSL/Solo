import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useSpring, animated } from 'react-spring'
import Bubble, { MessageData } from './components/Bubble'
import FilterBar, { FilterType } from './components/FilterBar'

interface Ripple {
  id: number
  x: number
  y: number
}

const emotionColors: Record<string, string> = {
  happy: '#FDE047',
  sad: '#60A5FA',
  angry: '#F87171',
  neutral: '#D1D5DB',
}

const emotionLabels: Record<string, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  neutral: '平静',
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [inputValue, setInputValue] = useState('')
  const [authorValue, setAuthorValue] = useState('')
  const [sending, setSending] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedMessage, setSelectedMessage] = useState<MessageData | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const canvasRef = useRef<HTMLDivElement>(null)
  const rippleIdRef = useRef(0)
  const messagesRef = useRef<MessageData[]>([])

  messagesRef.current = messages

  const generatePosition = useCallback((exclude?: Record<string, { x: number; y: number }>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 100, y: 100 }

    const padding = 100
    const maxX = canvas.clientWidth - padding * 2
    const maxY = canvas.clientHeight - padding * 2

    let x = 0
    let y = 0
    let attempts = 0
    const existing = Object.values(exclude || positions)

    while (attempts < 50) {
      x = padding + Math.random() * maxX
      y = padding + Math.random() * maxY

      let tooClose = false
      for (const pos of existing) {
        const dx = pos.x - x
        const dy = pos.y - y
        if (Math.sqrt(dx * dx + dy * dy) < 120) {
          tooClose = true
          break
        }
      }
      if (!tooClose) break
      attempts++
    }

    return { x, y }
  }, [positions])

  const applyAttraction = useCallback((msgs: MessageData[], pos: Record<string, { x: number; y: number }>) => {
    const result = { ...pos }
    const canvas = canvasRef.current
    if (!canvas) return result

    const maxX = canvas.clientWidth - 80
    const maxY = canvas.clientHeight - 80

    for (let i = 0; i < msgs.length; i++) {
      for (let j = i + 1; j < msgs.length; j++) {
        const a = msgs[i]
        const b = msgs[j]
        if (!result[a.id] || !result[b.id]) continue
        if (a.emotion !== b.emotion) continue

        const dx = result[b.id].x - result[a.id].x
        const dy = result[b.id].y - result[a.id].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 140 && dist < 300) {
          const force = 0.3
          const nx = dx / dist
          const ny = dy / dist
          result[a.id] = {
            x: Math.max(60, Math.min(maxX, result[a.id].x + nx * force)),
            y: Math.max(60, Math.min(maxY, result[a.id].y + ny * force)),
          }
          result[b.id] = {
            x: Math.max(60, Math.min(maxX, result[b.id].x - nx * force)),
            y: Math.max(60, Math.min(maxY, result[b.id].y - ny * force)),
          }
        }
      }
    }
    return result
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get<MessageData[]>('/api/messages')
      const newMessages = res.data
      const currentIds = new Set(messagesRef.current.map((m) => m.id))
      const incomingIds = new Set(newMessages.map((m) => m.id))

      const added = newMessages.filter((m) => !currentIds.has(m.id))

      if (added.length > 0 || newMessages.length !== messagesRef.current.length) {
        setMessages(newMessages)

        setPositions((prev) => {
          const next = { ...prev }
          let hasNew = false
          for (const msg of newMessages) {
            if (!next[msg.id]) {
              next[msg.id] = generatePosition(next)
              hasNew = true
            }
          }
          for (const id of Object.keys(next)) {
            if (!incomingIds.has(id)) {
              delete next[id]
            }
          }
          return hasNew ? applyAttraction(newMessages, next) : next
        })

        if (added.length > 0) {
          setNewIds((prev) => {
            const next = new Set(prev)
            added.forEach((m) => next.add(m.id))
            return next
          })
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev)
              added.forEach((m) => next.delete(m.id))
              return next
            })
          }, 500)
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }, [generatePosition, applyAttraction])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const triggerRipple = (x: number, y: number) => {
    const id = rippleIdRef.current++
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 800)
  }

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || sending) return

    setSending(true)
    try {
      triggerRipple(80, 80)

      const res = await axios.post<MessageData>('/api/messages', {
        content,
        author: authorValue.trim() || '匿名',
      })

      setInputValue('')
      await fetchMessages()
    } catch (err) {
      console.error('Failed to send:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredMessages = messages.filter((m) => {
    if (activeFilter === 'all') return true
    return m.emotion === activeFilter
  })

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts)
      return d.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  return (
    <div className="app">
      <div className="input-area">
        <input
          className="author-input"
          type="text"
          placeholder="署名（可选，默认匿名）"
          value={authorValue}
          onChange={(e) => setAuthorValue(e.target.value)}
          maxLength={50}
        />
        <div className="input-area-row">
          <textarea
            className="message-input"
            placeholder="写下你的心情..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={500}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
          >
            发送
          </button>
        </div>
      </div>

      <div className="canvas" ref={canvasRef}>
        {ripples.map((r) => (
          <RippleEffect key={r.id} x={r.x} y={r.y} />
        ))}

        {filteredMessages.map((msg, idx) => {
          const pos = positions[msg.id]
          if (!pos) return null
          return (
            <Bubble
              key={msg.id}
              message={msg}
              x={pos.x}
              y={pos.y}
              onClick={setSelectedMessage}
              isNew={newIds.has(msg.id)}
              index={activeFilter === 'all' ? idx : idx}
            />
          )
        })}
      </div>

      <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {selectedMessage && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedMessage(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-author">
                <span
                  className="modal-emotion-dot"
                  style={{ backgroundColor: emotionColors[selectedMessage.emotion] }}
                />
                {selectedMessage.author}
                <span style={{ marginLeft: 8, color: '#9CA3AF', fontSize: 12, fontWeight: 400 }}>
                  · {emotionLabels[selectedMessage.emotion]}
                </span>
              </div>
              <div className="modal-time">{formatTime(selectedMessage.timestamp)}</div>
            </div>
            <div className="modal-content">{selectedMessage.content}</div>
          </div>
        </div>
      )}
    </div>
  )
}

const RippleEffect: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const props = useSpring({
    from: { scale: 0, opacity: 1 },
    to: { scale: 4, opacity: 0 },
    config: { duration: 700 },
  })
  return (
    <animated.div
      className="ripple"
      style={{
        left: x,
        top: y,
        width: 60,
        height: 60,
        transform: props.scale.to((s) => `translate(-50%, -50%) scale(${s})`),
        opacity: props.opacity,
      }}
    />
  )
}

export default App
