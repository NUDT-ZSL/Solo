import React, { useEffect, useRef, useState } from 'react'
import type { SoundTrackItem } from '../types'

interface AudioMixerProps {
  tracks: SoundTrackItem[]
  masterVolume: number
  isPlaying: boolean
  trackLevels: Record<string, number>
  onVolumeChange: (trackId: string, volume: number) => void
  onMuteToggle: (trackId: string) => void
  onSoloToggle: (trackId: string) => void
  onRemoveTrack: (trackId: string) => void
  onMasterVolumeChange: (volume: number) => void
  onTogglePlay: () => void
  onEqChange?: (trackId: string, eq: { low: number; mid: number; high: number }) => void
  readOnly?: boolean
  showControls?: boolean
}

const VolumeWave: React.FC<{ level: number; muted: boolean }> = ({ level, muted }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()

    const draw = () => {
      timeRef.current += 0.03
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      ctx.clearRect(0, 0, width, height)

      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, '#7c6faa')
      gradient.addColorStop(1, '#b8a9e8')

      ctx.fillStyle = gradient

      const effectiveLevel = muted ? 0 : level
      const waveHeight = Math.max(4, effectiveLevel * height * 2.5)
      const baseline = height - 4

      ctx.beginPath()
      ctx.moveTo(0, baseline)

      for (let x = 0; x <= width; x += 2) {
        const y =
          baseline -
          (Math.sin(x * 0.02 + timeRef.current) * 0.3 +
            Math.sin(x * 0.05 + timeRef.current * 1.5) * 0.2 +
            0.5) *
            waveHeight
        ctx.lineTo(x, y)
      }

      ctx.lineTo(width, baseline)
      ctx.closePath()
      ctx.fill()

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
    }
  }, [level, muted])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '32px',
        display: 'block',
        borderRadius: '4px',
        opacity: muted ? 0.3 : 1,
        transition: 'opacity 0.2s ease',
      }}
    />
  )
}

const EQSlider: React.FC<{
  label: string
  value: number
  onChange: (value: number) => void
}> = ({ label, value, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '10px', color: '#a8a0c0' }}>{label}</span>
      <input
        type="range"
        min="-12"
        max="12"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '60px',
          transform: 'rotate(-90deg)',
          margin: '20px 0',
        }}
      />
      <span style={{ fontSize: '10px', color: '#b8a9e8', minWidth: '32px', textAlign: 'center' }}>
        {value > 0 ? '+' : ''}
        {value}dB
      </span>
    </div>
  )
}

