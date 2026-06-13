import { useRef, useEffect, useCallback, useState } from 'react'
import { Volume2, VolumeX, Drum, Guitar, Piano, Music } from 'lucide-react'
import type { Track } from '@/api'

interface AudioTrackProps {
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
  const animFrameRef = useRef<number>(0)
  const [panTooltip, setPanTooltip] = useState(false)
  const [muteBounce, setMuteBounce] = useState(false)
  const [soloBounce, setSoloBounce] = useState(false)

  const drawWaveform = useCallback(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    ctx.clearRect(0, 0, width, height)

    const data = track.waveformData
    if (!data || data.length === 0) return

    const barWidth = Math.max(1, width / data.length - 1)
    const centerY = height / 2
    const progress = isPlaying ? currentTime / track.duration : 0

    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * width
      const barHeight = data[i] * centerY * 0.9
      const played = i / data.length < progress

      if (played) {
        ctx.fillStyle = track.color
        ctx.globalAlpha = 1
      } else {
        ctx.fillStyle = track.color
        ctx.globalAlpha = 0.4
      }

      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2)
    }

    if (isPlaying && progress > 0) {
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(progress * width - 0.5, 0, 1, height)
    }

    ctx.globalAlpha = 1
  }, [track.waveformData, track.color, track.duration, isPlaying, currentTime])

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      drawWaveform()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [drawWaveform])

  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => drawWaveform())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawWaveform])

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

  return (
    <div
      className={`flex items-center gap-3 px-4 rounded-lg cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-[#1e2a3a]' : 'bg-[#1e1e1e] hover:bg-[#252525]'
      }`}
      style={{ height: 70 }}
      onClick={() => onSelect(track._id)}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-2 w-24 shrink-0">
        <span style={{ color: track.color }}>
          {instrumentIcons[track.instrument] || <Music size={20} />}
        </span>
        <span className="text-sm text-gray-300 truncate">{track.member}</span>
      </div>

      <div className="flex-1 h-10 relative">
        <canvas
          ref={waveformRef}
          className="w-full h-full rounded"
          style={{ imageRendering: 'pixelated' }}
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
          <Volume2 size={14} className="text-gray-400" />
          <input
            type="range"
            min={0}
            max={100}
            value={track.volume}
            onChange={handleVolumeChange}
            className="w-[180px]"
          />
          <span className="text-xs text-gray-500 w-7 text-right">{track.volume}</span>
        </div>

        <div className="relative flex items-center gap-1.5">
          <div
            className="relative cursor-grab active:cursor-grabbing"
            onMouseEnter={() => setPanTooltip(true)}
            onMouseLeave={() => setPanTooltip(false)}
          >
            <div
              className="rounded-full border-2 border-gray-500 flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                backgroundColor: '#2a2a3a',
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
              style={{ width: 24, height: 24 }}
            />
          </div>
          {panTooltip && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap z-10">
              {track.pan > 0 ? `R${track.pan}` : track.pan < 0 ? `L${Math.abs(track.pan)}` : 'C'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
