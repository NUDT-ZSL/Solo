import { Maze, Mirror } from './Maze'

export interface LaserSegment {
  startX: number
  startY: number
  endX: number
  endY: number
  intensity: number
  hitWall: boolean
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

export class Laser {
  segments: LaserSegment[]
  particles: Particle[]
  maxReflections: number
  flickerTime: number
  needsRecalc: boolean
  hitExit: boolean

  constructor() {
    this.segments = []
    this.particles = []
    this.maxReflections = 20
    this.flickerTime = 0
    this.needsRecalc = true
    this.hitExit = false
  }

  calculatePath(maze: Maze) {
    this.segments = []
    this.hitExit = false

    const source = maze.laserSource
    const startPos = maze.getCellCenter(source.col, source.row)
    let dirX = Math.cos(source.direction)
    let dirY = Math.sin(source.direction)

    let curX = startPos.x
    let curY = startPos.y
    let intensity = 1.0

    for (let bounce = 0; bounce < this.maxReflections; bounce++) {
      let nearestT = Infinity
      let hitType: 'wall' | 'mirror' | null = null
      let hitMirror: Mirror | null = null
      let hitNormalX = 0
      let hitNormalY = 0

      for (const seg of maze.wallSegments) {
        const t = this.raySegmentIntersect(
          curX, curY, dirX, dirY,
          seg.x1, seg.y1, seg.x2, seg.y2
        )
        if (t !== null && t > 0.5 && t < nearestT) {
          const dx = seg.x2 - seg.x1
          const dy = seg.y2 - seg.y1
          const len = Math.hypot(dx, dy)
          if (len > 0) {
            hitNormalX = -dy / len
            hitNormalY = dx / len
            if (hitNormalX * dirX + hitNormalY * dirY > 0) {
              hitNormalX = -hitNormalX
              hitNormalY = -hitNormalY
            }
          }
          nearestT = t
          hitType = 'wall'
        }
      }

      for (const mirror of maze.mirrors) {
        const center = maze.getCellCenter(mirror.col, mirror.row)
        const halfLen = maze.cellSize * 0.35
        const mx1 = center.x + Math.cos(mirror.angle) * halfLen
        const my1 = center.y + Math.sin(mirror.angle) * halfLen
        const mx2 = center.x - Math.cos(mirror.angle) * halfLen
        const my2 = center.y - Math.sin(mirror.angle) * halfLen

        const t = this.raySegmentIntersect(
          curX, curY, dirX, dirY,
          mx1, my1, mx2, my2
        )
        if (t !== null && t > 0.5 && t < nearestT) {
          const dx = mx2 - mx1
          const dy = my2 - my1
          const len = Math.hypot(dx, dy)
          if (len > 0) {
            hitNormalX = -dy / len
            hitNormalY = dx / len
            if (hitNormalX * dirX + hitNormalY * dirY > 0) {
              hitNormalX = -hitNormalX
              hitNormalY = -hitNormalY
            }
          }
          nearestT = t
          hitType = 'mirror'
          hitMirror = mirror
        }
      }

      if (hitType === null || nearestT === Infinity) {
        this.segments.push({
          startX: curX,
          startY: curY,
          endX: curX + dirX * 2000,
          endY: curY + dirY * 2000,
          intensity,
          hitWall: false
        })
        break
      }

      const hitX = curX + dirX * nearestT
      const hitY = curY + dirY * nearestT

      this.segments.push({
        startX: curX,
        startY: curY,
        endX: hitX,
        endY: hitY,
        intensity,
        hitWall: hitType === 'wall'
      })

      if (hitType === 'wall') {
        const exitCenter = maze.getCellCenter(maze.exit.col, maze.exit.row)
        const distToExit = Math.hypot(hitX - exitCenter.x, hitY - exitCenter.y)
        if (distToExit < maze.cellSize * 0.5) {
          this.hitExit = true
        }
        this.spawnHitParticles(hitX, hitY, 8)
        break
      }

      if (hitType === 'mirror') {
        const dot = dirX * hitNormalX + dirY * hitNormalY
        dirX = dirX - 2 * dot * hitNormalX
        dirY = dirY - 2 * dot * hitNormalY
        const len = Math.hypot(dirX, dirY)
        if (len > 0) {
          dirX /= len
          dirY /= len
        }
        curX = hitX + dirX * 1
        curY = hitY + dirY * 1
        intensity *= 0.92
        this.spawnHitParticles(hitX, hitY, 3)
      }
    }

    this.needsRecalc = false
  }

  raySegmentIntersect(
    ox: number, oy: number, dx: number, dy: number,
    x1: number, y1: number, x2: number, y2: number
  ): number | null {
    const sx = x2 - x1
    const sy = y2 - y1
    const denom = dx * sy - dy * sx
    if (Math.abs(denom) < 1e-8) return null

    const t = ((x1 - ox) * sy - (y1 - oy) * sx) / denom
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom

    if (t > 0 && u >= 0 && u <= 1) return t
    return null
  }

  spawnHitParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 30 + Math.random() * 60
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.4 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '255,100,50' : '255,200,50',
        alpha: 1
      })
    }
  }

  update(dt: number) {
    this.flickerTime += dt

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.96
      p.vy *= 0.96
      p.life -= dt
      p.alpha = Math.max(0, p.life / p.maxLife)
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const flicker = 0.85 + 0.15 * Math.sin(this.flickerTime * 30)

    ctx.save()
    for (const seg of this.segments) {
      const alpha = seg.intensity * flicker
      ctx.shadowColor = `rgba(255, 80, 30, ${alpha * 0.8})`
      ctx.shadowBlur = 12

      const grad = ctx.createLinearGradient(seg.startX, seg.startY, seg.endX, seg.endY)
      grad.addColorStop(0, `rgba(255, 60, 30, ${alpha})`)
      grad.addColorStop(0.5, `rgba(255, 150, 30, ${alpha})`)
      grad.addColorStop(1, `rgba(255, 215, 0, ${alpha * 0.8})`)

      ctx.strokeStyle = grad
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(seg.startX, seg.startY)
      ctx.lineTo(seg.endX, seg.endY)
      ctx.stroke()

      ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(255, 255, 200, ${alpha * 0.3})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(seg.startX, seg.startY)
      ctx.lineTo(seg.endX, seg.endY)
      ctx.stroke()
    }

    for (const p of this.particles) {
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`
      ctx.shadowColor = `rgba(${p.color}, ${p.alpha * 0.5})`
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
    ctx.restore()
  }
}
