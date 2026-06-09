import React, { useState, useEffect, useRef, useCallback } from 'react'
import ColorWheel, { ColorOption } from './components/ColorWheel'
import { ArtState, createArtState, drawArt } from './utils/artGenerator'
import { SoundSynthesizer, drawFrequencyBars } from './utils/soundSynthesizer'

interface DiaryEntry {
  id: string
  color: string
  colorName: string
  text: string
  date: string
  shortLink: string
  createdAt: number
}

interface ThumbCanvas {
  canvas: HTMLCanvasElement | null
  state: ArtState
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const App: React.FC = () => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [diaryText, setDiaryText] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shareCopied, setShareCopied] = useState<string | null>(null)
  const [isSharedView, setIsSharedView] = useState(false)

  const detailCanvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const detailArtStateRef = useRef<ArtState | null>(null)
  const thumbCanvasesRef = useRef<Map<string, ThumbCanvas>>(new Map())
  const animationRef = useRef<number>(0)
  const spectrumAnimRef = useRef<number>(0)
  const soundSynthRef = useRef<SoundSynthesizer>(new SoundSynthesizer())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchDiaries = useCallback(async () => {
    try {
      const res = await fetch('/api/diaries')
      const data = await res.json()
      setDiaries(data)
    } catch (err) {
      console.error('加载日记失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/s/')) {
      const shortLink = path.slice(3)
      setIsSharedView(true)
      fetch(`/s/${shortLink}`)
        .then((r) => r.json())
        .then((data: DiaryEntry) => {
          setSelectedEntry(data)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    } else {
      fetchDiaries()
    }
  }, [fetchDiaries])

  const handleColorSelect = (color: ColorOption) => {
    setSelectedColor(color)
    setShowInput(true)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleSubmit = async () => {
    if (!selectedColor || !diaryText.trim()) return

    try {
      const res = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          color: selectedColor.hex,
          colorName: selectedColor.name,
          text: diaryText.trim()
        })
      })

      if (res.ok) {
        const entry = await res.json()
        setDiaries((prev) => [entry, ...prev])
        setSelectedColor(null)
        setDiaryText('')
        setShowInput(false)
      }
    } catch (err) {
      console.error('保存日记失败:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/diaries/${id}`, { method: 'DELETE' })
      setDiaries((prev) => prev.filter((d) => d.id !== id))
      if (selectedEntry?.id === id) {
        setSelectedEntry(null)
      }
    } catch (err) {
      console.error('删除日记失败:', err)
    }
  }

  const handleShare = async (entry: DiaryEntry) => {
    const shareUrl = `${window.location.origin}/s/${entry.shortLink}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(entry.id)
      setTimeout(() => setShareCopied(null), 2000)
    } catch {
      window.prompt('复制链接:', shareUrl)
    }
  }

  const handlePlaySound = () => {
    if (!selectedEntry) return

    if (soundSynthRef.current.getIsPlaying()) {
      soundSynthRef.current.stop()
      setIsPlaying(false)
      return
    }

    soundSynthRef.current.play(selectedEntry.color, selectedEntry.date, () => {
      setIsPlaying(false)
    })
    setIsPlaying(true)
  }

  useEffect(() => {
    const animate = (time: number) => {
      for (const [, thumb] of thumbCanvasesRef.current) {
        if (thumb.canvas) {
          const ctx = thumb.canvas.getContext('2d')
          if (ctx) {
            const w = thumb.canvas.width
            const h = thumb.canvas.height
            drawArt(ctx, getDiaryColor(thumb), w, h, thumb.state, time, false)
          }
        }
      }

      if (detailCanvasRef.current && detailArtStateRef.current && selectedEntry) {
        const ctx = detailCanvasRef.current.getContext('2d')
        if (ctx) {
          const w = detailCanvasRef.current.width
          const h = detailCanvasRef.current.height
          drawArt(
            ctx,
            selectedEntry.color,
            w,
            h,
            detailArtStateRef.current,
            time,
            isPlaying
          )
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [diaries, selectedEntry, isPlaying])

  const getDiaryColor = (thumb: ThumbCanvas): string => {
    for (const [id, t] of thumbCanvasesRef.current) {
      if (t === thumb) {
        const d = diaries.find((x) => x.id === id) || selectedEntry
        return d?.color || '#FFB347'
      }
    }
    return '#FFB347'
  }

  useEffect(() => {
    const animate = () => {
      if (spectrumCanvasRef.current && selectedEntry) {
        const ctx = spectrumCanvasRef.current.getContext('2d')
        if (ctx) {
          const w = spectrumCanvasRef.current.width
          const h = spectrumCanvasRef.current.height
          drawFrequencyBars(ctx, soundSynthRef.current.getAnalyser(), w, h, selectedEntry.color)
        }
      }
      spectrumAnimRef.current = requestAnimationFrame(animate)
    }
    spectrumAnimRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(spectrumAnimRef.current)
  }, [selectedEntry, isPlaying])

  const registerThumbCanvas = (
    id: string,
    canvas: HTMLCanvasElement | null,
    color: string
  ) => {
    if (!canvas) return
    if (!thumbCanvasesRef.current.has(id)) {
      const w = canvas.width
      const h = canvas.height
      thumbCanvasesRef.current.set(id, {
        canvas,
        state: createArtState(w, h, color)
      })
    } else {
      const existing = thumbCanvasesRef.current.get(id)
      if (existing) existing.canvas = canvas
    }
  }

  useEffect(() => {
    if (selectedEntry && detailCanvasRef.current) {
      const w = detailCanvasRef.current.width
      const h = detailCanvasRef.current.height
      detailArtStateRef.current = createArtState(w, h, selectedEntry.color)
    }
  }, [selectedEntry])

  useEffect(() => {
    return () => {
      soundSynthRef.current.stop()
    }
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1E2024',
        color: '#fff',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
      }}
    >
      <header
        style={{
          background: 'linear-gradient(90deg, #FFB347, #89CFF0)',
          padding: '16px 24px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)'
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: 1 }}>
            情绪色彩日记
          </h1>
          {isSharedView && (
            <span
              style={{
                fontSize: '12px',
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 12px',
                borderRadius: 12
              }}
            >
              分享视图
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {!isSharedView && (
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
              padding: '32px',
              marginBottom: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: '18px', fontWeight: 500 }}>
              选择今日心情色
            </h2>
            <p
              style={{
                marginTop: 0,
                marginBottom: 24,
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              从12种柔和色调中挑选代表你此刻心情的颜色
            </p>
            <ColorWheel selectedColor={selectedColor} onSelect={handleColorSelect} />

            {showInput && (
              <div
                style={{
                  marginTop: 28,
                  width: '100%',
                  maxWidth: 480,
                  animation: 'slideIn 0.3s cubic-bezier(0.25,0.1,0.25,1)'
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value.slice(0, 200))}
                  placeholder="写下今天的心情日记...（限200字）"
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = selectedColor?.hex || 'rgba(255,255,255,0.3)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color:
                        diaryText.length >= 180
                          ? '#FF6B6B'
                          : 'rgba(255,255,255,0.4)'
                    }}
                  >
                    {diaryText.length}/200
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => {
                        setShowInput(false)
                        setSelectedColor(null)
                        setDiaryText('')
                      }}
                      style={{
                        padding: '8px 20px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!diaryText.trim()}
                      style={{
                        padding: '8px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: diaryText.trim()
                          ? selectedColor?.hex || '#FFB347'
                          : 'rgba(255,255,255,0.1)',
                        color: diaryText.trim() ? '#1E2024' : 'rgba(255,255,255,0.3)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: diaryText.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                      }}
                    >
                      保存日记
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isSharedView ? (
          selectedEntry && (
            <DetailPanel
              entry={selectedEntry}
              detailCanvasRef={detailCanvasRef}
              spectrumCanvasRef={spectrumCanvasRef}
              isPlaying={isPlaying}
              onPlay={handlePlaySound}
              onClose={() => {}}
              shareCopied={null}
              onShare={() => {}}
              onDelete={() => {}}
              isShared={true}
            />
          )
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 32
            }}
          >
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '16px', fontWeight: 500 }}>
                时间轴 · {diaries.length} 条日记
              </h3>
              {loading ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)'
                  }}
                >
                  加载中...
                </div>
              ) : diaries.length === 0 ? (
                <div
                  style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 16
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
                  <p>还没有日记，选择一种颜色开始记录吧！</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 28 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 7,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      background: 'linear-gradient(180deg, #FFB347, #89CFF0)',
                      borderRadius: 2
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {diaries.map((entry, idx) => (
                      <div key={entry.id} style={{ position: 'relative' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: -25,
                            top: 36,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: entry.color,
                            boxShadow: `0 0 0 3px #1E2024, 0 0 0 4px ${entry.color}55`,
                            zIndex: 1
                          }}
                        />
                        <div
                          onClick={() => setSelectedEntry(entry)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: 16,
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.04)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border:
                              selectedEntry?.id === entry.id
                                ? `2px solid ${entry.color}`
                                : '2px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <canvas
                            ref={(el) =>
                              registerThumbCanvas(entry.id, el, entry.color)
                            }
                            width={100}
                            height={100}
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 10,
                              flexShrink: 0,
                              background: '#15171A'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 6
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: entry.color
                                }}
                              >
                                {entry.colorName}
                              </span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: entry.color
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                color: 'rgba(255,255,255,0.85)',
                                lineHeight: 1.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const
                              }}
                            >
                              {entry.text}
                            </div>
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.4)'
                              }}
                            >
                              {formatDate(entry.date)}
                              {idx === 0 && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    padding: '2px 8px',
                                    background: 'rgba(255,179,71,0.2)',
                                    color: '#FFB347',
                                    borderRadius: 8,
                                    fontSize: '11px'
                                  }}
                                >
                                  最新
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedEntry && (
              <DetailPanel
                entry={selectedEntry}
                detailCanvasRef={detailCanvasRef}
                spectrumCanvasRef={spectrumCanvasRef}
                isPlaying={isPlaying}
                onPlay={handlePlaySound}
                onClose={() => {
                  if (isPlaying) {
                    soundSynthRef.current.stop()
                    setIsPlaying(false)
                  }
                  setSelectedEntry(null)
                }}
                shareCopied={shareCopied}
                onShare={() => handleShare(selectedEntry)}
                onDelete={() => handleDelete(selectedEntry.id)}
                isShared={false}
              />
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (min-width: 900px) {
          main > div[style*="grid-template-columns: 1fr"] {
            grid-template-columns: 380px 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

interface DetailPanelProps {
  entry: DiaryEntry
  detailCanvasRef: React.RefObject<HTMLCanvasElement>
  spectrumCanvasRef: React.RefObject<HTMLCanvasElement>
  isPlaying: boolean
  onPlay: () => void
  onClose: () => void
  shareCopied: string | null
  onShare: () => void
  onDelete: () => void
  isShared: boolean
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  entry,
  detailCanvasRef,
  spectrumCanvasRef,
  isPlaying,
  onPlay,
  onClose,
  shareCopied,
  onShare,
  onDelete,
  isShared
}) => {
  return (
    <div
      style={{
        animation: 'slideUp 0.3s cubic-bezier(0.25,0.1,0.25,1)',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        padding: 28,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        height: 'fit-content',
        position: 'sticky',
        top: 24,
        border: `1px solid ${entry.color}33`
      }}
    >
      {!isShared && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 8
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              width: 28,
              height: 28,
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: entry.color,
            boxShadow: `0 0 12px ${entry.color}88`
          }}
        />
        <span style={{ fontSize: 16, fontWeight: 600, color: entry.color }}>
          {entry.colorName}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {formatDate(entry.date)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 24
        }}
      >
        <canvas
          ref={detailCanvasRef}
          width={400}
          height={400}
          style={{
            width: '100%',
            maxWidth: 400,
            aspectRatio: '1',
            borderRadius: 16,
            background: '#15171A',
            boxShadow: `0 4px 30px ${entry.color}22`
          }}
        />
      </div>

      <div
        style={{
          padding: 16,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          marginBottom: 20,
          fontSize: '15px',
          lineHeight: 1.8,
          color: 'rgba(255,255,255,0.9)'
        }}
      >
        {entry.text}
      </div>

      <canvas
        ref={spectrumCanvasRef}
        width={400}
        height={60}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 10,
          background: '#15171A',
          marginBottom: 16
        }}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={onPlay}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: 10,
            border: `2px solid ${entry.color}`,
            background: isPlaying ? `${entry.color}22` : entry.color,
            color: isPlaying ? entry.color : '#1E2024',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {isPlaying ? (
            <>
              <span>⏹</span> 停止播放
            </>
          ) : (
            <>
              <span>▶</span> 播放情绪音效
            </>
          )}
        </button>
      </div>

      {!isShared && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onShare}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {shareCopied === entry.id ? '✓ 已复制链接' : '🔗 分享日记'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('确定要删除这条日记吗？')) {
                onDelete()
              }
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,107,107,0.3)',
              background: 'rgba(255,107,107,0.08)',
              color: '#FF6B6B',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  )
}

export default App
