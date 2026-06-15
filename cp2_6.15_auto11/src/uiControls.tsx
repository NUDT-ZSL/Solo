import React, { useState, useRef, useEffect } from 'react'
import type { ColorTheme, BackgroundPreset } from './particleScene'
import type { PlaybackState } from './audioProcessor'
import { audioProcessor } from './audioProcessor'
import { getAllPresets } from './presetMusic'
import type { ExportFormat, ExportDuration } from './exportUtils'

export interface UIControlsProps {
  onFileUpload: (file: File) => void
  uploadProgress: number
  isLoading: boolean
  playbackState: PlaybackState
  currentTime: number
  duration: number
  particleSize: number
  particleSpeed: number
  colorTheme: ColorTheme
  solidColor: string
  background: BackgroundPreset
  loopEnabled: boolean
  isRecording: boolean
  recordingProgress: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onParticleSizeChange: (v: number) => void
  onParticleSpeedChange: (v: number) => void
  onColorThemeChange: (t: ColorTheme) => void
  onSolidColorChange: (c: string) => void
  onBackgroundChange: (b: BackgroundPreset) => void
  onLoopToggle: (enabled: boolean) => void
  onPresetLoad: (index: number) => void
  onExportClick: () => void
}

const BACKGROUND_PRESETS: BackgroundPreset[] = ['#000011', '#1a0033', '#001f3f']
const BACKGROUND_NAMES = ['深空黑', '星空紫', '海洋蓝']

const COLOR_THEMES: ColorTheme[] = ['gradient', 'solid', 'rainbow']
const THEME_NAMES = ['渐变', '单色', '彩虹']

export function UIControls(props: UIControlsProps) {
  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (props.duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    props.onSeek(percent * props.duration)
  }

  const hasAudio = props.duration > 0
  const isReadyOrPlaying = ['ready', 'playing', 'paused', 'stopped'].includes(props.playbackState)

  return (
    <>
      <div className="top-bar">
        <div className="app-title">🎵 音乐粒子动画工作室</div>

        <div className="playback-controls">
          <button
            className="btn btn-icon"
            onClick={props.onStop}
            disabled={!isReadyOrPlaying}
            title="停止"
          >
            ⏹
          </button>
          <button
            className="btn btn-icon"
            onClick={props.playbackState === 'playing' ? props.onPause : props.onPlay}
            disabled={!isReadyOrPlaying}
            title={props.playbackState === 'playing' ? '暂停' : '播放'}
          >
            {props.playbackState === 'playing' ? '⏸' : '▶'}
          </button>
        </div>

        <div className="progress-container">
          <span className="time-display">{formatTime(props.currentTime)}</span>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div
              className="progress-fill"
              style={{ width: `${(props.currentTime / Math.max(props.duration, 0.001)) * 100}%` }}
            />
          </div>
          <span className="time-display">{formatTime(props.duration)}</span>
        </div>

        <button
          className="btn"
          onClick={props.onExportClick}
          disabled={!hasAudio || props.isRecording}
        >
          🎬 导出
        </button>
      </div>
    </>
  )
}

interface ControlPanelProps {
  onFileUpload: (file: File) => void
  uploadProgress: number
  isLoading: boolean
  particleSize: number
  particleSpeed: number
  colorTheme: ColorTheme
  solidColor: string
  background: BackgroundPreset
  loopEnabled: boolean
  onParticleSizeChange: (v: number) => void
  onParticleSpeedChange: (v: number) => void
  onColorThemeChange: (t: ColorTheme) => void
  onSolidColorChange: (c: string) => void
  onBackgroundChange: (b: BackgroundPreset) => void
  onLoopToggle: (enabled: boolean) => void
  onPresetLoad: (index: number) => void
}

