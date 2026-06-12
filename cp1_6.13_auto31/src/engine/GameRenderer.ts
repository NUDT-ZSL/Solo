import { GameEngine } from './GameEngine'
import {
  type LevelElement,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SIZE,
} from '@/types'

export class GameRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  render(engine: GameEngine): void {
    const ctx = this.ctx
    ctx.fillStyle = '#1e1e24'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    this.drawElements(engine.elements)
    this.drawEnemies(engine)
    this.drawPlayer(engine)
    this.drawFPS(engine)
  }

  private drawElements(elements: LevelElement[]): void {
    const ctx = this.ctx
    for (const el of elements) {
      switch (el.type) {
        case 'ground': {
          const grad = ctx.createLinearGradient(el.x, el.y, el.x, el.y + el.height)
          grad.addColorStop(0, '#4ade80')
          grad.addColorStop(1, '#22c55e')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.roundRect(el.x, el.y, el.width, el.height, 3)
          ctx.fill()
          ctx.strokeStyle = '#16a34a'
          ctx.lineWidth = 1
          ctx.stroke()
          break
        }
        case 'movingPlatform': {
          const grad = ctx.createLinearGradient(el.x, el.y, el.x, el.y + el.height)
          grad.addColorStop(0, '#fb923c')
          grad.addColorStop(1, '#f97316')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.roundRect(el.x, el.y, el.width, el.height, 3)
          ctx.fill()
          ctx.strokeStyle = '#ea580c'
          ctx.lineWidth = 1
          ctx.stroke()
          break
        }
        case 'spike': {
          ctx.fillStyle = '#dc2626'
          ctx.beginPath()
          ctx.moveTo(el.x, el.y + el.height)
          ctx.lineTo(el.x + el.width / 2, el.y)
          ctx.lineTo(el.x + el.width, el.y + el.height)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#991b1b'
          ctx.lineWidth = 1
          ctx.stroke()
          break
        }
        case 'flag': {
          ctx.fillStyle = '#92400e'
          ctx.fillRect(el.x + 2, el.y, 3, el.height)
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.moveTo(el.x + 5, el.y)
          ctx.lineTo(el.x + el.width, el.y + 8)
          ctx.lineTo(el.x + 5, el.y + 16)
          ctx.closePath()
          ctx.fill()
          break
        }
      }
    }
  }

  private drawEnemies(engine: GameEngine): void {
    const ctx = this.ctx
    const enemyPositions = engine.getEnemyPositions()

    for (const { el, x, y, wingPhase } of enemyPositions) {
      if (el.enemyType === 'slime') {
        const cx = x + el.width / 2
        const cy = y + el.height / 2
        const r = el.width / 2

        ctx.fillStyle = '#4ade80'
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#16a34a'
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(cx - 5, cy - 3, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + 5, cy - 3, 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#1a1a2e'
        ctx.beginPath()
        ctx.arc(cx - 4, cy - 3, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + 6, cy - 3, 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (el.enemyType === 'dragon') {
        const cx = x + el.width / 2
        const cy = y + el.height / 2

        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.ellipse(cx, cy, el.width / 2, el.height / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#b91c1c'
        ctx.lineWidth = 1.5
        ctx.stroke()

        const wingOffset = Math.sin(wingPhase) * 4
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.moveTo(cx - el.width / 2, cy)
        ctx.lineTo(cx - el.width / 2 - 10, cy - 8 + wingOffset)
        ctx.lineTo(cx - el.width / 2 + 4, cy - 4)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(cx + el.width / 2, cy)
        ctx.lineTo(cx + el.width / 2 + 10, cy - 8 - wingOffset)
        ctx.lineTo(cx + el.width / 2 - 4, cy - 4)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#fef08a'
        ctx.beginPath()
        ctx.arc(cx - 4, cy - 2, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + 4, cy - 2, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  private drawPlayer(engine: GameEngine): void {
    const ctx = this.ctx
    const p = engine.player

    if (p.isDead) {
      ctx.fillStyle = '#ef4444'
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.3
      ctx.beginPath()
      ctx.roundRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE, 4)
      ctx.fill()
      ctx.globalAlpha = 1.0
      return
    }

    ctx.fillStyle = '#3b82f6'
    ctx.beginPath()
    ctx.roundRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE, 4)
    ctx.fill()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE, 4)
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(p.x + 8, p.y + 8, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(p.x + 16, p.y + 8, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#1a1a2e'
    const lookDir = engine.keys.has('ArrowLeft') || engine.keys.has('a') ? -1 :
                    engine.keys.has('ArrowRight') || engine.keys.has('d') ? 1 : 0
    ctx.beginPath()
    ctx.arc(p.x + 8 + lookDir, p.y + 8, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(p.x + 16 + lookDir, p.y + 8, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawFPS(engine: GameEngine): void {
    const ctx = this.ctx
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px "Noto Sans SC", "Source Han Sans", system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`FPS: ${engine.fps}`, CANVAS_WIDTH - 12, 20)
    ctx.textAlign = 'left'
  }

  renderPauseOverlay(): void {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = '#e0e0e0'
    ctx.font = '20px "Noto Sans SC", "Source Han Sans", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('按 ESC 返回编辑模式 | 按 R 重置角色', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    ctx.textAlign = 'left'
  }
}
