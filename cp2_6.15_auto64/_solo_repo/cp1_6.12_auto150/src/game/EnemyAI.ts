import type { GameEngine } from './GameEngine'
import type { Enemy, Vec2 } from './types'

interface AIConfig {
  snowMonsterSpeed: number
  snowMonsterDamage: number
  snowMonsterKnockback: number
  iceGolemSpeed: number
  iceGolemDamage: number
  iceGolemFreezeDuration: number
  slowPercentage: number
  gridWidth: number
  gridHeight: number
}

export class EnemyAI {
  private config: AIConfig
  private engine: GameEngine
  private initialized: Map<number, Vec2> = new Map()
  private damageCooldown: Map<number, number> = new Map()

  constructor(config: AIConfig, engine: GameEngine) {
    this.config = config
    this.engine = engine
  }

  update(dt: number) {
    const now = performance.now()
    const cs = this.engine.CellSize
    const player = this.engine.Player
    const enemies = this.engine.Enemies

    this.ensureInit()

    const maxConcurrent = 8
    const active = enemies.slice(0, maxConcurrent)

    for (const e of active) {
      if (e.hp <= 0) continue

      const initPos = this.initialized.get(e.id)
      if (initPos && e.pos.x < -1000) {
        const wp = this.engine.gridToWorld(Math.round(initPos.x), Math.round(initPos.y))
        e.pos.x = wp.x
        e.pos.y = wp.y
      }

      const slowed = now < e.slowedUntil
      const slowMul = slowed ? (1 - this.config.slowPercentage) : 1
      const speed = e.baseSpeed * cs * slowMul * dt

      if (e.type === 'snow_monster') {
        this.chasePlayer(e, speed, dt)
      } else {
        this.patrol(e, speed, dt)
      }

      const dx = player.pos.x - e.pos.x
      const dy = player.pos.y - e.pos.y
      const dist = Math.hypot(dx, dy)
      const collide = cs * 0.6

      if (dist < collide) {
        const lastDmg = this.damageCooldown.get(e.id) || 0
        if (now - lastDmg > 800) {
          this.damageCooldown.set(e.id, now)
          this.onHitPlayer(e, { x: dx, y: dy })
        }
      }
    }
  }

  private ensureInit() {
    for (const e of this.engine.FloorData.enemies) {
      if (!this.initialized.has(e.id)) {
        this.initialized.set(e.id, { x: e.pos.x / 64, y: e.pos.y / 64 })
        const live = this.engine.Enemies.find(x => x.id === e.id)
        if (live) {
          const gx = Math.floor(e.pos.x / 64)
          const gy = Math.floor(e.pos.y / 64)
          const wp = this.engine.gridToWorld(gx, gy)
          live.pos.x = wp.x
          live.pos.y = wp.y
        }
      }
    }
  }

  private chasePlayer(e: Enemy, speed: number, _dt: number) {
    const p = this.engine.Player
    const dx = p.pos.x - e.pos.x
    const dy = p.pos.y - e.pos.y
    const dist = Math.hypot(dx, dy) || 1
    let mx = (dx / dist) * speed
    let my = (dy / dist) * speed

    const margin = this.engine.CellSize * 0.35

    if (mx !== 0) {
      const nx = e.pos.x + mx
      const g = this.engine.worldToGrid(nx + Math.sign(mx) * margin, e.pos.y)
      if (this.engine.isWalkableGrid(g.x, g.y)) {
        this.clampX(e, nx)
      } else {
        const alt = this.engine.worldToGrid(e.pos.x, e.pos.y + (dy > 0 ? margin : -margin))
        if (this.engine.isWalkableGrid(alt.x, alt.y)) {
          const ny = e.pos.y + (dy > 0 ? speed : -speed)
          this.clampY(e, ny)
        }
      }
    }

    if (my !== 0) {
      const ny = e.pos.y + my
      const g = this.engine.worldToGrid(e.pos.x, ny + Math.sign(my) * margin)
      if (this.engine.isWalkableGrid(g.x, g.y)) {
        this.clampY(e, ny)
      } else {
        const alt = this.engine.worldToGrid(e.pos.x + (dx > 0 ? margin : -margin), e.pos.y)
        if (this.engine.isWalkableGrid(alt.x, alt.y)) {
          const nx = e.pos.x + (dx > 0 ? speed : -speed)
          this.clampX(e, nx)
        }
      }
    }
  }

  private patrol(e: Enemy, speed: number, _dt: number) {
    if (!e.patrolTarget) {
      e.patrolTarget = { x: e.pos.x, y: e.pos.y }
    }

    const tgtWorld = this.engine.gridToWorld(e.patrolTarget.x, e.patrolTarget.y)
    const dx = tgtWorld.x - e.pos.x
    const dy = tgtWorld.y - e.pos.y
    const dist = Math.hypot(dx, dy)

    if (dist < 8) {
      const cs = this.engine.CellSize
      const cur = this.engine.worldToGrid(e.pos.x, e.pos.y)
      let tries = 0
      while (tries < 10) {
        tries++
        const nx = cur.x + Math.floor(Math.random() * 5) - 2
        const ny = cur.y + Math.floor(Math.random() * 5) - 2
        if (this.engine.isWalkableGrid(nx, ny)) {
          e.patrolTarget = { x: nx, y: ny }
          break
        }
      }
      const tgt2 = this.engine.gridToWorld(e.patrolTarget.x, e.patrolTarget.y)
      const dx2 = tgt2.x - e.pos.x
      const dy2 = tgt2.y - e.pos.y
      const d2 = Math.hypot(dx2, dy2) || 1
      this.moveStep(e, (dx2 / d2) * speed, (dy2 / d2) * speed)
      return
    }

    this.moveStep(e, (dx / dist) * speed, (dy / dist) * speed)
  }

  private moveStep(e: Enemy, mx: number, my: number) {
    if (mx !== 0) {
      const nx = e.pos.x + mx
      const g = this.engine.worldToGrid(nx + Math.sign(mx) * 2, e.pos.y)
      if (this.engine.isWalkableGrid(g.x, g.y)) this.clampX(e, nx)
    }
    if (my !== 0) {
      const ny = e.pos.y + my
      const g = this.engine.worldToGrid(e.pos.x, ny + Math.sign(my) * 2)
      if (this.engine.isWalkableGrid(g.x, g.y)) this.clampY(e, ny)
    }
  }

  private clampX(e: Enemy, nx: number) {
    const left = this.engine.OffsetX + this.engine.CellSize * 0.3
    const right = this.engine.OffsetX + this.config.gridWidth * this.engine.CellSize - this.engine.CellSize * 0.3
    e.pos.x = Math.max(left, Math.min(right, nx))
  }

  private clampY(e: Enemy, ny: number) {
    const top = this.engine.OffsetY + this.engine.CellSize * 0.3
    const bottom = this.engine.OffsetY + this.config.gridHeight * this.engine.CellSize - this.engine.CellSize * 0.3
    e.pos.y = Math.max(top, Math.min(bottom, ny))
  }

  private onHitPlayer(e: Enemy, pushDir: Vec2) {
    if (e.type === 'snow_monster') {
      this.engine.damagePlayer(this.config.snowMonsterDamage)
      this.engine.applyKnockback(pushDir, this.config.snowMonsterKnockback)
    } else {
      this.engine.damagePlayer(this.config.iceGolemDamage)
      this.engine.freezePlayer(this.config.iceGolemFreezeDuration)
    }
  }
}
