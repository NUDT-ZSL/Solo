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
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragCounterRef = useRef(0)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDragIndex(index)
    dragCounterRef.current = 0
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragCounterRef.current++
    setOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setOverIndex(null)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault()
      const fromIndex = Number(e.dataTransfer.getData('text/plain'))
      if (fromIndex !== toIndex) {
        reorderPlaylist(fromIndex, toIndex)
      }
      setDragIndex(null)
      setOverIndex(null)
      dragCounterRef.current = 0
    },
    [reorderPlaylist]
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
    dragCounterRef.current = 0
  }, [])

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
          const isOver = index === overIndex
          return (
            <div
              key={song.id}
              className={`playlist-item ${isCurrent ? 'current' : ''} ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
              onClick={() => switchSong(index)}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="playlist-item-glow" />
              <div className="playlist-item-drag-handle">
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