export function ControlPanel(props: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const presets = getAllPresets()

  const handleUploadClick = () => {
    if (!props.isLoading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 20 * 1024 * 1024
      if (file.size > maxSize) {
        alert('文件大小不能超过 20MB')
        return
      }
      props.onFileUpload(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="control-panel">
      <div className="panel-section">
        <div className="panel-title">🎵 音乐加载</div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="upload-area" onClick={handleUploadClick}>
          <div className="upload-text">
            {props.isLoading ? (
              <>
                <div>正在解析音频...</div>
                <div className="upload-progress">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${props.uploadProgress * 100}%` }}
                  />
                </div>
                <div style={{ fontSize: '11px', marginTop: 8 }}>
                  {Math.round(props.uploadProgress * 100)}%
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                <div>点击上传 MP3 / WAV 文件</div>
                <div style={{ fontSize: '11px', marginTop: 4, opacity: 0.6 }}>最大 20MB</div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panel-title" style={{ marginBottom: 10 }}>🎹 预设音乐</div>
          {presets.map((p, i) => (
            <div
              key={i}
              className="preset-music-card"
              onClick={() => props.onPresetLoad(i)}
            >
              <div className="preset-music-name">{p.name}</div>
              <div className="preset-music-desc">{p.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">⚙️ 粒子参数</div>

        <div className="control-row">
          <div className="control-label">
            <span>粒子大小</span>
            <span className="control-value">{props.particleSize.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.02}
            max={0.2}
            step={0.01}
            value={props.particleSize}
            onChange={(e) => props.onParticleSizeChange(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-row">
          <div className="control-label">
            <span>粒子速度</span>
            <span className="control-value">{props.particleSpeed.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={props.particleSpeed}
            onChange={(e) => props.onParticleSpeedChange(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">🎨 颜色设置</div>

        <div className="control-row">
          <div className="control-label">
            <span>颜色主题</span>
          </div>
          <div className="btn-group">
            {COLOR_THEMES.map((theme, i) => (
              <button
                key={theme}
                className={`btn btn-secondary ${props.colorTheme === theme ? 'active' : ''}`}
                onClick={() => props.onColorThemeChange(theme)}
              >
                {THEME_NAMES[i]}
              </button>
            ))}
          </div>
        </div>

        {props.colorTheme === 'solid' && (
          <div className="control-row">
            <div className="control-label">
              <span>单色颜色</span>
            </div>
            <input
              type="color"
              value={props.solidColor}
              onChange={(e) => props.onSolidColorChange(e.target.value)}
            />
          </div>
        )}

        <div className="control-row">
          <div className="control-label">
            <span>背景色</span>
          </div>
          <div className="color-picker-row">
            {BACKGROUND_PRESETS.map((color, i) => (
              <div
                key={color}
                className={`color-swatch ${props.background === color ? 'active' : ''}`}
                style={{ background: color }}
                title={BACKGROUND_NAMES[i]}
                onClick={() => props.onBackgroundChange(color)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">🎛️ 播放设置</div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={props.loopEnabled}
            onChange={(e) => props.onLoopToggle(e.target.checked)}
          />
          循环播放
        </label>
      </div>
    </div>
  )
}

interface ExportModalProps {
  visible: boolean
  onClose: () => void
  totalDuration: number
  onStart: (format: ExportFormat, duration: ExportDuration) => void
}

export function ExportModal({ visible, onClose, totalDuration, onStart }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('video')
  const [duration, setDuration] = useState<ExportDuration>(10)

  useEffect(() => {
    if (visible) {
      setFormat('video')
      setDuration(totalDuration >= 60 ? 30 : (totalDuration >= 30 ? 10 : 'full'))
    }
  }, [visible, totalDuration])

  if (!visible) return null

  const durationOptions: { value: ExportDuration; label: string; disabled: boolean }[] = [
    { value: 10, label: '10 秒', disabled: totalDuration < 10 },
    { value: 30, label: '30 秒', disabled: totalDuration < 30 },
    { value: 60, label: '60 秒', disabled: totalDuration < 60 },
    { value: 'full', label: '完整', disabled: totalDuration <= 0 },
  ]

  return (
    <div className="export-modal-backdrop" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">📤 导出动画</div>

        <div className="control-row">
          <div className="control-label">
            <span>导出格式</span>
          </div>
          <div className="btn-group" style={{ marginBottom: 10 }}>
            <button
              className={`btn btn-secondary ${format === 'video' ? 'active' : ''}`}
              onClick={() => setFormat('video')}
            >
              🎬 视频 (WebM)
            </button>
            <button
              className={`btn btn-secondary ${format === 'gif' ? 'active' : ''}`}
              onClick={() => setFormat('gif')}
            >
              🖼️ GIF 动图
            </button>
          </div>
        </div>

        <div className="control-row">
          <div className="control-label">
            <span>导出时长</span>
          </div>
          <div className="btn-group">
            {durationOptions.map((opt) => (
              <button
                key={String(opt.value)}
                className={`btn btn-secondary ${duration === opt.value ? 'active' : ''}`}
                disabled={opt.disabled}
                onClick={() => setDuration(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            取消
          </button>
          <button
            className="btn"
            onClick={() => onStart(format, duration)}
            style={{ flex: 2 }}
          >
            开始录制
          </button>
        </div>
      </div>
    </div>
  )
}

interface RecordingOverlayProps {
  visible: boolean
  progress: number
  targetDuration: number
}

export function RecordingOverlay({ visible, progress, targetDuration }: RecordingOverlayProps) {
  if (!visible) return null

  const remaining = Math.ceil(targetDuration * (1 - progress))

  return (
    <div className="recording-info" style={{ position: 'fixed' }}>
      <span className="recording-dot" />
      录制中 {Math.round(progress * 100)}% · 剩余 {remaining}s
    </div>
  )
}

interface VisualizationProps {
  currentTime: number
  duration: number
  hasAudio: boolean
}

export function Visualization({ currentTime, duration, hasAudio }: VisualizationProps) {
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const freqRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const waveformCanvas = waveformRef.current
    const freqCanvas = freqRef.current
    if (!waveformCanvas || !freqCanvas) return

    const drawWaveform = () => {
      const ctx = waveformCanvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      const w = waveformCanvas.clientWidth
      const h = waveformCanvas.clientHeight
      waveformCanvas.width = w * dpr
      waveformCanvas.height = h * dpr
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, w, h)

      if (!hasAudio) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.fillRect(0, h / 2 - 1, w, 2)
        return
      }

      const data = audioProcessor.getAnalysisData()
      if (!data) return

      const waveform = data.waveform
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1
      ctx.beginPath()

      for (let i = 0; i < waveform.length; i++) {
        const x = (i / waveform.length) * w
        const y = h / 2 + waveform[i] * (h / 2 - 2) * (i < waveform.length / 2 ? -1 : 1)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      if (duration > 0) {
        const progX = (currentTime / duration) * w
        ctx.strokeStyle = '#4facfe'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(progX, 0)
        ctx.lineTo(progX, h)
        ctx.stroke()
      }
    }

    const drawFrequency = () => {
      const ctx = freqCanvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      const w = freqCanvas.clientWidth
      const h = freqCanvas.clientHeight
      freqCanvas.width = w * dpr
      freqCanvas.height = h * dpr
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, w, h)

      const spectrum = audioProcessor.getSharedSpectrum()
      if (!spectrum) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        for (let i = 0; i < 64; i++) {
          const x = (i / 64) * w + 1
          ctx.fillRect(x, h - 3, (w / 64) - 2, 3)
        }
        return
      }

      const bars = 64
      const barWidth = (w / bars) - 1
      const bucketSize = Math.floor(spectrum.length / bars)

      for (let i = 0; i < bars; i++) {
        let sum = 0
        for (let j = 0; j < bucketSize; j++) {
          sum += spectrum[i * bucketSize + j] || 0
        }
        const avg = sum / bucketSize
        const barHeight = Math.max(2, avg * (h - 4))
        const x = (i / bars) * w

        const hue = (1 - i / bars) * 240
        const gradient = ctx.createLinearGradient(0, h - barHeight, 0, h)
        gradient.addColorStop(0, `hsl(${hue}, 100%, 60%)`)
        gradient.addColorStop(1, `hsl(${hue}, 100%, 40%)`)
        ctx.fillStyle = gradient

        ctx.fillRect(x, h - barHeight, barWidth, barHeight)
      }
    }

    let animId: number
    const loop = () => {
      drawWaveform()
      drawFrequency()
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(animId)
  }, [currentTime, duration, hasAudio])

  return (
    <div className="visualization-container">
      <canvas ref={waveformRef} className="waveform-canvas" />
      <canvas ref={freqRef} className="frequency-canvas" />
    </div>
  )
}
