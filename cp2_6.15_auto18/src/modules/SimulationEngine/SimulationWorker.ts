import type { Galaxy, Particle, SimulationParams, WorkerCommand, WorkerResponse } from '../../constants'

interface CollisionContext {
  active: boolean
  galaxyIds: [string, string] | null
  startTime: number
  duration: number
  galaxyAColor: [number, number, number]
  galaxyBColor: [number, number, number]
  aGalaxyId: string
  bGalaxyId: string
}

interface Burst {
  startTime: number
  duration: number
  particles: Particle[]
}

const MAX_PARTICLES = 5000

let galaxies: Galaxy[] = []
let params: SimulationParams = { gravityConstant: 1.0, elasticity: 0.5, simulationSpeed: 1.0 }
let running = false
let galaxyRotations: Record<string, number> = {}
let collisionCtx: CollisionContext = {
  active: false,
  galaxyIds: null,
  startTime: 0,
  duration: 3000,
  galaxyAColor: [0, 0, 0],
  galaxyBColor: [0, 0, 0],
  aGalaxyId: '',
  bGalaxyId: '',
}
let bursts: Burst[] = []
let placedGalaxies: Record<string, { startTime: number; duration: number }> = {}

const positionsBuf = new Float32Array(MAX_PARTICLES * 3)
const colorsBuf = new Float32Array(MAX_PARTICLES * 3)
const prevPositionsBuf = new Float32Array(MAX_PARTICLES * 3)
const particleIdsBuf = new Int32Array(MAX_PARTICLES)
const particleGalaxiesBuf = new Int32Array(MAX_PARTICLES)

function send(msg: WorkerResponse) {
  self.postMessage(msg)
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function gravityForce(
  p: Particle,
  center: [number, number, number],
  totalMass: number,
  G: number
): [number, number, number] {
  const dx = center[0] - p.position[0]
  const dy = center[1] - p.position[1]
  const dz = center[2] - p.position[2]
  const distSq = dx * dx + dy * dy + dz * dz + 0.3 * 0.3
  const dist = Math.sqrt(distSq)
  const force = (G * totalMass) / distSq
  return [(dx / dist) * force, (dy / dist) * force, (dz / dist) * force]
}

function galaxyCenterMass(g: Galaxy): { center: [number, number, number]; mass: number } {
  let cx = 0, cy = 0, cz = 0, m = 0
  for (const p of g.particles) {
    cx += p.position[0] * p.mass
    cy += p.position[1] * p.mass
    cz += p.position[2] * p.mass
    m += p.mass
  }
  if (m === 0) return { center: g.position, mass: 0 }
  return { center: [cx / m, cy / m, cz / m], mass: m }
}

function rotateGalaxyParticles(g: Galaxy, scaledDt: number) {
  const rot = (g.rotationSpeed * 0.0015) * scaledDt
  const cm = galaxyCenterMass(g)
  const cx = cm.center[0]
  const cy = cm.center[1]
  const cz = cm.center[2]
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  for (const p of g.particles) {
    const dx = p.position[0] - cx
    const dz = p.position[2] - cz
    p.prevPosition[0] = p.position[0]
    p.prevPosition[1] = p.position[1]
    p.prevPosition[2] = p.position[2]
    p.position[0] = cx + dx * cos - dz * sin
    p.position[2] = cz + dx * sin + dz * cos
    const tx = p.prevPosition[0] - cx
    const tz = p.prevPosition[2] - cz
    p.prevPosition[0] = cx + tx * cos - tz * sin
    p.prevPosition[2] = cz + tx * sin + tz * cos
  }
  g.position[0] = cx
  g.position[1] = cy
  g.position[2] = cz
}

function generateBurstParticles(center: [number, number, number], count: number): Particle[] {
  const result: Particle[] = []
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const speed = 0.03 + Math.random() * 0.05
    const vx = Math.sin(phi) * Math.cos(theta) * speed
    const vy = Math.sin(phi) * Math.sin(theta) * speed
    const vz = Math.cos(phi) * speed
    result.push({
      id: 900000 + Math.floor(Math.random() * 99999),
      galaxyId: '__burst__',
      position: [...center] as [number, number, number],
      prevPosition: [...center] as [number, number, number],
      velocity: [vx, vy, vz],
      color: [1, 0.95, 0.7],
      originalColor: [1, 0.95, 0.7],
      galaxyColor: [1, 0.9, 0.5],
      mass: 0.05,
    })
  }
  return result
}

