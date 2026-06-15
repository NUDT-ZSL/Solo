import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import type { Letter, StarData, ParticleData } from '../types'

const STAR_BASE_RADIUS_MIN = 2
const STAR_BASE_RADIUS_MAX = 4.5
const PULSE_SPEED_MIN = 0.8
const PULSE_SPEED_MAX = 2.0
const DRIFT_SPEED_MIN = 0.3
const DRIFT_SPEED_MAX = 0.8
const DRIFT_AMPLITUDE_MIN = 3
const DRIFT_AMPLITUDE_MAX = 12
const HOVER_SCALE_TARGET = 1.8
const BINARY_ORBIT_RADIUS = 18
const BINARY_SPEED = 2.1
const PARTICLE_COUNT = 25
const BG_STAR_COUNT = 600

function createStarData(letter: Letter, canvasW: number, canvasH: number): StarData {
  return {
    letter,
    x: letter.position.x * canvasW,
    y: letter.position.y * canvasH,
    baseRadius: STAR_BASE_RADIUS_MIN + Math.random() * (STAR_BASE_RADIUS_MAX - STAR_BASE_RADIUS_MIN),
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: PULSE_SPEED_MIN + Math.random() * (PULSE_SPEED_MAX - PULSE_SPEED_MIN),
    driftPhaseX: Math.random() * Math.PI * 2,
    driftPhaseY: Math.random() * Math.PI * 2,
    driftSpeedX: DRIFT_SPEED_MIN + Math.random() * (DRIFT_SPEED_MAX - DRIFT_SPEED_MIN),
    driftSpeedY: DRIFT_SPEED_MIN + Math.random() * (DRIFT_SPEED_MAX - DRIFT_SPEED_MIN),
    driftAmplitudeX: DRIFT_AMPLITUDE_MIN + Math.random() * (DRIFT_AMPLITUDE_MAX - DRIFT_AMPLITUDE_MIN),
    driftAmplitudeY: DRIFT_AMPLITUDE_MIN + Math.random() * (DRIFT_AMPLITUDE_MAX - DRIFT_AMPLITUDE_MIN),
    isHovered: false,
    hoverScale: 1,
    isBinary: letter.replyIds.length > 0,
    binaryAngle: Math.random() * Math.PI * 2,
    binarySpeed: BINARY_SPEED,
    isNew: false,
    newOpacity: 1,
    particles: [],
  }
}

function createBurstParticles(x: number, y: number): ParticleData[] {
  const particles: ParticleData[] = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 30 + Math.random() * 80
    const colors = ['#ffffff', '#ffd700', '#4fc3f7', '#c44dff', '#ff6b9d']
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
      radius: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    })
  }
  return particles
}

interface BgStar {
  x: number
  y: number
  radius: number
  pulsePhase: number
  pulseSpeed: number
  brightness: number
}

