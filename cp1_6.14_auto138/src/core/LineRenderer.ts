import * as THREE from 'three'
import type { ParticleData } from './ParticleEngine'

const CONNECTION_DISTANCE = 25
const LINE_OPACITY = 0.3
const LINE_WIDTH = 1
const HIGH_PARTICLE_THRESHOLD = 20000

export class LineRenderer {
  private lineGeometry: THREE.BufferGeometry
  private lineMaterial: THREE.LineBasicMaterial
  private lineMesh: THREE.LineSegments
  private frameCount = 0

  constructor() {
    this.lineGeometry = new THREE.BufferGeometry()
    this.lineMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: LINE_OPACITY,
      linewidth: LINE_WIDTH,
      vertexColors: true
    })
    this.lineMesh = new THREE.LineSegments(this.lineGeometry, this.lineMaterial)
    this.lineMesh.frustumCulled = false
  }

  update(particles: ParticleData[]): void {
    const particleCount = particles.length
    
    const detectionInterval = particleCount > HIGH_PARTICLE_THRESHOLD ? 3 : 1
    this.frameCount++
    
    if (this.frameCount % detectionInterval !== 0) {
      return
    }

    const positions: number[] = []
    const colors: number[] = []

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i]
      
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        
        const distance = p1.position.distanceTo(p2.position)
        
        if (distance < CONNECTION_DISTANCE) {
          positions.push(
            p1.position.x, p1.position.y, p1.position.z,
            p2.position.x, p2.position.y, p2.position.z
          )
          
          const alpha1 = p1.life / p1.maxLife
          const alpha2 = p2.life / p2.maxLife
          
          const mixedColor = p1.startColor.clone().lerp(p2.startColor, 0.5)
          
          colors.push(
            mixedColor.r, mixedColor.g, mixedColor.b, alpha1 * LINE_OPACITY,
            mixedColor.r, mixedColor.g, mixedColor.b, alpha2 * LINE_OPACITY
          )
        }
      }
    }

    const positionArray = new Float32Array(positions)
    const colorArray = new Float32Array(colors)
    
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 4))
    this.lineGeometry.attributes.position.needsUpdate = true
    this.lineGeometry.attributes.color.needsUpdate = true
    this.lineGeometry.computeBoundingSphere()
  }

  getLineMesh(): THREE.LineSegments {
    return this.lineMesh
  }

  dispose(): void {
    this.lineGeometry.dispose()
    this.lineMaterial.dispose()
  }
}
