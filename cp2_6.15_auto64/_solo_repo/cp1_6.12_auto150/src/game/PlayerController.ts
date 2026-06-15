import type { GameEngine } from './GameEngine'
import type { Vec2 } from './types'

interface PCConfig {
  playerSpeed: number
  crystalSpeed: number
  crystalDamage: number
  explosionRadius: number
}

export class PlayerController {
  private config: PCConfig
  private engine: GameEngine
  private lastFireTime = 0
  private readonly fireCooldown = 200

  constructor(config: PCConfig, engine: GameEngine) {
    this.config = config
    this.engine = engine
  }

  tryFire(direction: Vec2) {
    const now = performance.now()
    if (now - this.lastFireTime < this.fireCooldown) return
    if (this.engine.State.currentCrystals <= 0) return
    const frozen = now < this.engine.Player.frozenUntil
    if (frozen) return

    this.lastFireTime = now
    this.engine.spawnCrystal(this.engine.Player.pos, direction)
  }

  update(dt: number) {
    const p = this.engine.Player
    const now = performance.now()
    const frozen = now < p.frozenUntil

    const keys = this.engine.Keys
    let dx = 0
    let dy = 0
    if (!frozen) {
      if (keys['w'] || keys['arrowup']) dy -= 1
      if (keys['s'] || keys['arrowdown']) dy += 1
      if (keys['a'] || keys['arrowleft']) dx -= 1
      if (keys['d'] || keys['arrowright']) dx += 1
    }

    const len = Math.hypot(dx, dy)
    if (len > 0) {
      dx /= len
      dy /= len
    }
    p.moveDir = { x: dx, y: dy }

    const speedMult = this.engine.getSpeedMultiplier()
    const speed = p.baseSpeed * this.engine.CellSize * speedMult

    if (p.knockback) {
      this.applyMovement(p.knockback.x * dt, p.knockback.y * dt, true)
      p.knockback.x *= 0.85
      p.knockback.y *= 0.85
      if (Math.abs(p.knockback.x) < 1 && Math.abs(p.knockback.y) < 1) {
        p.knockback = null
      }
    } else if (!frozen) {
      this.applyMovement(dx * speed * dt, dy * speed * dt, false)
    }

    const last = p.trail[p.trail.length - 1]
    if (!last || Math.hypot(p.pos.x - last.x, p.pos.y - last.y) > this.engine.CellSize * 0.3) {
      p.trail.push({ x: p.pos.x, y: p.pos.y })
      if (p.trail.length > 15) p.trail.shift()
    }

    const gp = this.engine.worldToGrid(p.pos.x, p.pos.y)
    p.gridPos.x = gp.x
    p.gridPos.y = gp.y
  }

  private applyMovement(mx: number, my: number, ignoreKnockbackBlocking: boolean) {
    const p = this.engine.Player
    const cs = this.engine.CellSize
    const margin = cs * 0.35

    if (mx !== 0) {
      const nx = p.pos.x + mx
      const checkY = p.pos.y
      const g1 = this.engine.worldToGrid(nx - Math.sign(mx) * margin, checkY - margin)
      const g2 = this.engine.worldToGrid(nx - Math.sign(mx) * margin, checkY + margin)
      if (this.engine.isWalkableGrid(g1.x, g1.y) && this.engine.isWalkableGrid(g2.x, g2.y)) {
        const left = this.engine.OffsetX + margin
        const right = this.engine.OffsetX + this.engine.Config.gridWidth * cs - margin
        if (nx >= left && nx <= right) {
          p.pos.x = nx
        }
      } else if (ignoreKnockbackBlocking) {
        // allow slide
      }
    }

    if (my !== 0) {
      const ny = p.pos.y + my
      const checkX = p.pos.x
      const g1 = this.engine.worldToGrid(checkX - margin, ny - Math.sign(my) * margin)
      const g2 = this.engine.worldToGrid(checkX + margin, ny - Math.sign(my) * margin)
      if (this.engine.isWalkableGrid(g1.x, g1.y) && this.engine.isWalkableGrid(g2.x, g2.y)) {
        const top = this.engine.OffsetY + margin
        const bottom = this.engine.OffsetY + this.engine.Config.gridHeight * cs - margin
        if (ny >= top && ny <= bottom) {
          p.pos.y = ny
        }
      }
    }
  }
}
