import type { Level, Wall, PressurePlate, LaserBeam, Door, PushableBlock, Trap } from './LevelData'
import type { Player } from './Player'
import type { Echo } from './EchoSystem'

export interface WinParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export class PuzzleManager {
  level: Level
  winParticles: WinParticle[]
  winEffectActive: boolean
  winEffectStartTime: number
  deathFlashActive: boolean
  deathFlashStartTime: number
  onWin: (() => void) | null
  onDeath: (() => void) | null

  constructor(level: Level) {
    this.level = level
    this.winParticles = []
    this.winEffectActive = false
    this.winEffectStartTime = 0
    this.deathFlashActive = false
    this.deathFlashStartTime = 0
    this.onWin = null
    this.onDeath = null
  }

  resetLevel(level: Level) {
    this.level = level
    this.winParticles = []
    this.winEffectActive = false
    this.deathFlashActive = false
  }

  circleRectCollide(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw))
    const closestY = Math.max(ry, Math.min(cy, ry + rh))
    const dx = cx - closestX
    const dy = cy - closestY
    return dx * dx + dy * dy < cr * cr
  }

  checkWallCollision(x: number, y: number, r: number): boolean {
    for (const wall of this.level.walls) {
      if (this.circleRectCollide(x, y, r, wall.x, wall.y, wall.w, wall.h)) {
        return true
      }
    }
    for (const door of this.level.doors) {
      if (!door.open && this.circleRectCollide(x, y, r, door.x, door.y, door.w, door.h)) {
        return true
      }
    }
    return false
  }

  checkBlockCollision(x: number, y: number, r: number, excludeId?: string): PushableBlock | null {
    for (const block of this.level.blocks) {
      if (excludeId && block.id === excludeId) continue
      if (this.circleRectCollide(x, y, r, block.x, block.y, block.size, block.size)) {
        return block
      }
    }
    return null
  }

  pointInCircle(px: number, py: number, cx: number, cy: number, cr: number): boolean {
    const dx = px - cx
    const dy = py - cy
    return dx * dx + dy * dy <= cr * cr
  }

  updatePlayerBlocks(player: Player) {
    for (const block of this.level.blocks) {
      if (this.circleRectCollide(player.x, player.y, player.radius, block.x, block.y, block.size, block.size)) {
        const bcx = block.x + block.size / 2
        const bcy = block.y + block.size / 2
        const dx = player.x - bcx
        const dy = player.y - bcy
        const pushSpeed = 1.8

        let newBlockX = block.targetX
        let newBlockY = block.targetY

        if (Math.abs(dx) > Math.abs(dy)) {
          newBlockX = block.targetX + (dx > 0 ? pushSpeed : -pushSpeed)
        } else {
          newBlockY = block.targetY + (dy > 0 ? pushSpeed : -pushSpeed)
        }

        if (!this.checkWallCollision(newBlockX + block.size / 2, newBlockY + block.size / 2, block.size / 2 - 2) &&
            !this.checkBlockCollision(newBlockX + block.size / 2, newBlockY + block.size / 2, block.size / 2 - 2, block.id)) {
          block.targetX = newBlockX
          block.targetY = newBlockY
        }
      }
    }

    for (const block of this.level.blocks) {
      const lerp = 0.18
      block.x += (block.targetX - block.x) * lerp
      block.y += (block.targetY - block.y) * lerp
    }
  }

  updateEchoBlocks(echoes: Echo[]) {
    for (const echo of echoes) {
      for (const block of this.level.blocks) {
        if (this.circleRectCollide(echo.x, echo.y, echo.radius, block.x, block.y, block.size, block.size)) {
          const bcx = block.x + block.size / 2
          const bcy = block.y + block.size / 2
          const dx = echo.x - bcx
          const dy = echo.y - bcy
          const pushSpeed = 1.2

          let newBlockX = block.targetX
          let newBlockY = block.targetY

          if (Math.abs(dx) > Math.abs(dy)) {
            newBlockX = block.targetX + (dx > 0 ? pushSpeed : -pushSpeed)
          } else {
            newBlockY = block.targetY + (dy > 0 ? pushSpeed : -pushSpeed)
          }

          if (!this.checkWallCollision(newBlockX + block.size / 2, newBlockY + block.size / 2, block.size / 2 - 2) &&
              !this.checkBlockCollision(newBlockX + block.size / 2, newBlockY + block.size / 2, block.size / 2 - 2, block.id)) {
            block.targetX = newBlockX
            block.targetY = newBlockY
          }
        }
      }
    }
  }

  circleRectOverlap(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw))
    const closestY = Math.max(ry, Math.min(cy, ry + rh))
    const dx = cx - closestX
    const dy = cy - closestY
    return dx * dx + dy * dy <= cr * cr
  }

  updatePlates(player: Player, echoes: Echo[]) {
    for (const plate of this.level.plates) {
      const px = plate.x
      const py = plate.y
      const ps = plate.size

      let playerOn = false

      if (this.circleRectOverlap(player.x, player.y, player.radius, px, py, ps, ps)) {
        playerOn = true
      }

      if (!playerOn) {
        for (const particle of player.particles) {
          if (this.circleRectOverlap(particle.x, particle.y, particle.size + 2, px, py, ps, ps)) {
            playerOn = true
            break
          }
        }
      }

      for (const block of this.level.blocks) {
        if (this.circleRectCollide(px + ps / 2, py + ps / 2, ps / 2 - 5, block.x, block.y, block.size, block.size)) {
          playerOn = true
        }
      }

      let echoOn = false
      for (const echo of echoes) {
        let echoTriggers = false

        if (this.circleRectOverlap(echo.x, echo.y, echo.radius, px, py, ps, ps)) {
          echoTriggers = true
        }

        if (!echoTriggers) {
          for (const particle of echo.particles) {
            if (this.circleRectOverlap(particle.x, particle.y, particle.size + 2, px, py, ps, ps)) {
              echoTriggers = true
              break
            }
          }
        }

        if (echoTriggers) {
          echoOn = true
          if (plate.required === 'echo' || plate.required === 'any') {
            echo.activatedPlateIds.add(plate.id)
          }
        }
      }

      switch (plate.required) {
        case 'player':
          plate.activated = playerOn
          break
        case 'echo':
          plate.activated = echoOn
          break
        case 'both':
          plate.activated = playerOn && echoOn
          break
        case 'any':
        default:
          plate.activated = playerOn || echoOn
          break
      }
    }
  }

  updateLasers(player: Player, echoes: Echo[]) {
    for (const laser of this.level.lasers) {
      let blocked = false

      if (this.lineCircleIntersect(laser.x1, laser.y1, laser.x2, laser.y2, player.x, player.y, player.radius)) {
        blocked = true
      }

      for (const echo of echoes) {
        if (this.lineCircleIntersect(laser.x1, laser.y1, laser.x2, laser.y2, echo.x, echo.y, echo.radius)) {
          blocked = true
        }
      }

      for (const block of this.level.blocks) {
        if (this.lineRectIntersect(laser.x1, laser.y1, laser.x2, laser.y2, block.x, block.y, block.size, block.size)) {
          blocked = true
        }
      }

      for (const wall of this.level.walls) {
        if (this.lineRectIntersect(laser.x1, laser.y1, laser.x2, laser.y2, wall.x, wall.y, wall.w, wall.h)) {
          blocked = true
        }
      }

      laser.active = !blocked

      const door = this.level.doors.find((d) => d.id === laser.linkedDoorId)
      if (door) {
        door.open = !laser.active
      }
    }
  }

  lineCircleIntersect(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, cr: number): boolean {
    const dx = x2 - x1
    const dy = y2 - y1
    const fx = x1 - cx
    const fy = y1 - cy
    const a = dx * dx + dy * dy
    const b = 2 * (fx * dx + fy * dy)
    const c = fx * fx + fy * fy - cr * cr
    let discriminant = b * b - 4 * a * c
    if (discriminant < 0) return false
    discriminant = Math.sqrt(discriminant)
    const t1 = (-b - discriminant) / (2 * a)
    const t2 = (-b + discriminant) / (2 * a)
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1)
  }

  lineRectIntersect(x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return this.lineLineIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
           this.lineLineIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
           this.lineLineIntersect(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
           this.lineLineIntersect(x1, y1, x2, y2, rx, ry + rh, rx, ry)
  }

  lineLineIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 0.0001) return false
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }

  countActivated(): number {
    let count = 0
    count += this.level.plates.filter((p) => p.activated).length
    count += this.level.doors.filter((d) => d.open).length
    return count
  }

  checkWin(player: Player): boolean {
    const activated = this.countActivated()
    if (activated < this.level.requiredActivations) return false

    const ex = this.level.exit.x + this.level.exit.size / 2
    const ey = this.level.exit.y + this.level.exit.size / 2
    const er = this.level.exit.size / 2

    if (this.pointInCircle(player.x, player.y, ex, ey, er)) {
      return true
    }
    return false
  }

  checkDeath(player: Player): boolean {
    for (const trap of this.level.traps) {
      if (this.circleRectCollide(player.x, player.y, player.radius - 4, trap.x, trap.y, trap.w, trap.h)) {
        return true
      }
    }
    return false
  }

  triggerWinEffect(exitX: number, exitY: number) {
    this.winEffectActive = true
    this.winEffectStartTime = Date.now()
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 8
      this.winParticles.push({
        x: exitX,
        y: exitY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 120 + Math.random() * 60,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#ffd700' : '#ffffff',
      })
    }
  }

  triggerDeathEffect() {
    this.deathFlashActive = true
    this.deathFlashStartTime = Date.now()
  }

  update(dt: number, player: Player, echoes: Echo[]) {
    this.updatePlayerBlocks(player)
    this.updateEchoBlocks(echoes)
    this.updatePlates(player, echoes)
    this.updateLasers(player, echoes)

    if (this.winEffectActive) {
      this.winParticles = this.winParticles.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12
        p.vx *= 0.99
        p.life -= 1
        return p.life > 0
      })
      if (Date.now() - this.winEffectStartTime > 3000) {
        this.winEffectActive = false
        this.onWin?.()
      }
    }

    if (this.deathFlashActive) {
      if (Date.now() - this.deathFlashStartTime > 1000) {
        this.deathFlashActive = false
        this.onDeath?.()
      }
    }
  }

  resetMechanisms() {
    this.level.plates.forEach((p) => { p.activated = false })
    this.level.lasers.forEach((l) => { l.active = true })
    this.level.doors.forEach((d) => { d.open = false })
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.level.walls.forEach((wall) => this.drawWall(ctx, wall, cameraX, cameraY))

    this.level.plates.forEach((plate) => this.drawPlate(ctx, plate, cameraX, cameraY))

    this.level.lasers.forEach((laser) => this.drawLaser(ctx, laser, cameraX, cameraY))

    this.level.doors.forEach((door) => this.drawDoor(ctx, door, cameraX, cameraY))

    this.level.blocks.forEach((block) => this.drawBlock(ctx, block, cameraX, cameraY))

    this.level.traps.forEach((trap) => this.drawTrap(ctx, trap, cameraX, cameraY))

    this.drawExit(ctx, cameraX, cameraY)

    if (this.winEffectActive) {
      this.winParticles.forEach((p) => {
        const alpha = p.life / p.maxLife
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(p.x - cameraX, p.y - cameraY, p.size * alpha, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.restore()
      })
    }
  }

  drawWall(ctx: CanvasRenderingContext2D, wall: Wall, cameraX: number, cameraY: number) {
    const x = wall.x - cameraX
    const y = wall.y - cameraY

    const grad = ctx.createLinearGradient(x, y, x, y + wall.h)
    grad.addColorStop(0, '#2a2a4e')
    grad.addColorStop(1, '#1e1e3e')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, wall.w, wall.h)

    ctx.save()
    ctx.strokeStyle = '#00a8ff'
    ctx.shadowColor = '#00a8ff'
    ctx.shadowBlur = 12
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, wall.w, wall.h)
    ctx.restore()
  }

  drawPlate(ctx: CanvasRenderingContext2D, plate: PressurePlate, cameraX: number, cameraY: number) {
    const x = plate.x - cameraX
    const y = plate.y - cameraY
    const s = plate.size

    ctx.save()
    ctx.fillStyle = '#1a1a2a'
    ctx.fillRect(x - 4, y - 4, s + 8, s + 8)

    ctx.fillStyle = plate.activated ? '#00ff88' : '#3a3a4a'
    if (plate.activated) {
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 20
    }
    ctx.fillRect(x, y, s, s)

    ctx.strokeStyle = plate.activated ? '#88ffcc' : '#555'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, s, s)

    ctx.fillStyle = plate.activated ? '#ffffff' : '#666'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const label = plate.required === 'player' ? 'P' : plate.required === 'echo' ? 'E' : plate.required === 'both' ? 'B' : '·'
    ctx.fillText(label, x + s / 2, y + s / 2)
    ctx.restore()
  }

  drawLaser(ctx: CanvasRenderingContext2D, laser: LaserBeam, cameraX: number, cameraY: number) {
    const x1 = laser.x1 - cameraX
    const y1 = laser.y1 - cameraY
    const x2 = laser.x2 - cameraX
    const y2 = laser.y2 - cameraY

    ctx.save()
    if (laser.active) {
      ctx.strokeStyle = '#ff0040'
      ctx.shadowColor = '#ff0040'
      ctx.shadowBlur = 15
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      ctx.strokeStyle = '#ff8090'
      ctx.shadowBlur = 0
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    } else {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)'
      ctx.setLineDash([5, 8])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    ctx.setLineDash([])
    ctx.fillStyle = laser.active ? '#ff0040' : '#00ff88'
    ctx.shadowColor = laser.active ? '#ff0040' : '#00ff88'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(x1, y1, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x2, y2, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawDoor(ctx: CanvasRenderingContext2D, door: Door, cameraX: number, cameraY: number) {
    if (door.open) return
    const x = door.x - cameraX
    const y = door.y - cameraY

    ctx.save()
    const grad = ctx.createLinearGradient(x, y, x + door.w, y + door.h)
    grad.addColorStop(0, '#8b4513')
    grad.addColorStop(0.5, '#a0522d')
    grad.addColorStop(1, '#8b4513')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, door.w, door.h)

    ctx.strokeStyle = '#00a8ff'
    ctx.shadowColor = '#00a8ff'
    ctx.shadowBlur = 8
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, door.w, door.h)
    ctx.restore()
  }

  drawBlock(ctx: CanvasRenderingContext2D, block: PushableBlock, cameraX: number, cameraY: number) {
    const x = block.x - cameraX
    const y = block.y - cameraY
    const s = block.size

    ctx.save()
    const grad = ctx.createLinearGradient(x, y, x, y + s)
    grad.addColorStop(0, '#5a5a8a')
    grad.addColorStop(1, '#3a3a6a')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, s, s)

    ctx.strokeStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 10
    ctx.lineWidth = 2.5
    ctx.strokeRect(x, y, s, s)

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)'
    ctx.shadowBlur = 0
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 8)
    ctx.lineTo(x + s - 8, y + s - 8)
    ctx.moveTo(x + s - 8, y + 8)
    ctx.lineTo(x + 8, y + s - 8)
    ctx.stroke()
    ctx.restore()
  }

  drawTrap(ctx: CanvasRenderingContext2D, trap: Trap, cameraX: number, cameraY: number) {
    const x = trap.x - cameraX
    const y = trap.y - cameraY

    ctx.save()
    ctx.fillStyle = '#2a1a1a'
    ctx.fillRect(x, y, trap.w, trap.h)

    const spikeCount = Math.floor(trap.w / 15)
    ctx.fillStyle = '#ff3355'
    ctx.shadowColor = '#ff0040'
    ctx.shadowBlur = 8
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + i * 15 + 7
      ctx.beginPath()
      ctx.moveTo(sx - 5, y + trap.h)
      ctx.lineTo(sx, y + 3)
      ctx.lineTo(sx + 5, y + trap.h)
      ctx.closePath()
      ctx.fill()
    }

    ctx.strokeStyle = '#ff0040'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, y, trap.w, trap.h)
    ctx.restore()
  }

  drawExit(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const activated = this.countActivated()
    const canExit = activated >= this.level.requiredActivations
    const ex = this.level.exit.x - cameraX
    const ey = this.level.exit.y - cameraY
    const s = this.level.exit.size
    const cx = ex + s / 2
    const cy = ey + s / 2
    const r = s / 2

    ctx.save()
    if (canExit) {
      const t = Date.now() * 0.003
      const pulse = 1 + Math.sin(t) * 0.1
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5 * pulse)
      grad.addColorStop(0, 'rgba(255, 215, 0, 0.6)')
      grad.addColorStop(0.5, 'rgba(255, 180, 0, 0.3)')
      grad.addColorStop(1, 'rgba(255, 150, 0, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.5 * pulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#ffd700'
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 25
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.7 * pulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowBlur = 5
      ctx.fillText('EXIT', cx, cy)
    } else {
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#666'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${activated}/${this.level.requiredActivations}`, cx, cy)
    }
    ctx.restore()
  }
}
