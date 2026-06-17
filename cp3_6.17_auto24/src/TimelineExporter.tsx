import { useCallback, useMemo } from 'react'
import { Download } from 'lucide-react'
import { useAppStore } from './store'
import { secondsToFrame } from './utils'
import type { TimelineClip, TimelineData } from './types'

export default function TimelineExporter() {
  const { videos, markers, selectedMarkers } = useAppStore()

  const selectedCount = selectedMarkers.size

  const timelineData = useMemo((): TimelineData | null => {
    if (selectedMarkers.size === 0) return null

    const selectedMarkerList = markers
      .filter((m) => selectedMarkers.has(m.id))
      .sort((a, b) => {
        if (a.videoId === b.videoId) return a.order - b.order
        return a.createdAt.localeCompare(b.createdAt)
      })

    const clips: TimelineClip[] = selectedMarkerList.map((marker, index) => {
      const video = videos.find((v) => v.id === marker.videoId)
      const nextMarker = selectedMarkerList.find(
        (m, i) => i > index && m.videoId === marker.videoId
      )
      const endTime = nextMarker ? nextMarker.timestamp : (video?.duration || marker.timestamp)

      return {
        videoId: marker.videoId,
        videoPath: video?.filePath || '',
        videoFileName: video?.fileName || '',
        startTime: secondsToFrame(marker.timestamp),
        endTime: secondsToFrame(endTime),
        label: marker.label,
        labelColor: marker.labelColor,
        order: index,
      }
    })

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clips,
    }
  }, [selectedMarkers, markers, videos])

  const handleExport = useCallback(() => {
    if (!timelineData) return
    const blob = new Blob([JSON.stringify(timelineData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timeline.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [timelineData])

  return (
    <button
      className={`
        w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm
        transition-all duration-200
        ${selectedCount > 0
          ? 'bg-accent text-white hover:bg-accent-hover'
          : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'}
      `}
      onClick={handleExport}
      disabled={selectedCount === 0}
    >
      <Download className="w-4 h-4" />
      导出时间线
      <span className="text-xs opacity-70">
        {selectedCount > 0 ? `(${selectedCount})` : ''}
      </span>
    </button>
  )
}
