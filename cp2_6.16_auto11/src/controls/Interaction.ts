import * as THREE from 'three'

export const ROTATION_LIMIT_Y = 30 * (Math.PI / 180)
export const ZOOM_MIN = 2
export const ZOOM_MAX = 8
export const ZOOM_DEFAULT = 5
export const INTERPOLATION_FACTOR = 0.12

export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function clampRotationY(rotY: number): number {
  return Math.max(-ROTATION_LIMIT_Y, Math.min(ROTATION_LIMIT_Y, rotY))
}

export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))
}

export function getTangentVectors(
  position: THREE.Vector3,
): { east: THREE.Vector3; north: THREE.Vector3 } {
  const normal = position.clone().normalize()
  const up = new THREE.Vector3(0, 1, 0)
  let east = new THREE.Vector3().crossVectors(up, normal).normalize()
  if (east.lengthSq() < 0.001) {
    east = new THREE.Vector3(1, 0, 0)
  }
  const north = new THREE.Vector3().crossVectors(normal, east).normalize()
  return { east, north }
}

export function windTo3D(
  position: THREE.Vector3,
  u: number,
  v: number,
): THREE.Vector3 {
  const { east, north } = getTangentVectors(position)
  return east.multiplyScalar(u).add(north.multiplyScalar(v))
}

export function getWindAngle(
  position: THREE.Vector3,
  u: number,
  v: number,
): number {
  const windDir = windTo3D(position, u, v)
  const { east } = getTangentVectors(position)
  return Math.atan2(
    windDir.dot(new THREE.Vector3().crossVectors(position.clone().normalize(), east)),
    windDir.dot(east),
  )
}
