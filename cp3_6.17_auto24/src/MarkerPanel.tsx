import { useCallback, useMemo, useRef, useState } from 'react'
import { Trash2, GripVertical, PlayCircle } from 'lucide-react'
import { useAppStore } from './store'
import { formatDuration } from './utils'
import type { Marker } from './types'

export default function MarkerPanel() {
  const {
    videos,
    markers,
    selectedMarkers,
    toggleMarkerSelection,
    removeMarker,
    updateMarker,
    setSelectedVideo,
    setCurrentTime,
    setIsPlayerOpen,
  } = useAppStore()

  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragStartTimeRef = useRef<number>(0)

  const groupedMarkers = useMemo(() => {
    const groups: Record<string, Marker[]> = {}
    videos.forEach((v) => {
      groups[v.id] = []
    })
    markers.forEach((m) => {
      if (!groups[m.videoId]) groups[m.videoId] = []
      groups[m.videoId].push(m)
    })
    Object.keys(groups).forEach((videoId) => {
      groups[videoId].sort((a, b) => a.timestamp - b.timestamp)
    })
    return groups
  }, [videos, markers])

  const handleJumpToMarker = useCallback((videoId: string, timestamp: number) => {
    const video = videos.find((v) => v.id === videoId)
    if (!video) return
    setSelectedVideo(video)
    setCurrentTime(timestamp)
    setIsPlayerOpen(true)
  }, [videos, setSelectedVideo, setCurrentTime, setIsPlayerOpen])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/markers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        removeMarker(id)
      }
    } catch (err) {
      console.error(err)
    }
  }, [removeMarker])

  const handleDragStart = useCallback((e: React.DragEvent, marker: Marker) => {
    setDraggedId(marker.id)
    dragStartTimeRef.current = Date.now()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', marker.id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, markerId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (markerId !== draggedId) {
      setDragOverId(markerId)
    }
  }, [draggedId])

  const handleDrop = useCallback(async (e: React.DragEvent, targetMarker: Marker) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetMarker.id) return

    const dragged = markers.find((m) => m.id === draggedId)
    if (!dragged || dragged.videoId !== targetMarker.videoId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const videoMarkers = groupedMarkers[dragged.videoId]
    const draggedIdx = videoMarkers.findIndex((m) => m.id === draggedId)
    const targetIdx = videoMarkers.findIndex((m) => m.id === targetMarker.id)

    if (draggedIdx === -1 || targetIdx === -1) return

    const newMarkers = [...videoMarkers]
    const [removed] = newMarkers.splice(draggedIdx, 1)
    newMarkers.splice(targetIdx, 0, removed)

    const reordered = newMarkers.map((m, idx) => ({
      ...m,
      order: idx,
    }))

    try {
      const res = await fetch(`/api/markers/${draggedId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOrder: targetIdx }),
      })
      if (res.ok) {
        const updated = await res.json()
        const storeMarkers = markers.map((m) => {
          const found = updated.find((u: Marker) => u.id === m.id)
          return found || m
        })
        useAppStore.getState().setMarkers(storeMarkers)
      }
    } catch (err) {
      console.error(err)
    }

    setDraggedId(null)
    setDragOverId(null)
  }, [draggedId, markers, groupedMarkers])

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverId(null)
  }, [])

  return (
    <div className="h-full flex flex-col bg-bg-tertiary" style={{ width: '240px', padding: '12px' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-primary">标记列表</h2>
        <span className="text-xs text-text-secondary">{markers.length} 个标记</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {videos.length === 0 ? (
          <div className="text-center text-text-secondary text-xs py-8">
            <p>暂无视频</p>
            <p className="mt-1">上传视频后添加标记</p>
          </div>
        ) : (
          videos.map((video) => {
            const videoMarkers = groupedMarkers[video.id] || []
            if (videoMarkers.length === 0) return null
            return (
              <div key={video.id} className="mb-4">
                <div className="text-xs text-text-secondary mb-2 truncate px-1">
                  {video.fileName}
                </div>
                {videoMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, marker)}
                    onDragOver={(e) => handleDragOver(e, marker.id)}
                    onDrop={(e) => handleDrop(e, marker)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-2 p-2 rounded cursor-pointer
                      transition-colors duration-150 group
                      ${draggedId === marker.id ? 'opacity-50' : ''}
                      ${dragOverId === marker.id ? 'bg-accent/20 border border-accent/50' : 'hover:bg-bg-secondary'}
                    `}
                    style={{
                      transform: draggedId === marker.id ? 'scale(0.95)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                    }}
                    onClick={() => handleJumpToMarker(marker.videoId, marker.timestamp)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMarkers.has(marker.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleMarkerSelection(marker.id)
                      }}
                      className="w-3.5 h-3.5 accent-accent cursor-pointer"
                    />
                    <GripVertical className="w-4 h-4 text-text-secondary cursor-grab opacity-50 group-hover:opacity-100" />
                    <div
                      className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden"
                    >
                      <PlayCircle className="w-5 h-5" style={{ color: marker.labelColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-primary truncate font-medium">
                        {marker.label}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {formatDuration(marker.timestamp)}
                      </div>
                    </div>
                    <button
                      className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(marker.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })
        )}

        {markers.length === 0 && videos.length > 0 && (
          <div className="text-center text-text-secondary text-xs py-8">
            <p>暂无标记</p>
            <p className="mt-1">播放视频时按 M 键添加</p>
          </div>
        )}
      </div>
    </div>
  )
}
