import * as THREE from 'three'

export interface NeuronOptions {
  position: THREE.Vector3
  hue: number
  saturation: number
  lightness: number
  radius?: number
}

export class Neuron {
  public readonly id: number
  public readonly position: THREE.Vector3
  public readonly mesh: THREE.Mesh
  public readonly glowSprite: THREE.Sprite
  public readonly baseColor: THREE.Color
  public readonly currentColor: THREE.Color
  public readonly neighbors: Set<Neuron> = new Set()

  public baseBrightness: number = 1.0
  public currentBrightness: number = 1.0
  public targetBrightness: number = 1.0

  public colorBlendFactor: number = 0

  private nextFlickerTime: number = 0
  private flickerInterval: number = 0.3

  public stormBoostEndTime: number = 0
  public stormBoostActive: boolean = false

  public autoFlashEndTime: number = 0
  public autoFlashActive: boolean = false

  private static idCounter = 0

  constructor(options: NeuronOptions) {
    this.id = Neuron.idCounter++
    this.position = options.position.clone()
    this.baseColor = new THREE.Color().setHSL(options.hue / 360, options.saturation, options.lightness)
    this.currentColor = this.baseColor.clone()

    const radius = options.radius ?? 0.3

    const geometry = new THREE.SphereGeometry(radius, 16, 12)
    const material = new THREE.MeshBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: 1.0
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.copy(this.position)
    ;(this.mesh as any).neuronRef = this

    this.glowSprite = this.createGlowSprite(radius)
    this.glowSprite.position.copy(this.position)

    this.scheduleNextFlicker()
  }

  private createGlowSprite(radius: number): THREE.Sprite {
    const size = radius * 8
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    const r = Math.floor(this.baseColor.r * 255)
    const g = Math.floor(this.baseColor.g * 255)
    const b = Math.floor(this.baseColor.b * 255)
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.6)`)
    gradient.addColorStop(0.3, `rgba(${r},${g},${b},0.25)`)
    gradient.addColorStop(0.7, `rgba(${r},${g},${b},0.08)`)
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(size, size, 1)
    return sprite
  }

  private scheduleNextFlicker(): void {
    this.flickerInterval = 0.1 + Math.random() * 0.4
    this.nextFlickerTime = performance.now() + this.flickerInterval * 1000
    this.targetBrightness = 0.5 + Math.random() * 1.0
  }

  public update(currentTime: number, deltaTime: number): void {
    if (currentTime >= this.nextFlickerTime) {
      this.scheduleNextFlicker()
    }

    let effectiveTarget = this.targetBrightness * this.baseBrightness

    if (this.stormBoostActive) {
      if (currentTime >= this.stormBoostEndTime) {
        this.stormBoostActive = false
      } else {
        const elapsed = (this.stormBoostEndTime - currentTime) / 200
        effectiveTarget = this.baseBrightness * (1.5 + 0.5 * Math.max(0, elapsed))
      }
    }

    if (this.autoFlashActive) {
      if (currentTime >= this.autoFlashEndTime) {
        this.autoFlashActive = false
      } else {
        effectiveTarget = this.baseBrightness * 1.2
      }
    }

    this.currentBrightness += (effectiveTarget - this.currentBrightness) * Math.min(1, deltaTime * 12)
    this.currentBrightness = Math.max(0.3, this.currentBrightness)

    this.colorBlendFactor = Math.max(0, this.colorBlendFactor - deltaTime * 1.5)

    this.applyColorAndBrightness()
  }

  private applyColorAndBrightness(): void {
    const electricBlue = new THREE.Color(0x00ffff)
    const finalColor = this.baseColor.clone().lerp(electricBlue, this.colorBlendFactor)

    const b = this.currentBrightness
    finalColor.r = Math.min(1, finalColor.r * b)
    finalColor.g = Math.min(1, finalColor.g * b)
    finalColor.b = Math.min(1, finalColor.b * b)

    const mat = this.mesh.material as THREE.MeshBasicMaterial
    mat.color.copy(finalColor)
    this.currentColor.copy(finalColor)

    const glowMat = this.glowSprite.material as THREE.SpriteMaterial
    glowMat.color.copy(finalColor)
    glowMat.opacity = 0.5 + 0.4 * Math.min(1, this.currentBrightness / 1.5)
  }

  public triggerStormBoost(durationMs: number = 200): void {
    this.stormBoostActive = true
    this.stormBoostEndTime = performance.now() + durationMs
    this.colorBlendFactor = 1.0
  }

  public triggerAutoFlash(durationMs: number = 80): void {
    this.autoFlashActive = true
    this.autoFlashEndTime = performance.now() + durationMs
  }

  public setColorBlend(factor: number): void {
    this.colorBlendFactor = Math.max(0, Math.min(1, factor))
  }

  public addNeighbor(neuron: Neuron): void {
    if (neuron !== this) {
      this.neighbors.add(neuron)
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    const glowMat = this.glowSprite.material as THREE.SpriteMaterial
    if (glowMat.map) glowMat.map.dispose()
    glowMat.dispose()
  }
}
