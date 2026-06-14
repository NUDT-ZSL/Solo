import React, { useState, useRef, useEffect } from 'react'
import type { Annotation } from '@/types'
import { eventBus } from '@/utils/EventBus'

interface AnnotationCardProps {
  annotation: Annotation
  index: number
  style?: React.CSSProperties
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({
  annotation,
  index,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [text, setText] = useState(annotation.text)
  const [isDeleting, setIsDeleting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText(annotation.text)
  }, [annotation.text])

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`

    return date.toLocaleDateString('zh-CN')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    setTimeout(() => {
      eventBus.emit('annotation:delete', annotation.id)
    }, 300)
  }

  const handleCardClick = () => {
    setIsExpanded(!isExpanded)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    eventBus.emit('annotation:update', {
      id: annotation.id,
      text: newText,
    })
  }

  return (
    <div
      style={{
        width: '300px',
        borderRadius: '12px',
        backgroundColor: '#2d3748',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        opacity: isDeleting ? 0 : 1,
        transform: isDeleting ? 'scale(0.95)' : 'scale(1)',
        marginBottom: '12px',
        ...style,
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <img
          src={annotation.avatarUrl}
          alt={annotation.author}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: '#4a5568',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                }}
              >
                {annotation.author}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#718096',
                }}
              >
                #{index + 1}
              </span>
            </div>
            <button
              onClick={handleDelete}
              style={{
                width: '16px',
                height: '16px',
                padding: 0,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.currentTarget.style.transform = 'scale(0.9)'
              }}
              onMouseUp={(e) => {
                e.stopPropagation()
                e.currentTarget.style.transform = 'scale(1.2)'
              }}
              title="删除批注"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#718096',
              marginBottom: '8px',
            }}
          >
            {formatTime(annotation.timestamp)}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#a0aec0',
              marginBottom: '6px',
            }}
          >
            UV: ({annotation.uvCoord.u.toFixed(3)}, {annotation.uvCoord.v.toFixed(3)})
          </div>

          {!isExpanded ? (
            <div
              style={{
                fontSize: '13px',
                color: '#e2e8f0',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {annotation.text || '点击添加批注内容...'}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              placeholder="在此输入批注..."
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                height: '80px',
                borderRadius: '8px',
                backgroundColor: '#1a202c',
                color: '#e2e8f0',
                border: '1px solid #4a5568',
                padding: '8px 10px',
                fontSize: '13px',
                lineHeight: 1.5,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AnnotationCard
