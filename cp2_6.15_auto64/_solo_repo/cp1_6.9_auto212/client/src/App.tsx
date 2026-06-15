import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Canvas from './Canvas'
import { Circuit, Component, Wire, Comment, VersionSnapshot, COMPONENT_DEFINITIONS, ComponentDefinition } from './types'

export default function App() {
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [currentCircuit, setCurrentCircuit] = useState<Circuit | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [username, setUsername] = useState('创客' + Math.floor(Math.random() * 1000))
  const [isLoading, setIsLoading] = useState(false)
  const [restoreAnimating, setRestoreAnimating] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const showNotify = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 2500)
  }, [])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchCircuits()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shareToken = params.get('share')
    if (shareToken) {
      fetchSharedCircuit(shareToken)
    }
  }, [])

  const fetchCircuits = async () => {
    try {
      const res = await fetch('/api/circuits')
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        setCircuits(data.data)
        fetchCircuitDetail(data.data[0].id)
      } else if (data.data.length === 0) {
        createNewCircuit()
      }
    } catch (e) {
      console.error('获取电路列表失败', e)
    }
  }

  const fetchSharedCircuit = async (token: string) => {
    try {
      const res = await fetch(`/api/share/${token}`)
      const data = await res.json()
      if (data.success) {
        setCurrentCircuit(data.data)
        setIsReadOnly(true)
        showNotify('已进入只读分享模式')
      }
    } catch (e) {
      showNotify('分享链接无效')
    }
  }

  const fetchCircuitDetail = async (id: string) => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/circuits/${id}`)
      const data = await res.json()
      if (data.success) {
        setCurrentCircuit(data.data)
        fetchVersions(id)
        setupSSE(id)
      }
    } catch (e) {
      console.error('获取电路详情失败', e)
    } finally {
      setIsLoading(false)
    }
  }

  const setupSSE = (circuitId: string) => {
    const es = new EventSource(`/api/circuits/${circuitId}/events`)
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'comment') {
          setCurrentCircuit(prev => {
            if (!prev) return prev
            const exists = prev.comments.find(c => c.id === msg.data.id)
            if (exists) return prev
            return { ...prev, comments: [...prev.comments, msg.data] }
          })
        }
      } catch (e) {}
    }
    return () => es.close()
  }

  const fetchVersions = async (circuitId: string) => {
    try {
      const res = await fetch(`/api/circuits/${circuitId}/versions`)
      const data = await res.json()
      if (data.success) setVersions(data.data)
    } catch (e) {
      console.error('获取版本历史失败', e)
    }
  }

  const createNewCircuit = async () => {
    const name = `新电路 ${new Date().toLocaleDateString()}`
    try {
      const res = await fetch('/api/circuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (data.success) {
        setCircuits(prev => [...prev, data.data])
        setCurrentCircuit(data.data)
        setVersions([])
        showNotify('已创建新电路')
      }
    } catch (e) {
      console.error('创建电路失败', e)
    }
  }

  const updateCircuitData = async (updates: Partial<Circuit>) => {
    if (!currentCircuit || isReadOnly) return
    const updated = { ...currentCircuit, ...updates }
    setCurrentCircuit(updated)
    try {
      await fetch(`/api/circuits/${currentCircuit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
    } catch (e) {
      console.error('同步失败', e)
    }
  }

  const handleComponentCreate = (type: ComponentDefinition['type'], x: number, y: number) => {
    if (!currentCircuit || isReadOnly) return
    const def = COMPONENT_DEFINITIONS.find(d => d.type === type)!
    const newComp: Component = {
      id: uuidv4(),
      type,
      x, y,
      rotation: 0,
      properties: { ...def.defaultProps },
      pins: def.pins.map(p => ({ ...p, id: uuidv4() }))
    }
    updateCircuitData({ components: [...currentCircuit.components, newComp] })
    setSelectedComponentId(newComp.id)
  }

  const handleComponentsUpdate = (components: Component[]) => {
    updateCircuitData({ components })
  }

  const handleWiresUpdate = (wires: Wire[]) => {
    updateCircuitData({ wires })
  }

  const handleComponentPropertyChange = (key: string, value: string) => {
    if (!currentCircuit || !selectedComponentId) return
    const components = currentCircuit.components.map(c =>
      c.id === selectedComponentId
        ? { ...c, properties: { ...c.properties, [key]: value } }
        : c
    )
    updateCircuitData({ components })
  }

  const handleDeleteComponent = () => {
    if (!currentCircuit || !selectedComponentId || isReadOnly) return
    const wires = currentCircuit.wires.filter(w =>
      w.fromComponentId !== selectedComponentId && w.toComponentId !== selectedComponentId
    )
    const components = currentCircuit.components.filter(c => c.id !== selectedComponentId)
    updateCircuitData({ components, wires })
    setSelectedComponentId(null)
  }

  const handleSaveVersion = async () => {
    if (!currentCircuit) return
    const name = `快照 ${new Date().toLocaleString()}`
    try {
      const res = await fetch(`/api/circuits/${currentCircuit.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (data.success) {
        setVersions(prev => [...prev, data.data])
        showNotify('版本快照已保存')
      }
    } catch (e) {
      showNotify('保存版本失败')
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!currentCircuit || isReadOnly) return
    try {
      setRestoreAnimating(true)
      const res = await fetch(`/api/circuits/${currentCircuit.id}/versions/${versionId}/restore`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        setTimeout(() => {
          setCurrentCircuit(data.data)
          setRestoreAnimating(false)
          showNotify('已恢复到指定版本')
        }, 500)
      }
    } catch (e) {
      setRestoreAnimating(false)
      showNotify('恢复版本失败')
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCircuit || !newComment.trim()) return
    try {
      await fetch(`/api/circuits/${currentCircuit.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: newComment.trim() })
      })
      setNewComment('')
    } catch (e) {
      showNotify('评论发送失败')
    }
  }

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentCircuit?.comments])

  const handleExportSVG = () => {
    if (!currentCircuit) return
    const svg = generateSVG(currentCircuit)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentCircuit.name}.svg`
    a.click()
    URL.revokeObjectURL(url)
    showNotify('SVG 已导出')
  }

  const handleShare = async () => {
    if (!currentCircuit) return
    try {
      const res = await fetch(`/api/circuits/${currentCircuit.id}/share`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${data.data.token}`
        navigator.clipboard.writeText(shareUrl).then(() => {
          showNotify('分享链接已复制到剪贴板')
        }).catch(() => {
          prompt('复制此链接分享：', shareUrl)
        })
      }
    } catch (e) {
      showNotify('生成分享链接失败')
    }
  }

  const selectedComponent = currentCircuit?.components.find(c => c.id === selectedComponentId)
  const isMobile = windowWidth < 1024

  return (
    <div className="app-container" style={{
      width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#e0e0e0', overflow: 'hidden'
    }}>
      <style>{styles}</style>

      <header className="top-nav" style={{
        height: 60, background: 'rgba(16,16,32,0.7)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,212,255,0.2)',
        display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 100,
        position: 'sticky', top: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(90deg, #00d4ff, #ff8a4c)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>芯桥</h1>
          {currentCircuit && !isReadOnly && (
            <select
              value={currentCircuit.id}
              onChange={e => fetchCircuitDetail(e.target.value)}
              style={{
                marginLeft: 20, background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)', color: '#e0e0e0',
                padding: '6px 12px', borderRadius: 6, outline: 'none', cursor: 'pointer'
              }}
            >
              {circuits.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="用户名"
            style={{
              width: 100, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0',
              padding: '6px 10px', borderRadius: 6, outline: 'none', fontSize: 13
            }}
          />
          {!isReadOnly && (
            <>
              <button className="nav-btn" onClick={createNewCircuit}>➕ 新建</button>
              <button className="nav-btn" onClick={handleSaveVersion}>💾 保存版本</button>
              <button className="nav-btn" onClick={() => setShowVersionPanel(!showVersionPanel)}>
                📜 历史({versions.length})
              </button>
            </>
          )}
          <button className="nav-btn" onClick={handleExportSVG}>📤 导出SVG</button>
          {!isReadOnly && <button className="nav-btn" onClick={handleShare}>🔗 分享</button>}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!isMobile && (
          <aside className={`left-panel ${leftPanelCollapsed ? 'collapsed' : ''}`} style={{
            width: leftPanelCollapsed ? 0 : 220, overflow: 'hidden',
            transition: 'width 300ms ease-out',
            background: 'rgba(22,33,62,0.6)', borderRight: '1px solid rgba(0,212,255,0.15)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: 14, color: '#00d4ff', marginBottom: 4, letterSpacing: 1 }}>元件库</h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>拖拽元件到画布</p>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
              {COMPONENT_DEFINITIONS.map(def => (
                <ComponentPaletteItem
                  key={def.type}
                  def={def}
                  disabled={isReadOnly}
                  onDragStart={() => {}}
                />
              ))}
            </div>
            {!isReadOnly && (
              <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={() => setLeftPanelCollapsed(true)}
                  style={{
                    width: '100%', padding: '8px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                    borderRadius: 6, cursor: 'pointer', fontSize: 12
                  }}
                >◀ 收起面板</button>
              </div>
            )}
          </aside>
        )}

        {isMobile && (
          <div style={{
            position: 'sticky', top: 60, zIndex: 90,
            display: 'flex', gap: 8, padding: 10,
            background: 'rgba(22,33,62,0.8)', backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(0,212,255,0.15)',
            overflowX: 'auto'
          }}>
            {COMPONENT_DEFINITIONS.map(def => (
              <div key={def.type} draggable={!isReadOnly}
                onDragStart={e => {
                  e.dataTransfer.setData('componentType', def.type)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                style={{
                  flexShrink: 0, width: 56, height: 56,
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: 10, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', cursor: 'grab',
                  userSelect: 'none'
                }}>
                <span style={{ fontSize: 22 }}>{getComponentIcon(def.type)}</span>
                <span style={{ fontSize: 9, marginTop: 2 }}>{def.name}</span>
              </div>
            ))}
            <button onClick={() => setShowMobileDrawer(true)}
              style={{
                flexShrink: 0, width: 56, height: 56,
                background: 'rgba(255,138,76,0.15)',
                border: '1px solid rgba(255,138,76,0.3)',
                borderRadius: 10, cursor: 'pointer', color: '#ff8a4c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24
              }}>☰</button>
          </div>
        )}

        {leftPanelCollapsed && !isMobile && !isReadOnly && (
          <button
            onClick={() => setLeftPanelCollapsed(false)}
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 80, background: 'rgba(0,212,255,0.15)',
              border: '1px solid rgba(0,212,255,0.3)', borderLeft: 'none',
              borderRadius: '0 8px 8px 0', cursor: 'pointer', zIndex: 50,
              color: '#00d4ff', fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >▶</button>
        )}

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ color: '#00d4ff', fontSize: 16 }}>加载中...</div>
            </div>
          ) : currentCircuit ? (
            <Canvas
              components={currentCircuit.components}
              wires={currentCircuit.wires}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              onComponentsUpdate={handleComponentsUpdate}
              onWiresUpdate={handleWiresUpdate}
              onDropComponent={handleComponentCreate}
              restoreAnimating={restoreAnimating}
              readOnly={isReadOnly}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 64 }}>🔌</div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>选择或创建一个电路开始设计</div>
              <button onClick={createNewCircuit} className="nav-btn" style={{ fontSize: 16, padding: '12px 28px' }}>
                ➕ 创建新电路
              </button>
            </div>
          )}
        </main>

        {!isMobile && (
          <aside className="right-panel" style={{
            width: showComments ? 320 : 0, overflow: 'hidden',
            transition: 'width 300ms ease-out',
            background: 'rgba(22,33,62,0.6)',
            borderLeft: showComments ? '1px solid rgba(0,212,255,0.15)' : 'none',
            display: 'flex', flexDirection: 'column'
          }}>
            {showComments && (
              <>
                {selectedComponent && !isReadOnly ? (
                  <PropertyPanel
                    component={selectedComponent}
                    onPropertyChange={handleComponentPropertyChange}
                    onDelete={handleDeleteComponent}
                    onClose={() => setSelectedComponentId(null)}
                  />
                ) : null}

                {showVersionPanel && (
                  <VersionPanel
                    versions={versions}
                    onRestore={handleRestoreVersion}
                    onClose={() => setShowVersionPanel(false)}
                    readOnly={isReadOnly}
                  />
                )}

                <CommentSection
                  comments={currentCircuit?.comments || []}
                  newComment={newComment}
                  onNewCommentChange={setNewComment}
                  onSubmit={submitComment}
                  inputRef={commentInputRef}
                  endRef={commentsEndRef}
                  username={username}
                  onUsernameChange={setUsername}
                  readOnly={isReadOnly}
                />
              </>
            )}
          </aside>
        )}

        {showComments && !isMobile && (
          <button
            onClick={() => setShowComments(false)}
            style={{
              position: 'absolute', right: showComments ? 320 : 0, top: '50%',
              transform: 'translateY(-50%)', width: 28, height: 80,
              background: 'rgba(0,212,255,0.15)',
              border: '1px solid rgba(0,212,255,0.3)', borderRight: 'none',
              borderRadius: '8px 0 0 8px', cursor: 'pointer', zIndex: 50,
              color: '#00d4ff', fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >◀</button>
        )}

        {!showComments && !isMobile && (
          <button
            onClick={() => setShowComments(true)}
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 80, background: 'rgba(0,212,255,0.15)',
              border: '1px solid rgba(0,212,255,0.3)', borderLeft: 'none',
              borderRadius: '8px 0 0 8px', cursor: 'pointer', zIndex: 50,
              color: '#00d4ff', fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >▶</button>
        )}
      </div>

      {isMobile && showMobileDrawer && (
        <MobileDrawer
          onClose={() => setShowMobileDrawer(false)}
          selectedComponent={selectedComponent}
          onPropertyChange={handleComponentPropertyChange}
          onDeleteComponent={handleDeleteComponent}
          onDeselect={() => setSelectedComponentId(null)}
          versions={versions}
          onRestore={handleRestoreVersion}
          comments={currentCircuit?.comments || []}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          onSubmitComment={submitComment}
          username={username}
          onUsernameChange={setUsername}
          readOnly={isReadOnly}
        />
      )}

      {notification && (
        <div className="notification" style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,212,255,0.9)', color: '#0a0a1a',
          padding: '12px 24px', borderRadius: 8, fontSize: 14,
          fontWeight: 500, boxShadow: '0 0 20px rgba(0,212,255,0.5)',
          zIndex: 9999, animation: 'fadeInUp 0.3s ease-out'
        }}>{notification}</div>
      )}

      {isReadOnly && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,138,76,0.9)', color: '#0a0a1a',
          padding: '8px 20px', borderRadius: 20, fontSize: 13,
          fontWeight: 600, zIndex: 999
        }}>🔒 只读模式 - 您正在查看分享的电路</div>
      )}
    </div>
  )
}

