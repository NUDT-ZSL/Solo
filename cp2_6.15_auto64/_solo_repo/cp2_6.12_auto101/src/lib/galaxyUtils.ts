import * as THREE from 'three'

export function lerpColor(
  inner: [number, number, number],
  outer: [number, number, number],
  t: number
): [number, number, number] {
  const ct = Math.max(0, Math.min(1, t))
  return [
    inner[0] + (outer[0] - inner[0]) * ct,
    inner[1] + (outer[1] - inner[1]) * ct,
    inner[2] + (outer[2] - inner[2]) * ct,
  ]
}

export function getStarColorRGB(radialDistance: number, maxRadius: number): [number, number, number] {
  const t = Math.min(radialDistance / maxRadius, 1.0)

  const innerColor: [number, number, number] = [1.0, 0.55, 0.15]
  const midColor: [number, number, number] = [1.0, 0.9, 0.6]
  const outerColor: [number, number, number] = [0.6, 0.75, 1.0]
  const farColor: [number, number, number] = [0.8, 0.7, 1.0]

  if (t < 0.33) {
    return lerpColor(innerColor, midColor, t / 0.33)
  } else if (t < 0.66) {
    return lerpColor(midColor, outerColor, (t - 0.33) / 0.33)
  } else {
    return lerpColor(outerColor, farColor, (t - 0.66) / 0.34)
  }
}

export function easeInOutCubic(t: number): number {
  const ct = Math.max(0, Math.min(1, t))
  return ct < 0.5 ? 4 * ct * ct * ct : 1 - Math.pow(-2 * ct + 2, 3) / 2
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export interface DebrisParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotation: number
  rotationSpeed: number
  life: number
  maxLife: number
  opacity: number
  baseSpeed: number
  radialRatio: number
  size: number
}

export function createDebrisParticles(
  origin: THREE.Vector3,
  count: number
): DebrisParticle[] {
  const debris: DebrisParticle[] = []
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = (Math.random() - 0.5) * Math.PI * 0.8
    const speed = 2 + Math.random() * 6
    const radialDir = new THREE.Vector3(
      Math.cos(phi) * Math.cos(theta),
      Math.sin(phi),
      Math.cos(phi) * Math.sin(theta)
    ).normalize()

    const tangentialDir = new THREE.Vector3(-radialDir.z, 0, radialDir.x).normalize()
    const upTangential = new THREE.Vector3()
      .crossVectors(radialDir, tangentialDir)
      .normalize()

    const distanceFactor = speed / 8
    const radialRatio = 0.5 + 0.4 * distanceFactor
    const tangentialSpeed = speed * (1 - radialRatio) * (0.5 + Math.random() * 0.5)
    const upTangentialSpeed = tangentialSpeed * (Math.random() - 0.5) * 0.6

    const velocity = new THREE.Vector3()
      .addScaledVector(radialDir, speed * radialRatio)
      .addScaledVector(tangentialDir, tangentialSpeed)
      .addScaledVector(upTangential, upTangentialSpeed)

    const maxLife = 1.5 + Math.random() * 1.0

    debris.push({
      position: origin.clone(),
      velocity,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 8,
      life: 0,
      maxLife,
      opacity: 1.0,
      baseSpeed: speed,
      radialRatio,
      size: 0.08 + Math.random() * 0.12,
    })
  }
  return debris
}

export function updateDebrisParticle(
  d: DebrisParticle,
  delta: number
): DebrisParticle {
  const newLife = d.life + delta
  const lifeRatio = Math.min(newLife / d.maxLife, 1)
  const newOpacity = lifeRatio > 0.6 ? 1 - easeOutQuad((lifeRatio - 0.6) / 0.4) : 1

  const newPosition = d.position.clone().addScaledVector(d.velocity, delta)
  const newRotation = d.rotation + d.rotationSpeed * delta

  return {
    ...d,
    position: newPosition,
    rotation: newRotation,
    life: newLife,
    opacity: Math.max(0, newOpacity),
  }
}

export function getDebrisColor(lifeRatio: number): [number, number, number] {
  if (lifeRatio < 0.15) {
    return lerpColor([1, 1, 1], [1, 0.8, 0.3], lifeRatio / 0.15)
  } else if (lifeRatio < 0.5) {
    return lerpColor([1, 0.8, 0.3], [1, 0.3, 0.1], (lifeRatio - 0.15) / 0.35)
  } else {
    return lerpColor([1, 0.3, 0.1], [0.3, 0.05, 0.02], (lifeRatio - 0.5) / 0.5)
  }
}

export function getLodLevel(
  distance: number,
  cameraPosition: THREE.Vector3
): number {
  const d = distance
  if (d < 40) return 0
  if (d < 80) return 1
  return 2
}

export function getLodSizeFactor(lodLevel: number): number {
  if (lodLevel === 0) return 1.0
  if (lodLevel === 1) return 0.7
  return 0.4
}
