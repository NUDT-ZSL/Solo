import type { RainMix } from './audioEngine'

interface Raindrop {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  width: number
  colorStart: string
  colorEnd: string
  active: boolean
  trail: { x: number; y: number; alpha: number }[]
  sparkle: boolean
}

export interface CanvasParams {
  intensity: number
  mix: RainMix
  stormMode: boolean
  rainType: 'drizzle' | 'shower' | 'thunder'
}

export class RainCanvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private dpr = 1

  private pool: Raindrop[] = []
  private activeCount = 0
  private readonly POOL_SIZE = 300

  private params: CanvasParams = {
    intensity: 50,
    mix: { drizzle: 0.5, shower: 0.3, thunder: 0.2 },
    stormMode: false,
    rainType: 'drizzle'
  }

  private frameCount = 0
  private rafId: number | null = null
  private lastSpawnTime = 0

  private analyser: AnalyserNode | null = null
  private freqData: Uint8Array | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
    this.initPool()
    this.resize()
  }

  private initPool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.pool.push(this.createEmptyDrop())
    }
  }

  private createEmptyDrop(): Raindrop {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      length: 0, width: 0,
      colorStart: '#4a90e2', colorEnd: '#a1c4fd',
      active: false, trail: [], sparkle: false
    }
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.ctx.scale(this.dpr, this.dpr)
  }

  setAnalyser(analyser: AnalyserNode | null): void {
    this.analyser = analyser
    if (analyser) {
      this.freqData = new Uint8Array(analyser.frequencyBinCount)
    } else {
      this.freqData = null
    }
  }

  setParams(params: Partial<CanvasParams>): void {
    this.params = { ...this.params, ...params }
  }

  start(): void {
    if (this.rafId !== null) return
    this.loop()
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private getSpawnRate(): number {
    const base = 5 + (this.params.intensity / 100) * 25
    return this.params.stormMode ? base * 2 : base
  }

  private getMaxParticles(): number {
    const base = 30 + Math.floor((this.params.intensity / 100) * 90)
    return this.params.stormMode ? Math.min(this.POOL_SIZE, base * 2) : Math.min(this.POOL_SIZE, base)
  }

  private getDropSize(): { length: number; width: number } {
    const t = this.params.intensity / 100
    let baseLen: number, baseWid: number
    switch (this.params.rainType) {
      case 'drizzle':
        baseLen = 2 + t * 2
        break
      case 'shower':
        baseLen = 4 + t * 3
        break
      case 'thunder':
        baseLen = 5 + t * 3
        break
      default:
        baseLen = 3
    }
    baseLen = Math.min(8, baseLen)
    if (this.params.stormMode) baseLen = Math.min(8, baseLen * 1.3)
    baseWid = baseLen / 3
    return { length: baseLen, width: baseWid }
  }

  private getVelocity(): { vx: number; vy: number } {
    const t = this.params.intensity / 100
    let vy = 1 + t * 2
    switch (this.params.rainType) {
      case 'drizzle': vy *= 0.7; break
      case 'shower': vy *= 1.1; break
      case 'thunder': vy *= 1.4; break
    }
    vy = Math.min(3, vy)
    if (this.params.stormMode) vy = Math.min(5, vy * 1.5)
    const vx = this.params.stormMode ? (Math.random() - 0.3) * 1.5 : (Math.random() - 0.5) * 0.5
    return { vx, vy }
  }

  private randomBlue(): { start: string; end: string } {
    const h1 = 210 + Math.random() * 20
    const l1 = 50 + Math.random() * 20
    const h2 = 210 + Math.random() * 20
    const l2 = 70 + Math.random() * 15
    return {
      start: `hsl(${h1}, 70%, ${l1}%)`,
      end: `hsl(${h2}, 85%, ${l2}%)`
    }
  }

  private acquireDrop(): Raindrop | null {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      if (!this.pool[i].active) {
        return this.pool[i]
      }
    }
    return null
  }

  private spawnDrop(): void {
    if (this.activeCount >= this.getMaxParticles()) return
    const drop = this.acquireDrop()
    if (!drop) return

    const size = this.getDropSize()
    const vel = this.getVelocity()
    const colors = this.randomBlue()

    drop.x = Math.random() * (this.width + 100) - 50
    drop.y = -size.length - Math.random() * 20
    drop.vx = vel.vx
    drop.vy = vel.vy
    drop.length = size.length
    drop.width = size.width
    drop.colorStart = colors.start
    drop.colorEnd = colors.end
    drop.active = true
    drop.sparkle = false
    drop.trail.length = 0
    this.activeCount++
  }

  private releaseDrop(drop: Raindrop): void {
    drop.active = false
    drop.trail.length = 0
    this.activeCount--
  }

  private updateDrop(drop: Raindrop): void {
    if (!drop.active) return

    drop.trail.unshift({ x: drop.x, y: drop.y, alpha: 0.6 })
    const maxTrail = Math.max(3, Math.floor(5 + (this.params.intensity / 100) * 10))
    if (drop.trail.length > maxTrail) drop.trail.pop()
    for (let i = 0; i < drop.trail.length; i++) {
      drop.trail[i].alpha = 0.6 * (1 - i / drop.trail.length)
    }

    drop.x += drop.vx
    drop.y += drop.vy

    if (this.params.stormMode && this.frameCount % 10 === 0) {
      drop.sparkle = Math.random() < 0.3
    } else if (!this.params.stormMode) {
      drop.sparkle = false
    }

    const ground = this.height - 50
    if (drop.y > ground + drop.length || drop.x < -50 || drop.x > this.width + 50) {
      this.releaseDrop(drop)
    }
  }

  private drawBackground(): void {
    const bg = this.params.stormMode ? '#0d0d2b' : '#1a1a2e'
    this.ctx.fillStyle = bg
    this.ctx.fillRect(0, 0, this.width, this.height)

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.4)
    grad.addColorStop(0, this.params.stormMode ? 'rgba(80, 40, 160, 0.35)' : 'rgba(74, 144, 226, 0.2)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    this.ctx.fillStyle = grad
    this.ctx.fillRect(0, 0, this.width, this.height * 0.4)
  }

  private drawDrop(drop: Raindrop): void {
    if (!drop.active) return

    for (let i = drop.trail.length - 1; i >= 0; i--) {
      const t = drop.trail[i]
      this.ctx.save()
      this.ctx.globalAlpha = t.alpha * 0.5
      this.ctx.fillStyle = drop.colorEnd
      this.ctx.beginPath()
      this.ctx.ellipse(t.x, t.y, drop.width / 2, drop.length / 2, 0, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }

    this.ctx.save()
    if (drop.sparkle) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.shadowColor = '#ffffff'
      this.ctx.shadowBlur = 8
    } else {
      const grad = this.ctx.createLinearGradient(drop.x, drop.y - drop.length / 2, drop.x, drop.y + drop.length / 2)
      grad.addColorStop(0, drop.colorStart)
      grad.addColorStop(1, drop.colorEnd)
      this.ctx.fillStyle = grad
    }
    this.ctx.beginPath()
    this.ctx.ellipse(drop.x, drop.y, drop.width / 2, drop.length / 2, 0, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()
  }

  private drawSpectrum(): void {
    const barHeight = 50
    const y = this.height - barHeight
    const x = 0
    const w = this.width

    this.ctx.save()

    const emptyGrad = this.ctx.createLinearGradient(0, y, 0, this.height)
    emptyGrad.addColorStop(0, 'rgba(74, 144, 226, 0.08)')
    emptyGrad.addColorStop(1, 'rgba(160, 80, 220, 0.08)')
    this.ctx.fillStyle = emptyGrad
    this.ctx.fillRect(x, y, w, barHeight)

    if (this.analyser && this.freqData) {
      this.analyser.getByteFrequencyData(this.freqData as Uint8Array<ArrayBuffer>)
      const bins = this.freqData.length
      const barW = w / bins
      for (let i = 0; i < bins; i++) {
        const v = this.freqData[i] / 255
        const h = v * barHeight
        const bx = i * barW
        const by = this.height - h

        const hue = 210 + (i / bins) * 90
        this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.3 + v * 0.7})`
        this.ctx.fillRect(bx, by, Math.max(1, barW - 0.5), h)
      }
    }

    const topGrad = this.ctx.createLinearGradient(0, y - 2, 0, y + 4)
    topGrad.addColorStop(0, 'rgba(74, 144, 226, 0)')
    topGrad.addColorStop(0.5, 'rgba(74, 144, 226, 0.6)')
    topGrad.addColorStop(1, 'rgba(160, 80, 220, 0)')
    this.ctx.fillStyle = topGrad
    this.ctx.fillRect(0, y - 2, w, 4)

    this.ctx.restore()
  }

  private drawFrame(): void {
    this.ctx.save()
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    this.ctx.shadowBlur = 20
    this.ctx.strokeStyle = 'transparent'
    this.ctx.lineWidth = 10

    this.ctx.beginPath()
    this.ctx.rect(0, 0, this.width, this.height)
    this.ctx.stroke()
    this.ctx.restore()

    this.ctx.save()
    this.ctx.strokeStyle = 'rgba(74, 144, 226, 0.15)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(1, 1, this.width - 2, this.height - 2)
    this.ctx.restore()
  }

  private loop = (): void => {
    this.frameCount++

    const now = performance.now()
    const spawnInterval = 1000 / this.getSpawnRate()
    if (now - this.lastSpawnTime >= spawnInterval) {
      this.spawnDrop()
      this.lastSpawnTime = now
    }

    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.updateDrop(this.pool[i])
    }

    this.drawBackground()
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.drawDrop(this.pool[i])
    }
    this.drawSpectrum()
    this.drawFrame()

    this.rafId = requestAnimationFrame(this.loop)
  }
}
