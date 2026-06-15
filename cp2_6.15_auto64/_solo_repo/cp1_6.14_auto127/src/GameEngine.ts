import type { GameState, Ship, Obstacle, EnergyOrb, Particle, Star, RenderData, InputData } from './types'
import { bridge } from './Bridge'

const INITIAL_SPEED = 200
const MAX_SPEED = 800
const SPEED_INCREMENT = 20
const SPEED_INTERVAL = 10000
const INITIAL_LIVES = 3
const ENERGY_SCORE = 100
const ENERGY_BOOST_THRESHOLD = 10
const BOOST_MULTIPLIER = 1.1
const BOOST_DURATION = 5000
const INVINCIBLE_DURATION = 1000
const CANVAS_PADDING = 10
const SHIP_WIDTH = 30
const SHIP_HEIGHT = 40
const ENERGY_RADIUS = 12
const OBSTACLE_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3']
const MAX_ENTITIES = 50

class GameEngine {
  private canvasWidth: number
  private canvasHeight: number
  private gameState: GameState
  private ship: Ship
  private obstacles: Obstacle[]
  private energyOrbs: EnergyOrb[]
  private particles: Particle[]
  private stars: Star[]
  private input: InputData
  private animationFrameId: number | null
  private lastTime: number
  private lastSpeedIncrement: number
  private lastObstacleSpawn: number
  private lastOrbSpawn: number
  private obstacleSpawnInterval: number
  private nextId: number

  constructor(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
    this.gameState = {
      running: false,
      paused: false,
      score: 0,
      speed: INITIAL_SPEED,
      lives: INITIAL_LIVES,
      energyCollected: 0,
      boostActive: false,
      boostEndTime: 0,
      invincible: false,
      invincibleEndTime: 0,
      elapsedTime: 0
    }
    this.ship = {
      x: 0,
      y: 0,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      velocityX: 0,
      velocityY: 0
    }
    this.obstacles = []
    this.energyOrbs = []
    this.particles = []
    this.stars = []
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false
    }
    this.animationFrameId = null
    this.lastTime = 0
    this.lastSpeedIncrement = 0
    this.lastObstacleSpawn = 0
    this.lastOrbSpawn = 0
    this.obstacleSpawnInterval = 1500
    this.nextId = 1

