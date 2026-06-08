import React, { useRef, useEffect, useState, useCallback } from 'react'

export interface Shape {
  type: string
  x: number
  y: number
  size: number
  color: string
  opacity: number
  rotation: number
  pulseSpeed: number
  pulseAmplitude: number
}

export interface ParticleConfig {
  count: number
  colors: string[]
  sizeRange: [number, number]
  speedRange: [number, number]
  frequency_response: number
  beat_sensitivity: number
}

export interface WaveformConfig {
  color: string
  opacity: number
  lineWidth: number
  amplitudeScale: number
}

export interface IllustrationParams {
  bg_gradient: { color1: string; color2: string; angle: number }
  shapes: Shape[]
  particle_config: ParticleConfig
  waveform_config: WaveformConfig
  mood: string
}

export interface SoundscapeData {
  id: string
  title: string
  mood: string
  audio_url: string
  illustration: IllustrationParams
  likes: number
  user_id: string
  created_at: string
}

export function drawIllustration(
  ctx: CanvasRenderingContext2D,
  params: IllustrationParams,
  w: number,
  h: number,
  time: number = 0
) {
  const angleRad = (params.bg_gradient.angle * Math.PI) / 180
  const gx = Math.cos(angleRad) * w
  const gy = Math.sin(angleRad) * h
  const grad = ctx.createLinearGradient(w / 2 - gx / 2, h / 2 - gy / 2, w / 2 + gx / 2, h / 2 + gy / 2)
  grad.addColorStop(0, params.bg_gradient.color1)
  grad.addColorStop(1, params.bg_gradient.color2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  for (const shape of params.shapes) {
    ctx.save()
    const pulse = 1 + Math.sin(time * shape.pulseSpeed) * shape.pulseAmplitude
    const size = shape.size * pulse
    const cx = shape.x * w
    const cy = shape.y * h
    ctx.globalAlpha = Math.max(0, Math.min(shape.opacity, 1))
    ctx.translate(cx, cy)
    ctx.rotate(((shape.rotation + time * 8) * Math.PI) / 180)
    ctx.fillStyle = shape.color

    if (shape.type === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (shape.type === 'rect') {
      const r = 4
      ctx.beginPath()
      ctx.moveTo(-size / 2 + r, -size / 2)
      ctx.lineTo(size / 2 - r, -size / 2)
      ctx.quadraticCurveTo(size / 2, -size / 2, size / 2, -size / 2 + r)
      ctx.lineTo(size / 2, size / 2 - r)
      ctx.quadraticCurveTo(size / 2, size / 2, size / 2 - r, size / 2)
      ctx.lineTo(-size / 2 + r, size / 2)
      ctx.quadraticCurveTo(-size / 2, size / 2, -size / 2, size / 2 - r)
      ctx.lineTo(-size / 2, -size / 2 + r)
      ctx.quadraticCurveTo(-size / 2, -size / 2, -size / 2 + r, -size / 2)
      ctx.closePath()
      ctx.fill()
    } else if (shape.type === 'triangle') {
      ctx.beginPath()
      ctx.moveTo(0, -size / 2)
      ctx.lineTo(size / 2, size / 2)
      ctx.lineTo(-size / 2, size / 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  baseSize: number
}

function createParticles(config: ParticleConfig, w: number, h: number): Particle[] {
  const particles: Particle[] = []
  const count = Math.min(config.count, 150)
  for (let i = 0; i < count; i++) {
    const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0])
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0])) * (Math.random() > 0.5 ? 1 : -1) * 0.3,
      vy: (config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0])) * (Math.random() > 0.5 ? 1 : -1) * 0.3,
      size,
      baseSize: size,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      opacity: 0.3 + Math.random() * 0.5,
    })
  }
  return particles
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  frequencyData: Uint8Array | null,
  config: ParticleConfig,
  w: number,
  h: number
) {
  let avgFreq = 0.2
  let bassFreq = 0.2
  if (frequencyData && frequencyData.length > 0) {
    let sum = 0
    let bassSum = 0
    const bassEnd = Math.floor(frequencyData.length * 0.15)
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i]
      if (i < bassEnd) bassSum += frequencyData[i]
    }
    avgFreq = sum / frequencyData.length / 255
    bassFreq = bassSum / Math.max(bassEnd, 1) / 255
  }

  for (const p of particles) {
    const modVx = p.vx * (1 + avgFreq * config.frequency_response * 2)
    const modVy = p.vy * (1 + avgFreq * config.frequency_response * 2)
    p.x += modVx
    p.y += modVy

    if (p.x > w + 20) p.x = -20
    if (p.x < -20) p.x = w + 20
    if (p.y > h + 20) p.y = -20
    if (p.y < -20) p.y = h + 20

    p.size = p.baseSize * (1 + bassFreq * config.beat_sensitivity * 1.5)

    ctx.save()
    ctx.globalAlpha = p.opacity * (0.4 + avgFreq * 0.6)
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = p.size * 2
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  w: number,
  h: number,
  config: WaveformConfig
) {
  const bufferLength = analyser.frequencyBinCount
  const timeData = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(timeData)

  ctx.save()
  ctx.strokeStyle = config.color
  ctx.globalAlpha = config.opacity
  ctx.lineWidth = config.lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const sliceWidth = w / bufferLength
  let x = 0

  ctx.beginPath()
  for (let i = 0; i < bufferLength; i++) {
    const v = timeData[i] / 128.0
    const y = (v * h) / 2
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
    x += sliceWidth
  }
  ctx.stroke()
  ctx.restore()
}

