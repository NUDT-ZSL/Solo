import { TrackManager } from './TrackManager'
import { PlayerShip } from './PlayerShip'
import { ParticleManager } from './ParticleManager'
import { useGameStore } from './store'

export class GameEngine {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  trackManager: TrackManager
  playerShip: PlayerShip
  particleManager: ParticleManager

  isRunning: boolean = false
  lastTimestamp: number = 0
  animFrameId: number = 0
  score: number = 0

  private logicalWidth: number = 1200
  private logicalHeight: number = 675
  private scale: number = 1
  private onScoreUpdate: ((score: number) => void) | null = null
  private onEnergyUpdate: ((energy: number) => void) | null = null
  private onBoostChange: ((boosting: boolean) => void) | null = null
  private onGameOver: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.trackManager = new TrackManager()
    this.playerShip = new PlayerShip()
    this.particleManager = new ParticleManager()
    this.resize()
  }

  setCallbacks(callbacks: {
    onScoreUpdate?: (score: number) => void
    onEnergyUpdate?: (energy: number) => void
    onBoostChange?: (boosting: boolean) => void
    onGameOver?: () => void
  }) {
    if (callbacks.onScoreUpdate) this.onScoreUpdate = callbacks.onScoreUpdate
    if (callbacks.onEnergyUpdate) this.onEnergyUpdate = callbacks.onEnergyUpdate
    if (callbacks.onBoostChange) this.onBoostChange = callbacks.onBoostChange
    if (callbacks.onGameOver) this.onGameOver = callbacks.onGameOver
  }

  resize() {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.scale = Math.min(
      rect.width / this.logicalWidth,
      rect.height / this.logicalHeight
    )
    this.ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, 0, 0)
    this.logicalWidth = rect.width / this.scale
    this.logicalHeight = rect.height / this.scale
  }

  start() {
    this.trackManager.init(this.logicalWidth, this.logicalHeight)
    this.playerShip.init(this.logicalWidth, this.logicalHeight)
    this.particleManager = new ParticleManager()
    this.score = 0
    this.isRunning = true
    this.lastTimestamp = performance.now()

    this.onScoreUpdate?.(0)
    this.onEnergyUpdate?.(0)
    this.onBoostChange?.(false)

    this.gameLoop(this.lastTimestamp)
  }

  stop() {
    this.isRunning = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
    }
  }

  restart() {
    this.stop()
    this.start()
  }

  gameLoop = (timestamp: number) => {
    if (!this.isRunning) return

    const rawDt = (timestamp - this.lastTimestamp) / 1000
    const dt = Math.min(rawDt, 0.05)
    this.lastTimestamp = timestamp

    this.update(dt)
    this.render()

    this.animFrameId = requestAnimationFrame(this.gameLoop)
  }

  update(dt: number) {
    const boosting = this.playerShip.isBoosting
    const speedMultiplier = boosting ? 1.8 : 1
    this.trackManager.speed = this.trackManager.baseSpeed * speedMultiplier + this.trackManager.difficulty * 40
    this.trackManager.setScore(this.score)
    this.trackManager.update(dt)
    this.playerShip.update(dt, this.particleManager)
    this.particleManager.emitStars(this.logicalWidth, this.logicalHeight)
    this.particleManager.update(dt)

    if (!boosting) {
      this.checkCollisions()
    } else {
      this.checkCrystalCollection(true)
    }
    this.checkCrystalCollection(false)

    this.score += dt * 10 * speedMultiplier
    this.onScoreUpdate?.(Math.floor(this.score))
    this.onEnergyUpdate?.(this.playerShip.energy)
    if (this.playerShip.isBoosting !== boosting) {
      this.onBoostChange?.(this.playerShip.isBoosting)
    }
  }

  checkCollisions() {
    const shipBounds = this.playerShip.getBounds()
    const obstacles = this.trackManager.getActiveObstacles()

    for (const obs of obstacles) {
      const screenX = obs.x - this.trackManager.scrollX
      const obsBounds = {
        x: screenX - obs.width * 0.5,
        y: obs.screenY - obs.height * 0.5,
        width: obs.width,
        height: obs.height,
      }

      if (this.aabbCollision(shipBounds, obsBounds)) {
        this.gameOver()
        return
      }
    }
  }

  checkCrystalCollection(boosting: boolean) {
    const shipBounds = this.playerShip.getBounds()
    const collectRange = boosting
      ? { x: shipBounds.x - 60, y: shipBounds.y - 40, width: shipBounds.width + 120, height: shipBounds.height + 80 }
      : shipBounds

    const crystals = this.trackManager.getActiveCrystals()
    for (const crystal of crystals) {
      if (crystal.collected) continue
      const screenX = crystal.x - this.trackManager.scrollX
      const crystalBounds = {
        x: screenX - 12,
        y: crystal.screenY - 12,
        width: 24,
        height: 24,
      }

      if (this.aabbCollision(collectRange, crystalBounds)) {
        for (const seg of this.trackManager.segments) {
          for (const c of seg.crystals) {
            if (c.x === crystal.x && c.lane === crystal.lane && c.active && !c.collected) {
              c.collected = true
              c.active = false
              break
            }
          }
        }

        this.particleManager.emitCrystalBurst(screenX, crystal.screenY)
        this.playerShip.addEnergy(1)
        this.score += 50
      }
    }
  }

  aabbCollision(a: { x: number; y: number; width: number; height: number },
                b: { x: number; y: number; width: number; height: number }): boolean {
    const margin = 5
    return a.x + margin < b.x + b.width &&
           a.x + a.width - margin > b.x &&
           a.y + margin < b.y + b.height &&
           a.y + a.height - margin > b.y
  }

  gameOver() {
    this.isRunning = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
    }
    this.onGameOver?.()
  }

  triggerBoost(): boolean {
    if (this.playerShip.triggerBoost()) {
      this.particleManager.emitBoostStart(this.playerShip.x, this.playerShip.y)
      this.onBoostChange?.(true)
      return true
    }
    return false
  }

  moveLeft() { this.playerShip.moveLeft() }
  moveRight() { this.playerShip.moveRight() }
  jump() { this.playerShip.jump() }
  slide() { this.playerShip.slide() }

  render() {
    const ctx = this.ctx
    const w = this.logicalWidth
    const h = this.logicalHeight

    ctx.clearRect(0, 0, w, h)

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, '#0a0a2e')
    bgGrad.addColorStop(0.5, '#1a0a3e')
    bgGrad.addColorStop(1, '#2d1b69')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    if (this.playerShip.isBoosting) {
      ctx.fillStyle = 'rgba(255, 107, 53, 0.05)'
      ctx.fillRect(0, 0, w, h)
    }

    this.particleManager.render(ctx)
    this.trackManager.render(ctx)
    this.playerShip.render(ctx)

    if (this.playerShip.isBoosting) {
      const boostAlpha = 0.1 + Math.sin(performance.now() * 0.005) * 0.05
      ctx.fillStyle = `rgba(255, 107, 53, ${boostAlpha})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  renderMenu() {
    const ctx = this.ctx
    const w = this.logicalWidth
    const h = this.logicalHeight

    ctx.clearRect(0, 0, w, h)

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, '#0a0a2e')
    bgGrad.addColorStop(0.5, '#1a0a3e')
    bgGrad.addColorStop(1, '#2d1b69')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    this.particleManager.update(0.016)
    this.particleManager.emitStars(w, h)
    this.particleManager.render(ctx)
  }

  destroy() {
    this.stop()
  }
}
