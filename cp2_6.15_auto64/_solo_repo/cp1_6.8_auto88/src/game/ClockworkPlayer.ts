import {
  Player,
  InputState,
  Platform,
  Gear,
  SteamVent,
  EnergyCore,
  GRAVITY,
  PLAYER_SPEED,
  JUMP_FORCE,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  CLIMB_SPEED_FACTOR,
  STEAM_BOOST_FORCE,
} from './types'

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityX: 0,
    velocityY: 0,
    energy: 100,
    maxEnergy: 100,
    isClimbing: false,
    climbingGearId: null,
    climbAngle: 0,
    facingRight: true,
    grounded: false,
    jumping: false,
    hurtTimer: 0,
    invincibleTimer: 0,
    runeGlowPhase: 0,
    steamBoosted: false,
    steamBoostTimer: 0,
  }
}

export function updatePlayer(
  player: Player,
  input: InputState,
  dt: number,
  platforms: Platform[],
  gears: Gear[],
  steamVents: SteamVent[],
  energyCores: EnergyCore[],
  worldHeight: number
): { coreCollected: string | null; steamHit: boolean; steamBoost: boolean } {
  let coreCollected: string | null = null
  let steamHit = false
  let steamBoost = false

  player.runeGlowPhase += dt * 3
  if (player.hurtTimer > 0) player.hurtTimer -= dt
  if (player.invincibleTimer > 0) player.invincibleTimer -= dt
  if (player.steamBoostTimer > 0) {
    player.steamBoostTimer -= dt
    if (player.steamBoostTimer <= 0) player.steamBoosted = false
  }

  if (player.isClimbing && player.climbingGearId) {
    const gear = gears.find(g => g.id === player.climbingGearId)
    if (!gear) {
      player.isClimbing = false
      player.climbingGearId = null
    } else {
      if (input.interactPressed || input.jumpPressed) {
        player.isClimbing = false
        player.climbingGearId = null
        player.velocityY = JUMP_FORCE * 0.8
        player.grounded = false
      } else {
        const rotSpeed = gear.rotationSpeed * (gear.clockwise ? 1 : -1) * CLIMB_SPEED_FACTOR
        player.climbAngle += rotSpeed * dt
        player.x = gear.x + Math.cos(player.climbAngle) * (gear.radius + player.height / 2) - player.width / 2
        player.y = gear.y + Math.sin(player.climbAngle) * (gear.radius + player.height / 2) - player.height / 2
        return { coreCollected: null, steamHit: false, steamBoost: false }
      }
    }
  }

  let moveX = 0
  if (input.left) moveX -= 1
  if (input.right) moveX += 1

  player.velocityX = moveX * PLAYER_SPEED
  if (moveX !== 0) player.facingRight = moveX > 0

  if (input.jumpPressed && player.grounded) {
    player.velocityY = JUMP_FORCE
    player.grounded = false
    player.jumping = true
  }

  if (input.interactPressed && !player.isClimbing && player.grounded) {
    for (const gear of gears) {
      const dx = (player.x + player.width / 2) - gear.x
      const dy = (player.y + player.height / 2) - gear.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < gear.radius + 50) {
        player.isClimbing = true
        player.climbingGearId = gear.id
        player.climbAngle = Math.atan2(dy, dx)
        player.velocityX = 0
        player.velocityY = 0
        player.grounded = false
        break
      }
    }
  }

  player.velocityY += GRAVITY * dt

  if (player.steamBoosted) {
    player.velocityY = Math.min(player.velocityY, -200)
  }

  player.x += player.velocityX * dt
  resolveCollisionX(player, platforms)

  player.y += player.velocityY * dt
  player.grounded = false
  resolveCollisionY(player, platforms)

  if (player.y > worldHeight) {
    player.energy = 0
  }

  for (const vent of steamVents) {
    if (!vent.active) continue
    const hit = checkSteamHit(player, vent)
    if (hit) {
      if (vent.direction === 'up') {
        player.velocityY = STEAM_BOOST_FORCE
        player.steamBoosted = true
        player.steamBoostTimer = 0.5
        player.grounded = false
        steamBoost = true
      } else {
        if (player.invincibleTimer <= 0) {
          steamHit = true
          player.energy -= STEAM_DAMAGE * dt * 3
          if (player.energy < 0) player.energy = 0
        }
      }
    }
  }

  for (const core of energyCores) {
    if (core.collected) continue
    const dx = (player.x + player.width / 2) - core.x
    const dy = (player.y + player.height / 2) - core.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < core.radius + 20) {
      core.collected = true
      coreCollected = core.id
    }
  }

  return { coreCollected, steamHit, steamBoost }
}

function resolveCollisionX(player: Player, platforms: Platform[]) {
  for (const p of platforms) {
    if (!p.visible) continue
    if (rectOverlap(player.x, player.y, player.width, player.height, p.x, p.y, p.width, p.height)) {
      if (player.velocityX > 0) {
        player.x = p.x - player.width
      } else if (player.velocityX < 0) {
        player.x = p.x + p.width
      }
      player.velocityX = 0
    }
  }
}

function resolveCollisionY(player: Player, platforms: Platform[]) {
  for (const p of platforms) {
    if (!p.visible) continue
    if (rectOverlap(player.x, player.y, player.width, player.height, p.x, p.y, p.width, p.height)) {
      if (player.velocityY > 0) {
        player.y = p.y - player.height
        player.velocityY = 0
        player.grounded = true
        player.jumping = false
      } else if (player.velocityY < 0) {
        player.y = p.y + p.height
        player.velocityY = 0
      }
    }
  }
}

function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function checkSteamHit(player: Player, vent: SteamVent): boolean {
  const pcx = player.x + player.width / 2
  const pcy = player.y + player.height / 2

  let sx: number, sy: number, sw: number, sh: number
  const len = vent.intensity * 80

  switch (vent.direction) {
    case 'up':
      sx = vent.x - vent.width / 2
      sy = vent.y - len
      sw = vent.width
      sh = len
      break
    case 'down':
      sx = vent.x - vent.width / 2
      sy = vent.y
      sw = vent.width
      sh = len
      break
    case 'left':
      sx = vent.x - len
      sy = vent.y - vent.height / 2
      sw = len
      sh = vent.height
      break
    case 'right':
      sx = vent.x
      sy = vent.y - vent.height / 2
      sw = len
      sh = vent.height
      break
    default:
      return false
  }

  return pcx > sx && pcx < sx + sw && pcy > sy && pcy < sy + sh
}

export function hurtPlayer(player: Player, damage: number) {
  if (player.invincibleTimer > 0) return
  player.energy -= damage
  if (player.energy < 0) player.energy = 0
  player.invincibleTimer = 0.8
  player.hurtTimer = 0.3
}
