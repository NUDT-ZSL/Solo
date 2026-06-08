import { Brush, BrushStroke } from './brush'
import { InkSystem } from './ink'

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreen: HTMLCanvasElement
  private offCtx: CanvasRenderingContext2D
  private brush: Brush
  private ink: InkSystem
  private animId: number = 0
  private lastTime = 0
  private dpr = 1
  private width = 0
  private height = 0
  private textureCanvas: HTMLCanvasElement | null = null
  private committedStrokes: Set<BrushStroke> = new Set()

  constructor(canvas: HTMLCanvasElement, brush: Brush, ink: InkSystem) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.brush = brush
    this.ink = ink

    this.offscreen = document.createElement('canvas')
    this.offCtx = this.offscreen.getContext('2d')!

    this.generatePaperTexture()
    this.resize()
  }

  private generatePaperTexture(): void {
    this.textureCanvas = document.createElement('canvas')
    const tCtx = this.textureCanvas.getContext('2d')!
    this.textureCanvas.width = 512
    this.textureCanvas.height = 512

    const imageData = tCtx.createImageData(512, 512)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const px = (i / 4) % 512
      const py = Math.floor((i / 4) / 512)

      const noise1 = Math.sin(px * 0.05) * Math.cos(py * 0.07) * 8
      const noise2 = Math.sin(px * 0.13 + py * 0.11) * 5
      const noise3 = (Math.random() - 0.5) * 6
      const fiberNoise = Math.sin(py * 0.3 + px * 0.02) * 3

      const base = 242 + noise1 + noise2 + noise3 + fiberNoise
      data[i] = Math.min(255, Math.max(220, base))
      data[i + 1] = Math.min(252, Math.max(218, base - 3))
      data[i + 2] = Math.min(248, Math.max(212, base - 6))
      data[i + 3] = 255
    }

    tCtx.putImageData(imageData, 0, 0)
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height

    this.canvas.width = this.width * this.dpr
    this.canvas.height = this.height * this.dpr
    this.ctx.scale(this.dpr, this.dpr)

    this.offscreen.width = this.width * this.dpr
    this.offscreen.height = this.height * this.dpr
    this.offCtx.scale(this.dpr, this.dpr)

    this.committedStrokes.clear()
    this.redrawOffscreen()
  }

  private redrawOffscreen(): void {
    const ctx = this.offCtx
    ctx.clearRect(0, 0, this.width, this.height)

    for (const stroke of this.brush.getStrokes()) {
      if (stroke.finished && !this.committedStrokes.has(stroke)) {
        this.brush.drawStroke(ctx, stroke, true)
        this.committedStrokes.add(stroke)
      }
    }
  }

  start(): void {
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  stop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId)
      this.animId = 0
    }
  }

  private loop = (time: number): void => {
    const dt = time - this.lastTime
    this.lastTime = time

    this.ink.update(dt)
    this.render()

    this.animId = requestAnimationFrame(this.loop)
  }

  private render(): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    this.drawBackground(ctx)

    ctx.drawImage(this.offscreen, 0, 0, this.width, this.height)

    const currentStroke = this.brush.getCurrentStroke()
    if (currentStroke && currentStroke.points.length > 1) {
      this.brush.drawStroke(ctx, currentStroke)
    }

    this.ink.drawParticles(ctx)
    this.ink.drawSplashes(ctx)
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    if (this.textureCanvas) {
      ctx.save()
      ctx.globalAlpha = 0.4
      const pattern = ctx.createPattern(this.textureCanvas, 'repeat')
      if (pattern) {
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, this.width, this.height)
      }
      ctx.restore()
    }
  }

  commitStroke(stroke: BrushStroke): void {
    if (!this.committedStrokes.has(stroke)) {
      this.brush.drawStroke(this.offCtx, stroke, true)
      this.committedStrokes.add(stroke)
    }
  }

  clearAll(): void {
    this.offCtx.clearRect(0, 0, this.width, this.height)
    this.committedStrokes.clear()
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  saveAsPNG(): void {
    const saveCanvas = document.createElement('canvas')
    const saveCtx = saveCanvas.getContext('2d')!
    saveCanvas.width = this.canvas.width
    saveCanvas.height = this.canvas.height
    saveCtx.scale(this.dpr, this.dpr)

    this.drawBackground(saveCtx)
    saveCtx.drawImage(this.offscreen, 0, 0, this.width, this.height)
    saveCtx.drawImage(this.canvas, 0, 0, this.width, this.height)

    const link = document.createElement('a')
    link.download = `笔墨流光_${Date.now()}.png`
    link.href = saveCanvas.toDataURL('image/png')
    link.click()
  }
}
