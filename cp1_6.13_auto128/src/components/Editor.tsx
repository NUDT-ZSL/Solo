import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useAppContext } from '../App'
import type { Paragraph, Connection } from '../types'
import { paragraphAPI } from '../api'

const CARD_WIDTH = 200
const CARD_HEIGHT = 120
const RHYTHM_OPTIONS = ['4/4', '3/4', '2/4', '6/8', '5/4']
const PARAGRAPH_NAMES = ['主歌A', '主歌B', '副歌', '桥段', '前奏', '间奏', '尾奏', '导入']

interface DragState {
  type: 'card' | 'connection' | null
  paragraphId?: string
  startX?: number
  startY?: number
  offsetX?: number
  offsetY?: number
  connectionStartId?: string
  mouseX?: number
  mouseY?: number
}

interface ExportOverlay {
  show: boolean
}

export default function Editor() {
  const { state, dispatch, exportScore } = useAppContext()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [localParagraphs, setLocalParagraphs] = useState<Paragraph[]>([])
  const [dirty, setDirty] = useState(false)
  const dragState = useRef<DragState>({ type: null })
  const [, forceUpdate] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<ExportOverlay>({ show: false })

  useEffect(() => {
    if (state.paragraphs.length > 0) {
      setLocalParagraphs(state.paragraphs)
    } else {
      setLocalParagraphs([])
    }
  }, [state.paragraphs])

  const saveToServer = useCallback(async () => {
    if (!id || !dirty || localParagraphs.length === 0) return
    try {
      await paragraphAPI.save(id, localParagraphs)
      setDirty(false)
    } catch (err) {
      console.error('自动同步失败:', err)
    }
  }, [id, dirty, localParagraphs])

  useEffect(() => {
    const interval = setInterval(() => {
      saveToServer()
    }, 5000)
    return () => clearInterval(interval)
  }, [saveToServer])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirty) {
        saveToServer()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty, saveToServer])

  const markDirty = () => setDirty(true)

  const addParagraph = () => {
    const newP: Paragraph = {
      _id: 'p_' + uuidv4().slice(0, 8),
      projectId: id!,
      name: PARAGRAPH_NAMES[localParagraphs.length % PARAGRAPH_NAMES.length],
      rhythm: '4/4',
      notes: '',
      order: localParagraphs.length,
      position: {
        x: 80 + (localParagraphs.length % 4) * 240,
        y: 60 + Math.floor(localParagraphs.length / 4) * 180,
      },
      connections: [],
    }
    setLocalParagraphs(prev => [...prev, newP])
    markDirty()
  }

  const updateParagraph = (pid: string, updates: Partial<Paragraph>) => {
    setLocalParagraphs(prev =>
      prev.map(p => (p._id === pid ? { ...p, ...updates } : p))
    )
    markDirty()
  }

  const removeParagraph = (pid: string) => {
    setLocalParagraphs(prev => {
      const remaining = prev.filter(p => p._id !== pid)
      return remaining.map(p => ({
        ...p,
        connections: (p.connections || []).filter(c => c.targetId !== pid),
      }))
    })
    markDirty()
    if (selectedId === pid) setSelectedId(null)
  }

  const addConnection = (fromId: string, toId: string) => {
    if (fromId === toId) return
    setLocalParagraphs(prev =>
      prev.map(p => {
        if (p._id !== fromId) return p
        const exists = (p.connections || []).some(c => c.targetId === toId)
        if (exists) return p
        return {
          ...p,
          connections: [...(p.connections || []), { targetId: toId }],
        }
      })
    )
    markDirty()
  }

  const removeConnection = (fromId: string, toId: string) => {
    setLocalParagraphs(prev =>
      prev.map(p => {
        if (p._id !== fromId) return p
        return {
          ...p,
          connections: (p.connections || []).filter(c => c.targetId !== toId),
        }
      })
    )
    markDirty()
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.paragraph-card')) return
    if ((e.target as HTMLElement).closest('.connection-line')) return
    if ((e.target as HTMLElement).closest('.connector-dot')) return
    setSelectedId(null)
    setEditId(null)
  }

  const handleCardMouseDown = (e: React.MouseEvent, pid: string) => {
    if ((e.target as HTMLElement).closest('.connector-dot')) return
    if ((e.target as HTMLElement).closest('.card-edit-btn')) return
    if ((e.target as HTMLElement).closest('.card-delete-btn')) return
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('select')) return

    e.stopPropagation()
    const card = localParagraphs.find(p => p._id === pid)
    if (!card) return

    dragState.current = {
      type: 'card',
      paragraphId: pid,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - card.position.x,
      offsetY: e.clientY - card.position.y,
    }
    setSelectedId(pid)
  }

  const handleConnectorMouseDown = (e: React.MouseEvent, pid: string) => {
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    dragState.current = {
      type: 'connection',
      connectionStartId: pid,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
    }
    forceUpdate(n => n + 1)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const drag = dragState.current
      if (drag.type === 'card' && drag.paragraphId) {
        const newX = Math.max(0, e.clientX - (drag.offsetX || 0) - rect.left)
        const newY = Math.max(0, e.clientY - (drag.offsetY || 0) - rect.top)
        setLocalParagraphs(prev =>
          prev.map(p =>
            p._id === drag.paragraphId
              ? { ...p, position: { x: newX, y: newY } }
              : p
          )
        )
        markDirty()
      } else if (drag.type === 'connection') {
        dragState.current = {
          ...drag,
          mouseX: e.clientX - rect.left,
          mouseY: e.clientY - rect.top,
        }
        forceUpdate(n => n + 1)
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      const drag = dragState.current
      if (drag.type === 'connection' && drag.connectionStartId) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const mx = e.clientX - rect.left
          const my = e.clientY - rect.top
          for (const p of localParagraphs) {
            if (
              mx >= p.position.x &&
              mx <= p.position.x + CARD_WIDTH &&
              my >= p.position.y &&
              my <= p.position.y + CARD_HEIGHT &&
              p._id !== drag.connectionStartId
            ) {
              addConnection(drag.connectionStartId, p._id)
              break
            }
          }
        }
      }
      dragState.current = { type: null }
      forceUpdate(n => n + 1)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [localParagraphs])

  const getCardCenter = (p: Paragraph) => ({
    x: p.position.x + CARD_WIDTH / 2,
    y: p.position.y + CARD_HEIGHT / 2,
  })

  const getCardRight = (p: Paragraph) => ({
    x: p.position.x + CARD_WIDTH,
    y: p.position.y + CARD_HEIGHT / 2,
  })

  const getCardLeft = (p: Paragraph) => ({
    x: p.position.x,
    y: p.position.y + CARD_HEIGHT / 2,
  })

  const renderConnections = () => {
    const lines: JSX.Element[] = []
    const drag = dragState.current

    localParagraphs.forEach(p => {
      ;(p.connections || []).forEach(conn => {
        const target = localParagraphs.find(t => t._id === conn.targetId)
        if (!target) return
        const start = getCardRight(p)
        const end = getCardLeft(target)
        const dx = end.x - start.x
        const cpOffset = Math.max(40, dx * 0.4)
        const d = `M ${start.x} ${start.y} C ${start.x + cpOffset} ${start.y}, ${end.x - cpOffset} ${end.y}, ${end.x} ${end.y}`

        lines.push(
          <g key={`conn-${p._id}-${conn.targetId}`}>
            <path
              className="connection-line"
              d={d}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('删除此连线？')) {
                  removeConnection(p._id, conn.targetId)
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            <circle cx={start.x} cy={start.y} r="4" fill="#3b82f6" />
            <circle cx={end.x} cy={end.y} r="4" fill="#3b82f6" />
          </g>
        )
      })

      if (drag.type === 'connection' && drag.connectionStartId === p._id && drag.mouseX != null) {
        const start = getCardRight(p)
        const dx = drag.mouseX - start.x
        const cpOffset = Math.max(40, dx * 0.4)
        const d = `M ${start.x} ${start.y} C ${start.x + cpOffset} ${start.y}, ${drag.mouseX - cpOffset} ${drag.mouseY}, ${drag.mouseX} ${drag.mouseY}`
        lines.push(
          <g key="temp-conn">
            <path
              d={d}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="6 4"
              fill="none"
              opacity="0.7"
            />
            <circle cx={start.x} cy={start.y} r="5" fill="#60a5fa" />
          </g>
        )
      }
    })

    return lines
  }

  const handleExport = async () => {
    if (!id || !state.currentProject) return
    setOverlay({ show: true })
    try {
      await saveToServer()
      await new Promise(r => setTimeout(r, 800))
      await exportScore(id, state.currentProject.name)
    } catch (err) {
      console.error('导出失败:', err)
    } finally {
      setOverlay({ show: false })
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-back-btn" onClick={() => navigate(`/project/${id}`)}>
            ← 返回概览
          </button>
          <h2 className="toolbar-title">乐谱编辑器</h2>
        </div>
        <div className="toolbar-right">
          <span className={`sync-status ${dirty ? 'dirty' : 'synced'}`}>
            {dirty ? '● 未同步' : '✓ 已同步'}
          </span>
          <button className="toolbar-btn" onClick={addParagraph}>
            + 添加段落
          </button>
          <button className="toolbar-btn primary" onClick={handleExport}>
            📤 导出乐谱
          </button>
        </div>
      </div>

      <div
        className="editor-canvas-wrapper"
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
      >
        <svg className="editor-svg-layer" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <defs>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>

        <svg className="editor-svg-connections" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <g style={{ pointerEvents: 'auto' }}>
            {renderConnections()}
          </g>
        </svg>

        <div className="editor-canvas-content">
          {localParagraphs.map(p => (
            <div
              key={p._id}
              className={`paragraph-card ${selectedId === p._id ? 'selected' : ''}`}
              style={{
                left: p.position.x,
                top: p.position.y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                zIndex: selectedId === p._id ? 10 : 1,
              }}
              onMouseDown={(e) => handleCardMouseDown(e, p._id)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(p._id) }}
            >
              <div
                className="connector-dot connector-right"
                onMouseDown={(e) => handleConnectorMouseDown(e, p._id)}
                title="拖拽创建连线"
              />

              {editId === p._id ? (
                <div className="card-edit-form" onClick={e => e.stopPropagation()}>
                  <input
                    className="card-edit-input"
                    value={p.name}
                    onChange={e => updateParagraph(p._id, { name: e.target.value })}
                    placeholder="段落名"
                  />
                  <select
                    className="card-edit-select"
                    value={p.rhythm}
                    onChange={e => updateParagraph(p._id, { rhythm: e.target.value })}
                  >
                    {RHYTHM_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}拍</option>
                    ))}
                  </select>
                  <textarea
                    className="card-edit-textarea"
                    value={p.notes}
                    onChange={e => updateParagraph(p._id, { notes: e.target.value.slice(0, 40) })}
                    placeholder="备注（40字以内）"
                    maxLength={40}
                  />
                  <div className="card-edit-actions">
                    <button className="card-edit-save" onClick={() => setEditId(null)}>
                      完成
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-header">
                    <span className="card-name">{p.name}</span>
                    <div className="card-actions">
                      <button
                        className="card-edit-btn"
                        onClick={(e) => { e.stopPropagation(); setEditId(p._id) }}
                        title="编辑"
                      >
                        ✎
                      </button>
                      <button
                        className="card-delete-btn"
                        onClick={(e) => { e.stopPropagation(); removeParagraph(p._id) }}
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="card-rhythm">🎼 {p.rhythm}拍</div>
                  <div className="card-notes" title={p.notes}>
                    {p.notes || <span style={{ opacity: 0.4 }}>点击✎添加备注</span>}
                  </div>
                </>
              )}
            </div>
          ))}

          {localParagraphs.length === 0 && (
            <div className="editor-empty">
              <div className="editor-empty-icon">🎼</div>
              <h3>开始你的编曲</h3>
              <p>点击上方「+ 添加段落」按钮创建第一个音乐段落</p>
              <p className="editor-empty-hint">提示：拖拽段落卡片右侧的蓝点可以创建演奏顺序连线</p>
            </div>
          )}
        </div>
      </div>

      {overlay.show && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">正在生成乐谱...</div>
        </div>
      )}
    </div>
  )
}
