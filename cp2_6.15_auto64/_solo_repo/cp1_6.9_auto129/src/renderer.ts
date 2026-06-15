import { GameModel, hexToRgb } from './model'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private waveOffset: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = width + 'px'
    this.canvas.style.height = height + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  render(model: GameModel, deltaTime: number) {
    const ctx = this.ctx
    const { canvasWidth: W, canvasHeight: H } = model

    this.waveOffset += deltaTime * 0.002

    ctx.clearRect(0, 0, W, H)
    this.drawBackground(W, H)
    this.drawRiver(model, W, H)
    this.drawPortals(model, deltaTime)
    this.drawFragments(model, deltaTime)
    this.drawBursts(model, deltaTime)
    this.drawParticles(model)
    this.drawBoat(model, deltaTime)
    this.drawScreenFlash(model, W, H)
    this.drawFadeOut(model, W, H)
  }

  private drawBackground(W: number, H: number) {
    const ctx = this.ctx
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0B0C10')
    grad.addColorStop(1, '#1F2833')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    ctx.save()
    for (let i = 0; i < 30; i++) {
      const x = (i * 73 + this.waveOffset * 50) % W
      const y = (i * 41) % H
      const size = (i % 3) * 0.5 + 0.5
      const alpha = 0.3 + Math.sin(this.waveOffset * 3 + i) * 0.2
      ctx.fillStyle = `rgba(102, 252, 241, ${alpha * 0.4})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawRiver(model: GameModel, W: number, H: number) {
    const ctx = this.ctx
    const { riverLeft, riverRight, river, waveOffset } = { ...model, waveOffset: this.waveOffset }
    const center = (riverLeft + riverRight) / 2

    ctx.save()

    const riverGrad = ctx.createLinearGradient(riverLeft, 0, riverRight, 0)
    riverGrad.addColorStop(0, 'rgba(69, 162, 158, 0.15)')
    riverGrad.addColorStop(0.3, 'rgba(102, 252, 241, 0.1)')
    riverGrad.addColorStop(0.5, 'rgba(69, 162, 158, 0.2)')
    riverGrad.addColorStop(0.7, 'rgba(102, 252, 241, 0.1)')
    riverGrad.addColorStop(1, 'rgba(69, 162, 158, 0.15)')
    ctx.fillStyle = riverGrad
    ctx.fillRect(riverLeft, 0, riverRight - riverLeft, H)

    const waveCount = 5
    for (let w = 0; w < waveCount; w++) {
      const wavelength = 80 + (w * 15)
      const amplitude = 2 + (w % 3)
      const offset = waveOffset * (1 + w * 0.2) + w * 2
      const alpha = 0.12 + (w * 0.015)

      ctx.beginPath()
      ctx.moveTo(riverLeft, 0)

      for (let y = 0; y <= H; y += 4) {
        const wave = Math.sin(y / wavelength + offset) * amplitude
        const leftX = riverLeft + wave + (center - riverLeft) * 0.02
        ctx.lineTo(leftX, y)
      }
      for (let y = H; y >= 0; y -= 4) {
        const wave = Math.sin(y / wavelength + offset + Math.PI) * amplitude
        const rightX = riverRight + wave - (riverRight - center) * 0.02
        ctx.lineTo(rightX, y)
      }
      ctx.closePath()

      const edgeGrad = ctx.createLinearGradient(riverLeft, 0, riverRight, 0)
      edgeGrad.addColorStop(0, `rgba(102, 252, 241, ${alpha})`)
      edgeGrad.addColorStop(0.5, `rgba(69, 162, 158, ${alpha * 0.3})`)
      edgeGrad.addColorStop(1, `rgba(102, 252, 241, ${alpha})`)
      ctx.fillStyle = edgeGrad
      ctx.fill()
    }

    for (let w = 0; w < 4; w++) {
      const wavelength = 100 + w * 30
      const amplitude = 1.5 + w * 0.5
      const offset = waveOffset * (0.8 + w * 0.15) + w * 1.5

      ctx.beginPath()
      for (let x = riverLeft; x <= riverRight; x += 3) {
        const wave = Math.sin((x - center) / wavelength + offset) * amplitude
        const y = 50 + w * 80 + wave
        if (x === riverLeft) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.strokeStyle = `rgba(102, 252, 241, ${0.06 + w * 0.015})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawBoat(model: GameModel, deltaTime: number) {
    const ctx = this.ctx
    const { boat } = model

    ctx.save()
    ctx.translate(boat.x, boat.y)
    ctx.rotate(boat.headingAngle + Math.PI / 2)

    const boatGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 40)
    boatGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
    boatGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = boatGlow
    ctx.beginPath()
    ctx.ellipse(0, 0, 25, 40, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(0, -15)
    ctx.quadraticCurveTo(8, -5, 5, 10)
    ctx.quadraticCurveTo(0, 15, -5, 10)
    ctx.quadraticCurveTo(-8, -5, 0, -15)
    ctx.closePath()

    const boatGrad = ctx.createLinearGradient(-8, 0, 8, 0)
    boatGrad.addColorStop(0, 'rgba(180, 220, 255, 0.6)')
    boatGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)')
    boatGrad.addColorStop(1, 'rgba(180, 220, 255, 0.6)')
    ctx.fillStyle = boatGrad
    ctx.fill()

    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
    ctx.shadowBlur = 10
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.shadowBlur = 0

    const lanternY = -18
    const lanternRadius = boat.lanternRadius
    const lanternColor = boat.lanternColor
    const lc = hexToRgb(lanternColor)

    const outerGlow = ctx.createRadialGradient(0, lanternY, 0, 0, lanternY, lanternRadius * 2.5)
    outerGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, 0.4)`)
    outerGlow.addColorStop(0.5, `rgba(${lc.r}, ${lc.g}, ${lc.b}, 0.15)`)
    outerGlow.addColorStop(1, `rgba(${lc.r}, ${lc.g}, ${lc.b}, 0)`)
    ctx.fillStyle = outerGlow
    ctx.beginPath()
    ctx.arc(0, lanternY, lanternRadius * 2.5, 0, Math.PI * 2)
    ctx.fill()

    const midGlow = ctx.createRadialGradient(0, lanternY, 0, 0, lanternY, lanternRadius)
    midGlow.addColorStop(0, `rgba(${lc.r}, ${lc.g}, ${lc.b}, 0.7)`)
    midGlow.addColorStop(1, `rgba(${lc.r}, ${lc.g}, ${lc.b}, 0)`)
    ctx.fillStyle = midGlow
    ctx.beginPath()
    ctx.arc(0, lanternY, lanternRadius, 0, Math.PI * 2)
    ctx.fill()

    const pulseR = lanternRadius * (0.3 + Math.sin(Date.now() * 0.005) * 0.1)
    ctx.shadowColor = `rgba(${lc.r}, ${lc.g}, ${lc.b}, 1)`
    ctx.shadowBlur = 20
    ctx.fillStyle = `rgba(${lc.r}, ${lc.g}, ${lc.b}, 1)`
    ctx.beginPath()
    ctx.arc(0, lanternY, pulseR, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.restore()
  }

  private drawFragments(model: GameModel, deltaTime: number) {
    const ctx = this.ctx

    for (const frag of model.fragments) {
      if (frag.collected) continue

      ctx.save()
      ctx.translate(frag.position.x, frag.position.y)
      ctx.rotate(frag.rotation)

      const fc = hexToRgb(frag.color)

      const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, frag.glowRadius)
      outerGlow.addColorStop(0, `rgba(${fc.r}, ${fc.g}, ${fc.b}, ${frag.glowAlpha})`)
      outerGlow.addColorStop(0.6, `rgba(${fc.r}, ${fc.g}, ${fc.b}, ${frag.glowAlpha * 0.4})`)
      outerGlow.addColorStop(1, `rgba(${fc.r}, ${fc.g}, ${fc.b}, 0)`)
      ctx.fillStyle = outerGlow
      ctx.beginPath()
      ctx.arc(0, 0, frag.glowRadius, 0, Math.PI * 2)
      ctx.fill()

      const r = frag.diameter / 2
      ctx.shadowColor = `rgba(${fc.r}, ${fc.g}, ${fc.b}, 0.8)`
      ctx.shadowBlur = 12

      ctx.beginPath()
      ctx.moveTo(0, -r)
      ctx.lineTo(r * 0.7, 0)
      ctx.lineTo(0, r)
      ctx.lineTo(-r * 0.7, 0)
      ctx.closePath()

      const fragGrad = ctx.createLinearGradient(-r, -r, r, r)
      fragGrad.addColorStop(0, `rgba(255, 255, 255, 0.9)`)
      fragGrad.addColorStop(0.5, `rgba(${fc.r}, ${fc.g}, ${fc.b}, 1)`)
      fragGrad.addColorStop(1, `rgba(${fc.r * 0.6}, ${fc.g * 0.6}, ${fc.b * 0.6}, 0.9)`)
      ctx.fillStyle = fragGrad
      ctx.fill()

      ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.restore()
    }
  }

  private drawParticles(model: GameModel) {
    const ctx = this.ctx

    for (const p of model.particles) {
      const lifeRatio = 1 - p.life / p.maxLife
      const size = p.startSize * (1 - lifeRatio * 0.9)
      const alpha = p.startAlpha * (1 - lifeRatio)

      if (alpha <= 0 || size <= 0) continue

      const pc = hexToRgb(p.color)
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.fillStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, 1)`
      ctx.shadowColor = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${alpha})`
      ctx.shadowBlur = p.type === 'burst' ? 8 : 4
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.1, size), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawPortals(model: GameModel, deltaTime: number) {
    const ctx = this.ctx

    for (const portal of model.portals) {
      if (!portal.active) continue

      ctx.save()
      ctx.translate(portal.x, portal.y)

      const pc = hexToRgb(portal.color)
      const pulsePhase = (portal.pulseTimer % portal.pulsePeriod) / portal.pulsePeriod
      const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.15

      const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, portal.height * 1.5)
      outerGlow.addColorStop(0, `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.4)`)
      outerGlow.addColorStop(1, `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0)`)
      ctx.fillStyle = outerGlow
      ctx.beginPath()
      ctx.ellipse(0, 0, portal.width * 1.2 * pulseScale, portal.height * 1.3 * pulseScale, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.save()
      ctx.scale(pulseScale, pulseScale)
      ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.8)`
      ctx.lineWidth = 3
      ctx.shadowColor = `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.9)`
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.ellipse(0, 0, portal.width / 2, portal.height / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()

      ctx.save()
      ctx.rotate(portal.rotation)
      const spiralR = Math.min(portal.width, portal.height) * 0.35
      const spiralGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, spiralR)
      spiralGrad.addColorStop(0, `rgba(255, 255, 255, 0.9)`)
      spiralGrad.addColorStop(0.5, `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.6)`)
      spiralGrad.addColorStop(1, `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0)`)
      ctx.fillStyle = spiralGrad

      ctx.beginPath()
      for (let t = 0; t < Math.PI * 6; t += 0.1) {
        const r = (t / (Math.PI * 6)) * spiralR
        const x = r * Math.cos(t)
        const y = r * Math.sin(t)
        if (t === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.9)`
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.rotate(-portal.rotation * 0.5)
      ctx.strokeStyle = `rgba(255, 255, 255, 0.7)`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let t = 0; t < Math.PI * 4; t += 0.15) {
        const r = (t / (Math.PI * 4)) * spiralR * 0.8
        const x = r * Math.cos(t)
        const y = r * Math.sin(t)
        if (t === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()

      ctx.restore()
    }
  }

  private drawBursts(model: GameModel, deltaTime: number) {
    const ctx = this.ctx

    for (const burst of model.bursts) {
      const progress = 1 - burst.timer / burst.duration
      const currentDiameter = burst.startDiameter + (burst.endDiameter - burst.startDiameter) * progress
      const alpha = 1 - progress

      const bc = hexToRgb(burst.color)

      ctx.save()
      ctx.globalAlpha = Math.max(0, alpha * 0.6)

      const burstGrad = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, currentDiameter)
      burstGrad.addColorStop(0, `rgba(255, 255, 255, 0.9)`)
      burstGrad.addColorStop(0.4, `rgba(${bc.r}, ${bc.g}, ${bc.b}, 0.7)`)
      burstGrad.addColorStop(1, `rgba(${bc.r}, ${bc.g}, ${bc.b}, 0)`)
      ctx.fillStyle = burstGrad
      ctx.beginPath()
      ctx.arc(burst.x, burst.y, currentDiameter, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  private drawScreenFlash(model: GameModel, W: number, H: number) {
    if (!model.screenFlash.active) return

    const flash = model.screenFlash
    const progress = 1 - flash.timer / flash.duration
    const alpha = Math.max(0, Math.sin(progress * Math.PI)) * 0.6

    const fc = hexToRgb(flash.color)

    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.fillStyle = `rgba(${fc.r}, ${fc.g}, ${fc.b}, 1)`
    this.ctx.fillRect(0, 0, W, H)
    this.ctx.restore()
  }

  private drawFadeOut(model: GameModel, W: number, H: number) {
    if (!model.fadeOut.active) return

    const fade = model.fadeOut
    const progress = fade.timer / fade.duration
    const alpha = Math.min(1, progress)

    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.fillStyle = '#2a2a2a'
    this.ctx.fillRect(0, 0, W, H)
    this.ctx.restore()
  }
}
