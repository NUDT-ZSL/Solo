import { useRef, useCallback, useEffect } from 'react'
import type { Enemy } from './EnemyAI'

export interface PlayerState {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  speed: number
  maxSpeed: number
  flashCooldown: number
  flashMaxCooldown: number
  flashActive: boolean
  flashRadius: number
  flashTimer: number
  alive: boolean
  respawnTimer: number
}

export interface TrailParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

const PLAYER_SPEED = 3.0
const FLASH_COOLDOWN = 2.0
const FLASH_RADIUS = 150
const FLASH_DURATION = 0.4
const PLAYER_RADIUS = 12
const MAX_TRAIL_PARTICLES = 500
const CATCH_RADIUS = 18

export function usePlayerController() {
  const playerRef = useRef<PlayerState>({
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    maxSpeed: PLAYER_SPEED,
    flashCooldown: 0,
    flashMaxCooldown: FLASH_COOLDOWN,
    flashActive: false,
    flashRadius: 0,
    flashTimer: 0,
    alive: true,
    respawnTimer: 0,
  })

  const trailRef = useRef<TrailParticle[]>([])
  const keysRef = useRef<Set<string>>(new Set())
  const justPressedSpaceRef = useRef(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      if (e.key === ' ') {
        justPressedSpaceRef.current = true
        e.preventDefault()
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const resetPlayer = useCallback((x: number, y: number) => {
    const p = playerRef.current
    p.x = x
    p.y = y
    p.vx = 0
    p.vy = 0
    p.angle = 0
    p.speed = 0
    p.flashCooldown = 0
    p.flashActive = false
    p.flashRadius = 0
    p.flashTimer = 0
    p.alive = true
    p.respawnTimer = 0
    trailRef.current = []
  }, [])

  const update = useCallback(
    (dt: number, canvasW: number, canvasH: number, enemies: Enemy[]) => {
      const p = playerRef.current
      const keys = keysRef.current

      if (!p.alive) {
        p.respawnTimer -= dt
        if (p.respawnTimer <= 0) {
          p.alive = true
          p.x = 80
          p.y = canvasH / 2
          p.vx = 0
          p.vy = 0
        }
        return
      }

      let ax = 0
      let ay = 0
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) ax -= 1
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) ax += 1
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) ay -= 1
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) ay += 1

      const inputLen = Math.hypot(ax, ay)
      if (inputLen > 0) {
        ax /= inputLen
        ay /= inputLen
      }

      const accel = 12
      const friction = 6

      p.vx += ax * accel * dt
      p.vy += ay * accel * dt

      p.vx -= p.vx * friction * dt
      p.vy -= p.vy * friction * dt

      p.speed = Math.hypot(p.vx, p.vy)
      if (p.speed > p.maxSpeed) {
        p.vx = (p.vx / p.speed) * p.maxSpeed
        p.vy = (p.vy / p.speed) * p.maxSpeed
        p.speed = p.maxSpeed
      }

      p.x += p.vx
      p.y += p.vy

      const margin = PLAYER_RADIUS
      if (p.x < margin) { p.x = margin; p.vx *= -0.3 }
      if (p.x > canvasW - margin) { p.x = canvasW - margin; p.vx *= -0.3 }
      if (p.y < margin) { p.y = margin; p.vy *= -0.3 }
      if (p.y > canvasH - margin) { p.y = canvasH - margin; p.vy *= -0.3 }

      if (p.speed > 0.3) {
        p.angle = Math.atan2(p.vy, p.vx)
      }

      if (p.flashCooldown > 0) {
        p.flashCooldown -= dt
        if (p.flashCooldown < 0) p.flashCooldown = 0
      }

      if (justPressedSpaceRef.current && p.flashCooldown <= 0) {
        p.flashActive = true
        p.flashTimer = FLASH_DURATION
        p.flashRadius = FLASH_RADIUS
        p.flashCooldown = FLASH_COOLDOWN
        justPressedSpaceRef.current = false
      } else {
        justPressedSpaceRef.current = false
      }

      if (p.flashActive) {
        p.flashTimer -= dt
        if (p.flashTimer <= 0) {
          p.flashActive = false
          p.flashRadius = 0
        }
      }

      if (p.speed > 0.5) {
        const spawnCount = Math.min(3, Math.floor(p.speed * 1.5))
        for (let i = 0; i < spawnCount; i++) {
          if (trailRef.current.length >= MAX_TRAIL_PARTICLES) break
          const spread = 0.5
          const baseAngle = p.angle + Math.PI + (Math.random() - 0.5) * spread
          const spd = 0.3 + Math.random() * 0.5
          trailRef.current.push({
            x: p.x - Math.cos(p.angle) * 8 + (Math.random() - 0.5) * 4,
            y: p.y - Math.sin(p.angle) * 8 + (Math.random() - 0.5) * 4,
            vx: Math.cos(baseAngle) * spd,
            vy: Math.sin(baseAngle) * spd,
            life: 0.6 + Math.random() * 0.4,
            maxLife: 1,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#7fdbff' : '#b4e7ff',
            alpha: 0.7,
          })
        }
      }

      for (const tp of trailRef.current) {
        tp.x += tp.vx
        tp.y += tp.vy
        tp.vx *= 0.97
        tp.vy *= 0.97
        tp.life -= dt
        tp.alpha = Math.max(0, (tp.life / tp.maxLife) * 0.7)
        tp.size *= 0.995
      }
      trailRef.current = trailRef.current.filter(tp => tp.life > 0 && tp.size > 0.3)

      if (!p.flashActive) {
        for (const enemy of enemies) {
          if (enemy.state === 'stunned') continue
          const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y)
          if (dist < CATCH_RADIUS + enemy.bodyLength * 0.3) {
            p.alive = false
            p.respawnTimer = 2.0
            break
          }
        }
      }
    },
    [],
  )

  return {
    playerRef,
    trailRef,
    update,
    resetPlayer,
  }
}
