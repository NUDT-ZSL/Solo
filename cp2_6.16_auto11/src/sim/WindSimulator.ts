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
  originLat: number
  originLon: number
  age: number
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function perlin2(x: number, y: number, seed: number): number {
  const rand = seededRandom(seed)
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  const p = new Array(512)
  for (let i = 0; i < 256; i++) p[i] = Math.floor(rand() * 256)
  for (let i = 256; i < 512; i++) p[i] = p[i - 256]

  const u = fade(xf)
  const v = fade(yf)
  const A = p[X] + Y
  const AA = p[A]
  const AB = p[A + 1]
  const B = p[X + 1] + Y
  const BA = p[B]
  const BB = p[B + 1]

  return lerp(
    lerp(grad(p[AA], xf, yf), grad(p[BA], xf - 1, yf), u),
    lerp(grad(p[AB], xf, yf - 1), grad(p[BB], xf - 1, yf - 1), u),
    v,
  )
}

export function getWind(lat: number, lon: number, seed: number): { u: number; v: number; speed: number } {
  const absLat = Math.abs(lat)
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180

  const n1 = perlin2(lon * 0.015 + seed * 0.0002, lat * 0.02 + seed * 0.0001, seed + 1000)
  const n2 = perlin2(lon * 0.03 - seed * 0.0001, lat * 0.04 + seed * 0.0003, seed + 2000)
  const n3 = perlin2(lon * 0.06 + seed * 0.00015, lat * 0.05 - seed * 0.0001, seed + 3000)

  const noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2

  let u = 0
  let v = 0

  if (absLat < 30) {
    const tradeWindStrength = -10 - 8 * Math.cos(latRad * 3)
    u = tradeWindStrength + n1 * 8
    v = -3 * Math.sin(latRad * 6) + n2 * 3
  } else if (absLat < 60) {
    const midLat = (absLat - 30) / 30
    const westerlyStrength = 15 * Math.sin(midLat * Math.PI) + 6
    u = westerlyStrength * Math.sign(lat) + n1 * 6
    v = 2 * Math.sign(lat) * Math.sin(midLat * Math.PI * 2) + n2 * 2.5
  } else {
    const polarStrength = -8 - 6 * Math.cos(((absLat - 60) * Math.PI) / 30)
    u = polarStrength * Math.sign(lat) + n1 * 4
    v = -1.5 * Math.sign(lat) + n2 * 2
  }

  u += n3 * 5
  v += n3 * 3.5

  u += noise * 4
  v += noise * 2.5

  const jetLat = 45 + n1 * 10
  if (Math.abs(lat - jetLat) < 8 || Math.abs(lat + jetLat) < 8) {
    const jetDist = Math.min(Math.abs(lat - jetLat), Math.abs(lat + jetLat)) / 8
    const jetStrength = 35 * (1 - jetDist)
    u += jetStrength * (lat > 0 ? 1 : -1)
  }

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
      originLat: lat,
      originLon: lon,
      age: 0,
    })
  }

  return particles
}

export function updateParticles(particles: ParticleData[], delta: number, seed: number): ParticleData[] {
  return particles.map((p) => {
    let newLat = p.lat
    let newLon = p.lon
    let newLife = p.life + delta
    let newAge = p.age + delta

    const steps = 3
    const stepDelta = delta / steps
    for (let s = 0; s < steps; s++) {
      const wind = getWind(newLat, newLon, seed)

      const latStep = wind.v * stepDelta * 0.12
      const cosLat = Math.cos((newLat * Math.PI) / 180)
      const lonStep = Math.abs(cosLat) > 0.01 ? wind.u * stepDelta * 0.12 / cosLat : 0

      newLat += latStep
      newLon += lonStep
    }

    if (newLat > 85) newLat = 85 - (newLat - 85)
    if (newLat < -85) newLat = -85 - (newLat + 85)
    if (newLon > 180) newLon -= 360
    if (newLon < -180) newLon += 360

    const regenerate =
      newLife > p.maxLife ||
      Math.abs(newLat - p.originLat) > 60 ||
      Math.abs(newLon - p.originLon) > 120 ||
      newAge > 8

    if (regenerate) {
      const rand = seededRandom(seed + Math.floor(newLife * 100) + Math.floor(newAge * 50))
      newLat = (rand() - 0.5) * 170
      newLon = (rand() - 0.5) * 360
      newLife = 0
      newAge = 0
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
      originLat: regenerate ? newLat : p.originLat,
      originLon: regenerate ? newLon : p.originLon,
      age: newAge,
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
