import { ParticleManager } from './ParticleManager'

const LANE_COUNT = 3
const SHIP_WIDTH = 40
const SHIP_HEIGHT = 30
const JUMP_FORCE = -12
const GRAVITY = 30
const SLIDE_DURATION = 0.6
const LANE_SWITCH_SPEED = 12

export class PlayerShip {
  lane: number = 1
  x: number = 0
  y: number = 0
  baseY: number = 0
  targetY: number = 0
  laneYPositions: number[] = []

  isJumping: boolean = false
  isSliding: boolean = false
  jumpVelocity: number = 0
  slideTimer: number = 0

  energy: number = 0
  maxEnergy: number = 10
  isBoosting: boolean = false
  boostTimer: number = 0
  boostDuration: number = 3

  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private laneHeight: number = 0
  private laneOffset: number = 0
  private targetLane: number = 1

  init(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.laneHeight = canvasHeight * 0.18
    this.laneOffset = canvasHeight * 0.25
    this.x = canvasWidth * 0.15
    this.laneYPositions = []
    for (let i = 0; i < LANE_COUNT; i++) {
      this.laneYPositions.push(this.laneOffset + i * this.laneHeight)
    }
    this.lane = 1
    this.targetLane = 1
    this.y = this.laneYPositions[1]
    this.baseY = this.y
    this.targetY = this.y
    this.isJumping = false
    this.isSliding = false
    this.jumpVelocity = 0
    this.slideTimer = 0
    this.energy = 0
    this.isBoosting = false
    this.boostTimer = 0
  }

  moveLeft() {
    if (this.lane > 0) {
      this.lane--
      this.targetLane = this.lane
    }
  }

  moveRight() {
    if (this.lane < LANE_COUNT - 1) {
      this.lane++
      this.targetLane = this.lane
    }
  }

  jump() {
    if (!this.isJumping && !this.isSliding) {
      this.isJumping = true
      this.jumpVelocity = JUMP_FORCE
    }
  }

  slide() {
    if (!this.isJumping && !this.isSliding) {
      this.isSliding = true
      this.slideTimer = SLIDE_DURATION
    }
  }

  triggerBoost() {
    if (this.energy >= this.maxEnergy && !this.isBoosting) {
      this.isBoosting = true
      this.boostTimer = this.boostDuration
      this.energy = 0
      return true
    }
    return false
  }

  addEnergy(amount: number) {
    this.energy = Math.min(this.energy + amount, this.maxEnergy)
  }

  update(dt: number, particleManager: ParticleManager) {
    const targetBaseY = this.laneYPositions[this.lane]
    this.baseY += (targetBaseY - this.baseY) * LANE_SWITCH_SPEED * dt

    if (this.isJumping) {
      this.jumpVelocity += GRAVITY * dt
      this.y += this.jumpVelocity * 60 * dt
      if (this.y >= this.baseY) {
        this.y = this.baseY
        this.isJumping = false
        this.jumpVelocity = 0
      }
    } else {
      this.y = this.baseY
    }

    if (this.isSliding) {
      this.slideTimer -= dt
      if (this.slideTimer <= 0) {
        this.isSliding = false
      }
    }

    if (this.isBoosting) {
      this.boostTimer -= dt
      if (this.boostTimer <= 0) {
        this.isBoosting = false
      }
    }

    particleManager.emitTrail(
      this.x - SHIP_WIDTH * 0.4,
      this.y + (this.isSliding ? SHIP_HEIGHT * 0.15 : SHIP_HEIGHT * 0.5),
      this.isBoosting
    )
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    const shipX = this.x
    const shipY = this.y
    const w = SHIP_WIDTH
    const h = this.isSliding ? SHIP_HEIGHT * 0.4 : SHIP_HEIGHT

    if (this.isBoosting) {
      ctx.shadowColor = '#ff6b35'
      ctx.shadowBlur = 30
    } else {
      ctx.shadowColor = '#00f0ff'
      ctx.shadowBlur = 15
    }

    ctx.fillStyle = this.isBoosting ? '#ff6b35' : '#00f0ff'
    ctx.beginPath()
    ctx.moveTo(shipX + w * 0.5, shipY - h * 0.5)
    ctx.lineTo(shipX - w * 0.5, shipY + h * 0.3)
    ctx.lineTo(shipX - w * 0.3, shipY + h * 0.5)
    ctx.lineTo(shipX + w * 0.1, shipY + h * 0.1)
    ctx.lineTo(shipX + w * 0.5, shipY + h * 0.3)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = this.isBoosting ? '#ffaa00' : '#66ffff'
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(shipX + w * 0.3, shipY - h * 0.3)
    ctx.lineTo(shipX - w * 0.1, shipY + h * 0.1)
    ctx.lineTo(shipX + w * 0.1, shipY + h * 0.15)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.shadowBlur = 0
    ctx.restore()
  }

  getBounds() {
    const h = this.isSliding ? SHIP_HEIGHT * 0.4 : SHIP_HEIGHT
    const w = SHIP_WIDTH * 0.7
    return {
      x: this.x - w * 0.5,
      y: this.y - h * 0.5,
      width: w,
      height: h,
    }
  }
}
