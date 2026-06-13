import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { PhotoData } from './PhotoUploader'

interface PhotoSlideshowProps {
  photos: PhotoData[]
  startIndex?: number
  onClose: () => void
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const PhotoSlideshow: React.FC<PhotoSlideshowProps> = ({
  photos,
  startIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [opacity, setOpacity] = useState(1)
  const rafRef = useRef<number | null>(null)

  const sorted = [...photos].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  )

  const goTo = useCallback(
    (nextIndex: number) => {
      if (sorted.length === 0) return
      const clamped = ((nextIndex % sorted.length) + sorted.length) % sorted.length

      setOpacity(0)

      let start: number | null = null
      const duration = 800
      const halfway = duration / 2

      const animate = (ts: number) => {
        if (start === null) start = ts
        const elapsed = ts - start

        if (elapsed < halfway) {
          setOpacity(1 - elapsed / halfway)
        } else if (elapsed === halfway) {
          setCurrentIndex(clamped)
          setOpacity(0)
        } else if (elapsed < duration) {
          setOpacity((elapsed - halfway) / halfway)
        } else {
          setCurrentIndex(clamped)
          setOpacity(1)
          rafRef.current = null
          return
        }
        rafRef.current = requestAnimationFrame(animate)
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(animate)
    },
    [sorted.length]
  )

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'ArrowRight') {
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [goNext, goPrev, onClose])

  const current = sorted[currentIndex]

  if (!current || sorted.length === 0) {
    return null
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0',
        userSelect: 'none'
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: 'none',
          background: 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1.3rem',
          zIndex: 10,
          transition: 'all 0.2s ease-out'
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)')}
      >✕</button>

      <div style={{ position: 'absolute', top: 24, left: 24, fontSize: '0.9rem', color: '#94a3b8', letterSpacing: 1 }}>
        MemoryLens · 幻灯片模式
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '85vw',
          maxHeight: '78vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src={current.dataUrl}
          alt={current.originalName}
          style={{
            maxWidth: '100%',
            maxHeight: '78vh',
            objectFit: 'contain',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            opacity,
            transition: 'opacity 0s linear',
            willChange: 'opacity'
          }}
          draggable={false}
        />
      </div>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.9rem',
          color: '#94a3b8'
        }}
      >
        <span>📅</span>
        <span>{formatDate(current.takenAt)}</span>
        <span style={{ opacity: 0.5, margin: '0 8px' }}>·</span>
        <span style={{ color: '#cbd5e1' }}>{current.originalName}</span>
        <span style={{ opacity: 0.5, margin: '0 8px' }}>·</span>
        <span>{currentIndex + 1} / {sorted.length}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          goPrev()
        }}
        aria-label="上一张"
        style={{
          position: 'absolute',
          left: '3vw',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 56,
          height: 56,
          borderRadius: 28,
          border: 'none',
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1.6rem',
          transition: 'all 0.2s ease-out'
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)')}
      >‹</button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          goNext()
        }}
        aria-label="下一张"
        style={{
          position: 'absolute',
          right: '3vw',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 56,
          height: 56,
          borderRadius: 28,
          border: 'none',
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1.6rem',
          transition: 'all 0.2s ease-out'
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)')}
      >›</button>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6
        }}
      >
        {sorted.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              goTo(i)
            }}
            style={{
              width: i === currentIndex ? 28 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: i === currentIndex
                ? 'linear-gradient(90deg, #f97316, #d946ef)'
                : 'rgba(255,255,255,0.25)',
              cursor: 'pointer',
              transition: 'all 0.3s ease-out'
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default PhotoSlideshow
