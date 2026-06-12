import Phaser from 'phaser'
import type { GameStateData } from '../App'
import type { SkillType, Direction } from '../../shared/types'

const CELL_SIZE = 32
const GRID_PADDING = 16

export class GameScene extends Phaser.Scene {
  private gameState: GameStateData | null = null
  private playerId: string = ''
  private graphics!: Phaser.GameObjects.Graphics
  private fogGraphics!: Phaser.GameObjects.Graphics
  private uiGraphics!: Phaser.GameObjects.Graphics
  private visibleCells: Set<string> = new Set()
  private particles: Phaser.GameObjects.Particles.ParticleEmitterManager | null = null
  private runeRotation: number = 0
  private floatOffset: number = 0

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.graphics = this.add.graphics()
    this.fogGraphics = this.add.graphics()
    this.uiGraphics = this.add.graphics()

    this.particles = this.add.particles(0, 0, 'particle', {
      lifespan: 400,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xff4444,
      quantity: 0,
      emitting: false,
    })

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.runeRotation += 0.05
        this.floatOffset = Math.sin(this.time.now / 300) * 2
        this.render()
      },
    })
  }

  updateGameState(state: GameStateData, playerId: string) {
    this.gameState = state
    this.playerId = playerId

    const visibility = state.playerVisibilityMap?.[playerId] || []
    this.visibleCells = new Set(visibility)
  }

  private render() {
    if (!this.gameState) return

    this.graphics.clear()
    this.fogGraphics.clear()
    this.uiGraphics.clear()

    const { gridSize, players, foods, skillRunes, traps, lasers } = this.gameState
    const offsetX = (640 - gridSize * CELL_SIZE) / 2
    const offsetY = (640 - gridSize * CELL_SIZE) / 2

    this.drawBackground(offsetX, offsetY, gridSize)
    this.drawGrid(offsetX, offsetY, gridSize)
    this.drawFoods(foods, offsetX, offsetY)
    this.drawRunes(skillRunes, offsetX, offsetY)
    this.drawTraps(traps, offsetX, offsetY)
    this.drawLasers(lasers, offsetX, offsetY)
    this.drawSnakes(players, offsetX, offsetY)
    this.drawFogOfWar(offsetX, offsetY, gridSize)
  }

  private drawBackground(offsetX: number, offsetY: number, gridSize: number) {
    this.graphics.fillStyle(0x0f0f2a, 1)
    this.graphics.fillRect(offsetX, offsetY, gridSize * CELL_SIZE, gridSize * CELL_SIZE)
  }

  private drawGrid(offsetX: number, offsetY: number, gridSize: number) {
    this.graphics.lineStyle(1, 0xffffff, 0.08)

    for (let i = 0; i <= gridSize; i++) {
      const x = offsetX + i * CELL_SIZE
      const y = offsetY + i * CELL_SIZE

      this.graphics.beginPath()
      this.graphics.moveTo(x, offsetY)
      this.graphics.lineTo(x, offsetY + gridSize * CELL_SIZE)
      this.graphics.strokePath()

      this.graphics.beginPath()
      this.graphics.moveTo(offsetX, y)
      this.graphics.lineTo(offsetX + gridSize * CELL_SIZE, y)
      this.graphics.strokePath()
    }

    this.graphics.lineStyle(2, 0x00ff88, 0.5)
    this.graphics.strokeRect(offsetX, offsetY, gridSize * CELL_SIZE, gridSize * CELL_SIZE)
  }

  private isCellVisible(x: number, y: number): boolean {
    return this.visibleCells.has(`${x},${y}`)
  }

  private drawFoods(foods: { x: number; y: number; type: 'apple' | 'gem' }[], offsetX: number, offsetY: number) {
    for (const food of foods) {
      if (!this.isCellVisible(food.x, food.y)) continue

      const x = offsetX + food.x * CELL_SIZE + CELL_SIZE / 2
      const y = offsetY + food.y * CELL_SIZE + CELL_SIZE / 2 + this.floatOffset
      const radius = CELL_SIZE * 0.35

      if (food.type === 'apple') {
        this.graphics.fillStyle(0xff4444, 1)
        this.graphics.fillCircle(x, y, radius)
        this.graphics.fillStyle(0x66ff66, 1)
        this.graphics.fillRect(x - 2, y - radius - 4, 4, 6)
      } else {
        this.graphics.fillStyle(0x4488ff, 1)
        this.graphics.fillCircle(x, y, radius)
        this.graphics.fillStyle(0xffffff, 0.6)
        this.graphics.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.25)
      }
    }
  }

  private drawRunes(runes: { x: number; y: number; type: SkillType }[], offsetX: number, offsetY: number) {
    for (const rune of runes) {
      if (!this.isCellVisible(rune.x, rune.y)) continue

      const x = offsetX + rune.x * CELL_SIZE + CELL_SIZE / 2
      const y = offsetY + rune.y * CELL_SIZE + CELL_SIZE / 2 + this.floatOffset
      const size = CELL_SIZE * 0.4

      this.graphics.save()
      this.graphics.translateCanvas(x, y)
      this.graphics.rotateCanvas(this.runeRotation)

      this.graphics.lineStyle(2, 0xffd700, 1)
      this.graphics.fillStyle(0x1a1a3a, 0.9)

      this.graphics.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const px = Math.cos(angle) * size
        const py = Math.sin(angle) * size
        if (i === 0) {
          this.graphics.moveTo(px, py)
        } else {
          this.graphics.lineTo(px, py)
        }
      }
      this.graphics.closePath()
      this.graphics.fillPath()
      this.graphics.strokePath()

      const runeColors: Record<SkillType, number> = {
        speed: 0xffd700,
        invisible: 0xaa66ff,
        trap: 0x00ff88,
        laser: 0xff6b6b,
      }

      this.graphics.fillStyle(runeColors[rune.type] || 0xffffff, 1)
      this.graphics.fillCircle(0, 0, size * 0.4)

      this.graphics.restore()

      this.graphics.lineStyle(2, 0xffd700, 0.3)
      this.graphics.strokeCircle(x, y, size + 4 + Math.sin(this.runeRotation * 2) * 2)
    }
  }

  private drawTraps(traps: { x: number; y: number; ownerId: string; duration: number }[], offsetX: number, offsetY: number) {
    for (const trap of traps) {
      if (!this.isCellVisible(trap.x, trap.y)) continue

      const x = offsetX + trap.x * CELL_SIZE + CELL_SIZE / 2
      const y = offsetY + trap.y * CELL_SIZE + CELL_SIZE / 2
      const size = CELL_SIZE * 0.35

      this.graphics.lineStyle(2, 0x00ff88, 0.7)
      this.graphics.fillStyle(0x00ff88, 0.2)

      this.graphics.beginPath()
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + this.time.now / 500
        const px = x + Math.cos(angle) * size
        const py = y + Math.sin(angle) * size
        if (i === 0) {
          this.graphics.moveTo(px, py)
        } else {
          this.graphics.lineTo(px, py)
        }
      }
      this.graphics.closePath()
      this.graphics.fillPath()
      this.graphics.strokePath()
    }
  }

  private drawLasers(
    lasers: {
      startX: number
      startY: number
      direction: Direction
      length: number
      ownerId: string
      duration: number
    }[],
    offsetX: number,
    offsetY: number
  ) {
    for (const laser of lasers) {
      let startX = offsetX + laser.startX * CELL_SIZE + CELL_SIZE / 2
      let startY = offsetY + laser.startY * CELL_SIZE + CELL_SIZE / 2
      let endX = startX
      let endY = startY

      const laserLength = laser.length * CELL_SIZE

      switch (laser.direction) {
        case 'up':
          endY -= laserLength
          break
        case 'down':
          endY += laserLength
          break
        case 'left':
          endX -= laserLength
          break
        case 'right':
          endX += laserLength
          break
      }

      const alpha = Math.min(1, laser.duration / 3)

      this.graphics.lineStyle(12, 0xffff00, alpha * 0.3)
      this.graphics.beginPath()
      this.graphics.moveTo(startX, startY)
      this.graphics.lineTo(endX, endY)
      this.graphics.strokePath()

      this.graphics.lineStyle(6, 0xffff00, alpha * 0.6)
      this.graphics.beginPath()
      this.graphics.moveTo(startX, startY)
      this.graphics.lineTo(endX, endY)
      this.graphics.strokePath()

      this.graphics.lineStyle(2, 0xffffff, alpha)
      this.graphics.beginPath()
      this.graphics.moveTo(startX, startY)
      this.graphics.lineTo(endX, endY)
      this.graphics.strokePath()
    }
  }

  private drawSnakes(
    players: {
      id: string
      snake: { x: number; y: number }[]
      color: string
      alive: boolean
      invisible: boolean
      speedBoost: boolean
    }[],
    offsetX: number,
    offsetY: number
  ) {
    for (const player of players) {
      if (!player.alive) continue
      if (!player.snake || player.snake.length === 0) continue

      const isSelf = player.id === this.playerId
      const isInvisible = player.invisible && !isSelf

      const hasHeadVisible = this.isCellVisible(player.snake[0].x, player.snake[0].y)
      const anyVisible = player.snake.some((seg) => this.isCellVisible(seg.x, seg.y))

      if (!isSelf && !anyVisible) continue

      const color = Phaser.Display.Color.HexStringToColor(player.color).color
      const alpha = isInvisible ? 0.3 : 1

      for (let i = player.snake.length - 1; i >= 0; i--) {
        const seg = player.snake[i]
        if (!isSelf && !this.isCellVisible(seg.x, seg.y)) continue

        const x = offsetX + seg.x * CELL_SIZE + CELL_SIZE / 2
        const y = offsetY + seg.y * CELL_SIZE + CELL_SIZE / 2
        const size = CELL_SIZE * 0.85

        if (i === 0) {
          this.graphics.fillStyle(color, alpha)
          this.graphics.fillCircle(x, y, size / 2)

          this.graphics.fillStyle(0xffffff, alpha)
          let eyeOffsetX = 0
          let eyeOffsetY = 0
          if (player.direction === 'up') eyeOffsetY = -3
          if (player.direction === 'down') eyeOffsetY = 3
          if (player.direction === 'left') eyeOffsetX = -3
          if (player.direction === 'right') eyeOffsetX = 3

          this.graphics.fillCircle(x - 4 + eyeOffsetX, y - 2 + eyeOffsetY, 2.5)
          this.graphics.fillCircle(x + 4 + eyeOffsetX, y - 2 + eyeOffsetY, 2.5)

          this.graphics.fillStyle(0x000000, alpha)
          this.graphics.fillCircle(x - 4 + eyeOffsetX, y - 2 + eyeOffsetY, 1.2)
          this.graphics.fillCircle(x + 4 + eyeOffsetX, y - 2 + eyeOffsetY, 1.2)
        } else {
          const segAlpha = alpha * (1 - i / player.snake.length * 0.4)
          this.graphics.fillStyle(color, segAlpha)
          this.graphics.fillCircle(x, y, size / 2 - 1)
        }
      }

      if (player.speedBoost && isSelf) {
        for (let i = 1; i < Math.min(player.snake.length, 5); i++) {
          const seg = player.snake[i]
          const x = offsetX + seg.x * CELL_SIZE + CELL_SIZE / 2
          const y = offsetY + seg.y * CELL_SIZE + CELL_SIZE / 2

          this.graphics.fillStyle(0xffffff, 0.3 / i)
          this.graphics.fillCircle(x, y, CELL_SIZE * 0.3)
        }
      }
    }
  }

  private drawFogOfWar(offsetX: number, offsetY: number, gridSize: number) {
    const myPlayer = this.gameState?.players.find((p) => p.id === this.playerId)
    if (!myPlayer || !myPlayer.snake || myPlayer.snake.length === 0) return

    const head = myPlayer.snake[0]
    const centerX = offsetX + head.x * CELL_SIZE + CELL_SIZE / 2
    const centerY = offsetY + head.y * CELL_SIZE + CELL_SIZE / 2
    const radius = (this.gameState?.fogViewRadius || 5) * CELL_SIZE

    this.fogGraphics.fillStyle(0x0a0a2e, 1)
    this.fogGraphics.fillRect(0, 0, 640, 640)

    this.fogGraphics.setBlendMode(Phaser.BlendModes.ERASE)

    const gradientSteps = 10
    for (let i = 0; i < gradientSteps; i++) {
      const r = radius * (1 - i / gradientSteps * 0.3)
      const alpha = 0.1 + i / gradientSteps * 0.9
      this.fogGraphics.fillStyle(0xffffff, alpha)
      this.fogGraphics.fillCircle(centerX, centerY, r)
    }

    this.fogGraphics.setBlendMode(Phaser.BlendModes.NORMAL)
  }

  public spawnDeathParticles(x: number, y: number) {
    if (!this.particles) return

    this.particles.emitParticleAt(x, y, 15, {
      tint: 0xff4444,
      speedX: { min: -200, max: 200 },
      speedY: { min: -200, max: 200 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
    })
  }
}
