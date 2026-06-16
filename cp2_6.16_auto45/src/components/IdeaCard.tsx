import React, { useState, useCallback } from 'react'
import { Clock, MessageSquare, X, Check } from 'lucide-react'
import type { Idea } from '../api'

const TAG_COLORS = [
  '#4a90d9', '#d94a7a', '#4ad9a0', '#d9a04a',
  '#9b59b6', '#1abc9c', '#e74c3c', '#3498db',
  '#f39c12', '#2ecc71', '#e67e22', '#8e44ad',
]

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface IdeaCardProps {
  idea: Idea
  onUpdateNote: (id: string, note: string) => Promise<void>
  onUpdateContent: (id: string, content: string) => Promise<void>
  isNew: boolean
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onUpdateNote, onUpdateContent, isNew }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [editing, setEditing] = useState<'content' | 'note' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showOverlay, setShowOverlay] = useState(false)

  const handleTextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(idea.content)
    setEditing('content')
    setShowOverlay(true)
  }, [idea.content])

  const handleNoteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(idea.note || '')
    setEditing('note')
    setShowOverlay(true)
  }, [idea.note])

  const handleSave = useCallback(async () => {
    if (editing === 'content' && editValue.trim()) {
      await onUpdateContent(idea.id, editValue.trim())
    } else if (editing === 'note') {
      await onUpdateNote(idea.id, editValue)
    }
    setEditing(null)
    setShowOverlay(false)
  }, [editing, editValue, idea.id, onUpdateContent, onUpdateNote])

  const handleCancel = useCallback(() => {
    setEditing(null)
    setShowOverlay(false)
  }, [])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }, [handleCancel])

  return (
    <>
      <div
        style={{
          ...styles.card,
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered ? '0 8px 24px #6c63ff66' : 'none',
          animation: isNew ? 'fadeIn 0.3s ease' : 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <p
          onClick={handleTextClick}
          style={styles.content}
        >
          {idea.content}
        </p>
        {idea.note && (
          <div
            onClick={handleNoteClick}
            style={styles.noteRow}
          >
            <MessageSquare size={12} style={{ color: '#6c63ff', flexShrink: 0 }} />
            <span style={styles.noteText}>{idea.note}</span>
          </div>
        )}
        <div style={styles.tags}>
          {idea.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                ...styles.tag,
                background: getTagColor(tag) + '33',
                color: getTagColor(tag),
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div style={styles.timeRow}>
          <Clock size={12} style={{ color: '#6a6a8e' }} />
          <span style={styles.timeText}>{formatTime(idea.createdAt)}</span>
        </div>
      </div>

      {showOverlay && (
        <div style={styles.overlay} onClick={handleOverlayClick}>
          <div style={styles.editPanel}>
            <div style={styles.editHeader}>
              <span style={styles.editTitle}>
                {editing === 'content' ? '编辑内容' : '添加备注'}
              </span>
              <button onClick={handleCancel} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={styles.editTextarea}
              autoFocus
            />
            <div style={styles.editActions}>
              <button onClick={handleCancel} style={styles.cancelBtn}>
                取消
              </button>
              <button onClick={handleSave} style={styles.saveBtn}>
                <Check size={14} style={{ marginRight: 4 }} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: 260,
    minHeight: 100,
    maxHeight: 280,
    background: '#252540',
    borderRadius: 12,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    cursor: 'default',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    overflow: 'hidden',
    breakInside: 'avoid',
    marginBottom: 16,
  },
  content: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
    cursor: 'pointer',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  noteRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    cursor: 'pointer',
  },
  noteText: {
    color: '#8a8aae',
    fontSize: 12,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 16,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
  },
  timeText: {
    color: '#6a6a8e',
    fontSize: 11,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  editPanel: {
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    width: 420,
    maxWidth: '90vw',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  editHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editTitle: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6a6a8e',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  editTextarea: {
    width: '100%',
    height: 120,
    background: '#2a2a3e',
    border: '2px solid #4a4a5e',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 1.6,
    padding: 12,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  editActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    padding: '8px 18px',
    borderRadius: 8,
    background: '#2a2a3e',
    color: '#8a8aae',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'background 0.2s ease',
  },
  saveBtn: {
    padding: '8px 18px',
    borderRadius: 8,
    background: '#6c63ff',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s ease',
  },
}

export default IdeaCard
