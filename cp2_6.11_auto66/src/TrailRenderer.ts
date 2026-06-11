import * as THREE from 'three'

export class TrailRenderer {
  public group: THREE.Group
  private trailLength: number = 20
  private particleCount: number
  private positions: Float32Array[][] = []
  private colors: Float32Array[][] = []
  private currentIndex: number = 0
  private line: THREE.Line
  private geometry: THREE.BufferGeometry
  private material: THREE.LineBasicMaterial
  private trailMesh: THREE.Points
  private trailGeometry: THREE.BufferGeometry
  private trailMaterial: THREE.PointsMaterial
  private vertexCount: number = 0

  constructor(particleCount: number, trailLength: number = 20) {
    this.particleCount = particleCount
    this.trailLength = trailLength
    this.group = new THREE.Group()

    for (let i = 0; i < trailLength; i++) {
      this.positions.push(new Float32Array(particleCount * 3))
      this.colors.push(new Float32Array(particleCount * 3))
    }

    this.vertexCount = particleCount * trailLength

    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const linePositions = new Float32Array(this.vertexCount * 3)
    const lineColors = new Float32Array(this.vertexCount * 3)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

    const indices: number[] = []
    for (let p = 0; p < particleCount; p++) {
      for (let i = 0; i < trailLength - 1; i++) {
        const idx1 = p * trailLength + i
        const idx2 = p * trailLength + i + 1
        indices.push(idx1, idx2)
      }
    }
    this.geometry.setIndex(indices)

    this.line = new THREE.Line(this.geometry, this.material)
    this.group.add(this.line)

    this.trailGeometry = new THREE.BufferGeometry()
    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const pointPositions = new Float32Array(this.vertexCount * 3)
    const pointColors = new Float32Array(this.vertexCount * 3)
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))

    this.trailMesh = new THREE.Points(this.trailGeometry, this.trailMaterial)
    this.group.add(this.trailMesh)
  }

  public update(particlePositions: THREE.Vector3[], particleColors: THREE.Color[]): void {
    const currentPositions = this.positions[this.currentIndex]
    const currentColors = this.colors[this.currentIndex]

    for (let i = 0; i < this.particleCount; i++) {
      const pos = particlePositions[i]
      const color = particleColors[i]
      currentPositions[i * 3] = pos.x
      currentPositions[i * 3 + 1] = pos.y
      currentPositions[i * 3 + 2] = pos.z
      currentColors[i * 3] = color.r
      currentColors[i * 3 + 1] = color.g
      currentColors[i * 3 + 2] = color.b
    }

    this.currentIndex = (this.currentIndex + 1) % this.trailLength

    this.updateLineGeometry()
  }

  private updateLineGeometry(): void {
    const linePositions = this.geometry.attributes.position.array as Float32Array
    const lineColors = this.geometry.attributes.color.array as Float32Array

    const pointPositions = this.trailGeometry.attributes.position.array as Float32Array
    const pointColors = this.trailGeometry.attributes.color.array as Float32Array

    for (let p = 0; p < this.particleCount; p++) {
      for (let t = 0; t < this.trailLength; t++) {
        const bufferIndex = (this.currentIndex + t) % this.trailLength
        const vertexIndex = p * this.trailLength + t

        const srcPositions = this.positions[bufferIndex]
        const srcColors = this.colors[bufferIndex]

        linePositions[vertexIndex * 3] = srcPositions[p * 3]
        linePositions[vertexIndex * 3 + 1] = srcPositions[p * 3 + 1]
        linePositions[vertexIndex * 3 + 2] = srcPositions[p * 3 + 2]

        pointPositions[vertexIndex * 3] = srcPositions[p * 3]
        pointPositions[vertexIndex * 3 + 1] = srcPositions[p * 3 + 1]
        pointPositions[vertexIndex * 3 + 2] = srcPositions[p * 3 + 2]

        const alpha = t / (this.trailLength - 1)
        const trailAlpha = alpha * alpha

        lineColors[vertexIndex * 3] = srcColors[p * 3] * trailAlpha
        lineColors[vertexIndex * 3 + 1] = srcColors[p * 3 + 1] * trailAlpha
        lineColors[vertexIndex * 3 + 2] = srcColors[p * 3 + 2] * trailAlpha

        pointColors[vertexIndex * 3] = srcColors[p * 3] * trailAlpha * 0.6
        pointColors[vertexIndex * 3 + 1] = srcColors[p * 3 + 1] * trailAlpha * 0.6
        pointColors[vertexIndex * 3 + 2] = srcColors[p * 3 + 2] * trailAlpha * 0.6
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.trailGeometry.attributes.position.needsUpdate = true
    this.trailGeometry.attributes.color.needsUpdate = true
  }

  public setTrailLength(length: number): void {
    if (length === this.trailLength || length < 2 || length > 100) return

    const oldLength = this.trailLength
    this.trailLength = length
    this.vertexCount = this.particleCount * length

    const newPositions: Float32Array[] = []
    const newColors: Float32Array[] = []

    for (let i = 0; i < length; i++) {
      newPositions.push(new Float32Array(this.particleCount * 3))
      newColors.push(new Float32Array(this.particleCount * 3))
    }

    const copyCount = Math.min(oldLength, length)
    for (let i = 0; i < copyCount; i++) {
      const oldIdx = (this.currentIndex + oldLength - copyCount + i) % oldLength
      newPositions[i].set(this.positions[oldIdx])
      newColors[i].set(this.colors[oldIdx])
    }

    this.positions = newPositions
    this.colors = newColors
    this.currentIndex = copyCount % length

    this.rebuildGeometry()
  }

  private rebuildGeometry(): void {
    this.vertexCount = this.particleCount * this.trailLength

    const linePositions = new Float32Array(this.vertexCount * 3)
    const lineColors = new Float32Array(this.vertexCount * 3)

    this.geometry.dispose()
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

    const indices: number[] = []
    for (let p = 0; p < this.particleCount; p++) {
      for (let i = 0; i < this.trailLength - 1; i++) {
        const idx1 = p * this.trailLength + i
        const idx2 = p * this.trailLength + i + 1
        indices.push(idx1, idx2)
      }
    }
    this.geometry.setIndex(indices)

    this.line.geometry = this.geometry

    const pointPositions = new Float32Array(this.vertexCount * 3)
    const pointColors = new Float32Array(this.vertexCount * 3)

    this.trailGeometry.dispose()
    this.trailGeometry = new THREE.BufferGeometry()
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))

    this.trailMesh.geometry = this.trailGeometry
  }

  public setParticleCount(count: number): void {
    if (count === this.particleCount) return

    this.particleCount = count

    for (let i = 0; i < this.trailLength; i++) {
      this.positions[i] = new Float32Array(count * 3)
      this.colors[i] = new Float32Array(count * 3)
    }

    this.rebuildGeometry()
  }

  public getTrailLength(): number {
    return this.trailLength
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.trailGeometry.dispose()
    this.trailMaterial.dispose()
  }
}
