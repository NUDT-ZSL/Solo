export type InteractionType = 'click' | 'drag'

export interface InteractionEvent {
  x: number
  y: number
  type: InteractionType
}

type InteractionCallback = (event: InteractionEvent) => void

export class InteractionSystem {
  private canvas: HTMLCanvasElement | null = null
  private callbacks: InteractionCallback[] = []
  private isDragging = false
  private dragThrottleTimer = 0
  private readonly DRAG_THROTTLE_MS = 30
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void

  constructor() {
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundTouchStart = this.onTouchStart.bind(this)
    this.boundTouchMove = this.onTouchMove.bind(this)
    this.boundTouchEnd = this.onTouchEnd.bind(this)
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    canvas.addEventListener('mousedown', this.boundMouseDown)
    canvas.addEventListener('mousemove', this.boundMouseMove)
    canvas.addEventListener('mouseup', this.boundMouseUp)
    canvas.addEventListener('mouseleave', this.boundMouseUp)
    canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false })
    canvas.addEventListener('touchend', this.boundTouchEnd)
  }

  onInteract(callback: InteractionCallback) {
    this.callbacks.push(callback)
  }

  destroy() {
    if (!this.canvas) return
    this.canvas.removeEventListener('mousedown', this.boundMouseDown)
    this.canvas.removeEventListener('mousemove', this.boundMouseMove)
    this.canvas.removeEventListener('mouseup', this.boundMouseUp)
    this.canvas.removeEventListener('mouseleave', this.boundMouseUp)
    this.canvas.removeEventListener('touchstart', this.boundTouchStart)
    this.canvas.removeEventListener('touchmove', this.boundTouchMove)
    this.canvas.removeEventListener('touchend', this.boundTouchEnd)
  }

  private emit(event: InteractionEvent) {
    for (const cb of this.callbacks) {
      cb(event)
    }
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 }
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr,
    }
  }

  private onMouseDown(e: MouseEvent) {
    this.isDragging = true
    const coords = this.getCanvasCoords(e.clientX, e.clientY)
    this.emit({ x: coords.x, y: coords.y, type: 'click' })
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return
    const now = performance.now()
    if (now - this.dragThrottleTimer < this.DRAG_THROTTLE_MS) return
    this.dragThrottleTimer = now

    const coords = this.getCanvasCoords(e.clientX, e.clientY)
    this.emit({ x: coords.x, y: coords.y, type: 'drag' })
  }

  private onMouseUp() {
    this.isDragging = false
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault()
    this.isDragging = true
    const touch = e.touches[0]
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY)
    this.emit({ x: coords.x, y: coords.y, type: 'click' })
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault()
    const now = performance.now()
    if (now - this.dragThrottleTimer < this.DRAG_THROTTLE_MS) return
    this.dragThrottleTimer = now

    const touch = e.touches[0]
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY)
    this.emit({ x: coords.x, y: coords.y, type: 'drag' })
  }

  private onTouchEnd() {
    this.isDragging = false
  }
}
