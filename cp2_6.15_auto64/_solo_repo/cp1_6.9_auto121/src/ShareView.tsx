import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Palette, getPalette, submitFeedback, PRESET_COLORS, Feedback } from './api'

interface ShareViewProps {
  isOwner?: boolean
}

interface FloatingDot {
  id: string
  color: string
  x: number
  y: number
  offsetX: number
  startY: number
}

export default function ShareView({ isOwner = false }: ShareViewProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [palette, setPalette] = useState<Palette | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [floatingDots, setFloatingDots] = useState<FloatingDot[]>([])
  const [showStamp, setShowStamp] = useState(false)
  const [stampPosition, setStampPosition] = useState({ x: 0, y: 0 })
  const starfieldRef = useRef<HTMLDivElement>(null)
  const pickerPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPalette(id)
      .then(data => {
        setPalette(data)
        if (data.feedbacks.length > 0) {
          const initialDots = data.feedbacks.map(f => ({
            id: f.id,
            color: f.color,
            x: 50 + Math.random() * 900,
            y: 40 + Math.random() * 160,
            offsetX: 0,
            startY: 40 + Math.random() * 160,
          }))
          setFloatingDots(initialDots)
        }
      })
      .catch(err => setError(err.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  const handleFeedbackClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    pickerPosRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top,
    }
    setShowPicker(true)
  }

  const handleColorSelect = async (color: string) => {
    if (!id || submitting) return
    setShowPicker(false)
    setSubmitting(true)

    try {
      const fb = await submitFeedback(id, color)
      const startX = pickerPosRef.current.x
      const startY = pickerPosRef.current.y
      const starfieldRect = starfieldRef.current?.getBoundingClientRect()
      const relX = starfieldRect ? startX - starfieldRect.left : 400
      const relY = starfieldRect ? startY - starfieldRect.top : 0

      const offsetX = (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 50)
      const finalY = 50 + Math.random() * 150

      const newDot: FloatingDot = {
        id: fb.id || `temp-${Date.now()}`,
        color,
        x: relX + offsetX,
        y: finalY,
        offsetX,
        startY: relY,
      }

      setFloatingDots(prev => [...prev, newDot])
      setStampPosition({ x: relX + offsetX, y: finalY - 20 })
      setShowStamp(true)
      setTimeout(() => setShowStamp(false), 2000)

      setPalette(prev => prev ? { ...prev, feedbacks: [...prev.feedbacks, fb] } : prev)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  if (error || !palette) {
    return (
      <div className="card" style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>😢</div>
        <h2 style={{ marginBottom: 12 }}>调色板不存在</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>{error || '该调色板可能已被删除'}</p>
        <button className="btn" onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  const firstColor = palette.colors[0]?.hex || '#FFFFFF'
  const lastColor = palette.colors[palette.colors.length - 1]?.hex || '#FFFFFF'
  const middleColors = palette.colors.slice(1, -1).map(c => c.hex)
  const gradientStops = [firstColor, ...middleColors, lastColor]
  const gradientStr = gradientStops.join(', ')

  const styles: Record<string, React.CSSProperties> = {
    shareView: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    },
    navBar: isOwner ? {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 32px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    } : { display: 'none' },
    heroSection: {
      flex: 1,
      position: 'relative',
      minHeight: 400,
      background: `linear-gradient(to right, ${gradientStr})`,
      backgroundSize: `${gradientStops.length * 100}% 100%`,
      animation: 'gradientShift 3s ease-in-out infinite alternate',
      padding: '60px 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    paletteTitle: {
      fontSize: 42,
      fontWeight: 700,
      color: 'white',
      textShadow: '0 2px 12px rgba(0,0,0,0.3)',
      marginBottom: 12,
      textAlign: 'center',
    },
    paletteEmotion: {
      fontSize: 18,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 48,
      textShadow: '0 1px 6px rgba(0,0,0,0.2)',
    },
    colorsRow: {
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 900,
      marginBottom: 60,
    },
    colorCard: {
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 16,
      padding: 16,
      minWidth: 110,
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      transition: 'transform 0.2s ease',
      cursor: 'default',
    },
    colorPreview: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      margin: '0 auto 12px',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
      border: '3px solid white',
    },
    colorHex: {
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 600,
      color: '#2C3E50',
      marginBottom: 4,
    },
    colorEmotion: {
      fontSize: 12,
      color: '#7F8C8D',
      fontWeight: 500,
    },
    feedbackSection: {
      background: '#FFFFFF',
      padding: '40px 32px 80px',
      position: 'relative',
    },
    sectionLabel: {
      textAlign: 'center',
      fontSize: 14,
      color: '#888',
      marginBottom: 8,
    },
    feedbackBtn: {
      display: 'block',
      margin: '0 auto 32px',
      padding: '14px 32px',
      fontSize: 15,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: 30,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
    },
    starfield: {
      position: 'relative',
      minHeight: 260,
      background: 'linear-gradient(180deg, #FAFAF7 0%, #F0F0EB 100%)',
      borderRadius: 16,
      overflow: 'hidden',
    },
    floatingDot: {
      position: 'absolute',
      width: 14,
      height: 14,
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2), 0 0 12px currentColor',
      pointerEvents: 'none',
    },
    stampText: {
      position: 'absolute',
      transform: 'translate(-50%, -50%) rotate(-6deg)',
      fontFamily: '"Ma Shan Zheng", "Kaiti", "楷体", cursive',
      fontSize: 22,
      color: '#5B6C7F',
      fontWeight: 600,
      opacity: 0.8,
      pointerEvents: 'none',
      animation: 'handwriting 0.6s ease-out forwards',
    },
    colorPicker: {
      position: 'fixed',
      zIndex: 1000,
      background: 'white',
      borderRadius: 50,
      padding: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 10,
    },
    pickerDot: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      cursor: 'pointer',
      border: '3px solid white',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      transition: 'transform 0.15s ease',
    },
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.15)',
      zIndex: 999,
    },
  }

  return (
    <div style={styles.shareView}>
      {isOwner && (
        <div style={styles.navBar}>
          <button className="btn btn-outline" onClick={() => navigate('/')}>
            ← 返回首页
          </button>
          <h2 style={{ fontSize: 16, color: '#5B6C7F' }}>调色板详情</h2>
          <button className="btn" onClick={() => navigator.clipboard.writeText(window.location.href)}>
            🔗 复制链接
          </button>
        </div>
      )}

      <div style={styles.heroSection}>
        <h1 style={styles.paletteTitle}>{palette.name}</h1>
        <p style={styles.paletteEmotion}>情绪分类：{palette.emotion}</p>

        <div style={styles.colorsRow}>
          {palette.colors.map((c, idx) => (
            <div
              key={idx}
              style={styles.colorCard}
              className="color-card"
            >
              <div style={{ ...styles.colorPreview, backgroundColor: c.hex }} />
              <div style={styles.colorHex}>{c.hex}</div>
              <div style={styles.colorEmotion}>{c.emotion}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.feedbackSection}>
        <p style={styles.sectionLabel}>已有 {palette.feedbacks.length} 位朋友留下了情绪印记</p>
        <button
          style={{
            ...styles.feedbackBtn,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
          onClick={handleFeedbackClick}
          disabled={submitting}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.02)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = ''
          }}
        >
          {submitting ? '提交中...' : '✨ 留下你的此时情绪'}
        </button>

        <div ref={starfieldRef} style={styles.starfield}>
          {floatingDots.map(dot => (
            <div
              key={dot.id}
              style={{
                ...styles.floatingDot,
                backgroundColor: dot.color,
                color: dot.color,
                left: Math.max(20, Math.min(dot.x, 800)),
                top: dot.y,
                animation: dot.id.startsWith('temp-') ? 'floatDown 2s ease-out forwards' : undefined,
              }}
            />
          ))}
          {showStamp && (
            <div style={{ ...styles.stampText, left: stampPosition.x, top: stampPosition.y }}>
              已留下印记 ✨
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <>
          <div style={styles.overlay} onClick={() => setShowPicker(false)} />
          <div
            style={{
              ...styles.colorPicker,
              left: Math.min(pickerPosRef.current.x - 140, window.innerWidth - 300),
              top: Math.max(pickerPosRef.current.y - 140, 20),
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {PRESET_COLORS.map(color => (
              <div
                key={color}
                style={{ ...styles.pickerDot, backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = ''
                }}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .color-card:hover {
          transform: translateY(-6px) scale(1.03);
        }
      `}</style>
    </div>
  )
}
