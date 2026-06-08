import React from 'react'
import DreamCanvas from './DreamCanvas'

const EMOTION_COLORS: Record<string, string> = {
  恐惧: '#8B0000',
  喜悦: '#FFD700',
  困惑: '#2E8B57',
  忧伤: '#1E3A5F',
  宁静: '#9B8EC4',
  惊奇: '#FF00FF',
}

export interface Dream {
  id: string
  title: string
  description: string
  emotion: string
  created_at: string
}

interface DreamCardProps {
  dream: Dream
  onClick: () => void
  style?: React.CSSProperties
}

const DreamCard: React.FC<DreamCardProps> = ({ dream, onClick, style }) => {
  const emotionColor = EMOTION_COLORS[dream.emotion] || '#666'

  return (
    <div
      onClick={onClick}
      style={{
        ...style,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        border: '1px solid rgba(180,130,255,0.15)',
        boxShadow: `0 0 20px rgba(180,130,255,0.08), 0 4px 16px rgba(0,0,0,0.3)`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, opacity 0.4s ease',
        opacity: 1,
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
        e.currentTarget.style.boxShadow = `0 0 30px ${emotionColor}33, 0 8px 24px rgba(0,0,0,0.4)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = `0 0 20px rgba(180,130,255,0.08), 0 4px 16px rgba(0,0,0,0.3)`
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: 160 }}>
        <DreamCanvas emotion={dream.emotion} width={280} height={160} animated={false} />
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: emotionColor,
            boxShadow: `0 0 8px ${emotionColor}`,
          }}
        />
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <h3
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 16,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.75)',
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {dream.title}
        </h3>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {dream.description}
        </p>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              color: emotionColor,
              opacity: 0.8,
            }}
          >
            {dream.emotion}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            {new Date(dream.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  )
}

export { EMOTION_COLORS }
export default DreamCard
