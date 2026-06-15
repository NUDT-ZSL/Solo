import {
  GameModel,
  createInitialModel,
  FRAGMENT_COLORS,
  MemoryFragment,
  Particle,
  Portal,
  BurstAnimation,
  mixColors,
  hexToRgb
} from './model'
import { Renderer } from './renderer'
import { AudioManager } from './audio'

export type GameState = 'intro' | 'playing' | 'victory' | 'defeat'

export interface GameStats {
  collectedCount: number
  portalsCleared: number
  lanternIntensity: number
  colorCounts: Record<string, number>
}

export type StateChangeCallback = (state: GameState, stats: GameStats) => void

const MAX_PARTICLES = 300
const TRAIL_PARTICLE_COUNT = 20
const TURN_SPEED = 3 * (Math.PI / 180)
const BOAT_SPEED = 2
const REQUIRED_SAME_COLOR = 5
const PORTS_REQUIRED_TOTAL = 3

export class GameLoop {
  private canvas: HTMLCanvasElement
  private model: GameModel
  private renderer: Renderer
  private audio: AudioManager
  private animationId: number = 0
  private lastTime: number = 0
  private running: boolean = false
  private onStateChange: StateChangeCallback
  private statsTimer: number = 0

  constructor(canvas: HTMLCanvasElement, onStateChange: StateChangeCallback) {
    this.canvas = canvas
    this.onStateChange = onStateChange

    const rect = canvas.getBoundingClientRect()
    const cssWidth = rect.width > 0 ? rect.width : Math.min(window.innerWidth, 800)
    const cssHeight = rect.height > 0 ? rect.height : 400

    this.model = createInitialModel(cssWidth, cssHeight)
    this.renderer = new Renderer(canvas)
    this.renderer.resize(cssWidth, cssHeight)
    this.audio = new AudioManager()

    this.spawnInitialFragments()
    this.setupEventListeners()
  }

  private spawnInitialFragments() {
    for (let i = 0; i < 3; i++) {
      this.spawnFragment(-i * 80 - 50)
    }
  }

  private setupEventListeners() {
    this.canvas.addEventListener('click', this.handleCanvasClick)
    window.addEventListener('resize', this.handleResize)
  }

  private removeEventListeners() {
    this.canvas.removeEventListener('click', this.handleCanvasClick)
    window.removeEventListener('resize', this.handleResize)
  }

  private handleResize = () => {
    const rect = this.canvas.getBoundingClientRect()
    const cssWidth = rect.width > 0 ? rect.width : Math.min(window.innerWidth, 800)
    const cssHeight = rect.height > 0 ? rect.height : 400

    const prevW = this.model.canvasWidth
    const prevH = this.model.canvasHeight

    this.model.canvasWidth = cssWidth
    this.model.canvasHeight = cssHeight

    this.model.riverWidth = 500
    this.model.riverLeft = (cssWidth - 500) / 2
    this.model.riverRight = this.model.riverLeft + 500

    const scaleX = cssWidth / prevW
    const scaleY = cssHeight / prevH

    this.model.boat.x *= scaleX
    this.model.boat.y *= scaleY

    this.renderer.resize(cssWidth, cssHeight)
  }

