import { useState, useCallback, useRef } from 'react'
import { usePlayerStore, Song } from '@/store/playerStore'
import { GripVertical, Music } from 'lucide-react'

interface PlaylistProps {
  switchSong: (index: number) => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Playlist({ switchSong }: PlaylistProps) {
  const playlist = usePlayerStore((s) => s.playlist)
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex)
  const reorderPlaylist = usePlayerStore((s) => s.reorderPlaylist)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragCounterRef = useRef(0)
  const dragSourceIndexRef = useRef<number | null>(null)

  const onDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    dragSourceIndexRef.current = index
    setDragIndex(index)
    dragCounterRef.current = 0

    const target = e.currentTarget
    if (target && 'querySelector' in target) {
      const img = target.querySelector('img')
      if (img) {
        e.dataTransfer.setDragImage(img, 22, 22)
      }
    }
  }, [])

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragIndex !== null && dragSourceIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }, [dragIndex])

  const onDragLeave = useCallback(() => {
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      setDragOverIndex(null)
      dragCounterRef.current = 0
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    return false
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
      e.preventDefault()
      e.stopPropagation()

      const rawIndex = e.dataTransfer.getData('text/plain')
      const fromIndex = rawIndex !== '' ? Number(rawIndex) : null

      if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== toIndex) {
        reorderPlaylist(fromIndex, toIndex)
      }

      setDragIndex(null)
      setDragOverIndex(null)
      dragSourceIndexRef.current = null
      dragCounterRef.current = 0
    },
    [reorderPlaylist]
  )

  const onDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
    dragSourceIndexRef.current = null
    dragCounterRef.current = 0
  }, [])

  const handleItemClick = useCallback(
    (index: number) => {
      switchSong(index)
    },
    [switchSong]
  )

  return (
    <div className="playlist-container">
      <div className="playlist-header">
        <Music size={18} />
        <h3>播放列表</h3>
        <span className="playlist-count">{playlist.length} 首</span>
      </div>
      <div className="playlist-items">
        {playlist.map((song: Song, index: number) => {
          const isCurrent = index === currentSongIndex
          const isDragging = index === dragIndex
          const isDragOver = index === dragOverIndex && dragIndex !== null && dragIndex !== index

          return (
            <div
              key={song.id}
              className={`playlist-item ${isCurrent ? 'current' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => handleItemClick(index)}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnter={(e) => onDragEnter(e, index)}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index)}
              onDragEnd={onDragEnd}
            >
              <div className="playlist-item-glow" />
              <div className="playlist-item-drag-handle" onMouseDown={(e) => e.stopPropagation()}>
                <GripVertical size={14} />
              </div>
              <img src={song.coverUrl} alt={song.title} className="playlist-item-cover" />
              <div className="playlist-item-info">
                <span className={`playlist-item-title ${isCurrent && isPlaying ? 'playing-text' : ''}`}>
                  {song.title}
                </span>
                <span className="playlist-item-artist">{song.artist}</span>
              </div>
              <span className="playlist-item-duration">{formatDuration(song.duration)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
