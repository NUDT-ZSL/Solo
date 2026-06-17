import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from './gameStore'
import { planets, Planet } from './planetData'

interface Star {
  x: number
  y: number
  twinkleOffset: number
  twinkleSpeed: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  type: 'thrust' | 'mining'
  color: string
  size: number
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 900
const STAR_COUNT = 100
const MAX_PARTICLES = 200
const BASE_SPEED = 20
const SHIP_SIZE = 20

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const starsRef = useRef<Star[]>([])
  const particlesRef = useRef<Particle[]>([])
  const miningTimerRef = useRef<number>(0)
  const miningParticleTimerRef = useRef<number>(0)
  const currentMiningPlanetRef = useRef<Planet | null>(null)
  const miningRingRotationRef = useRef<number>(0)

  const {
    ship,
    selectedPlanetId,
    hoveredPlanetId,
    canMine,
    selectShip,
    setTargetPlanet,
    setHoveredPlanet,
    updateShipPosition,
    startMining,
    updateMiningProgress,
    finishMining,
    startReturning,
    updateReturnProgress,
    finishReturning,
    collectParticles,
    removeCollectParticle,
  } = useGameStore()

  useEffect(() => {
    const stars: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
      })
    }
    starsRef.current = stars
  }, [])

  const addParticle = useCallback((particle: Omit<Particle, 'life'>) => {
    if (particlesRef.current.length >= MAX_PARTICLES) {
      particlesRef.current.shift()
    }
    particlesRef.current.push({ ...particle, life: particle.maxLife })
  }, [])

  const adjustColorBrightness = useCallback((hex: string, factor: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
  }, [])

  const isPointInShip = useCallback((px: number, py: number, sx: number, sy: number): boolean => {
    const halfSize = SHIP_SIZE / 2
    return (
      px >= sx - halfSize &&
      px <= sx + halfSize &&
      py >= sy - halfSize &&
      py <= sy + halfSize
    )
  }, [])

  const isPointInPlanet = useCallback((px: number, py: number, planet: Planet): boolean => {
    const dx = px - planet.x
    const dy = py - planet.y
    return dx * dx + dy * dy <= planet.radius * planet.radius
  }, [])

  const drawMiningRing = useCallback(
    (ctx: CanvasRenderingContext2D, planet: Planet, rotation: number) => {
      ctx.save()
      ctx.translate(planet.x, planet.y)
      ctx.rotate(rotation)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.arc(0, 0, planet.radius + 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    },
    []
  )

  const drawPlanet = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      planet: Planet,
      isHovered: boolean,
      isSelected: boolean,
      isMining: boolean,
      isReachable: boolean
    ) => {
      ctx.beginPath()
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2)
      if (isMining) {
        ctx.fillStyle = adjustColorBrightness(planet.color, 0.7)
      } else {
        ctx.fillStyle = planet.color
      }
      ctx.fill()

      if (isHovered || isSelected || !isReachable) {
        ctx.strokeStyle = isSelected ? '#FFFFFF' : isReachable ? '#FFFFFF' : '#FF4444'
        ctx.lineWidth = 2
        if (isSelected) {
          ctx.setLineDash([])
        } else {
          ctx.setLineDash([4, 4])
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.fillStyle = '#FFFFFF'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(planet.name, planet.x, planet.y - planet.radius - 6)
    },
    [adjustColorBrightness]
  )

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    for (const star of starsRef.current) {
      const brightness = 0.3 + 0.7 * Math.abs(Math.sin(time * star.twinkleSpeed + star.twinkleOffset))
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 2, 2)
    }
  }, [])

  const drawThrustAndMiningParticles = useCallback(
    (ctx: CanvasRenderingContext2D, deltaTime: number) => {
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= deltaTime
        p.x += p.vx * deltaTime
        p.y += p.vy * deltaTime

        if (p.life <= 0) return false

        const alpha = p.life / p.maxLife
        ctx.globalAlpha = alpha

        if (p.type === 'mining') {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, (1 - alpha) * 30, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = p.color
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size)
        }

        ctx.globalAlpha = 1
        return true
      })
    },
    []
  )

  const drawCollectParticles = useCallback(
    (ctx: CanvasRenderingContext2D, now: number, currentShipX: number, currentShipY: number) => {
      collectParticles.forEach((p) => {
        if (now < p.startTime) return
        const elapsed = now - p.startTime
        const t = Math.min(elapsed / p.duration, 1)

        const easeT = t * t * (3 - 2 * t)
        const baseX = p.startX + (p.targetX - p.startX) * easeT
        const baseY = p.startY + (p.targetY - p.startY) * easeT
        const arcOffset = Math.sin(t * Math.PI) * p.arcHeight
        const currentX = baseX + p.perpX * arcOffset
        const currentY = baseY + p.perpY * arcOffset

        const halfShip = SHIP_SIZE / 2
        const withinShip =
          currentX >= currentShipX - halfShip &&
          currentX <= currentShipX + halfShip &&
          currentY >= currentShipY - halfShip &&
          currentY <= currentShipY + halfShip

        if (withinShip) {
          removeCollectParticle(p.id)
          return
        }

        if (t >= 1) {
          removeCollectParticle(p.id)
          return
        }

        ctx.globalAlpha = 1 - t * 0.5
        ctx.fillStyle = p.color
        ctx.fillRect(Math.floor(currentX - 2), Math.floor(currentY - 2), 4, 4)
        ctx.globalAlpha = 1
      })
    },
    [collectParticles, removeCollectParticle]
  )

  const drawShip = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      angle: number,
      isSelected: boolean
    ) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)

      if (isSelected) {
        ctx.strokeStyle = '#FFFF00'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(0, 0, 20, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.moveTo(0, -10)
      ctx.lineTo(-10, 10)
      ctx.lineTo(10, 10)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    },
    []
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      if (
        isPointInShip(x, y, ship.x, ship.y) &&
        !ship.isFlying &&
        !ship.isMining &&
        !ship.isReturning
      ) {
        selectShip()
        return
      }

      if (ship.isSelected) {
        for (const planet of planets) {
          if (isPointInPlanet(x, y, planet) && canMine(planet)) {
            setTargetPlanet(planet)
            return
          }
        }
      }
    },
    [
      ship.x,
      ship.y,
      ship.isSelected,
      ship.isFlying,
      ship.isMining,
      ship.isReturning,
      selectShip,
      setTargetPlanet,
      canMine,
      isPointInShip,
      isPointInPlanet,
    ]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      let foundHover: string | null = null
      for (const planet of planets) {
        if (isPointInPlanet(x, y, planet)) {
          foundHover = planet.id
          break
        }
      }
      if (foundHover !== hoveredPlanetId) {
        setHoveredPlanet(foundHover)
      }
    },
    [hoveredPlanetId, setHoveredPlanet, isPointInPlanet]
  )

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredPlanet(null)
  }, [setHoveredPlanet])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = currentTime

      ctx.fillStyle = '#0B0C10'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      drawStars(ctx, currentTime / 1000)

      for (const planet of planets) {
        const isHovered = hoveredPlanetId === planet.id
        const isSelected = selectedPlanetId === planet.id
        const isMining = ship.isMining && ship.currentPlanetId === planet.id
        const isReachable = canMine(planet)

        if (isMining) {
          miningRingRotationRef.current += deltaTime * 0.5
          drawMiningRing(ctx, planet, miningRingRotationRef.current)
        }

        drawPlanet(ctx, planet, isHovered, isSelected, isMining, isReachable)
      }

      drawThrustAndMiningParticles(ctx, deltaTime)

      const state = useGameStore.getState()
      let shipX = state.ship.x
      let shipY = state.ship.y

      if (state.ship.isFlying && state.ship.targetX !== null && state.ship.targetY !== null) {
        const dx = state.ship.targetX - state.ship.x
        const dy = state.ship.targetY - state.ship.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const effectiveSpeed = BASE_SPEED * (1 + state.upgrades.engine.speedBonus)
        const moveDist = effectiveSpeed * deltaTime

        if (dist <= moveDist) {
          const targetPlanet = planets.find((p) => p.id === state.selectedPlanetId)
          if (targetPlanet) {
            updateShipPosition(targetPlanet.x, targetPlanet.y)
            startMining(targetPlanet.id)
            currentMiningPlanetRef.current = targetPlanet
            miningTimerRef.current = 0
            miningParticleTimerRef.current = 0
          }
        } else {
          const newX = state.ship.x + (dx / dist) * moveDist
          const newY = state.ship.y + (dy / dist) * moveDist
          updateShipPosition(newX, newY)
          shipX = newX
          shipY = newY

          for (let i = 0; i < 2; i++) {
            const angle = Math.atan2(dy, dx) + Math.PI
            const spread = (Math.random() - 0.5) * 0.5
            addParticle({
              x: shipX,
              y: shipY,
              vx: Math.cos(angle + spread) * (30 + Math.random() * 20),
              vy: Math.sin(angle + spread) * (30 + Math.random() * 20),
              maxLife: 0.5,
              type: 'thrust',
              color: '#FFFFFF',
              size: 3,
            })
          }
        }
      }

      if (state.ship.isMining && currentMiningPlanetRef.current) {
        miningTimerRef.current += deltaTime
        miningParticleTimerRef.current += deltaTime

        const planet = currentMiningPlanetRef.current
        const miningTime = planet.difficulty * 2
        const efficiency = 1 + state.upgrades.laser.efficiencyBonus
        const progress = Math.min((miningTimerRef.current * efficiency) / miningTime, 1)

        updateMiningProgress(progress)

        if (miningParticleTimerRef.current >= 0.3) {
          miningParticleTimerRef.current = 0
          addParticle({
            x: planet.x,
            y: planet.y,
            vx: 0,
            vy: 0,
            maxLife: 1,
            type: 'mining',
            color: planet.color,
            size: 0,
          })
        }

        if (progress >= 1) {
          const amount = Math.floor(1 + Math.random() * 3)
          finishMining(
            planet.resourceType,
            amount,
            planet.x,
            planet.y,
            planet.x,
            planet.y,
            planet.color
          )
          startReturning(planet.x, planet.y)
          currentMiningPlanetRef.current = null
        }

        shipX = planet.x
        shipY = planet.y
      }

      if (state.ship.isReturning) {
        const newProgress = state.ship.returnProgress + deltaTime * 2
        if (newProgress >= 1) {
          finishReturning()
          shipX = 400
          shipY = 450
        } else {
          updateReturnProgress(newProgress)
          const startX = state.ship.returnStartX
          const startY = state.ship.returnStartY
          const endX = 400
          const endY = 450
          const t = newProgress
          shipX = startX + (endX - startX) * t
          const parabola = -4 * 20 * t * (t - 1)
          shipY = startY + (endY - startY) * t - parabola
          updateShipPosition(shipX, shipY)

          const dx = endX - startX
          const dy = endY - startY
          for (let i = 0; i < 2; i++) {
            const angle = Math.atan2(dy, dx) + Math.PI
            const spread = (Math.random() - 0.5) * 0.5
            addParticle({
              x: shipX,
              y: shipY,
              vx: Math.cos(angle + spread) * (30 + Math.random() * 20),
              vy: Math.sin(angle + spread) * (30 + Math.random() * 20),
              maxLife: 0.5,
              type: 'thrust',
              color: '#FFFFFF',
              size: 3,
            })
          }
        }
      }

      const now = performance.now()
      drawCollectParticles(ctx, now, shipX, shipY)

      const drawAngle = state.ship.isFlying
        ? Math.atan2(
            (state.ship.targetY ?? state.ship.y) - state.ship.y,
            (state.ship.targetX ?? state.ship.x) - state.ship.x
          )
        : state.ship.isReturning
          ? Math.atan2(450 - state.ship.returnStartY, 400 - state.ship.returnStartX)
          : -Math.PI / 2

      drawShip(ctx, shipX, shipY, drawAngle, state.ship.isSelected)

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [
    addParticle,
    hoveredPlanetId,
    selectedPlanetId,
    ship.isMining,
    ship.currentPlanetId,
    canMine,
    updateShipPosition,
    startMining,
    updateMiningProgress,
    finishMining,
    startReturning,
    updateReturnProgress,
    finishReturning,
    drawStars,
    drawPlanet,
    drawMiningRing,
    drawThrustAndMiningParticles,
    drawCollectParticles,
    drawShip,
  ])

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={handleCanvasMouseLeave}
    />
  )
}
