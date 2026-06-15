import React, { useState, useEffect, useRef, useCallback } from 'react'
import AudioRecorder from './AudioRecorder'
import type { NoteCard, Category } from '../types'

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

const categories: { key: Category; label: string; icon: JSX.Element }[] = [
  {
    key: 'all',
    label: '全部',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: 'work',
    label: '工作',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    key: 'life',
    label: '生活',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
]

const WaveformMini: React.FC<{ waveform: number[]; playing: boolean }> = ({ waveform, playing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const animate = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#2A2A3E'
      ctx.fillRect(0, 0, width, height)

      const samples = waveform.length > 0 ? waveform : new Array(50).fill(0.3)
      const step = Math.max(1, Math.floor(samples.length / width))
      ctx.strokeStyle = playing ? '#6C63FF' : '#8B8BA3'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = 0; x < width; x++) {
        const idx = (Math.floor(x * step) + (playing ? offset : 0)) % samples.length
        const v = samples[idx] || 0
        const y = height / 2 - v * (height * 0.4)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      for (let x = 0; x < width; x++) {
        const idx = (Math.floor(x * step) + (playing ? offset : 0)) % samples.length
        const v = samples[idx] || 0
        const y = height / 2 + v * (height * 0.4)
        ctx.lineTo(width - x, y)
      }
      ctx.stroke()
      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animationId)
  }, [waveform, playing, offset])

  useEffect(() => {
    if (!playing) {
      setOffset(0)
      return
    }
    const id = setInterval(() => setOffset(o => o + 1), 50)
    return () => clearInterval(id)
  }, [playing])

  return <canvas ref={canvasRef} width={120} height={40} style={{ borderRadius: '4px' }} />
}

const WaveformFull: React.FC<{ waveform: number[]; playing: boolean; currentTime: number; duration: number }> = ({ waveform, playing, currentTime, duration }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#16161E'
    ctx.fillRect(0, 0, width, height)

    const samples = waveform.length > 0 ? waveform : new Array(100).fill(0.3)
    const barCount = 100
    const barWidth = (width - 40) / barCount
    const progress = duration > 0 ? currentTime / duration : 0

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * samples.length)
      const v = samples[idx] || 0.2
      const barHeight = Math.max(3, v * height * 0.8)
      const x = 20 + i * barWidth
      const y = (height - barHeight) / 2
      const isPast = i / barCount <= progress
      ctx.fillStyle = isPast ? '#6C63FF' : '#3A3A4A'
      ctx.fillRect(x, y, barWidth - 2, barHeight)
    }
  }, [waveform, playing, currentTime, duration])

  return <canvas ref={canvasRef} width={500} height={80} style={{ borderRadius: '8px', width: '100%' }} />
}

