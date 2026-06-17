import { useEffect, useState } from 'react'
import type { KnowledgePoint, AssessmentRecord } from '../types'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from './KnowledgeGraph'

interface DetailModalProps {
  kp: KnowledgePoint | null
  assessment?: AssessmentRecord
  onClose: () => void
  onMarkReviewed?: () => void
  isInPath?: boolean
}

export default function DetailModal({
  kp,
  assessment,
  onClose,
  onMarkReviewed,
  isInPath = false
}: DetailModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (kp) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [kp])

  if (!kp) return null

  const score = assessment?.score
  const reviewed = assessment?.reviewed

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: visible ? 'auto' : 'none'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 380,
          background: '#ffffff',
          borderRadius: 12,
          margin: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          transform: visible ? 'translateX(0)' : 'translateX(40px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #e0e0e0',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#f5f5f5',
              color: '#616161',
              fontSize: 16,
              lineHeight: '28px',
              textAlign: 'center',
              padding: 0
            }}
          >
            ×
          </button>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#212121',
              paddingRight: 36,
              lineHeight: 1.4
            }}
          >
            {kp.title}
          </h3>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 12,
                background: DIFFICULTY_COLORS[kp.difficulty],
                color: '#fff',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              {DIFFICULTY_LABELS[kp.difficulty]}
            </span>
            {typeof score === 'number' && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: score < 60 ? '#ffebee' : '#e8f5e9',
                  color: score < 60 ? '#c62828' : '#2e7d32',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                得分: {score}
              </span>
            )}
            {reviewed && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: '#e3f2fd',
                  color: '#1565c0',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                ✓ 已复习
              </span>
            )}
            {isInPath && !reviewed && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: '#fff8e1',
                  color: '#f57f17',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                ⭐ 复习路径
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 14, color: '#424242', lineHeight: 1.8 }}>{kp.description}</div>

          {kp.tags.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>相关标签：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {kp.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: '#f5f5f5',
                      color: '#00bcd4',
                      fontSize: 12
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {isInPath && !reviewed && onMarkReviewed && (
          <div style={{ padding: 16, borderTop: '1px solid #e0e0e0' }}>
            <button
              onClick={onMarkReviewed}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1a237e, #00bcd4)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              完成复习
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
