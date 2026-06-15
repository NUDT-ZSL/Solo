import { useRef, useEffect, useCallback } from 'react'
import { useBottleStore, BOTTLE_COLORS, type BottleStyle } from './BottleEngine'

const BOTTLE_HIT_RADIUS = 35

function drawOceanBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0a1628')
  grad.addColorStop(0.4, '#0d2137')
  grad.addColorStop(0.7, '#143a52')
  grad.addColorStop(1, '#1a4a6e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawAmbientParticles(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.save()
  for (let i = 0; i < 30; i++) {
    const seed = i * 137.5
    const x = ((seed * 7.3 + time * 0.003 * (i % 3 + 1)) % w)
    const y = ((seed * 13.7 + time * 0.002 * (i % 2 + 1)) % h)
    const alpha = 0.1 + 0.15 * Math.sin(time / 1000 + seed)
    const size = 1 + Math.sin(seed) * 0.5
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`
    ctx.fill()
  }
  ctx.restore()
}

function drawLightRays(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.save()
  ctx.globalAlpha = 0.03
  for (let i = 0; i < 5; i++) {
    const x = (w * (i + 1)) / 6 + Math.sin(time / 3000 + i) * 50
    const grad = ctx.createLinearGradient(x, 0, x + 30, h * 0.6)
    grad.addColorStop(0, 'rgba(100, 200, 255, 0.5)')
    grad.addColorStop(1, 'rgba(100, 200, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x - 15, 0)
    ctx.lineTo(x + 45, h * 0.6)
    ctx.lineTo(x - 15, h * 0.6)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawBottleShape(ctx: CanvasRenderingContext2D, style: BottleStyle) {
  ctx.beginPath()
  switch (style) {
    case 1:
      ctx.moveTo(0, -30)
      ctx.lineTo(-5, -26)
      ctx.lineTo(-5, -20)
      ctx.quadraticCurveTo(-20, -18, -20, 0)
      ctx.quadraticCurveTo(-20, 18, -8, 22)
      ctx.lineTo(-8, 26)
      ctx.lineTo(8, 26)
      ctx.lineTo(8, 22)
      ctx.quadraticCurveTo(20, 18, 20, 0)
      ctx.quadraticCurveTo(20, -18, 5, -20)
      ctx.lineTo(5, -26)
      ctx.closePath()
      break
    case 2:
      ctx.moveTo(0, -32)
      ctx.lineTo(-4, -28)
      ctx.lineTo(-4, -22)
      ctx.lineTo(-10, -18)
      ctx.quadraticCurveTo(-12, 0, -8, 22)
      ctx.quadraticCurveTo(-4, 28, 0, 28)
      ctx.quadraticCurveTo(4, 28, 8, 22)
      ctx.quadraticCurveTo(12, 0, 10, -18)
      ctx.lineTo(4, -22)
      ctx.lineTo(4, -28)
      ctx.closePath()
      break
    case 3:
      ctx.moveTo(0, -30)
      ctx.lineTo(-5, -26)
      ctx.lineTo(-5, -20)
      ctx.lineTo(-18, -16)
      ctx.lineTo(-18, 16)
      ctx.lineTo(-8, 24)
      ctx.lineTo(8, 24)
      ctx.lineTo(18, 16)
      ctx.lineTo(18, -16)
      ctx.lineTo(5, -20)
      ctx.lineTo(5, -26)
      ctx.closePath()
      break
    case 4:
      ctx.moveTo(0, -28)
      ctx.lineTo(-4, -24)
      ctx.lineTo(-4, -18)
      ctx.quadraticCurveTo(-14, -14, -14, -4)
      ctx.quadraticCurveTo(-14, 2, -8, 4)
      ctx.quadraticCurveTo(-18, 8, -18, 18)
      ctx.quadraticCurveTo(-18, 26, 0, 26)
      ctx.quadraticCurveTo(18, 26, 18, 18)
      ctx.quadraticCurveTo(18, 8, 8, 4)
      ctx.quadraticCurveTo(14, 2, 14, -4)
      ctx.quadraticCurveTo(14, -14, 4, -18)
      ctx.lineTo(4, -24)
      ctx.closePath()
      break
    case 5:
      ctx.moveTo(0, -28)
      ctx.lineTo(-5, -24)
      ctx.lineTo(-5, -18)
      ctx.lineTo(-20, 10)
      ctx.lineTo(-16, 22)
      ctx.lineTo(16, 22)
      ctx.lineTo(20, 10)
      ctx.lineTo(5, -18)
      ctx.lineTo(5, -24)
      ctx.closePath()
      break
    case 6:
      ctx.moveTo(0, -26)
      ctx.quadraticCurveTo(-16, -10, -16, 8)
      ctx.quadraticCurveTo(-16, 24, 0, 26)
      ctx.quadraticCurveTo(16, 24, 16, 8)
      ctx.quadraticCurveTo(16, -10, 0, -26)
      ctx.closePath()
      break
  }
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  scale: number,
  style: BottleStyle,
  glowIntensity: number,
  isHovered: boolean,
  isLit: boolean,
  content: string
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  const s = isHovered ? scale * 1.15 : scale
  ctx.scale(s, s)

  const color = BOTTLE_COLORS[style]

  if (isLit) {
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 30 * glowIntensity
    ctx.beginPath()
    ctx.arc(0, 0, 30, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * glowIntensity})`
    ctx.fill()
    ctx.shadowBlur = 0
  }

  ctx.shadowColor = color
  ctx.shadowBlur = 15 + glowIntensity * 20

  ctx.save()
  drawBottleShape(ctx, style)
  const alpha = 0.35 + glowIntensity * 0.2
  ctx.fillStyle = color.replace('#', '')
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
  ctx.fill()
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.7 + glowIntensity * 0.3})`
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()

  ctx.save()
  drawBottleShape(ctx, style)
  ctx.clip()
  const innerGrad = ctx.createLinearGradient(-20, -30, 20, 30)
  innerGrad.addColorStop(0, `rgba(255, 255, 255, 0.15)`)
  innerGrad.addColorStop(0.5, `rgba(255, 255, 255, 0.02)`)
  innerGrad.addColorStop(1, `rgba(255, 255, 255, 0.08)`)
  ctx.fillStyle = innerGrad
  ctx.fill()
  ctx.restore()

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  if (isHovered && content) {
    ctx.scale(1 / s, 1 / s)
    ctx.rotate(-rotation)
    const preview = content.length > 8 ? content.slice(0, 8) + '...' : content
    ctx.font = '12px "Noto Serif SC", serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillText(preview, 0, 40)
  }

  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: ReturnType<typeof useBottleStore.getState>['particles']) {
  ctx.save()
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.beginPath()
    if (p.type === 'sparkle') {
      const size = p.size * 2
      ctx.moveTo(p.x - size, p.y)
      ctx.lineTo(p.x, p.y - size)
      ctx.lineTo(p.x + size, p.y)
      ctx.lineTo(p.x, p.y + size)
      ctx.closePath()
      ctx.fillStyle = p.color
      ctx.fill()
    } else {
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawStarFlights(ctx: CanvasRenderingContext2D, starFlights: ReturnType<typeof useBottleStore.getState>['starFlights']) {
  ctx.save()
  for (const sf of starFlights) {
    const t = sf.progress
    const cx = sf.startX + (sf.endX - sf.startX) * t
    const cy = sf.startY + (sf.endY - sf.startY) * t - Math.sin(t * Math.PI) * 80

    ctx.beginPath()
    ctx.arc(cx, cy, 4 + t * 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 215, 0, ${1 - t * 0.5})`
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 20
    ctx.fill()

    for (let i = 0; i < 3; i++) {
      const trailT = Math.max(0, t - 0.05 * (i + 1))
      const trailX = sf.startX + (sf.endX - sf.startX) * trailT
      const trailY = sf.startY + (sf.endY - sf.startY) * trailT - Math.sin(trailT * Math.PI) * 80
      ctx.beginPath()
      ctx.arc(trailX, trailY, 2 - i * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 215, 0, ${0.5 - i * 0.15})`
      ctx.fill()
    }
  }
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.restore()
}

export default function OceanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const storeRef = useRef(useBottleStore.getState())

  useEffect(() => {
    const unsub = useBottleStore.subscribe(state => {
      storeRef.current = state
    })
    return unsub
  }, [])

  const getBottleAtPoint = useCallback((mx: number, my: number) => {
    const { bottles } = storeRef.current
    for (let i = bottles.length - 1; i >= 0; i--) {
      const b = bottles[i]
      const dx = mx - b.x
      const dy = mx - b.y
      const dist = Math.sqrt((mx - b.x) ** 2 + (my - b.y) ** 2)
      if (dist < BOTTLE_HIT_RADIUS) {
        return b
      }
    }
    return null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      useBottleStore.getState().setCanvasSize(window.innerWidth, window.innerHeight)
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = (time: number) => {
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 16
      lastTimeRef.current = time
      const state = storeRef.current
      const w = state.canvasWidth
      const h = state.canvasHeight

      state.updateBottlePositions(dt)
      state.updateParticles(dt)
      state.updateStarFlights(dt)

      ctx.clearRect(0, 0, w, h)
      drawOceanBackground(ctx, w, h)
      drawLightRays(ctx, w, h, time)
      drawAmbientParticles(ctx, w, h, time)

      for (const bottle of state.bottles) {
        drawBottle(
          ctx,
          bottle.x,
          bottle.y,
          bottle.rotation,
          bottle.scale,
          bottle.style,
          bottle.glowIntensity,
          state.hoveredBottleId === bottle.id,
          bottle.isLit,
          bottle.content
        )
      }

      drawParticles(ctx, storeRef.current.particles)
      drawStarFlights(ctx, storeRef.current.starFlights)

      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
    const bottle = getBottleAtPoint(e.clientX, e.clientY)
    useBottleStore.getState().setHoveredBottle(bottle?.id ?? null)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.cursor = bottle ? 'pointer' : 'default'
    }
  }, [getBottleAtPoint])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const bottle = getBottleAtPoint(e.clientX, e.clientY)
    if (bottle) {
      useBottleStore.getState().spawnBreakParticles(bottle.x, bottle.y, bottle.style)
      useBottleStore.getState().setSelectedWish({
        id: bottle.id,
        content: bottle.content,
        style: bottle.style,
        created_at: '',
        light_count: bottle.lightCount,
      })
      useBottleStore.getState().setShowCard(true)
    }
  }, [getBottleAtPoint])

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
