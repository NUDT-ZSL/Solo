export class InputManager {
  private keys: Set<string> = new Set()
  private jumpPressed: boolean = false
  private listeners: (() => void)[] = []

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)
  }

  attach() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  detach() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.keys.clear()
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR'].includes(e.code)) {
      e.preventDefault()
    }
    if (!this.keys.has(e.code)) {
      if (e.code === 'Space') {
        this.jumpPressed = true
      }
    }
    this.keys.add(e.code)
    this.notifyListeners()
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code)
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb())
  }

  getHorizontalAxis(): number {
    let axis = 0
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) axis -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) axis += 1
    return axis
  }

  consumeJump(): boolean {
    const pressed = this.jumpPressed
    this.jumpPressed = false
    return pressed
  }

  isResetPressed(): boolean {
    return this.keys.has('KeyR')
  }

  onChange(cb: () => void) {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }
}
