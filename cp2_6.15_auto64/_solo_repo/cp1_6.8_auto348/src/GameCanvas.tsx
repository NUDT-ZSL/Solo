import React, { useRef, useEffect, useCallback } from 'react'
import {
  type Vec2,
  type Asteroid,
  type StarGate,
  type GravityLine,
  type GravityInterferenceZone,
  type BlackHole,
  type SpeedStar,
  type StarFragment,
  type Nebula,
  type BackgroundStar,
  type Particle,
  vec2,
  vecDist,
  vecNorm,
  vecSub,
  vecAdd,
  vecScale,
  vecRotate,
  clamp,
  canDrawGravityLine,
  calculateGravityLineEnergyCost,
  GRAVITY_LINE_MAX_LENGTH,
} from './utils/physics'

interface GameCanvasProps {
  width: number
  height: number
  asteroids: Asteroid[]
  starGates: StarGate[]
  gravityLines: GravityLine[]
  interferenceZones: GravityInterferenceZone[]
  blackHoles: BlackHole[]
  speedStars: SpeedStar[]
  fragments: StarFragment[]
  nebulae: Nebula[]
  energy: number
  onGravityLineComplete: (points: Vec2[]) => void
  onGravityLineDrawing: (points: Vec2[], valid: boolean) => void
  isLevelComplete: boolean
  showScore: boolean
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function drawBackgroundGradient(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w * 0.3, h)
  grad.addColorStop(0, '#0a0e2a')
  grad.addColorStop(0.5, '#0d0828')
  grad.addColorStop(1, '#050212')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawBackgroundStars(
  ctx: CanvasRenderingContext2D,
  stars: BackgroundStar[],
  time: number
) {
  for (const star of stars) {
    const twinkle = 0.4 + 0.6 * Math.sin(time * star.twinkleSpeed + star.twinklePhase) ** 2
    const alpha = star.brightness * twinkle
    ctx.beginPath()
    ctx.arc(star.pos.x, star.pos.y, star.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`
    ctx.fill()
    if (star.size > 1.2 && alpha > 0.6) {
      ctx.beginPath()
      ctx.arc(star.pos.x, star.pos.y, star.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(180, 200, 255, ${alpha * 0.1})`
      ctx.fill()
    }
  }
}

function drawNebulae(ctx: CanvasRenderingContext2D, nebulae: Nebula[], _time: number) {
  for (const neb of nebulae) {
    ctx.save()
    ctx.translate(neb.pos.x, neb.pos.y)
    ctx.rotate(neb.rotation)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, neb.size.x * 0.6)
    grad.addColorStop(0, neb.color + '40')
    grad.addColorStop(0.5, neb.color + '20')
    grad.addColorStop(1, neb.color + '00')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, 0, neb.size.x * 0.6, neb.size.y * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawGravityInterferenceZone(
  ctx: CanvasRenderingContext2D,
  zone: GravityInterferenceZone,
  time: number
) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 2)
  ctx.beginPath()
  ctx.arc(zone.pos.x, zone.pos.y, zone.radius, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255, 100, 50, ${0.15 * pulse})`
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.stroke()
  ctx.setLineDash([])

  const grad = ctx.createRadialGradient(
    zone.pos.x, zone.pos.y, 0,
    zone.pos.x, zone.pos.y, zone.radius
  )
  grad.addColorStop(0, `rgba(255, 100, 50, ${0.05 * pulse})`)
  grad.addColorStop(1, 'rgba(255, 100, 50, 0)')
  ctx.fillStyle = grad
  ctx.fill()

  const arrowCount = 4
  for (let i = 0; i < arrowCount; i++) {
    const angle = zone.angle + (i / arrowCount) * Math.PI * 2 + time * 0.5
    const r = zone.radius * 0.5
    const ax = zone.pos.x + Math.cos(angle) * r
    const ay = zone.pos.y + Math.sin(angle) * r
    ctx.save()
    ctx.translate(ax, ay)
    ctx.rotate(zone.angle + Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(0, -5)
    ctx.lineTo(3, 3)
    ctx.lineTo(-3, 3)
    ctx.closePath()
    ctx.fillStyle = `rgba(255, 100, 50, ${0.3 * pulse})`
    ctx.fill()
    ctx.restore()
  }
}

function drawBlackHole(ctx: CanvasRenderingContext2D, bh: BlackHole, time: number) {
  const pulse = 0.8 + 0.2 * Math.sin(time * 3 + bh.pulsePhase)

  for (let ring = 3; ring >= 0; ring--) {
    const r = bh.radius * (1 + ring * 0.5) * pulse
    const alpha = 0.08 - ring * 0.015
    const grad = ctx.createRadialGradient(bh.pos.x, bh.pos.y, 0, bh.pos.x, bh.pos.y, r)
    grad.addColorStop(0, `rgba(20, 0, 40, ${alpha + 0.3})`)
    grad.addColorStop(0.6, `rgba(80, 0, 120, ${alpha})`)
    grad.addColorStop(1, 'rgba(80, 0, 120, 0)')
    ctx.beginPath()
    ctx.arc(bh.pos.x, bh.pos.y, r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }

  ctx.beginPath()
  ctx.arc(bh.pos.x, bh.pos.y, bh.consumeRadius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.fill()

  const ringAngle = time * 1.5
  ctx.beginPath()
  ctx.ellipse(bh.pos.x, bh.pos.y, bh.radius * 1.2, bh.radius * 0.4, ringAngle, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(150, 50, 200, ${0.25 * pulse})`
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawSpeedStar(ctx: CanvasRenderingContext2D, star: SpeedStar, time: number) {
  if (star.consumed) return
  const pulse = 0.7 + 0.3 * Math.sin(time * 4 + star.pulsePhase)

  const grad = ctx.createRadialGradient(
    star.pos.x, star.pos.y, 0,
    star.pos.x, star.pos.y, star.radius * 2
  )
  grad.addColorStop(0, `rgba(255, 255, 100, ${0.4 * pulse})`)
  grad.addColorStop(0.5, `rgba(255, 200, 50, ${0.15 * pulse})`)
  grad.addColorStop(1, 'rgba(255, 200, 50, 0)')
  ctx.beginPath()
  ctx.arc(star.pos.x, star.pos.y, star.radius * 2, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  const points = 6
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? star.radius : star.radius * 0.5
    const x = star.pos.x + Math.cos(angle) * r
    const y = star.pos.y + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = `rgba(255, 255, 180, ${0.9 * pulse})`
  ctx.fill()
}

function drawStarGate(ctx: CanvasRenderingContext2D, gate: StarGate, time: number) {
  const pulse = 0.7 + 0.3 * Math.sin(time * 2 + gate.glowPhase)

  const baseColor = gate.type === 'rare' ? [200, 100, 255] : gate.type === 'hidden' ? [100, 255, 200] : [100, 180, 255]
  const glowColor = gate.type === 'rare' ? 'rgba(200, 100, 255,' : gate.type === 'hidden' ? 'rgba(100, 255, 200,' : 'rgba(100, 180, 255,'

  if (!gate.unlocked) {
    const outerGrad = ctx.createRadialGradient(
      gate.pos.x, gate.pos.y, gate.radius * 0.5,
      gate.pos.x, gate.pos.y, gate.radius * 2.5
    )
    outerGrad.addColorStop(0, glowColor + `${0.15 * pulse})`)
    outerGrad.addColorStop(1, glowColor + '0)')
    ctx.beginPath()
    ctx.arc(gate.pos.x, gate.pos.y, gate.radius * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = outerGrad
    ctx.fill()
  }

  const ringRadius = gate.radius
  ctx.beginPath()
  ctx.arc(gate.pos.x, gate.pos.y, ringRadius, 0, Math.PI * 2)
  if (gate.unlocked) {
    ctx.strokeStyle = `rgba(${baseColor.join(',')}, 0.9)`
    ctx.lineWidth = 4
    ctx.shadowColor = `rgba(${baseColor.join(',')}, 0.8)`
    ctx.shadowBlur = 20
  } else {
    ctx.strokeStyle = `rgba(${baseColor.join(',')}, ${0.4 + 0.3 * pulse})`
    ctx.lineWidth = 3
    ctx.shadowColor = `rgba(${baseColor.join(',')}, 0.4)`
    ctx.shadowBlur = 10
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  if (!gate.unlocked) {
    const innerAngle = (gate.currentHits / gate.requiredHits) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(gate.pos.x, gate.pos.y, ringRadius - 5, -Math.PI / 2, -Math.PI / 2 + innerAngle)
    ctx.strokeStyle = `rgba(${baseColor.join(',')}, 0.8)`
    ctx.lineWidth = 3
    ctx.stroke()
  }

  if (!gate.unlocked) {
    ctx.font = '12px "Courier New", monospace'
    ctx.fillStyle = `rgba(${baseColor.join(',')}, 0.9)`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${gate.currentHits}/${gate.requiredHits}`, gate.pos.x, gate.pos.y)
  } else {
    ctx.font = '16px "Courier New", monospace'
    ctx.fillStyle = `rgba(${baseColor.join(',')}, 1)`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('✦', gate.pos.x, gate.pos.y)
  }

  if (gate.type === 'hidden') {
    ctx.font = '9px sans-serif'
    ctx.fillStyle = `rgba(100, 255, 200, ${0.5 + 0.3 * pulse})`
    ctx.textAlign = 'center'
    ctx.fillText(gate.hiddenOrbitType === 'circle' ? '◎' : '〜', gate.pos.x, gate.pos.y + ringRadius + 14)
  }
}

function drawGravityLine(
  ctx: CanvasRenderingContext2D,
  line: GravityLine,
  time: number,
  particles: Particle[]
) {
  if (line.points.length < 2) return

  const fadeAlpha = line.active ? 1 : Math.max(0, line.fadeTimer / 2)

  ctx.beginPath()
  ctx.moveTo(line.points[0].x, line.points[0].y)
  for (let i = 1; i < line.points.length; i++) {
    ctx.lineTo(line.points[i].x, line.points[i].y)
  }
  ctx.strokeStyle = `rgba(100, 200, 255, ${0.6 * fadeAlpha})`
  ctx.lineWidth = 3
  ctx.shadowColor = `rgba(100, 200, 255, ${0.5 * fadeAlpha})`
  ctx.shadowBlur = 12
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.beginPath()
  ctx.moveTo(line.points[0].x, line.points[0].y)
  for (let i = 1; i < line.points.length; i++) {
    ctx.lineTo(line.points[i].x, line.points[i].y)
  }
  ctx.strokeStyle = `rgba(180, 230, 255, ${0.3 * fadeAlpha})`
  ctx.lineWidth = 6
  ctx.stroke()

  if (line.active && time % 0.1 < 0.05) {
    const idx = Math.floor(Math.random() * (line.points.length - 1))
    const p1 = line.points[idx]
    const p2 = line.points[idx + 1]
    const t = Math.random()
    const px = p1.x + (p2.x - p1.x) * t
    const py = p1.y + (p2.y - p1.y) * t
    particles.push({
      pos: vec2(px, py),
      vel: vec2((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20),
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 2,
      color: 'rgba(100, 200, 255, ',
    })
  }
}

function drawDrawingLine(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  valid: boolean,
  energy: number
) {
  if (points.length < 2) return

  const cost = calculateGravityLineEnergyCost(points)
  const hasEnergy = cost <= energy
  const alpha = valid && hasEnergy ? 0.5 : 0.2
  const color = valid && hasEnergy ? '100, 200, 255' : '255, 80, 80'

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.strokeStyle = `rgba(${color}, ${alpha})`
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.shadowColor = `rgba(${color}, ${alpha * 0.8})`
  ctx.shadowBlur = 8
  ctx.stroke()
  ctx.setLineDash([])
  ctx.shadowBlur = 0
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid, time: number) {
  if (!asteroid.active) return

  if (asteroid.trail.length > 1) {
    for (let i = 1; i < asteroid.trail.length; i++) {
      const alpha = (i / asteroid.trail.length) * 0.3
      const width = (i / asteroid.trail.length) * asteroid.radius * 0.5
      ctx.beginPath()
      ctx.moveTo(asteroid.trail[i - 1].x, asteroid.trail[i - 1].y)
      ctx.lineTo(asteroid.trail[i].x, asteroid.trail[i].y)
      if (asteroid.speedBoostTimer > 0) {
        ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`
      } else {
        ctx.strokeStyle = `rgba(180, 160, 140, ${alpha})`
      }
      ctx.lineWidth = width
      ctx.stroke()
    }
  }

  ctx.save()
  ctx.translate(asteroid.pos.x, asteroid.pos.y)
  ctx.rotate(asteroid.rotation)

  const rand = seededRandom(asteroid.textureSeed)
  const r = asteroid.radius

  ctx.beginPath()
  const vertices = 8
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2
    const jitter = 0.8 + rand() * 0.4
    const x = Math.cos(angle) * r * jitter
    const y = Math.sin(angle) * r * jitter
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r)
  bodyGrad.addColorStop(0, '#9a8a7a')
  bodyGrad.addColorStop(0.5, '#6a5a4a')
  bodyGrad.addColorStop(1, '#3a2a1a')
  ctx.fillStyle = bodyGrad
  ctx.fill()
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth = 1
  ctx.stroke()

  for (let i = 0; i < 4; i++) {
    const cx = (rand() - 0.5) * r * 1.2
    const cy = (rand() - 0.5) * r * 1.2
    const cr = rand() * r * 0.25 + 1
    ctx.beginPath()
    ctx.arc(cx, cy, cr, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(40, 30, 20, ${0.3 + rand() * 0.3})`
    ctx.fill()
  }

  ctx.restore()

  if (asteroid.speedBoostTimer > 0) {
    const grad = ctx.createRadialGradient(
      asteroid.pos.x, asteroid.pos.y, 0,
      asteroid.pos.x, asteroid.pos.y, asteroid.radius * 2.5
    )
    grad.addColorStop(0, `rgba(255, 255, 100, ${0.2 * (asteroid.speedBoostTimer / 3)})`)
    grad.addColorStop(1, 'rgba(255, 255, 100, 0)')
    ctx.beginPath()
    ctx.arc(asteroid.pos.x, asteroid.pos.y, asteroid.radius * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }
}

function drawStarFragment(ctx: CanvasRenderingContext2D, frag: StarFragment, time: number) {
  if (frag.collected) return
  const pulse = 0.5 + 0.5 * Math.sin(time * 3 + frag.pulsePhase)

  const grad = ctx.createRadialGradient(
    frag.pos.x, frag.pos.y, 0,
    frag.pos.x, frag.pos.y, frag.radius * 3
  )
  grad.addColorStop(0, `rgba(255, 220, 100, ${0.3 * pulse})`)
  grad.addColorStop(0.5, `rgba(255, 180, 50, ${0.1 * pulse})`)
  grad.addColorStop(1, 'rgba(255, 180, 50, 0)')
  ctx.beginPath()
  ctx.arc(frag.pos.x, frag.pos.y, frag.radius * 3, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  const spikes = 4
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2 + time * 0.5
    const r = i % 2 === 0 ? frag.radius : frag.radius * 0.4
    const x = frag.pos.x + Math.cos(angle) * r
    const y = frag.pos.y + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = `rgba(255, 220, 120, ${0.8 + 0.2 * pulse})`
  ctx.shadowColor = 'rgba(255, 200, 80, 0.6)'
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawCursorGlow(ctx: CanvasRenderingContext2D, pos: Vec2, time: number, isDrawing: boolean) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 5)
  const radius = isDrawing ? 18 : 10

  const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius)
  grad.addColorStop(0, `rgba(150, 220, 255, ${0.5 * pulse})`)
  grad.addColorStop(0.5, `rgba(100, 180, 255, ${0.2 * pulse})`)
  grad.addColorStop(1, 'rgba(100, 180, 255, 0)')
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  if (isDrawing) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 0.8, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(150, 220, 255, ${0.4 * pulse})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = (p.life / p.maxLife) * 0.8
    ctx.beginPath()
    ctx.arc(p.pos.x, p.pos.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2)
    ctx.fillStyle = p.color + `${alpha})`
    ctx.fill()
  }
}

function drawLevelComplete(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const alpha = 0.6 + 0.2 * Math.sin(time * 2)
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`
  ctx.fillRect(0, 0, w, h)

  ctx.font = 'bold 36px "Courier New", monospace'
  ctx.fillStyle = `rgba(100, 255, 200, ${alpha})`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(100, 255, 200, 0.5)'
  ctx.shadowBlur = 20
  ctx.fillText('✦ 星门已开启 ✦', w / 2, h / 2)
  ctx.shadowBlur = 0
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  width,
  height,
  asteroids,
  starGates,
  gravityLines,
  interferenceZones,
  blackHoles,
  speedStars,
  fragments,
  nebulae,
  energy,
  onGravityLineComplete,
  onGravityLineDrawing,
  isLevelComplete,
  showScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const bgStarsRef = useRef<BackgroundStar[]>([])
  const particlesRef = useRef<Particle[]>([])
  const drawingRef = useRef<{ active: boolean; points: Vec2[] }>({ active: false, points: [] })
  const cursorPosRef = useRef<Vec2 | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    const starCount = Math.floor((width * height) / 3000)
    bgStarsRef.current = Array.from({ length: starCount }, () => ({
      pos: vec2(Math.random() * width, Math.random() * height),
      size: Math.random() * 1.8 + 0.3,
      brightness: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 2 + 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
    }))
  }, [width, height])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLevelComplete || showScore) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    drawingRef.current = { active: true, points: [vec2(x, y)] }
  }, [isLevelComplete, showScore])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cursorPosRef.current = vec2(x, y)

    if (drawingRef.current.active && drawingRef.current.points.length > 0) {
      const lastPoint = drawingRef.current.points[drawingRef.current.points.length - 1]
      const dist = vecDist(lastPoint, vec2(x, y))
      if (dist > 8) {
        const newPoints = [...drawingRef.current.points, vec2(x, y)]
        const validation = canDrawGravityLine(newPoints, energy)
        if (validation.valid) {
          drawingRef.current.points = newPoints
          onGravityLineDrawing(newPoints, true)
        } else if (validation.reason === 'too_curved') {
          drawingRef.current.points = newPoints.slice(0, -1)
          onGravityLineDrawing(drawingRef.current.points, false)
        } else {
          onGravityLineDrawing(drawingRef.current.points, false)
        }
      }
    }
  }, [energy, onGravityLineDrawing])

  const handleMouseUp = useCallback(() => {
    if (drawingRef.current.active && drawingRef.current.points.length >= 2) {
      const validation = canDrawGravityLine(drawingRef.current.points, energy)
      if (validation.valid) {
        onGravityLineComplete(drawingRef.current.points)
      }
    }
    drawingRef.current = { active: false, points: [] }
    onGravityLineDrawing([], true)
  }, [energy, onGravityLineComplete, onGravityLineDrawing])

  const handleMouseLeave = useCallback(() => {
    cursorPosRef.current = null
    if (drawingRef.current.active) {
      if (drawingRef.current.points.length >= 2) {
        const validation = canDrawGravityLine(drawingRef.current.points, energy)
        if (validation.valid) {
          onGravityLineComplete(drawingRef.current.points)
        }
      }
      drawingRef.current = { active: false, points: [] }
      onGravityLineDrawing([], true)
    }
  }, [energy, onGravityLineComplete, onGravityLineDrawing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = (timestamp: number) => {
      const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 1 / 60
      lastTimeRef.current = timestamp
      timeRef.current += dt
      const time = timeRef.current

      ctx.clearRect(0, 0, width, height)

      drawBackgroundGradient(ctx, width, height)
      drawBackgroundStars(ctx, bgStarsRef.current, time)
      drawNebulae(ctx, nebulae, time)

      for (const zone of interferenceZones) {
        drawGravityInterferenceZone(ctx, zone, time)
      }

      for (const bh of blackHoles) {
        drawBlackHole(ctx, { ...bh, pulsePhase: time }, time)
      }

      for (const star of speedStars) {
        drawSpeedStar(ctx, { ...star, pulsePhase: time }, time)
      }

      for (const line of gravityLines) {
        drawGravityLine(ctx, line, time, particlesRef.current)
      }

      if (drawingRef.current.active && drawingRef.current.points.length >= 2) {
        const validation = canDrawGravityLine(drawingRef.current.points, energy)
        drawDrawingLine(ctx, drawingRef.current.points, validation.valid, energy)
      }

      for (const frag of fragments) {
        drawStarFragment(ctx, frag, time)
      }

      for (const gate of starGates) {
        drawStarGate(ctx, gate, time)
      }

      for (const asteroid of asteroids) {
        drawAsteroid(ctx, asteroid, time)
      }

      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        p.pos = vecAdd(p.pos, vecScale(p.vel, dt))
        p.life -= dt / p.maxLife
      }
      drawParticles(ctx, particlesRef.current)

      if (cursorPosRef.current) {
        drawCursorGlow(ctx, cursorPosRef.current, time, drawingRef.current.active)
      }

      if (isLevelComplete && !showScore) {
        drawLevelComplete(ctx, width, height, time)
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [width, height, asteroids, starGates, gravityLines, interferenceZones, blackHoles, speedStars, fragments, nebulae, energy, isLevelComplete, showScore])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  )
}

export default GameCanvas
