import * as THREE from 'three'

const EARTH_RADIUS = 3
const PARTICLE_ALTITUDE = 0.1

export interface ParticleData {
  lat: number
  lon: number
  u: number
  v: number
  speed: number
  life: number
  maxLife: number
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function getWind(lat: number, lon: number, seed: number): { u: number; v: number; speed: number } {
  const absLat = Math.abs(lat)
  const rand = seededRandom(Math.floor(seed * 0.001) + Math.floor(lat * 10) + Math.floor(lon * 10))
  let u = 0
  let v = 0

  if (absLat < 30) {
    u = -6 - 7 * Math.cos((lat * Math.PI) / 30)
    v = -2.5 * Math.sign(lat)
  } else if (absLat < 60) {
    u = 8 + 10 * Math.sin(((absLat - 30) * Math.PI) / 30)
    v = 1.8 * Math.sign(lat)
  } else {
    u = -3 - 5 * Math.cos(((absLat - 60) * Math.PI) / 30)
    v = -1 * Math.sign(lat)
  }

  const noise1 = Math.sin(lon * 0.08 + seed * 0.003) * 3.5
  const noise2 = Math.cos(lat * 0.12 + seed * 0.005) * 2.5
  const noise3 = Math.sin((lon + lat) * 0.05 + seed * 0.002) * 2
  u += noise1 + noise3
  v += noise2

  u += (rand() - 0.5) * 2
  v += (rand() - 0.5) * 1.5

  const speed = Math.sqrt(u * u + v * v)
  return { u, v, speed }
}

export function generateParticles(count: number, seed: number): ParticleData[] {
  const particles: ParticleData[] = []
  const rand = seededRandom(seed)

  for (let i = 0; i < count; i++) {
    const lat = (rand() - 0.5) * 170
    const lon = (rand() - 0.5) * 360
    const wind = getWind(lat, lon, seed)
    const maxLife = 3 + rand() * 5

    particles.push({
      lat,
      lon,
      u: wind.u,
      v: wind.v,
      speed: wind.speed,
      life: rand() * maxLife,
      maxLife,
    })
  }

  return particles
}

export function updateParticles(particles: ParticleData[], delta: number, seed: number): ParticleData[] {
  return particles.map((p) => {
    let newLat = p.lat + p.v * delta * 0.15
    let newLon = p.lon + p.u * delta * 0.15 / Math.cos((p.lat * Math.PI) / 180)
    let newLife = p.life + delta

    if (newLat > 85) newLat = 85 - (newLat - 85)
    if (newLat < -85) newLat = -85 - (newLat + 85)
    if (newLon > 180) newLon -= 360
    if (newLon < -180) newLon += 360

    if (newLife > p.maxLife) {
      const rand = seededRandom(seed + Math.floor(newLife * 100))
      newLat = (rand() - 0.5) * 170
      newLon = (rand() - 0.5) * 360
      newLife = 0
    }

    const wind = getWind(newLat, newLon, seed)

    return {
      lat: newLat,
      lon: newLon,
      u: wind.u,
      v: wind.v,
      speed: wind.speed,
      life: newLife,
      maxLife: p.maxLife,
    }
  })
}

export function latLonToVec3(lat: number, lon: number, radius?: number): THREE.Vector3 {
  const r = radius ?? EARTH_RADIUS + PARTICLE_ALTITUDE
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  )
}

export function speedToColor(speed: number): THREE.Color {
  const t = Math.min(1, Math.max(0, (speed - 5) / 15))
  const low = new THREE.Color('#1e88e5')
  const high = new THREE.Color('#e53935')
  return low.clone().lerp(high, t)
}

export function getAverageSpeed(particles: ParticleData[]): number {
  if (particles.length === 0) return 0
  const total = particles.reduce((sum, p) => sum + p.speed, 0)
  return total / particles.length
}
