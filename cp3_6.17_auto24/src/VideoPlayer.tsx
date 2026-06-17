import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { X, Play, Pause, Plus, SkipBack, SkipForward } from 'lucide-react'
import { useAppStore } from './store'
import { PRESET_LABELS } from './types'
import { formatDuration } from './utils'
import type { Marker } from './types'

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  const {
    selectedVideo,
    isPlayerOpen,
    currentTime,
    markers,
    addMarker,
    setCurrentTime,
    setIsPlayerOpen,
  } = useAppStore()

  const [isPlaying, setIsPlaying] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [pickerTime, setPickerTime] = useState(0)
  const [customLabel, setCustomLabel] = useState('')
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  const videoMarkers = useMemo(
    () => markers
      .filter(m => m.videoId === selectedVideo?.id)
      .sort((a, b) => a.timestamp - b.timestamp),
    [markers, selectedVideo?.id]
  )

  useEffect(() => {
    if (!isPlayerOpen || !videoRef.current) return

    const video = videoRef.current
    video.currentTime = currentTime

    const updateTime = () => {
      const now = performance.now()
      if (now - lastTimeRef.current >= 1000 / 30) {
        setCurrentTime(video.currentTime)
        lastTimeRef.current = now
      }
      rafRef.current = requestAnimationFrame(updateTime)
    }

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateTime)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlayerOpen, isPlaying, setCurrentTime])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayerOpen) return
      if (e.key === 'Escape') {
        if (showLabelPicker) {
          setShowLabelPicker(false)
        } else {
          setIsPlayerOpen(false)
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        openLabelPickerAtCurrentTime()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlayerOpen, showLabelPicker, setIsPlayerOpen])

  useEffect(() => {
    if (isPlayerOpen) {
      document.body.style.overflow = 'hidden'
      setIsPlaying(false)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isPlayerOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showLabelPicker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowLabelPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLabelPicker])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const openLabelPickerAtCurrentTime = useCallback(() => {
    if (!videoRef.current || !selectedVideo) return
    setPickerTime(videoRef.current.currentTime)
    setCustomLabel('')
    setShowLabelPicker(true)
  }, [selectedVideo])

  const openLabelPickerAtClick = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || !selectedVideo || !videoRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const time = ratio * selectedVideo.duration
    videoRef.current.currentTime = time
    setCurrentTime(time)
    setPickerTime(time)
    setCustomLabel('')
    setShowLabelPicker(true)
  }, [selectedVideo, setCurrentTime])

  const addMarkerWithLabel = useCallback(async (label: string, labelColor: string) => {
    if (!selectedVideo) return
    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          timestamp: pickerTime,
          label,
          labelColor,
        }),
      })
      if (res.ok) {
        const marker: Marker = await res.json()
        addMarker(marker)
      }
    } catch (err) {
      console.error(err)
    }
    setShowLabelPicker(false)
    setCustomLabel('')
  }, [selectedVideo, pickerTime, addMarker])

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || !selectedVideo || !videoRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const time = ratio * selectedVideo.duration
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }, [selectedVideo, setCurrentTime])

  const handleMarkerHover = useCallback((e: React.MouseEvent, marker: Marker) => {
    e.stopPropagation()
    setHoveredMarker(marker)
    setHoverPosition({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMarkerLeave = useCallback(() => {
    setHoveredMarker(null)
  }, [])

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const skip = useCallback((delta: number) => {
    if (!videoRef.current || !selectedVideo) return
    const newTime = Math.max(0, Math.min(selectedVideo.duration, currentTime + delta))
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [currentTime, selectedVideo, setCurrentTime])

  const handleCustomLabelSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (customLabel.trim()) {
      addMarkerWithLabel(customLabel.trim(), '#ff5722')
    }
  }, [customLabel, addMarkerWithLabel])

  const pickerLeftPercent = useMemo(() => {
    if (!selectedVideo) return 0
    return (pickerTime / selectedVideo.duration) * 100
  }, [pickerTime, selectedVideo])

  if (!isPlayerOpen || !selectedVideo) return null

  const progressPercent = (currentTime / selectedVideo.duration) * 100

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => {
        if (showLabelPicker) {
          setShowLabelPicker(false)
        } else {
          setIsPlayerOpen(false)
        }
      }}
    >
      <div
        className="bg-bg-secondary rounded-lg overflow-hidden shadow-2xl"
        style={{ width: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative" style={{ height: '360px', backgroundColor: '#000' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={selectedVideo.filePath}
            onEnded={handleVideoEnded}
          />
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            onClick={() => setIsPlayerOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-3">
            <div
              ref={progressRef}
              className="relative h-2 bg-bg-tertiary rounded-full cursor-pointer"
              onClick={openLabelPickerAtClick}
              onDoubleClick={handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full bg-accent rounded-full"
                style={{ width: `${progressPercent}%`, pointerEvents: 'none' }}
              />
              {videoMarkers.map((marker) => {
                const left = (marker.timestamp / selectedVideo.duration) * 100
                return (
                  <div
                    key={marker.id}
                    className="absolute top-1/2 cursor-pointer z-10"
                    style={{
                      left: `${left}%`,
                      width: '3px',
                      height: '20px',
                      backgroundColor: marker.labelColor,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '1.5px',
                    }}
                    onMouseEnter={(e) => handleMarkerHover(e, marker)}
                    onMouseLeave={handleMarkerLeave}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (videoRef.current) {
                        videoRef.current.currentTime = marker.timestamp
                        setCurrentTime(marker.timestamp)
                      }
                    }}
                  />
                )
              })}
              <div
                className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-md cursor-grab z-20"
                style={{ left: `calc(${progressPercent}% - 8px)`, transform: 'translateY(-50%)' }}
              />

              {showLabelPicker && (
                <div
                  ref={pickerRef}
                  className="absolute z-30 bg-bg-tertiary rounded-lg shadow-xl p-3"
                  style={{
                    left: `${pickerLeftPercent}%`,
                    bottom: '30px',
                    transform: 'translateX(-50%)',
                    width: '280px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-xs text-text-secondary mb-2">
                    在 {formatDuration(pickerTime)} 添加标记
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_LABELS.map((label) => (
                      <button
                        key={label.name}
                        className="text-white text-xs font-medium transition-transform duration-200 hover:opacity-80"
                        style={{
                          width: '60px',
                          height: '24px',
                          borderRadius: '12px',
                          backgroundColor: label.color,
                          lineHeight: '24px',
                          textAlign: 'center',
                        }}
                        onClick={() => addMarkerWithLabel(label.name, label.color)}
                      >
                        {label.name}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleCustomLabelSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="自定义标签..."
                      className="flex-1 px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded border border-bg-tertiary focus:border-accent outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                      disabled={!customLabel.trim()}
                    >
                      添加
                    </button>
                  </form>
                  <div
                    className="absolute left-1/2 w-2 h-2 bg-bg-tertiary rotate-45"
                    style={{ bottom: '-4px', transform: 'translateX(-50%) rotate(45deg)' }}
                  />
                </div>
              )}
            </div>

            {hoveredMarker && !showLabelPicker && (
              <div
                className="fixed z-50 pointer-events-none bg-bg-tertiary text-text-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                style={{ left: hoverPosition.x + 10, top: hoverPosition.y - 35 }}
              >
                <div className="font-medium" style={{ color: hoveredMarker.labelColor }}>
                  {hoveredMarker.label}
                </div>
                <div className="text-text-secondary">{formatDuration(hoveredMarker.timestamp)}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="w-9 h-9 rounded-full bg-bg-tertiary text-text-primary flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                onClick={() => skip(-5)}
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                className="w-9 h-9 rounded-full bg-bg-tertiary text-text-primary flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                onClick={() => skip(5)}
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <span className="text-text-secondary text-sm ml-2">
                {formatDuration(currentTime)} / {formatDuration(selectedVideo.duration)}
              </span>
            </div>

            <button
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors text-sm font-medium"
              onClick={openLabelPickerAtCurrentTime}
            >
              <Plus className="w-4 h-4" />
              添加标记
              <span className="text-xs opacity-70">(M)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
