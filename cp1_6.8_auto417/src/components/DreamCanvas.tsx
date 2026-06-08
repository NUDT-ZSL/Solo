import React, { useRef, useEffect, useCallback } from 'react'

const EMOTION_PALETTES: Record<string, string[]> = {
  恐惧: ['#8B0000', '#4A0028', '#2D004F', '#1A0000', '#6B0035', '#3D0066'],
  喜悦: ['#FFD700', '#FF8C00', '#FF6B9D', '#FFA07A', '#FFEC8B', '#FF69B4'],
  困惑: ['#2E8B57', '#5F9EA0', '#708090', '#3CB371', '#20B2AA', '#778899'],
  忧伤: ['#1E3A5F', '#2C3E6B', '#3B4F7A', '#4A6089', '#597198', '#6891A8'],
  宁静: ['#9B8EC4', '#A8C8E8', '#C5B8D8', '#B8D4E3', '#D4C5E0', '#E0D8EE'],
  惊奇: ['#FF00FF', '#00CED1', '#FF1493', '#7B68EE', '#00FA9A', '#FF6EC7'],
}

interface Blob {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
  phase: number
}

interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  opacity: number
  phase: number
  speed: number
}

interface DreamCanvasProps {
  emotion: string
  width: number
  height: number
  animated?: boolean
}

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b
    h = (h ^ (h >>> 16)) * 0x45d9f3b
    h = h ^ (h >>> 16)
    return (h >>> 0) / 4294967296
  }
}

const DreamCanvas: React.FC<DreamCanvasProps> = ({ emotion, width, height, animated = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const blobsRef = useRef<Blob[]>([])
  const linesRef = useRef<Line[]>([])
  const timeRef = useRef<number>(0)

  const palette = EMOTION_PALETTES[emotion] || EMOTION_PALETTES.困惑

  const initScene = useCallback(() => {
    const rand = seededRandom(emotion)
    const blobs: Blob[] = []
    const lines: Line[] = []
    const blobCount = 6 + Math.floor(rand() * 4)

    for (let i = 0; i < blobCount; i++) {
      blobs.push({
        x: rand() * width,
        y: rand() * height,
        vx: (rand() - 0.5) * 0.4,
        vy: (rand() - 0.5) * 0.4,
        radius: Math.max(20, rand() * (Math.min(width, height) * 0.35)),
        color: palette[Math.floor(rand() * palette.length)],
        opacity: 0.15 + rand() * 0.35,
        phase: rand() * Math.PI * 2,
      })
    }

    const lineCount = 4 + Math.floor(rand() * 4)
    for (let i = 0; i < lineCount; i++) {
      lines.push({
        x1: rand() * width,
        y1: rand() * height,
        x2: rand() * width,
        y2: rand() * height,
        color: palette[Math.floor(rand() * palette.length)],
        opacity: 0.1 + rand() * 0.25,
        phase: rand() * Math.PI * 2,
        speed: 0.3 + rand() * 0.7,
      })
    }

    blobsRef.current = blobs
    linesRef.current = lines
  }, [emotion, width, height, palette])

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      ctx.clearRect(0, 0, width, height)

      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, 'rgba(10,10,46,0.95)')
      bgGrad.addColorStop(1, 'rgba(30,10,60,0.95)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      const blobs = blobsRef.current
      for (const blob of blobs) {
        const bx = blob.x + Math.sin(t * 0.3 + blob.phase) * 20
        const by = blob.y + Math.cos(t * 0.25 + blob.phase) * 15
        const pulseRadius = blob.radius + Math.sin(t * 0.5 + blob.phase) * 8

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(1, pulseRadius))
        const baseColor = blob.color
        grad.addColorStop(0, baseColor + Math.round(blob.opacity * 255).toString(16).padStart(2, '0'))
        grad.addColorStop(0.6, baseColor + Math.round(blob.opacity * 0.4 * 255).toString(16).padStart(2, '0'))
        grad.addColorStop(1, baseColor + '00')

        ctx.beginPath()
        ctx.arc(bx, by, Math.max(1, pulseRadius), 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      const lines = linesRef.current
      for (const line of lines) {
        const lx1 = line.x1 + Math.sin(t * line.speed + line.phase) * 30
        const ly1 = line.y1 + Math.cos(t * line.speed * 0.7 + line.phase) * 25
        const lx2 = line.x2 + Math.sin(t * line.speed * 0.8 + line.phase + 1) * 30
        const ly2 = line.y2 + Math.cos(t * line.speed * 0.6 + line.phase + 2) * 25

        ctx.beginPath()
        ctx.moveTo(lx1, ly1)
        const cpx = (lx1 + lx2) / 2 + Math.sin(t * 0.4 + line.phase) * 40
        const cpy = (ly1 + ly2) / 2 + Math.cos(t * 0.35 + line.phase) * 40
        ctx.quadraticCurveTo(cpx, cpy, lx2, ly2)
        ctx.strokeStyle = line.color + Math.round(line.opacity * 255).toString(16).padStart(2, '0')
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    },
    [width, height],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    initScene()

    if (animated) {
      const animate = () => {
        timeRef.current += 0.016
        draw(ctx, timeRef.current)

        for (const blob of blobsRef.current) {
          blob.x += blob.vx
          blob.y += blob.vy
          if (blob.x < -blob.radius || blob.x > width + blob.radius) blob.vx *= -1
          if (blob.y < -blob.radius || blob.y > height + blob.radius) blob.vy *= -1
        }

        animRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      draw(ctx, 0)
    }

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
    }
  }, [animated, width, height, initScene, draw])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        borderRadius: animated ? 0 : 8,
        display: 'block',
      }}
    />
  )
}

export default DreamCanvas