  private handleCanvasClick = (e: MouseEvent) => {
    if (!this.running || this.model.gameState !== 'playing') return

    this.audio.init()
    this.audio.resume()

    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.model.canvasWidth / rect.width
    const scaleY = this.model.canvasHeight / rect.height
    const clickX = (e.clientX - rect.left) * scaleX
    const clickY = (e.clientY - rect.top) * scaleY

    const dx = clickX - this.model.boat.x
    const dy = clickY - this.model.boat.y
    this.model.boat.targetHeadingAngle = Math.atan2(dy, dx)
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  stop() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = 0
    }
    this.removeEventListeners()
    this.audio.destroy()
  }

  private loop = (currentTime: number) => {
    if (!this.running) return

    const deltaTime = Math.min(currentTime - this.lastTime, 50)
    this.lastTime = currentTime

    this.update(deltaTime)
    this.renderer.render(this.model, deltaTime)

    this.statsTimer += deltaTime
    if (this.statsTimer > 100) {
      this.statsTimer = 0
      this.emitStats()
    }

    this.animationId = requestAnimationFrame(this.loop)
  }

  private emitStats() {
    const stats: GameStats = {
      collectedCount: this.model.totalCollected,
      portalsCleared: this.model.portalsCleared,
      lanternIntensity: this.model.boat.lanternIntensity,
      colorCounts: { ...this.model.colorFragmentCounts }
    }
    this.onStateChange(this.model.gameState, stats)
  }

  private update(deltaTime: number) {
    if (this.model.gameState !== 'playing') {
      this.updateScreenEffects(deltaTime)
      return
    }

    this.model.river.wavePhase += deltaTime * 0.003
    this.updateBoat(deltaTime)
    this.updateBoatTrail()
    this.updateFragmentSpawning(deltaTime)
    this.updateFragments(deltaTime)
    this.updateFragmentParticleEmit(deltaTime)
    this.updateParticles(deltaTime)
    this.checkFragmentCollisions()
    this.updatePortals(deltaTime)
    this.checkPortalCollisions()
    this.checkWallCollisions()
    this.updateBursts(deltaTime)
    this.updateScreenEffects(deltaTime)
    this.checkGameEnd()

    this.trimParticles()
  }

  private updateBoat(deltaTime: number) {
    const boat = this.model.boat

    if (boat.bounceBackTimer > 0) {
      boat.bounceBackTimer -= deltaTime
      if (boat.bounceBackTimer <= 0) {
        boat.bounceBackTimer = 0
      }
    }

    let angleDiff = boat.targetHeadingAngle - boat.headingAngle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

    const maxTurn = TURN_SPEED
    if (Math.abs(angleDiff) > maxTurn) {
      boat.headingAngle += Math.sign(angleDiff) * maxTurn
    } else {
      boat.headingAngle = boat.targetHeadingAngle
    }

    const speedMult = boat.bounceBackTimer > 0 ? 0.3 : 1
    const speed = BOAT_SPEED * speedMult
    boat.x += Math.cos(boat.headingAngle) * speed
    boat.y += Math.sin(boat.headingAngle) * speed
  }

  private updateBoatTrail() {
    const boat = this.model.boat
    const tailX = boat.x - Math.cos(boat.headingAngle) * 12
    const tailY = boat.y - Math.sin(boat.headingAngle) * 12

    this.addParticle({
      id: this.model.nextParticleId++,
      x: tailX + (Math.random() - 0.5) * 2,
      y: tailY + (Math.random() - 0.5) * 2,
      vx: -Math.cos(boat.headingAngle) * 0.3 + (Math.random() - 0.5) * 0.2,
      vy: -Math.sin(boat.headingAngle) * 0.3 + (Math.random() - 0.5) * 0.2,
      size: 2.5,
      startSize: 2.5,
      color: '#FFFFFF',
      alpha: 0.6,
      startAlpha: 0.6,
      life: 600,
      maxLife: 600,
      type: 'trail'
    })
  }

  private updateFragmentSpawning(deltaTime: number) {
    this.model.fragmentSpawnTimer += deltaTime
    const interval = this.model.fragmentSpawnInterval
    if (this.model.fragmentSpawnTimer >= interval) {
      this.model.fragmentSpawnTimer = 0
      this.model.fragmentSpawnInterval = 2000 + Math.random() * 1000
      this.spawnFragment(-20)
    }
  }

  private spawnFragment(yOffset: number = -30) {
    const { riverLeft, riverRight, canvasHeight } = this.model
    const center = (riverLeft + riverRight) / 2
    const margin = 30

    const fragment: MemoryFragment = {
      id: this.model.nextFragmentId++,
      color: FRAGMENT_COLORS[Math.floor(Math.random() * FRAGMENT_COLORS.length)],
      position: {
        x: center + (Math.random() - 0.5) * (riverRight - riverLeft - margin * 2),
        y: yOffset + canvasHeight * 0.1
      },
      collected: false,
      diameter: 12 + Math.random() * 4,
      glowRadius: 20,
      glowAlpha: 0.3 + Math.random() * 0.3,
      driftSpeed: 0.5 + Math.random() * 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (0.5 + Math.random() * 1.5) * (Math.PI / 180),
      emitTimer: 0,
      emitInterval: 200 + Math.random() * 133
    }

    this.model.fragments.push(fragment)
  }

  private updateFragments(deltaTime: number) {
    const { canvasHeight, river } = this.model
    const toRemove: number[] = []

    for (let i = 0; i < this.model.fragments.length; i++) {
      const f = this.model.fragments[i]
      if (f.collected) continue

      f.position.y += f.driftSpeed
      f.rotation += f.rotationSpeed

      const waveOffset = Math.sin(f.position.y * 0.02 + river.wavePhase) * 0.5
      f.position.x += waveOffset

      if (f.position.y > canvasHeight + 50) {
        toRemove.push(i)
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.model.fragments.splice(toRemove[i], 1)
    }
  }

  private updateFragmentParticleEmit(deltaTime: number) {
    for (const f of this.model.fragments) {
      if (f.collected) continue

      f.emitTimer += deltaTime
      if (f.emitTimer >= f.emitInterval) {
        f.emitTimer = 0
        this.emitFragmentParticle(f)
      }
    }
  }

  private emitFragmentParticle(frag: MemoryFragment) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.3 + Math.random() * 0.5

    this.addParticle({
      id: this.model.nextParticleId++,
      x: frag.position.x,
      y: frag.position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 0.2,
      size: 1 + Math.random(),
      startSize: 1 + Math.random(),
      color: frag.color,
      alpha: 0.7,
      startAlpha: 0.7,
      life: 500 + Math.random() * 1000,
      maxLife: 1500,
      type: 'fragment-emit'
    })
  }

  private updateParticles(deltaTime: number) {
    for (let i = this.model.particles.length - 1; i >= 0; i--) {
      const p = this.model.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= deltaTime

      if (p.type === 'burst') {
        p.vx *= 0.96
        p.vy *= 0.96
      }

      if (p.life <= 0) {
        this.model.particles.splice(i, 1)
      }
    }
  }

  private checkFragmentCollisions() {
    const boat = this.model.boat
    const collectRadius = 25

    for (const f of this.model.fragments) {
      if (f.collected) continue

      const dx = f.position.x - boat.x
      const dy = f.position.y - boat.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < collectRadius + f.diameter / 2) {
        this.collectFragment(f)
      }
    }
  }

  private collectFragment(frag: MemoryFragment) {
    frag.collected = true
    this.model.totalCollected++
    this.model.colorFragmentCounts[frag.color] = (this.model.colorFragmentCounts[frag.color] || 0) + 1

    const boat = this.model.boat
    boat.lanternRadius = Math.min(100, boat.lanternRadius + 5)
    boat.lanternIntensity = Math.min(100, 20 + this.model.totalCollected * 5)

    if (boat.lanternColor === '#FFFFFF') {
      boat.lanternColor = frag.color
    } else {
      boat.lanternColor = mixColors(boat.lanternColor, frag.color, 0.3)
    }

    this.createBurstAnimation(frag.position.x, frag.position.y, frag.color)
    this.spawnBurstParticles(frag.position.x, frag.position.y, frag.color)

    const colorCount = this.model.colorFragmentCounts[frag.color] || 0
    if (colorCount >= REQUIRED_SAME_COLOR && this.model.portals.length === 0) {
      this.spawnPortal(frag.color)
    }

    const idx = this.model.fragments.indexOf(frag)
    if (idx >= 0) this.model.fragments.splice(idx, 1)

    const baseFreq = 440 * Math.pow(2, (this.model.totalCollected % 12) / 12)
    this.audio.playCollectArpeggio(baseFreq)
  }

  private createBurstAnimation(x: number, y: number, color: string) {
    const burst: BurstAnimation = {
      id: this.model.nextBurstId++,
      x,
      y,
      color,
      timer: 0,
      duration: 600,
      startDiameter: 14,
      endDiameter: 40
    }
    this.model.bursts.push(burst)
  }

  private spawnBurstParticles(x: number, y: number, color: string) {
    const particleCount = 20
    const fc = hexToRgb(color)
    const mixed = `rgb(${Math.round(fc.r * 0.7 + 255 * 0.3)}, ${Math.round(fc.g * 0.7 + 255 * 0.3)}, ${Math.round(fc.b * 0.7 + 255 * 0.3)})`

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3
      const speed = 1.5 + Math.random() * 2.5
      const life = 600

      this.addParticle({
        id: this.model.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        startSize: 3 + Math.random() * 2,
        color: mixed,
        alpha: 1,
        startAlpha: 1,
        life,
        maxLife: life,
        type: 'burst'
      })
    }
  }

  private spawnPortal(color: string) {
    const { canvasHeight, riverLeft, riverRight } = this.model
    const centerX = (riverLeft + riverRight) / 2

    const portal: Portal = {
      id: this.model.nextPortalId++,
      color,
      x: centerX,
      y: canvasHeight * 0.25,
      width: 40,
      height: 60,
      pulseTimer: 0,
      pulsePeriod: 1500,
      rotation: 0,
      active: true
    }

    this.model.portals.push(portal)
    this.model.river.gateActive = true
    this.audio.playPortalPulse()
  }

  private updatePortals(deltaTime: number) {
    for (const p of this.model.portals) {
      p.pulseTimer += deltaTime
      p.rotation += deltaTime * 0.002
    }
  }

  private checkPortalCollisions() {
    const boat = this.model.boat

    for (let i = this.model.portals.length - 1; i >= 0; i--) {
      const p = this.model.portals[i]
      if (!p.active) continue

      const dx = boat.x - p.x
      const dy = boat.y - p.y
      const normX = dx / (p.width / 2)
      const normY = dy / (p.height / 2)
      const dist = Math.sqrt(normX * normX + normY * normY)

      if (dist < 1.2) {
        this.enterPortal(p, i)
      }
    }
  }

  private enterPortal(portal: Portal, index: number) {
    this.model.portals.splice(index, 1)
    this.model.portalsCleared++
    this.model.river.gateActive = false

    this.model.screenFlash = {
      active: true,
      color: portal.color,
      timer: 800,
      duration: 800
    }

    setTimeout(() => {
      this.resetRiverSegment()
    }, 400)

    this.audio.playPortalPulse()
  }

  private resetRiverSegment() {
    if (this.model.gameState !== 'playing') return

    this.model.fragments.length = 0
    this.model.portals.length = 0
    this.model.bursts.length = 0
    this.model.river.gateActive = false

    this.model.colorFragmentCounts = {}
    this.model.boat.lanternRadius = 20
    this.model.boat.lanternIntensity = 20
    this.model.boat.lanternColor = '#FFFFFF'

    this.model.boat.x = this.model.canvasWidth / 2
    this.model.boat.y = this.model.canvasHeight - 80
    this.model.boat.headingAngle = -Math.PI / 2
    this.model.boat.targetHeadingAngle = -Math.PI / 2

    this.spawnInitialFragments()
  }

  private checkWallCollisions() {
    const boat = this.model.boat
    const { riverLeft, riverRight } = this.model
    const margin = 5
    let hitWall = false

    if (boat.x < riverLeft + margin) {
      boat.x = riverLeft + margin
      hitWall = true
    } else if (boat.x > riverRight - margin) {
      boat.x = riverRight - margin
      hitWall = true
    }

    if (boat.y < 20) {
      boat.y = 20
      hitWall = true
    } else if (boat.y > this.model.canvasHeight - 20) {
      boat.y = this.model.canvasHeight - 20
      hitWall = true
    }

    if (hitWall && boat.bounceBackTimer <= 0) {
      boat.lanternIntensity = Math.max(0, boat.lanternIntensity - 10)
      boat.bounceBackTimer = 300

      const center = (riverLeft + riverRight) / 2
      boat.targetHeadingAngle = Math.atan2(this.model.canvasHeight - 80 - boat.y, center - boat.x)
      boat.headingAngle = boat.targetHeadingAngle

      this.model.screenFlash = {
        active: true,
        color: '#FF6B6B',
        timer: 300,
        duration: 300
      }

      this.audio.playWallBounce()
    }
  }

  private updateBursts(deltaTime: number) {
    for (let i = this.model.bursts.length - 1; i >= 0; i--) {
      const b = this.model.bursts[i]
      b.timer += deltaTime
      if (b.timer >= b.duration) {
        this.model.bursts.splice(i, 1)
      }
    }
  }

  private updateScreenEffects(deltaTime: number) {
    if (this.model.screenFlash.active) {
      this.model.screenFlash.timer -= deltaTime
      if (this.model.screenFlash.timer <= 0) {
        this.model.screenFlash.active = false
        this.model.screenFlash.timer = 0
      }
    }

    if (this.model.fadeOut.active) {
      this.model.fadeOut.timer += deltaTime
    }
  }

  private checkGameEnd() {
    if (this.model.portalsCleared >= PORTS_REQUIRED_TOTAL && this.model.gameState === 'playing') {
      this.model.gameState = 'victory'
      this.model.fadeOut = { active: true, timer: 0, duration: 1500 }
      this.audio.playVictory()
      this.emitStats()
      return
    }

    if (this.model.boat.lanternIntensity <= 0 && this.model.gameState === 'playing') {
      this.model.gameState = 'defeat'
      this.model.fadeOut = { active: true, timer: 0, duration: 2000 }
      this.audio.playGameOver()
      this.emitStats()
    }
  }

  private addParticle(p: Particle) {
    this.model.particles.push(p)
  }

  private trimParticles() {
    if (this.model.particles.length > MAX_PARTICLES) {
      const excess = this.model.particles.length - MAX_PARTICLES
      this.model.particles.splice(0, excess)
    }
  }
}
