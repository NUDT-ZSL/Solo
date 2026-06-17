import React, { useState, useCallback } from 'react'
import { Feedback, FeedbackStatus, FeedbackType } from '../utils/api'
import { sentimentEmoji } from '../utils/analysis'

interface KanbanBoardProps {
  feedbacks: Feedback[]
  onStatusChange: (id: string, status: FeedbackStatus) => void
}

const COLUMN_CONFIG: { status: FeedbackStatus; title: string; color: string }[] = [
  { status: 'pending', title: '待处理', color: '#E74C3C' },
  { status: 'processing', title: '处理中', color: '#F39C12' },
  { status: 'closed', title: '已关闭', color: '#2ECC71' }
]

const TYPE_COLORS: Record<FeedbackType, string> = {
  feature: '#3498DB',
  bug: '#E74C3C',
  performance: '#9B59B6'
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  feature: '功能建议',
  bug: 'Bug报告',
  performance: '性能问题'
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

interface CardProps {
  feedback: Feedback
  columnColor: string
  onDragStart: (e: React.DragEvent, id: string) => void
}

const FeedbackCard: React.FC<CardProps> = ({ feedback, columnColor, onDragStart }) => {
  const [expanded, setExpanded] = useState(false)
  const [flash, setFlash] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', feedback.id)
    onDragStart(e, feedback.id)
  }

  React.useEffect(() => {
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 500)
    return () => clearTimeout(timer)
  }, [feedback.status])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        width: 280,
        backgroundColor: flash ? '#F9E79F' : '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderLeft: `5px solid ${columnColor}`,
        cursor: 'grab',
        transition: 'box-shadow 0.2s, background-color 0.5s',
        userSelect: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
      onDragStartCapture={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.2)'
        target.style.opacity = '0.8'
      }}
      onDragEnd={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
        target.style.opacity = '1'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h4
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#333',
            cursor: 'pointer',
            flex: 1,
            lineHeight: 1.4,
            marginBottom: 8
          }}
        >
          {feedback.title}
        </h4>
        <span style={{ fontSize: 16, color: '#888', flexShrink: 0 }} title={feedback.sentiment}>
          {sentimentEmoji[feedback.sentiment]}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
        {formatDate(feedback.createdAt)}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: expanded ? 12 : 0 }}>
        <span
          style={{
            backgroundColor: TYPE_COLORS[feedback.type],
            color: '#fff',
            borderRadius: 4,
            fontSize: 12,
            padding: '2px 8px',
            display: 'inline-block'
          }}
        >
          {TYPE_LABELS[feedback.type]}
        </span>
      </div>

      <div
        style={{
          maxHeight: expanded ? '500px' : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-out',
          marginTop: expanded ? 12 : 0
        }}
      >
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
          {feedback.description}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {feedback.keywords.map((kw, idx) => (
            <span
              key={idx}
              style={{
                backgroundColor: '#F0F0F0',
                borderRadius: 12,
                padding: '4px 12px',
                fontSize: 12,
                color: '#666',
                marginRight: 8
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ feedbacks, onStatusChange }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<FeedbackStatus | null>(null)

  const handleDragStart = useCallback((_e: React.DragEvent, id: string) => {
    setDraggedId(id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: FeedbackStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, status: FeedbackStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) {
      onStatusChange(id, status)
    }
    setDraggedId(null)
    setDragOverStatus(null)
  }, [onStatusChange])

  const getFeedbacksByStatus = (status: FeedbackStatus) => {
    return feedbacks.filter(f => f.status === status)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        padding: 20,
        overflowX: 'auto',
        minHeight: 'calc(100vh - 80px)',
        alignItems: 'flex-start'
      }}
      className="kanban-board"
    >
      {COLUMN_CONFIG.map(col => {
        const columnFeedbacks = getFeedbacksByStatus(col.status)
        const isDragOver = dragOverStatus === col.status

        return (
          <div
            key={col.status}
            style={{
              width: 300,
              flexShrink: 0,
              backgroundColor: isDragOver ? 'rgba(255,255,255,0.95)' : '#ECF0F1',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 120px)',
              transition: 'background-color 0.2s'
            }}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div
              style={{
                backgroundColor: col.color,
                color: '#fff',
                padding: '12px 16px',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{col.title}</span>
              <span
                style={{
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 12,
                  padding: '2px 10px',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {columnFeedbacks.length}
              </span>
            </div>

            <div
              style={{
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                overflowY: 'auto',
                flex: 1
              }}
            >
              {columnFeedbacks.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: '#bbb',
                    fontSize: 13,
                    border: '2px dashed #ddd',
                    borderRadius: 8
                  }}
                >
                  拖拽反馈到这里
                </div>
              )}
              {columnFeedbacks.map(fb => (
                <FeedbackCard
                  key={fb.id}
                  feedback={fb}
                  columnColor={col.color}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default KanbanBoard