function simulate(dt: number) {
  const speed = params.simulationSpeed
  const scaledDt = Math.min(dt, 3) * speed
  const G = params.gravityConstant * 0.003
  const allGalaxiesData = galaxies.map(g => ({ galaxy: g, ...galaxyCenterMass(g) }))

  if (collisionCtx.active && collisionCtx.galaxyIds) {
    const elapsed = Date.now() - collisionCtx.startTime
    const blendProgress = Math.min(1, elapsed / collisionCtx.duration)
    const [idA, idB] = collisionCtx.galaxyIds
    const gA = allGalaxiesData.find(d => d.galaxy.id === idA)
    const gB = allGalaxiesData.find(d => d.galaxy.id === idB)

    if (gA && gB) {
      const colA = collisionCtx.galaxyAColor
      const colB = collisionCtx.galaxyBColor
      for (const gd of allGalaxiesData) {
        const isA = gd.galaxy.id === idA
        const isB = gd.galaxy.id === idB
        const isCollision = isA || isB
        for (const p of gd.galaxy.particles) {
          p.prevPosition[0] = p.position[0]
          p.prevPosition[1] = p.position[1]
          p.prevPosition[2] = p.position[2]
          if (isCollision) {
            const targetCenter = isA ? gB.center : gA.center
            const targetMass = isA ? gB.mass : gA.mass
            const ownCenter = isA ? gA.center : gB.center
            const ownMass = isA ? gA.mass : gB.mass
            const [fx1, fy1, fz1] = gravityForce(p, ownCenter, ownMass, G * 0.3)
            const [fx2, fy2, fz2] = gravityForce(p, targetCenter, targetMass, G * 0.9)
            p.velocity[0] += (fx1 + fx2) * scaledDt
            p.velocity[1] += (fy1 + fy2) * scaledDt
            p.velocity[2] += (fz1 + fz2) * scaledDt
            const original = isA ? colA : colB
            const target = isA ? colB : colA
            const newColor = lerpColor(original, target, blendProgress)
            p.color[0] = newColor[0]
            p.color[1] = newColor[1]
            p.color[2] = newColor[2]
          } else {
            const [fx, fy, fz] = gravityForce(p, gd.center, gd.mass, G)
            p.velocity[0] += fx * scaledDt
            p.velocity[1] += fy * scaledDt
            p.velocity[2] += fz * scaledDt
          }
          p.velocity[0] *= 0.999
          p.velocity[1] *= 0.999
          p.velocity[2] *= 0.999
          p.position[0] += p.velocity[0] * scaledDt
          p.position[1] += p.velocity[1] * scaledDt
          p.position[2] += p.velocity[2] * scaledDt
        }
      }
      if (elapsed >= collisionCtx.duration) {
        const mid: [number, number, number] = [
          (gA.center[0] + gB.center[0]) / 2,
          (gA.center[1] + gB.center[1]) / 2,
          (gA.center[2] + gB.center[2]) / 2,
        ]
        bursts.push({
          startTime: Date.now(),
          duration: 2000,
          particles: generateBurstParticles(mid, 80),
        })
        collisionCtx.active = false
        collisionCtx.galaxyIds = null
        send({ type: 'COLLISION_COMPLETE', mergedGalaxyId: `merged_${Date.now()}` })
      }
    }
  } else {
    for (const gd of allGalaxiesData) {
      rotateGalaxyParticles(gd.galaxy, scaledDt)
      for (const p of gd.galaxy.particles) {
        const [fx, fy, fz] = gravityForce(p, gd.center, gd.mass, G * 0.3)
        p.velocity[0] += fx * scaledDt
        p.velocity[1] += fy * scaledDt
        p.velocity[2] += fz * scaledDt
        p.velocity[0] *= 0.9985
        p.velocity[1] *= 0.9985
        p.velocity[2] *= 0.9985
        p.position[0] += p.velocity[0] * scaledDt
        p.position[1] += p.velocity[1] * scaledDt
        p.position[2] += p.velocity[2] * scaledDt
      }
    }
  }

  const now = Date.now()
  bursts = bursts.filter(b => {
    const elapsed = now - b.startTime
    const prog = elapsed / b.duration
    for (const p of b.particles) {
      p.prevPosition[0] = p.position[0]
      p.prevPosition[1] = p.position[1]
      p.prevPosition[2] = p.position[2]
      p.position[0] += p.velocity[0] * scaledDt * 1.5
      p.position[1] += p.velocity[1] * scaledDt * 1.5
      p.position[2] += p.velocity[2] * scaledDt * 1.5
      const alpha = 1 - prog
      p.color[0] = Math.min(1, 1 * alpha + 0.3 * (1 - alpha))
      p.color[1] = Math.min(1, 0.95 * alpha + 0.2 * (1 - alpha))
      p.color[2] = Math.min(1, 0.6 * alpha + 0.1 * (1 - alpha))
    }
    return elapsed < b.duration
  })

  let idx = 0
  const galaxyIdList = galaxies.map(g => g.id)
  for (let gi = 0; gi < galaxies.length; gi++) {
    const g = galaxies[gi]
    for (const p of g.particles) {
      if (idx >= MAX_PARTICLES) break
      positionsBuf[idx * 3] = p.position[0]
      positionsBuf[idx * 3 + 1] = p.position[1]
      positionsBuf[idx * 3 + 2] = p.position[2]
      prevPositionsBuf[idx * 3] = p.prevPosition[0]
      prevPositionsBuf[idx * 3 + 1] = p.prevPosition[1]
      prevPositionsBuf[idx * 3 + 2] = p.prevPosition[2]
      colorsBuf[idx * 3] = p.color[0]
      colorsBuf[idx * 3 + 1] = p.color[1]
      colorsBuf[idx * 3 + 2] = p.color[2]
      particleIdsBuf[idx] = p.id
      particleGalaxiesBuf[idx] = gi
      idx++
    }
    if (idx >= MAX_PARTICLES) break
  }
  for (const b of bursts) {
    for (const p of b.particles) {
      if (idx >= MAX_PARTICLES) break
      positionsBuf[idx * 3] = p.position[0]
      positionsBuf[idx * 3 + 1] = p.position[1]
      positionsBuf[idx * 3 + 2] = p.position[2]
      prevPositionsBuf[idx * 3] = p.prevPosition[0]
      prevPositionsBuf[idx * 3 + 1] = p.prevPosition[1]
      prevPositionsBuf[idx * 3 + 2] = p.prevPosition[2]
      colorsBuf[idx * 3] = p.color[0]
      colorsBuf[idx * 3 + 1] = p.color[1]
      colorsBuf[idx * 3 + 2] = p.color[2]
      particleIdsBuf[idx] = p.id
      particleGalaxiesBuf[idx] = -1
      idx++
    }
    if (idx >= MAX_PARTICLES) break
  }

  send({
    type: 'FRAME_UPDATE',
    positions: positionsBuf.subarray(0, idx * 3),
    colors: colorsBuf.subarray(0, idx * 3),
    prevPositions: prevPositionsBuf.subarray(0, idx * 3),
    particleIds: particleIdsBuf.subarray(0, idx),
    galaxyIds: galaxyIdList,
    particleGalaxies: particleGalaxiesBuf.subarray(0, idx),
    totalParticles: idx,
  })
}

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const msg = e.data
  switch (msg.type) {
    case 'INIT':
      galaxies = msg.galaxies
      params = msg.params
      running = true
      for (const g of galaxies) {
        galaxyRotations[g.id] = 0
        placedGalaxies[g.id] = { startTime: Date.now(), duration: 800 }
      }
      send({ type: 'READY' })
      break
    case 'UPDATE_PARAMS':
      params = { ...params, ...msg.params }
      break
    case 'ADD_GALAXY':
      galaxies.push(msg.galaxy)
      galaxyRotations[msg.galaxy.id] = 0
      placedGalaxies[msg.galaxy.id] = { startTime: Date.now(), duration: 800 }
      break
    case 'START_COLLISION': {
      const [idA, idB] = msg.galaxyIds
      const gA = galaxies.find(g => g.id === idA)
      const gB = galaxies.find(g => g.id === idB)
      collisionCtx.active = true
      collisionCtx.galaxyIds = msg.galaxyIds
      collisionCtx.startTime = Date.now()
      collisionCtx.duration = 3000
      collisionCtx.aGalaxyId = idA
      collisionCtx.bGalaxyId = idB
      if (gA && gB) {
        collisionCtx.galaxyAColor = [...gA.galaxyBaseColor] as [number, number, number]
        collisionCtx.galaxyBColor = [...gB.galaxyBaseColor] as [number, number, number]
      }
      send({ type: 'COLLISION_STARTED' })
      break
    }
    case 'PAUSE':
      running = false
      break
    case 'RESUME':
      running = true
      break
    case 'RESET':
      galaxies = []
      running = false
      collisionCtx.active = false
      collisionCtx.galaxyIds = null
      bursts = []
      galaxyRotations = {}
      placedGalaxies = {}
      break
    case 'STEP':
      if (running) simulate(msg.dt)
      break
  }
}

export {}
