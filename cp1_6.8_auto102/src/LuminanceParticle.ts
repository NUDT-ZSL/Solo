import * as THREE from 'three'

const AURORA_COLORS = [
  new THREE.Color(0x00ffc8),
  new THREE.Color(0xff6eff),
  new THREE.Color(0xffe066),
]

export interface ParticleData {
  position: THREE.Vector3
  baseY: number
  ribbonIndex: number
  offset: number
  phase: number
  life: number
  maxLife: number
  size: number
  baseSize: number
  flickerTimer: number
  flickerIntensity: number
}

export class LuminanceParticle {
  data: ParticleData

  constructor(ribbonIndex: number, offset: number, y: number) {
    this.data = {
      position: new THREE.Vector3(offset, y, 0),
      baseY: y,
      ribbonIndex,
      offset,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 3 + Math.random() * 4,
      size: 0,
      baseSize: 0.3 + Math.random() * 0.7,
      flickerTimer: 0,
      flickerIntensity: 0,
    }
  }

  getColor(t: number): THREE.Color {
    const idx = this.data.ribbonIndex % AURORA_COLORS.length
    const next = (idx + 1) % AURORA_COLORS.length
    const localT = (t + this.data.phase * 0.1) % 1
    return new THREE.Color().lerpColors(AURORA_COLORS[idx], AURORA_COLORS[next], localT)
  }

  update(delta: number, amplitude: number, locked: boolean): void {
    if (locked) {
      this.data.flickerTimer = Math.max(0, this.data.flickerTimer - delta)
      this.data.size = this.data.baseSize * (1 + this.data.flickerIntensity * (this.data.flickerTimer > 0 ? 1 : 0))
      return
    }

    this.data.life += delta
    if (this.data.life >= this.data.maxLife) {
      this.data.life = 0
      this.data.maxLife = 3 + Math.random() * 4
      this.data.phase = Math.random() * Math.PI * 2
    }

    const breathScale = 1 + 0.15 * Math.sin(this.data.life * 2 + this.data.phase)
    this.data.size = this.data.baseSize * breathScale

    const wave = amplitude * Math.sin(this.data.offset * 0.3 + this.data.life * 0.5 + this.data.phase)
    this.data.position.y = this.data.baseY + wave

    this.data.flickerTimer = Math.max(0, this.data.flickerTimer - delta)
    if (this.data.flickerTimer > 0) {
      this.data.size *= 1 + this.data.flickerIntensity * (this.data.flickerTimer / 0.5)
    }
  }

  triggerFlicker(): void {
    this.data.flickerTimer = 0.5
    this.data.flickerIntensity = 1.5
  }

  getOpacity(): number {
    const fadeIn = 0.5
    const fadeOut = 0.8
    const life = this.data.life
    const max = this.data.maxLife

    if (life < fadeIn) return life / fadeIn
    if (life > max - fadeOut) return (max - life) / fadeOut
    return 1
  }
}