export { createParticles }
export type { Particle }

const MOOD_STYLES: Record<string, { bg: string; color: string; emoji: string }> = {
  宁静: { bg: 'rgba(147, 197, 253, 0.25)', color: '#3b82f6', emoji: '🌊' },
  欢快: { bg: 'rgba(251, 191, 36, 0.25)', color: '#d97706', emoji: '☀️' },
  忧郁: { bg: 'rgba(129, 140, 248, 0.25)', color: '#6366f1', emoji: '🌧' },
  激昂: { bg: 'rgba(239, 68, 68, 0.25)', color: '#dc2626', emoji: '🔥' },
  梦幻: { bg: 'rgba(192, 132, 252, 0.25)', color: '#9333ea', emoji: '✨' },
  温暖: { bg: 'rgba(251, 146, 60, 0.25)', color: '#ea580c', emoji: '🕯' },
}

interface SoundscapeCardProps {
  soundscape: SoundscapeData
  isPlaying: boolean
  analyser: AnalyserNode | null
  onPlayToggle: (e: React.MouseEvent) => void
  onClick: () => void
}

export default function SoundscapeCard({ soundscape, isPlaying, analyser, onPlayToggle, onClick }: SoundscapeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const startTimeRef = useRef<number>(0)
  const [hovered, setHovered] = useState(false)

  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    drawIllustration(ctx, soundscape.illustration, w, h, 0)
  }, [soundscape.illustration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    drawStatic()
  }, [drawStatic])

  useEffect(() => {
    if (isPlaying) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      particlesRef.current = createParticles(soundscape.illustration.particle_config, w, h)
      startTimeRef.current = performance.now() / 1000

      const animate = () => {
        const time = performance.now() / 1000 - startTimeRef.current
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        drawIllustration(ctx, soundscape.illustration, w, h, time)

        let freqData: Uint8Array | null = null
        if (analyser) {
          freqData = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(freqData)
        }
        drawParticles(ctx, particlesRef.current, freqData, soundscape.illustration.particle_config, w, h)
        ctx.restore()
        animRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = 0
      }
      drawStatic()
    }
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
    }
  }, [isPlaying, analyser, soundscape.illustration, drawStatic])

  const moodStyle = MOOD_STYLES[soundscape.mood] || MOOD_STYLES.宁静

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        breakInside: 'avoid',
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: hovered
          ? '0 12px 40px rgba(139,92,246,0.18), 0 4px 12px rgba(0,0,0,0.08)'
          : '0 4px 20px rgba(0,0,0,0.06)',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '65%', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlayToggle(e)
          }}
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: isPlaying
              ? 'rgba(255,255,255,0.9)'
              : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: isPlaying ? '#6366f1' : '#fff',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.3)'
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              background: moodStyle.bg,
              color: moodStyle.color,
            }}
          >
            {moodStyle.emoji} {soundscape.mood}
          </span>
        </div>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {soundscape.title}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            ❤️ {soundscape.likes}
          </span>
          <span style={{ fontSize: 11, color: '#cbd5e1' }}>
            {new Date(soundscape.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  )
}
