import { InteractiveObjectConfig, Vector2 } from './LevelManager'

export interface SoundWave {
  origin: Vector2
  radius: number
  maxRadius: number
  speed: number
  alpha: number
  sourceId: string
}

export interface InteractiveObjectState {
  config: InteractiveObjectConfig
  isActivated: boolean
  cooldownTimer: number
  soundWave: SoundWave | null
  candleLit: boolean
  animationTimer: number
}

export class InteractiveObject {
  private objects: InteractiveObjectState[] = []
  private onSoundEmitted: ((wave: SoundWave) => void) | null = null
  private onLightToggle: ((pos: Vector2, lit: boolean) => void) | null = null

  constructor(configs: InteractiveObjectConfig[]) {
    this.objects = configs.map(config => ({
      config,
      isActivated: false,
      cooldownTimer: 0,
      soundWave: null,
      candleLit: config.type === 'candle',
      animationTimer: 0,
    }))
  }

  setCallbacks(
    onSound: (wave: SoundWave) => void,
    onLight: (pos: Vector2, lit: boolean) => void
  ): void {
    this.onSoundEmitted = onSound
    this.onLightToggle = onLight
  }

  update(dt: number): void {
    for (const obj of this.objects) {
      if (obj.cooldownTimer > 0) {
        obj.cooldownTimer -= dt
        if (obj.cooldownTimer <= 0) {
          obj.cooldownTimer = 0
          if (obj.config.type === 'candle') {
            obj.candleLit = true
            if (this.onLightToggle) {
              this.onLightToggle(obj.config.position, true)
            }
          }
        }
      }

      if (obj.soundWave) {
        obj.soundWave.radius += obj.soundWave.speed * dt
        obj.soundWave.alpha = 1 - obj.soundWave.radius / obj.soundWave.maxRadius
        if (obj.soundWave.radius >= obj.soundWave.maxRadius) {
          obj.soundWave = null
        }
      }

      obj.animationTimer += dt
    }
  }

  tryActivate(playerPos: Vector2, interactionRange: number): InteractiveObjectState | null {
    for (const obj of this.objects) {
      if (obj.cooldownTimer > 0 && obj.config.type === 'candle') continue
      if (obj.config.type !== 'candle' && obj.isActivated) continue

      const dx = playerPos.x - obj.config.position.x
      const dy = playerPos.y - obj.config.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= interactionRange) {
        this.activateObject(obj)
        return obj
      }
    }
    return null
  }

  private activateObject(obj: InteractiveObjectState): void {
    switch (obj.config.type) {
      case 'candle':
        this.activateCandle(obj)
        break
      case 'rope':
        this.activateRope(obj)
        break
      case 'bell':
        this.activateBell(obj)
        break
      case 'vase':
        this.activateVase(obj)
        break
    }
  }

  private activateCandle(obj: InteractiveObjectState): void {
    obj.candleLit = !obj.candleLit
    obj.cooldownTimer = 3
    obj.animationTimer = 0
    if (this.onLightToggle) {
      this.onLightToggle(obj.config.position, obj.candleLit)
    }
  }

  private activateRope(obj: InteractiveObjectState): void {
    obj.isActivated = true
    obj.cooldownTimer = obj.config.distractionDuration
    obj.animationTimer = 0

    const wave: SoundWave = {
      origin: { ...obj.config.position },
      radius: 0,
      maxRadius: obj.config.soundRadius,
      speed: 4,
      alpha: 1,
      sourceId: obj.config.id,
    }
    obj.soundWave = wave
    if (this.onSoundEmitted) {
      this.onSoundEmitted(wave)
    }

    setTimeout(() => {
      obj.isActivated = false
    }, obj.config.distractionDuration * 1000)
  }

  private activateBell(obj: InteractiveObjectState): void {
    obj.isActivated = true
    obj.cooldownTimer = obj.config.distractionDuration
    obj.animationTimer = 0

    const wave: SoundWave = {
      origin: { ...obj.config.position },
      radius: 0,
      maxRadius: obj.config.soundRadius,
      speed: 3.5,
      alpha: 1,
      sourceId: obj.config.id,
    }
    obj.soundWave = wave
    if (this.onSoundEmitted) {
      this.onSoundEmitted(wave)
    }

    setTimeout(() => {
      obj.isActivated = false
    }, obj.config.distractionDuration * 1000)
  }

  private activateVase(obj: InteractiveObjectState): void {
    obj.isActivated = true
    obj.cooldownTimer = obj.config.distractionDuration
    obj.animationTimer = 0

    const wave: SoundWave = {
      origin: { ...obj.config.position },
      radius: 0,
      maxRadius: obj.config.soundRadius,
      speed: 5,
      alpha: 1,
      sourceId: obj.config.id,
    }
    obj.soundWave = wave
    if (this.onSoundEmitted) {
      this.onSoundEmitted(wave)
    }

    setTimeout(() => {
      obj.isActivated = false
    }, obj.config.distractionDuration * 1000)
  }

  getObjects(): InteractiveObjectState[] {
    return this.objects
  }

  getNearbyInteractable(playerPos: Vector2, range: number): InteractiveObjectState | null {
    let closest: InteractiveObjectState | null = null
    let closestDist = Infinity

    for (const obj of this.objects) {
      if (obj.config.type === 'candle' && obj.cooldownTimer > 0) continue
      if (obj.config.type !== 'candle' && obj.isActivated) continue

      const dx = playerPos.x - obj.config.position.x
      const dy = playerPos.y - obj.config.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= range && dist < closestDist) {
        closest = obj
        closestDist = dist
      }
    }
    return closest
  }

  getObjectLabel(obj: InteractiveObjectState): string {
    switch (obj.config.type) {
      case 'candle': return obj.candleLit ? '熄灭烛台 [E]' : '点燃烛台 [E]'
      case 'rope': return '拉动绳索 [E]'
      case 'bell': return '敲响铃铛 [E]'
      case 'vase': return '推倒花瓶 [E]'
    }
  }

  reset(configs: InteractiveObjectConfig[]): void {
    this.objects = configs.map(config => ({
      config,
      isActivated: false,
      cooldownTimer: 0,
      soundWave: null,
      candleLit: config.type === 'candle',
      animationTimer: 0,
    }))
  }
}
