import type { PhysicsParams, Player, Platform, JumpState, TrajectoryData } from '../types'

const GAME_WIDTH = 800
const GROUND_Y = 550
const PLAYER_WIDTH = 32
const PLAYER_HEIGHT = 32

export interface PhysicsUpdateResult {
  player: Player
  platforms: Platform[]
  trajectoryCompleted: TrajectoryData | null
  currentJumpState: JumpState | null
}

export class PhysicsEngine {
  private player: Player
  private platforms: Platform[]
  private jumpState: JumpState | null = null
  private trajectoryIdCounter = 0

  constructor() {
    this.player = this.createDefaultPlayer()
    this.platforms = this.createDefaultPlatforms()
  }

  private createDefaultPlayer(): Player {
    return {
      x: 50,
      y: GROUND_Y - PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      onGround: true
    }
  }

  private createDefaultPlatforms(): Platform[] {
    return [
      {
        id: 'ground',
        x: 0,
        y: GROUND_Y,
        width: 800,
        height: 50,
        color: '#4CAF50',
        type: 'static'
      },
      {
        id: 'moving',
        x: 100,
        y: 400,
        width: 100,
        height: 15,
        color: '#FF7043',
        type: 'moving',
        moveStartX: 100,
        moveEndX: 500,
        moveSpeed: 100,
        moveDirection: 1
      },
      {
        id: 'crumbling',
        x: 360,
        y: 300,
        width: 80,
        height: 15,
        color: '#AB47BC',
        type: 'crumbling',
        crumbleState: 'intact',
        crumbleTimer: 0,
        flashTimer: 0,
        flashOpacity: 1
      }
    ]
  }

  reset() {
    this.player = this.createDefaultPlayer()
    this.platforms = this.createDefaultPlatforms()
    this.jumpState = null
  }

  getPlayer(): Player {
    return { ...this.player }
  }

  getPlatforms(): Platform[] {
    return this.platforms.map((p) => ({ ...p }))
  }

  getJumpState(): JumpState | null {
    return this.jumpState ? { ...this.jumpState } : null
  }

  update(
    dt: number,
    params: PhysicsParams,
    horizontalInput: number,
    jumpPressed: boolean,
    resetPressed: boolean
  ): PhysicsUpdateResult {
    if (resetPressed) {
      this.reset()
      return {
        player: { ...this.player },
        platforms: this.platforms.map((p) => ({ ...p })),
        trajectoryCompleted: null,
        currentJumpState: null
      }
    }

    this.updatePlatforms(dt)

    this.player.vx = horizontalInput * params.horizontalSpeed

    if (jumpPressed && this.player.onGround) {
      this.player.vy = -params.jumpForce
      this.player.onGround = false
      this.jumpState = {
        isJumping: true,
        startTime: performance.now(),
        startX: this.player.x,
        startY: this.player.y,
        currentHighestY: this.player.y
      }
    }

    this.player.vy += params.gravity * dt

    const prevY = this.player.y
    const prevBottom = prevY + this.player.height

    this.player.x += this.player.vx * dt
    this.player.y += this.player.vy * dt

    if (this.player.x < 0) this.player.x = 0
    if (this.player.x + this.player.width > GAME_WIDTH) {
      this.player.x = GAME_WIDTH - this.player.width
    }

    if (this.jumpState) {
      if (this.player.y < this.jumpState.currentHighestY) {
        this.jumpState.currentHighestY = this.player.y
      }
    }

    let landed = false
    let landingPlatformX = this.player.x
    this.player.onGround = false

    for (const platform of this.platforms) {
      if (platform.type === 'crumbling' && platform.crumbleState === 'disappeared') {
        continue
      }

      const playerLeft = this.player.x
      const playerRight = this.player.x + this.player.width
      const playerBottom = this.player.y + this.player.height
      const platLeft = platform.x
      const platRight = platform.x + platform.width
      const platTop = platform.y

      const horizontalOverlap = playerRight > platLeft && playerLeft < platRight

      if (horizontalOverlap) {
        if (this.player.vy >= 0 && prevBottom <= platTop + 1 && playerBottom >= platTop) {
          this.player.y = platTop - this.player.height
          this.player.vy = 0
          this.player.onGround = true
          landed = true
          landingPlatformX = this.player.x

          if (platform.type === 'moving') {
            const moveAmount = (platform.moveSpeed || 0) * (platform.moveDirection || 1) * dt
            this.player.x += moveAmount
          }

          if (platform.type === 'crumbling' && platform.crumbleState === 'intact') {
            platform.crumbleState = 'triggered'
            platform.crumbleTimer = 1
            platform.flashTimer = 0
            platform.flashOpacity = 1
          }
        }
      }
    }

    let trajectoryCompleted: TrajectoryData | null = null
    if (this.jumpState && landed) {
      const airTimeMs = performance.now() - this.jumpState.startTime
      trajectoryCompleted = {
        id: ++this.trajectoryIdCounter,
        jumpStartY: this.jumpState.startY,
        highestY: this.jumpState.currentHighestY,
        landingX: landingPlatformX,
        airTimeMs
      }
      this.jumpState = null
    }

    return {
      player: { ...this.player },
      platforms: this.platforms.map((p) => ({ ...p })),
      trajectoryCompleted,
      currentJumpState: this.jumpState ? { ...this.jumpState } : null
    }
  }

  private updatePlatforms(dt: number) {
    for (const platform of this.platforms) {
      if (platform.type === 'moving') {
        const start = platform.moveStartX || 0
        const end = platform.moveEndX || 0
        const speed = platform.moveSpeed || 0
        let dir = platform.moveDirection || 1

        platform.x += speed * dir * dt

        if (platform.x <= start) {
          platform.x = start
          platform.moveDirection = 1
        } else if (platform.x + platform.width >= end) {
          platform.x = end - platform.width
          platform.moveDirection = -1
        }
      }

      if (platform.type === 'crumbling') {
        if (platform.crumbleState === 'triggered') {
          platform.crumbleTimer = (platform.crumbleTimer || 0) - dt
          platform.flashTimer = (platform.flashTimer || 0) + dt

          const flashPeriod = 0.15
          const flashPhase = Math.floor((platform.flashTimer || 0) / flashPeriod) % 2
          platform.flashOpacity = flashPhase === 0 ? 1 : 0.2

          if ((platform.crumbleTimer || 0) <= 0) {
            platform.crumbleState = 'disappeared'
            platform.crumbleTimer = 2
            platform.flashOpacity = 0
          }
        } else if (platform.crumbleState === 'disappeared') {
          platform.crumbleTimer = (platform.crumbleTimer || 0) - dt
          if ((platform.crumbleTimer || 0) <= 0) {
            platform.crumbleState = 'intact'
            platform.flashOpacity = 1
            platform.flashTimer = 0
          }
        }
      }
    }
  }
}
