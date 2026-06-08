import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { Howl } from 'howler'
import { formatTimeShort } from '@/utils/formatTime'

interface AudioPlayerProps {
  onFileLoaded: (howl: Howl, duration: number) => void
  onPlayStateChange: (isPlaying: boolean) => void
  onTimeUpdate: (time: number) => void
  onEnded: () => void
  currentTime: number
  duration: number
  isPlaying: boolean
  volume: number
  onVolumeChange: (volume: number) => void
  onSeek: (time: number) => void
  analyzerConnect?: (audioEl: HTMLAudioElement) => void
}

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 4L16 22M16 4L10 10M16 4L22 10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 20V26C6 27.1046 6.89543 28 8 28H24C25.1046 28 26 27.1046 26 26V20"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
)

export function AudioPlayer({
  onFileLoaded,
  onPlayStateChange,
  onTimeUpdate,
  onEnded,
  currentTime,
  duration,
  isPlaying,
  volume,
  onVolumeChange,
  onSeek,
  analyzerConnect,
}: AudioPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const howlRef = useRef<Howl | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number | null>(null)

  const tick = useCallback(() => {
    if (howlRef.current && howlRef.current.playing()) {
      const t = howlRef.current.seek() as number
      onTimeUpdate(t)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onTimeUpdate])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [tick])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (howlRef.current) {
        howlRef.current.unload()
        howlRef.current = null
      }

      const url = URL.createObjectURL(file)

      const audioEl = new Audio()
      audioEl.src = url
      audioEl.preload = 'auto'
      audioElRef.current = audioEl

      if (analyzerConnect) {
        analyzerConnect(audioEl)
      }

      const howl = new Howl({
        src: [url],
        html5: true,
        volume: volume,
        onload: () => {
          const dur = howl.duration()
          onFileLoaded(howl, dur)
          onTimeUpdate(0)
          howl.play()
          onPlayStateChange(true)
        },
        onplay: () => onPlayStateChange(true),
        onpause: () => onPlayStateChange(false),
        onend: () => {
          onPlayStateChange(false)
          onEnded()
        },
        onstop: () => onPlayStateChange(false),
      })

      howlRef.current = howl
    },
    [onFileLoaded, onPlayStateChange, onTimeUpdate, onEnded, volume, analyzerConnect],
  )

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handlePlayPause = () => {
    if (!howlRef.current) return
    if (howlRef.current.playing()) {
      howlRef.current.pause()
    } else {
      howlRef.current.play()
    }
  }

  const seekFromClientX = useCallback(
    (clientX: number) => {
      if (!progressRef.current || !duration) return
      const rect = progressRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newTime = ratio * duration
      if (howlRef.current) {
        howlRef.current.seek(newTime)
      }
      onSeek(newTime)
    },
    [duration, onSeek],
  )

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    if (!duration) return
    setIsDragging(true)
    seekFromClientX(e.clientX)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      seekFromClientX(e.clientX)
    }
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, seekFromClientX])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    onVolumeChange(v)
    if (howlRef.current) {
      howlRef.current.volume(v)
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="audio-controls">
      <div className="controls-row">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp3,.mp3,.wav"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button type="button" className="upload-btn primary" onClick={handleUploadClick}>
          <UploadIcon />
          <span>上传音频</span>
        </button>

        <button
          type="button"
          className="play-btn primary"
          onClick={handlePlayPause}
          disabled={!howlRef.current}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
        </button>

        <div className="progress-container">
          <span className="time-display">{formatTimeShort(currentTime)}</span>
          <div
            ref={progressRef}
            className="progress-bar"
            onMouseDown={handleProgressMouseDown}
          >
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            <div
              className="progress-handle"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <span className="time-display">{formatTimeShort(duration)}</span>
        </div>

        <div className="volume-container">
          <Volume2 size={16} color="#a0aec0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  )
}