const Card: React.FC<{
  card: NoteCard
  index: number
  onClick: () => void
}> = ({ card, index, onClick }) => {
  const [removing, setRemoving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/audio/${card.id}`)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(true)
    setRemoving(true)
    setTimeout(async () => {
      await fetch(`/api/notes/${card.id}`, { method: 'DELETE' })
      setDeleting(false)
    }, 400)
  }

  if (deleting) return null

  return (
    <div
      className="note-card"
      onClick={onClick}
      style={{
        ...cardStyles.card,
        opacity: 0,
        animation: `fadeInUp 0.4s ease forwards`,
        animationDelay: `${index * 0.1}s`,
        transform: removing ? 'translateX(-120%)' : 'translateY(0)',
        transition: removing ? 'transform 0.4s ease, opacity 0.4s ease' : 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={cardStyles.waveformArea}>
        <WaveformMini waveform={card.waveform} playing={playing} />
        <div style={cardStyles.duration}>{card.duration}s</div>
      </div>

      <div style={cardStyles.content}>
        <div style={cardStyles.text}>
          {card.text || '（未识别文字）'}
        </div>
      </div>

      <div style={cardStyles.footer}>
        <span style={cardStyles.time}>{formatTime(card.createdAt)}</span>
        <div style={cardStyles.actions}>
          <span style={{
            ...cardStyles.tag,
            backgroundColor: card.category === 'work' ? 'rgba(108, 99, 255, 0.2)' : 'rgba(74, 222, 128, 0.2)',
            color: card.category === 'work' ? '#6C63FF' : '#4ADE80',
          }}>
            {card.category === 'work' ? '工作' : '生活'}
          </span>
          <button onClick={togglePlay} style={cardStyles.iconBtn}>
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#6C63FF">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#9CA3AF">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <button onClick={handleDelete} style={cardStyles.iconBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const cardStyles: { [key: string]: React.CSSProperties } = {
  card: {
    width: '260px',
    height: '180px',
    backgroundColor: '#1E1E2E',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  waveformArea: {
    position: 'relative',
  },
  duration: {
    position: 'absolute',
    top: '4px',
    right: '6px',
    fontSize: '10px',
    color: '#9CA3AF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  text: {
    fontSize: '13px',
    color: '#E5E7EB',
    lineHeight: '1.5',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  time: {
    fontSize: '11px',
    color: '#6B7280',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tag: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    marginRight: '4px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
}

const DetailModal: React.FC<{
  card: NoteCard
  onClose: () => void
  onUpdate: (id: string, text: string, category: Exclude<Category, 'all'>) => void
}> = ({ card, onClose, onUpdate }) => {
  const [text, setText] = useState(card.text)
  const [category, setCategory] = useState<Exclude<Category, 'all'>>(card.category)
  const [editing, setEditing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/audio/${card.id}`)
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
      }
      audioRef.current.onended = () => {
        setPlaying(false)
        setCurrentTime(0)
      }
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const handleSave = () => {
    onUpdate(card.id, text, category)
    setEditing(false)
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <div style={modalStyles.title}>便签详情</div>
          <button onClick={onClose} style={modalStyles.closeBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={modalStyles.playerSection}>
          <button onClick={togglePlay} style={modalStyles.playBtn}>
            {playing ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <polygon points="8,5 20,12 8,19" />
              </svg>
            )}
          </button>
          <WaveformFull waveform={card.waveform} playing={playing} currentTime={currentTime} duration={card.duration} />
          <span style={modalStyles.timeLabel}>
            {Math.floor(currentTime)}s / {card.duration}s
          </span>
        </div>

        <div style={modalStyles.body}>
          <div style={modalStyles.label}>文字内容</div>
          {editing ? (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              style={modalStyles.textarea}
              rows={5}
            />
          ) : (
            <div style={modalStyles.fullText}>{text || '（未识别文字）'}</div>
          )}

          <div style={{ ...modalStyles.label, marginTop: '20px' }}>分类</div>
          <div style={modalStyles.categorySelect}>
            {(['work', 'life'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => editing && setCategory(cat)}
                style={{
                  ...modalStyles.categoryBtn,
                  backgroundColor: category === cat
                    ? (cat === 'work' ? 'rgba(108, 99, 255, 0.3)' : 'rgba(74, 222, 128, 0.3)')
                    : '#2A2A3E',
                  borderColor: category === cat
                    ? (cat === 'work' ? '#6C63FF' : '#4ADE80')
                    : 'transparent',
                  color: category === cat ? '#ffffff' : '#9CA3AF',
                  cursor: editing ? 'pointer' : 'default',
                }}
              >
                {cat === 'work' ? '工作' : '生活'}
              </button>
            ))}
          </div>

          <div style={modalStyles.meta}>
            创建时间：{formatTime(card.createdAt)}
          </div>
        </div>

        <div style={modalStyles.footer}>
          {editing ? (
            <>
              <button onClick={() => { setText(card.text); setCategory(card.category); setEditing(false) }} style={modalStyles.cancelBtn}>
                取消
              </button>
              <button onClick={handleSave} style={modalStyles.saveBtn}>保存</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={modalStyles.editBtn}>
              编辑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    backgroundColor: '#1E1E2E',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #2A2A3E',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  playerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    borderBottom: '1px solid #2A2A3E',
  },
  playBtn: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#6C63FF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    whiteSpace: 'nowrap',
  },
  body: {
    padding: '24px',
    flex: 1,
    overflowY: 'auto',
  },
  label: {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  fullText: {
    fontSize: '14px',
    color: '#E5E7EB',
    lineHeight: '1.7',
    backgroundColor: '#16161E',
    padding: '16px',
    borderRadius: '8px',
    whiteSpace: 'pre-wrap',
  },
  textarea: {
    width: '100%',
    fontSize: '14px',
    color: '#E5E7EB',
    lineHeight: '1.7',
    backgroundColor: '#16161E',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #3A3A4A',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  categorySelect: {
    display: 'flex',
    gap: '10px',
  },
  categoryBtn: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  meta: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#6B7280',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #2A2A3E',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  editBtn: {
    padding: '10px 24px',
    backgroundColor: '#6C63FF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  saveBtn: {
    padding: '10px 24px',
    backgroundColor: '#6C63FF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  cancelBtn: {
    padding: '10px 24px',
    backgroundColor: '#2A2A3E',
    color: '#9CA3AF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
}