const TrackCard: React.FC<{
  track: SoundTrackItem
  level: number
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onSoloToggle: () => void
  onRemove: () => void
  onEqChange?: (eq: { low: number; mid: number; high: number }) => void
  showEq?: boolean
  isNew?: boolean
}> = ({ track, level, onVolumeChange, onMuteToggle, onSoloToggle, onRemove, onEqChange, showEq, isNew }) => {
  const [showEqPanel, setShowEqPanel] = useState(false)

  return (
    <div
      className={isNew ? 'track-bounce-in' : ''}
      style={{
        background: '#2d2a3e',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
        border: '1px solid #3a3650',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            fontSize: '28px',
            flexShrink: 0,
            opacity: track.muted ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          {track.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#e0d8f0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: track.muted ? 0.5 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {track.name}
          </div>
          <VolumeWave level={level} muted={track.muted} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onSoloToggle}
          title="独奏"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: track.solo ? '#7c6faa' : '#4a4660',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          S
        </button>

        <button
          onClick={onMuteToggle}
          title="静音"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: track.muted ? '#7c6faa' : '#4a4660',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          M
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={track.volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          disabled={track.muted}
          style={{
            flex: 1,
            width: '120px',
            opacity: track.muted ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />

        <span
          style={{
            fontSize: '12px',
            color: '#b8a9e8',
            minWidth: '36px',
            textAlign: 'right',
            fontWeight: 600,
          }}
        >
          {track.volume}%
        </span>

        {onEqChange && (
          <button
            onClick={() => setShowEqPanel(!showEqPanel)}
            title="均衡器"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: showEqPanel ? '#7c6faa' : '#4a4660',
              color: '#b8a9e8',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            🎚️
          </button>
        )}

        <button
          onClick={onRemove}
          title="移除"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#4a4660',
            color: '#e0d8f0',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e74c3c'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4a4660'
          }}
        >
          ✕
        </button>
      </div>

      {showEqPanel && onEqChange && (
        <div
          style={{
            background: '#1e1e2e',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-around',
            gap: '12px',
          }}
        >
          <EQSlider
            label="低频"
            value={track.eq?.low ?? 0}
            onChange={(v) =>
              onEqChange({ low: v, mid: track.eq?.mid ?? 0, high: track.eq?.high ?? 0 })
            }
          />
          <EQSlider
            label="中频"
            value={track.eq?.mid ?? 0}
            onChange={(v) =>
              onEqChange({ low: track.eq?.low ?? 0, mid: v, high: track.eq?.high ?? 0 })
            }
          />
          <EQSlider
            label="高频"
            value={track.eq?.high ?? 0}
            onChange={(v) =>
              onEqChange({ low: track.eq?.low ?? 0, mid: track.eq?.mid ?? 0, high: v })
            }
          />
        </div>
      )}
    </div>
  )
}

const AudioMixer: React.FC<AudioMixerProps> = ({
  tracks,
  masterVolume,
  isPlaying,
  trackLevels,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onRemoveTrack,
  onMasterVolumeChange,
  onTogglePlay,
  onEqChange,
  readOnly = false,
  showControls = true,
}) => {
  const [newTrackId, setNewTrackId] = useState<string | null>(null)
  const prevTrackIdsRef = useRef<string[]>([])

  useEffect(() => {
    const currentIds = tracks.map((t) => t.id)
    const prevIds = prevTrackIdsRef.current
    const newId = currentIds.find((id) => !prevIds.includes(id))

    if (newId) {
      setNewTrackId(newId)
      const timer = setTimeout(() => setNewTrackId(null), 300)
      return () => clearTimeout(timer)
    }

    prevTrackIdsRef.current = currentIds
  }, [tracks])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '20px',
      }}
    >
      {showControls && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            padding: '12px',
          }}
        >
          <button
            onClick={onTogglePlay}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#6c5ce7',
              color: '#fff',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(108, 92, 231, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7d6ff0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#6c5ce7'
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {tracks.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c7599',
              fontSize: '14px',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '48px' }}>🎧</span>
            <span>从左侧拖拽音源到这里开始混音</span>
          </div>
        ) : (
          tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              level={trackLevels[track.id] ?? 0}
              onVolumeChange={(v) => onVolumeChange(track.id, v)}
              onMuteToggle={() => onMuteToggle(track.id)}
              onSoloToggle={() => onSoloToggle(track.id)}
              onRemove={() => onRemoveTrack(track.id)}
              onEqChange={
                onEqChange && !readOnly
                  ? (eq) => onEqChange(track.id, eq)
                  : undefined
              }
              showEq={!readOnly}
              isNew={newTrackId === track.id}
            />
          ))
        )}
      </div>

      {showControls && (
        <div
          style={{
            padding: '16px',
            background: '#1e1e2e',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🔊</span>
          <span style={{ fontSize: '13px', color: '#b8a9e8', minWidth: '48px' }}>
            总音量
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
            className="master-slider"
            style={{ width: '200px' }}
          />
          <span
            style={{
              fontSize: '13px',
              color: '#6c5ce7',
              fontWeight: 600,
              minWidth: '40px',
              textAlign: 'right',
            }}
          >
            {masterVolume}%
          </span>
        </div>
      )}
    </div>
  )
}

export default AudioMixer
