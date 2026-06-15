import type { Particle, Galaxy, SimulationParams, WorkerCommand, WorkerResponse } from '../../constants'

interface WorkerState {
  galaxies: Galaxy[]
  params: SimulationParams
  running: boolean
  collisionActive: boolean
  collisionGalaxyIds: [string, string] | null
  collisionStartTime: number
  collisionDuration: number
  galaxyRotations: Record<string, number>
  burstParticles: Particle[]
  burstStartTime: number
  burstDuration: number
}

const state: WorkerState = {
  galaxies: [],
  params: { gravityConstant: 1.0, elasticity: 0.5, simulationSpeed: 1.0 },
  running: false,
  collisionActive: false,
  collisionGalaxyIds: null,
  collisionStartTime: 0,
  collisionDuration: 3000,
  galaxyRotations: {},
  burstParticles: [],
  burstStartTime: 0,
  burstDuration: 2000,
}

function send(msg: WorkerResponse) {
  self.postMessage(msg)
}

function initGalaxyRotations() {
  state.galaxies.forEach(g => {
    if (state.galaxyRotations[g.id] === undefined) {
      state.galaxyRotations[g.id] = 0
    }
  })
}

function computeGravity(p: Particle, allParticles: Particle[], params: SimulationParams): [number, number, number] {
  let fx = 0, fy = 0, fz = 0
  const G = params.gravityConstant * 0.001
  const softening = 0.5

  const sampleSize = Math.min(allParticles.length, 200)
  const step = Math.max(1, Math.floor(allParticles.length / sampleSize))

  for (let i = 0; i < allParticles.length; i += step) {
    const other = allParticles[i]
    if (other.id === p.id) continue

    const dx = other.position[0] - p.position[0]
    const dy = other.position[1] - p.position[1]
    const dz = other.position[2] - p.position[2]
    const distSq = dx * dx + dy * dy + dz * dz + softening * softening
    const dist = Math.sqrt(distSq)
    const force = (G * other.mass * step) / distSq

    fx += (dx / dist) * force
    fy += (dy / dist) * force
    fz += (dz / dist) * force
  }

  return [fx, fy, fz]
}

function computeCollisionGravity(
  p: Particle,
  galaxies: Galaxy[],
  collisionIds: [string, string],
  params: SimulationParams
): [number, number, number] {
  let fx = 0, fy = 0, fz = 0
  const G = params.gravityConstant * 0.005
  const softening = 0.3

  for (const gid of collisionIds) {
    const galaxy = galaxies.find(g => g.id === gid)
    if (!galaxy) continue

    const cx = galaxy.position[0]
    const cy = galaxy.position[1]
    const cz = galaxy.position[2]

    const dx = cx - p.position[0]
    const dy = cy - p.position[1]
    const dz = cz - p.position[2]
    const distSq = dx * dx + dy * dy + dz * dz + softening * softening
    const dist = Math.sqrt(distSq)
    const totalMass = galaxy.particles.reduce((s, pp) => s + pp.mass, 0)
    const force = (G * totalMass) / distSq

    fx += (dx / dist) * force
    fy += (dy / dist) * force
    fz += (dz / dist) * force
  }

  return [fx, fy, fz]
}

function blendColors(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ]
}

function generateBurstParticles(center: [number, number, number], count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const speed = 0.02 + Math.random() * 0.04
    const vx = Math.sin(phi) * Math.cos(theta) * speed
    const vy = Math.sin(phi) * Math.sin(theta) * speed
    const vz = Math.cos(phi) * speed

    particles.push({
      id: 100000 + i,
      position: [...center],
      velocity: [vx, vy, vz],
      color: [1, 0.9, 0.5],
      originalColor: [1, 0.9, 0.5],
      mass: 0.1,
    })
  }
  return particles
}

