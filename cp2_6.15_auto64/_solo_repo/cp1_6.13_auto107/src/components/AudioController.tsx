import React, { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, RotateCcw, Upload, Music, Power } from 'lucide-react'
import { useAudioStore } from '../store/audioStore'

interface KnobProps {
  value: number
  min: number
  max: number
  label: string
  unit?: string
  onChange: (v: number) => void
}

const Knob: React.FC<KnobProps> = ({ value, min, max, label, unit = '', onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100
  const rotation = (percentage / 100) * 270 - 135
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startValue = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startValue.current = value
    document.body.style.cursor = 'ns-resize'
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      const range = max - min
      const deltaValue = (delta / 150) * range
      const newValue = Math.max(min, Math.min(max, startValue.current + deltaValue))
      onChange(Math.round(newValue))
    }
    const handleUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [min, max, onChange])

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      <div
        className="relative w-12 h-12 cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        <svg className="absolute inset-0 w-full h-full -rotate-45" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke="#334155" strokeWidth="8"
            strokeDasharray="188.5" strokeDashoffset="47.1"
          />
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke="#a78bfa" strokeWidth="8"
            strokeDasharray={`${(percentage / 100) * 188.5} 188.5`}
            strokeDashoffset="47.1"
            style={{ filter: 'drop-shadow(0 0 4px rgba(167, 139, 250, 0.6))' }}
          />
        </svg>
        <div
          className="absolute top-1/2 left-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg"
          style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        >
          <div className="absolute top-1 left-1/2 w-1 h-2.5 rounded-full bg-accent2" style={{ transform: 'translateX(-50%)' }} />
        </div>
      </div>
      <span className="text-xs text-slate-300 font-mono">{value}{unit}</span>
    </div>
  )
}

interface TrackSliderProps {
  value: number
  label: string
  min: number
  max: number
  unit?: string
  color?: string
  onChange: (v: number) => void
}

const TrackSlider: React.FC<TrackSliderProps> = ({ value, label, min, max, unit = '', color = '#8b5cf6', onChange }) => {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-slate-300 font-mono">{value}{unit}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none"
          style={{ left: `calc(${percent}% - 6px)` }}
        />
      </div>
    </div>
  )
}

const AudioController: React.FC = () => {
  const { tracks, reverb, updateTrack, setReverb, resetAll, setTrackAudio } = useAudioStore()
  const [showReset, setShowReset] = useState(false)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    fileRefs.current = fileRefs.current.slice(0, 4)
  }, [])

  const handleFileUpload = async (trackId: string, index: number, file: File) => {
    const url = URL.createObjectURL(file)
    setTrackAudio(trackId, url, file.name.replace(/\.[^/.]+$/, ''))
  }

  return (
    <div className="relative h-[120px] bg-surface divider-blur flex items-center px-4 gap-4">
      {reverb.enabled && (
        <div className="absolute inset-0 pointer-events-none animate-purple-glow">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto scrollbar-thin flex-1">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="flex flex-col gap-1.5 px-3 py-2 bg-primary rounded-xl min-w-[220px] border border-surface-light"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateTrack(track.id, { muted: !track.muted })}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                  track.muted ? 'bg-red-500/20 text-red-400' : 'bg-surface-light text-slate-300'
                }`}
              >
                {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate text-slate-200">{track.name}</div>
              </div>
              <label className="relative btn-ripple w-6 h-6 rounded bg-surface-light hover:bg-accent/30 flex items-center justify-center cursor-pointer text-slate-300 hover:text-accent2">
                <Upload size={12} />
                <input
                  ref={(el) => { fileRefs.current[index] = el }}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(track.id, index, f)
                  }}
                />
              </label>
            </div>
            <TrackSlider
              value={track.volume} label="音量" min={0} max={100} unit="%"
              color="#8b5cf6"
              onChange={(v) => updateTrack(track.id, { volume: v })}
            />
            <div className="flex gap-3 justify-around pt-1">
              <Knob
                value={track.pan} min={-100} max={100} label="声像"
                onChange={(v) => updateTrack(track.id, { pan: v })}
              />
              <Knob
                value={track.lowPass} min={20} max={20000} label="低通" unit="Hz"
                onChange={(v) => updateTrack(track.id, { lowPass: v })}
              />
              <Knob
                value={track.highPass} min={20} max={20000} label="高通" unit="Hz"
                onChange={(v) => updateTrack(track.id, { highPass: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 px-3 border-l border-surface-light h-full">
        <div className="flex flex-col gap-1 items-center">
          <button
            onClick={() => setReverb({ enabled: !reverb.enabled })}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              reverb.enabled
                ? 'bg-accent/30 text-accent2 shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'bg-surface-light text-slate-400'
            }`}
            title="混响开关"
          >
            <Power size={16} />
          </button>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">混响</span>
        </div>
        <Knob
          value={Math.round(reverb.wet * 100)} min={0} max={100} label="干湿" unit="%"
          onChange={(v) => setReverb({ wet: v / 100 })}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">房间</span>
          <div className="flex gap-1">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setReverb({ roomSize: size })}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  reverb.roomSize === size
                    ? 'bg-accent text-white'
                    : 'bg-surface-light text-slate-400 hover:text-slate-200'
                }`}
              >
                {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
              </button>
            ))}
          </div>
        </div>
        <div className="w-px h-12 bg-surface-light" />
        <button
          onClick={() => setShowReset(true)}
          className="btn-ripple w-9 h-9 rounded-lg bg-surface-light hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors"
          title="重置所有"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReset(false)}
        >
          <div
            className="bg-white text-slate-800 rounded-2xl p-6 w-[320px] relative"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-2">确认重置</div>
            <div className="text-sm text-slate-600 mb-5">确定要重置所有音轨和效果器设置吗？此操作不可撤销。</div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReset(false)}
                className="btn-ripple px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={() => { resetAll(); setShowReset(false) }}
                className="btn-ripple px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 text-sm font-medium"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AudioController