    this.init()
  }

  init(): void {
    this.gameState = {
      running: false,
      paused: false,
      score: 0,
      speed: INITIAL_SPEED,
      lives: INITIAL_LIVES,
      energyCollected: 0,
      boostActive: false,
      boostEndTime: 0,
      invincible: false,
      invincibleEndTime: 0,
      elapsedTime: 0
    }
    this.ship = {
      x: this.canvasWidth / 2 - SHIP_WIDTH / 2,
      y: this.canvasHeight - CANVAS_PADDING - SHIP_HEIGHT - 50,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      velocityX: 0,
      velocityY: 0
    }
    this.obstacles = []
    this.energyOrbs = []
    this.particles = []
    this.lastTime = 0
    this.lastSpeedIncrement = 0
    this.lastObstacleSpawn = 0
    this.lastOrbSpawn = 0
    this.obstacleSpawnInterval = 1500
    this.nextId = 1
    this.initStars()
  }

  private initStars(): void {
    this.stars = []
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 50 + 20
      })
    }
  }

  start(): void {
    if (this.gameState.running) return
    this.gameState.running = true
    this.gameState.paused = false
    this.lastTime = performance.now()
    this.lastSpeedIncrement = this.lastTime
    this.lastObstacleSpawn = this.lastTime
    this.lastOrbSpawn = this.lastTime
    bridge.emit('game:start')
    this.gameLoop(this.lastTime)
  }

  stop(): void {
    this.gameState.running = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    bridge.emit('game:stop')
  }

  pause(): void {
    if (!this.gameState.running || this.gameState.paused) return
    this.gameState.paused = true
    bridge.emit('game:pause')
  }

  resume(): void {
    if (!this.gameState.running || !this.gameState.paused) return
    this.gameState.paused = false
    this.lastTime = performance.now()
    bridge.emit('game:resume')
    this.gameLoop(this.lastTime)
  }

  setInput(input: InputData): void {
    this.input = { ...input }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
    this.initStars()
    if (this.ship.x + this.ship.width > this.canvasWidth - CANVAS_PADDING) {
      this.ship.x = this.canvasWidth - CANVAS_PADDING - this.ship.width
    }
    if (this.ship.y + this.ship.height > this.canvasHeight - CANVAS_PADDING) {
      this.ship.y = this.canvasHeight - CANVAS_PADDING - this.ship.height
    }
  }

  private gameLoop(currentTime: number): void {
    if (!this.gameState.running || this.gameState.paused) return

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1)
    this.lastTime = currentTime

    this.update(deltaTime, currentTime)
    this.emitState()

    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time))
  }

  private update(deltaTime: number, currentTime: number): void {
    this.gameState.elapsedTime += deltaTime * 1000

    if (currentTime - this.lastSpeedIncrement >= SPEED_INTERVAL) {
      if (this.gameState.speed < MAX_SPEED) {
        this.gameState.speed = Math.min(this.gameState.speed + SPEED_INCREMENT, MAX_SPEED)
        this.obstacleSpawnInterval = Math.max(400, 1500 - (this.gameState.speed - INITIAL_SPEED) * 1.5)
        bridge.emit('engine:speed', this.gameState.speed)
      }
      this.lastSpeedIncrement = currentTime
    }

    if (this.gameState.boostActive && currentTime >= this.gameState.boostEndTime) {
      this.gameState.boostActive = false
    }

    if (this.gameState.invincible && currentTime >= this.gameState.invincibleEndTime) {
      this.gameState.invincible = false
    }

    const effectiveSpeed = this.gameState.boostActive
      ? this.gameState.speed * BOOST_MULTIPLIER
      : this.gameState.speed

    this.updateShip(deltaTime)
    this.updateObstacles(deltaTime * effectiveSpeed / 100)
    this.updateOrbs(deltaTime * effectiveSpeed / 100)
    this.updateParticles(deltaTime)
    this.updateStars(deltaTime * effectiveSpeed / 100)

    if (currentTime - this.lastObstacleSpawn >= this.obstacleSpawnInterval) {
      if (this.obstacles.length < MAX_ENTITIES) {
        this.spawnObstacle()
      }
      this.lastObstacleSpawn = currentTime
    }

    if (currentTime - this.lastOrbSpawn >= 3000) {
      if (this.energyOrbs.length < MAX_ENTITIES) {
        this.spawnEnergyOrb()
      }
      this.lastOrbSpawn = currentTime
    }

    this.spawnTrailParticle()
    this.checkCollisions(currentTime)
  }

  private updateShip(deltaTime: number): void {
    const speed = 300
    this.ship.velocityX = 0
    this.ship.velocityY = 0

    if (this.input.left) this.ship.velocityX -= speed
    if (this.input.right) this.ship.velocityX += speed
    if (this.input.up) this.ship.velocityY -= speed
    if (this.input.down) this.ship.velocityY += speed

    this.ship.x += this.ship.velocityX * deltaTime
    this.ship.y += this.ship.velocityY * deltaTime

    this.ship.x = Math.max(CANVAS_PADDING, Math.min(
      this.ship.x,
      this.canvasWidth - CANVAS_PADDING - this.ship.width
    ))
    this.ship.y = Math.max(CANVAS_PADDING, Math.min(
      this.ship.y,
      this.canvasHeight - CANVAS_PADDING - this.ship.height
    ))
  }

  private updateObstacles(deltaTime: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].y += 150 * deltaTime
      if (this.obstacles[i].y > this.canvasHeight + 50) {
        this.obstacles.splice(i, 1)
      }
    }
  }

  private updateOrbs(deltaTime: number): void {
    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      this.energyOrbs[i].y += 100 * deltaTime
      if (this.energyOrbs[i].y > this.canvasHeight + 50) {
        this.energyOrbs.splice(i, 1)
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * deltaTime
      p.y += p.vy * deltaTime
      p.life -= deltaTime
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  private updateStars(deltaTime: number): void {
    for (const star of this.stars) {
      star.y += star.speed * deltaTime
      if (star.y > this.canvasHeight) {
        star.y = 0
        star.x = Math.random() * this.canvasWidth
      }
    }
  }

  private spawnObstacle(): void {
    const width = Math.random() * 40 + 30
    const height = Math.random() * 40 + 30
    const x = Math.random() * (this.canvasWidth - width - CANVAS_PADDING * 2) + CANVAS_PADDING
    const color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)]

    const vertices: number[] = []
    const vertexCount = Math.floor(Math.random() * 3) + 5
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2
      const radiusVariation = Math.random() * 0.3 + 0.7
      const r = (Math.min(width, height) / 2) * radiusVariation
      vertices.push(Math.cos(angle) * r, Math.sin(angle) * r)
    }

    this.obstacles.push({
      id: this.nextId++,
      x,
      y: -height - 10,
      width,
      height,
      color,
      vertices
    })
  }

  private spawnEnergyOrb(): void {
    const x = Math.random() * (this.canvasWidth - ENERGY_RADIUS * 2 - CANVAS_PADDING * 2) + CANVAS_PADDING + ENERGY_RADIUS
    this.energyOrbs.push({
      id: this.nextId++,
      x,
      y: -ENERGY_RADIUS - 10,
      radius: ENERGY_RADIUS,
      collected: false
    })
  }

  private spawnTrailParticle(): void {
    if (this.particles.length >= MAX_ENTITIES * 2) return

    this.particles.push({
      x: this.ship.x + this.ship.width / 2,
      y: this.ship.y + this.ship.height,
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * 50 + 30,
      life: 0.5,
      maxLife: 0.5,
      color: '#00d4ff',
      size: Math.random() * 3 + 2
    })
  }

  private checkCollisions(currentTime: number): void {
    const shipVertices = this.getShipVertices()

    if (!this.gameState.invincible) {
      for (const obstacle of this.obstacles) {
        const obstacleVertices = this.getObstacleVertices(obstacle)
        if (this.checkSATCollision(shipVertices, obstacleVertices)) {
          this.onCollision(currentTime)
          break
        }
      }
    }

    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i]
      if (orb.collected) continue

      if (this.checkCirclePolygonCollision(orb.x, orb.y, orb.radius, shipVertices)) {
        this.onCollect(orb)
        this.energyOrbs.splice(i, 1)
      }
    }
  }

  private getShipVertices(): { x: number; y: number }[] {
    const cx = this.ship.x + this.ship.width / 2
    const cy = this.ship.y + this.ship.height / 2
    return [
      { x: cx, y: this.ship.y },
      { x: this.ship.x, y: this.ship.y + this.ship.height },
      { x: this.ship.x + this.ship.width, y: this.ship.y + this.ship.height }
    ]
  }

  private getObstacleVertices(obstacle: Obstacle): { x: number; y: number }[] {
    const vertices: { x: number; y: number }[] = []
    const cx = obstacle.x + obstacle.width / 2
    const cy = obstacle.y + obstacle.height / 2
    for (let i = 0; i < obstacle.vertices.length; i += 2) {
      vertices.push({
        x: cx + obstacle.vertices[i],
        y: cy + obstacle.vertices[i + 1]
      })
    }
    return vertices
  }

  private getAxes(vertices: { x: number; y: number }[]): { x: number; y: number }[] {
    const axes: { x: number; y: number }[] = []
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i]
      const p2 = vertices[(i + 1) % vertices.length]
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y }
      axes.push({ x: -edge.y, y: edge.x })
    }
    return axes
  }

  private normalize(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.sqrt(v.x * v.x + v.y * v.y)
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len }
  }

  private project(vertices: { x: number; y: number }[], axis: { x: number; y: number }): { min: number; max: number } {
    let min = Infinity
    let max = -Infinity
    for (const v of vertices) {
      const proj = v.x * axis.x + v.y * axis.y
      min = Math.min(min, proj)
      max = Math.max(max, proj)
    }
    return { min, max }
  }

  private overlap(proj1: { min: number; max: number }, proj2: { min: number; max: number }): boolean {
    return proj1.max >= proj2.min && proj2.max >= proj1.min
  }

  private checkSATCollision(
    vertices1: { x: number; y: number }[],
    vertices2: { x: number; y: number }[]
  ): boolean {
    const axes1 = this.getAxes(vertices1).map(a => this.normalize(a))
    const axes2 = this.getAxes(vertices2).map(a => this.normalize(a))
    const allAxes = [...axes1, ...axes2]

    for (const axis of allAxes) {
      if (axis.x === 0 && axis.y === 0) continue
      const proj1 = this.project(vertices1, axis)
      const proj2 = this.project(vertices2, axis)
      if (!this.overlap(proj1, proj2)) {
        return false
      }
    }
    return true
  }

  private checkCirclePolygonCollision(
    cx: number,
    cy: number,
    radius: number,
    polygon: { x: number; y: number }[]
  ): boolean {
    for (let i = 0; i < polygon.length; i++) {
      const v1 = polygon[i]
      const v2 = polygon[(i + 1) % polygon.length]
      const dx = v2.x - v1.x
      const dy = v2.y - v1.y
      const lenSq = dx * dx + dy * dy
      let t = ((cx - v1.x) * dx + (cy - v1.y) * dy) / (lenSq || 1)
      t = Math.max(0, Math.min(1, t))
      const px = v1.x + t * dx
      const py = v1.y + t * dy
      const distSq = (cx - px) * (cx - px) + (cy - py) * (cy - py)
      if (distSq <= radius * radius) {
        return true
      }
    }

    for (const v of polygon) {
      const distSq = (cx - v.x) * (cx - v.x) + (cy - v.y) * (cy - v.y)
      if (distSq <= radius * radius) {
        return true
      }
    }

    return false
  }

  private onCollision(currentTime: number): void {
    this.gameState.lives--
    this.gameState.invincible = true
    this.gameState.invincibleEndTime = currentTime + INVINCIBLE_DURATION

    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.ship.x + this.ship.width / 2,
        y: this.ship.y + this.ship.height / 2,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.8,
        maxLife: 0.8,
        color: '#ff6b6b',
        size: Math.random() * 5 + 3
      })
    }

    bridge.emit('engine:collision', this.gameState.lives)
    bridge.emit('engine:lives', this.gameState.lives)
    bridge.emit('audio:playSFX', 'collision')

    if (this.gameState.lives <= 0) {
      this.gameState.running = false
      bridge.emit('game:over', {
        score: this.gameState.score,
        speed: this.gameState.speed
      })
    }
  }

  private onCollect(orb: EnergyOrb): void {
    orb.collected = true
    this.gameState.score += ENERGY_SCORE
    this.gameState.energyCollected++

    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: orb.x,
        y: orb.y,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 0.5) * 150,
        life: 0.6,
        maxLife: 0.6,
        color: '#48dbfb',
        size: Math.random() * 4 + 2
      })
    }

    bridge.emit('engine:collect', {
      score: this.gameState.score,
      energyCollected: this.gameState.energyCollected
    })
    bridge.emit('engine:score', this.gameState.score)
    bridge.emit('audio:playSFX', 'collect')

    if (this.gameState.energyCollected % ENERGY_BOOST_THRESHOLD === 0) {
      this.gameState.boostActive = true
      this.gameState.boostEndTime = performance.now() + BOOST_DURATION
      bridge.emit('engine:boost', BOOST_DURATION)
      bridge.emit('audio:playSFX', 'boost')
    }
  }

  private emitState(): void {
    bridge.emit('engine:update', this.getRenderData())
  }

  getRenderData(): RenderData {
    return {
      ship: { ...this.ship },
      obstacles: this.obstacles.map(o => ({ ...o })),
      energyOrbs: this.energyOrbs.map(o => ({ ...o })),
      particles: this.particles.map(p => ({ ...p })),
      stars: this.stars.map(s => ({ ...s })),
      gameState: { ...this.gameState }
    }
  }
}

let gameEngineInstance: GameEngine | null = null

export function createGameEngine(width: number, height: number): GameEngine {
  gameEngineInstance = new GameEngine(width, height)
  return gameEngineInstance
}

export function getGameEngine(): GameEngine {
  if (!gameEngineInstance) {
    throw new Error('GameEngine not initialized. Call createGameEngine first.')
  }
  return gameEngineInstance
}

export default GameEngine
