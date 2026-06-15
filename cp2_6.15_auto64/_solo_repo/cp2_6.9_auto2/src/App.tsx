import React, { useEffect, useRef, useState, useCallback } from 'react'
import Whiteboard, { WhiteboardHandle } from './Whiteboard'
import Toolbar from './Toolbar'
import type { Tool, Stroke, StickyNote, User, WhiteboardState } from './types'
import * as socketAPI from './socket'

const USER_COLORS = [
  '#6b8cae', '#e07a5f', '#81b29a', '#f2cc8f',
  '#9d4edd', '#ef476f', '#06d6a0', '#ffd166',
  '#118ab2', '#073b4c', '#e63946', '#2a9d8f'
]

const generateRandomName = () => {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '温暖的', '闪亮的', '友善的']
  const nouns = ['小猫', '小熊', '小鸟', '小兔', '小狗', '小鹿']
  return adjectives[Math.floor(Math.random() * adjectives.length)] + nouns[Math.floor(Math.random() * nouns.length)]
}

const App: React.FC = () => {
  const [tool, setTool] = useState<Tool>('pen')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selfId, setSelfId] = useState<string>('')
  const [connected, setConnected] = useState(false)
  const [fps, setFps] = useState(0)

  const undoStackRef = useRef<Stroke[]>([])
  const redoStackRef = useRef<Stroke[]>([])
  const whiteboardRef = useRef<WhiteboardHandle>(null)

  const userColor = React.useMemo(() => {
    const idx = users.findIndex((u) => u.id === selfId)
    if (idx >= 0) return users[idx].color
    return USER_COLORS[0]
  }, [users, selfId])

  useEffect(() => {
    let mounted = true

    socketAPI.connect('default')
      .then((data) => {
        if (!mounted) return
        setStrokes(data.state.strokes)
        setStickyNotes(data.state.stickyNotes)
        setUsers(data.users)
        setSelfId(data.selfId)
        setConnected(true)

        if (!data.users.find((u) => u.id === data.selfId)) {
          const newUser: User = {
            id: data.selfId,
            color: USER_COLORS[data.users.length % USER_COLORS.length],
            name: generateRandomName()
          }
          setUsers((prev) => [...prev, newUser])
        }
      })
      .catch((err) => {
        console.error('连接失败:', err)
      })

    return () => {
      mounted = false
      socketAPI.disconnect()
    }
  }, [])

  useEffect(() => {
    const offs = [
      socketAPI.on<Stroke>('stroke:add', (stroke) => {
        if (stroke.userId === selfId) return
        setStrokes((prev) => [...prev, stroke])
      }),
      socketAPI.on<{ userId: string; strokeId: string }>('stroke:undo', ({ userId, strokeId }) => {
        if (userId === selfId) return
        setStrokes((prev) => prev.filter((s) => s.id !== strokeId))
      }),
      socketAPI.on<{ userId: string; stroke: Stroke }>('stroke:redo', ({ userId, stroke }) => {
        if (userId === selfId) return
        setStrokes((prev) => [...prev, stroke])
      }),
      socketAPI.on<StickyNote>('sticky:add', (note) => {
        setStickyNotes((prev) => [...prev, note])
      }),
      socketAPI.on<StickyNote>('sticky:update', (note) => {
        setStickyNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)))
      }),
      socketAPI.on<string>('sticky:delete', (noteId) => {
        setStickyNotes((prev) => prev.filter((n) => n.id !== noteId))
      }),
      socketAPI.on<User>('user:join', (user) => {
        setUsers((prev) => (prev.find((u) => u.id === user.id) ? prev : [...prev, user]))
      }),
      socketAPI.on<string>('user:leave', (userId) => {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      })
    ]

    return () => offs.forEach((off) => off())
  }, [selfId])

  useEffect(() => {
    let frames = 0
    let lastTime = performance.now()
    let rafId: number

    const tick = () => {
      frames++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)))
        frames = 0
        lastTime = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const handleStrokeAdd = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke])
    undoStackRef.current.push(stroke)
    redoStackRef.current = []
    socketAPI.sendStroke(stroke)
  }, [])

  const handleUndo = useCallback(() => {
    const myStrokes = undoStackRef.current.filter((s) => s.userId === selfId)
    if (myStrokes.length === 0) return

    const last = myStrokes[myStrokes.length - 1]
    undoStackRef.current = undoStackRef.current.filter((s) => s.id !== last.id)
    redoStackRef.current.push(last)
    setStrokes((prev) => prev.filter((s) => s.id !== last.id))
    socketAPI.sendUndo(selfId, last.id)
  }, [selfId])

  const handleRedo = useCallback(() => {
    const myRedo = redoStackRef.current.filter((s) => s.userId === selfId)
    if (myRedo.length === 0) return

    const last = myRedo[myRedo.length - 1]
    redoStackRef.current = redoStackRef.current.filter((s) => s.id !== last.id)
    undoStackRef.current.push(last)
    setStrokes((prev) => [...prev, last])
    socketAPI.sendRedo(selfId, last)
  }, [selfId])

  const handleStickyAdd = useCallback((note: StickyNote) => {
    setStickyNotes((prev) => [...prev, note])
    socketAPI.sendStickyAdd(note)
  }, [])

  const handleStickyUpdate = useCallback((note: StickyNote) => {
    setStickyNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)))
    socketAPI.sendStickyUpdate(note)
  }, [])

  const handleExport = useCallback(() => {
    whiteboardRef.current?.exportPNG()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleUndo, handleRedo])

  const canUndo = undoStackRef.current.some((s) => s.userId === selfId)
  const canRedo = redoStackRef.current.some((s) => s.userId === selfId)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#f0f3f7',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        overflow: 'hidden'
      }}
    >
      <Toolbar
        currentTool={tool}
        onToolChange={setTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
        userColor={userColor}
      />

      <Whiteboard
        ref={whiteboardRef}
        tool={tool}
        userId={selfId}
        userColor={userColor}
        strokes={strokes}
        stickyNotes={stickyNotes}
        onStrokeAdd={handleStrokeAdd}
        onStickyAdd={handleStickyAdd}
        onStickyUpdate={handleStickyUpdate}
        onStrokeUndo={() => {}}
        onStrokeRedo={() => {}}
        users={users}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
            padding: '8px 14px',
            borderRadius: 10,
            boxShadow: '0 2px 12px rgba(107,140,174,0.1)',
            border: '1px solid rgba(226,232,240,0.8)',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', gap: -6 }}>
            {users.slice(0, 6).map((u) => (
              <div
                key={u.id}
                title={u.name}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: u.color,
                  border: '2px solid #ffffff',
                  marginLeft: u.id === users[0].id ? 0 : -8,
                  boxShadow: `0 0 0 1px ${u.color}40`
                }}
              />
            ))}
          </div>
          <span style={{ color: '#475569', fontSize: 13, marginLeft: 8 }}>
            {users.length} 人在线
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              marginLeft: 4,
              animation: connected ? 'pulse 2s infinite' : 'none'
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
            padding: '8px 14px',
            borderRadius: 10,
            boxShadow: '0 2px 12px rgba(107,140,174,0.1)',
            border: '1px solid rgba(226,232,240,0.8)',
            pointerEvents: 'auto',
            fontSize: 12,
            color: '#64748b'
          }}
        >
          <span>{fps} FPS</span>
          <span>•</span>
          <span>{strokes.length} 笔画</span>
          <span>•</span>
          <span>{stickyNotes.length} 便签</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

export default App
