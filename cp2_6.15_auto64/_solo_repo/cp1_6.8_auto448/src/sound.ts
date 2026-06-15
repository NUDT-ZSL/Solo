import { THEMES, type ThemeName } from './forest'

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
  strength: number
  speed: number
  lightBeamHeight: number
  lightBeamMaxHeight: number
  lightBeamOpacity: number
  alive: boolean
}

interface DragTrail {
  x: number
  y: number
  opacity: number
  radius: number
  alive: boolean
}

export class SoundSystem {
  ripples: Ripple[] = []
  dragTrails: DragTrail[] = []
  private theme: ThemeName = 'forest'
  private soundStrength = 1.0

  setTheme(theme: ThemeName) {
    this.theme = theme
  }

  setSoundStrength(strength: number) {
    this.soundStrength = strength
  }

  createRipple(x: number, y: number) {
    const strength = this.soundStrength
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 120 + strength * 80,
      opacity: 0.6 * strength,
      strength,
      speed: 2 + strength * 1.5,
      lightBeamHeight: 0,
      lightBeamMaxHeight: 60 + strength * 40,
      lightBeamOpacity: 0.7 * strength,
      alive: true,
    })
  }

  createDragTrail(x: number, y: number) {
    const strength = this.soundStrength
    this.dragTrails.push({
      x,
      y,
      opacity: 0.4 * strength,
      radius: 15 + strength * 10,
      alive: true,
    })
  }

  update() {
    for (const r of this.ripples) {
      r.radius += r.speed
      r.opacity *= 0.985

      if (r.lightBeamHeight < r.lightBeamMaxHeight) {
        r.lightBeamHeight += 3
      }
      r.lightBeamOpacity *= 0.96

      if (r.opacity < 0.01 && r.lightBeamOpacity < 0.01) {
        r.alive = false
      }
    }

    for (const t of this.dragTrails) {
      t.opacity *= 0.92
      if (t.opacity < 0.01) {
        t.alive = false
      }
    }

    this.ripples = this.ripples.filter((r) => r.alive)
    this.dragTrails = this.dragTrails.filter((t) => t.alive)
  }

  getActiveRipples(): { x: number; y: number; radius: number; strength: number }[] {
    return this.ripples.map((r) => ({
      x: r.x,
      y: r.y,
      radius: r.radius,
      strength: r.strength,
    }))
  }

  render(ctx: CanvasRenderingContext2D) {
    const colors = THEMES[this.theme]

    for (const r of this.ripples) {
      if (r.opacity > 0.01) {
        const ringWidth = 2 + r.strength * 2

        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${this.hexToRgbStr(colors.glowColor)},${r.opacity * 0.5})`
        ctx.lineWidth = ringWidth + 4
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${this.hexToRgbStr(colors.primary)},${r.opacity})`
        ctx.lineWidth = ringWidth
        ctx.stroke()

        if (r.radius > 10) {
          const innerGlow = ctx.createRadialGradient(
            r.x,
            r.y,
            Math.max(0, r.radius - 8),
            r.x,
            r.y,
            r.radius + 4
          )
          innerGlow.addColorStop(0, `rgba(${this.hexToRgbStr(colors.primary)},0)`)
          innerGlow.addColorStop(0.5, `rgba(${this.hexToRgbStr(colors.primary)},${r.opacity * 0.15})`)
          innerGlow.addColorStop(1, `rgba(${this.hexToRgbStr(colors.primary)},0)`)

          ctx.beginPath()
          ctx.arc(r.x, r.y, r.radius + 4, 0, Math.PI * 2)
          ctx.fillStyle = innerGlow
          ctx.fill()
        }
      }

      if (r.lightBeamOpacity > 0.01 && r.lightBeamHeight > 0) {
        const beamWidth = 3 + r.strength * 4
        const gradient = ctx.createLinearGradient(
          r.x,
          r.y,
          r.x,
          r.y - r.lightBeamHeight
        )
        gradient.addColorStop(0, `rgba(${this.hexToRgbStr(colors.primary)},${r.lightBeamOpacity})`)
        gradient.addColorStop(0.5, `rgba(${this.hexToRgbStr(colors.glowColor)},${r.lightBeamOpacity * 0.4})`)
        gradient.addColorStop(1, `rgba(${this.hexToRgbStr(colors.primary)},0)`)

        ctx.beginPath()
        ctx.moveTo(r.x - beamWidth, r.y)
        ctx.lineTo(r.x - beamWidth * 0.3, r.y - r.lightBeamHeight)
        ctx.lineTo(r.x + beamWidth * 0.3, r.y - r.lightBeamHeight)
        ctx.lineTo(r.x + beamWidth, r.y)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        const outerGlow = ctx.createLinearGradient(
          r.x,
          r.y,
          r.x,
          r.y - r.lightBeamHeight * 0.7
        )
        outerGlow.addColorStop(0, `rgba(${this.hexToRgbStr(colors.glowColor)},${r.lightBeamOpacity * 0.2})`)
        outerGlow.addColorStop(1, `rgba(${this.hexToRgbStr(colors.glowColor)},0)`)

        ctx.beginPath()
        ctx.moveTo(r.x - beamWidth * 2, r.y)
        ctx.lineTo(r.x, r.y - r.lightBeamHeight * 0.7)
        ctx.lineTo(r.x + beamWidth * 2, r.y)
        ctx.closePath()
        ctx.fillStyle = outerGlow
        ctx.fill()
      }
    }

    for (const t of this.dragTrails) {
      const gradient = ctx.createRadialGradient(
        t.x,
        t.y,
        0,
        t.x,
        t.y,
        t.radius
      )
      gradient.addColorStop(0, `rgba(${this.hexToRgbStr(colors.primary)},${t.opacity})`)
      gradient.addColorStop(0.4, `rgba(${this.hexToRgbStr(colors.glowColor)},${t.opacity * 0.4})`)
      gradient.addColorStop(1, `rgba(${this.hexToRgbStr(colors.primary)},0)`)

      ctx.beginPath()
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }
  }

  private hexToRgbStr(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  }
}
