import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import NoteEditor, { EditorNote } from './components/NoteEditor'
import SceneViewer, { ChimeNote } from './components/SceneViewer'
import { useSocket } from './hooks/useSocket'

interface Composition {
  id: string
  notes: EditorNote[]
  velocities: number[]
  createdAt: number
  likes: number
  hash: string
}

interface PaginatedResponse {
  items: Composition[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type Tab = 'editor' | 'gallery'

const DEFAULT_NOTES: EditorNote[] = [
  { id: 'd1', pitch: 60, time: 0, duration: 1, velocity: 6 },
  { id: 'd2', pitch: 64, time: 2, duration: 1, velocity: 6 },
  { id: 'd3', pitch: 67, time: 4, duration: 1, velocity: 6 },
  { id: 'd4', pitch: 72, time: 6, duration: 1, velocity: 6 },
  { id: 'd5', pitch: 69, time: 8, duration: 1, velocity: 6 },
  { id: 'd6', pitch: 67, time: 10, duration: 1, velocity: 6 },
]

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function pitchToColorCss(pitch: number, alpha: number = 0.85): string {
  const MIN_PITCH = 48
  const MAX_PITCH = 83
  const t = (pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)
  const hue = 240 - t * (240 - 60)
  return `hsla(${hue}, 70%, 55%, ${alpha})`
}

function ChimePreview({ notes }: { notes: EditorNote[] }) {
  const sorted = [...notes].sort((a, b) => a.pitch - b.pitch)
  const minLen = 16
  const maxLen = 56
  const range = 83 - 48
  return (
    <div className="preview-chimes">
      {sorted.map(n => {
        const t = (n.pitch - 48) / range
        const h = maxLen - t * (maxLen - minLen)
        return (
          <div
            key={n.id}
            className="preview-chime"
            style={{
              height: `${h}px`,
              background: pitchToColorCss(n.pitch, 0.6 + (n.velocity - 1) / 9 * 0.4),
              boxShadow: n.velocity > 7 ? `0 0 ${n.velocity / 2}px ${pitchToColorCss(n.pitch, 0.5)}` : undefined
            }}
          />
        )
      })}
    </div>
  )
}

function LikeButton({
  likes,
  liked,
  onLike,
  compositionId
}: {
  likes: number
  liked: boolean
  onLike: () => void
  compositionId: string
}) {
  const [particles, setParticles] = useState<{ id: number; tx: number; ty: number }[]>([])
  const particleIdRef = useRef(0)
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    if (liked) return
    onLike()

    const newParticles = Array.from({ length: 12 }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = 40 + Math.random() * 30
      particleIdRef.current += 1
      return {
        id: particleIdRef.current,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist
      }
    })
    setParticles(p => [...p, ...newParticles])
    setTimeout(() => {
      setParticles(p => p.filter(pp => !newParticles.find(np => np.id === pp.id)))
    }, 900)
  }