function ComponentPaletteItem({ def, disabled }: { def: ComponentDefinition; disabled: boolean; onDragStart: () => void }) {
  return (
    <div
      draggable={!disabled}
      onDragStart={e => {
        e.dataTransfer.setData('componentType', def.type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      style={{
        background: 'rgba(0,212,255,0.06)',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 10, padding: 14, cursor: disabled ? 'not-allowed' : 'grab',
        transition: 'all 200ms', userSelect: 'none',
        opacity: disabled ? 0.5 : 1
      }}
      className="palette-item"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: 'rgba(0,212,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24
        }}>{getComponentIcon(def.type)}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#e0e0e0' }}>{def.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{def.symbol}</div>
        </div>
      </div>
    </div>
  )
}

function getComponentIcon(type: string) {
  switch (type) {
    case 'resistor': return '⏚'
    case 'capacitor': return '⊟'
    case 'battery': return '⚡'
    case 'switch': return '⇌'
    default: return '⚙'
  }
}

function PropertyPanel({ component, onPropertyChange, onDelete, onClose }: {
  component: Component
  onPropertyChange: (key: string, value: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const propLabels: Record<string, string> = {
    resistance: '阻值',
    capacitance: '容量',
    voltage: '电压',
    state: '状态'
  }
  const typeLabels: Record<string, string> = {
    resistor: '电阻',
    capacitor: '电容',
    battery: '电池',
    switch: '开关'
  }
  return (
    <div style={{
      padding: 16, borderBottom: '1px solid rgba(255,255,255,0.05)',
      animation: 'panelExpand 300ms ease-out', transformOrigin: 'top'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'rgba(0,212,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, marginRight: 10
        }}>{getComponentIcon(component.type)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4ff' }}>
            {typeLabels[component.type]}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            ID: {component.id.substring(0, 8)}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: 18, padding: 4
        }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(component.properties).map(([key, value]) => (
          <div key={key}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
              {propLabels[key] || key}
            </label>
            <input
              value={value}
              onChange={e => onPropertyChange(key, e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#e0e0e0', padding: '9px 12px',
                borderRadius: 6, outline: 'none', fontSize: 13,
                transition: 'all 200ms'
              }}
              onFocus={e => e.target.style.borderColor = '#00d4ff'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,212,255,0.25)'}
            />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>位置</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)',
              background: 'rgba(0,0,0,0.2)', padding: '9px 12px', borderRadius: 6 }}>
              X: {Math.round(component.x)}
            </div>
            <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)',
              background: 'rgba(0,0,0,0.2)', padding: '9px 12px', borderRadius: 6 }}>
              Y: {Math.round(component.y)}
            </div>
          </div>
        </div>
      </div>

      <button onClick={onDelete} style={{
        width: '100%', marginTop: 16, padding: '10px',
        background: 'rgba(255,80,80,0.1)', color: '#ff6b6b',
        border: '1px solid rgba(255,80,80,0.3)', borderRadius: 6,
        cursor: 'pointer', fontSize: 13, fontWeight: 500,
        transition: 'all 200ms'
      }} className="danger-btn">🗑 删除元件</button>
    </div>
  )
}

