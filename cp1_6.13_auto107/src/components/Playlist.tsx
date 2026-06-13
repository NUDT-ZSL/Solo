import React, { useRef, useEffect, useState } from 'react'
import { Play, Pause, Music2, Volume2, Trash2 } from 'lucide-react'
import { useAudioStore, Track } from '../store/audioStore'

interface WaveformCanvasProps {
  track: Track
  currentTime: number
  duration: number
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ track, currentTime, duration }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<number[] | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const WAVEFORM_DURATION = 10

    if (!dataRef.current) {
      const samples: number[] = []
      const sampleCount = 440
      for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleCount
        let amp = 0
        for (let f = 1; f <= 8; f++) {
          amp += Math.sin(t * Math.PI * 2 * f + track.id.charCodeAt(f % track.id.length) * 0.1) / f
        }
        amp = Math.abs(amp) * 0.5 + Math.random() * 0.15
        const envelope = Math.sin(t * Math.PI)
        samples.push(Math.min(1, Math.max(0.05, amp * envelope)))
      }
      dataRef.current = samples
    }

    const render = () => {
      if (!ctx || !canvas || !dataRef.current) return
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const samples = dataRef.current
      const progress = duration > 0 ? Math.min(1, currentTime / WAVEFORM_DURATION) : 0
      const progressX = progress * w

      ctx.lineWidth = 1
      const center = h / 2

      for (let i = 0; i < samples.length; i++) {
        const x = (i / samples.length) * w
        const barH = samples[i] * (h - 8)
        const isPlayed = x <= progressX

        const grad = ctx.createLinearGradient(0, center - barH / 2, 0, center + barH / 2)
        if (isPlayed) {
          grad.addColorStop(0, 'rgba(167, 139, 250, 0.95)')
          grad.addColorStop(1, 'rgba(139, 92, 246, 0.7)')
        } else {
          grad.addColorStop(0, 'rgba(100, 116, 139, 0.5)')
          grad.addColorStop(1, 'rgba(71, 85, 105, 0.3)')
        }
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(x, center - barH / 2)
        ctx.lineTo(x, center + barH / 2)
        ctx.stroke()
      }

      if (progress > 0 && progress <= 1) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(progressX, 0)
        ctx.lineTo(progressX, h)
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(progressX, center, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [track, currentTime, duration])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={50}
      className="w-full h-[50px]"
    />
  )
}

interface TrackCardProps {
  track: Track
  index: number
  isSelected: boolean
  isPlaying: boolean
  currentTime: number
  onSelect: () => void
  onTogglePlay: () => void
  onUpload: () => void
  onRemove: () => void
  onFileChosen: (file: File) => void
}

const TrackCard: React.FC<TrackCardProps> = ({
  track, index, isSelected, isPlaying, currentTime,
  onSelect, onTogglePlay, onUpload, onRemove, onFileChosen,
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`relative cursor-pointer transition-all duration-200 rounded-2xl p-4 flex flex-col gap-3
        ${isSelected ? 'border-l-4 border-l-accent bg-surface' : 'border-l-4 border-l-transparent bg-surface/60 hover:bg-surface'}
        hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]
      `}
      style={{ width: '440px', height: '160px' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center overflow-hidden">
          <Music2 size={18} className="text-accent2" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate text-slate-100">{track.name}</div>
          <div className="text-[11px] text-slate-400">
            音轨 {index + 1} · {track.audioUrl ? '已加载' : '未加载'} · 音量 {track.volume}%
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
          disabled={!track.audioUrl}
          className={`btn-ripple w-9 h-9 rounded-xl flex items-center justify-center transition-colors
            ${track.audioUrl
              ? isPlaying
                ? 'bg-accent text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                : 'bg-surface-light text-accent2 hover:bg-accent/30'
              : 'bg-surface-light text-slate-500 cursor-not-allowed'
            }`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
          className="btn-ripple w-9 h-9 rounded-xl bg-surface-light text-slate-400 hover:text-accent2 hover:bg-accent/20 flex items-center justify-center transition-colors"
          title="上传音频"
        >
          <Volume2 size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileChosen(f)
          }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="btn-ripple w-9 h-9 rounded-xl bg-surface-light text-slate-500 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
          title="移除音轨"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <WaveformCanvas track={track} currentTime={currentTime} duration={track.audioUrl ? 10 : 0} />

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {formatTime(currentTime)} / {formatTime(10)}
        </span>
        <div className="flex items-center gap-3">
          <span>声像: {track.pan > 0 ? `R${track.pan}` : track.pan < 0 ? `L${-track.pan}` : 'C'}</span>
          <span>LP: {track.lowPass}Hz</span>
          <span>HP: {track.highPass}Hz</span>
        </div>
      </div>
    </div>
  )
}

function formatTime(s: number): string {
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const Playlist: React.FC = () => {
  const {
    tracks, isPlaying, currentTime, selectedTrackId,
    selectTrack, setPlaying, setCurrentTime, setTrackAudio, removeTrack,
  } = useAudioStore()

  const [localTime, setLocalTime] = useState(0)

  useEffect(() => {
    if (!isPlaying) {
      setLocalTime(currentTime)
      return
    }
    let rafId: number
    const start = performance.now()
    const base = currentTime
    const loop = () => {
      const elapsed = (performance.now() - start) / 1000
      setLocalTime(base + elapsed)
      setCurrentTime(base + elapsed)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, currentTime, setCurrentTime])

  const handleTogglePlay = (trackId: string) => {
    selectTrack(trackId)
    setPlaying(!isPlaying)
  }

  const handleFileChosen = (trackId: string, file: File) => {
    const url = URL.createObjectURL(file)
    setTrackAudio(trackId, url, file.name.replace(/\.[^/.]+$/, ''))
  }

  return (
    <div className="h-full flex flex-col bg-primary">
      <div className="px-5 py-4 flex items-center justify-between border-b border-surface-light">
        <div>
          <div className="text-lg font-semibold text-slate-100">音轨列表</div>
          <div className="text-xs text-slate-400 mt-0.5">{tracks.length} / 4 音轨</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(!isPlaying)}
            className={`btn-ripple px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all
              ${isPlaying
                ? 'bg-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                : 'bg-surface-light text-slate-200 hover:bg-accent/30 hover:text-accent2'
              }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            {isPlaying ? '暂停' : '播放全部'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3">
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id}
            track={track}
            index={index}
            isSelected={selectedTrackId === track.id}
            isPlaying={isPlaying && selectedTrackId === track.id}
            currentTime={selectedTrackId === track.id ? localTime : 0}
            onSelect={() => selectTrack(track.id)}
            onTogglePlay={() => handleTogglePlay(track.id)}
            onUpload={() => {}}
            onRemove={() => removeTrack(track.id)}
            onFileChosen={(f) => handleFileChosen(track.id, f)}
          />
        ))}
      </div>
    </div>
  )
}

export default Playlist
