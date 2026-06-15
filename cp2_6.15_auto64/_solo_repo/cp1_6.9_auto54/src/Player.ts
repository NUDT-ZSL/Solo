export interface PlayerState {
  x: number
  y: number
  vy: number
  vx: number
  isJumping: boolean
  onGround: boolean
  groundStayTime: number
  energy: number
  quantumFlash: boolean
  quantumFlashTime: number
  flashCycle: number
  consecutiveJumps: number
  totalScore: number
  isDead: boolean
  trail: { x: number; y: number; time: number; alpha: number }[]
}

const JUMP_HEIGHT = 80
const JUMP_DURATION = 0.4
const GROUND_STAY = 0.2
const MAX_ENERGY = 100
const ENERGY_PER_JUMP = 10
const QUANTUM_DURATION = 3.0
const FLASH_CYCLE = 0.05
const TRAIL_DURATION = 0.5
const _HALF_JUMP = JUMP_DURATION / 2
const GRAVITY = (2 * JUMP_HEIGHT) / (_HALF_JUMP * _HALF_JUMP)
const JUMP_VELOCITY = -GRAVITY * _HALF_JUMP
const MOVE_SPEED = 220
const CAT_WIDTH = 30
const CAT_HEIGHT = 25

export class Player {
  state: PlayerState
  private canvasWidth: number
  private canvasHeight: number
  public leftPressed: boolean = false
  public rightPressed: boolean = false

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.state = this.createInitialState()
  }

  private createInitialState(): PlayerState {
    return {
      x: this.canvasWidth / 2,
      y: this.canvasHeight * 0.25,
      vy: 0,
      vx: 0,
      isJumping: false,
      onGround: false,
      groundStayTime: 0,
      energy: 0,
      quantumFlash: false,
      quantumFlashTime: 0,
      flashCycle: 0,
      consecutiveJumps: 0,
      totalScore: 0,
      isDead: false,
      trail: []
    }
  }

  reset() {
    this.state = this.createInitialState()
    this.leftPressed = false
    this.rightPressed = false
  }

  resize(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
  }

  jump() {
    if (this.state.isDead) return
    if (this.state.isJumping) return

    this.state.onGround = false
    this.state.isJumping = true
    this.state.vy = JUMP_VELOCITY
    this.state.groundStayTime = 0
    this.state.consecutiveJumps++
    this.state.energy = Math.min(MAX_ENERGY, this.state.energy + ENERGY_PER_JUMP)
    this.state.totalScore += 100 + this.state.consecutiveJumps * 10

    if (this.state.energy >= MAX_ENERGY && !this.state.quantumFlash) {
      this.state.quantumFlash = true
      this.state.quantumFlashTime = QUANTUM_DURATION
      this.state.energy = 0
    }
  }

  getWidth(): number { return CAT_WIDTH }
  getHeight(): number { return CAT_HEIGHT }

  private addTrailPoint() {
    this.state.trail.push({
      x: this.state.x,
      y: this.state.y,
      time: TRAIL_DURATION,
      alpha: 0.8
    })
  }

  update(dt: number, landedY: number | null, platformScrollY: number, hitUnstableRed: boolean): boolean {
    if (this.state.isDead) return false

    this.addTrailPoint()

    for (let i = this.state.trail.length - 1; i >= 0; i--) {
      this.state.trail[i].time -= dt
      this.state.trail[i].alpha = Math.max(0, this.state.trail[i].time / TRAIL_DURATION)
      if (this.state.trail[i].time <= 0) {
        this.state.trail.splice(i, 1)
      }
    }

    if (this.state.quantumFlash) {
      this.state.quantumFlashTime -= dt
      this.state.flashCycle += dt
      if (this.state.quantumFlashTime <= 0) {
        this.state.quantumFlash = false
        this.state.flashCycle = 0
      }
    }

    if (this.leftPressed) this.state.vx = -MOVE_SPEED
    else if (this.rightPressed) this.state.vx = MOVE_SPEED
    else this.state.vx = 0

    this.state.x += this.state.vx * dt
    this.state.x = Math.max(CAT_WIDTH / 2, Math.min(this.canvasWidth - CAT_WIDTH / 2, this.state.x))

    this.state.vy += GRAVITY * dt
    this.state.y += this.state.vy * dt

    this.state.y += platformScrollY * dt * 60

    if (landedY !== null) {
      const catBottom = this.state.y + CAT_HEIGHT / 2
      if (this.state.vy >= 0 && catBottom >= landedY - 2 && catBottom <= landedY + 20) {
        this.state.y = landedY - CAT_HEIGHT / 2
        this.state.vy = 0
        this.state.isJumping = false
        this.state.onGround = true
        this.state.groundStayTime += dt

        if (hitUnstableRed && !this.state.quantumFlash) {
          return false
        }

        if (this.state.groundStayTime >= GROUND_STAY) {
          this.jump()
          return true
        }
      }
    } else {
      this.state.onGround = false
      this.state.groundStayTime = 0
    }

    if (this.state.y > this.canvasHeight + 50) {
      this.state.isDead = true
      this.state.consecutiveJumps = 0
    }

    if (this.state.y < -50) {
      this.state.y = -50
      if (this.state.vy < 0) this.state.vy = 0
    }

    return false
  }

  getFlashAlpha(): number {
    if (!this.state.quantumFlash) return 1.0
    const phase = (this.state.flashCycle % (FLASH_CYCLE * 2)) / (FLASH_CYCLE * 2)
    return 0.3 + 0.7 * (phase < 0.5 ? phase * 2 : 2 - phase * 2)
  }

  loseEnergyOnRed() {
    this.state.energy = Math.max(0, this.state.energy - 10)
  }
}
