export interface Particle {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
  color: [number, number, number]
  originalColor: [number, number, number]
  mass: number
}

export interface Galaxy {
  id: string
  type: 'spiral' | 'elliptical' | 'irregular'
  name: string
  position: [number, number, number]
  rotationSpeed: number
  particleCount: number
  colorRange: [string, string]
  particles: Particle[]
}

export interface SimulationParams {
  gravityConstant: number
  elasticity: number
  simulationSpeed: number
}

export interface CollisionState {
  active: boolean
  galaxyIds: [string, string]
  startTime: number
  duration: number
  colorBlendProgress: number
}

export type WorkerCommand =
  | { type: 'INIT'; galaxies: Galaxy[]; params: SimulationParams }
  | { type: 'UPDATE_PARAMS'; params: SimulationParams }
  | { type: 'ADD_GALAXY'; galaxy: Galaxy }
  | { type: 'START_COLLISION'; galaxyIds: [string, string] }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'STEP'; dt: number }

export type WorkerResponse =
  | { type: 'FRAME_UPDATE'; particles: Particle[]; galaxyRotations: Record<string, number> }
  | { type: 'COLLISION_COMPLETE'; mergedGalaxyId: string }
  | { type: 'READY' }

export type GalaxyType = 'spiral' | 'elliptical' | 'irregular'

export interface GalaxyPreset {
  type: GalaxyType
  name: string
  nameEn: string
  colorRange: [string, string]
  defaultParticleCount: number
  description: string
}

export const GALAXY_PRESETS: GalaxyPreset[] = [
  {
    type: 'spiral',
    name: '旋涡星系',
    nameEn: 'Spiral',
    colorRange: ['#4488ff', '#aaccff'],
    defaultParticleCount: 300,
    description: '蓝白色渐变，螺旋臂结构',
  },
  {
    type: 'elliptical',
    name: '椭圆星系',
    nameEn: 'Elliptical',
    colorRange: ['#ffcc44', '#ff9966'],
    defaultParticleCount: 250,
    description: '黄橙色渐变，球形分布',
  },
  {
    type: 'irregular',
    name: '不规则星系',
    nameEn: 'Irregular',
    colorRange: ['#cc66ff', '#ff66aa'],
    defaultParticleCount: 200,
    description: '紫粉色渐变，随机分布',
  },
]

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  gravityConstant: 1.0,
  elasticity: 0.5,
  simulationSpeed: 1.0,
}

export const GALAXY_NAMES: Record<GalaxyType, string[]> = {
  spiral: ['银河系', '仙女座', '风车星系', '向日葵星系', '草帽星系', '涡状星系'],
  elliptical: ['M87', '半人马座A', 'M49', 'M60', 'NGC 4889', 'IC 1101'],
  irregular: ['大麦哲伦星云', '小麦哲伦星云', 'NGC 1427A', 'IC 10', 'NGC 4449', 'NGC 1569'],
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function generateSpiralParticles(count: number, colorRange: [string, string]): Particle[] {
  const particles: Particle[] = []
  const [c1, c2] = colorRange.map(hexToRgb)
  const arms = 2

  for (let i = 0; i < count; i++) {
    const arm = i % arms
    const armOffset = (arm / arms) * Math.PI * 2
    const t = Math.random()
    const theta = t * Math.PI * 4 + armOffset
    const a = 0.5
    const b = 0.3
    const r = a * Math.exp(b * theta) * 0.15

    const spread = 0.3 + t * 0.2
    const x = r * Math.cos(theta) + (Math.random() - 0.5) * spread
    const y = (Math.random() - 0.5) * 0.15 * (1 + t * 0.5)
    const z = r * Math.sin(theta) + (Math.random() - 0.5) * spread

    const blend = t
    const color: [number, number, number] = [
      c1[0] + (c2[0] - c1[0]) * blend,
      c1[1] + (c2[1] - c1[1]) * blend,
      c1[2] + (c2[2] - c1[2]) * blend,
    ]

    const dist = Math.sqrt(x * x + z * z)
    const speed = 0.3 + dist * 0.15
    const vx = -Math.sin(theta) * speed * 0.02
    const vz = Math.cos(theta) * speed * 0.02

    particles.push({
      id: i,
      position: [x, y, z],
      velocity: [vx, 0, vz],
      color: [...color],
      originalColor: [...color],
      mass: 0.5 + Math.random() * 1.5,
    })
  }

  return particles
}

function generateEllipticalParticles(count: number, colorRange: [string, string]): Particle[] {
  const particles: Particle[] = []
  const [c1, c2] = colorRange.map(hexToRgb)

  for (let i = 0; i < count; i++) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)

    const scale = 0.12
    const x = z0 * scale * 1.3
    const y = z1 * scale * 0.8
    const z = (Math.random() - 0.5) * 2 * 0.9 * scale * (Math.abs(z0) + Math.abs(z1)) * 0.3

    const dist = Math.sqrt(x * x + y * y + z * z)
    const blend = Math.min(1, dist * 2)
    const color: [number, number, number] = [
      c1[0] + (c2[0] - c1[0]) * blend,
      c1[1] + (c2[1] - c1[1]) * blend,
      c1[2] + (c2[2] - c1[2]) * blend,
    ]

    const angle = Math.atan2(y, x)
    const speed = 0.01 + dist * 0.05
    const vx = -Math.sin(angle) * speed
    const vz = Math.cos(angle) * speed

    particles.push({
      id: i,
      position: [x, y, z],
      velocity: [vx, 0, vz],
      color: [...color],
      originalColor: [...color],
      mass: 0.8 + Math.random() * 2.0,
    })
  }

  return particles
}

