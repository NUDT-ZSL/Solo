import { Pet, PetStats } from './pet'

export type ButtonType = 'food' | 'clean' | 'play' | 'heal'

export interface UIButton {
  type: ButtonType
  x: number
  y: number
  size: number
  isPressed: boolean
  isHovered: boolean
}

export class UIManager {
  public buttons: UIButton[] = []
  public canvasWidth = 0
  public canvasHeight = 0
  private petAreaSize = 400
  private petAreaX = 0
  private petAreaY = 0
  public baseFontSize = 14
  public baseButtonSize = 48
  public fontSize = 14
  public buttonSize = 48

  public layout(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
    const vw = width
    const t = Math.max(0, Math.min(1, (vw - 320) / (1920 - 320)))
    this.fontSize = Math.round(14 + t * 6)
    this.buttonSize = Math.round(48 + t * 16)

    this.petAreaSize = 400
    this.petAreaX = Math.floor((width - this.petAreaSize) / 2)
    this.petAreaY = Math.floor((height - this.petAreaSize) / 2) - 30

    const btnSize = this.buttonSize
    const gap = 16
    const topMargin = 40
    const rightMargin = 40
    const baseX = width - rightMargin - btnSize
    const baseY = topMargin
    this.buttons = [
      { type: 'food', x: baseX, y: baseY, size: btnSize, isPressed: false, isHovered: false },
      { type: 'clean', x: baseX, y: baseY + btnSize + gap, size: btnSize, isPressed: false, isHovered: false },
      { type: 'play', x: baseX, y: baseY + (btnSize + gap) * 2, size: btnSize, isPressed: false, isHovered: false },
    ]
  }

  public getPetArea() {
    return { x: this.petAreaX, y: this.petAreaY, size: this.petAreaSize }
  }

  public getPetScale(): number {
    return 4
  }

  public getPetCenter(): { x: number; y: number } {
    const area = this.getPetArea()
    const scale = this.getPetScale()
    return {
      x: area.x + area.size / 2 - 32 * scale,
      y: area.y + area.size / 2 - 32 * scale,
    }
  }

  public getButtonAt(px: number, py: number): UIButton | null {
    for (const btn of this.buttons) {
      const cx = btn.x + btn.size / 2
      const cy = btn.y + btn.size / 2
      const dx = px - cx
      const dy = py - cy
      const r = btn.size / 2
      if (dx * dx + dy * dy <= r * r) {
        return btn
      }
    }
    return null
  }

  public draw(ctx: CanvasRenderingContext2D, pet: Pet, time: number) {
    ctx.fillStyle = '#F5F0E1'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    this.drawPetArea(ctx, pet, time)
    this.drawStatusBar(ctx, pet, time)
    this.drawButtons(ctx, pet, time)
    this.drawStatusMessage(ctx, pet)
    this.drawHoverBubble(ctx, pet)
  }

  private drawPetArea(ctx: CanvasRenderingContext2D, _pet: Pet, _time: number) {
    const { x, y, size } = this.getPetArea()
    ctx.fillStyle = '#FFE4B5'
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#5D4037'
    ctx.fillRect(x - 5, y - 5, size + 10, 5)
    ctx.fillRect(x - 5, y + size, size + 10, 5)
    ctx.fillRect(x - 5, y - 5, 5, size + 10)
    ctx.fillRect(x + size, y - 5, 5, size + 10)

    ctx.fillStyle = '#D2B48C'
    for (let i = 0; i < 8; i++) {
      const gx = x + 20 + i * 50
      const gy = y + size - 30 + (i % 2) * 10
      ctx.fillRect(gx, gy, 8, 4)
      ctx.fillRect(gx + 2, gy - 4, 4, 4)
    }
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D, pet: Pet, time: number) {
    const barWidth = 200
    const barHeight = 20
    const totalWidth = barWidth * 2 + 120
    const panelHeight = 130
    let panelX = Math.floor((this.canvasWidth - totalWidth) / 2) - 30
    let panelY = this.canvasHeight - panelHeight - 20
    const panelWidth = totalWidth + 60
    let borderColor = '#5D4037'
    let borderWidth = 3
    if (pet.isSick) {
      const blink = Math.floor(time * 2) % 2 === 0
      borderColor = blink ? '#FF0000' : '#5D4037'
      borderWidth = 4
    }

    ctx.fillStyle = '#FFF8E7'
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight)
    ctx.fillStyle = borderColor
    ctx.fillRect(panelX, panelY, panelWidth, borderWidth)
    ctx.fillRect(panelX, panelY + panelHeight - borderWidth, panelWidth, borderWidth)
    ctx.fillRect(panelX, panelY, borderWidth, panelHeight)
    ctx.fillRect(panelX + panelWidth - borderWidth, panelY, borderWidth, panelHeight)

