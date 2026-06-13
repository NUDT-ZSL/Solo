import { Room, Player, GameState, Pedestal } from './types'
import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  COLORS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  WARNING_TIME,
  FONT_FAMILY,
  FONT_SIZE,
} from './constants'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private roomWidth: number
  private roomHeight: number
  private scale: number
  private animFrame: number = 0
  private particles: Particle[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
    this.roomWidth = ROOM_WIDTH
    this.roomHeight = ROOM_HEIGHT
    this.scale = 1
    this.resize()
  }

  resize(): void {
    const container = this.canvas.parentElement
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const isMobile = containerWidth < 768
    const targetWidth = isMobile ? 240 : ROOM_WIDTH
    const targetHeight = isMobile ? 210 : ROOM_HEIGHT

    const scaleX = containerWidth / targetWidth
    const scaleY = containerHeight / targetHeight
    this.scale = Math.min(scaleX, scaleY, 3)

    this.roomWidth = targetWidth
    this.roomHeight = targetHeight

    this.canvas.width = targetWidth * this.scale
    this.canvas.height = targetHeight * this.scale
    this.ctx.imageSmoothingEnabled = false
  }

  render(
    room: Room,
    player: Player,
    gameState: GameState,
    timeRemaining: number,
    loopCount: number,
    shardCount: number,
  ): void {
    this.animFrame++

    this.ctx.save()
    this.ctx.scale(this.scale, this.scale)

    this.drawRoomBackground()
    this.drawWallsAndFloor(room)
    this.drawDoors(room)
    this.drawMemoryShard(room)
    this.drawPedestals(room)
    this.drawPortal(room)
    this.drawPlayer(player)
    this.drawParticles()
    this.drawTransitionEffect(gameState)

    this.ctx.restore()
  }

  private drawRoomBackground(): void {
    this.ctx.fillStyle = COLORS.bgPurple
    this.ctx.fillRect(0, 0, this.roomWidth, this.roomHeight)
  }

  private drawWallsAndFloor(room: Room): void {
    const wallThickness = 16

    this.ctx.fillStyle = COLORS.wall
    this.ctx.fillRect(0, 0, this.roomWidth, wallThickness)
    this.ctx.fillRect(0, this.roomHeight - wallThickness, this.roomWidth, wallThickness)
    this.ctx.fillRect(0, 0, wallThickness, this.roomHeight)
    this.ctx.fillRect(this.roomWidth - wallThickness, 0, wallThickness, this.roomHeight)

    this.ctx.fillStyle = COLORS.wallDark
    for (let x = 0; x < this.roomWidth; x += 16) {
      if ((x / 16) % 2 === 0) {
        this.ctx.fillRect(x, 0, 8, wallThickness)
        this.ctx.fillRect(x + 8, this.roomHeight - wallThickness, 8, wallThickness)
      }
    }
    for (let y = 0; y < this.roomHeight; y += 16) {
      if ((y / 16) % 2 === 0) {
        this.ctx.fillRect(0, y, wallThickness, 8)
        this.ctx.fillRect(this.roomWidth - wallThickness, y + 8, wallThickness, 8)
      }
    }

    this.ctx.fillStyle = COLORS.floor
    this.ctx.fillRect(wallThickness, wallThickness, this.roomWidth - wallThickness * 2, this.roomHeight - wallThickness * 2)

    this.ctx.strokeStyle = COLORS.floorLine
    this.ctx.lineWidth = 1
    for (let x = wallThickness; x < this.roomWidth - wallThickness; x += 16) {
      this.ctx.beginPath()
      this.ctx.moveTo(x + 0.5, wallThickness)
      this.ctx.lineTo(x + 0.5, this.roomHeight - wallThickness)
      this.ctx.stroke()
    }
    for (let y = wallThickness; y < this.roomHeight - wallThickness; y += 16) {
      this.ctx.beginPath()
      this.ctx.moveTo(wallThickness, y + 0.5)
      this.ctx.lineTo(this.roomWidth - wallThickness, y + 0.5)
      this.ctx.stroke()
    }
  }

  private drawDoors(room: Room): void {
    const doorWidth = 24
    const doorHeight = 32
    const wallThickness = 16

    if (room.doors.north) {
      const x = (this.roomWidth - doorWidth) / 2
      this.ctx.fillStyle = COLORS.gold
      this.ctx.fillRect(x, 0, doorWidth, wallThickness)
      this.ctx.fillStyle = COLORS.bgPurple
      this.ctx.fillRect(x + 2, 0, doorWidth - 4, wallThickness - 2)
    }

    if (room.doors.south) {
      const x = (this.roomWidth - doorWidth) / 2
      this.ctx.fillStyle = COLORS.gold
      this.ctx.fillRect(x, this.roomHeight - wallThickness, doorWidth, wallThickness)
      this.ctx.fillStyle = COLORS.bgPurple
      this.ctx.fillRect(x + 2, this.roomHeight - wallThickness + 2, doorWidth - 4, wallThickness - 2)
    }

    if (room.doors.west) {
      const y = (this.roomHeight - doorHeight) / 2
      this.ctx.fillStyle = COLORS.gold
      this.ctx.fillRect(0, y, wallThickness, doorHeight)
      this.ctx.fillStyle = COLORS.bgPurple
      this.ctx.fillRect(0, y + 2, wallThickness - 2, doorHeight - 4)
    }

    if (room.doors.east) {
      const y = (this.roomHeight - doorHeight) / 2
      this.ctx.fillStyle = COLORS.gold
      this.ctx.fillRect(this.roomWidth - wallThickness, y, wallThickness, doorHeight)
      this.ctx.fillStyle = COLORS.bgPurple
      this.ctx.fillRect(this.roomWidth - wallThickness + 2, y + 2, wallThickness - 2, doorHeight - 4)
    }
  }

  private drawMemoryShard(room: Room): void {
    if (!room.hasMemoryShard || room.shardCollected) return

    const x = 32
    const y = this.roomHeight - 40
    const size = 10

    const flicker = Math.sin(this.animFrame * 0.1) * 0.3 + 0.7

    this.ctx.save()
    this.ctx.globalAlpha = flicker

    this.ctx.fillStyle = COLORS.goldBright
    this.ctx.fillRect(x, y, size, size)

    this.ctx.fillStyle = COLORS.gold
    this.ctx.fillRect(x + 2, y + 2, size - 4, size - 4)

    this.ctx.fillStyle = '#fff'
    this.ctx.fillRect(x + 3, y + 3, 2, 2)

    this.ctx.restore()
  }

  private drawPedestals(room: Room): void {
    if (!room.pedestals || room.pedestals.length === 0) return

    for (const pedestal of room.pedestals) {
      const x = pedestal.x
      const y = pedestal.y
      const size = 20

      if (pedestal.activated) {
        const glow = Math.sin(this.animFrame * 0.08) * 0.3 + 0.7
        this.ctx.save()
        this.ctx.globalAlpha = glow
        this.ctx.fillStyle = COLORS.magenta
        this.ctx.fillRect(x - 4, y - 4, size + 8, size + 8)
        this.ctx.restore()
      }

      this.ctx.fillStyle = pedestal.activated ? COLORS.magenta : COLORS.teal
      this.ctx.fillRect(x, y, size, size)

      this.ctx.fillStyle = COLORS.wallDark
      this.ctx.fillRect(x + 2, y + 2, size - 4, size - 4)

      this.ctx.fillStyle = pedestal.activated ? COLORS.goldBright : COLORS.gray
      this.ctx.font = `10px ${FONT_FAMILY}`
      this.ctx.textAlign = 'center'
      this.ctx.fillText(pedestal.order.toString(), x + size / 2, y + size / 2 + 4)
    }
  }

  private drawPortal(room: Room): void {
    if (!room.isFinalRoom || !room.portalActive) return

    const x = this.roomWidth / 2 - 16
    const y = 60
    const w = 32
    const h = 48

    const pulse = Math.sin(this.animFrame * 0.1) * 0.2 + 0.8

    this.ctx.save()
    this.ctx.globalAlpha = pulse

    const gradient = this.ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w)
    gradient.addColorStop(0, COLORS.goldBright)
    gradient.addColorStop(0.5, COLORS.magenta)
    gradient.addColorStop(1, 'transparent')

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(x - w / 2, y - h / 4, w * 2, h * 1.5)

    this.ctx.fillStyle = COLORS.goldBright
    this.ctx.fillRect(x, y, w, h)

    this.ctx.restore()
  }

  private drawPlayer(player: Player): void {
    const x = Math.floor(player.x)
    const y = Math.floor(player.y)

    this.ctx.save()

    if (!player.facingRight) {
      this.ctx.translate(x + PLAYER_WIDTH, y)
      this.ctx.scale(-1, 1)
    } else {
      this.ctx.translate(x, y)
    }

    const bobOffset = player.onGround ? 0 : Math.sin(this.animFrame * 0.3) * 1

    this.ctx.fillStyle = COLORS.playerHelmet
    this.ctx.fillRect(2, 0 + bobOffset, 12, 6)

    this.ctx.fillStyle = COLORS.playerSkin
    this.ctx.fillRect(3, 5 + bobOffset, 10, 5)

    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(9, 7 + bobOffset, 2, 2)

    this.ctx.fillStyle = COLORS.playerBody
    this.ctx.fillRect(2, 10 + bobOffset, 12, 4)

    this.ctx.fillStyle = COLORS.playerHelmet
    this.ctx.fillRect(4, 10 + bobOffset, 2, 4)
    this.ctx.fillRect(10, 10 + bobOffset, 2, 4)

    const legOffset = player.onGround && Math.abs(player.vx) > 0
      ? Math.floor(this.animFrame / 5) % 2 === 0 ? 0 : 1
      : 0

    this.ctx.fillStyle = COLORS.playerBody
    this.ctx.fillRect(3, 14 + bobOffset + legOffset, 4, 2)
    this.ctx.fillRect(9, 14 + bobOffset + (1 - legOffset), 4, 2)

    this.ctx.restore()
  }

  private drawParticles(): void {
    const newParticles: Particle[] = []

    for (const particle of this.particles) {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life -= 1

      if (particle.life > 0) {
        this.ctx.save()
        this.ctx.globalAlpha = particle.life / particle.maxLife
        this.ctx.fillStyle = particle.color
        this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size)
        this.ctx.restore()
        newParticles.push(particle)
      }
    }

    this.particles = newParticles
  }

  spawnResetParticles(): void {
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * this.roomWidth,
        y: Math.random() * this.roomHeight,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30,
        maxLife: 30,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? COLORS.goldBright : COLORS.magenta,
      })
    }
  }

  spawnShardParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x + 5,
        y: y + 5,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        life: 25,
        maxLife: 25,
        size: 2,
        color: COLORS.goldBright,
      })
    }
  }

  private drawTransitionEffect(gameState: GameState): void {
    if (gameState.transitionAlpha > 0) {
      this.ctx.save()
      this.ctx.globalAlpha = gameState.transitionAlpha
      this.ctx.fillStyle = '#000'
      this.ctx.fillRect(0, 0, this.roomWidth, this.roomHeight)
      this.ctx.restore()
    }

    if (gameState.flashAlpha > 0) {
      this.ctx.save()
      this.ctx.globalAlpha = gameState.flashAlpha
      this.ctx.fillStyle = '#fff'
      this.ctx.fillRect(0, 0, this.roomWidth, this.roomHeight)
      this.ctx.restore()
    }
  }

  getRoomSize(): { width: number; height: number } {
    return { width: this.roomWidth, height: this.roomHeight }
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}
