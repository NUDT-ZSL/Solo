import { Vector2, LevelConfig, LevelManager } from './LevelManager'
import { SoundWave } from './InteractiveObject'

export interface PlayerState {
  position: Vector2
  velocity: Vector2
  isHidden: boolean
  visibility: number
  moveSpeed: number
  baseSpeed: number
  isSprinting: boolean
  sprintCooldown: number
  sprintDuration: number
  maxSprintDuration: number
  maxSprintCooldown: number
  trail: TrailParticle[]
  interactionRange: number
  isMoving: boolean
  moveDirection: number
}

export interface TrailParticle {
  x: number
  y: number
  alpha: number
  size: number
  life: number
  maxLife: number
}

export interface LightSourceState {
  position: Vector2
  radius: number
  intensity: number
  isLit: boolean
  flickerTimer: number
}

export class StealthManager {
  private player: PlayerState
  private levelManager: LevelManager
  private lightSources: LightSourceState[] = []
  private activeSoundWaves: SoundWave[] = []
  private shadowBuffer: number = 0

  constructor(levelManager: LevelManager) {
    this.levelManager = levelManager
    const level = levelManager.getCurrentLevel()
    this.player = this.createPlayer(level)
    this.initLightSources(level)
  }

  private createPlayer(level: LevelConfig): PlayerState {
    return {
      position: { ...level.playerStart },
      velocity: { x: 0, y: 0 },
      isHidden: true,
      visibility: 0.3,
      moveSpeed: 3,
      baseSpeed: 3,
      isSprinting: false,
      sprintCooldown: 0,
      sprintDuration: 0,
      maxSprintDuration: 1.5,
      maxSprintCooldown: 4,
      trail: [],
      interactionRange: 1.8,
      isMoving: false,
      moveDirection: 0,
    }
  }

  private initLightSources(level: LevelConfig): void {
    this.lightSources = level.lightSources.map(pos => ({
      position: { ...pos },
      radius: 4,
      intensity: 1,
      isLit: true,
      flickerTimer: Math.random() * Math.PI * 2,
    }))
  }

  update(dt: number, input: { w: boolean; a: boolean; s: boolean; d: boolean; space: boolean }): void {
    this.updatePlayerMovement(dt, input)
    this.updateSprint(dt, input.space)
    this.updateStealthState()
    this.updateTrail(dt)
    this.updateLightSources(dt)
    this.updateSoundWaves(dt)
  }

  private updatePlayerMovement(dt: number, input: { w: boolean; a: boolean; s: boolean; d: boolean }): void {
    const level = this.levelManager.getCurrentLevel()
    let dx = 0
    let dy = 0

    if (input.w) dy -= 1
    if (input.s) dy += 1
    if (input.a) dx -= 1
    if (input.d) dx += 1

    this.player.isMoving = dx !== 0 || dy !== 0

    if (this.player.isMoving) {
      const len = Math.sqrt(dx * dx + dy * dy)
      dx /= len
      dy /= len
      this.player.moveDirection = Math.atan2(dy, dx)

      const speed = this.player.moveSpeed * (this.player.isHidden ? 0.7 : 1.0)
      const newX = this.player.position.x + dx * speed * dt
      const newY = this.player.position.y + dy * speed * dt

      if (this.levelManager.isTileWalkable(Math.round(newX), Math.round(this.player.position.y), level)) {
        this.player.position.x = newX
      }
      if (this.levelManager.isTileWalkable(Math.round(this.player.position.x), Math.round(newY), level)) {
        this.player.position.y = newY
      }
    }

    this.player.velocity.x = dx * this.player.moveSpeed
    this.player.velocity.y = dy * this.player.moveSpeed
  }

  private updateSprint(dt: number, spacePressed: boolean): void {
    if (this.player.sprintCooldown > 0) {
      this.player.sprintCooldown -= dt
      if (this.player.sprintCooldown <= 0) {
        this.player.sprintCooldown = 0
      }
    }

    if (spacePressed && this.player.sprintCooldown <= 0 && this.player.sprintDuration < this.player.maxSprintDuration) {
      this.player.isSprinting = true
      this.player.sprintDuration += dt
      this.player.moveSpeed = this.player.baseSpeed * 2

      if (this.player.sprintDuration >= this.player.maxSprintDuration) {
        this.player.isSprinting = false
        this.player.sprintCooldown = this.player.maxSprintCooldown
        this.player.sprintDuration = 0
        this.player.moveSpeed = this.player.baseSpeed
      }
    } else {
      if (this.player.isSprinting && !spacePressed) {
        this.player.isSprinting = false
        if (this.player.sprintDuration > 0.3) {
          this.player.sprintCooldown = this.player.maxSprintCooldown * 0.5
        }
        this.player.sprintDuration = 0
      }
      if (!this.player.isSprinting) {
        this.player.moveSpeed = this.player.baseSpeed
      }
    }
  }

