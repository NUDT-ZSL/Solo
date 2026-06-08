import React from 'react'
import type { EmotionResult } from '../utils/emotionAnalysis'

interface InfoCardProps {
  emotion: EmotionResult
  x: number
  y: number
  visible: boolean
}

const InfoCard: React.FC<InfoCardProps> = ({ emotion, x, y, visible }) => {
  if (!visible) return null

  const cardWidth = 200
  const cardHeight = 140
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  let adjustedX = x - cardWidth / 2
  let adjustedY = y - cardHeight - 20

  if (adjustedX < 10) adjustedX = 10
  if (adjustedX + cardWidth > vw - 10) adjustedX = vw - cardWidth - 10
  if (adjustedY < 10) adjustedY = y + 60

  return (
    <div
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        width: cardWidth,
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'fadeInUp 0.25s ease-out forwards',
      }}
    >
      <div
        className="glass-strong"
        style={{
          padding: '16px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: emotion.gradient,
            borderRadius: '16px 16px 0 0',
          }}
        />
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: emotion.color,
            marginBottom: 8,
            letterSpacing: '0.5px',
          }}
        >
          {emotion.label}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {emotion.keywords.map((keyword, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 12,
                background: emotion.colorLight,
                color: emotion.color,
                fontWeight: 500,
                border: `1px solid ${emotion.color}33`,
              }}
            >
              {keyword}
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: '#8a96a8',
          }}
        >
          强度: {(emotion.intensity * 100).toFixed(0)}%
        </div>
        <div
          style={{
            marginTop: 4,
            height: 4,
            borderRadius: 2,
            background: 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 2,
              background: emotion.gradient,
              width: `${emotion.intensity * 100}%`,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default InfoCard
