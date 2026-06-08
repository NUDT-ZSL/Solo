import React, { useRef, useEffect, useCallback, useState } from 'react'
import type { EmotionResult } from '../utils/emotionAnalysis'
import { getRandomQuote } from '../utils/emotionAnalysis'
import InfoCard from './InfoCard'

interface Bubble {
  id: number
  x: number
  y: number
  radius: number
  baseRadius: number
  vx: number
  vy: number
  emotion: EmotionResult
  opacity: number
  scale: number
  targetScale: number
  wobbleOffset: number
  wobbleSpeed: number
  hovered: boolean
  clicked: boolean
  birthTime: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
  life: number
  maxLife: number
}

interface BackgroundStar {
  x: number
  y: number
  radius: number
  opacity: number
  speed: number
  phase: number
  phaseSpeed: number
}

interface BubbleCanvasProps {
  bubbles: EmotionResult[]
  onQuoteShow: (quote: string) => void
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 200, g: 200, b: 200 }
}

const BubbleCanvas: React.FC<BubbleCanvasProps> = ({ bubbles: emotionResults, onQuoteShow }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<BackgroundStar[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animFrameRef = useRef<number>(0)
  const [hoveredBubble, setHoveredBubble] = useState<Bubble | null>(null)
  const [cardPos, setCardPos] = useState({ x: 0, y: 0 })
  const lastTimeRef = useRef(0)
  const bubbleIdRef = useRef(0)

  const createBubble = useCallback((emotion: EmotionResult, canvasW: number, canvasH: number, index: number): Bubble => {
    const baseRadius = 30 + emotion.intensity * 50
    const angle = (index / emotionResults.length) * Math.PI * 2 + Math.random() * 0.5
    const dist = 80 + Math.random() * 120
    const cx = canvasW / 2
    const cy = canvasH / 2

    return {
      id: bubbleIdRef.current++,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      radius: baseRadius,
      baseRadius,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      emotion,
      opacity: 0,
      scale: 0.3,
      targetScale: 1,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.005 + Math.random() * 0.01,
      hovered: false,
      clicked: false,
      birthTime: Date.now() + index * 150,
    }
  }, [emotionResults.length])

  const initStars = useCallback((w: number, h: number) => {
    const count = Math.floor((w * h) / 8000)
    starsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.4,
      speed: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.003 + Math.random() * 0.008,
    }))
  }, [])

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 24) => {
    const rgb = hexToRgb(color)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const speed = 2 + Math.random() * 4
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, `,
        opacity: 1,
        life: 0,
        maxLife: 40 + Math.random() * 30,
      })
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })!
    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * window.devicePixelRatio
      canvas.height = h * window.devicePixelRatio
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
      initStars(w, h)
    }

    resize()
    window.addEventListener('resize', resize)

    bubblesRef.current = emotionResults.map((e, i) => createBubble(e, w, h, i))

    const drawBubble = (b: Bubble, time: number) => {
      if (Date.now() < b.birthTime) return

      const wobble = Math.sin(time * b.wobbleSpeed + b.wobbleOffset) * 3
      const drawX = b.x + wobble
      const drawY = b.y
      const drawR = b.radius * b.scale

      if (drawR <= 0) return

      ctx.save()

      ctx.globalAlpha = b.opacity

      const glowGrad = ctx.createRadialGradient(drawX, drawY, drawR * 0.3, drawX, drawY, drawR * 1.8)
      const rgb = hexToRgb(b.emotion.color)
      glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`)
      glowGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`)
      glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(drawX, drawY, drawR * 1.8, 0, Math.PI * 2)
      ctx.fill()

      const mainGrad = ctx.createRadialGradient(
        drawX - drawR * 0.25, drawY - drawR * 0.25, drawR * 0.1,
        drawX, drawY, drawR
      )
      mainGrad.addColorStop(0, `rgba(255, 255, 255, 0.5)`)
      mainGrad.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`)
      mainGrad.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`)
      mainGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`)

      ctx.fillStyle = mainGrad
      ctx.beginPath()
      ctx.arc(drawX, drawY, drawR, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(drawX, drawY, drawR, 0, Math.PI * 2)
      ctx.stroke()

      const hlGrad = ctx.createRadialGradient(
        drawX - drawR * 0.3, drawY - drawR * 0.35, drawR * 0.05,
        drawX - drawR * 0.15, drawY - drawR * 0.2, drawR * 0.45
      )
      hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)')
      hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = hlGrad
      ctx.beginPath()
      ctx.arc(drawX - drawR * 0.2, drawY - drawR * 0.25, drawR * 0.35, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    const animate = (timestamp: number) => {
      const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 32) : 16
      lastTimeRef.current = timestamp
      const time = timestamp

      ctx.clearRect(0, 0, w, h)

      for (const star of starsRef.current) {
        star.phase += star.phaseSpeed
        star.y -= star.speed * 0.3
        star.x += Math.sin(star.phase) * 0.15
        if (star.y < -5) {
          star.y = h + 5
          star.x = Math.random() * w
        }
        const flickerOpacity = star.opacity * (0.6 + 0.4 * Math.sin(star.phase))
        ctx.save()
        ctx.globalAlpha = flickerOpacity
        const starGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 3)
        starGrad.addColorStop(0, 'rgba(220, 230, 245, 0.9)')
        starGrad.addColorStop(0.5, 'rgba(200, 215, 240, 0.3)')
        starGrad.addColorStop(1, 'rgba(200, 215, 240, 0)')
        ctx.fillStyle = starGrad
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      for (const b of bubblesRef.current) {
        if (Date.now() < b.birthTime) continue

        const age = (Date.now() - b.birthTime) / 600
        if (age < 1) {
          b.opacity = age
          b.scale = 0.3 + age * 0.7
        } else {
          b.opacity = Math.min(b.opacity + 0.02, 1)
          b.scale += (b.targetScale - b.scale) * 0.08
        }

        b.x += b.vx
        b.y += b.vy

        const margin = b.baseRadius * b.scale
        if (b.x < margin) { b.x = margin; b.vx = Math.abs(b.vx) * 0.8 }
        if (b.x > w - margin) { b.x = w - margin; b.vx = -Math.abs(b.vx) * 0.8 }
        if (b.y < margin) { b.y = margin; b.vy = Math.abs(b.vy) * 0.8 }
        if (b.y > h - margin) { b.y = h - margin; b.vy = -Math.abs(b.vy) * 0.8 }

        const mx = mouseRef.current.x
        const my = mouseRef.current.y
        const dist = Math.sqrt((b.x - mx) ** 2 + (b.y - my) ** 2)
        const hoverR = b.radius * b.scale * 1.2

        if (dist < hoverR) {
          b.targetScale = 1.25
          b.hovered = true
        } else {
          b.targetScale = 1
          b.hovered = false
        }

        drawBubble(b, time)
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.06
        p.vx *= 0.98
        p.vy *= 0.98
        p.opacity = 1 - p.life / p.maxLife
        p.radius *= 0.97

        if (p.life >= p.maxLife || p.opacity <= 0) {
          particlesRef.current.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = p.opacity
        const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2)
        pGrad.addColorStop(0, p.color + '1)')
        pGrad.addColorStop(0.5, p.color + '0.5)')
        pGrad.addColorStop(1, p.color + '0)')
        ctx.fillStyle = pGrad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [emotionResults, createBubble, initStars, spawnParticles])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current.x = e.clientX - rect.left
    mouseRef.current.y = e.clientY - rect.top

    const hoveredBub = bubblesRef.current.find(b => {
      if (Date.now() < b.birthTime) return false
      const dist = Math.sqrt((b.x - mouseRef.current.x) ** 2 + (b.y - mouseRef.current.y) ** 2)
      return dist < b.radius * b.scale * 1.2
    })

    if (hoveredBub) {
      setHoveredBubble(hoveredBub)
      setCardPos({ x: hoveredBub.x, y: hoveredBub.y })
      canvasRef.current!.style.cursor = 'pointer'
    } else {
      setHoveredBubble(null)
      canvasRef.current!.style.cursor = 'default'
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const clickedBub = bubblesRef.current.find(b => {
      if (Date.now() < b.birthTime) return false
      const dist = Math.sqrt((b.x - mx) ** 2 + (b.y - my) ** 2)
      return dist < b.radius * b.scale * 1.2
    })

    if (clickedBub) {
      spawnParticles(clickedBub.x, clickedBub.y, clickedBub.emotion.color, 28)
      const quote = getRandomQuote(clickedBub.emotion.type)
      onQuoteShow(quote)
      setHoveredBubble(null)
    }
  }, [spawnParticles, onQuoteShow])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !touch) return
    mouseRef.current.x = touch.clientX - rect.left
    mouseRef.current.y = touch.clientY - rect.top

    const hoveredBub = bubblesRef.current.find(b => {
      if (Date.now() < b.birthTime) return false
      const dist = Math.sqrt((b.x - mouseRef.current.x) ** 2 + (b.y - mouseRef.current.y) ** 2)
      return dist < b.radius * b.scale * 1.2
    })

    if (hoveredBub) {
      setHoveredBubble(hoveredBub)
      setCardPos({ x: hoveredBub.x, y: hoveredBub.y })
    } else {
      setHoveredBubble(null)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (hoveredBubble) {
      spawnParticles(hoveredBubble.x, hoveredBubble.y, hoveredBubble.emotion.color, 28)
      const quote = getRandomQuote(hoveredBubble.emotion.type)
      onQuoteShow(quote)
      setHoveredBubble(null)
    }
    mouseRef.current.x = -1000
    mouseRef.current.y = -1000
  }, [hoveredBubble, spawnParticles, onQuoteShow])

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />
      {hoveredBubble && (
        <InfoCard
          emotion={hoveredBubble.emotion}
          x={cardPos.x}
          y={cardPos.y}
          visible={true}
        />
      )}
    </>
  )
}

export default BubbleCanvas