  private updateStealthState(): void {
    const level = this.levelManager.getCurrentLevel()
    const px = Math.round(this.player.position.x)
    const py = Math.round(this.player.position.y)

    let inShadow = this.levelManager.isTileShadow(px, py, level)
    let nearLight = false
    let lightIntensity = 0

    for (const light of this.lightSources) {
      if (!light.isLit) continue
      const dx = this.player.position.x - light.position.x
      const dy = this.player.position.y - light.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < light.radius) {
        nearLight = true
        lightIntensity = Math.max(lightIntensity, (1 - dist / light.radius) * light.intensity)
      }
    }

    if (nearLight && !inShadow) {
      inShadow = false
    } else if (nearLight && inShadow) {
      lightIntensity *= 0.3
      if (lightIntensity < 0.5) {
        inShadow = true
      } else {
        inShadow = false
      }
    }

    const wasHidden = this.player.isHidden
    this.player.isHidden = inShadow

    if (inShadow) {
      this.shadowBuffer = Math.min(1, this.shadowBuffer + 0.03)
      this.player.visibility = 0.15 + (1 - this.shadowBuffer) * 0.55
    } else {
      this.shadowBuffer = Math.max(0, this.shadowBuffer - 0.05)
      this.player.visibility = 0.5 + lightIntensity * 0.5 + (1 - this.shadowBuffer) * 0.2
    }

    this.player.visibility = Math.max(0.1, Math.min(1.0, this.player.visibility))

    if (!wasHidden && this.player.isHidden) {
      this.playStealthSound()
    }
  }

  private playStealthSound(): void {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 120
      gain.gain.value = 0.06
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (_) {}
  }

  private updateTrail(dt: number): void {
    if (this.player.isMoving && this.player.isHidden) {
      this.player.trail.push({
        x: this.player.position.x + (Math.random() - 0.5) * 0.2,
        y: this.player.position.y + (Math.random() - 0.5) * 0.2,
        alpha: 0.4,
        size: 3 + Math.random() * 2,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      })
    }

    if (this.player.isSprinting) {
      for (let i = 0; i < 2; i++) {
        this.player.trail.push({
          x: this.player.position.x + (Math.random() - 0.5) * 0.3,
          y: this.player.position.y + (Math.random() - 0.5) * 0.3,
          alpha: 0.6,
          size: 2 + Math.random() * 3,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.2,
        })
      }
    }

    for (let i = this.player.trail.length - 1; i >= 0; i--) {
      const p = this.player.trail[i]
      p.life += dt
      p.alpha = 0.4 * (1 - p.life / p.maxLife)
      if (p.life >= p.maxLife) {
        this.player.trail.splice(i, 1)
      }
    }
  }

  private updateLightSources(dt: number): void {
    for (const light of this.lightSources) {
      if (light.isLit) {
        light.flickerTimer += dt * 5
        light.intensity = 0.85 + Math.sin(light.flickerTimer) * 0.1 + Math.sin(light.flickerTimer * 2.3) * 0.05
      }
    }
  }

  private updateSoundWaves(dt: number): void {
    for (let i = this.activeSoundWaves.length - 1; i >= 0; i--) {
      const wave = this.activeSoundWaves[i]
      wave.radius += wave.speed * dt
      wave.alpha = 1 - wave.radius / wave.maxRadius
      if (wave.radius >= wave.maxRadius) {
        this.activeSoundWaves.splice(i, 1)
      }
    }
  }

  addSoundWave(wave: SoundWave): void {
    this.activeSoundWaves.push({ ...wave })
  }

  toggleLightAt(pos: Vector2, lit: boolean): void {
    for (const light of this.lightSources) {
      const dx = Math.abs(light.position.x - pos.x)
      const dy = Math.abs(light.position.y - pos.y)
      if (dx <= 1 && dy <= 1) {
        light.isLit = lit
        break
      }
    }
  }

  getPlayerState(): PlayerState {
    return this.player
  }

  getLightSources(): LightSourceState[] {
    return this.lightSources
  }

  getActiveSoundWaves(): SoundWave[] {
    return this.activeSoundWaves
  }

  isPlayerVisibleToGuards(): boolean {
    return !this.player.isHidden || this.player.isSprinting
  }

  getPlayerNoiseLevel(): number {
    if (this.player.isSprinting) return 1.0
    if (this.player.isMoving && !this.player.isHidden) return 0.5
    if (this.player.isMoving && this.player.isHidden) return 0.1
    return 0
  }

  getSprintProgress(): number {
    if (this.player.isSprinting) {
      return 1 - this.player.sprintDuration / this.player.maxSprintDuration
    }
    if (this.player.sprintCooldown > 0) {
      return this.player.sprintCooldown / this.player.maxSprintCooldown
    }
    return 1
  }

  isSprintReady(): boolean {
    return this.player.sprintCooldown <= 0 && !this.player.isSprinting
  }

  reset(level: LevelConfig): void {
    this.player = this.createPlayer(level)
    this.initLightSources(level)
    this.activeSoundWaves = []
    this.shadowBuffer = 0
  }
}