function VersionPanel({ versions, onRestore, onClose, readOnly }: {
  versions: VersionSnapshot[]
  onRestore: (id: string) => void
  onClose: () => void
  readOnly: boolean
}) {
  return (
    <div style={{
      padding: 16, borderBottom: '1px solid rgba(255,255,255,0.05)',
      animation: 'panelExpand 300ms ease-out', transformOrigin: 'top'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 20, marginRight: 8 }}>📜</span>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#00d4ff' }}>版本历史</div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: 18, padding: 4
        }}>✕</button>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            暂无版本快照<br />点击「保存版本」创建快照
          </div>
        ) : (
          [...versions].reverse().map(v => (
            <div key={v.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: 12, cursor: 'pointer',
              transition: 'all 200ms'
            }} className="version-item"
            onClick={() => !readOnly && onRestore(v.id)}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#e0e0e0' }}>
                {v.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {new Date(v.timestamp).toLocaleString()} · {v.components.length} 元件 · {v.wires.length} 连线
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CommentSection({ comments, newComment, onNewCommentChange, onSubmit, inputRef, endRef, username, onUsernameChange, readOnly }: {
  comments: Comment[]
  newComment: string
  onNewCommentChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  inputRef: React.RefObject<HTMLInputElement>
  endRef: React.RefObject<HTMLDivElement>
  username: string
  onUsernameChange: (v: string) => void
  readOnly: boolean
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 200 }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center'
      }}>
        <span style={{ fontSize: 16, marginRight: 8 }}>💬</span>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#00d4ff' }}>协作评论</div>
        <div style={{
          marginLeft: 'auto', fontSize: 11, color: 'rgba(0,212,255,0.6)',
          background: 'rgba(0,212,255,0.1)', padding: '3px 8px', borderRadius: 10
        }}>实时</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            暂无评论<br />留下你的想法吧
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="comment-card" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: 10, padding: 12, animation: 'fadeIn 600ms ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: `linear-gradient(135deg, ${getUserColor(c.username)} 0%, ${getUserColor2(c.username)} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', marginRight: 8
              }}>{c.username.substring(0, 2)}</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#e0e0e0' }}>{c.username}</div>
              <div style={{
                marginLeft: 'auto', fontSize: 10,
                color: 'rgba(255,255,255,0.35)'
              }}>{formatTime(c.timestamp)}</div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, paddingLeft: 34 }}>
              {c.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {!readOnly && (
        <form onSubmit={onSubmit} style={{
          padding: 12, borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', gap: 8
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={newComment}
              onChange={e => onNewCommentChange(e.target.value)}
              placeholder="输入评论，回车发送..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0,212,255,0.2)',
                color: '#e0e0e0', padding: '9px 12px',
                borderRadius: 8, outline: 'none', fontSize: 13,
                transition: 'all 200ms'
              }}
            />
            <button type="submit" className="nav-btn" style={{ padding: '9px 16px' }}>发送</button>
          </div>
        </form>
      )}
    </div>
  )
}

