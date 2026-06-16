import { useEffect, useRef } from 'react'
import { getMaterialById } from './reactionEngine'

interface Props {
  materials: string[]
  temperature: number
  heating: boolean
  cooling: boolean
  stirring: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'fire' | 'ice'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function mixColors(colors: string[]): string {
  if (colors.length === 0) return '#4a3728'
  if (colors.length === 1) return colors[0]
  let r = 0,
    g = 0,
    b = 0
  for (const c of colors) {
    const rgb = hexToRgb(c)
    r += rgb.r
    g += rgb.g
    b += rgb.b
  }
  r = Math.floor(r / colors.length)
  g = Math.floor(g / colors.length)
  b = Math.floor(b / colors.length)
  return `rgb(${r}, ${g}, ${b})`
}

export default function Cauldron({
  materials,
  temperature,
  heating,
  cooling,
  stirring,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const swirlRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cauldronX = W / 2
    const cauldronY = H / 2 + 20
    const cauldronRadius = 110

    const render = () => {
      timeRef.current += 0.016
      ctx.clearRect(0, 0, W, H)

      const matColors = materials
        .map((id) => getMaterialById(id)?.color)
        .filter((c): c is string => !!c)
      let liquidColor = mixColors(matColors)

      const tempFactor = Math.min(Math.max((temperature - 20) / 400, -1), 1)
      if (tempFactor !== 0) {
        const base = hexToRgb(liquidColor)
        if (tempFactor > 0) {
          base.r = Math.min(255, base.r + tempFactor * 80)
          base.g = Math.max(0, base.g - tempFactor * 40)
          base.b = Math.max(0, base.b - tempFactor * 60)
        } else {
          base.r = Math.max(0, base.r + tempFactor * 40)
          base.g = Math.min(255, base.g + tempFactor * 30)
          base.b = Math.min(255, base.b + tempFactor * 80)
        }
        liquidColor = `rgb(${Math.floor(base.r)}, ${Math.floor(base.g)}, ${Math.floor(base.b)})`
      }

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cauldronX, cauldronY + 10, cauldronRadius + 8, cauldronRadius * 0.45, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#1a1a1a'
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cauldronX, cauldronY, cauldronRadius, cauldronRadius * 0.42, 0, 0, Math.PI * 2)
      ctx.clip()

      if (materials.length > 0) {
        const fillLevel = 0.35 + Math.min(materials.length, 4) * 0.12
        const liquidY = cauldronY - cauldronRadius * 0.42 * (1 - fillLevel) + 5

        const swirlAngle = stirring ? (swirlRef.current += 0.3) : timeRef.current * 0.5

        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath()
          const layerOffset = layer * 6
          ctx.moveTo(cauldronX - cauldronRadius - 10, cauldronY + cauldronRadius * 0.5)
          for (let x = -cauldronRadius - 10; x <= cauldronRadius + 10; x += 4) {
            const wave = Math.sin((x / 25) + swirlAngle + layer * 0.8) * 3
            const y = liquidY + layerOffset + wave
            ctx.lineTo(cauldronX + x, y)
          }
          ctx.lineTo(cauldronX + cauldronRadius + 10, cauldronY + cauldronRadius * 0.5)
          ctx.closePath()
          const alpha = 0.8 - layer * 0.2
          ctx.fillStyle = liquidColor + Math.floor(alpha * 255).toString(16).padStart(2, '0')
          ctx.fill()
        }

        if (stirring) {
          for (let i = 0; i < 8; i++) {
            const angle = swirlAngle + (i * Math.PI * 2) / 8
            const dist = 30 + (i % 3) * 20
            const px = cauldronX + Math.cos(angle) * dist
            const py = liquidY + 8 + Math.sin(angle) * dist * 0.4
            ctx.beginPath()
            ctx.arc(px, py, 2, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255,255,255,0.5)'
            ctx.fill()
          }
        }

        if (temperature > 100 && materials.length > 0) {
          for (let i = 0; i < 5; i++) {
            const bx = cauldronX + (Math.sin(timeRef.current * 3 + i * 1.5) * cauldronRadius * 0.6)
            const by = liquidY + 20 + ((timeRef.current * 40 + i * 50) % 60)
            ctx.beginPath()
            ctx.arc(bx, by, 2 + Math.sin(timeRef.current * 5 + i) * 1, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255,255,255,0.4)'
            ctx.fill()
          }
        }
      } else {
        ctx.fillStyle = '#2a1f14'
        ctx.fillRect(cauldronX - cauldronRadius, cauldronY - cauldronRadius * 0.42, cauldronRadius * 2, cauldronRadius)
      }

      ctx.restore()

      if (heating) {
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.35) {
            particlesRef.current.push({
              x: cauldronX + (Math.random() - 0.5) * 60,
              y: cauldronY + cauldronRadius * 0.35,
              vx: (Math.random() - 0.5) * 0.8,
              vy: -1.5 - Math.random() * 1.5,
              life: 0,
              maxLife: 30 + Math.random() * 20,
              size: 4 + Math.random() * 6,
              color: Math.random() < 0.5 ? '#ff6b00' : '#ffcc00',
              type: 'fire',
            })
          }
        }
      }

      if (cooling) {
        for (let i = 0; i < 2; i++) {
          if (Math.random() < 0.25) {
            const angle = Math.random() * Math.PI * 2
            particlesRef.current.push({
              x: cauldronX + Math.cos(angle) * cauldronRadius * 0.9,
              y: cauldronY + Math.sin(angle) * cauldronRadius * 0.35,
              vx: Math.cos(angle) * 0.5,
              vy: Math.sin(angle) * 0.3 - 0.2,
              life: 0,
              maxLife: 50 + Math.random() * 30,
              size: 2 + Math.random() * 3,
              color: '#a5d8ff',
              type: 'ice',
            })
          }
        }
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++
        p.x += p.vx
        p.y += p.vy
        if (p.type === 'fire') p.vy -= 0.05

        const alpha = 1 - p.life / p.maxLife
        if (alpha <= 0) return false

        ctx.save()
        ctx.globalAlpha = alpha
        if (p.type === 'ice') {
          ctx.fillStyle = p.color
          ctx.translate(p.x, p.y)
          ctx.rotate(timeRef.current * 2)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
          ctx.fillRect(-p.size * 1.5, 0, p.size * 3, 1)
          ctx.fillRect(0, -p.size * 1.5, 1, p.size * 3)
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()
        }
        ctx.restore()

        return p.life < p.maxLife
      })

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [materials, temperature, heating, cooling, stirring])

  return (
    <div
      style={{
        width: 260,
        height: 300,
        background: '#3a3a3a',
        borderRadius: 12,
        border: '2px solid #b8860b',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.6)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={260}
        height={300}
        style={{ display: 'block', width: 260, height: 300 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 'bold',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          fontFamily: 'Georgia, serif',
        }}
      >
        {Math.round(temperature)}°C
      </div>
    </div>
  )
}
