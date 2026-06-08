import { StoneConfig, StoneState, Particle, TerrainRegion } from './types'

export class StoneManager {
  private stones: StoneState[] = []
  private particles: Particle[] = []
  private terrainRegions: TerrainRegion[] = []
  private maxParticles: number = 100
  private audioContext: AudioContext | null = null
  private altarRadius: number = 150
  private stoneRadius: number = 30
  private centerX: number = 0
  private centerY: number = 0

  initStones(stoneConfigs: StoneConfig[], centerX: number, centerY: number, altarRadius: number): void {
    this.centerX = centerX
    this.centerY = centerY
    this.altarRadius = altarRadius
    this.stones = stoneConfigs.map((config) => ({
      config,
      activated: false,
      glowIntensity: 0,
      pulseRadius: 0,
      pulseAlpha: 0,
      runePhase: Math.random() * Math.PI * 2,
      hitAnimation: 0,
      failAnimation: 0,
      terrainHeight: 0,
      targetTerrainHeight: 0,
    }))

    this.terrainRegions = stoneConfigs.map((config, i) => {
      const angle = (config.angle * Math.PI) / 180
      const dist = altarRadius + 80
      return {
        x: centerX + Math.cos(angle) * dist - 30,
        y: centerY + Math.sin(angle) * dist - 30,
        width: 60,
        height: 60,
        elevation: 0,
        targetElevation: 0,
        color: config.color,
      }
    })

    this.particles = []
  }

  activateStone(index: number): boolean {
    if (index < 0 || index >= this.stones.length) return false
    const stone = this.stones[index]
    if (stone.activated) return false

    stone.activated = true
    stone.glowIntensity = 1.0
    stone.pulseRadius = 0
    stone.pulseAlpha = 1.0
    stone.hitAnimation = 1.0
    stone.targetTerrainHeight = 30

    if (this.terrainRegions[index]) {
      this.terrainRegions[index].targetElevation = 1
    }

    this.spawnActivationParticles(index)
    this.playStoneSound(index)

    return true
  }

  failStone(index: number): void {
    if (index < 0 || index >= this.stones.length) return
    this.stones[index].failAnimation = 1.0
  }

  resetStone(index: number): void {
    if (index < 0 || index >= this.stones.length) return
    const stone = this.stones[index]
    stone.activated = false
    stone.glowIntensity = 0
    stone.pulseRadius = 0
    stone.pulseAlpha = 0
    stone.hitAnimation = 0
    stone.failAnimation = 0
    stone.terrainHeight = 0
    stone.targetTerrainHeight = 0

    if (this.terrainRegions[index]) {
      this.terrainRegions[index].targetElevation = 0
    }
  }