function simulate(dt: number) {
  const speed = state.params.simulationSpeed
  const scaledDt = dt * speed
  const allParticles: Particle[] = []

  for (const galaxy of state.galaxies) {
    allParticles.push(...galaxy.particles)
  }

  if (state.collisionActive && state.collisionGalaxyIds) {
    const elapsed = Date.now() - state.collisionStartTime
    const blendProgress = Math.min(1, elapsed / 3000)

    const [id1, id2] = state.collisionGalaxyIds
    const g1 = state.galaxies.find(g => g.id === id1)
    const g2 = state.galaxies.find(g => g.id === id2)

    if (g1 && g2) {
      for (const galaxy of state.galaxies) {
        const isCollisionGalaxy = galaxy.id === id1 || galaxy.id === id2

        for (const p of galaxy.particles) {
          if (isCollisionGalaxy) {
            const [fx, fy, fz] = computeCollisionGravity(p, state.galaxies, state.collisionGalaxyIds, state.params)
            p.velocity[0] += fx * scaledDt
            p.velocity[1] += fy * scaledDt
            p.velocity[2] += fz * scaledDt

            const otherGalaxy = galaxy.id === id1 ? g2 : g1
            p.color = blendColors(p.originalColor, otherGalaxy.particles[0]?.originalColor || p.originalColor, blendProgress)
          } else {
            const [fx, fy, fz] = computeGravity(p, allParticles, state.params)
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

      if (elapsed >= state.collisionDuration) {
        const center: [number, number, number] = [
          (g1.position[0] + g2.position[0]) / 2,
          (g1.position[1] + g2.position[1]) / 2,
          (g1.position[2] + g2.position[2]) / 2,
        ]

        state.burstParticles = generateBurstParticles(center, 80)
        state.burstStartTime = Date.now()

        const mergedGalaxyId = `merged_${Date.now()}`
        state.collisionActive = false
        state.collisionGalaxyIds = null
        send({ type: 'COLLISION_COMPLETE', mergedGalaxyId })
      }
    }
  } else {
    for (const galaxy of state.galaxies) {
      const rotSpeed = galaxy.rotationSpeed * 0.002 * speed
      state.galaxyRotations[galaxy.id] = (state.galaxyRotations[galaxy.id] || 0) + rotSpeed * scaledDt

      for (const p of galaxy.particles) {
        const dx = p.position[0] - galaxy.position[0]
        const dz = p.position[2] - galaxy.position[2]

        const angle = rotSpeed * scaledDt
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        const newX = dx * cos - dz * sin
        const newZ = dx * sin + dz * cos

        p.position[0] = galaxy.position[0] + newX
        p.position[2] = galaxy.position[2] + newZ

        const [fx, fy, fz] = computeGravity(p, allParticles, state.params)
        p.velocity[0] += fx * scaledDt
        p.velocity[1] += fy * scaledDt
        p.velocity[2] += fz * scaledDt

        const toCenterX = galaxy.position[0] - p.position[0]
        const toCenterZ = galaxy.position[2] - p.position[2]
        const toCenterDist = Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ)
        if (toCenterDist > 0.01) {
          p.velocity[0] += toCenterX / toCenterDist * 0.0001 * scaledDt
          p.velocity[2] += toCenterZ / toCenterDist * 0.0001 * scaledDt
        }

        p.velocity[0] *= 0.998
        p.velocity[1] *= 0.998
        p.velocity[2] *= 0.998

        p.position[0] += p.velocity[0] * scaledDt
        p.position[1] += p.velocity[1] * scaledDt
        p.position[2] += p.velocity[2] * scaledDt
      }
    }
  }

  if (state.burstParticles.length > 0) {
    const burstElapsed = Date.now() - state.burstStartTime
    const burstProgress = burstElapsed / state.burstDuration

    for (const bp of state.burstParticles) {
      bp.position[0] += bp.velocity[0] * scaledDt * 2
      bp.position[1] += bp.velocity[1] * scaledDt * 2
      bp.position[2] += bp.velocity[2] * scaledDt * 2

      bp.color = [
        1 * (1 - burstProgress) + 0.3 * burstProgress,
        0.9 * (1 - burstProgress) + 0.1 * burstProgress,
        0.5 * (1 - burstProgress) + 0.1 * burstProgress,
      ]
    }

    if (burstElapsed >= state.burstDuration) {
      state.burstParticles = []
    }
  }

  const resultParticles: Particle[] = []
  for (const galaxy of state.galaxies) {
    resultParticles.push(...galaxy.particles)
  }
  resultParticles.push(...state.burstParticles)

  send({ type: 'FRAME_UPDATE', particles: resultParticles, galaxyRotations: { ...state.galaxyRotations } })
}

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const msg = e.data

  switch (msg.type) {
    case 'INIT':
      state.galaxies = msg.galaxies
      state.params = msg.params
      state.running = true
      initGalaxyRotations()
      send({ type: 'READY' })
      break

    case 'UPDATE_PARAMS':
      state.params = { ...state.params, ...msg.params }
      break

    case 'ADD_GALAXY':
      state.galaxies.push(msg.galaxy)
      state.galaxyRotations[msg.galaxy.id] = 0
      break

    case 'START_COLLISION':
      state.collisionActive = true
      state.collisionGalaxyIds = msg.galaxyIds
      state.collisionStartTime = Date.now()
      break

    case 'PAUSE':
      state.running = false
      break

    case 'RESUME':
      state.running = true
      break

    case 'RESET':
      state.galaxies = []
      state.running = false
      state.collisionActive = false
      state.collisionGalaxyIds = null
      state.burstParticles = []
      state.galaxyRotations = {}
      break

    case 'STEP':
      if (state.running) {
        simulate(msg.dt)
      }
      break
  }
}
