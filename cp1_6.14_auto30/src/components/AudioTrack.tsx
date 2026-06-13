import { useRef, useEffect, useCallback, useState } from 'react'
import { Volume2, VolumeX, Drum, Guitar, Piano, Music, GripVertical } from 'lucide-react'
import type { Track } from '@/api'

export interface AudioTrackProps {
  track: Track
  isSelected: boolean
  isPlaying: boolean
  currentTime: number
  onSelect: (id: string) => void
  onUpdate: (id: string, data: Partial<Track>) => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDragEnd: () => void
  index: number
}

const instrumentIcons: Record<string, React.ReactNode> = {
  drums: <Drum size={20} />,
  bass: <Music size={20} />,
  guitar: <Guitar size={20} />,
  keyboard: <Piano size={20} />,
}

export default function AudioTrack({
  track,
  isSelected,
  isPlaying,
  currentTime,
  onSelect,
  onUpdate,
  onDragStart,
  onDragOver,
  onDragEnd,
  index,
}: AudioTrackProps) {
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const [panTooltip, setPanTooltip] = useState(false)
  const [muteBounce, setMuteBounce] = useState(false)
  const [soloBounce, setSoloBounce] = useState(false)
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const drawWaveform = useCallback(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const width = rect.width
    const height = rect.height
    ctx.clearRect(0, 0, width, height)

    const data = track.waveformData
    if (!data || data.length === 0) return

    const barCount = Math.min(data.length, Math.max(20, Math.floor(width / 3)))
    const samplesPerBar = Math.floor(data.length / barCount)
    const barWidth = width / barCount
    const centerY = height / 2
    const progress = track.duration > 0 ? currentTime / track.duration : 0

    for (let i = 0; i < barCount; i++) {
      let sum = 0
      for (let j = 0; j < samplesPerBar; j++) {
        sum += data[i * samplesPerBar + j] || 0
      }
      const avg = sum / samplesPerBar
      const x = i * barWidth
      const barHeight = Math.max(1, avg * centerY * 0.85)
      const played = i / barCount < progress

      ctx.fillStyle = track.color
      ctx.globalAlpha = played ? 1 : 0.35
      ctx.fillRect(x + 0.5, centerY - barHeight, barWidth - 1, barHeight * 2)
    }

    if (progress > 0 && isPlaying) {
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(progress * width - 0.5, 0, 1, height)
    }

    ctx.globalAlpha = 1
  }, [track.waveformData, track.color, track.duration, isPlaying, currentTime, isDesktop])

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= 33) {
        drawWaveform()
        lastFrameTimeRef.current = timestamp
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [drawWaveform])

  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      drawWaveform()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawWaveform, isDesktop])

  const handleMute = () => {
    setMuteBounce(true)
    onUpdate(track._id, { muted: !track.muted })
    setTimeout(() => setMuteBounce(false), 150)
  }

  const handleSolo = () => {
    setSoloBounce(true)
    onUpdate(track._id, { solo: !track.solo })
    setTimeout(() => setSoloBounce(false), 150)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(track._id, { volume: Number(e.target.value) })
  }

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(track._id, { pan: Number(e.target.value) })
  }

  const panRotation = ((track.pan + 50) / 100) * 270 - 135
  const panLabel = track.pan > 0 ? `R${track.pan}` : track.pan < 0 ? `L${Math.abs(track.pan)}` : 'C'

  return (
    <div
      className={`rounded-lg cursor-pointer transition-colors duration-150 select-none overflow-hidden ${
        isSelected ? 'bg-[#1e2a3a]' : 'bg-[#1e1e1e] hover:bg-[#252525]'
      }`}
      style={{ minHeight: 70 }}
      onClick={() => onSelect(track._id)}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDragEnd={onDragEnd}
    >
      {isDesktop ? (
        <div className="flex items-center gap-3 px-4 h-[70px]">
          <div className="flex items-center gap-2 w-28 shrink-0">
            <GripVertical size={16} className="text-gray-600 cursor-grab" />
            <span style={{ color: track.color }} className="shrink-0">
              {instrumentIcons[track.instrument] || <Music size={20} />}
            </span>
            <span className="text-sm text-gray-300 truncate font-medium">{track.member}</span>
          </div>

          <div className="flex-1 h-10 relative">
            <canvas
              key="desktop-canvas"
              ref={waveformRef}
              className="w-full h-full rounded"
              style={{ display: 'block' }}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleMute()
              }}
              className={`flex items-center justify-center transition-transform duration-150 ${
                muteBounce ? 'scale-110' : 'scale-100'
              }`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: track.muted ? '#ef4444' : '#555',
                color: track.muted ? '#fff' : '#aaa',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {track.muted ? <VolumeX size={14} /> : 'M'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSolo()
              }}
              className={`flex items-center justify-center transition-transform duration-150 ${
                soloBounce ? 'scale-110' : 'scale-100'
              }`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: track.solo ? '#f59e0b' : '#555',
                color: track.solo ? '#000' : '#aaa',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              S
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-gray-400 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={track.volume}
                onChange={handleVolumeChange}
                className="w-[160px]"
              />
              <span className="text-xs text-gray-500 w-7 text-right tabular-nums">{track.volume}</span>
            </div>

            <div className="relative flex items-center" style={{ height: 28 }}>
              <div
                className="relative cursor-grab active:cursor-grabbing"
                onMouseEnter={() => setPanTooltip(true)}
                onMouseLeave={() => setPanTooltip(false)}
              >
                <div
                  className="rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: '#2a2a3a',
                    borderColor: '#4a4a4a',
                  }}
                >
                  <div
                    className="w-0.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: '#1db954',
                      transform: `rotate(${panRotation}deg)`,
                      transformOrigin: 'center bottom',
                      transition: 'transform 0.1s ease-out',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={track.pan}
                  onChange={handlePanChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  style={{ width: 24, height: 24, margin: 0 }}
                />
              </div>
              {panTooltip && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                >
                  {panLabel}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="text-gray-600" />
              <span style={{ color: track.color }}>
                {instrumentIcons[track.instrument] || <Music size={18} />}
              </span>
              <span className="text-sm text-gray-300 font-medium">{track.member}</span>
              <span className="text-xs text-gray-500">{track.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMute()
                }}
                className={`flex items-center justify-center transition-transform duration-150 ${
                  muteBounce ? 'scale-110' : 'scale-100'
                }`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  backgroundColor: track.muted ? '#ef4444' : '#555',
                  color: track.muted ? '#fff' : '#aaa',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {track.muted ? <VolumeX size={12} /> : 'M'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSolo()
                }}
                className={`flex items-center justify-center transition-transform duration-150 ${
                  soloBounce ? 'scale-110' : 'scale-100'
                }`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  backgroundColor: track.solo ? '#f59e0b' : '#555',
                  color: track.solo ? '#000' : '#aaa',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                S
              </button>
            </div>
          </div>

          <div className="h-10 w-full">
            <canvas
              key="mobile-canvas"
              ref={waveformRef}
              className="w-full h-full rounded"
              style={{ display: 'block' }}
            />
          </div>

          <div className="flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 flex-1">
              <Volume2 size={13} className="text-gray-400 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={track.volume}
                onChange={handleVolumeChange}
                className="flex-1"
              />
              <span className="text-[11px] text-gray-500 w-6 text-right tabular-nums">{track.volume}</span>
            </div>
            <div className="relative flex items-center gap-1.5" style={{ height: 26 }}>
              <span className="text-[10px] text-gray-500">声像</span>
              <div
                className="relative cursor-grab active:cursor-grabbing"
                onMouseEnter={() => setPanTooltip(true)}
                onMouseLeave={() => setPanTooltip(false)}
              >
                <div
                  className="rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: '#2a2a3a',
                    borderColor: '#4a4a4a',
                  }}
                >
                  <div
                    className="w-0.5 h-2 rounded-full"
                    style={{
                      backgroundColor: '#1db954',
                      transform: `rotate(${panRotation}deg)`,
                      transformOrigin: 'center bottom',
                      transition: 'transform 0.1s ease-out',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={track.pan}
                  onChange={handlePanChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  style={{ width: 22, height: 22, margin: 0 }}
                />
              </div>
              {panTooltip && (
                <div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20 pointer-events-none"
                  style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                >
                  {panLabel}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
