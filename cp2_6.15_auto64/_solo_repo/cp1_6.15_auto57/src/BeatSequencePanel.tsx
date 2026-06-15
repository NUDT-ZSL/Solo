import { useState } from 'react'
import type { BeatSequence } from './utils/types'

interface BeatSequencePanelProps {
  sequences: BeatSequence[]
  onReorder: (sequences: BeatSequence[]) => void
  onMerge: () => void
  currentColorIndex: number
}

export default function BeatSequencePanel({
  sequences,
  onReorder,
  onMerge,
  currentColorIndex
}: BeatSequencePanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newSequences = [...sequences]
    const [draggedItem] = newSequences.splice(draggedIndex, 1)
    newSequences.splice(dropIndex, 0, draggedItem)
    onReorder(newSequences)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>节拍序列</h3>
        <span style={styles.hint}>拖拽排序</span>
      </div>

      <div style={styles.sequenceList}>
        {sequences.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>暂无节拍序列</p>
            <p style={styles.emptyHint}>在波形图上点击添加节拍点</p>
          </div>
        ) : (
          sequences.map((seq, index) => (
            <div
              key={seq.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                ...styles.sequenceItem,
                borderLeftColor: seq.color,
                borderLeftWidth: '4px',
                borderLeftStyle: 'solid',
                opacity: draggedIndex === index ? 0.5 : 1,
                transform: dragOverIndex === index && draggedIndex !== index ? 'scale(1.02)' : 'scale(1)',
                backgroundColor: dragOverIndex === index && draggedIndex !== index
                  ? 'rgba(108, 99, 255, 0.1)'
                  : 'transparent'
              }}
            >
              <div style={styles.sequenceInfo}>
                <div style={{ ...styles.colorDot, backgroundColor: seq.color }} />
                <span style={styles.sequenceName}>{seq.name}</span>
              </div>
              <span style={styles.pointCount}>
                {seq.points.length} 个节拍
              </span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onMerge}
        disabled={sequences.length < 2}
        style={{
          ...styles.mergeButton,
          opacity: sequences.length < 2 ? 0.5 : 1,
          cursor: sequences.length < 2 ? 'not-allowed' : 'pointer'
        }}
      >
        合并节拍序列
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#16213E',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(108, 99, 255, 0.3)',
    boxShadow: '0 0 20px rgba(108, 99, 255, 0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#E0E0E0'
  },
  hint: {
    fontSize: '12px',
    color: 'rgba(224, 224, 224, 0.5)'
  },
  sequenceList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px'
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
  emptyText: {
    color: 'rgba(224, 224, 224, 0.5)',
    fontSize: '14px',
    margin: '0 0 8px 0'
  },
  emptyHint: {
    color: 'rgba(224, 224, 224, 0.3)',
    fontSize: '12px',
    margin: 0
  },
  sequenceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  },
  sequenceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  sequenceName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#E0E0E0'
  },
  pointCount: {
    fontSize: '12px',
    color: 'rgba(224, 224, 224, 0.6)'
  },
  mergeButton: {
    padding: '12px 20px',
    backgroundColor: '#6C63FF',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  }
}
