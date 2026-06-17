import { useState, useRef } from 'react'
import type { Song } from '../../shared/types'

interface SongListProps {
  songs: Song[]
  assignedSongIds: string[]
  targetDuration: number
  onReorder: (newOrder: string[]) => void
  onRemove: (songId: string) => void
  onAddFromLibrary: (songId: string) => void
  allSongs: Song[]
}

export default function SongList({
  songs,
  assignedSongIds,
  targetDuration,
  onReorder,
  onRemove,
  onAddFromLibrary,
  allSongs,
}: SongListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const dragCounter = useRef(0)

  const totalDuration = songs.reduce((sum, s) => sum + s.duration, 0)
  const isWarning = Math.abs(totalDuration - targetDuration) > 2
  const durationDiff = totalDuration - targetDuration

  const handleDragStart = (e: React.DragEvent, songId: string) => {
    setDraggedId(songId)
    e.dataTransfer.effectAllowed = 'move'
    dragCounter.current = 0
  }

  const handleDragOver = (e: React.DragEvent, songId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== songId) {
      setDragOverId(songId)
    }
  }

  const handleDragLeave = () => {
    dragCounter.current += 1
    if (dragCounter.current >= 1) {
      setDragOverId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    setDraggedId(null)
    dragCounter.current = 0

    if (!draggedId || draggedId === targetId) return

    const currentIds = [...assignedSongIds]
    const fromIndex = currentIds.indexOf(draggedId)
    const toIndex = currentIds.indexOf(targetId)

    if (fromIndex === -1 || toIndex === -1) return

    currentIds.splice(fromIndex, 1)
    currentIds.splice(toIndex, 0, draggedId)
    onReorder(currentIds)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    dragCounter.current = 0
  }

  const availableLibrarySongs = allSongs.filter(s => !assignedSongIds.includes(s.id))

  return (
    <div>
      <div className="duration-summary">
        <div>
          <div className="duration-label">总演出时长</div>
          <div className={`duration-value ${isWarning ? 'warning' : ''}`}>
            {totalDuration.toFixed(1)} 分钟
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="duration-label">目标时长</div>
          <div className="duration-value" style={{ fontSize: 16, color: '#a1a1aa' }}>
            {targetDuration} 分钟
          </div>
        </div>
      </div>

      {isWarning && (
        <div className="warning-bar">
          ⚠️
          <span>
            时长{durationDiff > 0 ? '超出' : '不足'} {Math.abs(durationDiff).toFixed(1)} 分钟
            （允许误差 ±2 分钟）
          </span>
        </div>
      )}

      <div className="dropdown-section">
        <div
          className="dropdown-header"
          onClick={() => setLibraryOpen(!libraryOpen)}
        >
          <span className="dropdown-title">🎵 曲目库（{availableLibrarySongs.length} 首可用）</span>
          <span className={`dropdown-arrow ${libraryOpen ? 'open' : ''}`}>▼</span>
        </div>
        {libraryOpen && (
          <div className="dropdown-body">
            {availableLibrarySongs.length === 0 ? (
              <div style={{ color: '#a1a1aa', fontSize: 13, padding: 8 }}>
                所有歌曲已添加
              </div>
            ) : (
              availableLibrarySongs.map(song => (
                <div key={song.id} className="library-song">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{song.title}</div>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                      {song.duration.toFixed(1)}分钟 · {song.key}
                    </div>
                    <div className="song-tags" style={{ marginTop: 4 }}>
                      {song.tags.map(tag => (
                        <span key={tag} className="song-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="add-btn"
                    onClick={() => onAddFromLibrary(song.id)}
                    title="添加到演出列表"
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="section-title" style={{ fontSize: 15, marginTop: 16 }}>
        🎤 演出曲目列表
      </div>

      {songs.length === 0 ? (
        <div style={{
          padding: 32,
          textAlign: 'center',
          color: '#a1a1aa',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          fontSize: 13,
        }}>
          还没有曲目，从上方曲目库添加歌曲吧
        </div>
      ) : (
        songs.map((song, index) => (
          <div
            key={song.id}
            className={`song-card ${draggedId === song.id ? 'dragging' : ''} ${dragOverId === song.id ? 'drag-over' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, song.id)}
            onDragOver={(e) => handleDragOver(e, song.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, song.id)}
            onDragEnd={handleDragEnd}
          >
            <span className="song-drag-handle">⋮⋮</span>
            <div className="song-index">{index + 1}</div>
            <div className="song-info">
              <div className="song-title">{song.title}</div>
              <div className="song-meta">
                <span>🎹 {song.key}</span>
              </div>
              <div className="song-tags">
                {song.tags.map(tag => (
                  <span key={tag} className="song-tag">{tag}</span>
                ))}
              </div>
            </div>
            <span className="song-duration">{song.duration.toFixed(1)}分</span>
            <button
              className="song-remove"
              onClick={() => onRemove(song.id)}
              title="移除"
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  )
}
