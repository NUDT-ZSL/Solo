import { Gear, SteamVent, LightMechanism, Platform, SteamParticle } from './types'

export function updateGears(gears: Gear[], dt: number) {
  for (const gear of gears) {
    const dir = gear.clockwise ? 1 : -1
    gear.currentAngle += gear.rotationSpeed * dir * dt
  }
}

export function updateSteamVents(vents: SteamVent[], dt: number) {
  for (const vent of vents) {
    vent.timer += dt
    if (vent.timer >= vent.changeInterval) {
      vent.timer = 0
      const directions: SteamVent['direction'][] = ['up', 'down', 'left', 'right']
      const currentIdx = directions.indexOf(vent.direction)
      let newIdx: number
      do {
        newIdx = Math.floor(Math.random() * directions.length)
      } while (newIdx === currentIdx && directions.length > 1)
      vent.direction = directions[newIdx]
      vent.active = Math.random() > 0.2
    }

    if (vent.active) {
      updateSteamParticles(vent, dt)
      if (Math.random() < dt * 30) {
        emitSteamParticle(vent)
      }
    } else {
      vent.particles = vent.particles.filter(p => {
        p.life -= dt
        p.alpha = Math.max(0, (p.life / p.maxLife) * 0.6)
        return p.life > 0
      })
    }
  }
}

function emitSteamParticle(vent: SteamVent) {
  const maxParticles = 30
  if (vent.particles.length >= maxParticles) return

  let px = vent.x
  let py = vent.y
  let vx = 0
  let vy = 0

  switch (vent.direction) {
    case 'up':
      px += (Math.random() - 0.5) * vent.width
      vy = -(80 + Math.random() * 60)
      vx = (Math.random() - 0.5) * 20
      break
    case 'down':
      px += (Math.random() - 0.5) * vent.width
      vy = 80 + Math.random() * 60
      vx = (Math.random() - 0.5) * 20
      break
    case 'left':
      py += (Math.random() - 0.5) * vent.height
      vx = -(80 + Math.random() * 60)
      vy = (Math.random() - 0.5) * 20
      break
    case 'right':
      py += (Math.random() - 0.5) * vent.height
      vx = 80 + Math.random() * 60
      vy = (Math.random() - 0.5) * 20
      break
  }

  const life = 0.5 + Math.random() * 1.0
  vent.particles.push({
    x: px,
    y: py,
    vx,
    vy,
    life,
    maxLife: life,
    size: 6 + Math.random() * 10,
    alpha: 0.4 + Math.random() * 0.3,
  })
}

function updateSteamParticles(vent: SteamVent, dt: number) {
  for (let i = vent.particles.length - 1; i >= 0; i--) {
    const p = vent.particles[i]
    p.life -= dt
    if (p.life <= 0) {
      vent.particles.splice(i, 1)
      continue
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.alpha = (p.life / p.maxLife) * 0.6
    p.size += dt * 8
  }
}

export function updateLightMechanisms(
  mechanisms: LightMechanism[],
  platforms: Platform[],
  interactPressed: boolean,
  playerX: number,
  playerY: number,
  dt: number
): boolean {
  let toggled = false

  for (const mech of mechanisms) {
    if (mech.cooldownTimer > 0) {
      mech.cooldownTimer -= dt
      continue
    }

    const dx = playerX - mech.x
    const dy = playerY - mech.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 60 && interactPressed) {
      mech.currentDirection = mech.currentDirection === 'left' ? 'right' : 'left'
      mech.cooldownTimer = mech.cooldown

      for (const pid of mech.linkedPlatformIds) {
        const platform = platforms.find(p => p.id === pid)
        if (platform && platform.lightCondition !== 'always') {
          platform.visible = platform.lightCondition === `light-${mech.currentDirection}`
        }
      }
      toggled = true
    }
  }

  return toggled
}

export function getSteamZoneRect(vent: SteamVent): { x: number; y: number; w: number; h: number } | null {
  if (!vent.active) return null
  const len = vent.intensity * 80
  switch (vent.direction) {
    case 'up':
      return { x: vent.x - vent.width / 2, y: vent.y - len, w: vent.width, h: len }
    case 'down':
      return { x: vent.x - vent.width / 2, y: vent.y, w: vent.width, h: len }
    case 'left':
      return { x: vent.x - len, y: vent.y - vent.height / 2, w: len, h: vent.height }
    case 'right':
      return { x: vent.x, y: vent.y - vent.height / 2, w: len, h: vent.height }
    default:
      return null
  }
}
