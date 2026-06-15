export interface Particle {
  id: number
  galaxyId: string
  position: [number, number, number]
  prevPosition: [number, number, number]
  velocity: [number, number, number]
  color: [number, number, number]
  originalColor: [number, number, number]
  galaxyColor: [number, number, number]
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
  galaxyBaseColor: [number, number, number]
  particles: Particle[]
}

export interface SimulationParams {
  gravityConstant: number
  elasticity: number
  simulationSpeed: number
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

export interface WorkerParticleData {
  positions: Float32Array
  colors: Float32Array
  prevPositions: Float32Array
  particleIds: Int32Array
  galaxyIds: string[]
}

export type WorkerResponse =
  | {
      type: 'FRAME_UPDATE'
      positions: Float32Array
      colors: Float32Array
      prevPositions: Float32Array
      particleIds: Int32Array
      galaxyIds: string[]
      particleGalaxies: Int32Array
      totalParticles: number
    }
  | { type: 'COLLISION_COMPLETE'; mergedGalaxyId: string }
  | { type: 'COLLISION_STARTED' }
  | { type: 'READY' }

export type GalaxyType = 'spiral' | 'elliptical' | 'irregular'

export interface GalaxyPreset {
  type: GalaxyType
  name: string
  colorRange: [string, string]
  defaultParticleCount: number
}

export const GALAXY_PRESETS: GalaxyPreset[] = [
  { type: 'spiral', name: '旋涡星系', colorRange: ['#4488ff', '#aaccff'], defaultParticleCount: 300 },
  { type: 'elliptical', name: '椭圆星系', colorRange: ['#ffcc44', '#ff9966'], defaultParticleCount: 250 },
  { type: 'irregular', name: '不规则星系', colorRange: ['#cc66ff', '#ff66aa'], defaultParticleCount: 200 },
]

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  gravityConstant: 1.0,
  elasticity: 0.5,
  simulationSpeed: 1.0,
}

export const GALAXY_NAMES: Record<GalaxyType, string[]> = {
  spiral: ['银河系', '仙女座', '风车星系', '向日葵星系', '草帽星系'],
  elliptical: ['M87', '半人马座A', 'M49', 'M60', 'NGC 4889'],
  irregular: ['大麦哲伦云', '小麦哲伦云', 'NGC 1427A', 'IC 10', 'NGC 4449'],
}

function hexToRgbNorm(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.max(0, Math.min(1, a[0] + (b[0] - a[0]) * t)),
    Math.max(0, Math.min(1, a[1] + (b[1] - a[1]) * t)),
    Math.max(0, Math.min(1, a[2] + (b[2] - a[2]) * t)),
  ]
}

function generateSpiralParticles(
  galaxyId: string,
  count: number,
  colorRange: [string, string],
  center: [number, number, number]
): Particle[] {
  const particles: Particle[] = []
  const [c1, c2] = colorRange.map(hexToRgbNorm)
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
    const x = r * Math.cos(theta) + (Math.random() - 0.5) * spread + center[0]
    const y = (Math.random() - 0.5) * 0.15 * (1 + t * 0.5) + center[1]
    const z = r * Math.sin(theta) + (Math.random() - 0.5) * spread + center[2]
    const color = lerpColor(c1, c2, t)
    const dist = Math.sqrt(x * x + z * z)
    const speed = 0.3 + dist * 0.15
    const vx = -Math.sin(theta) * speed * 0.02
    const vz = Math.cos(theta) * speed * 0.02
    particles.push({
      id: i,
      galaxyId,
      position: [x, y, z],
      prevPosition: [x, y, z],
      velocity: [vx, 0, vz],
      color: [...color] as [number, number, number],
      originalColor: [...color] as [number, number, number],
      galaxyColor: [...c1] as [number, number, number],
      mass: 0.5 + Math.random() * 1.5,
    })
  }
  return particles
}

