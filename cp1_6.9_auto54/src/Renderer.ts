import type { PlayerState } from './Player'
import type { PlatformCell } from './Platform'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface SplashEffect {
  cellId: string
  x: number
  y: number
  baseColor: string
  frames: number
  maxFrames: number
}

const MAX_PARTICLES = 200
const SPLASH_FRAMES = 25
const SPLASH_PER_FRAME = 15
const QUANTUM_PARTICLES_PER_FRAME = 5

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private width: number
  private height: number
  public particles: Particle[] = []
  public splashEffects: SplashEffect[] = []

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
    this.width = width
    this.height = height
  }

  resize(width: number, height: number, scale: number = 1) {
    this.width = width
    this.height = height
    this.canvas.width = width * scale
    this.canvas.height = height * scale
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0)
  }

  addParticle(p: Particle) {
    this.particles.push(p)
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.shift()
    }
  }

  addSplash(cell: PlatformCell) {
    const existing = this.splashEffects.find(s => s.cellId === cell.id)
    if (existing) {
      existing.frames = 0
      return
    }
    this.splashEffects.push({
      cellId: cell.id,
      x: cell.x,
      y: cell.y - cell.radius * Math.sqrt(3) / 2,
      baseColor: cell.currentColor,
      frames: 0,
      maxFrames: SPLASH_FRAMES
    })
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 100 * dt
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  updateSplashes(isQuantum: boolean) {
    const perFrame = isQuantum ? SPLASH_PER_FRAME * 2 : SPLASH_PER_FRAME
    for (let i = this.splashEffects.length - 1; i >= 0; i--) {
      const s = this.splashEffects[i]
      if (s.frames < s.maxFrames) {
        for (let j = 0; j < perFrame; j++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 30 + Math.random() * 80
          const colorT = s.frames / s.maxFrames
          const color = lerpColor(s.baseColor, '#ffffff', colorT)
          this.addParticle({
            x: s.x + (Math.random() - 0.5) * 20,
            y: s.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20,
            life: 0.5 + Math.random() * 0.3,
            maxLife: 0.8,
            color,
            size: 2 + Math.random() * 3
          })
        }
      }
      s.frames++
      if (s.frames >= s.maxFrames) {
        this.splashEffects.splice(i, 1)
      }
    }
  }

  updateQuantumParticles(catX: number, catY: number) {
    for (let i = 0; i < QUANTUM_PARTICLES_PER_FRAME; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 5 + Math.random() * 15
      const speed = 20 + Math.random() * 40
      const hue = Math.random() * 360
      this.addParticle({
        x: catX + Math.cos(angle) * dist,
        y: catY + Math.sin(angle) * dist,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: `hsl(${hue},100%,70%)`,
        size: 2 + Math.random() * 3
      })
    }
  }

  private drawBackground() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height)
    grad.addColorStop(0, '#0B0C2A')
    grad.addColorStop(1, '#2C1A4D')
    this.ctx.fillStyle = grad
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  private drawHexagon(cx: number, cy: number, r: number) {
    this.ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
    }
    this.ctx.closePath()
  }

  private drawPlatforms(cells: PlatformCell[]) {
    for (const cell of cells) {
      if (!cell.visible) continue

      const alpha = cell.destroyed ? 0.3 : 1.0
      this.ctx.save()
      this.ctx.globalAlpha = alpha

      this.ctx.shadowColor = cell.currentColor
      this.ctx.shadowBlur = 10

      this.drawHexagon(cell.x, cell.y, cell.radius)
      this.ctx.fillStyle = cell.currentColor
      this.ctx.fill()

      this.ctx.shadowBlur = 0
      this.drawHexagon(cell.x, cell.y, cell.radius)
      this.ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      this.ctx.lineWidth = 1.5
      this.ctx.stroke()

      this.drawHexagon(cell.x, cell.y, cell.radius * 0.55)
      this.ctx.fillStyle = 'rgba(255,255,255,0.15)'
      this.ctx.fill()

      if (cell.isUnstable) {
        this.ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 100)
        this.drawHexagon(cell.x, cell.y, cell.radius - 2)
        this.ctx.strokeStyle = '#FFFF00'
        this.ctx.lineWidth = 1
        this.ctx.stroke()
      }

      this.ctx.restore()
    }
  }

  private drawTrail(state: PlayerState, isQuantum: boolean) {
    if (state.trail.length < 2) return

    this.ctx.save()
    for (let i = 1; i < state.trail.length; i++) {
      const prev = state.trail[i - 1]
      const curr = state.trail[i]
      const alpha = curr.alpha * 0.5

      if (isQuantum) {
        const t = i / state.trail.length
        const hue = 180 + t * 120
        this.ctx.strokeStyle = `hsla(${hue},100%,70%,${alpha})`
      } else {
        this.ctx.strokeStyle = `rgba(100,200,255,${alpha})`
      }
      this.ctx.lineWidth = 4 * curr.alpha
      this.ctx.lineCap = 'round'
      this.ctx.beginPath()
      this.ctx.moveTo(prev.x, prev.y)
      this.ctx.lineTo(curr.x, curr.y)
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  private drawCat(state: PlayerState, alpha: number, isQuantum: boolean) {
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(state.x, state.y)

    const squash = state.onGround ? 1.08 : (state.isJumping ? 0.95 : 1)
    this.ctx.scale(1 / squash, squash)

    const glowColor = isQuantum ? '#FF00FF' : '#00AAFF'
    this.ctx.shadowColor = glowColor
    this.ctx.shadowBlur = 15

    const hexagons = [
      { x: 0, y: 0, r: 11 },
      { x: 0, y: -8, r: 7 },
      { x: -9, y: -3, r: 5 },
      { x: 9, y: -3, r: 5 },
      { x: -6, y: 8, r: 4.5 },
      { x: 6, y: 8, r: 4.5 },
      { x: 0, y: 9, r: 4 },
      { x: -4, y: -12, r: 3 },
      { x: 4, y: -12, r: 3 }
    ]

    for (const h of hexagons) {
      const catColor = isQuantum
        ? `hsl(${(Date.now() / 10 + h.x * 20) % 360}, 90%, 70%)`
        : 'rgba(80, 180, 255, 0.75)'
      this.drawHexagon(h.x, h.y, h.r)
      this.ctx.fillStyle = catColor
      this.ctx.fill()
      this.ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      this.ctx.lineWidth = 0.8
      this.ctx.stroke()
    }

    this.ctx.shadowBlur = 0
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.beginPath()
    this.ctx.arc(-2.5, -9, 1.5, 0, Math.PI * 2)
    this.ctx.arc(2.5, -9, 1.5, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.fillStyle = '#000033'
    this.ctx.beginPath()
    this.ctx.arc(-2.5, -9, 0.7, 0, Math.PI * 2)
    this.ctx.arc(2.5, -9, 0.7, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.restore()
  }

  private drawParticles() {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      this.ctx.save()
      this.ctx.globalAlpha = alpha
      this.ctx.fillStyle = p.color
      this.ctx.shadowColor = p.color
      this.ctx.shadowBlur = 5
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }
  }

  private drawUI(state: PlayerState, quantumFlash: boolean) {
    this.ctx.save()
    this.ctx.shadowColor = '#00AAFF'
    this.ctx.shadowBlur = 8
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '16px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`得分: ${state.totalScore}`, 20, 55)
    this.ctx.fillText(`连跳: ${state.consecutiveJumps}`, 20, 75)
    this.ctx.shadowBlur = 0

    const barX = 20
    const barY = 20
    const barW = 200
    const barH = 15

    this.ctx.fillStyle = 'rgba(255,255,255,0.1)'
    this.ctx.fillRect(barX, barY, barW, barH)

    const grad = this.ctx.createLinearGradient(barX, barY, barX + barW, barY)
    grad.addColorStop(0, '#4A90E2')
    grad.addColorStop(1, '#FF00FF')
    const fillW = (state.energy / 100) * barW
    this.ctx.fillStyle = grad
    this.ctx.fillRect(barX, barY, fillW, barH)

    this.ctx.shadowColor = '#FFFFFF'
    this.ctx.shadowBlur = 4
    this.ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    this.ctx.lineWidth = 1.5
    this.ctx.strokeRect(barX, barY, barW, barH)

    this.ctx.shadowBlur = 0
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '11px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(`量子能量: ${Math.round(state.energy)}%`, barX + barW / 2, barY + 11)

    if (quantumFlash) {
      this.ctx.shadowColor = '#FF00FF'
      this.ctx.shadowBlur = 15
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.font = '18px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('★ 量子闪烁状态 ★', this.width / 2, 40)
    }

    this.ctx.restore()
  }

  drawGameOver(state: PlayerState) {
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0,0,0,0.75)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.shadowColor = '#FF0040'
    this.ctx.shadowBlur = 20
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = 'bold 48px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 50)

    this.ctx.shadowColor = '#00AAFF'
    this.ctx.shadowBlur = 10
    this.ctx.font = '24px monospace'
    this.ctx.fillText(`最终得分: ${state.totalScore}`, this.width / 2, this.height / 2 + 10)
    this.ctx.fillText(`最高连跳: ${state.consecutiveJumps || 0}`, this.width / 2, this.height / 2 + 45)

    this.ctx.shadowColor = '#FFFFFF'
    this.ctx.shadowBlur = 5
    this.ctx.font = '18px monospace'
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillText('按 空格键 重新开始', this.width / 2, this.height / 2 + 100)
    this.ctx.fillText('← → 方向键移动  |  空格跳跃', this.width / 2, this.height / 2 + 135)

    this.ctx.restore()
  }

  drawStartScreen() {
    this.ctx.save()
    this.ctx.shadowColor = '#00AAFF'
    this.ctx.shadowBlur = 20
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = 'bold 38px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('晶格跳跃 · 量子猫', this.width / 2, this.height / 2 - 80)

    this.ctx.shadowBlur = 10
    this.ctx.font = '16px monospace'
    this.ctx.fillText('← → 方向键移动', this.width / 2, this.height / 2 - 20)
    this.ctx.fillText('空格 或 点击屏幕跳跃', this.width / 2, this.height / 2 + 10)
    this.ctx.fillText('连续跳跃积累量子能量', this.width / 2, this.height / 2 + 40)
    this.ctx.fillText('能量满格进入量子闪烁，可穿透红色晶格', this.width / 2, this.height / 2 + 70)

    this.ctx.shadowColor = '#FF00FF'
    this.ctx.shadowBlur = 15
    this.ctx.font = 'bold 22px monospace'
    this.ctx.fillText('按 空格键 开始游戏', this.width / 2, this.height / 2 + 130)

    this.ctx.restore()
  }

  render(
    playerState: PlayerState,
    cells: PlatformCell[],
    flashAlpha: number,
    isQuantum: boolean,
    gameState: 'start' | 'playing' | 'gameover'
  ) {
    this.drawBackground()
    this.drawPlatforms(cells)
    this.drawTrail(playerState, isQuantum)
    this.drawParticles()
    this.drawCat(playerState, flashAlpha, isQuantum)
    this.drawUI(playerState, isQuantum)

    if (gameState === 'gameover') {
      this.drawGameOver(playerState)
    } else if (gameState === 'start') {
      this.drawStartScreen()
    }
  }
}
