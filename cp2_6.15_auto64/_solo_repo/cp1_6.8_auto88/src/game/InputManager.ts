import { InputState } from './types'

export class InputManager {
  private keys: Set<string> = new Set()
  private justPressed: Set<string> = new Set()
  private touchState: Partial<InputState> = {}
  private isTouchDevice = false

  constructor() {
    this.setupKeyboard()
    this.detectTouch()
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code)
      }
      this.keys.add(e.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code)
    })

    window.addEventListener('blur', () => {
      this.keys.clear()
      this.justPressed.clear()
    })
  }

  private detectTouch() {
    window.addEventListener('touchstart', () => {
      this.isTouchDevice = true
    }, { once: true })
  }

  setTouchInput(partial: Partial<InputState>) {
    this.touchState = { ...this.touchState, ...partial }
  }

  getState(): InputState {
    const k = this.keys
    const t = this.touchState
    const left = k.has('KeyA') || k.has('ArrowLeft') || t.left || false
    const right = k.has('KeyD') || k.has('ArrowRight') || t.right || false
    const up = k.has('KeyW') || k.has('ArrowUp') || t.up || false
    const down = k.has('KeyS') || k.has('ArrowDown') || t.down || false
    const jump = k.has('Space') || t.jump || false
    const interact = k.has('KeyE') || t.interact || false
    const jumpPressed = this.justPressed.has('Space') || t.jumpPressed || false
    const interactPressed = this.justPressed.has('KeyE') || t.interactPressed || false

    this.justPressed.clear()
    this.touchState = {}

    return { left, right, up, down, jump, interact, jumpPressed, interactPressed }
  }

  getIsTouchDevice() {
    return this.isTouchDevice
  }

  destroy() {
    this.keys.clear()
    this.justPressed.clear()
  }
}
