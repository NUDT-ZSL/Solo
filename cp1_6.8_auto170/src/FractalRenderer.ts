import { CoreEngine } from './CoreEngine'
import { FragmentData, Particle, StarPoint } from './FragmentData'

export class FractalRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private engine: CoreEngine
  private dpr: number = 1
  private animFrameId: number = 0
  private lastTime: number = 0
  private fadeIn: number = 0

  constructor(canvas: HTMLCanvasElement, engine: CoreEngine) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.engine = engine
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  start() {
    this.lastTime = performance.now()
    this.fadeIn = 0
    const loop = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.05)
      this.lastTime = time
      this.fadeIn = Math.min(1, this.fadeIn + dt * 0.8)
      this.engine.update(dt)
      this.render()
      this.animFrameId = requestAnimationFrame(loop)
    }
    this.animFrameId = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.animFrameId)
  }

  private render() {
    const w = this.canvas.width / this.dpr
    const h = this.canvas.height / this.dpr
    const ctx = this.ctx

    ctx.clearRect(0, 0, w, h)

    ctx.globalAlpha = this.fadeIn
    this.drawBackground(w, h)
    this.drawStars(w, h)

    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(this.engine.view.zoom, this.engine.view.zoom)
    ctx.translate(-this.engine.view.offsetX, -this.engine.view.offsetY)

    this.drawFragments()
    this.drawParticles()

    ctx.restore()
    ctx.globalAlpha = 1
  }

  private drawBackground(w: number, h: number) {
    const ctx = this.ctx
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
    grad.addColorStop(0, '#12121f')
    grad.addColorStop(0.5, '#0a0a14')
    grad.addColorStop(1, '#050508')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  private drawStars(w: number, h: number) {
    const ctx = this.ctx
    const view = this.engine.view

    for (const star of this.engine.stars) {
      const sx = (star.x - view.offsetX) * view.zoom * 0.15 + w / 2
      const sy = (star.y - view.offsetY) * view.zoom * 0.15 + h / 2

      if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue

      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
      const alpha = star.opacity * twinkle

      ctx.beginPath()
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`
      ctx.fill()
    }
  }

  private drawFragments() {
    const ctx = this.ctx
    const w = this.canvas.width / this.dpr
    const h = this.canvas.height / this.dpr
    const view = this.engine.view

    const viewLeft = view.offsetX - w / 2 / view.zoom - 100
    const viewRight = view.offsetX + w / 2 / view.zoom + 100
    const viewTop = view.offsetY - h / 2 / view.zoom - 100
    const viewBottom = view.offsetY + h / 2 / view.zoom + 100

    for (const frag of this.engine.fragments) {
      if (frag.x < viewLeft || frag.x > viewRight || frag.y < viewTop || frag.y > viewBottom) continue
      this.drawSingleFragment(frag)
    }
  }

  private drawSingleFragment(frag: FragmentData) {
    const ctx = this.ctx
    const now = performance.now()
    const age = (now - frag.birthTime) / 1000
    const entryScale = Math.min(1, age * 4)
    const easeScale = 1 + Math.sin(entryScale * Math.PI * 0.5) * 0.15
    const finalScale = frag.scale * easeScale

    ctx.save()
    ctx.translate(frag.x, frag.y)
    ctx.rotate(frag.rotation)
    ctx.scale(finalScale, finalScale)

    const reflectedColors = this.engine.getReflectedColors(frag.id)
    this.drawFragmentBody(frag, reflectedColors)
    this.drawFragmentGlow(frag)

    ctx.restore()
  }

  private drawFragmentBody(frag: FragmentData, reflectedColors: { h: number; s: number; l: number }[]) {
    const ctx = this.ctx
    const verts = frag.vertices

    ctx.beginPath()
    ctx.moveTo(verts[0][0], verts[0][1])
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i][0], verts[i][1])
    }
    ctx.closePath()

    if (reflectedColors.length > 0) {
      const cx = verts.reduce((s, v) => s + v[0], 0) / verts.length
      const cy = verts.reduce((s, v) => s + v[1], 0) / verts.length
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60)

      for (let i = 0; i < reflectedColors.length; i++) {
        const c = reflectedColors[i]
        const stop = i / (reflectedColors.length - 1 || 1)
        grad.addColorStop(stop, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${frag.opacity * 0.7})`)
      }

      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = `hsla(${frag.hue}, 70%, 55%, ${frag.opacity * 0.6})`
    }

    ctx.fill()

    ctx.strokeStyle = `hsla(${frag.hue}, 80%, 70%, ${frag.opacity * 0.8})`
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  private drawFragmentGlow(frag: FragmentData) {
    const ctx = this.ctx
    const verts = frag.vertices

    ctx.save()
    ctx.shadowColor = `hsla(${frag.hue}, 90%, 65%, ${frag.opacity * 0.6})`
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    ctx.beginPath()
    ctx.moveTo(verts[0][0], verts[0][1])
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i][0], verts[i][1])
    }
    ctx.closePath()

    ctx.strokeStyle = `hsla(${frag.hue}, 85%, 72%, ${frag.opacity * 0.5})`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  private drawParticles() {
    const ctx = this.ctx
    for (const p of this.engine.particles) {
      const alpha = Math.max(0, p.life) * 0.9
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life)
      grad.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${alpha})`)
      grad.addColorStop(1, `hsla(${p.hue}, 80%, 50%, 0)`)
      ctx.fillStyle = grad
      ctx.fill()
    }
  }
}
