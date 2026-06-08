import { Butterfly } from './Butterfly'
import { VinePath } from './VinePath'
import { ShadowSpider } from './ShadowSpider'

export interface GameCallbacks {
  onScoreChange: (score: number) => void
  onLivesChange: (lives: number) => void
  onDustChange: (dust: number) => void
  onGameOver: (finalScore: number) => void
}

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private butterfly: Butterfly
  private vinePath: VinePath
  private shadowSpider: ShadowSpider
  private animFrameId: number = 0
  private lastTime: number = 0
  private score: number = 0
  private lives: number = 3
  private dustCollected: number = 0
  private isGameOver: boolean = false
  private isRunning: boolean = false
  private callbacks: GameCallbacks
  private cameraX: number = 0
  private cameraY: number = 0
  private bgStars: Array<{ x: number; y: number; size: number; alpha: number; twinkle: number }> = []
  private bgTrees: Array<{ x: number; height: number; width: number; alpha: number }> = []
  private audioCtx: AudioContext | null = null
  private canvasW: number = 0
  private canvasH: number = 0

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.callbacks = callbacks
    this.canvasW = canvas.width
    this.canvasH = canvas.height

    this.butterfly = new Butterfly(200, this.canvasH / 2)
    this.vinePath = new VinePath(this.canvasW, this.canvasH)
    this.shadowSpider = new ShadowSpider(this.canvasW, this.canvasH)

    this.generateBackground()
    this.setupInput()
  }

  private generateBackground(): void {
    this.bgStars = []
    for (let i = 0; i < 80; i++) {
      this.bgStars.push({
        x: Math.random() * 2000,
        y: Math.random() * this.canvasH,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      })
    }

    this.bgTrees = []
    for (let i = 0; i < 30; i++) {
      this.bgTrees.push({
        x: Math.random() * 3000,
        height: 100 + Math.random() * 200,
        width: 20 + Math.random() * 30,
        alpha: 0.1 + Math.random() * 0.15,
      })
    }
  }

  private setupInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      this.butterfly.keys.add(e.key)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      this.butterfly.keys.delete(e.key)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const onMouseDown = (e: MouseEvent) => {
      if (this.isGameOver) return
      const rect = this.canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left + this.cameraX
      const my = e.clientY - rect.top + this.cameraY
      const dx = mx - this.butterfly.x
      const dy = my - this.butterfly.y
      if (Math.sqrt(dx * dx + dy * dy) < 50) {
        this.butterfly.isDragging = true
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!this.butterfly.isDragging) return
      const rect = this.canvas.getBoundingClientRect()
      this.butterfly.dragTargetX = e.clientX - rect.left + this.cameraX
      this.butterfly.dragTargetY = e.clientY - rect.top + this.cameraY
    }

    const onMouseUp = () => {
      this.butterfly.isDragging = false
    }

    const onTouchStart = (e: TouchEvent) => {
      if (this.isGameOver) return
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const mx = touch.clientX - rect.left + this.cameraX
      const my = touch.clientY - rect.top + this.cameraY
      const dx = mx - this.butterfly.x
      const dy = my - this.butterfly.y
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        this.butterfly.isDragging = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!this.butterfly.isDragging) return
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.butterfly.dragTargetX = touch.clientX - rect.left + this.cameraX
      this.butterfly.dragTargetY = touch.clientY - rect.top + this.cameraY
    }

    const onTouchEnd = () => {
      this.butterfly.isDragging = false
    }

    this.canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    this.canvas.addEventListener('touchend', onTouchEnd)
  }

  private playCollectSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext()
      }
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      const baseFreq = 600 + this.dustCollected * 30
      osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.audioCtx.currentTime + 0.1)
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3)

      osc.start(this.audioCtx.currentTime)
      osc.stop(this.audioCtx.currentTime + 0.3)
    } catch {
      // audio not available
    }
  }

  private playHitSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext()
      }
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.frequency.setValueAtTime(200, this.audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.3)
      osc.type = 'sawtooth'
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4)

      osc.start(this.audioCtx.currentTime)
      osc.stop(this.audioCtx.currentTime + 0.4)
    } catch {
      // audio not available
    }
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.isGameOver = false
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  stop(): void {
    this.isRunning = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
    }
  }

  restart(): void {
    this.score = 0
    this.lives = 3
    this.dustCollected = 0
    this.isGameOver = false
    this.cameraX = 0
    this.cameraY = 0

    this.butterfly = new Butterfly(200, this.canvasH / 2)
    this.vinePath = new VinePath(this.canvasW, this.canvasH)
    this.shadowSpider = new ShadowSpider(this.canvasW, this.canvasH)
    this.generateBackground()

    this.callbacks.onScoreChange(0)
    this.callbacks.onLivesChange(3)
    this.callbacks.onDustChange(0)

    if (!this.isRunning) {
      this.start()
    }
  }

  resize(w: number, h: number): void {
    this.canvasW = w
    this.canvasH = h
    this.canvas.width = w
    this.canvas.height = h
    this.generateBackground()
  }

  private loop = (now: number): void => {
    if (!this.isRunning) return

    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    if (!this.isGameOver) {
      this.update(dt)
    }
    this.render()

    this.animFrameId = requestAnimationFrame(this.loop)
  }

  private update(dt: number): void {
    this.butterfly.update(dt, this.canvasW, this.canvasH)

    const targetCamX = this.butterfly.x - this.canvasW * 0.35
    const targetCamY = this.butterfly.y - this.canvasH * 0.5
    this.cameraX += (targetCamX - this.cameraX) * 0.05
    this.cameraY += (targetCamY - this.cameraY) * 0.03
    this.cameraY = Math.max(-100, Math.min(100, this.cameraY))

    this.vinePath.update(dt, this.cameraX, this.canvasW)
    this.shadowSpider.update(dt, this.butterfly.x, this.butterfly.y, this.cameraX, this.canvasW)

    const dust = this.vinePath.checkDustCollection(this.butterfly.x, this.butterfly.y, this.butterfly.radius)
    if (dust) {
      this.score += 10
      this.dustCollected++
      this.callbacks.onScoreChange(this.score)
      this.callbacks.onDustChange(this.dustCollected)
      this.playCollectSound()
    }

    if (!this.butterfly.isInvincible()) {
      const hitSpider = this.shadowSpider.checkCollision(this.butterfly.x, this.butterfly.y, this.butterfly.radius)
      if (hitSpider) {
        this.lives--
        this.butterfly.hit()
        this.callbacks.onLivesChange(this.lives)
        this.playHitSound()

        if (this.lives <= 0) {
          this.isGameOver = true
          this.callbacks.onGameOver(this.score)
        }
      }
    }

    for (const star of this.bgStars) {
      star.twinkle += dt * (0.5 + star.alpha)
    }
  }

  private render(): void {
    const ctx = this.ctx
    const w = this.canvasW
    const h = this.canvasH

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, '#0a0a2e')
    bgGrad.addColorStop(0.5, '#120a28')
    bgGrad.addColorStop(1, '#080015')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    this.renderStars(ctx, w, h)

    this.renderTrees(ctx, w, h)

    this.renderFog(ctx, w, h)

    this.vinePath.render(ctx, this.cameraX, this.cameraY)
    this.shadowSpider.render(ctx, this.cameraX, this.cameraY)
    this.butterfly.render(ctx, this.cameraX, this.cameraY)

    this.renderVignette(ctx, w, h)
  }

  private renderStars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    for (const star of this.bgStars) {
      const parallax = 0.1
      const sx = ((star.x - this.cameraX * parallax) % w + w) % w
      const sy = star.y
      const twinkle = 0.5 + Math.sin(star.twinkle) * 0.5
      const alpha = star.alpha * twinkle

      ctx.beginPath()
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`
      ctx.fill()
    }
  }

  private renderTrees(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    for (const tree of this.bgTrees) {
      const parallax = 0.2
      const tx = ((tree.x - this.cameraX * parallax) % (w + 200) + w + 200) % (w + 200) - 100

      ctx.fillStyle = `rgba(15, 10, 25, ${tree.alpha})`
      ctx.fillRect(tx - tree.width / 2, h - tree.height, tree.width, tree.height)

      ctx.beginPath()
      ctx.moveTo(tx - tree.width * 1.5, h - tree.height + 20)
      ctx.lineTo(tx, h - tree.height - tree.width)
      ctx.lineTo(tx + tree.width * 1.5, h - tree.height + 20)
      ctx.closePath()
      ctx.fillStyle = `rgba(10, 8, 20, ${tree.alpha * 1.2})`
      ctx.fill()
    }
  }

  private renderFog(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const fogGrad = ctx.createLinearGradient(0, h * 0.6, 0, h)
    fogGrad.addColorStop(0, 'rgba(20, 10, 40, 0)')
    fogGrad.addColorStop(1, 'rgba(20, 10, 40, 0.4)')
    ctx.fillStyle = fogGrad
    ctx.fillRect(0, 0, w, h)
  }

  private renderVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7)
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
    ctx.fillStyle = vigGrad
    ctx.fillRect(0, 0, w, h)
  }
}
