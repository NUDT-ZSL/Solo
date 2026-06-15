import { useEffect, useState } from 'react'
import type { Story } from './App'

interface StoryCardProps {
  story: Story
  onClose: () => void
}

export default function StoryCard({ story, onClose }: StoryCardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        pointerEvents: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(320px, calc(100vw - 48px))',
          maxWidth: '320px',
          background: 'rgba(15,23,42,0.9)',
          borderRadius: '16px',
          WebkitBoxShadow: 'inset 0 0 8px rgba(255,255,255,0.5), 0 25px 50px rgba(0,0,0,0.5)',
          boxShadow: 'inset 0 0 8px rgba(255,255,255,0.5), 0 25px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          transform: visible ? 'scale(1)' : 'scale(0.8)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
          fontFamily: "'Noto Sans SC', sans-serif",
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
          <img
            src={story.imageUrl}
            alt={story.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(transparent, rgba(15,23,42,0.9))',
          }} />
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(15,23,42,0.7)',
              color: '#e2e8f0',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease-out',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.6)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.7)' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: story.dotColor,
            boxShadow: `0 0 8px ${story.dotColor}`,
            marginRight: '10px',
            verticalAlign: 'middle',
          }} />
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: 700,
            color: '#f1f5f9',
            lineHeight: 1.4,
            display: 'inline',
            verticalAlign: 'middle',
          }}>
            {story.title}
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            lineHeight: 1.7,
            color: '#94a3b8',
          }}>
            {story.summary}
          </p>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{
              textTransform: 'uppercase',
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: '1px',
              fontSize: '11px',
              color: '#8b5cf6',
            }}>
              {story.region}
            </span>
            <span>·</span>
            <span>{story.date}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
