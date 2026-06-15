import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  Particle,
  PulseState,
  ParticleSystemConfig,
  createParticlesFromText,
  updateParticles,
  drawParticles,
  triggerPulse,
  resetParticles,
} from './utils/particleSystem'

interface SandCanvasProps {
  text: string
  config: ParticleSystemConfig
  onPulseTriggered?: () => void
}

export interface SandCanvasHandle {
  reset: () => void
  exportPNG: () => void
}

const SandCanvas = forwardRef<SandCanvasHandle, SandCanvasProps>(({ text, config, onPulseTriggered }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const pulseRef = useRef<PulseState>({ active: false, cx: 0, cy: 0, radius: 0, maxRadius: 0, speed: 0 })
  const configRef = useRef(config)
  const textRef = useRef(text)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const dprRef = useRef(1)
  const needRegenRef = useRef(false)

  useEffect(() => { configRef.current = config }, [config])
  useEffect(() => {
    if (textRef.current !== text) {
      textRef.current = text
      needRegenRef.current = true
    }
  }, [text])

  const regenerateParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = sizeRef.current
    if (w === 0 || h === 0) return

    particlesRef.current = createParticlesFromText(textRef.current, w, h, dprRef.current)
    pulseRef.current = { active: false, cx: 0, cy: 0, radius: 0, maxRadius: 0, speed: 0 }
    needRegenRef.current = false
  }, [])

  useImperativeHandle(ref, () => ({
    reset: () => {
      resetParticles(particlesRef.current)
      pulseRef.current = triggerPulse(sizeRef.current.w, sizeRef.current.h)
      onPulseTriggered?.()
    },
    exportPNG: () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const link = document.createElement('a')
      link.download = `字影流沙_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr
      const rect = parent.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      sizeRef.current = { w, h }
      needRegenRef.current = true
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      if (needRegenRef.current) {
        regenerateParticles()
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { w, h } = sizeRef.current
      const dpr = dprRef.current

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      updateParticles(particlesRef.current, configRef.current, pulseRef.current, delta, w, h)
      drawParticles(ctx, particlesRef.current, w, h, dpr)

      ctx.restore()

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [regenerateParticles])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  )
})

SandCanvas.displayName = 'SandCanvas'

export default SandCanvas