function MobileDrawer(props: {
  onClose: () => void
  selectedComponent?: Component
  onPropertyChange: (key: string, value: string) => void
  onDeleteComponent: () => void
  onDeselect: () => void
  versions: VersionSnapshot[]
  onRestore: (id: string) => void
  comments: Comment[]
  newComment: string
  onNewCommentChange: (v: string) => void
  onSubmitComment: (e: React.FormEvent) => void
  username: string
  onUsernameChange: (v: string) => void
  readOnly: boolean
}) {
  const [tab, setTab] = useState<'props' | 'versions' | 'comments'>(
    props.selectedComponent ? 'props' : 'comments'
  )
  return (
    <>
      <div onClick={props.onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 200, animation: 'fadeIn 200ms'
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: '#16213e', borderTop: '1px solid rgba(0,212,255,0.2)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        zIndex: 201, maxHeight: '70vh',
        animation: 'slideUp 300ms ease-out', display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 10 }}>
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {!props.readOnly && (
            <DrawerTab active={tab === 'props'} onClick={() => setTab('props')} label="属性" icon="⚙" />
          )}
          <DrawerTab active={tab === 'versions'} onClick={() => setTab('versions')} label={`版本(${props.versions.length})`} icon="📜" />
          <DrawerTab active={tab === 'comments'} onClick={() => setTab('comments')} label={`评论(${props.comments.length})`} icon="💬" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'props' && props.selectedComponent && (
            <PropertyPanel
              component={props.selectedComponent}
              onPropertyChange={props.onPropertyChange}
              onDelete={props.onDeleteComponent}
              onClose={props.onDeselect}
            />
          )}
          {tab === 'props' && !props.selectedComponent && (
            <EmptyHint text="选中元件后可编辑属性" />
          )}
          {tab === 'versions' && (
            <VersionPanelMini versions={props.versions} onRestore={props.onRestore} readOnly={props.readOnly} />
          )}
          {tab === 'comments' && (
            <CommentSectionMini
              comments={props.comments}
              newComment={props.newComment}
              onNewCommentChange={props.onNewCommentChange}
              onSubmit={props.onSubmitComment}
              readOnly={props.readOnly}
            />
          )}
        </div>
      </div>
    </>
  )
}

