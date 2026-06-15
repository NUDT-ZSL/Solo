import { Brush } from './brush'
import { InkSystem } from './ink'
import { CanvasRenderer } from './canvas'
import { UIController } from './ui'

class App {
  private canvas: HTMLCanvasElement
  private brush: Brush
  private ink: InkSystem
  private renderer: CanvasRenderer
  private ui: UIController
  private isDrawing = false
  private lastX = 0
  private lastY = 0
  private moveThreshold = 3
  private hasMoved = false
  private downX = 0
  private downY = 0

  constructor() {
    this.canvas = document.getElementById('ink-canvas') as HTMLCanvasElement
    this.brush = new Brush()
    this.ink = new InkSystem()
    this.renderer = new CanvasRenderer(this.canvas, this.brush, this.ink)
    this.ui = new UIController()

    this.bindEvents()
    this.bindUI()

    this.renderer.start()
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.offsetX, e.offsetY, e.pressure))
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.offsetX, e.offsetY, e.pressure))
    this.canvas.addEventListener('mouseup', () => this.onPointerUp())
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp())

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      this.onPointerDown(x, y, 0.5)
    }, { passive: false })

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const pressure = (touch as any).force || 0.5
      this.onPointerMove(x, y, pressure)
    }, { passive: false })

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      this.onPointerUp()
    })

    window.addEventListener('resize', () => {
      this.renderer.resize()
    })
  }

  private bindUI(): void {
    this.ui.setDensityChangeHandler((val) => {
      this.brush.setInkDensity(val)
      this.ink.setInkDensity(val)
    })

    this.ui.setSpreadChangeHandler((val) => {
      this.ink.setSpreadSpeed(val)
    })

    this.ui.setClearHandler(() => {
      this.brush.clearStrokes()
      this.ink.clear()
      this.renderer.clearAll()
    })

    this.ui.setSaveHandler(() => {
      this.renderer.saveAsPNG()
    })
  }

  private onPointerDown(x: number, y: number, pressure: number): void {
    this.isDrawing = true
    this.hasMoved = false
    this.lastX = x
    this.lastY = y
    this.downX = x
    this.downY = y

    const effectivePressure = pressure > 0 ? pressure : 0.5
    this.brush.startStroke(x, y, effectivePressure)
  }

  private onPointerMove(x: number, y: number, pressure: number): void {
    if (!this.isDrawing) return

    const dx = x - this.lastX
    const dy = y - this.lastY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < this.moveThreshold) return

    if (!this.hasMoved) {
      this.hasMoved = true
      const effectivePressure = 0.5
      this.ink.addStrokeInk(this.downX, this.downY, 4, effectivePressure)
    }

    const effectivePressure = pressure > 0 ? pressure : 0.5
    const point = this.brush.continueStroke(x, y, effectivePressure)

    if (point) {
      this.ink.addStrokeInk(point.x, point.y, point.radius, point.pressure)
      this.lastX = x
      this.lastY = y
    }
  }

  private onPointerUp(): void {
    if (!this.isDrawing) return
    this.isDrawing = false

    if (!this.hasMoved) {
      this.brush.endStroke()
      this.ink.createSplash(this.downX, this.downY)
    } else {
      const stroke = this.brush.endStroke()
      if (stroke) {
        this.renderer.commitStroke(stroke)
      }
    }
  }
}

new App()