function generateEllipticalParticles(
  galaxyId: string,
  count: number,
  colorRange: [string, string],
  center: [number, number, number]
): Particle[] {
  const particles: Particle[] = []
  const [c1, c2] = colorRange.map(hexToRgbNorm)
  for (let i = 0; i < count; i++) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    const scale = 0.12
    const x = z0 * scale * 1.3 + center[0]
    const y = z1 * scale * 0.8 + center[1]
    const z = (Math.random() - 0.5) * 2 * 0.9 * scale * (Math.abs(z0) + Math.abs(z1)) * 0.3 + center[2]
    const dist = Math.sqrt((x - center[0]) ** 2 + (y - center[1]) ** 2 + (z - center[2]) ** 2)
    const blend = Math.min(1, dist * 2)
    const color = lerpColor(c1, c2, blend)
    const angle = Math.atan2(y - center[1], x - center[0])
    const speed = 0.01 + dist * 0.05
    const vx = -Math.sin(angle) * speed
    const vz = Math.cos(angle) * speed
    particles.push({
      id: i,
      galaxyId,
      position: [x, y, z],
      prevPosition: [x, y, z],
      velocity: [vx, 0, vz],
      color: [...color] as [number, number, number],
      originalColor: [...color] as [number, number, number],
      galaxyColor: [...c1] as [number, number, number],
      mass: 0.8 + Math.random() * 2.0,
    })
  }
  return particles
}

function generateIrregularParticles(
  galaxyId: string,
  count: number,
  colorRange: [string, string],
  center: [number, number, number]
): Particle[] {
  const particles: Particle[] = []
  const [c1, c2] = colorRange.map(hexToRgbNorm)
  const clusters = 3 + Math.floor(Math.random() * 3)
  const clusterCenters: [number, number, number][] = []
  for (let c = 0; c < clusters; c++) {
    clusterCenters.push([
      center[0] + (Math.random() - 0.5) * 1.5,
      center[1] + (Math.random() - 0.5) * 0.5,
      center[2] + (Math.random() - 0.5) * 1.5,
    ])
  }
  for (let i = 0; i < count; i++) {
    const cluster = clusterCenters[i % clusters]
    const scale = 0.2
    const x = cluster[0] + (Math.random() - 0.5) * scale * 2
    const y = cluster[1] + (Math.random() - 0.5) * scale * 0.8
    const z = cluster[2] + (Math.random() - 0.5) * scale * 2
    const color = lerpColor(c1, c2, Math.random())
    const angle = Math.atan2(z - center[2], x - center[0])
    const speed = 0.005 + Math.random() * 0.01
    const vx = -Math.sin(angle) * speed
    const vz = Math.cos(angle) * speed
    particles.push({
      id: i,
      galaxyId,
      position: [x, y, z],
      prevPosition: [x, y, z],
      velocity: [vx, 0, vz],
      color: [...color] as [number, number, number],
      originalColor: [...color] as [number, number, number],
      galaxyColor: [...c1] as [number, number, number],
      mass: 0.3 + Math.random() * 1.0,
    })
  }
  return particles
}

function generateGalaxyParticles(
  type: GalaxyType,
  galaxyId: string,
  count: number,
  colorRange: [string, string],
  center: [number, number, number]
): Particle[] {
  switch (type) {
    case 'spiral': return generateSpiralParticles(galaxyId, count, colorRange, center)
    case 'elliptical': return generateEllipticalParticles(galaxyId, count, colorRange, center)
    case 'irregular': return generateIrregularParticles(galaxyId, count, colorRange, center)
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
  const id = `gal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const baseColor = hexToRgbNorm(preset.colorRange[0])
  const particles = generateGalaxyParticles(type, id, count, preset.colorRange, position)
  return {
    id,
    type,
    name,
    position,
    rotationSpeed,
    particleCount: count,
    colorRange: preset.colorRange,
    galaxyBaseColor: baseColor,
    particles,
  }
}

export { hexToRgbNorm, lerpColor }