    panelX += 20
    panelY += 15
    ctx.fillStyle = '#5D4037'
    ctx.font = `bold ${this.fontSize + 2}px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('宠物：小光', panelX, panelY)

    const items: Array<{ key: keyof PetStats; label: string; color: string }> = [
      { key: 'hunger', label: '饱食度', color: '#FF6B6B' },
      { key: 'cleanliness', label: '清洁度', color: '#4ECDC4' },
      { key: 'happiness', label: '快乐度', color: '#FFE66D' },
      { key: 'energy', label: '精力', color: '#95E1D3' },
    ]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      const bx = panelX + col * (barWidth + 60)
      const by = panelY + 30 + row * 40

      ctx.fillStyle = '#5D4037'
      ctx.font = `${this.fontSize}px monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.label, bx, by + barHeight / 2)

      const barX = bx + 60
      const radius = 6
      this.drawRoundRect(ctx, barX, by, barWidth, barHeight, radius, '#E0D5C0')
      const pct = Math.max(0, Math.min(100, pet.stats[item.key])) / 100
      if (pct > 0) {
        const innerW = Math.floor(barWidth * pct)
        this.drawRoundRect(ctx, barX, by, innerW, barHeight, radius, item.color)
      }
      ctx.fillStyle = '#3E2723'
      ctx.font = `bold ${this.fontSize - 2}px monospace`
      ctx.textAlign = 'right'
      ctx.fillText(`${Math.round(pet.stats[item.key])}`, barX + barWidth - 6, by + barHeight / 2)
    }
  }

  private drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number, color: string
  ) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
  }

  private drawButtons(ctx: CanvasRenderingContext2D, pet: Pet, _time: number) {
    for (const btn of this.buttons) {
      this.drawCircleButton(ctx, btn)
    }
    if (pet.isSick) {
      const btnSize = this.buttonSize
      const gap = 16
      const topMargin = 40
      const rightMargin = 40
      const baseX = this.canvasWidth - rightMargin - btnSize
      const baseY = topMargin + (btnSize + gap) * 3
      const healBtn: UIButton = {
        type: 'heal',
        x: baseX,
        y: baseY,
        size: btnSize,
        isPressed: this.buttons.find(b => b.type === 'heal')?.isPressed ?? false,
        isHovered: this.buttons.find(b => b.type === 'heal')?.isHovered ?? false,
      }
      if (!this.buttons.find(b => b.type === 'heal')) {
        this.buttons.push(healBtn)
      } else {
        const existing = this.buttons.find(b => b.type === 'heal')!
        existing.x = baseX
        existing.y = baseY
        existing.size = btnSize
        this.drawHealButton(ctx, existing)
        return
      }
      this.drawHealButton(ctx, healBtn)
    } else {
      this.buttons = this.buttons.filter(b => b.type !== 'heal')
    }
  }

  private drawCircleButton(ctx: CanvasRenderingContext2D, btn: UIButton) {
    let scale = 1
    let alpha = 1
    if (btn.isPressed) {
      scale = 0.9
      alpha = 0.8
    } else if (btn.isHovered) {
      scale = 1.2
    }

    const size = btn.size * scale
    const cx = btn.x + btn.size / 2
    const cy = btn.y + btn.size / 2
    const r = size / 2

    ctx.save()
    ctx.globalAlpha = alpha

    let bgColor = '#8B4513'
    if (btn.type === 'clean') bgColor = '#4A90D9'
    if (btn.type === 'play') bgColor = '#27AE60'

    ctx.fillStyle = '#3E2723'
    ctx.beginPath()
    ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r - 3, Math.PI * 0.75, Math.PI * 1.25)
    ctx.stroke()

    ctx.fillStyle = '#FFFFFF'
    if (btn.type === 'food') {
      this.drawChickenIcon(ctx, cx, cy, size)
    } else if (btn.type === 'clean') {
      this.drawDropIcon(ctx, cx, cy, size)
    } else if (btn.type === 'play') {
      this.drawBallIcon(ctx, cx, cy, size)
    }

    ctx.restore()
  }

  private drawHealButton(ctx: CanvasRenderingContext2D, btn: UIButton) {
    let scale = 1
    let alpha = 1
    if (btn.isPressed) {
      scale = 0.9
      alpha = 0.8
    } else if (btn.isHovered) {
      scale = 1.2
    }
    const size = btn.size * scale
    const cx = btn.x + btn.size / 2
    const cy = btn.y + btn.size / 2
    const r = size / 2

    ctx.save()
    ctx.globalAlpha = alpha

    ctx.fillStyle = '#8B0000'
    ctx.beginPath()
    ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    const crossW = Math.floor(size * 0.5)
    const crossT = Math.floor(size * 0.14)
    ctx.fillStyle = '#E53935'
    ctx.fillRect(cx - crossW / 2, cy - crossT / 2, crossW, crossT)
    ctx.fillRect(cx - crossT / 2, cy - crossW / 2, crossT, crossW)

    ctx.restore()
  }

  private drawChickenIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const s = size / 24
    const ox = cx - 10 * s
    const oy = cy - 10 * s
    const px = (x: number, y: number, w: number, h: number) => {
      ctx.fillRect(Math.floor(ox + x * s), Math.floor(oy + y * s), Math.ceil(w * s), Math.ceil(h * s))
    }
    px(6, 2, 10, 6)
    px(4, 4, 2, 8)
    px(16, 4, 2, 8)
    px(6, 10, 10, 2)
    px(8, 12, 8, 6)
    px(10, 18, 4, 2)
    px(6, 8, 2, 2)
    px(16, 8, 2, 2)
  }

  private drawDropIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const s = size / 24
    const ox = cx - 8 * s
    const oy = cy - 12 * s
    const px = (x: number, y: number, w: number, h: number) => {
      ctx.fillRect(Math.floor(ox + x * s), Math.floor(oy + y * s), Math.ceil(w * s), Math.ceil(h * s))
    }
    px(6, 0, 4, 2)
    px(4, 2, 8, 2)
    px(2, 4, 12, 4)
    px(2, 8, 12, 4)
    px(4, 12, 8, 4)
    px(6, 16, 4, 2)
    ctx.fillStyle = '#B3E5FC'
    px(5, 6, 2, 3)
  }

  private drawBallIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const s = size / 24
    const ox = cx - 10 * s
    const oy = cy - 10 * s
    const px = (x: number, y: number, w: number, h: number) => {
      ctx.fillRect(Math.floor(ox + x * s), Math.floor(oy + y * s), Math.ceil(w * s), Math.ceil(h * s))
    }
    px(6, 2, 8, 2)
    px(4, 4, 12, 2)
    px(2, 6, 16, 8)
    px(4, 14, 12, 2)
    px(6, 16, 8, 2)
    ctx.fillStyle = '#1E88E5'
    px(8, 2, 4, 18)
    px(2, 9, 16, 2)
  }

  private drawStatusMessage(ctx: CanvasRenderingContext2D, pet: Pet) {
    if (pet.statusMessage === null) return
    const alpha = Math.min(1, pet.statusMessageTimer)
    ctx.save()
    ctx.globalAlpha = alpha
    const center = this.getPetCenter()
    const text = pet.statusMessage
    ctx.font = `bold ${this.fontSize + 2}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const metrics = ctx.measureText(text)
    const tw = metrics.width + 20
    const th = 28
    const tx = center.x + 32 * this.getPetScale() - tw / 2
    const ty = center.y - 10
    this.drawRoundRect(ctx, tx, ty, tw, th, 6, '#FFFFFF')
    ctx.strokeStyle = '#5D4037'
    ctx.lineWidth = 2
    ctx.strokeRect(tx, ty, tw, th)
    ctx.fillStyle = '#5D4037'
    ctx.fillText(text, center.x + 32 * this.getPetScale(), ty + th / 2 + 4)
    ctx.restore()
  }

  private drawHoverBubble(ctx: CanvasRenderingContext2D, pet: Pet) {
    if (!pet.showBubble()) return
    const center = this.getPetCenter()
    const scale = this.getPetScale()
    const bw = 60
    const bh = 36
    const bx = center.x + 64 * scale - 10
    const by = center.y
    this.drawRoundRect(ctx, bx, by, bw, bh, 8, '#FFFFFF')
    ctx.strokeStyle = '#5D4037'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bx - 6, by + bh / 2)
    ctx.lineTo(bx + 4, by + bh / 2 - 6)
    ctx.lineTo(bx + 4, by + bh / 2 + 6)
    ctx.closePath()
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.stroke()

    const t = (pet.hoverBubbleTimer % 1)
    const dots = 3
    for (let i = 0; i < dots; i++) {
      const phase = (t + i * 0.33) % 1
      const visible = phase < 0.66
      const alpha = visible ? 1 - phase : 0
      ctx.globalAlpha = Math.max(0, alpha)
      ctx.fillStyle = '#5D4037'
      const dx = bx + 15 + i * 15
      const dy = by + bh / 2
      ctx.beginPath()
      ctx.arc(dx, dy, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}