  return (
    <button
      ref={btnRef}
      className={`like-button ${liked ? 'liked' : ''}`}
      onClick={handleClick}
    >
      <span className="heart-icon">{liked ? '❤️' : '🤍'}</span>
      <span>{likes}</span>
      {particles.map(p => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: '50%',
            top: '50%',
            ['--tx' as any]: `${p.tx}px`,
            ['--ty' as any]: `${p.ty}px`
          } as React.CSSProperties}
        />
      ))}
    </button>
  )
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname + window.location.hash)
  const [notes, setNotes] = useState<EditorNote[]>(DEFAULT_NOTES)
  const [selectedVelocity, setSelectedVelocity] = useState(6)
  const [currentComposition, setCurrentComposition] = useState<Composition | null>(null)
  const [tab, setTab] = useState<Tab>('editor')
  const [gallery, setGallery] = useState<PaginatedResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewComposition, setViewComposition] = useState<Composition | null>(null)
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [shareLinkCopied, setShareLinkCopied] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { onLikeUpdate } = useSocket()

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname + window.location.hash)
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    const match = path.match(/\/view\/([a-zA-Z0-9-]+)/)
    if (match) {
      fetchViewComposition(match[1])
    }
  }, [path])

  useEffect(() => {
    const unsub = onLikeUpdate((data) => {
      setGallery(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === data.id || item.hash === data.hash
              ? { ...item, likes: data.likes }
              : item
          )
        }
      })
      setCurrentComposition(prev =>
        prev && (prev.id === data.id || prev.hash === data.hash)
          ? { ...prev, likes: data.likes }
          : prev
      )
      setViewComposition(prev =>
        prev && (prev.id === data.id || prev.hash === data.hash)
          ? { ...prev, likes: data.likes }
          : prev
      )
    })
    return unsub
  }, [onLikeUpdate])

  const navigate = useCallback((newPath: string) => {
    window.history.pushState({}, '', newPath)
    setPath(newPath)
  }, [])

  const fetchGallery = useCallback(async (p: number = 1) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/compositions?page=${p}&pageSize=6`)
      if (!res.ok) throw new Error('加载失败')
      const data: PaginatedResponse = await res.json()
      setGallery(data)
      setPage(data.page)
    } catch (e: any) {
      setErrorMsg(e.message || '加载失败，请检查后端是否启动')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchViewComposition = useCallback(async (idOrHash: string) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/compositions/${idOrHash}`)
      if (!res.ok) throw new Error('作品不存在')
      const data: Composition = await res.json()
      setViewComposition(data)
    } catch (e: any) {
      setErrorMsg(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'gallery' && !gallery) {
      fetchGallery(1)
    }
  }, [tab, gallery, fetchGallery])

  const handleGenerate = async () => {
    if (notes.length === 0) {
      setErrorMsg('请先添加至少一个音符')
      return
    }
    if (notes.length > 16) {
      setErrorMsg('音符数量不能超过16个')
      return
    }
    setIsGenerating(true)
    setErrorMsg(null)
    try {
      const velocities = notes.map(n => n.velocity)
      const res = await fetch('/api/compositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, velocities })
      })
      if (!res.ok) throw new Error('生成失败')
      const comp: Composition = await res.json()
      setCurrentComposition(comp)
      setGallery(null)
      navigate('/')
    } catch (e: any) {
      setErrorMsg(e.message || '生成失败，请检查后端是否启动')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLike = useCallback(async (compId: string) => {
    if (likedMap[compId]) return
    setLikedMap(prev => ({ ...prev, [compId]: true }))
    try {
      const res = await fetch(`/api/compositions/${compId}/like`, { method: 'PATCH' })
      if (!res.ok) throw new Error('点赞失败')
    } catch {
      setLikedMap(prev => ({ ...prev, [compId]: false }))
    }
  }, [likedMap])

  const copyShareLink = useCallback(async (comp: Composition) => {
    const link = `${window.location.origin}/view/${comp.hash}`
    try {
      await navigator.clipboard.writeText(link)
      setShareLinkCopied(comp.id)
      setTimeout(() => setShareLinkCopied(null), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setShareLinkCopied(comp.id)
      setTimeout(() => setShareLinkCopied(null), 2000)
    }
  }, [])

  const handleOpenView = (comp: Composition) => {
    navigate(`/view/${comp.hash}`)
  }

  const clearNotes = () => {
    setNotes([])
    setCurrentComposition(null)
  }

  const isViewRoute = path.startsWith('/view/')

  if (isViewRoute) {
    if (loading) {
      return (
        <div className="container">
          <div className="loading">
            <div className="spinner" />
            <span style={{ marginLeft: 12 }}>加载作品中...</span>
          </div>
        </div>
      )
    }

    if (!viewComposition) {
      return (
        <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
          <h2 style={{ marginBottom: 16 }}>作品未找到</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{errorMsg || '链接可能已失效'}</p>
          <button className="primary" onClick={() => navigate('/')}>返回首页</button>
        </div>
      )
    }

    const chimeNotes: ChimeNote[] = viewComposition.notes.map(n => ({
      pitch: n.pitch,
      time: n.time,
      duration: n.duration,
      velocity: n.velocity
    }))

    return (
      <div className="container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回创作
        </button>

        <div className="header">
          <h1>🎐 风铃观赏</h1>
          <p>创建于 {formatDate(viewComposition.createdAt)}</p>
        </div>

        <SceneViewer notes={chimeNotes} compositionId={viewComposition.id} />

        <div className="actions-row">
          <LikeButton
            likes={viewComposition.likes}
            liked={!!likedMap[viewComposition.id]}
            onLike={() => handleLike(viewComposition.id)}
            compositionId={viewComposition.id}
          />
          <button
            className="secondary"
            onClick={() => copyShareLink(viewComposition)}
          >
            {shareLinkCopied === viewComposition.id ? '✅ 链接已复制' : '🔗 复制分享链接'}
          </button>
        </div>

        {shareLinkCopied === viewComposition.id && (
          <div className="share-row">
            <input
              className="share-link"
              readOnly
              value={`${window.location.origin}/view/${viewComposition.hash}`}
            />
          </div>
        )}
      </div>
    )
  }

  const chimeNotes: ChimeNote[] = (currentComposition?.notes || notes).map(n => ({
    pitch: n.pitch,
    time: n.time,
    duration: n.duration,
    velocity: n.velocity
  }))

  return (
    <div className="container">
      <div className="header">
        <h1>🎐 风铃图谱</h1>
        <p>创作一段旋律，聆听风的吟唱</p>
      </div>

      <div className="tabs">
        <div
          className={`tab ${tab === 'editor' ? 'active' : ''}`}
          onClick={() => setTab('editor')}
        >
          ✏️ 创作
        </div>
        <div
          className={`tab ${tab === 'gallery' ? 'active' : ''}`}
          onClick={() => setTab('gallery')}
        >
          🎨 作品廊
        </div>
      </div>

      {errorMsg && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          background: '#ffe8e8',
          color: '#e74c3c',
          marginBottom: 20,
          textAlign: 'center'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {tab === 'editor' && (
        <>
          <div className="card">
            <h2 className="section-title" style={{ textAlign: 'center' }}>🎵 音符编辑器</h2>

            <div className="toolbar">
              <span className="velocity-display">
                ⚡ 默认力度: <strong style={{ color: 'var(--accent)' }}>{selectedVelocity}</strong>/10
              </span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={selectedVelocity}
                onChange={e => setSelectedVelocity(parseInt(e.target.value))}
                style={{ width: 160, height: 44 }}
              />
              <button className="danger" onClick={clearNotes}>🗑️ 清空</button>
              <button
                className="primary"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{ opacity: isGenerating ? 0.6 : 1 }}
              >
                {isGenerating ? '⏳ 生成中...' : '✨ 生成风铃'}
              </button>
            </div>

            <NoteEditor
              notes={notes}
              onChange={setNotes}
              selectedVelocity={selectedVelocity}
              onVelocityChange={setSelectedVelocity}
            />

            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              音符: <strong>{notes.length}</strong>/16 · 点击添加 · 拖拽移动 · 双击删除 · 选中后调整力度
            </div>
          </div>

          <div style={{ height: 24 }} />

          <div className="card">
            <h2 className="section-title" style={{ textAlign: 'center' }}>
              🔔 风铃预览
              {currentComposition && (
                <span style={{
                  fontSize: 13,
                  color: 'var(--success)',
                  fontWeight: 400,
                  marginLeft: 12
                }}>
                  ✓ 已发布 · {formatDate(currentComposition.createdAt)}
                </span>
              )}
            </h2>

            <SceneViewer notes={chimeNotes} compositionId={currentComposition?.id} />

            {currentComposition && (
              <div className="actions-row">
                <LikeButton
                  likes={currentComposition.likes}
                  liked={!!likedMap[currentComposition.id]}
                  onLike={() => handleLike(currentComposition.id)}
                  compositionId={currentComposition.id}
                />
                <button className="secondary" onClick={() => copyShareLink(currentComposition)}>
                  {shareLinkCopied === currentComposition.id ? '✅ 已复制' : '🔗 复制分享链接'}
                </button>
                <button className="primary" onClick={() => handleOpenView(currentComposition)}>
                  👀 进入观赏页
                </button>
              </div>
            )}

            {currentComposition && shareLinkCopied === currentComposition.id && (
              <div className="share-row">
                <input
                  className="share-link"
                  readOnly
                  value={`${window.location.origin}/view/${currentComposition.hash}`}
                />
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'gallery' && (
        <div>
          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <span style={{ marginLeft: 12 }}>加载作品廊...</span>
            </div>
          ) : gallery && gallery.items.length > 0 ? (
            <>
              <div className="compositions-grid">
                {gallery.items.map(comp => (
                  <div
                    key={comp.id}
                    className="composition-card"
                    onClick={() => handleOpenView(comp)}
                  >
                    <ChimePreview notes={comp.notes} />
                    <h3>🎐 {comp.notes.length} 音符风铃</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {formatDate(comp.createdAt)}
                    </div>
                    <div className="meta">
                      <LikeButton
                        likes={comp.likes}
                        liked={!!likedMap[comp.id]}
                        onLike={(e?: any) => {
                          if (e) e.stopPropagation()
                          handleLike(comp.id)
                        } as any}
                        compositionId={comp.id}
                      />
                      <button
                        className="secondary"
                        style={{ minWidth: 44, padding: '6px 14px' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          copyShareLink(comp)
                        }}
                      >
                        {shareLinkCopied === comp.id ? '✅' : '🔗'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {gallery.totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => fetchGallery(page - 1)}
                  >
                    ←
                  </button>
                  <span className="page-info">
                    第 {page} / {gallery.totalPages} 页 · 共 {gallery.total} 个作品
                  </span>
                  <button
                    disabled={page >= gallery.totalPages}
                    onClick={() => fetchGallery(page + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="card empty-state">
              <h3>🌸 作品廊是空的</h3>
              <p style={{ marginTop: 8 }}>去「创作」页面，成为第一个创作者吧！</p>
              <div style={{ marginTop: 20 }}>
                <button className="primary" onClick={() => setTab('editor')}>✏️ 立即创作</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
