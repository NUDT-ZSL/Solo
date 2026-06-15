import { Boss, Player, Gear, SteamVent, Platform, GRAVITY } from './types'

export function createBoss(
  id: string,
  x: number,
  y: number,
  health: number
): Boss {
  return {
    id,
    x,
    y,
    width: 56,
    height: 72,
    health,
    maxHealth: health,
    attackCooldown: 2,
    attackTimer: 2,
    phase: 1,
    facingRight: false,
    state: 'patrol',
    stateTimer: 2,
    velocityX: 0,
    velocityY: 0,
    patrolDir: 1,
  }
}

export function updateBoss(
  boss: Boss,
  player: Player,
  gears: Gear[],
  steamVents: SteamVent[],
  platforms: Platform[],
  dt: number
): { hitPlayer: boolean; bossDied: boolean; gearAttackGearId: string | null } {
  if (boss.state === 'dead') return { hitPlayer: false, bossDied: false, gearAttackGearId: null }

  let hitPlayer = false
  let bossDied = false
  let gearAttackGearId: string | null = null

  boss.stateTimer -= dt
  boss.attackTimer -= dt

  const dx = player.x - boss.x
  const dy = player.y - boss.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  boss.facingRight = dx > 0

  if (boss.health <= boss.maxHealth * 0.5 && boss.phase === 1) {
    boss.phase = 2
    boss.attackCooldown = 1.5
  }

  if (boss.health <= boss.maxHealth * 0.25 && boss.phase === 2) {
    boss.phase = 3
    boss.attackCooldown = 1.0
  }

  switch (boss.state) {
    case 'patrol':
      boss.velocityX = boss.patrolDir * 80
      boss.velocityY += GRAVITY * dt
      boss.x += boss.velocityX * dt
      boss.y += boss.velocityY * dt

      for (const p of platforms) {
        if (!p.visible) continue
        if (boss.x < p.x + p.width && boss.x + boss.width > p.x &&
            boss.y + boss.height > p.y && boss.y + boss.height < p.y + 20) {
          boss.y = p.y - boss.height
          boss.velocityY = 0
        }
      }

      if (boss.stateTimer <= 0 || boss.x < 50 || boss.x > 600) {
        boss.patrolDir *= -1
        boss.stateTimer = 1.5 + Math.random()
      }

      if (boss.attackTimer <= 0 && dist < 400) {
        const roll = Math.random()
        if (roll < 0.5) {
          boss.state = 'attack_gear'
          boss.stateTimer = 1.0
        } else {
          boss.state = 'attack_steam'
          boss.stateTimer = 0.8
        }
        boss.attackTimer = boss.attackCooldown
      }
      break

    case 'attack_gear': {
      const nearGear = gears.find(g => {
        const gd = Math.sqrt((g.x - boss.x) ** 2 + (g.y - boss.y) ** 2)
        return gd < 200
      })
      if (nearGear) {
        gearAttackGearId = nearGear.id
        nearGear.rotationSpeed *= 3
        setTimeout(() => {
          nearGear.rotationSpeed /= 3
        }, 800)
      }
      if (dist < 60 && player.invincibleTimer <= 0) {
        hitPlayer = true
      }
      if (boss.stateTimer <= 0) {
        boss.state = 'patrol'
        boss.stateTimer = 1 + Math.random()
      }
      break
    }

    case 'attack_steam': {
      for (const vent of steamVents) {
        const vd = Math.sqrt((vent.x - boss.x) ** 2 + (vent.y - boss.y) ** 2)
        if (vd < 250) {
          vent.active = true
          vent.direction = dy < 0 ? 'up' : (dx > 0 ? 'right' : 'left')
          vent.intensity = Math.min(vent.intensity * 1.5, 3)
          setTimeout(() => {
            vent.intensity = vent.intensity / 1.5
          }, 1200)
        }
      }
      if (dist < 60 && player.invincibleTimer <= 0) {
        hitPlayer = true
      }
      if (boss.stateTimer <= 0) {
        boss.state = 'patrol'
        boss.stateTimer = 1 + Math.random()
      }
      break
    }

    case 'hurt':
      if (boss.stateTimer <= 0) {
        boss.state = 'patrol'
        boss.stateTimer = 0.5
      }
      break
  }

  if (boss.state !== 'dead') {
    const pcx = player.x + player.width / 2
    const pcy = player.y + player.height / 2
    if (pcx > boss.x && pcx < boss.x + boss.width && pcy > boss.y && pcy < boss.y + boss.height) {
      if (player.invincibleTimer <= 0 && boss.state !== 'hurt' && boss.state !== 'dead') {
        hitPlayer = true
      }
    }
  }

  return { hitPlayer, bossDied, gearAttackGearId }
}

export function damageBoss(boss: Boss, damage: number): boolean {
  boss.health -= damage
  boss.state = 'hurt'
  boss.stateTimer = 0.5
  if (boss.health <= 0) {
    boss.health = 0
    boss.state = 'dead'
    return true
  }
  return false
}
