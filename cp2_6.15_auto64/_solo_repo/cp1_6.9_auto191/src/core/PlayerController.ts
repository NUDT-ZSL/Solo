import { GameEngine } from './GameEngine'

export class PlayerController {
  private engine: GameEngine
  private keys: Set<string> = new Set()
  private canvas: HTMLCanvasElement | null = null
  private canvasOffset: { x: number; y: number } = { x: 0, y: 0 }
  private scale: number = 1
  private mouseX: number = 0
  private mouseY: number = 0
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseClick: (e: MouseEvent) => void

  constructor(engine: GameEngine) {
    this.engine = engine
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundKeyUp = this.handleKeyUp.bind(this)
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundMouseClick = this.handleMouseClick.bind(this)
  }

  attach(canvas: HTMLCanvasElement, scale: number = 1) {
    this.canvas = canvas
    this.scale = scale
    this.updateOffset()
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
    canvas.addEventListener('mousemove', this.boundMouseMove)
    canvas.addEventListener('click', this.boundMouseClick)
  }

  detach() {
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.boundMouseMove)
      this.canvas.removeEventListener('click', this.boundMouseClick)
    }
  }

  updateScale(scale: number) {
    this.scale = scale
    this.updateOffset()
  }

  private updateOffset() {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    this.canvasOffset = { x: rect.left, y: rect.top }
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys.add(e.key.toLowerCase())
    this.keys.add(e.key)

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      this.engine.fireStrongPulse()
    }

    this.updateDirectionVector()
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase())
    this.keys.delete(e.key)
    this.updateDirectionVector()
  }

  private handleMouseMove(e: MouseEvent) {
    this.mouseX = (e.clientX - this.canvasOffset.x) / this.scale
    this.mouseY = (e.clientY - this.canvasOffset.y) / this.scale
    this.engine.setMousePosition(this.mouseX, this.mouseY)
  }

  private handleMouseClick(e: MouseEvent) {
    this.mouseX = (e.clientX - this.canvasOffset.x) / this.scale
    this.mouseY = (e.clientY - this.canvasOffset.y) / this.scale
    this.engine.setMousePosition(this.mouseX, this.mouseY)
    this.engine.fireStrongPulse()
  }

  private updateDirectionVector() {
    let x = 0
    let y = 0

    if (this.keys.has('w') || this.keys.has('ArrowUp')) y -= 1
    if (this.keys.has('s') || this.keys.has('ArrowDown')) y += 1
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) x -= 1
    if (this.keys.has('d') || this.keys.has('ArrowRight')) x += 1

    this.engine.setInputVector(x, y)
  }

  reset() {
    this.keys.clear()
    this.updateDirectionVector()
  }
}
