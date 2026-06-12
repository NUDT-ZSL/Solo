import { PhysicsEngine } from './physicsEngine'
import { CollisionDetector } from './collisionDetector'
import { GameRenderer } from './renderer'
import { LayoutGenerator } from './layoutGenerator'
import {
  GameState,
  Star,
  Asteroid,
  TrailPoint,
  TargetRing,
  DEFAULT_PHYSICS_CONFIG,
} from './types'

export interface GameEngineCallbacks {
  onScoreChange?: (score: number) => void
  onFuelChange?: (fuel: number) => void
  onGameOver?: (score: number, seed: string) => void
  onSpeedChange?: (speed: number) => void
  onFPSUpdate?: (fps: number) => void
}

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private physicsEngine: PhysicsEngine
  private collisionDetector: CollisionDetector
  private renderer: GameRenderer
  private layoutGenerator: LayoutGenerator

  private state: GameState
  private animationId: number | null = null
  private lastTime: number = 0
  private fpsFrames: number = 0
  private fpsLastTime: number = 0
  private callbacks: GameEngineCallbacks
  private initialVx: number = 2
  private initialVy: number = 1

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    this.ctx = ctx

    this.physicsEngine = new PhysicsEngine()
    this.collisionDetector = new CollisionDetector()
    this.renderer = new GameRenderer(ctx, canvas.width, canvas.height)
    this.layoutGenerator = new LayoutGenerator()
    this.callbacks = callbacks

    this.state = this.createInitialState()
  }

  private createInitialState(): GameState {
    const stars = this.layoutGenerator.generateStars(this.canvas.width, this.canvas.height, 4)
    const targets = this.layoutGenerator.generateTargets(
      this.canvas.width,
      this.canvas.height,
      stars,
      3
    )

    return {
      stars,
      targets,
      asteroid: this.createInitialAsteroid(),
      trails: [],
      fuel: 100,
      score: 0,
      isGameOver: false,
      isLaunched: false,
      fps: 60,
      speed: 0,
      showScorePopup: false,
      scorePopupTime: 0,
      layoutSeed: this.layoutGenerator.getSeedString(),
    }
  }

  private createInitialAsteroid(): Asteroid {
    return {
      x: 50,
      y: 50,
      vx: 0,
      vy: 0,
      radius: 5,
      isLaunched: false,
      isDead: false,
    }
  }

  public setInitialVelocity(vx: number, vy: number): void {
    this.initialVx = vx
    this.initialVy = vy
  }

  public launch(): void {
    if (this.state.isLaunched || this.state.isGameOver) return

    this.state.asteroid = {
      ...this.state.asteroid,
      vx: this.initialVx,
      vy: this.initialVy,
      isLaunched: true,
    }
    this.state.isLaunched = true
    this.state.trails = [
      { x: this.state.asteroid.x, y: this.state.asteroid.y, alpha: 0.8 },
    ]
  }

  public reset(): void {
    this.stop()
    this.layoutGenerator = new LayoutGenerator()
    this.state = this.createInitialState()
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onFuelChange?.(100)
    this.callbacks.onSpeedChange?.(0)
    this.render(0)
  }

  public start(): void {
    if (this.animationId !== null) return
    this.lastTime = performance.now()
    this.fpsLastTime = this.lastTime
    this.fpsFrames = 0
    this.loop(this.lastTime)
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private loop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05)
    this.lastTime = currentTime

    this.fpsFrames++
    if (currentTime - this.fpsLastTime >= 1000) {
      const fps = Math.round(this.fpsFrames * 1000 / (currentTime - this.fpsLastTime))
      this.state.fps = fps
      this.callbacks.onFPSUpdate?.(fps)
      this.fpsFrames = 0
      this.fpsLastTime = currentTime
    }

    this.update(deltaTime, currentTime)
    this.render(currentTime)

    this.animationId = requestAnimationFrame(this.loop)
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.state.isGameOver) return

    if (this.state.isLaunched && !this.state.asteroid.isDead) {
      this.state.asteroid = this.physicsEngine.updateAsteroid(
        this.state.asteroid,
        this.state.stars,
        deltaTime
      )

      this.state.fuel = this.physicsEngine.consumeFuel(this.state.fuel, deltaTime)
      this.callbacks.onFuelChange?.(this.state.fuel)

      const speed = this.physicsEngine.getSpeed(this.state.asteroid)
      this.state.speed = speed
      this.callbacks.onSpeedChange?.(speed)

      if (this.state.trails.length > 0) {
        const lastTrail = this.state.trails[this.state.trails.length - 1]
        const dx = this.state.asteroid.x - lastTrail.x
        const dy = this.state.asteroid.y - lastTrail.y
        if (dx * dx + dy * dy > 1) {
          this.addTrailPoint(this.state.asteroid.x, this.state.asteroid.y)
        }
      }

      const collision = this.collisionDetector.checkTargetCollision(
        this.state.asteroid,
        this.state.targets
      )
      if (collision.hit && collision.targetId) {
        this.hitTarget(collision.targetId, currentTime)
      }

      if (this.physicsEngine.checkStarCollision(this.state.asteroid, this.state.stars)) {
        this.endGame()
      }

      if (
        this.physicsEngine.checkOutOfBounds(
          this.state.asteroid,
          this.canvas.width,
          this.canvas.height,
          50
        )
      ) {
        this.endGame()
      }

      if (this.state.fuel <= 0) {
        this.state.asteroid.isDead = true
        this.endGame()
      }
    }

    this.updateTargetRipples(deltaTime, currentTime)
  }

  private addTrailPoint(x: number, y: number): void {
    const trailLength = DEFAULT_PHYSICS_CONFIG.trailLength
    this.state.trails.push({ x, y, alpha: 0.8 })

    if (this.state.trails.length > trailLength) {
      this.state.trails.shift()
    }

    const count = this.state.trails.length
    for (let i = 0; i < count; i++) {
      this.state.trails[i].alpha = 0.8 * (i / (count - 1))
    }
  }

  private hitTarget(targetId: string, currentTime: number): void {
    const target = this.state.targets.find((t) => t.id === targetId)
    if (target && !target.isHit) {
      target.isHit = true
      target.hitTime = currentTime
      target.rippleRadius = target.radius
      target.rippleAlpha = 0.6

      this.state.score += 1
      this.callbacks.onScoreChange?.(this.state.score)

      this.state.showScorePopup = true
      this.state.scorePopupTime = currentTime
    }
  }

  private updateTargetRipples(deltaTime: number, currentTime: number): void {
    for (const target of this.state.targets) {
      if (target.isHit && target.rippleAlpha > 0) {
        const elapsed = currentTime - target.hitTime
        const duration = 500
        if (elapsed < duration) {
          const progress = elapsed / duration
          target.rippleRadius = 30 + 50 * progress
          target.rippleAlpha = 0.6 * (1 - progress)
        } else {
          target.rippleAlpha = 0
        }
      }
    }
  }

  private endGame(): void {
    if (this.state.isGameOver) return
    this.state.isGameOver = true
    this.state.asteroid.isDead = true
    this.callbacks.onGameOver?.(this.state.score, this.state.layoutSeed)
  }

  private render(time: number): void {
    this.render