function generateIrregularParticles(count: number, colorRange: [string, string]): Particle[] {
  const particles: Particle[] = []
  const [c1, c2] = colorRange.map(hexToRgb)
  const clusters = 3 + Math.floor(Math.random() * 3)

  const clusterCenters: [number, number, number][] = []
  for (let c = 0; c < clusters; c++) {
    clusterCenters.push([
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 1.5,
    ])
  }

  for (let i = 0; i < count; i++) {
    const cluster = clusterCenters[i % clusters]
    const scale = 0.2
    const x = cluster[0] + (Math.random() - 0.5) * scale * 2
    const y = cluster[1] + (Math.random() - 0.5) * scale * 0.8
    const z = cluster[2] + (Math.random() - 0.5) * scale * 2

    const dist = Math.sqrt(x * x + y * y + z * z)
    const blend = Math.random()
    const color: [number, number, number] = [
      c1[0] + (c2[0] - c1[0]) * blend,
      c1[1] + (c2[1] - c1[1]) * blend,
      c1[2] + (c2[2] - c1[2]) * blend,
    ]

    const angle = Math.atan2(z, x)
    const speed = 0.005 + Math.random() * 0.01
    const vx = -Math.sin(angle) * speed
    const vz = Math.cos(angle) * speed

    particles.push({
      id: i,
      position: [x, y, z],
      velocity: [vx, 0, vz],
      color: [...color],
      originalColor: [...color],
      mass: 0.3 + Math.random() * 1.0,
    })
  }

  return particles
}

export function generateGalaxyParticles(type: GalaxyType, count: number, colorRange: [string, string]): Particle[] {
  switch (type) {
    case 'spiral':
      return generateSpiralParticles(count, colorRange)
    case 'elliptical':
      return generateEllipticalParticles(count, colorRange)
    case 'irregular':
      return generateIrregularParticles(count, colorRange)
  }
}

export function createGalaxy(
  type: GalaxyType,
  position: [number, number, number],
  rotationSpeed: number = 1.0,
  particleCount?: number
): Galaxy {
  const preset = GALAXY_PRESETS.find(p => p.type === type)!
  const count = particleCount || preset.defaultParticleCount
  const nameList = GALAXY_NAMES[type]
  const name = nameList[Math.floor(Math.random() * nameList.length)]

  const particles = generateGalaxyParticles(type, count, preset.colorRange).map((p, idx) => ({
    ...p,
    id: idx,
    position: [
      p.position[0] + position[0],
      p.position[1] + position[1],
      p.position[2] + position[2],
    ] as [number, number, number],
  }))

  return {
    id: `galaxy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    name,
    position,
    rotationSpeed,
    particleCount: count,
    colorRange: preset.colorRange,
    particles,
  }
}

export function hexToRgbNorm(hex: string): [number, number, number] {
  return hexToRgb(hex)
}
