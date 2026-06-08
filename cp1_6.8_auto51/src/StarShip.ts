import * as THREE from 'three'
import { TrackManager } from './TrackManager'

interface TrailEntry {
  position: THREE.Vector3
  color: THREE.Color
}

export class StarShip {
  private scene: THREE.Scene
  private trackManager: TrackManager
  private trackIndex: number
  private t: number
  private speed: number
  private mesh: THREE.Mesh
  private haloMesh: THREE.Mesh
  private trail: TrailEntry[] = []
  private trailLine: THREE.Line
  private trailGeometry: THREE.BufferGeometry
  private maxTrailLength = 60
  private colorPhase: number
  private baseColor: THREE.Color

  constructor(
    scene: THREE.Scene,
    trackManager: TrackManager,
    trackIndex: number,
    startT: number = 0,
  ) {
    this.scene = scene
    this.trackManager = trackManager
    this.trackIndex = trackIndex
    this.t = startT
    this.speed = 0.015 + Math.random() * 0.012
    this.colorPhase = Math.random() * Math.PI * 2
    this.baseColor = new THREE.Color().setHSL(0.7 + Math.random() * 0.15, 1, 0.65)

    const geo = new THREE.SphereGeometry(0.2, 16, 16)
    const mat = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: 0.95,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.copy(
      this.trackManager.getPointFromTable(this.trackIndex, this.t),
    )
    this.scene.add(this.mesh)

    const haloGeo = new THREE.SphereGeometry(0.45, 16, 16)
    const haloMat = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    })
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat)
    this.haloMesh.position.copy(this.mesh.position)
    this.scene.add(this.haloMesh)

    this.trailGeometry = new THREE.BufferGeometry()
    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })
    this.trailLine = new THREE.Line(this.trailGeometry, trailMat)
    this.scene.add(this.trailLine)
  }

  update(deltaTime: number, flowSpeed: number, trailLength: number) {
    this.t += this.speed * flowSpeed * deltaTime
    if (this.t > 1) this.t -= 1
    if (this.t < 0) this.t += 1

    const pos = this.trackManager.getPointFromTable(this.trackIndex, this.t)
    this.mesh.position.copy(pos)
    this.haloMesh.position.copy(pos)

    this.colorPhase += deltaTime * 0.6
    const hue = (0.6 + 0.15 * Math.sin(this.colorPhase)) % 1
    this.baseColor.setHSL(hue, 1, 0.65)
    ;(this.mesh.material as THREE.MeshBasicMaterial).color.copy(this.baseColor)
    ;(this.haloMesh.material as THREE.MeshBasicMaterial).color.copy(this.baseColor)

    const pulse = 1 + 0.25 * Math.sin(this.colorPhase * 3)
    this.haloMesh.scale.setScalar(pulse)
    ;(this.haloMesh.material as THREE.MeshBasicMaterial).opacity =
      0.15 + 0.1 * Math.sin(this.colorPhase * 3)

    this.maxTrailLength = Math.floor(25 + trailLength * 50)
    this.trail.push({ position: pos.clone(), color: this.baseColor.clone() })
    while (this.trail.length > this.maxTrailLength) {
      this.trail.shift()
    }
    this.updateTrailGeometry()
  }

  private updateTrailGeometry() {
    if (this.trail.length < 2) return

    const len = this.trail.length
    const positions = new Float32Array(len * 3)
    const colors = new Float32Array(len * 3)

    for (let i = 0; i < len; i++) {
      const entry = this.trail[i]
      const fade = i / len
      positions[i * 3] = entry.position.x
      positions[i * 3 + 1] = entry.position.y
      positions[i * 3 + 2] = entry.position.z
      colors[i * 3] = entry.color.r * fade
      colors[i * 3 + 1] = entry.color.g * fade
      colors[i * 3 + 2] = entry.color.b * fade
    }

    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )
    this.trailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3),
    )
    this.trailGeometry.attributes.position.needsUpdate = true
    this.trailGeometry.attributes.color.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    this.scene.remove(this.haloMesh)
    this.haloMesh.geometry.dispose()
    ;(this.haloMesh.material as THREE.Material).dispose()
    this.scene.remove(this.trailLine)
    this.trailGeometry.dispose()
    ;(this.trailLine.material as THREE.Material).dispose()
  }
}