  resetAllStones(): void {
    for (let i = 0; i < this.stones.length; i++) {
      this.resetStone(i)
    }
    this.particles = []
  }

  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx
  }

  private playStoneSound(index: number): void {
    if (!this.audioContext) return
    const freq = this.stones[index].config.frequency
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.connect(gain)
    gain.connect(this.audioContext.destination)

    osc.frequency.value = freq
    osc.type = 'triangle'
    gain.gain.value = 0.3
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5)

    osc.start(this.audioContext.currentTime)
    osc.stop(this.audioContext.currentTime + 0.5)
  }

  playFailSound(): void {
    if (!this.audioContext) return
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.connect(gain)
    gain.connect(this.audioContext.destination)

    osc.frequency.value = 100
    osc.type = 'sawtooth'
    gain.gain.value = 0.15
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2)

    osc.start(this.audioContext.currentTime)
    osc.stop(this.audioContext.currentTime + 0.2)
  }

  playHornSound(): void {
    if (!this.audioContext) return
    const osc1 = this.audioContext.createOscillator()
    const osc2 = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.audioContext.destination)

    osc1.frequency.value = 80
    osc1.type = 'sawtooth'
    osc2.frequency.value = 120
    osc2.type = 'sawtooth'
    filter.type = 'lowpass'
    filter.frequency.value = 400
    gain.gain.value = 0.2
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1.5)

    const now = this.audioContext.currentTime
    osc1.start(now)
    osc1.stop(now + 1.5)
    osc2.start(now)
    osc2.stop(now + 1.5)
  }

  private spawnActivationParticles(index: number): void {
    const stone = this.stones[index]
    const angle = (stone.config.angle * Math.PI) / 180
    const sx = this.centerX + Math.cos(angle) * this.altarRadius
    const sy = this.centerY + Math.sin(angle) * this.altarRadius

    for (let i = 0; i < 20; i++) {
      const pAngle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(pAngle) * speed,
        vy: Math.sin(pAngle) * speed,
        life: 1.0,
        maxLife: 0.5 + Math.random() * 0.5,
        color: stone.config.glowColor,
        size: 2 + Math.random() * 4,
      })
    }

    while (this.particles.length > this.maxParticles) {
      this.particles.shift()
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000

    for (const stone of this.stones) {
      stone.runePhase += dt * 2

      if (stone.glowIntensity > 0) {
        stone.glowIntensity = Math.max(0, stone.glowIntensity - dt * 0.5)
        if (stone.activated && stone.glowIntensity < 0.3) {
          stone.glowIntensity = 0.3
        }
      }

      if (stone.pulseAlpha > 0) {
        stone.pulseRadius += dt * 200
        stone.pulseAlpha = Math.max(0, stone.pulseAlpha - dt * 1.5)
      }

      if (stone.hitAnimation > 0) {
        stone.hitAnimation = Math.max(0, stone.hitAnimation - dt * 3)
      }

      if (stone.failAnimation > 0) {
        stone.failAnimation = Math.max(0, stone.failAnimation - dt * 3)
      }

      stone.terrainHeight += (stone.targetTerrainHeight - stone.terrainHeight) * dt * 5
    }

    for (const region of this.terrainRegions) {
      region.elevation += (region.targetElevation - region.elevation) * dt * 5
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= dt / p.maxLife
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderTerrain(ctx)
    this.renderStones(ctx)
    this.renderParticles(ctx)
  }

  private renderTerrain(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.terrainRegions.length; i++) {
      const region = this.terrainRegions[i]
      const stone = this.stones[i]
      if (region.elevation < 0.01) continue

      const angle = (stone.config.angle * Math.PI) / 180
      const dist = this.altarRadius + 80
      const rx = this.centerX + Math.cos(angle) * dist
      const ry = this.centerY + Math.sin(angle) * dist
      const elevHeight = region.elevation * 20

      ctx.save()
      ctx.globalAlpha = 0.6 * region.elevation

      if (stone.config.terrainChange.type === 'bridge') {
        const bridgeAngle = angle
        const bx1 = this.centerX + Math.cos(bridgeAngle) * (this.altarRadius + 20)
        const by1 = this.centerY + Math.sin(bridgeAngle) * (this.altarRadius + 20)
        const bx2 = this.centerX + Math.cos(bridgeAngle) * (this.altarRadius + 140)
        const by2 = this.centerY + Math.sin(bridgeAngle) * (this.altarRadius + 140)

        ctx.beginPath()
        ctx.moveTo(bx1, by1 - elevHeight)
        ctx.lineTo(bx2, by2 - elevHeight)
        ctx.lineTo(bx2, by2 - elevHeight + 8)
        ctx.lineTo(bx1, by1 - elevHeight + 8)
        ctx.closePath()

        const grad = ctx.createLinearGradient(bx1, by1, bx2, by2)
        grad.addColorStop(0, stone.config.color)
        grad.addColorStop(1, '#8B7355')
        ctx.fillStyle = grad
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(rx, ry - elevHeight, 25 + region.elevation * 10, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(rx, ry - elevHeight, 0, rx, ry - elevHeight, 35)
        grad.addColorStop(0, stone.config.color)
        grad.addColorStop(1, '#8B7355')
        ctx.fillStyle = grad
        ctx.fill()
      }

      ctx.restore()
    }
  }

  private renderStones(ctx: CanvasRenderingContext2D): void {
    for (const stone of this.stones) {
      const angle = (stone.config.angle * Math.PI) / 180
      const sx = this.centerX + Math.cos(angle) * this.altarRadius
      const sy = this.centerY + Math.sin(angle) * this.altarRadius
      const r = this.stoneRadius

      ctx.save()

      if (stone.pulseAlpha > 0) {
        ctx.beginPath()
        ctx.arc(sx, sy, stone.pulseRadius, 0, Math.PI * 2)
        ctx.strokeStyle = stone.config.glowColor
        ctx.globalAlpha = stone.pulseAlpha * 0.5
        ctx.lineWidth = 3
        ctx.shadowColor = stone.config.glowColor
        ctx.shadowBlur = 15
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      if (stone.glowIntensity > 0) {
        ctx.beginPath()
        ctx.arc(sx, sy, r + 15, 0, Math.PI * 2)
        const glowGrad = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r + 15)
        glowGrad.addColorStop(0, stone.config.glowColor + '80')
        glowGrad.addColorStop(1, stone.config.glowColor + '00')
        ctx.fillStyle = glowGrad
        ctx.globalAlpha = stone.glowIntensity
        ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      const bodyGrad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r)
      if (stone.activated) {
        bodyGrad.addColorStop(0, stone.config.glowColor)
        bodyGrad.addColorStop(1, stone.config.color)
      } else {
        bodyGrad.addColorStop(0, '#9B8B75')
        bodyGrad.addColorStop(1, '#6B5B4F')
      }
      ctx.fillStyle = bodyGrad
      ctx.fill()

      ctx.strokeStyle = stone.activated ? stone.config.glowColor : '#4A3F35'
      ctx.lineWidth = 2
      ctx.stroke()

      this.renderRunes(ctx, sx, sy, r, stone)

      if (stone.failAnimation > 0) {
        ctx.beginPath()
        const shakeX = (Math.random() - 0.5) * 6 * stone.failAnimation
        const shakeY = (Math.random() - 0.5) * 6 * stone.failAnimation
        ctx.arc(sx + shakeX, sy + shakeY, r + 3, 0, Math.PI * 2)
        ctx.strokeStyle = '#FF0000'
        ctx.globalAlpha = stone.failAnimation
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }
  }

  private renderRunes(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, stone: StoneState): void {
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(stone.runePhase)

    const runeCount = 3
    for (let i = 0; i < runeCount; i++) {
      const runeAngle = (i * Math.PI * 2) / runeCount
      const rx = Math.cos(runeAngle) * r * 0.55
      const ry = Math.sin(runeAngle) * r * 0.55

      ctx.beginPath()
      ctx.moveTo(rx - 4, ry)
      ctx.lineTo(rx, ry - 6)
      ctx.lineTo(rx + 4, ry)
      ctx.lineTo(rx, ry + 6)
      ctx.closePath()

      ctx.fillStyle = stone.activated ? stone.config.glowColor : '#8B7355'
      if (stone.activated && stone.glowIntensity > 0.3) {
        ctx.shadowColor = stone.config.glowColor
        ctx.shadowBlur = 8
      }
      ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.beginPath()
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2)
    ctx.strokeStyle = stone.activated ? stone.config.glowColor : '#8B7355'
    ctx.lineWidth = 1.5
    if (stone.activated && stone.glowIntensity > 0.3) {
      ctx.shadowColor = stone.config.glowColor
      ctx.shadowBlur = 6
    }
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.restore()
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 5
      ctx.fill()
      ctx.restore()
    }
  }

  getStonePosition(index: number): { x: number; y: number } | null {
    if (index < 0 || index >= this.stones.length) return null
    const angle = (this.stones[index].config.angle * Math.PI) / 180
    return {
      x: this.centerX + Math.cos(angle) * this.altarRadius,
      y: this.centerY + Math.sin(angle) * this.altarRadius,
    }
  }

  getStones(): StoneState[] {
    return this.stones
  }

  getActivatedCount(): number {
    return this.stones.filter((s) => s.activated).length
  }

  getTotalCount(): number {
    return this.stones.length
  }

  isAllActivated(): boolean {
    return this.stones.length > 0 && this.stones.every((s) => s.activated)
  }

  getParticles(): Particle[] {
    return this.particles
  }

  getTerrainRegions(): TerrainRegion[] {
    return this.terrainRegions
  }
}
