import * as THREE from 'three'

export function createStarTrailCurve(
  from: THREE.Vector3,
  to: THREE.Vector3
): THREE.CatmullRomCurve3 {
  const mid = new THREE.Vector3().lerpVectors(from, to, 0.5)
  const direction = new THREE.Vector3().subVectors(to, from)
  const perpendicular = new THREE.Vector3()
  if (Math.abs(direction.x) < Math.abs(direction.y)) {
    perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0))
  } else {
    perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0))
  }
  perpendicular.normalize().multiplyScalar(direction.length() * 0.3)
  mid.add(perpendicular)
  return new THREE.CatmullRomCurve3([from.clone(), mid, to.clone()])
}

export function distributeOnSphere(
  count: number,
  radius: number,
  center: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio
    const phi = Math.acos(1 - 2 * (i + 0.5) / count)
    points.push(
      new THREE.Vector3(
        center.x + radius * Math.sin(phi) * Math.cos(theta),
        center.y + radius * Math.sin(phi) * Math.sin(theta),
        center.z + radius * Math.cos(phi)
      )
    )
  }
  return points
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function dampen(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt))
}
