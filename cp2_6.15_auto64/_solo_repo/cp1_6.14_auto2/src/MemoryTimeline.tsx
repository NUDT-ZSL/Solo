import React from 'react'
import type { PhotoData } from './PhotoUploader'

interface MemoryTimelineProps {
  photos: PhotoData[]
  selectedId: string | null
  onSelectPhoto: (photo: PhotoData) => void
  onEditPhoto: (photo: PhotoData) => void
  photoIdsWithMemory: Set<string>
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  photos,
  selectedId,
  onSelectPhoto,
  onEditPhoto,
  photoIdsWithMemory
}) => {
  const sorted = [...photos].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())

  return (
    <div
      style={{
        width: 380,
        height: '100%',
        background: '#faf5ef',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>记忆时间线</h2>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{sorted.length} 张照片</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {sorted.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📸</div>
            <div>还没有照片，快去上传吧！</div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {sorted.map((photo, index) => {
            const selected = photo.id === selectedId
            const hasMemory = photoIdsWithMemory.has(photo.id)
            return (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                style={{
                  position: 'relative',
                  height: 120,
                  marginBottom: 12,
                  borderRadius: 12,
                  background: selected ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  boxShadow: selected ? '0 4px 16px rgba(249,115,22,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  display: 'flex',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  border: selected ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent'
                }}
                className="ml-timeline-card"
              >
                <div
                  style={{
                    width: 6,
                    background: 'linear-gradient(to bottom, #f97316 0%, #d946ef 100%)',
                    flexShrink: 0
                  }}
                />

                <div style={{
                  padding: '10px 12px',
                  width: 72,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderRight: '1px solid rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: 'linear-gradient(90deg, #f97316, #d946ef)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {formatDate(photo.takenAt)}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1f2937', marginTop: 2 }}>
                    {formatTime(photo.takenAt)}
                  </div>
                </div>

                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={photo.dataUrl}
                    alt={photo.originalName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 10,
                    right: 10,
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    {photo.originalName.length > 20 ? photo.originalName.slice(0, 20) + '...' : photo.originalName}
                  </div>
                  {hasMemory && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}>!</div>
                  )}
                </div>

                <button
                  className="ml-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditPhoto(photo)
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%) translateX(120%)',
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    border: 'none',
                    background: 'linear-gradient(135deg, #f97316, #d946ef)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
                    transition: 'all 0.2s ease-out',
                    opacity: 0
                  }}
                  title="编辑"
                >✎</button>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .ml-timeline-card:hover .ml-edit-btn {
          transform: translateY(-50%) translateX(0);
          opacity: 1;
        }
        .ml-edit-btn:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  )
}

export default MemoryTimeline
