import * as THREE from 'three'

export type PlantPartType = 'seed' | 'stem' | 'branch' | 'leaf' | 'flower' | 'cotyledon'

export type EasingType = 'easeInOutQuad' | 'easeInOutCubic' | 'linear'

export interface PlantPartInfo {
  name: string
  age: number
  color: string
  type: PlantPartType
}

interface PlantPart {
  mesh: THREE.Mesh
  outlineMesh?: THREE.Mesh
  type: PlantPartType
  name: string
  startProgress: number
  endProgress: number
  ageDays: number
  parentHeight: number
  branchIndex: number
  side: 'left' | 'right' | 'main'
  targetPosition: THREE.Vector3
  targetRotation: THREE.Euler
  targetScale: THREE.Vector3
  currentPosition: THREE.Vector3
  currentRotation: THREE.Euler
  currentScale: THREE.Vector3
  baseColor: THREE.Color
  targetBaseScale: THREE.Vector3
  seed: number
}

interface LSystemParams {
  iterations: number
  angle: number
  length: number
  branchProbability: number
}

export interface PlantGeneratorOptions {
  easingType?: EasingType
  maxVertices?: number
  growthDuration?: number
}

const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const linear = (t: number): number => t

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v))

export class PlantGenerator {
  public group: THREE.Group
  private parts: PlantPart[] = []
  private growthProgress: number = 0
  private targetGrowthSpeed: number = 1
  private currentGrowthSpeed: number = 1
  private branchDensity: number = 3
  private targetBranchDensity: number = 3
  private bloomSize: number = 1
  private targetBloomSize: number = 1
  private paramTransitionProgress: number = 1
  private highlightedPart: PlantPart | null = null
  private highlightStartTime: number = 0
  private time: number = 0
  private easingType: EasingType = 'easeInOutQuad'
  private maxVertices: number = 10000
  private growthDuration: number = 30
  private unifiedMaterial: THREE.ShaderMaterial
  private flowerUnifiedMaterial: THREE.ShaderMaterial
  private baseStemGeo: THREE.CylinderGeometry
  private baseLeafGeo: THREE.SphereGeometry
  private baseFlowerGeo: THREE.IcosahedronGeometry
  private baseSeedGeo: THREE.SphereGeometry
  private baseFlowerPetalGeo: THREE.SphereGeometry
  private outlineMaterial: THREE.MeshBasicMaterial
  private cachedTargetStates: Map<number, {
    targetPosition: THREE.Vector3
    targetRotation: THREE.Euler
    targetScale: THREE.Vector3
    targetBaseScale: THREE.Vector3
  }> = new Map()

  constructor(options: PlantGeneratorOptions = {}) {
    if (options.easingType) this.easingType = options.easingType
    if (options.maxVertices) this.maxVertices = options.maxVertices
    if (options.growthDuration) this.growthDuration = options.growthDuration

    this.group = new THREE.Group()

    this.baseStemGeo = new THREE.CylinderGeometry(0.03, 0.06, 1, 5, 1)
    this.baseLeafGeo = new THREE.SphereGeometry(0.15, 6, 4)
    this.baseLeafGeo.scale(1, 0.1, 1.8)
    this.baseFlowerGeo = new THREE.IcosahedronGeometry(0.1, 0)
    this.baseFlowerPetalGeo = new THREE.SphereGeometry(0.08, 6, 4)
    this.baseFlowerPetalGeo.scale(1, 0.3, 1.5)
    this.baseSeedGeo = new THREE.SphereGeometry(0.12, 8, 6)

    this.unifiedMaterial = this.createUnifiedPlantShader()
    this.flowerUnifiedMaterial = this.createUnifiedFlowerShader()
    this.outlineMaterial = this.createOutlineMaterial()

    this.generatePlant()
  }

  private getEasing(): (t: number) => number {
    switch (this.easingType) {
      case 'easeInOutQuad': return easeInOutQuad
      case 'easeInOutCubic': return easeInOutCubic
      case 'linear': return linear
      default: return easeInOutQuad
    }
  }

  public setEasingType(type: EasingType): void {
    this.easingType = type
  }

