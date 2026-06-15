import * as THREE from 'three'

export class TrailRenderer {
  public group: THREE.Group
  private trailLength: number = 20
  private particleCount: number
  private positionBuffer: Float32Array
  private colorBuffer: Float32Array
  private currentWriteIndex: number = 0
  private line: THREE.LineSegments
  private geometry: THREE.BufferGeometry
  private material: THREE.LineBasicMaterial
  private trailPoints: THREE.Points
  private pointsGeometry: THREE.BufferGeometry
  private pointsMaterial: THREE.PointsMaterial
  private lineIndices: Uint32Array

  constructor(particleCount: number, trailLength: number = 20) {
    this.particleCount = particleCount
    this.trailLength = trailLength
    this.group = new THREE.Group()

    const totalVertices = particleCount * trailLength
    this.positionBuffer = new Float32Array(totalVertices * 3)
    this.colorBuffer = new Float32Array(totalVertices * 3)

    const indexCount = particleCount * (trailLength - 1) * 2
    this.lineIndices = new Uint32Array(indexCount)

    for (let p = 0; p < particleCount; p++) {
      for (let i = 0; i < trailLength - 1; i++) {
        const base = p * trailLength
        const idx = (p * (trailLength - 1) + i) * 2
        this.lineIndices[idx] = base + i
        this.lineIndices[idx + 1] = base + i + 1
      }
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionBuffer, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorBuffer, 3))
    this.geometry.setIndex(new THREE.BufferAttribute(this.lineIndices, 1))

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.line = new THREE.LineSegments(this.geometry, this.material)
    this.group.add(this.line)

    this.pointsGeometry = new THREE.BufferGeometry()
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(this.positionBuffer, 3))
    this.pointsGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorBuffer, 3))

    this.pointsMaterial = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.trailPoints = new THREE.Points(this.pointsGeometry, this.pointsMaterial)
    this.group.add(this.trailPoints)
  }

  public update(particlePositions: Float32Array, particleColors: Float32Array): void {
    const writeOffset = this.currentWriteIndex * this.particleCount * 3

    for (let i = 0; i < this.particleCount * 3; i++) {
      this.positionBuffer[writeOffset + i] = particlePositions[i]
      this.colorBuffer[writeOffset + i] = particleColors[i]
    }

    this.currentWriteIndex = (this.currentWriteIndex + 1) % this.trailLength

    this.updateGeometry()
  }

  private updateGeometry(): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute
    const colorAttr = this.geometry.attributes.color as THREE.BufferAttribute

    const positions = posAttr.array as Float32Array
    const colors = colorAttr.array as Float32Array

    const trailLen = this.trailLength
    const pCount = this.particleCount
    const currentIdx = this.currentWriteIndex

    for (let p = 0; p < pCount; p++) {
      const particleStart = p * trailLen
      const pOffset = p * 3

      for (let t = 0; t < trailLen; t++) {
        const bufferIdx = (currentIdx + t) % trailLen
        const vertexIdx = particleStart + t

        const readOffset = bufferIdx * pCount * 3 + pOffset
        const writeOffset = vertexIdx * 3

        positions[writeOffset] = this.positionBuffer[readOffset]
        positions[writeOffset + 1] = this.positionBuffer[readOffset + 1]
        positions[writeOffset + 2] = this.positionBuffer[readOffset + 2]

        const alpha = t / (trailLen - 1)
        const trailAlpha = alpha * alpha

        colors[writeOffset] = this.colorBuffer[readOffset] * trailAlpha
        colors[writeOffset + 1] = this.colorBuffer[readOffset + 1] * trailAlpha
        colors[writeOffset + 2] = this.colorBuffer[readOffset + 2] * trailAlpha
      }
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
  }

  public setTrailLength(length: number): void {
    if (length === this.trailLength || length < 2 || length > 100) return

    const oldLength = this.trailLength
    this.trailLength = length
    const pCount = this.particleCount

    const newTotalVertices = pCount * length
    const newPositionBuffer = new Float32Array(newTotalVertices * 3)
    const newColorBuffer = new Float32Array(newTotalVertices * 3)

    const copyCount = Math.min(oldLength, length)
    for (let i = 0; i < copyCount; i++) {
      const oldIdx = (this.currentWriteIndex + oldLength - copyCount + i) % oldLength
      const newIdx = i

      const oldOffset = oldIdx * pCount * 3
      const newOffset = newIdx * pCount * 3

      for (let j = 0; j < pCount * 3; j++) {
        newPositionBuffer[newOffset + j] = this.positionBuffer[oldOffset + j]
        newColorBuffer[newOffset + j] = this.colorBuffer[oldOffset + j]
      }
    }

    this.positionBuffer = newPositionBuffer
    this.colorBuffer = newColorBuffer
    this.currentWriteIndex = copyCount % length

    this.rebuildGeometry()
  }

  private rebuildGeometry(): void {
    const pCount = this.particleCount
    const trailLen = this.trailLength

    const indexCount = pCount * (trailLen - 1) * 2
    this.lineIndices = new Uint32Array(indexCount)

    for (let p = 0; p < pCount; p++) {
      for (let i = 0; i < trailLen - 1; i++) {
        const base = p * trailLen
        const idx = (p * (trailLen - 1) + i) * 2
        this.lineIndices[idx] = base + i
        this.lineIndices[idx + 1] = base + i + 1
      }
    }

    this.geometry.dispose()
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionBuffer, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorBuffer, 3))
    this.geometry.setIndex(new THREE.BufferAttribute(this.lineIndices, 1))
    this.line.geometry = this.geometry

    this.pointsGeometry.dispose()
    this.pointsGeometry = new THREE.BufferGeometry()
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(this.positionBuffer, 3))
    this.pointsGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorBuffer, 3))
    this.trailPoints.geometry = this.pointsGeometry
  }

  public setParticleCount(count: number): void {
    if (count === this.particleCount) return

    const oldCount = this.particleCount
    this.particleCount = count
    const trailLen = this.trailLength

    const newTotalVertices = count * trailLen
    const newPositionBuffer = new Float32Array(newTotalVertices * 3)
    const newColorBuffer = new Float32Array(newTotalVertices * 3)

    const copyCount = Math.min(oldCount, count)
    for (let t = 0; t < trailLen; t++) {
      const oldOffset = t * oldCount * 3
      const newOffset = t * count * 3
      for (let i = 0; i < copyCount * 3; i++) {
        newPositionBuffer[newOffset + i] = this.positionBuffer[oldOffset + i]
        newColorBuffer[newOffset + i] = this.colorBuffer[oldOffset + i]
      }
    }

    this.positionBuffer = newPositionBuffer
    this.colorBuffer = newColorBuffer

    this.rebuildGeometry()
  }

  public getTrailLength(): number {
    return this.trailLength
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.pointsGeometry.dispose()
    this.pointsMaterial.dispose()
  }
}