function DrawerTab({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: 14, background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
      border: 'none', borderBottom: active ? '2px solid #00d4ff' : '2px solid transparent',
      color: active ? '#00d4ff' : 'rgba(255,255,255,0.5)',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
      transition: 'all 200ms'
    }}>
      <span style={{ marginRight: 4 }}>{icon}</span>{label}
    </button>
  )
}

function VersionPanelMini({ versions, onRestore, readOnly }: {
  versions: VersionSnapshot[]; onRestore: (id: string) => void; readOnly: boolean
}) {
  if (versions.length === 0) return <EmptyHint text="暂无版本快照，点击保存版本创建" />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...versions].reverse().map(v => (
        <div key={v.id} onClick={() => !readOnly && onRestore(v.id)} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10, padding: 14, cursor: readOnly ? 'default' : 'pointer'
        }}>
          <div style={{ fontWeight: 600, color: '#e0e0e0' }}>{v.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {new Date(v.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentSectionMini({ comments, newComment, onNewCommentChange, onSubmit, readOnly }: {
  comments: Comment[]; newComment: string; onNewCommentChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void; readOnly: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400 }}>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.length === 0 && <EmptyHint text="暂无评论" />}
        {comments.map(c => (
          <div key={c.id} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: 10, padding: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: getUserColor(c.username), marginRight: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff'
              }}>{c.username.substring(0, 2)}</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{c.username}</div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {formatTime(c.timestamp)}
              </div>
            </div>
            <div style={{ fontSize: 13, paddingLeft: 32, color: 'rgba(255,255,255,0.8)' }}>{c.text}</div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            value={newComment}
            onChange={e => onNewCommentChange(e.target.value)}
            placeholder="输入评论..."
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: '#e0e0e0', padding: '10px 14px',
              borderRadius: 10, outline: 'none', fontSize: 14
            }}
          />
          <button type="submit" className="nav-btn">发送</button>
        </form>
      )}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
      {text}
    </div>
  )
}