  private createUnifiedPlantShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColorTip: { value: new THREE.Color(0xaed581) },
        uColorMid: { value: new THREE.Color(0x2e7d32) },
        uColorBase: { value: new THREE.Color(0x5d4037) },
        uHeightRange: { value: 1.5 },
        uIsFlower: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying float vHeight;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        uniform float uTime;
        uniform float uHeightRange;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vLocalPos = position;
          vec3 pos = position;
          float heightFactor = clamp((pos.y + 0.5) / max(uHeightRange, 0.1), 0.0, 1.0);
          vHeight = heightFactor;
          pos.x += sin(uTime * 0.5 + position.y * 3.0) * 0.004;
          pos.z += cos(uTime * 0.6 + position.y * 2.5) * 0.004;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying float vHeight;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        uniform vec3 uColorTip;
        uniform vec3 uColorMid;
        uniform vec3 uColorBase;
        uniform float uIsFlower;
        void main() {
          float h = clamp(vHeight, 0.0, 1.0);
          vec3 color;
          if (h < 0.5) {
            color = mix(uColorBase, uColorMid, h * 2.0);
          } else {
            color = mix(uColorMid, uColorTip, (h - 0.5) * 2.0);
          }
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
          float light = max(dot(vNormal, lightDir), 0.0);
          color *= 0.7 + light * 0.5;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    })
  }

  private createUnifiedFlowerShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColorInner: { value: new THREE.Color(0xffb6c1) },
        uColorOuter: { value: new THREE.Color(0xffffff) },
        uCenterRadius: { value: 0.05 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vLocalPos;
        varying float vDistFromCenter;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vLocalPos = position;
          vDistFromCenter = length(position.xz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vLocalPos;
        varying float vDistFromCenter;
        uniform vec3 uColorInner;
        uniform vec3 uColorOuter;
        uniform float uCenterRadius;
        void main() {
          float maxR = 0.18;
          float grad = smoothstep(uCenterRadius, maxR, vDistFromCenter);
          vec3 color = mix(uColorInner, uColorOuter, grad);
          vec3 lightDir = normalize(vec3(0.4, 0.9, 0.3));
          float light = max(dot(vNormal, lightDir), 0.0);
          color *= 0.8 + light * 0.4;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    })
  }

  private createOutlineMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  }

  private getLSystemParams(density: number): LSystemParams {
    return {
      iterations: Math.floor(2 + density * 0.5),
      angle: (25 + density * 4) * Math.PI / 180,
      length: 0.6 + density * 0.06,
      branchProbability: 0.18 + density * 0.1
    }
  }

  private getVertexBudget(density: number): number {
    const baseBudget = 4000
    const extraPerLevel = 1200
    return Math.min(baseBudget + (density - 1) * extraPerLevel, this.maxVertices)
  }

  private generatePlant(): void {
    this.clearPlant()
    this.cachedTargetStates.clear()

    const params = this.getLSystemParams(this.branchDensity)
    this.addSeed()
    this.addCotyledons()

    let verticesSoFar = this.getVertexCount()
    const budget = this.getVertexBudget(this.branchDensity)

    const mainStemSegments = Math.min(4 + Math.floor(this.branchDensity * 0.8), 8)
    let currentHeight = 0.15
    let branchCounter = 0

    for (let i = 0; i < mainStemSegments; i++) {
      const segLength = params.length / mainStemSegments * (1 + i * 0.08)
      const segStartProgress = 0.15 + (i / mainStemSegments) * 0.5
      const segEndProgress = 0.15 + ((i + 1) / mainStemSegments) * 0.5
      const radiusTop = 0.05 - i * 0.006
      const radiusBot = 0.07 - i * 0.005

      if (verticesSoFar > budget * 0.75) break

      const stemGeo = new THREE.CylinderGeometry(
        Math.max(0.015, radiusTop),
        Math.max(0.025, radiusBot),
        segLength, 5, 1
      )
      verticesSoFar += stemGeo.attributes.position.count
      const mesh = new THREE.Mesh(stemGeo, this.unifiedMaterial.clone())
      mesh.position.set(0, currentHeight + segLength / 2, 0)

      const info: PlantPart = {
        mesh,
        type: 'stem',
        name: `主茎第${i + 1}节间`,
        startProgress: segStartProgress,
        endProgress: segEndProgress,
        ageDays: Math.floor(3 + i * 2.5),
        parentHeight: currentHeight,
        branchIndex: 0,
        side: 'main',
        targetPosition: new THREE.Vector3(0, currentHeight + segLength / 2, 0),
        targetRotation: new THREE.Euler(0, 0, 0),
        targetScale: new THREE.Vector3(1, 1, 1),
        targetBaseScale: new THREE.Vector3(1, 1, 1),
        currentPosition: new THREE.Vector3(0, -0.3 + segLength / 2, 0),
        currentRotation: new THREE.Euler(0, 0, 0),
        currentScale: new THREE.Vector3(0.3, 0.1, 0.3),
        baseColor: new THREE.Color(0x66bb6a),
        seed: Math.random() * 100
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)

      const addBranchHere = i >= 1 && i < mainStemSegments - 1 &&
        Math.random() < params.branchProbability * (1 + this.branchDensity * 0.08) &&
        verticesSoFar < budget * 0.85
      if (addBranchHere) {
        branchCounter++
        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? 'left' : 'right'
          const horizAngle = (s === 0 ? 1 : -1) * (params.angle + Math.random() * 0.2)
          const twist = (branchCounter % 3) * (Math.PI * 2 / 3)
          const beforeVerts = verticesSoFar
          this.addBranch(
            currentHeight + segLength * 0.8,
            branchCounter,
            side as 'left' | 'right',
            horizAngle,
            twist,
            segStartProgress + 0.05,
            params,
            budget,
            verticesSoFar
          )
          verticesSoFar = this.getVertexCount()
          if (verticesSoFar - beforeVerts > budget * 0.15) break
        }
      }

      if (i >= 1 && verticesSoFar < budget * 0.9) {
        const beforeCount = this.parts.length
        this.addLeavesOnStem(
          currentHeight + segLength * 0.5,
          branchCounter,
          segStartProgress + 0.03
        )
        for (let k = beforeCount; k < this.parts.length; k++) {
          const p = this.parts[k]
          if (p.mesh.geometry) verticesSoFar += p.mesh.geometry.attributes.position.count
        }
      }

      currentHeight += segLength
    }

    if (verticesSoFar < budget * 0.9) {
      this.addFlowers(currentHeight, segEndProgressOfMain(mainStemSegments))
    }

    this.storeTargetStates()

    const totalVerts = this.getVertexCount()
    console.log(`🌿 Plant generated - Density: ${this.branchDensity}, Vertices: ${totalVerts} / ${this.maxVertices}`)
    if (totalVerts > this.maxVertices) {
      console.warn(`⚠ Vertex count (${totalVerts}) exceeds max (${this.maxVertices})`)
    }
  }

  private storeTargetStates(): void {
    this.cachedTargetStates.clear()
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i]
      this.cachedTargetStates.set(i, {
        targetPosition: p.targetPosition.clone(),
        targetRotation: p.targetRotation.clone(),
        targetScale: p.targetScale.clone(),
        targetBaseScale: p.targetBaseScale.clone()
      })
    }
  }

  private clearPlant(): void {
    for (const part of this.parts) {
      this.group.remove(part.mesh)
      if (part.outlineMesh) {
        this.group.remove(part.outlineMesh)
        part.outlineMesh.geometry.dispose()
        ;(part.outlineMesh.material as THREE.Material).dispose()
      }
      part.mesh.geometry.dispose()
      if (Array.isArray(part.mesh.material)) {
        part.mesh.material.forEach(m => m.dispose())
      } else {
        part.mesh.material.dispose()
      }
    }
    this.parts = []
    this.highlightedPart = null
  }

  private addSeed(): void {
    const mesh = new THREE.Mesh(this.baseSeedGeo, this.unifiedMaterial.clone())
    mesh.position.set(0, -0.1, 0)
    mesh.scale.set(0.8, 0.6, 0.8)

    const mat = mesh.material as THREE.ShaderMaterial
    mat.uniforms.uColorTip.value.setHex(0x8d6e63)
    mat.uniforms.uColorMid.value.setHex(0x5d4037)
    mat.uniforms.uColorBase.value.setHex(0x4e342e)

    const info: PlantPart = {
      mesh,
      type: 'seed',
      name: '种子',
      startProgress: 0,
      endProgress: 0.1,
      ageDays: 0,
      parentHeight: 0,
      branchIndex: 0,
      side: 'main',
      targetPosition: new THREE.Vector3(0, 0, 0),
      targetRotation: new THREE.Euler(0, 0, 0),
      targetScale: new THREE.Vector3(0.8, 0.6, 0.8),
      targetBaseScale: new THREE.Vector3(0.8, 0.6, 0.8),
      currentPosition: mesh.position.clone(),
      currentRotation: mesh.rotation.clone(),
      currentScale: mesh.scale.clone(),
      baseColor: new THREE.Color(0x5d4037),
      seed: Math.random() * 100
    }
    mesh.userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  private addCotyledons(): void {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'left' : 'right'
      const mesh = new THREE.Mesh(this.baseLeafGeo.clone(), this.unifiedMaterial.clone())
      const angle = i === 0 ? Math.PI * 0.3 : -Math.PI * 0.3
      mesh.position.set(Math.sin(angle) * 0.1, 0.08, 0)
      mesh.rotation.set(0, i * Math.PI, angle * 0.5)
      mesh.scale.set(0.5, 0.4, 0.7)

      const mat = mesh.material as THREE.ShaderMaterial
      mat.uniforms.uColorTip.value.setHex(0xc5e1a5)
      mat.uniforms.uColorMid.value.setHex(0x9ccc65)
      mat.uniforms.uColorBase.value.setHex(0x7cb342)

      const info: PlantPart = {
        mesh,
        type: 'cotyledon',
        name: `子叶${i + 1}`,
        startProgress: 0.05,
        endProgress: 0.2,
        ageDays: 2,
        parentHeight: 0,
        branchIndex: 0,
        side: side as 'left' | 'right',
        targetPosition: new THREE.Vector3(Math.sin(angle) * 0.15, 0.15, 0),
        targetRotation: new THREE.Euler(0.2, i * Math.PI, angle * 0.3),
        targetScale: new THREE.Vector3(0.7, 0.5, 1),
        targetBaseScale: new THREE.Vector3(0.7, 0.5, 1),
        currentPosition: mesh.position.clone(),
        currentRotation: mesh.rotation.clone(),
        currentScale: mesh.scale.clone(),
        baseColor: new THREE.Color(0xaed581),
        seed: Math.random() * 100
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)
    }
  }

  private addBranch(
    attachY: number,
    branchIdx: number,
    side: 'left' | 'right',
    horizAngle: number,
    twist: number,
    startProg: number,
    params: LSystemParams,
    budget: number,
    _verticesSoFar: number
  ): void {
    const segments = Math.min(2 + Math.floor(this.branchDensity * 0.4), 4)
    const dir = side === 'left' ? 1 : -1
    let localY = 0
    const branchLength = params.length * 0.4
    const heightFromBase = attachY - 0.15
    const branchProgress = heightFromBase / Math.max(0.1, 1.5)

    for (let i = 0; i < segments; i++) {
      if (this.getVertexCount() > budget * 0.95) break

      const segLen = branchLength / segments
      const segStart = startProg + 0.02 + i * 0.03
      const segEnd = startProg + 0.05 + (i + 1) * 0.03

      const stemGeo = this.baseStemGeo.clone()
      stemGeo.scale(0.4, segLen, 0.4)
      stemGeo.translate(0, segLen / 2, 0)

      const mat = this.unifiedMaterial.clone()
      const colorLerp = clamp(branchProgress + (i / segments) * 0.3, 0, 1)
      mat.uniforms.uColorTip.value.setHex(0xaed581)
      mat.uniforms.uColorMid.value.lerpColors(
        new THREE.Color(0x4caf50),
        new THREE.Color(0x66bb6a),
        colorLerp
      )
      mat.uniforms.uColorBase.value.setHex(0x388e3c)

      const mesh = new THREE.Mesh(stemGeo, mat)

      const curveX = dir * Math.sin(horizAngle) * (segLen * 0.4 + i * segLen * 0.5)
      const curveZ = Math.cos(twist) * Math.sin(horizAngle * 0.7) * i * segLen * 0.3
      const totalRise = segLen * 0.7

      const tgtX = curveX
      const tgtY = attachY + localY + totalRise / 2
      const tgtZ = curveZ

      mesh.position.set(0, attachY + segLen / 2, 0)

      const rx = -Math.sin(horizAngle * 0.6)
      const rz = dir * Math.sin(horizAngle) * 0.7
      const ry = twist * 0.5

      const info: PlantPart = {
        mesh,
        type: 'branch',
        name: `侧枝${branchIdx}-${side === 'left' ? '左' : '右'}`,
        startProgress: Math.min(segStart, 0.95),
        endProgress: Math.min(segEnd, 0.98),
        ageDays: Math.floor(8 + branchIdx * 2 + i),
        parentHeight: attachY,
        branchIndex: branchIdx,
        side,
        targetPosition: new THREE.Vector3(tgtX, tgtY, tgtZ),
        targetRotation: new THREE.Euler(rx, ry, rz),
        targetScale: new THREE.Vector3(1, 1, 1),
        targetBaseScale: new THREE.Vector3(1, 1, 1),
        currentPosition: new THREE.Vector3(0, attachY + segLen / 2, 0),
        currentRotation: new THREE.Euler(0, 0, 0),
        currentScale: new THREE.Vector3(0.2, 0.1, 0.2),
        baseColor: new THREE.Color(0x7cb342),
        seed: Math.random() * 100
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)

      if (i >= 0 && Math.random() < 0.45 + this.branchDensity * 0.06 && this.getVertexCount() < budget * 0.92) {
        this.addLeaf(
          tgtX + dir * 0.05,
          tgtY + segLen * 0.3,
          tgtZ,
          side,
          branchIdx,
          Math.min(segStart + 0.02, 0.95)
        )
      }

      localY += totalRise
    }

    if (this.branchDensity >= 3 && Math.random() < 0.4 && this.getVertexCount() < budget * 0.9) {
      this.addFlower(
        dir * Math.sin(horizAngle) * branchLength * 0.5,
        attachY + localY + 0.05,
        Math.cos(twist) * branchLength * 0.2,
        `侧花${branchIdx}-${side === 'left' ? '左' : '右'}`,
        Math.min(startProg + 0.2, 0.9),
        true
      )
    }
  }

  private addLeavesOnStem(y: number, branchIdx: number, startProg: number): void {
    const count = Math.min(1 + Math.floor(Math.random() * 2), 2)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const side = angle < Math.PI ? 'left' : 'right'
      this.addLeaf(
        Math.sin(angle) * 0.08,
        y,
        Math.cos(angle) * 0.08,
        side as 'left' | 'right',
        branchIdx + 100,
        startProg + i * 0.01
      )
    }
  }

  private addLeaf(
    x: number, y: number, z: number,
    side: 'left' | 'right',
    branchIdx: number,
    startProg: number
  ): void {
    const mesh = new THREE.Mesh(this.baseLeafGeo.clone(), this.unifiedMaterial.clone())
    const size = 0.8 + Math.random() * 0.5
    mesh.scale.set(size, size * 0.4, size * 1.1)

    const mat = mesh.material as THREE.ShaderMaterial
    mat.uniforms.uColorTip.value.setHex(0xaed581)
    mat.uniforms.uColorMid.value.setHex(0x66bb6a)
    mat.uniforms.uColorBase.value.setHex(0x388e3c)

    const dir = side === 'left' ? 1 : -1
    const tgtRot = new THREE.Euler(
      0.3 + Math.random() * 0.3,
      dir * (0.8 + Math.random() * 0.8),
      dir * (0.4 + Math.random() * 0.3)
    )

    const info: PlantPart = {
      mesh,
      type: 'leaf',
      name: `叶片${branchIdx}-${side === 'left' ? '左' : '右'}`,
      startProgress: Math.min(startProg, 0.95),
      endProgress: Math.min(startProg + 0.12, 0.98),
      ageDays: Math.floor(10 + branchIdx * 1.2),
      parentHeight: y,
      branchIndex: branchIdx,
      side,
      targetPosition: new THREE.Vector3(x, y, z),
      targetRotation: tgtRot,
      targetScale: new THREE.Vector3(size, size * 0.4, size * 1.1),
      targetBaseScale: new THREE.Vector3(size, size * 0.4, size * 1.1),
      currentPosition: new THREE.Vector3(x * 0.2, y - 0.1, z * 0.2),
      currentRotation: new THREE.Euler(0, 0, 0),
      currentScale: new THREE.Vector3(0.1, 0.1, 0.1),
      baseColor: new THREE.Color(0x81c784),
      seed: Math.random() * 100
    }
    mesh.userData = { partInfo: info }
    mesh.position.copy(info.currentPosition)
    this.group.add(mesh)
    this.parts.push(info)
  }

  private addFlowers(topY: number, startProg: number): void {
    this.addFlower(0, topY + 0.1, 0, '顶花', startProg, false)

    const count = Math.min(Math.floor(1 + this.branchDensity * 0.4), 3)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = 0.15 + this.branchDensity * 0.02
      this.addFlower(
        Math.sin(angle) * r,
        topY - 0.05,
        Math.cos(angle) * r,
        `花${i + 1}`,
        startProg + 0.04 + i * 0.01,
        true
      )
    }
  }

  private addFlower(
    x: number, y: number, z: number,
    name: string,
    startProg: number,
    isSide: boolean
  ): void {
    const groupMesh = new THREE.Group()

    const petalCount = 5
    for (let i = 0; i < petalCount; i++) {
      const petal = new THREE.Mesh(this.baseFlowerPetalGeo.clone(), this.flowerUnifiedMaterial.clone())
      const angle = (i / petalCount) * Math.PI * 2
      petal.position.set(
        Math.sin(angle) * 0.06,
        0,
        Math.cos(angle) * 0.06
      )
      petal.rotation.set(0.2, angle, 0.3)
      groupMesh.add(petal)
    }

    const centerGeo = this.baseFlowerGeo.clone()
    centerGeo.scale(0.5, 0.5, 0.5)
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xffd54f })
    const center = new THREE.Mesh(centerGeo, centerMat)
    center.position.y = 0.02
    groupMesh.add(center)

    const mesh = groupMesh as unknown as THREE.Mesh
    mesh.position.set(x * 0.3, y - 0.2, z * 0.3)

    const baseSize = 0.9 + Math.random() * 0.3
    const targetScale = this.bloomSize * baseSize

    const info: PlantPart = {
      mesh,
      type: 'flower',
      name,
      startProgress: Math.min(startProg, 0.95),
      endProgress: Math.min(startProg + 0.18, 1),
      ageDays: isSide ? 22 : 25,
      parentHeight: y,
      branchIndex: 0,
      side: 'main',
      targetPosition: new THREE.Vector3(x, y, z),
      targetRotation: new THREE.Euler(isSide ? 0.3 : 0, 0, 0),
      targetScale: new THREE.Vector3(targetScale, targetScale, targetScale),
      targetBaseScale: new THREE.Vector3(targetScale, targetScale, targetScale),
      currentPosition: new THREE.Vector3(x * 0.3, y - 0.2, z * 0.3),
      currentRotation: new THREE.Euler(0, 0, 0),
      currentScale: new THREE.Vector3(0.05, 0.05, 0.05),
      baseColor: new THREE.Color(0xff8fa3),
      seed: Math.random() * 100
    }
    ;(mesh as any).userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  public setGrowthSpeed(speed: number): void {
    this.targetGrowthSpeed = speed
    this.paramTransitionProgress = 0
  }

  public setBranchDensity(density: number): void {
    density = clamp(density, 1, 5)
    if (density === this.targetBranchDensity) return
    this.targetBranchDensity = density
    this.paramTransitionProgress = 0
    this.calculateTransitionTargets()
  }

  private calculateTransitionTargets(): void {
    const densityDiff = this.targetBranchDensity - this.branchDensity
    const densityFactor = Math.abs(densityDiff) / 4

    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i]
      const cached = this.cachedTargetStates.get(i)
      if (!cached) continue

      const influence = part.type === 'branch' || part.type === 'leaf' ? 0.85 : 0.3
      const partFactor = densityFactor * influence
      const invPartFactor = 1 - partFactor

      const scaleMultiplier = 1 + densityDiff * 0.12 * (part.type === 'flower' ? 0.6 : 1) * invPartFactor
      const posInfluence = densityDiff * 0.04 * partFactor

      part.targetPosition.x = cached.targetPosition.x + posInfluence * Math.sin(part.seed)
      part.targetPosition.z = cached.targetPosition.z + posInfluence * Math.cos(part.seed)
      part.targetPosition.y = cached.targetPosition.y + posInfluence * 0.5

      part.targetScale.x = cached.targetBaseScale.x * scaleMultiplier
      part.targetScale.y = cached.targetBaseScale.y * scaleMultiplier
      part.targetScale.z = cached.targetBaseScale.z * scaleMultiplier

      if (part.type === 'flower') {
        const bloomFactor = this.targetBloomSize / Math.max(0.1, this.bloomSize)
        const f = bloomFactor * scaleMultiplier
        part.targetScale.x *= f
        part.targetScale.y *= f
        part.targetScale.z *= f
      }
    }
  }

  public setBloomSize(size: number): void {
    size = clamp(size, 0.5, 2.0)
    this.targetBloomSize = size
    this.paramTransitionProgress = 0

    const bloomFactor = this.targetBloomSize / Math.max(0.1, this.bloomSize)

    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i]
      if (part.type === 'flower') {
        const cached = this.cachedTargetStates.get(i)
        if (cached) {
          const f = bloomFactor
          part.targetScale.x = cached.targetBaseScale.x * f
          part.targetScale.y = cached.targetBaseScale.y * f
          part.targetScale.z = cached.targetBaseScale.z * f
        }
      }
    }
  }

  public replayAnimation(): void {
    this.growthProgress = 0
  }

  public getCurrentProgress(): number {
    return this.growthProgress
  }

  public getPartInfoFromObject(obj: THREE.Object3D): PlantPartInfo | null {
    const findPart = (o: THREE.Object3D): PlantPart | null => {
      if (o.userData && o.userData.partInfo) return o.userData.partInfo
      if (o.parent) return findPart(o.parent)
      return null
    }
    const part = findPart(obj)
    if (!part) return null

    this.highlightPart(part)
    const color = `rgb(${Math.floor(part.baseColor.r * 255)}, ${Math.floor(part.baseColor.g * 255)}, ${Math.floor(part.baseColor.b * 255)})`

    return {
      name: part.name,
      age: part.ageDays,
      color,
      type: part.type
    }
  }

  private highlightPart(part: PlantPart): void {
    if (this.highlightedPart && this.highlightedPart !== part) {
      this.removeHighlight(this.highlightedPart)
    }

    if (!part.outlineMesh) {
      const outline = this.createOutlineMeshForPart(part)
      if (outline) {
        part.outlineMesh = outline
        this.group.attach(part.outlineMesh)
      }
    }

    this.highlightedPart = part
    this.highlightStartTime = this.time
  }

  private createOutlineMeshForPart(part: PlantPart): THREE.Mesh | null {
    const geos: THREE.BufferGeometry[] = []
    const collectGeos = (obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.geometry) {
        geos.push(mesh.geometry)
      }
      if (obj.children) {
        obj.children.forEach(collectGeos)
      }
    }
    collectGeos(part.mesh)

    if (geos.length === 0) return null

    const mergedGeo = geos.length === 1 ? geos[0].clone() : this.mergeGeometries(geos)
    const outlineMesh = new THREE.Mesh(mergedGeo, this.outlineMaterial.clone())
    outlineMesh.matrixAutoUpdate = true

    return outlineMesh
  }

  private mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry()
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    let indexOffset = 0

    for (const geo of geos) {
      const posAttr = geo.attributes.position
      const normAttr = geo.attributes.normal

      if (!posAttr) continue

      for (let i = 0; i < posAttr.count; i++) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
        if (normAttr) {
          normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
        }
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          indices.push(geo.index.getX(i) + indexOffset)
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          indices.push(i + indexOffset)
        }
      }

      indexOffset += posAttr.count
    }

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    if (normals.length > 0) {
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    }
    merged.setIndex(indices)

    return merged
  }

  private removeHighlight(part: PlantPart): void {
    if (part.outlineMesh) {
      this.group.remove(part.outlineMesh)
      part.outlineMesh.geometry.dispose()
      ;(part.outlineMesh.material as THREE.Material).dispose()
      part.outlineMesh = undefined
    }
  }

  public update(delta: number): void {
    this.time += delta
    const easing = this.getEasing()

    if (this.paramTransitionProgress < 1) {
      this.paramTransitionProgress = Math.min(1, this.paramTransitionProgress + delta / 0.8)
      const t = easing(this.paramTransitionProgress)

      this.currentGrowthSpeed = lerp(this.currentGrowthSpeed, this.targetGrowthSpeed, t)
      this.branchDensity = lerp(this.branchDensity, this.targetBranchDensity, t)
      this.bloomSize = lerp(this.bloomSize, this.targetBloomSize, t)
    }

    this.growthProgress = Math.min(1, this.growthProgress + delta * this.currentGrowthSpeed / this.growthDuration)

    for (const part of this.parts) {
      let localT = 0
      if (this.growthProgress <= part.startProgress) {
        localT = 0
      } else if (this.growthProgress >= part.endProgress) {
        localT = 1
      } else {
        localT = (this.growthProgress - part.startProgress) / (part.endProgress - part.startProgress)
      }
      localT = easing(localT)

      const swayOffset = new THREE.Vector3(
        Math.sin(this.time * 0.8 + part.targetPosition.y * 3 + part.seed) * 0.012 * localT,
        0,
        Math.cos(this.time * 0.7 + part.targetPosition.y * 2.5 + part.seed) * 0.012 * localT
      )

      part.mesh.position.lerpVectors(part.currentPosition, part.targetPosition, localT).add(swayOffset)

      part.mesh.rotation.set(
        lerp(part.currentRotation.x, part.targetRotation.x, localT) + Math.sin(this.time * 0.6 + part.targetPosition.y * 2) * 0.012 * localT,
        lerp(part.currentRotation.y, part.targetRotation.y, localT) + Math.cos(this.time * 0.5 + part.targetPosition.y * 1.5) * 0.018 * localT,
        lerp(part.currentRotation.z, part.targetRotation.z, localT)
      )

      part.mesh.scale.lerpVectors(part.currentScale, part.targetScale, localT)

      if (part.outlineMesh) {
        part.outlineMesh.position.copy(part.mesh.position)
        part.outlineMesh.rotation.copy(part.mesh.rotation)
        const s = part.mesh.scale.clone().multiplyScalar(1.08)
        part.outlineMesh.scale.copy(s)
      }

      const updateMaterialUniforms = (mat: THREE.Material | THREE.Material[]) => {
        if (Array.isArray(mat)) {
          mat.forEach(m => updateMaterialUniforms(m))
          return
        }
        if ((mat as any).uniforms) {
          ;(mat as any).uniforms.uTime.value = this.time
          ;(mat as any).uniforms.uProgress.value = localT
        }
      }

      if (part.type === 'flower') {
        part.mesh.traverse(child => {
          const m = (child as THREE.Mesh).material
          if (m) updateMaterialUniforms(m)
        })
      } else {
        updateMaterialUniforms(part.mesh.material)
      }
    }

    if (this.highlightedPart && this.highlightedPart.outlineMesh) {
      const elapsed = this.time - this.highlightStartTime
      const totalDuration = 1.0

      if (elapsed > totalDuration) {
        this.removeHighlight(this.highlightedPart)
        this.highlightedPart = null
      } else {
        const t = elapsed / totalDuration
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2)
        const fadeOut = t < 0.85 ? 1 : (1 - t) / 0.15
        const outlineMat = this.highlightedPart.outlineMesh.material as THREE.MeshBasicMaterial
        outlineMat.opacity = (0.3 + pulse * 0.6) * fadeOut

        const s = this.highlightedPart.mesh.scale.clone().multiplyScalar(1.05 + pulse * 0.05)
        this.highlightedPart.outlineMesh.scale.copy(s)
      }
    }
  }

  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = []
    for (const part of this.parts) {
      if ((part.mesh as any).isGroup) {
        part.mesh.traverse(child => {
          if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
        })
      } else {
        meshes.push(part.mesh)
      }
    }
    return meshes
  }

  public getVertexCount(): number {
    let count = 0
    for (const part of this.parts) {
      const countGeo = (geo: THREE.BufferGeometry) => {
        const pos = geo.attributes.position
        count += pos ? pos.count : 0
      }
      if ((part.mesh as any).isGroup) {
        part.mesh.traverse(child => {
          const mesh = child as THREE.Mesh
          if (mesh.isMesh && mesh.geometry) countGeo(mesh.geometry)
        })
      } else if (part.mesh.geometry) {
        countGeo(part.mesh.geometry)
      }
    }
    return count
  }

  public getEasingType(): EasingType {
    return this.easingType
  }
}

function segEndProgressOfMain(seg: number): number {
  return 0.15 + (seg / seg) * 0.5 + 0.1
}