export default function StarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starDataRef = useRef<Map<string, StarData>>(new Map())
  const bgStarsRef = useRef<BgStar[]>([])
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const timeRef = useRef(0)
  const lastTimeRef = useRef(0)

  const { letters, setStarMap, selectLetter, setShowLetterCard, setHoveredStarId, addStarMark } = useStore()

  const initBgStars = useCallback((w: number, h: number) => {
    const stars: BgStar[] = []
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 0.3 + Math.random() * 1.2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.5,
        brightness: 0.2 + Math.random() * 0.5,
      })
    }
    bgStarsRef.current = stars
  }, [])

  const initStarData = useCallback((lettersArr: Letter[], w: number, h: number) => {
    const map = new Map<string, StarData>()
    for (const letter of lettersArr) {
      if (!starDataRef.current.has(letter.id)) {
        map.set(letter.id, createStarData(letter, w, h))
      } else {
        const existing = starDataRef.current.get(letter.id)!
        const updated: StarData = {
          ...existing,
          letter,
          x: letter.position.x * w,
          y: letter.position.y * h,
          isBinary: letter.replyIds.length > 0,
        }
        map.set(letter.id, updated)
      }
    }
    starDataRef.current = map
    setStarMap(map)
  }, [setStarMap])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      initBgStars(window.innerWidth, window.innerHeight)
      initStarData(letters, window.innerWidth, window.innerHeight)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [letters, initBgStars, initStarData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const drawFrame = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = timestamp
      timeRef.current += dt

      const w = window.innerWidth
      const h = window.innerHeight

      ctx.clearRect(0, 0, w, h)

      const bgGrad = ctx.createLinearGradient(0, 0, w, h)
      bgGrad.addColorStop(0, '#0a0e27')
      bgGrad.addColorStop(0.5, '#0d1137')
      bgGrad.addColorStop(1, '#1a0a2e')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      for (const bgStar of bgStarsRef.current) {
        const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(timeRef.current * bgStar.pulseSpeed + bgStar.pulsePhase))
        const alpha = bgStar.brightness * pulse
        ctx.beginPath()
        ctx.arc(bgStar.x, bgStar.y, bgStar.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`
        ctx.fill()
      }

      const allParticles: ParticleData[] = []

      for (const [id, star] of starDataRef.current) {
        const driftX = Math.sin(timeRef.current * star.driftSpeedX + star.driftPhaseX) * star.driftAmplitudeX
        const driftY = Math.cos(timeRef.current * star.driftSpeedY + star.driftPhaseY) * star.driftAmplitudeY
        const currentX = star.x + driftX
        const currentY = star.y + driftY

        const dist = Math.hypot(mouseRef.current.x - currentX, mouseRef.current.y - currentY)
        const wasHovered = star.isHovered
        star.isHovered = dist < star.baseRadius * 3 + 10

        const targetScale = star.isHovered ? HOVER_SCALE_TARGET : 1
        star.hoverScale += (targetScale - star.hoverScale) * Math.min(1, dt * 8)

        if (star.isHovered && !wasHovered) {
          setHoveredStarId(id)
        } else if (!star.isHovered && wasHovered) {
          setHoveredStarId(null)
        }

        const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(timeRef.current * star.pulseSpeed + star.pulsePhase))
        const r = star.baseRadius * star.hoverScale * pulse
        const goldAmount = Math.random() > 0.5 ? 0.8 : 0.5

        const glowGrad = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, r * 8)
        glowGrad.addColorStop(0, `rgba(255, ${Math.floor(200 + goldAmount * 55)}, ${Math.floor(100 + goldAmount * 50)}, ${0.3 * pulse})`)
        glowGrad.addColorStop(0.4, `rgba(255, ${Math.floor(180 + goldAmount * 75)}, ${Math.floor(50 + goldAmount * 50)}, ${0.1 * pulse})`)
        glowGrad.addColorStop(1, 'rgba(255, 200, 100, 0)')
        ctx.beginPath()
        ctx.arc(currentX, currentY, r * 8, 0, Math.PI * 2)
        ctx.fillStyle = glowGrad
        ctx.fill()

        const coreGrad = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, r)
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse})`)
        coreGrad.addColorStop(0.5, `rgba(255, ${Math.floor(215 + goldAmount * 40)}, 0, ${0.7 * pulse})`)
        coreGrad.addColorStop(1, `rgba(255, ${Math.floor(180 + goldAmount * 40)}, 0, 0)`)
        ctx.beginPath()
        ctx.arc(currentX, currentY, r, 0, Math.PI * 2)
        ctx.fillStyle = coreGrad
        ctx.fill()

        if (star.isBinary && star.letter.replyIds.length > 0) {
          star.binaryAngle += star.binarySpeed * dt
          const bx = currentX + Math.cos(star.binaryAngle) * BINARY_ORBIT_RADIUS
          const by = currentY + Math.sin(star.binaryAngle) * BINARY_ORBIT_RADIUS

          const replyLetter = letters.find(l => l.id === star.letter.replyIds[0])
          if (replyLetter) {
            const br = star.baseRadius * 0.7 * pulse

            const bGlowGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br * 6)
            bGlowGrad.addColorStop(0, `rgba(79, 195, 247, ${0.25 * pulse})`)
            bGlowGrad.addColorStop(0.5, `rgba(79, 195, 247, ${0.08 * pulse})`)
            bGlowGrad.addColorStop(1, 'rgba(79, 195, 247, 0)')
            ctx.beginPath()
            ctx.arc(bx, by, br * 6, 0, Math.PI * 2)
            ctx.fillStyle = bGlowGrad
            ctx.fill()

            const bCoreGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br)
            bCoreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse})`)
            bCoreGrad.addColorStop(0.5, `rgba(79, 195, 247, ${0.7 * pulse})`)
            bCoreGrad.addColorStop(1, 'rgba(79, 195, 247, 0)')
            ctx.beginPath()
            ctx.arc(bx, by, br, 0, Math.PI * 2)
            ctx.fillStyle = bCoreGrad
            ctx.fill()

            ctx.beginPath()
            ctx.strokeStyle = `rgba(79, 195, 247, ${0.15 * pulse})`
            ctx.lineWidth = 0.5
            ctx.ellipse(currentX, currentY, BINARY_ORBIT_RADIUS, BINARY_ORBIT_RADIUS * 0.6, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        if (star.isHovered) {
          ctx.font = '13px "Exo 2", sans-serif'
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
          ctx.textAlign = 'center'
          const title = star.letter.title.length > 8 ? star.letter.title.slice(0, 8) + '…' : star.letter.title
          ctx.fillText(title, currentX, currentY - r - 12)
        }

        for (const p of star.particles) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.97
          p.vy *= 0.97
          p.life -= dt / p.maxLife
          if (p.life > 0) {
            allParticles.push(p)
          }
        }
        star.particles = star.particles.filter(p => p.life > 0)
      }

      for (const p of allParticles) {
        const alpha = Math.max(0, p.life)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2)
        ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('rgbaa', 'rgba')
        const r = parseInt(p.color.slice(1, 3), 16)
        const g = parseInt(p.color.slice(3, 5), 16)
        const b = parseInt(p.color.slice(5, 7), 16)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(drawFrame)
    }

    animFrameRef.current = requestAnimationFrame(drawFrame)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [letters, setHoveredStarId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const mx = e.clientX
    const my = e.clientY

    for (const [id, star] of starDataRef.current) {
      const driftX = Math.sin(timeRef.current * star.driftSpeedX + star.driftPhaseX) * star.driftAmplitudeX
      const driftY = Math.cos(timeRef.current * star.driftSpeedY + star.driftPhaseY) * star.driftAmplitudeY
      const cx = star.x + driftX
      const cy = star.y + driftY
      const dist = Math.hypot(mx - cx, my - cy)
      if (dist < star.baseRadius * 3 + 15) {
        star.particles = [...star.particles, ...createBurstParticles(cx, cy)]
        selectLetter(star.letter)
        setShowLetterCard(true)
        addStarMark(id)
        return
      }
    }
  }, [selectLetter, setShowLetterCard, addStarMark])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const mx = touch.clientX
    const my = touch.clientY
    mouseRef.current = { x: mx, y: my }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const mx = mouseRef.current.x
    const my = mouseRef.current.y

    for (const [id, star] of starDataRef.current) {
      const driftX = Math.sin(timeRef.current * star.driftSpeedX + star.driftPhaseX) * star.driftAmplitudeX
      const driftY = Math.cos(timeRef.current * star.driftSpeedY + star.driftPhaseY) * star.driftAmplitudeY
      const cx = star.x + driftX
      const cy = star.y + driftY
      const dist = Math.hypot(mx - cx, my - cy)
      if (dist < star.baseRadius * 3 + 20) {
        star.particles = [...star.particles, ...createBurstParticles(cx, cy)]
        selectLetter(star.letter)
        setShowLetterCard(true)
        addStarMark(id)
        return
      }
    }
  }, [selectLetter, setShowLetterCard, addStarMark])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full cursor-pointer"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    />
  )
}