function getUserColor(name: string): string {
  const colors = ['#00d4ff', '#ff8a4c', '#7c4dff', '#ff4081', '#69f0ae', '#ffd740', '#448aff']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
function getUserColor2(name: string): string {
  const colors = ['#0088aa', '#cc5522', '#4422aa', '#aa2255', '#229966', '#cc9922', '#224488']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) * 3 + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = (now.getTime() - ts) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function generateSVG(circuit: Circuit): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  circuit.components.forEach(c => {
    const w = c.type === 'resistor' ? 60 : c.type === 'battery' ? 60 : 50
    minX = Math.min(minX, c.x - w - 20)
    maxX = Math.max(maxX, c.x + w + 20)
    minY = Math.min(minY, c.y - 40)
    maxY = Math.max(maxY, c.y + 40)
  })
  if (!isFinite(minX)) { minX = 0; maxX = 800; minY = 0; maxY = 600 }
  const w = Math.max(800, maxX - minX)
  const h = Math.max(600, maxY - minY)

  let content = ''
  circuit.wires.forEach(wire => {
    const from = circuit.components.find(c => c.id === wire.fromComponentId)
    const to = circuit.components.find(c => c.id === wire.toComponentId)
    if (!from || !to) return
    const fromPin = from.pins.find(p => p.id === wire.fromPinId)
    const toPin = to.pins.find(p => p.id === wire.toPinId)
    if (!fromPin || !toPin) return
    const x1 = from.x + fromPin.offsetX - minX
    const y1 = from.y + fromPin.offsetY - minY
    const x2 = to.x + toPin.offsetX - minX
    const y2 = to.y + toPin.offsetY - minY
    const cx1 = (x1 + x2) / 2
    content += `<path d="M${x1},${y1} C${cx1},${y1} ${cx1},${y2} ${x2},${y2}" 
      fill="none" stroke="url(#wireGrad)" stroke-width="3" stroke-linecap="round"/>`
  })
  circuit.components.forEach(c => {
    const x = c.x - minX
    const y = c.y - minY
    const label = Object.values(c.properties)[0] || ''
    content += `<g transform="translate(${x},${y})">`
    if (c.type === 'resistor') {
      content += `<path d="M-30,0 L-18,-8 L-6,8 L6,-8 L18,8 L30,0" fill="none" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<text x="0" y="-18" text-anchor="middle" fill="#00d4ff" font-size="11" font-family="sans-serif">${label}</text>`
    } else if (c.type === 'capacitor') {
      content += `<line x1="-25" y1="0" x2="-5" y2="0" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<line x1="-5" y1="-14" x2="-5" y2="14" stroke="#00d4ff" stroke-width="3"/>`
      content += `<line x1="5" y1="-14" x2="5" y2="14" stroke="#00d4ff" stroke-width="3"/>`
      content += `<line x1="5" y1="0" x2="25" y2="0" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<text x="0" y="-22" text-anchor="middle" fill="#00d4ff" font-size="11" font-family="sans-serif">${label}</text>`
    } else if (c.type === 'battery') {
      content += `<line x1="-30" y1="0" x2="-10" y2="0" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<line x1="-10" y1="-8" x2="-10" y2="8" stroke="#00d4ff" stroke-width="3"/>`
      content += `<line x1="10" y1="-16" x2="10" y2="16" stroke="#ff8a4c" stroke-width="3"/>`
      content += `<line x1="10" y1="0" x2="30" y2="0" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<text x="0" y="-24" text-anchor="middle" fill="#ff8a4c" font-size="11" font-family="sans-serif">${label}</text>`
    } else if (c.type === 'switch') {
      content += `<line x1="-25" y1="0" x2="-8" y2="0" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<circle cx="-8" cy="0" r="3" fill="#00d4ff"/>`
      content += `<circle cx="8" cy="0" r="3" fill="#00d4ff"/>`
      content += `<line x1="-5" y1="-2" x2="15" y2="-12" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<line x1="8" y1="0" x2="25" y2="0" stroke="#00d4ff" stroke-width="2.5"/>`
      content += `<text x="0" y="-20" text-anchor="middle" fill="#00d4ff" font-size="11" font-family="sans-serif">${label}</text>`
    }
    content += `</g>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background:#1a1a2e">
  <defs>
    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff8a4c"/>
      <stop offset="100%" stop-color="#00d4ff"/>
    </linearGradient>
  </defs>
  ${content}
  <text x="20" y="${h - 20}" fill="rgba(255,255,255,0.3)" font-size="12" font-family="sans-serif">芯桥 Xinqiao · ${circuit.name}</text>
</svg>`
}

const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes panelExpand {
  from { opacity: 0; transform: scaleY(0.95); }
  to { opacity: 1; transform: scaleY(1); }
}
.nav-btn {
  background: rgba(0,212,255,0.1);
  border: 1px solid rgba(0,212,255,0.25);
  color: #00d4ff;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 200ms;
  white-space: nowrap;
}
.nav-btn:hover {
  background: rgba(0,212,255,0.2);
  border-color: rgba(0,212,255,0.5);
  box-shadow: 0 0 8px rgba(0,212,255,0.4);
}
.nav-btn:active { transform: scale(0.97); }
.palette-item:hover {
  background: rgba(0,212,255,0.15);
  border-color: rgba(0,212,255,0.5);
  box-shadow: 0 0 12px rgba(0,212,255,0.2);
}
.version-item:hover {
  background: rgba(0,212,255,0.08);
  border-color: rgba(0,212,255,0.3);
}
.danger-btn:hover {
  background: rgba(255,80,80,0.2) !important;
  box-shadow: 0 0 8px rgba(255,80,80,0.3);
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,212,255,0.5); }
`
