import type { Player, Platform } from '../types'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const GRID_SIZE = 40

export class GameRenderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
    this.width = GAME_WIDTH
    this.height = GAME_HEIGHT
  }

  render(player: Player, platforms: Platform[]) {
    this.drawBackground()
    this.drawGrid()
    this.drawPlatforms(platforms)
    this.drawPlayer(player)
  }

  private drawBackground() {
    this.ctx.fillStyle = '#87CEEB'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  private drawGrid() {
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    this.ctx.lineWidth = 1

    for (let x = 0; x <= this.width; x += GRID_SIZE) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }

    for (let y = 0; y <= this.height; y += GRID_SIZE) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }
  }

  private drawPlatforms(platforms: Platform[]) {
    for (const p of platforms) {
      if (p.type === 'crumbling' && p.crumbleState === 'disappeared') {
        continue
      }

      const alpha = p.type === 'crumbling' ? p.flashOpacity ?? 1 : 1
      this.ctx.save()
      this.ctx.globalAlpha = alpha

      this.ctx.fillStyle = p.color
      this.ctx.fillRect(p.x, p.y, p.width, p.height)

      if (p.type === 'moving') {
        this.ctx.strokeStyle = '#FFFFFF'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(p.x, p.y, p.width, p.height)
      }

      this.ctx.restore()
    }
  }

  private drawPlayer(player: Player) {
    this.ctx.fillStyle = '#2196F3'
    this.ctx.fillRect(player.x, player.y, player.width, player.height)
    this.ctx.strokeStyle = '#1565C0'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(player.x, player.y, player.width, player.height)
  }
}
