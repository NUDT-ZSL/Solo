import React, { useState, useEffect, useRef, useCallback } from 'react'

const COLOR_PALETTE = [
  '#FFD1B3',
  '#B3E5FC',
  '#C8E6C9',
  '#FFF9C4',
  '#E1BEE7',
  '#FFCCBC',
  '#BBDEFB',
  '#F8BBD0'
]

interface Annotation {
  id: string
  roomCode: string
  paragraphIndex: number
  startOffset: number
  endOffset: number
  content: string
  color: string
  userId: string
  timestamp: number
}

interface SelectionState {
  paragraphIndex: number
  startOffset: number
  endOffset: number
  selectedText: string
  rect: DOMRect
}

const API_BASE = '/api'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

const App: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>('')
  const [inputRoomCode, setInputRoomCode] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [colorFilter, setColorFilter] = useState<string>('all')
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [newAnnotationContent, setNewAnnotationContent] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTE[0])
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isInitialized) return
    pollTimerRef.current = window.setInterval(async () => {
      if (!roomCode || !userId) return
      try {
        const res = await fetch(
          `${API_BASE}/getUpdates?roomCode=${encodeURIComponent(roomCode)}&userId=${encodeURIComponent(userId)}&since=${lastUpdate}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.fullSync) {
            setAnnotations(data.annotations || [])
            if (data.paragraphs && data.paragraphs.length > 0) {
              setParagraphs(data.paragraphs)
            }
          } else {
            setAnnotations(prev => {
              const existingIds = new Set(prev.map(a => a.id))
              const updated = [...prev]
              for (const ann of data.annotations || []) {
                if (!existingIds.has(ann.id)) {
                  updated.push(ann)
                }
              }
              return updated
            })
          }
          if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount)
          if (data.lastUpdate) setLastUpdate(data.lastUpdate)
        }
      } catch (e) {
        // 静默处理网络错误
      }
    }, 2000)

    return () => {
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [isInitialized, roomCode, userId, lastUpdate])

  const createRoom = async () => {
    try {
      setErrorMsg('')
      const res = await fetch(`${API_BASE}/createRoom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        const data = await res.json()
        setRoomCode(data.roomCode)
        setUserId(data.userId)
        setIsInitialized(true)
      }
    } catch (e) {
      setErrorMsg('创建房间失败，请重试')
    }
  }

  const joinRoom = async () => {
    if (!inputRoomCode.trim()) {
      setErrorMsg('请输入房间码')
      return
    }
    try {
      setErrorMsg('')
      const res = await fetch(`${API_BASE}/joinRoom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: inputRoomCode.trim().toUpperCase() })
      })
      if (res.ok) {
        const data = await res.json()
        setRoomCode(data.roomCode)
        setUserId(data.userId)
        setParagraphs(data.paragraphs || [])
        setAnnotations(data.annotations || [])
        if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount)
        setIsInitialized(true)
      } else {
        const err = await res.json()
        setErrorMsg(err.error || '加入房间失败')
      }
    } catch (e) {
      setErrorMsg('加入房间失败，请重试')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('文件大小超过2MB限制')
      return
    }
    try {
      setErrorMsg('')
      const content = await file.text()
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          userId,
          content
        })
      })
      if (res.ok) {
        const data = await res.json()
        setParagraphs(data.paragraphs || [])
        setAnnotations(data.annotations || [])
        if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount)
        setLastUpdate(0)
      } else {
        const err = await res.json()
        setErrorMsg(err.error || '上传文件失败')
      }
    } catch (e) {
      setErrorMsg('上传文件失败，请重试')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleTextSelection = useCallback((paragraphIndex: number, paragraphEl: HTMLDivElement) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      return
    }
    const range = sel.getRangeAt(0)
    const parentEl = range.commonAncestorContainer.nodeType === 1
      ? (range.commonAncestorContainer as HTMLElement)
      : (range.commonAncestorContainer.parentNode as HTMLElement)
    if (!paragraphEl.contains(parentEl)) return

    const textContent = paragraphEl.innerText
    const preRange = document.createRange()
    preRange.selectNodeContents(paragraphEl)
    preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    const endOffset = startOffset + range.toString().length

    if (startOffset >= endOffset || range.toString().trim().length === 0) {
      return
    }

    const rect = range.getBoundingClientRect()
    setSelection({
      paragraphIndex,
      startOffset,
      endOffset,
      selectedText: range.toString(),
      rect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        right: rect.right + window.scrollX,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        toJSON: () => ''
      } as DOMRect
    })
    setNewAnnotationContent('')
    setSelectedColor(COLOR_PALETTE[0])
  }, [])

  const confirmAnnotation = async () => {
    if (!selection || !newAnnotationContent.trim()) {
      setSelection(null)
      return
    }
    try {
      setErrorMsg('')
      const res = await fetch(`${API_BASE}/addAnnotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          userId,
          paragraphIndex: selection.paragraphIndex,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          content: newAnnotationContent.trim(),
          color: selectedColor
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAnnotations(prev => [...prev, data.annotation])
        if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount)
      } else {
        const err = await res.json()
        setErrorMsg(err.error || '添加批注失败')
      }
    } catch (e) {
      setErrorMsg('添加批注失败，请重试')
    } finally {
      setSelection(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  const deleteAnnotation = async (annotationId: string) => {
    try {
      setErrorMsg('')
      const res = await fetch(`${API_BASE}/deleteAnnotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          userId,
          annotationId
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAnnotations(prev => prev.filter(a => a.id !== data.deletedId))
        if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount)
      } else {
        const err = await res.json()
        setErrorMsg(err.error || '删除批注失败')
      }
    } catch (e) {
      setErrorMsg('删除批注失败，请重试')
    }
  }

  const renderParagraph = (text: string, idx: number) => {
    const paraAnnotations = annotations
      .filter(a => a.paragraphIndex === idx)
      .filter(a => colorFilter === 'all' || a.color === colorFilter)
      .sort((a, b) => a.startOffset - b.startOffset)

    const parts: React.ReactNode[] = []
    let cursor = 0

    paraAnnotations.forEach((ann, i) => {
      if (ann.startOffset > cursor) {
        parts.push(<span key={`text-${idx}-${i}`}>{text.slice(cursor, ann.startOffset)}</span>)
      }
      const shadowColor = hexToRgba(ann.color, 0.6)
      parts.push(
        <span
          key={`ann-${ann.id}`}
          style={{
            backgroundColor: hexToRgba(ann.color, 0.3),
            boxShadow: `0 0 4px ${shadowColor}`,
            borderRadius: '2px',
            padding: '0 1px'
          }}
        >
          {text.slice(ann.startOffset, ann.endOffset)}
        </span>
      )
      cursor = ann.endOffset
    })

    if (cursor < text.length) {
      parts.push(<span key={`text-${idx}-end`}>{text.slice(cursor)}</span>)
    }

    return (
      <div
        key={idx}
        ref={el => (paragraphRefs.current[idx] = el)}
        style={{
          padding: '16px 20px',
          borderBottom: '1px dashed #E0E0E0',
          position: 'relative',
          cursor: 'text',
          lineHeight: 1.8,
          fontSize: '15px',
          color: '#2C3E50'
        }}
        onMouseUp={() => {
          const el = paragraphRefs.current[idx]
          if (el) handleTextSelection(idx, el)
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '4px',
            top: '18px',
            color: '#95A5A6',
            fontSize: '12px',
            fontWeight: 600,
            userSelect: 'none'
          }}
        >
          #{idx + 1}
        </span>
        <span style={{ marginLeft: '28px', display: 'block' }}>{parts}</span>
      </div>
    )
  }

  const getParagraphAnnotations = (idx: number) => {
    return annotations
      .filter(a => a.paragraphIndex === idx)
      .filter(a => colorFilter === 'all' || a.color === colorFilter)
  }

  const filteredAnnotations = annotations.filter(
    a => colorFilter === 'all' || a.color === colorFilter
  )

  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8F9FA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div
          style={{
            backgroundColor: '#FFF',
            borderRadius: '12px',
            padding: '40px 48px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            maxWidth: '420px',
            width: '100%'
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '8px',
              fontSize: '24px',
              fontWeight: 700,
              color: '#2C3E50',
              textAlign: 'center'
            }}
          >
            长文本批注协作平台
          </h1>
          <p
            style={{
              margin: 0,
              marginBottom: '32px',
              fontSize: '14px',
              color: '#7F8C8D',
              textAlign: 'center'
            }}
          >
            多人实时协作 · 精准定位 · 高亮批注
          </p>

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '13px'
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            onClick={createRoom}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: '#3498DB',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '24px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2980B9')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3498DB')}
          >
            创建新房间
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E0E0E0' }} />
            <span style={{ color: '#BDC3C7', fontSize: '12px' }}>或加入已有房间</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E0E0E0' }} />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={inputRoomCode}
              onChange={e => setInputRoomCode(e.target.value.toUpperCase())}
              placeholder="输入4位房间码"
              maxLength={4}
              style={{
                flex: 1,
                padding: '11px 14px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            />
            <button
              onClick={joinRoom}
              style={{
                padding: '11px 20px',
                backgroundColor: '#27AE60',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#229954')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#27AE60')}
            >
              加入
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          backgroundColor: '#FFF',
          borderBottom: '1px solid #E0E0E0',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#2C3E50'
            }}
          >
            长文本批注协作平台
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#7F8C8D' }}>
            <span>
              房间码：<strong style={{ letterSpacing: '2px', color: '#2C3E50' }}>{roomCode}</strong>
            </span>
            <span>
              在线人数：<strong style={{ color: '#2C3E50' }}>{onlineCount}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#7F8C8D' }}>
            <span>筛选：</span>
            <select
              value={colorFilter}
              onChange={e => setColorFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#FFF',
                outline: 'none',
                color: '#2C3E50',
                cursor: 'pointer'
              }}
            >
              <option value="all">全部颜色</option>
              {COLOR_PALETTE.map((c, i) => (
                <option key={c} value={c}>
                  颜色 #{i + 1}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {COLOR_PALETTE.map(c => (
              <div
                key={c}
                title={`颜色 ${c}`}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  backgroundColor: c,
                  border: colorFilter === c ? '2px solid #2C3E50' : '1px solid #E0E0E0',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onClick={() => setColorFilter(colorFilter === c ? 'all' : c)}
              />
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3498DB',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2980B9')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3498DB')}
          >
            上传TXT文件
          </button>
        </div>
      </header>

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            padding: '10px 28px',
            fontSize: '13px',
            borderBottom: '1px solid #FFCDD2'
          }}
        >
          {errorMsg}
        </div>
      )}

      {paragraphs.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 28px'
          }}
        >
          <div
            style={{
              textAlign: 'center',
              maxWidth: '480px'
            }}
          >
            <div
              style={{
                fontSize: '64px',
                marginBottom: '16px',
                opacity: 0.3
              }}
            >
              📄
            </div>
            <h3
              style={{
                margin: 0,
                marginBottom: '10px',
                fontSize: '20px',
                fontWeight: 600,
                color: '#2C3E50'
              }}
            >
              暂无文本内容
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: '24px',
                fontSize: '14px',
                color: '#7F8C8D',
                lineHeight: 1.6
              }}
            >
              点击右上角「上传TXT文件」按钮上传一个文本文件，支持UTF-8编码，最大2MB。
              上传后，选中文本中的任意字符即可添加彩色批注。
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '12px 28px',
                backgroundColor: '#3498DB',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2980B9')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3498DB')}
            >
              立即上传
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <style>{`
            @media (max-width: 768px) {
              .main-layout { flex-direction: column !important; }
              .text-area { width: 100% !important; margin-right: 0 !important; margin-bottom: 16px; }
              .annotation-panel { width: 100% !important; position: static !important; }
              .annotation-bubble { margin-bottom: 8px !important; }
            }
          `}</style>
          <div className="main-layout" style={{ display: 'flex', width: '100%', padding: '20px 28px', gap: '24px', boxSizing: 'border-box' }}>
            <div
              className="text-area"
              style={{
                width: '70%',
                backgroundColor: '#FFF',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 140px)',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
            >
              {paragraphs.map((text, idx) => renderParagraph(text, idx))}
            </div>

            <div
              className="annotation-panel"
              style={{
                width: '30%',
                position: 'relative',
                boxSizing: 'border-box',
                maxHeight: 'calc(100vh - 140px)',
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#F8F9FA',
                  paddingBottom: '12px',
                  zIndex: 1
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2C3E50',
                    marginBottom: '4px'
                  }}
                >
                  批注列表
                </div>
                <div style={{ fontSize: '12px', color: '#7F8C8D' }}>
                  共 {filteredAnnotations.length} 条批注
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredAnnotations.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '32px 16px',
                      color: '#BDC3C7',
                      fontSize: '13px'
                    }}
                  >
                    暂无批注，选中文本添加第一条吧
                  </div>
                ) : (
                  filteredAnnotations.map(ann => {
                    const preview = ann.content.length > 10
                      ? ann.content.slice(0, 10) + '...'
                      : ann.content
                    const isOwner = ann.userId === userId
                    return (
                      <div
                        key={ann.id}
                        className="annotation-bubble"
                        onMouseEnter={() => setHoveredAnnotation(ann.id)}
                        onMouseLeave={() => setHoveredAnnotation(null)}
                        style={{
                          backgroundColor: '#FFF',
                          border: `2px solid ${ann.color}`,
                          borderRadius: '12px',
                          padding: '12px 14px',
                          position: 'relative',
                          cursor: 'default',
                          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                          transform: hoveredAnnotation === ann.id ? 'translateY(-2px)' : 'translateY(0)',
                          boxShadow: hoveredAnnotation === ann.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#95A5A6',
                              fontWeight: 600
                            }}
                          >
                            段落 #{ann.paragraphIndex + 1}
                            {!isOwner && (
                              <span style={{ marginLeft: '6px', color: '#BDC3C7' }}>（他人）</span>
                            )}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => deleteAnnotation(ann.id)}
                              title="删除批注"
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '14px',
                                lineHeight: 1,
                                cursor: 'pointer',
                                color: '#BDC3C7',
                                padding: '0 2px',
                                borderRadius: '4px',
                                transition: 'color 0.2s, background-color 0.2s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = '#E74C3C'
                                e.currentTarget.style.backgroundColor = '#FDEDEC'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = '#BDC3C7'
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: '#2C3E50'
                          }}
                        >
                          {hoveredAnnotation === ann.id ? ann.content : preview}
                        </div>
                        <div
                          style={{
                            marginTop: '6px',
                            padding: '4px 8px',
                            backgroundColor: hexToRgba(ann.color, 0.15),
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#7F8C8D',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={paragraphs[ann.paragraphIndex]?.slice(ann.startOffset, ann.endOffset)}
                        >
                          「{paragraphs[ann.paragraphIndex]?.slice(ann.startOffset, ann.endOffset)}」
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selection && (
        <>
          <div
            onClick={() => {
              setSelection(null)
              window.getSelection()?.removeAllRanges()
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9998
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: selection.rect.bottom + 12,
              left: Math.max(20, selection.rect.left),
              zIndex: 9999,
              backgroundColor: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              width: '320px',
              maxWidth: 'calc(100vw - 40px)'
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#2C3E50',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>添加批注 · 段落 #{selection.paragraphIndex + 1}</span>
              <button
                onClick={() => {
                  setSelection(null)
                  window.getSelection()?.removeAllRanges()
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#BDC3C7',
                  fontSize: '14px',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#7F8C8D',
                padding: '6px 10px',
                backgroundColor: '#F8F9FA',
                borderRadius: '6px',
                marginBottom: '12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={selection.selectedText}
            >
              已选：「{selection.selectedText}」
            </div>

            <textarea
              value={newAnnotationContent}
              onChange={e => {
                const val = e.target.value
                if (val.length <= 200) setNewAnnotationContent(val)
              }}
              placeholder="输入批注内容（最多200字）..."
              rows={3}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                color: '#2C3E50'
              }}
            />
            <div
              style={{
                fontSize: '11px',
                color: newAnnotationContent.length >= 200 ? '#E74C3C' : '#BDC3C7',
                textAlign: 'right',
                marginTop: '4px',
                marginBottom: '10px'
              }}
            >
              {newAnnotationContent.length}/200
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#7F8C8D',
                marginBottom: '6px'
              }}
            >
              选择颜色：
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '14px',
                flexWrap: 'wrap'
              }}
            >
              {COLOR_PALETTE.map(c => (
                <div
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: selectedColor === c ? '2px solid #2C3E50' : '2px solid transparent',
                    boxSizing: 'border-box',
                    transition: 'transform 0.15s',
                    transform: selectedColor === c ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setSelection(null)
                  window.getSelection()?.removeAllRanges()
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#F8F9FA',
                  color: '#7F8C8D',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ECEFF1')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
              >
                取消
              </button>
              <button
                onClick={confirmAnnotation}
                disabled={!newAnnotationContent.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: newAnnotationContent.trim() ? '#27AE60' : '#BDC3C7',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: newAnnotationContent.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => {
                  if (newAnnotationContent.trim()) e.currentTarget.style.backgroundColor = '#229954'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = newAnnotationContent.trim() ? '#27AE60' : '#BDC3C7'
                }}
              >
                添加批注
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { createRoot } from 'react-dom/client'
const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(<App />)
}

export default App
