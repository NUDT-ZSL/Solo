export interface Star {
  x: number
  y: number
  radius: number
  phase: number
  speed: number
  baseAlpha: number
}

export interface Ship {
  x: number
  y: number
  angle: number
  speed: number
  shield: number
  maxShield: number
  engineLevel: number
  shieldLevel: number
  laserLevel: number
}

export interface Asteroid {
  x: number
  y: number
  radius: number
  speed: number
  angle: number
  rotation: number
  rotationSpeed: number
  hasStripes: boolean
  hp: number
  maxHp: number
  color1: string
  color2: string
  stripeColor: string
  vertices: number[]
}

export interface Mineral {
  x: number
  y: number
  type: 'iron' | 'copper' | 'crystal'
  width: number
  life: number
  collectAnim: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface LaserBeam {
  x1: number
  y1: number
  x2: number
  y2: number
  life: number
}

export function createStar(width: number, height: number): Star {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.5 + 0.5,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 1.5 + 0.5,
    baseAlpha: Math.random() * 0.5 + 0.3,
  }
}

export function createStarField(count: number, width: number, height: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push(createStar(width, height))
  }
  return stars
}

export function createAsteroid(canvasWidth: number, canvasHeight: number, difficulty: number): Asteroid {
  const side = Math.floor(Math.random() * 4)
  const radius = Math.random() * 15 + 15
  let x: number, y: number

  switch (side) {
    case 0: x = -radius; y = Math.random() * canvasHeight; break
    case 1: x = canvasWidth + radius; y = Math.random() * canvasHeight; break
    case 2: x = Math.random() * canvasWidth; y = -radius; break
    default: x = Math.random() * canvasWidth; y = canvasHeight + radius; break
  }

  const centerX = canvasWidth * (0.3 + Math.random() * 0.4)
  const centerY = canvasHeight * (0.3 + Math.random() * 0.4)
  const angle = Math.atan2(centerY - y, centerX - x)
  const speed = (Math.random() * 60 + 40) * difficulty

  const colorSets = [
    { c1: '#8d6e63', c2: '#4e342e', stripe: '#6d4c41' },
    { c1: '#795548', c2: '#3e2723', stripe: '#5d4037' },
    { c1: '#6d4c41', c2: '#5d4037', stripe: '#4e342e' },
  ]
  const cs = colorSets[Math.floor(Math.random() * colorSets.length)]

  const vertCount = 8 + Math.floor(Math.random() * 4)
  const vertices: number[] = []
  for (let i = 0; i < vertCount; i++) {
    vertices.push(0.7 + Math.random() * 0.3)
  }

  return {
    x, y, radius, speed, angle,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 2,
    hasStripes: Math.random() > 0.4,
    hp: Math.ceil(radius / 10) * difficulty,
    maxHp: Math.ceil(radius / 10) * difficulty,
    color1: cs.c1,
    color2: cs.c2,
    stripeColor: cs.stripe,
    vertices,
  }
}

export function createMineral(x: number, y: number, type: 'iron' | 'copper' | 'crystal'): Mineral {
  const widths: Record<string, number> = { iron: 10, copper: 8, crystal: 6 }
  return {
    x, y, type,
    width: widths[type],
    life: 1,
    collectAnim: 0,
  }
}

export function createExplosionParticles(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 150 + 50
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3,
      maxLife: 0.3,
      color,
      size: Math.random() * 3 + 1,
    })
  }
  return particles
}

export function createLaserBeam(x1: number, y1: number, x2: number, y2: number): LaserBeam {
  return { x1, y1, x2, y2, life: 0.15 }
}

export function getMineralType(difficulty: number): 'iron' | 'copper' | 'crystal' {
  const r = Math.random()
  if (difficulty < 0.8) {
    if (r < 0.6) return 'iron'
    if (r < 0.9) return 'copper'
    return 'crystal'
  } else if (difficulty < 1.2) {
    if (r < 0.4) return 'iron'
    if (r < 0.75) return 'copper'
    return 'crystal'
  } else {
    if (r < 0.25) return 'iron'
    if (r < 0.6) return 'copper'
    return 'crystal'
  }
}

export function getUpgradeCost(type: 'engine' | 'shield' | 'laser', currentLevel: number): { iron: number; copper: number; crystal: number } {
  const n = currentLevel
  switch (type) {
    case 'engine':
      return { iron: n * 3, copper: n * 2, crystal: Math.max(0, n - 1) }
    case 'shield':
      return { iron: n * 2, copper: n * 3, crystal: Math.max(0, n - 1) }
    case 'laser':
      return { iron: n * 2, copper: n * 2, crystal: n }
  }
}
