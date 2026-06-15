export interface SpiderState {
  x: number
  y: number
  patrolA: { x: number; y: number }
  patrolB: { x: number; y: number }
  phase: number
  speed: number
  isChasing: boolean
  chaseSpeed: number
  radius: number
  webAngle: number
  legPhase: number
  alertLevel: number
}

export class ShadowSpider {
  spiders: SpiderState[] = []
  private canvasH: number = 600
  private nextSpawnX: number = 400
  private spawnInterval: number = 500

  constructor(canvasW: number, canvasH: number) {
    this.canvasH = canvasH
    this.nextSpawnX = 400
    const count = Math.ceil(canvasW / this.spawnInterval)
    for (let i = 0; i < count; i++) {
      this.spawnSpider()
    }
  }

  private spawnSpider(): void {
    const x = this.nextSpawnX
    const y = this.canvasH * 0.25 + Math.random() * this.canvasH * 0.5
    const patrolRange = 80 + Math.random() * 100

    this.spiders.push({
      x,
      y,
      patrolA: { x: x - patrolRange / 2, y: y + (Math.random() - 0.5) * 40 },
      patrolB: { x: x + patrolRange / 2, y: y + (Math.random() - 0.5) * 40 },
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.8,
      isChasing: false,
      chaseSpeed: 1.8 + Math.random() * 1.0,
      radius: 16,
      webAngle: Math.random() * Math.PI * 2,
      legPhase: 0,
      alertLevel: 0,
    })

    this.nextSpawnX += this.spawnInterval + Math.random() * 200
  }

  update(dt: number, playerX: number, playerY: number, cameraX: number, canvasW: number): void {
    while (this.nextSpawnX < cameraX + canvasW + 800) {
      this.spawnSpider()
    }

    for (const spider of this.spiders) {
      const dx = playerX - spider.x
      const dy = playerY - spider.y
      const distToPlayer = Math.sqrt(dx * dx + dy * dy)

      const chaseRange = 180
      if (distToPlayer < chaseRange) {
        spider.alertLevel = Math.min(1, spider.alertLevel + dt * 2)
        if (spider.alertLevel > 0.5) {
          spider.isChasing = true
        }
      } else {
        spider.alertLevel = Math.max(0, spider.alertLevel - dt * 0.5)
        if (spider.alertLevel < 0.2) {
          spider.isChasing = false
        }
      }

      if (spider.isChasing) {
        const angle = Math.atan2(dy, dx)
        spider.x += Math.cos(angle) * spider.chaseSpeed
        spider.y += Math.sin(angle) * spider.chaseSpeed
      } else {
        spider.phase += spider.speed * dt
        const t = (Math.sin(spider.phase) + 1) / 2
        spider.x = spider.patrolA.x + (spider.patrolB.x - spider.patrolA.x) * t
        spider.y = spider.patrolA.y + (spider.patrolB.y - spider.patrolA.y) * t
      }

      spider.legPhase += dt * 5
      spider.webAngle += dt * 0.3
    }

    this.spiders = this.spiders.filter(s => s.x > cameraX - 300)
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const spider of this.spiders) {
      const sx = spider.x - camX
      const sy = spider.y - camY
      if (sx < -50 || sx > ctx.canvas.width + 50) continue

      const alertGlow = spider.alertLevel * 0.4

      if (spider.isChasing || spider.alertLevel > 0.3) {
        ctx.beginPath()
        ctx.arc(sx, sy, spider.radius + 10, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 40, 40, ${alertGlow * 0.2})`
        ctx.fill()
      }

      this.drawWeb(ctx, sx, sy, spider)

      ctx.save()
      ctx.translate(sx, sy)

      const legCount = 4
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < legCount; i++) {
          const baseAngle = (side * 0.3) + (i * 0.25 * side)
          const legLen = 14 + i * 2
          const wiggle = Math.sin(spider.legPhase + i * 0.8) * 3

          const midX = Math.cos(baseAngle - 0.5 * side) * legLen * 0.6
          const midY = Math.sin(baseAngle - 0.5 * side) * legLen * 0.6 + wiggle
          const endX = Math.cos(baseAngle) * legLen
          const endY = Math.sin(baseAngle) * legLen + wiggle * 0.5

          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.quadraticCurveTo(midX, midY, endX, endY + 4)
          ctx.strokeStyle = `rgba(120, 20, 30, ${0.6 + alertGlow})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      ctx.beginPath()
      ctx.ellipse(0, 0, spider.radius * 0.7, spider.radius * 0.55, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(140, 25, 35, ${0.75 + alertGlow * 0.2})`
      ctx.fill()

      ctx.beginPath()
      ctx.ellipse(0, -spider.radius * 0.4, spider.radius * 0.45, spider.radius * 0.35, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(160, 30, 40, ${0.7 + alertGlow * 0.2})`
      ctx.fill()

      const eyeGlow = spider.isChasing ? 1 : 0.5
      for (const ex of [-3, 3]) {
        ctx.beginPath()
        ctx.arc(ex, -spider.radius * 0.45, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, ${spider.isChasing ? 60 : 120}, 60, ${eyeGlow})`
        ctx.fill()
      }

      ctx.restore()
    }
  }

  private drawWeb(ctx: CanvasRenderingContext2D, sx: number, sy: number, spider: SpiderState): void {
    const webAlpha = 0.08 + spider.alertLevel * 0.05
    const webSize = 30

    ctx.save()
    ctx.translate(sx, sy - spider.radius * 0.4)
    ctx.rotate(spider.webAngle)

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * webSize, Math.sin(angle) * webSize)
      ctx.strokeStyle = `rgba(180, 180, 200, ${webAlpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    for (let r = 8; r < webSize; r += 8) {
      ctx.beginPath()
      for (let i = 0; i <= 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const px = Math.cos(angle) * r
        const py = Math.sin(angle) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.strokeStyle = `rgba(180, 180, 200, ${webAlpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    ctx.restore()
  }

  checkCollision(bx: number, by: number, bRadius: number): SpiderState | null {
    for (const spider of this.spiders) {
      const dx = spider.x - bx
      const dy = spider.y - by
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < spider.radius + bRadius) {
        return spider
      }
    }
    return null
  }
}
