import type { Star, Ship, Asteroid, Mineral, Particle, LaserBeam } from './entities'
import {
  createStarField,
  createAsteroid,
  createMineral,
  createExplosionParticles,
  createLaserBeam,
  getMineralType,
} from './entities'
import { useGameStore } from '../store'
import type { GalaxyType } from '../store'

const GALAXY_DIFFICULTY: Record<GalaxyType, number> = {
  safe: 0.7,
  medium: 1.0,
  dangerous: 1.5,
}

const SHIP_BASE_SPEED = 180
const SHIP_SPEED_PER_LEVEL = 30
const SHIELD_BASE = 100
const SHIELD_PER_LEVEL = 25
const LASER_BASE_DAMAGE = 1
const LASER_DAMAGE_PER_LEVEL = 0.5
const MINERAL_DRIFT_SPEED = 30
const MINERAL_PICKUP_RADIUS = 25
const ASTEROID_WAVE_INTERVAL = 5
const MAX_ASTEROIDS = 30

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  private ship: Ship
  private asteroids: Asteroid[] = []
  private minerals: Mineral[] = []
  private particles: Particle[] = []
  private laserBeams: LaserBeam[] = []
  private stars: Star[] = []

  private keys = new Set<string>()
  private mouseX = 0
  private mouseY = 0
  private isMouseDown = false
  private lastShootTime = 0

  private lastTime = 0
  private asteroidTimer = 0
  private running = false
  private animFrameId = 0
  private gameTime = 0

  private audioCtx: AudioContext | null = null
  private difficulty: number = 1

  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundResize: () => void

  constructor(canvas: HTMLCanvasElement, galaxy: GalaxyType) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.width = canvas.width
    this.height = canvas.height
    this.difficulty = GALAXY_DIFFICULTY[galaxy]

    this.ship = {
      x: this.width / 2,
      y: this.height / 2,
      angle: 0,
      speed: SHIP_BASE_SPEED,
      shield: SHIELD_BASE,
      maxShield: SHIELD_BASE,
      engineLevel: 1,
      shieldLevel: 1,
      laserLevel: 1,
    }

    this.stars = createStarField(200, this.width, this.height)

    this.boundKeyDown = this.onKeyDown.bind(this)
    this.boundKeyUp = this.onKeyUp.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundResize = this.onResize.bind(this)
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this.asteroidTimer = ASTEROID_WAVE_INTERVAL - 2

    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
    this.canvas.addEventListener('mousemove', this.boundMouseMove)
    this.canvas.addEventListener('mousedown', this.boundMouseDown)
    this.canvas.addEventListener('mouseup', this.boundMouseUp)
    window.addEventListener('resize', this.boundResize)

    this.gameLoop(this.lastTime)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animFrameId)

    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.canvas.removeEventListener('mousemove', this.boundMouseMove)
    this.canvas.removeEventListener('mousedown', this.boundMouseDown)
    this.canvas.removeEventListener('mouseup', this.boundMouseUp)
    window.removeEventListener('resize', this.boundResize)

    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
  }

  syncFromStore() {
    const s = useGameStore.getState()
    this.ship.engineLevel = s.engineLevel
    this.ship.shieldLevel = s.shieldLevel
    this.ship.laserLevel = s.laserLevel
    this.ship.speed = SHIP_BASE_SPEED + (s.engineLevel - 1) * SHIP_SPEED_PER_LEVEL
    this.ship.maxShield = SHIELD_BASE + (s.shieldLevel - 1) * SHIELD_PER_LEVEL
    this.ship.shield = s.shield
  }

  private onResize() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.key.toLowerCase())
    if (e.key.toLowerCase() === 'b') {
      const s = useGameStore.getState()
      if (s.gamePhase === 'playing') {
        useGameStore.getState().toggleUpgradePanel()
      }
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase())
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouseX = e.clientX - rect.left
    this.mouseY = e.clientY - rect.top
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.isMouseDown = true
      this.tryShoot()
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.isMouseDown = false
    }
  }

  private tryShoot() {
    const now = performance.now() / 1000
    const cooldown = 0.25 - (this.ship.laserLevel - 1) * 0.03
    if (now - this.lastShootTime < cooldown) return
    this.lastShootTime = now

    const beam = createLaserBeam(this.ship.x, this.ship.y, this.mouseX, this.mouseY)
    this.laserBeams.push(beam)

    this.checkLaserHit(this.ship.x, this.ship.y, this.mouseX, this.mouseY)
  }

  private checkLaserHit(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return

    const dirX = dx / len
    const dirY = dy / len
    const damage = LASER_BASE_DAMAGE + (this.ship.laserLevel - 1) * LASER_DAMAGE_PER_LEVEL

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i]
      const t = this.pointToSegmentDist(a.x, a.y, x1, y1, x2, y2)
      if (t < a.radius) {
        a.hp -= damage
        const hitX = x1 + dirX * t
        const hitY = y1 + dirY * t
        this.particles.push(...createExplosionParticles(hitX, hitY, '#ff9800', 4))

        if (a.hp <= 0) {
          this.destroyAsteroid(i)
        }
        break
      }
    }
  }

  private pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))

    const closestX = x1 + t * dx
    const closestY = y1 + t * dy
    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2)
  }

  private destroyAsteroid(index: number) {
    const a = this.asteroids[index]
    this.asteroids.splice(index, 1)

    this.particles.push(...createExplosionParticles(a.x, a.y, a.color1, 12))

    const dropCount = 1 + Math.floor(a.radius / 15)
    for (let j = 0; j < dropCount; j++) {
      const offsetX = (Math.random() - 0.5) * a.radius
      const offsetY = (Math.random() - 0.5) * a.radius
      const type = getMineralType(this.difficulty)
      this.minerals.push(createMineral(a.x + offsetX, a.y + offsetY, type))
    }

    useGameStore.getState().addAsteroidsDestroyed()
    useGameStore.getState().addExperience(Math.ceil(10 * this.difficulty))
  }

  private playPickupSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext()
      }
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.frequency.value = 800
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1)

      osc.start(this.audioCtx.currentTime)
      osc.stop(this.audioCtx.currentTime + 0.1)
    } catch {
      // Audio not available
    }
  }

  private gameLoop(time: number) {
    if (!this.running) return

    const dt = Math.min((time - this.lastTime) / 1000, 0.05)
    this.lastTime = time
    this.gameTime += dt

    const s = useGameStore.getState()
    if (s.gamePhase === 'playing' && !s.upgradePanelOpen) {
      this.update(dt)
    }

    this.render()
    this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this))
  }

  private update(dt: number) {
    this.syncFromStore()
    this.handleInput(dt)
    this.spawnAsteroids(dt)
    this.updateAsteroids(dt)
    this.updateMinerals(dt)
    this.updateParticles(dt)
    this.updateLaserBeams(dt)
    this.checkShipCollisions()
    this.syncToStore()
  }

  private handleInput(dt: number) {
    let dx = 0, dy = 0
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy)
      dx /= len
      dy /= len
      this.ship.x += dx * this.ship.speed * dt
      this.ship.y += dy * this.ship.speed * dt
    }

    this.ship.x = Math.max(15, Math.min(this.width - 15, this.ship.x))
    this.ship.y = Math.max(15, Math.min(this.height - 15, this.ship.y))

    this.ship.angle = Math.atan2(this.mouseY - this.ship.y, this.mouseX - this.ship.x)

    if (this.isMouseDown) {
      this.tryShoot()
    }
  }

  private spawnAsteroids(dt: number) {
    this.asteroidTimer += dt
    if (this.asteroidTimer >= ASTEROID_WAVE_INTERVAL) {
      this.asteroidTimer = 0
      const count = Math.floor(Math.random() * 4) + 2
      const maxCount = Math.min(count, MAX_ASTEROIDS - this.asteroids.length)
      for (let i = 0; i < maxCount; i++) {
        this.asteroids.push(createAsteroid(this.width, this.height, this.difficulty))
      }
    }
  }

  private updateAsteroids(dt: number) {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i]
      a.x += Math.cos(a.angle) * a.speed * dt
      a.y += Math.sin(a.angle) * a.speed * dt
      a.rotation += a.rotationSpeed * dt

      const margin = a.radius + 50
      if (a.x < -margin || a.x > this.width + margin ||
          a.y < -margin || a.y > this.height + margin) {
        const centerX = this.width / 2
        const centerY = this.height / 2
        const distToCenter = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2)
        if (distToCenter > Math.max(this.width, this.height) * 0.8) {
          this.asteroids.splice(i, 1)
        }
      }
    }
  }

  private updateMinerals(dt: number) {
    for (let i = this.minerals.length - 1; i >= 0; i--) {
      const m = this.minerals[i]

      if (m.collectAnim > 0) {
        m.collectAnim += dt * 5
        m.width = Math.max(0, m.width - dt * 40)
        if (m.collectAnim > 1) {
          this.minerals.splice(i, 1)
        }
        continue
      }

      const dx = this.ship.x - m.x
      const dy = this.ship.y - m.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 0) {
        const drift = MINERAL_DRIFT_SPEED * dt
        m.x += (dx / dist) * drift
        m.y += (dy / dist) * drift
      }

      if (dist < MINERAL_PICKUP_RADIUS) {
        m.collectAnim = 0.01
        useGameStore.getState().collectMineral(m.type)
        this.playPickupSound()
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      p.vx *= 0.98
      p.vy *= 0.98
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  private updateLaserBeams(dt: number) {
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      this.laserBeams[i].life -= dt
      if (this.laserBeams[i].life <= 0) {
        this.laserBeams.splice(i, 1)
      }
    }
  }

  private checkShipCollisions() {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i]
      const dx = this.ship.x - a.x
      const dy = this.ship.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < a.radius + 12) {
        this.ship.shield -= a.radius
        this.particles.push(...createExplosionParticles(a.x, a.y, '#ff5252', 6))
        this.asteroids.splice(i, 1)

        if (this.ship.shield <= 0) {
          this.ship.shield = 0
          useGameStore.getState().setShield(0)
          useGameStore.getState().triggerGameOver()
          return
        }
      }
    }
  }

  private syncToStore() {
    useGameStore.getState().setShield(this.ship.shield)
  }

  private render() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    const bgGrad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    )
    bgGrad.addColorStop(0, '#0d0d35')
    bgGrad.addColorStop(1, '#0a0a2e')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, this.width, this.height)

    this.renderStars(ctx)
    this.renderAsteroids(ctx)
    this.renderMinerals(ctx)
    this.renderLaserBeams(ctx)
    this.renderParticles(ctx)
    this.renderShip(ctx)
    this.renderCrosshair(ctx)
  }

  private renderStars(ctx: CanvasRenderingContext2D) {
    for (const star of this.stars) {
      const alpha = star.baseAlpha + Math.sin(this.gameTime * star.speed + star.phase) * 0.3
      ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha))
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private renderShip(ctx: CanvasRenderingContext2D) {
    const s = this.ship
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angle)

    const shieldAlpha = s.shield / s.maxShield * 0.3
    if (shieldAlpha > 0) {
      ctx.beginPath()
      ctx.arc(0, 0, 18, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(0, 229, 255, ${shieldAlpha})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.moveTo(16, 0)
    ctx.lineTo(-10, -9)
    ctx.lineTo(-6, 0)
    ctx.lineTo(-10, 9)
    ctx.closePath()

    const grad = ctx.createLinearGradient(-10, 0, 16, 0)
    grad.addColorStop(0, '#1a237e')
    grad.addColorStop(1, '#00e5ff')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 1
    ctx.stroke()

    const isMoving = this.keys.has('w') || this.keys.has('s') ||
                     this.keys.has('a') || this.keys.has('d') ||
                     this.keys.has('arrowup') || this.keys.has('arrowdown') ||
                     this.keys.has('arrowleft') || this.keys.has('arrowright')
    if (isMoving) {
      ctx.beginPath()
      ctx.moveTo(-7, -4)
      ctx.lineTo(-14 - Math.random() * 6, 0)
      ctx.lineTo(-7, 4)
      ctx.closePath()
      const engineGrad = ctx.createLinearGradient(-7, 0, -20, 0)
      engineGrad.addColorStop(0, '#ff6600')
      engineGrad.addColorStop(1, 'rgba(255, 102, 0, 0)')
      ctx.fillStyle = engineGrad
      ctx.fill()
    }

    ctx.restore()
  }

  private renderAsteroids(ctx: CanvasRenderingContext2D) {
    for (const a of this.asteroids) {
      ctx.save()
      ctx.translate(a.x, a.y)
      ctx.rotate(a.rotation)

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, a.radius)
      grad.addColorStop(0, a.color1)
      grad.addColorStop(1, a.color2)
      ctx.fillStyle = grad

      ctx.beginPath()
      const vertCount = a.vertices.length
      for (let j = 0; j < vertCount; j++) {
        const angle = (j / vertCount) * Math.PI * 2
        const r = a.radius * a.vertices[j]
        const px = Math.cos(angle) * r
        const py = Math.sin(angle) * r
        if (j === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = a.color2
      ctx.lineWidth = 1
      ctx.stroke()

      if (a.hasStripes) {
        ctx.globalAlpha = 0.4
        ctx.strokeStyle = a.stripeColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-a.radius * 0.6, -a.radius * 0.3)
        ctx.lineTo(a.radius * 0.6, -a.radius * 0.3)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-a.radius * 0.4, a.radius * 0.2)
        ctx.lineTo(a.radius * 0.7, a.radius * 0.2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      if (a.hp < a.maxHp) {
        const hpRatio = a.hp / a.maxHp
        ctx.globalAlpha = 0.6
        ctx.strokeStyle = '#ff5252'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-a.radius * hpRatio, -a.radius - 6)
        ctx.lineTo(a.radius * hpRatio, -a.radius - 6)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }
  }

  private renderMinerals(ctx: CanvasRenderingContext2D) {
    for (const m of this.minerals) {
      const alpha = m.collectAnim > 0 ? Math.max(0, 1 - m.collectAnim) : 1
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(m.x, m.y)

      const w = m.width
      const colors: Record<string, { fill: string; stroke: string }> = {
        iron: { fill: '#8d6e63', stroke: '#5d4037' },
        copper: { fill: '#ff9800', stroke: '#e65100' },
        crystal: { fill: '#ce93d8', stroke: '#7b1fa2' },
      }
      const c = colors[m.type]

      if (m.type === 'iron') {
        ctx.beginPath()
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2 - Math.PI / 6
          const px = Math.cos(angle) * w / 2
          const py = Math.sin(angle) * w / 2
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fillStyle = c.fill
        ctx.fill()
        ctx.strokeStyle = c.stroke
        ctx.lineWidth = 1
        ctx.stroke()
      } else if (m.type === 'copper') {
        ctx.fillStyle = c.fill
        ctx.fillRect(-w / 2, -w / 2, w, w)
        ctx.strokeStyle = c.stroke
        ctx.lineWidth = 1
        ctx.strokeRect(-w / 2, -w / 2, w, w)
      } else {
        ctx.beginPath()
        ctx.moveTo(0, -w / 2)
        ctx.lineTo(w / 2, 0)
        ctx.lineTo(0, w / 2)
        ctx.lineTo(-w / 2, 0)
        ctx.closePath()
        ctx.fillStyle = c.fill
        ctx.fill()
        ctx.strokeStyle = c.stroke
        ctx.lineWidth = 1
        ctx.stroke()
      }

      const glowAlpha = 0.3 + Math.sin(this.gameTime * 4) * 0.15
      ctx.globalAlpha = glowAlpha * alpha
      ctx.beginPath()
      ctx.arc(0, 0, w, 0, Math.PI * 2)
      ctx.fillStyle = c.fill
      ctx.fill()

      ctx.restore()
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private renderLaserBeams(ctx: CanvasRenderingContext2D) {
    for (const beam of this.laserBeams) {
      const alpha = beam.life / 0.15
      ctx.save()
      ctx.globalAlpha = alpha

      ctx.strokeStyle = '#00e5ff'
      ctx.lineWidth = 3
      ctx.shadowColor = '#00e5ff'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(beam.x1, beam.y1)
      ctx.lineTo(beam.x2, beam.y2)
      ctx.stroke()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.moveTo(beam.x1, beam.y1)
      ctx.lineTo(beam.x2, beam.y2)
      ctx.stroke()

      ctx.restore()
    }
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D) {
    const x = this.mouseX
    const y = this.mouseY
    const size = 10

    ctx.strokeStyle = '#ff1744'
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(x - size, y)
    ctx.lineTo(x - 3, y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + 3, y)
    ctx.lineTo(x + size, y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x, y - size)
    ctx.lineTo(x, y - 3)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x, y + 3)
    ctx.lineTo(x, y + size)
    ctx.stroke()

    const dotAlpha = 0.5 + Math.sin(this.gameTime * 8) * 0.5
    ctx.globalAlpha = dotAlpha
    ctx.fillStyle = '#ff1744'
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
