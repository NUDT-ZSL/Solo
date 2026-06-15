import type { Unit, Position, CellType, ItemType } from '../core/types'
import { getBaseType, isEnemyType } from '../core/types'

const UNIT_ICONS: Record<string, string> = {
  warrior: '⚔',
  archer: '🏹',
  mage: '✦',
}

const ENEMY_ICONS: Record<string, string> = {
  warrior: '💀',
  archer: '☠',
  mage: '👁',
}

export class SpriteRenderer {
  private ctx: CanvasRenderingContext2D | null = null
  private cellSize: number = 64
  private time: number = 0

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx
  }

  setCellSize(size: number): void {
    this.cellSize = size
  }

  setTime(t: number): void {
    this.time = t
  }

  drawUnit(
    unit: Unit,
    x: number,
    y: number,
    isSelected: boolean,
    scale: number = 1,
    opacity: number = 1
  ): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const cx = x + this.cellSize / 2
    const cy = y + this.cellSize / 2
    const baseType = getBaseType(unit.type)
    const isEnemy = isEnemyType(unit.type)

    ctx.save()
    ctx.globalAlpha = opacity

    const breathScale = 1 + Math.sin(this.time * 3 + (isEnemy ? Math.PI : 0)) * 0.03
    const finalScale = scale * breathScale

    ctx.translate(cx, cy)
    ctx.scale(finalScale, finalScale)
    ctx.translate(-cx, -cy)

    if (isSelected) {
      this.drawSelectionGlow(cx, cy)
    }

    this.drawUnitBody(cx, cy, unit, isEnemy, baseType)

    this.drawHealthBar(cx, cy + this.cellSize * 0.35, unit.hp / unit.maxHp, isEnemy)

    if (unit.hasActed && unit.isPlayer) {
      ctx.globalAlpha = 0.4
      ctx.fillStyle = '#000000'
      ctx.fillRect(x, y, this.cellSize, this.cellSize)
    }

    ctx.restore()
  }

  private drawSelectionGlow(cx: number, cy: number): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const pulse = 0.6 + Math.sin(this.time * 5) * 0.4
    const halfSize = this.cellSize * 0.42

    ctx.shadowColor = '#f0c040'
    ctx.shadowBlur = 10 + pulse * 8
    ctx.strokeStyle = `rgba(240, 192, 64, ${0.6 + pulse * 0.4})`
    ctx.lineWidth = 3
    ctx.strokeRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2)
    ctx.shadowBlur = 0
  }

  private drawUnitBody(cx: number, cy: number, unit: Unit, isEnemy: boolean, baseType: string): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const size = this.cellSize * 0.35

    const glowColor = isEnemy ? 'rgba(231, 76, 60, 0.3)' : 'rgba(100, 180, 255, 0.3)'
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.8)
    gradient.addColorStop(0, glowColor)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, size * 1.8, 0, Math.PI * 2)
    ctx.fill()

    const bodyColor = isEnemy ? '#8b1a1a' : '#2a4a7f'
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.roundRect(cx - size, cy - size, size * 2, size * 2, 6)
    ctx.fill()

    const borderColor = isEnemy ? '#e74c3c' : '#4a90d9'
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(cx - size, cy - size, size * 2, size * 2, 6)
    ctx.stroke()

    ctx.fillStyle = isEnemy ? '#ff6b6b' : '#ffffff'
    ctx.font = `${Math.floor(this.cellSize * 0.3)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const icon = isEnemy ? ENEMY_ICONS[baseType] : UNIT_ICONS[baseType]
    ctx.fillText(icon || '?', cx, cy)
  }

  private drawHealthBar(cx: number, y: number, hpRatio: number, isEnemy: boolean): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const barWidth = this.cellSize * 0.6
    const barHeight = 4
    const startX = cx - barWidth / 2

    ctx.fillStyle = '#333333'
    ctx.fillRect(startX, y, barWidth, barHeight)

    const hpColor = hpRatio > 0.5
      ? (isEnemy ? '#e74c3c' : '#2ecc71')
      : hpRatio > 0.25
        ? '#f39c12'
        : '#e74c3c'
    ctx.fillStyle = hpColor
    ctx.fillRect(startX, y, barWidth * Math.max(0, hpRatio), barHeight)
  }

  drawObstacle(x: number, y: number): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const margin = 2

    ctx.fillStyle = '#2d2d44'
    ctx.fillRect(x + margin, y + margin, this.cellSize - margin * 2, this.cellSize - margin * 2)

    ctx.strokeStyle = '#3d3d5c'
    ctx.lineWidth = 1
    ctx.strokeRect(x + margin, y + margin, this.cellSize - margin * 2, this.cellSize - margin * 2)

    ctx.fillStyle = '#3d3d5c'
    const cx = x + this.cellSize / 2
    const cy = y + this.cellSize / 2
    ctx.font = `${Math.floor(this.cellSize * 0.4)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🪨', cx, cy)
  }

  drawItem(x: number, y: number, itemType: ItemType): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const cx = x + this.cellSize / 2
    const cy = y + this.cellSize / 2
    const bobY = Math.sin(this.time * 4) * 3

    const glowColor = itemType === 'attackBoost' ? 'rgba(231, 76, 60, 0.4)' : 'rgba(46, 204, 113, 0.4)'
    const gradient = ctx.createRadialGradient(cx, cy + bobY, 0, cx, cy + bobY, this.cellSize * 0.3)
    gradient.addColorStop(0, glowColor)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy + bobY, this.cellSize * 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = `${Math.floor(this.cellSize * 0.35)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(itemType === 'attackBoost' ? '⚔️' : '👟', cx, cy + bobY)
  }

  drawMoveableCell(row: number, col: number): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const x = col * this.cellSize
    const y = row * this.cellSize
    const padding = 4

    ctx.fillStyle = 'rgba(100, 180, 255, 0.15)'
    ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2)

    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.strokeRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2)
    ctx.setLineDash([])
  }

  drawAttackableCell(row: number, col: number): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const x = col * this.cellSize
    const y = row * this.cellSize
    const padding = 2
    const pulse = 0.5 + Math.sin(this.time * 4) * 0.2

    ctx.fillStyle = `rgba(231, 76, 60, ${0.2 + pulse * 0.15})`
    ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2)

    ctx.strokeStyle = `rgba(231, 76, 60, ${0.5 + pulse * 0.3})`
    ctx.lineWidth = 2
    ctx.strokeRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2)
  }

  drawGrid(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const totalSize = this.cellSize * 8

    ctx.strokeStyle = 'rgba(192, 200, 224, 0.25)'
    ctx.lineWidth = 1
    ctx.shadowColor = 'rgba(192, 200, 224, 0.3)'
    ctx.shadowBlur = 3

    for (let i = 0; i <= 8; i++) {
      const pos = i * this.cellSize
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, totalSize)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(totalSize, pos)
      ctx.stroke()
    }

    ctx.shadowBlur = 0
  }

  drawDamagePopup(x: number, y: number, text: string, color: string, life: number, maxLife: number): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const alpha = Math.max(0, life / maxLife)
    const offsetY = (1 - alpha) * 30

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.font = `bold ${Math.floor(this.cellSize * 0.35)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#000000'
    ctx.shadowBlur = 4
    ctx.fillText(text, x, y - offsetY)
    ctx.shadowBlur = 0
    ctx.restore()
  }
}