const App: React.FC = () => {
  const [cards, setCards] = useState<NoteCard[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [selectedCard, setSelectedCard] = useState<NoteCard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  const loadCards = useCallback(async () => {
    try {
      const res = await fetch('/api/notes')
      const data = await res.json()
      setCards(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const handleRecordingComplete = async (audioBlob: Blob, waveform: number[], duration: number) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('duration', String(duration))
      formData.append('waveform', JSON.stringify(waveform.slice(0, 200)))

      const res = await fetch('/api/notes', {
        method: 'POST',
        body: formData,
      })
      const newCard: NoteCard = await res.json()
      setCards(prev => [newCard, ...prev])
    } catch (e) {
      console.error('Upload failed:', e)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdateCard = async (id: string, text: string, category: Exclude<Category, 'all'>) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category }),
      })
      const updated: NoteCard = await res.json()
      setCards(prev => prev.map(c => c.id === id ? updated : c))
      setSelectedCard(updated)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredCards = activeCategory === 'all'
    ? cards
    : cards.filter(c => c.category === activeCategory)

  return (
    <div style={appStyles.root}>
      <div style={appStyles.sidebar} className="sidebar">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            title={cat.label}
            style={{
              ...appStyles.sidebarBtn,
              color: activeCategory === cat.key ? '#6C63FF' : '#6B7280',
              backgroundColor: activeCategory === cat.key ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
            }}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      <div style={appStyles.main} className="main-content">
        <div style={appStyles.header}>
          <h1 style={appStyles.title}>回声便签</h1>
          <p style={appStyles.subtitle}>用声音记录，用文字留存</p>
        </div>

        <div style={appStyles.recorderCard}>
          {isUploading ? (
            <div style={appStyles.uploading}>
              <div style={appStyles.spinner} />
              <span style={{ color: '#9CA3AF' }}>正在处理语音...</span>
            </div>
          ) : (
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
          )}
        </div>

        <div style={appStyles.listHeader}>
          <span style={{ color: '#9CA3AF', fontSize: '13px' }}>
            {activeCategory === 'all' ? '全部便签' : (activeCategory === 'work' ? '工作便签' : '生活便签')}
            <span style={{ color: '#6B7280', marginLeft: '8px' }}>· {filteredCards.length} 条</span>
          </span>
        </div>

        <div style={appStyles.cardGrid} className="card-grid">
          {isLoading ? (
            <div style={appStyles.emptyState}>
              <div style={appStyles.spinner} />
            </div>
          ) : filteredCards.length === 0 ? (
            <div style={appStyles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3A3A4A" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" />
              </svg>
              <p style={{ color: '#6B7280', marginTop: '12px' }}>还没有便签，录一段试试吧</p>
            </div>
          ) : (
            filteredCards.map((card, i) => (
              <Card
                key={card.id}
                card={card}
                index={i}
                onClick={() => setSelectedCard(card)}
              />
            ))
          )}
        </div>
      </div>

      {selectedCard && (
        <DetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (hover: hover) {
          .note-card:hover {
            transform: translateY(-4px) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
          }
        }
        @media (max-width: 768px) {
          .card-grid {
            grid-template-columns: 1fr !important;
          }
          .main-content {
            padding: 20px !important;
          }
          .note-card {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .sidebar {
            width: 52px !important;
          }
          .main-content {
            padding: 16px !important;
          }
          .note-card {
            width: 100% !important;
            height: auto !important;
            min-height: 180px;
          }
        }
      `}</style>
    </div>
  )
}

const appStyles: { [key: string]: React.CSSProperties } = {
  root: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#12121A',
  },
  sidebar: {
    width: '60px',
    backgroundColor: '#16161E',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '20px',
    gap: '8px',
    flexShrink: 0,
  },
  sidebarBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    padding: '32px 40px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
  },
  recorderCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: '12px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'center',
  },
  uploading: {
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #2A2A3E',
    borderTopColor: '#6C63FF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  listHeader: {
    marginBottom: '16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 260px)',
    gap: '20px',
    paddingBottom: '40px',
    justifyContent: 'flex-start',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
}

export default App
