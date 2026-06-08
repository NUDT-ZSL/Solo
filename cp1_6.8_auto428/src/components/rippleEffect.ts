import * as THREE from 'three'
import { RippleData } from '@/store'

const RIPPLE_MAX_RADIUS = 12
const RIPPLE_DURATION = 3.0
const RIPPLE_FORCE = 8.0
const RIPPLE_WIDTH = 1.5

export function applyRippleForce(
  px: number,
  pz: number,
  ripples: RippleData[],
  deltaTime: number,
  outForce: { x: number; z: number }
): void {
  outForce.x = 0
  outForce.z = 0

  for (let i = 0; i < ripples.length; i++) {
    const ripple = ripples[i]
    const dx = px - ripple.x
    const dz = pz - ripple.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const currentRadius = (ripple.time / RIPPLE_DURATION) * RIPPLE_MAX_RADIUS

    if (currentRadius < 0.1) continue

    const diff = Math.abs(dist - currentRadius)
    if (diff < RIPPLE_WIDTH) {
      const falloff = 1.0 - diff / RIPPLE_WIDTH
      const timeDecay = Math.max(0, 1.0 - ripple.time / RIPPLE_DURATION)
      const strength = falloff * timeDecay * ripple.strength * RIPPLE_FORCE

      if (dist > 0.001) {
        outForce.x += (dx / dist) * strength
        outForce.z += (dz / dist) * strength
      }
    }
  }

  void deltaTime
}

export function updateRipples(
  ripples: RippleData[],
  deltaTime: number,
  onExpired: (id: number) => void
): RippleData[] {
  return ripples
    .map((r) => ({
      ...r,
      time: r.time + deltaTime,
      strength: r.strength * (1.0 - deltaTime * 0.8),
    }))
    .filter((r) => {
      if (r.time >= RIPPLE_DURATION) {
        onExpired(r.id)
        return false
      }
      return true
    })
}

export function createRippleRings(
  ripples: RippleData[],
  scene: THREE.Scene,
  existingRings: Map<number, THREE.Mesh[]>,
  themeColor: string
): Map<number, THREE.Mesh[]> {
  const newMap = new Map<number, THREE.Mesh[]>()

  for (const ripple of ripples) {
    let rings = existingRings.get(ripple.id)
    if (!rings) {
      rings = []
      for (let i = 0; i < 3; i++) {
        const geometry = new THREE.RingGeometry(0.1, 0.3, 64)
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(themeColor),
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -Math.PI / 2
        mesh.position.set(ripple.x, 0.2 + i * 0.1, ripple.z)
        scene.add(mesh)
        rings.push(mesh)
      }
    }

    const progress = ripple.time / RIPPLE_DURATION
    const timeDecay = Math.max(0, 1.0 - progress)

    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i]
      const offset = i * 0.15
      const ringProgress = Math.max(0, progress - offset)
      const radius = ringProgress * RIPPLE_MAX_RADIUS
      const scale = Math.max(0.01, radius)

      ring.scale.set(scale, scale, scale)
      ring.material.opacity = timeDecay * 0.5 * (1.0 - i * 0.15)
      ring.position.y = 0.2 + i * 0.1
    }

    newMap.set(ripple.id, rings)
  }

  for (const [id, rings] of existingRings) {
    if (!newMap.has(id)) {
      for (const ring of rings) {
        scene.remove(ring)
        ring.geometry.dispose()
        ;(ring.material as THREE.Material).dispose()
      }
    }
  }

  return newMap
}
