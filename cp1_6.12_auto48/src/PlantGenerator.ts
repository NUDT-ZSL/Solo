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
  outlineGlowGroup?: THREE.Group
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
  targetBasePosition: THREE.Vector3
  targetBaseRotation: THREE.Euler
  targetBaseScale: THREE.Vector3
  seed: number
  partHeight: number
}

interface LSystemParams {
  iterations: number
  angle: number
  length: number
  branchProbability: number
}

export interface DensityTransitionConfig {
  stemInfluence: number
  branchInfluence: number
  leafInfluence: number
  flowerInfluence: number
  cotyledonInfluence: number
  seedInfluence: number
}

export interface PlantGeneratorOptions {
  easingType?: EasingType
  maxVertices?: number
  growthDuration?: number
  densityTransition?: Partial<DensityTransitionConfig>
  testDensity5Mode?: boolean
}

const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t)

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
  private cachedTargetStates: Map<number, {
    targetBasePosition: THREE.Vector3
    targetBaseRotation: THREE.Euler
    targetBaseScale: THREE.Vector3
  }> = new Map()
  private densityTransition: DensityTransitionConfig = {
    stemInfluence: 0.3,
    branchInfluence: 0.85,
    leafInfluence: 0.85,
    flowerInfluence: 0.5,
    cotyledonInfluence: 0.1,
    seedInfluence: 0.02
  }
  private testDensity5Mode: boolean = false
  private runtimeVertexCounter: number = 0

  constructor(options: PlantGeneratorOptions = {}) {
    this.easingType = options.easingType ?? 'easeInOutQuad'
    this.maxVertices = options.maxVertices ?? 10000
    this.growthDuration = options.growthDuration ?? 30
    this.densityTransition = { ...this.densityTransition, ...(options.densityTransition ?? {}) }
    this.testDensity5Mode = options.testDensity5Mode ?? false

    this.group = new THREE.Group()

    this.baseStemGeo = new THREE.CylinderGeometry(0.03, 0.06, 1, 5, 1)
    this.baseLeafGeo = new THREE.SphereGeometry(0.15, 6, 4)
    this.baseLeafGeo.scale(1, 0.1, 1.8)
    this.baseFlowerGeo = new THREE.IcosahedronGeometry(0.05, 0)
    this.baseFlowerPetalGeo = new THREE.SphereGeometry(0.08, 6, 4)
    this.baseFlowerPetalGeo.scale(1, 0.3, 1.5)
    this.baseSeedGeo = new THREE.SphereGeometry(0.12, 8, 6)

    this.unifiedMaterial = this.createUnifiedPlantShader()
    this.flowerUnifiedMaterial = this.createUnifiedFlowerShader()

    if (this.testDensity5Mode) {
      this.branchDensity = 5
      this.targetBranchDensity = 5
    }

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

  public setDensityTransitionConfig(config: Partial<DensityTransitionConfig>): void {
    this.densityTransition = { ...this.densityTransition, ...config }
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
        uPartHeight: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying float vHeight;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        uniform float uTime;
        uniform float uHeightRange;
        uniform float uPartHeight;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vLocalPos = position;
          vec3 pos = position;
          float heightFactor = clamp((uPartHeight + position.y) / max(uHeightRange, 0.1), 0.0, 1.0);
          vHeight = heightFactor;
          pos.x += sin(uTime * 0.5 + uPartHeight * 3.0) * 0.004;
          pos.z += cos(uTime * 0.6 + uPartHeight * 2.5) * 0.004;
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
        uColorInner: { value: new THREE.Color(0xff8fa3) },
        uColorOuter: { value: new THREE.Color(0xffffff) },
        uCenterRadius: { value: 0.02 }
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

  private createGlowLayerMaterial(strength: number = 1.0): THREE.MeshBasicMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowStrength: { value: strength },
        uGlowColor: { value: new THREE.Color(0xffd700) },
        uThickness: { value: 0.02 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vPosition;
        uniform float uThickness;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec3 pos = position + normal * uThickness;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vPosition;
        uniform vec3 uGlowColor;
        uniform float uGlowStrength;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
          float intensity = pow(rim, 2.5) * uGlowStrength;
          gl_FragColor = vec4(uGlowColor, intensity * 0.95);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }) as unknown as THREE.MeshBasicMaterial
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
    const extraPerLevel = 1350
    const computed = baseBudget + (density - 1) * extraPerLevel
    return Math.min(computed, this.maxVertices)
  }

  private addToVertexCounter(geo: THREE.BufferGeometry): void {
    const posAttr = geo.attributes.position
    this.runtimeVertexCounter += posAttr ? posAttr.count : 0
  }

  private canAddVertices(estimatedVerts: number, budgetPct: number = 0.98): boolean {
    const budget = this.getVertexBudget(this.branchDensity)
    return (this.runtimeVertexCounter + estimatedVerts) < budget * budgetPct
  }

  private generatePlant(): void {
    this.clearPlant()
    this.cachedTargetStates.clear()
    this.runtimeVertexCounter = 0

    const params = this.getLSystemParams(this.branchDensity)
    const budget = this.getVertexBudget(this.branchDensity)

    this.addSeed(budget)
    this.addCotyledons(budget)

    const mainStemSegments = Math.min(4 + Math.floor(this.branchDensity * 0.8), 8)
    let currentHeight = 0.15
    let branchCounter = 0

    for (let i = 0; i < mainStemSegments; i++) {
      const segLength = params.length / mainStemSegments * (1 + i * 0.08)
      const segStartProgress = 0.15 + (i / mainStemSegments) * 0.5
      const segEndProgress = 0.15 + ((i + 1) / mainStemSegments) * 0.5
      const radiusTop = 0.05 - i * 0.006
      const radiusBot = 0.07 - i * 0.005

      if (!this.canAddVertices(200, 0.8)) break

      const stemGeo = new THREE.CylinderGeometry(
        Math.max(0.015, radiusTop),
        Math.max(0.025, radiusBot),
        segLength, 5, 1
      )
      this.addToVertexCounter(stemGeo)

      const mesh = new THREE.Mesh(stemGeo, this.createPartMaterial('stem', currentHeight))
      mesh.position.set(0, currentHeight + segLength / 2, 0)

      const tgtPos = new THREE.Vector3(0, currentHeight + segLength / 2, 0)
      const curPos = new THREE.Vector3(0, -0.3 + segLength / 2, 0)
      const tgtScale = new THREE.Vector3(1, 1, 1)
      const curScale = new THREE.Vector3(0.3, 0.1, 0.3)

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
        targetPosition: tgtPos.clone(),
        targetRotation: new THREE.Euler(0, 0, 0),
        targetScale: tgtScale.clone(),
        targetBasePosition: tgtPos.clone(),
        targetBaseRotation: new THREE.Euler(0, 0, 0),
        targetBaseScale: tgtScale.clone(),
        currentPosition: curPos,
        currentRotation: new THREE.Euler(0, 0, 0),
        currentScale: curScale,
        baseColor: new THREE.Color(0x66bb6a),
        seed: Math.random() * 100,
        partHeight: currentHeight
      }
      mesh.userData = { partInfo: info }
      mesh.position.copy(curPos)
      mesh.scale.copy(curScale)
      this.group.add(mesh)
      this.parts.push(info)

      const shouldBranch = i >= 1 && i < mainStemSegments - 1 &&
        Math.random() < params.branchProbability * (1 + this.branchDensity * 0.08) &&
        this.canAddVertices(500, 0.75)

      if (shouldBranch) {
        branchCounter++
        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? 'left' : 'right'
          const horizAngle = (s === 0 ? 1 : -1) * (params.angle + Math.random() * 0.2)
          const twist = (branchCounter % 3) * (Math.PI * 2 / 3)
          const beforeVerts = this.runtimeVertexCounter
          this.addBranch(
            currentHeight + segLength * 0.8,
            branchCounter,
            side as 'left' | 'right',
            horizAngle,
            twist,
            segStartProgress + 0.05,
            params,
            budget
          )
          if (this.runtimeVertexCounter - beforeVerts > budget * 0.15) break
        }
      }

      if (i >= 1 && this.canAddVertices(150, 0.88)) {
        this.addLeavesOnStem(
          currentHeight + segLength * 0.5,
          branchCounter,
          segStartProgress + 0.03,
          budget
        )
      }

      currentHeight += segLength
    }

    if (this.canAddVertices(800, 0.92)) {
      this.addFlowers(currentHeight, segEndProgressOfMain(mainStemSegments), budget)
    }

    this.storeTargetStates()

    const totalVerts = this.getVertexCount()
    console.log(`🌿 Plant generated - Density: ${this.branchDensity}, Budget: ${budget}, Vertices: ${totalVerts} / ${this.maxVertices}`)
    if (totalVerts > this.maxVertices) {
      console.warn(`⚠ Vertex count EXCEEDS max! (${totalVerts} > ${this.maxVertices})`)
    } else {
      console.log(`✅ Vertex count within limits: ${totalVerts} ≤ ${this.maxVertices}`)
    }
  }

  private storeTargetStates(): void {
    this.cachedTargetStates.clear()
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i]
      this.cachedTargetStates.set(i, {
        targetBasePosition: p.targetBasePosition.clone(),
        targetBaseRotation: p.targetBaseRotation.clone(),
        targetBaseScale: p.targetBaseScale.clone()
      })
    }
  }

  private clearPlant(): void {
    for (const part of this.parts) {
      this.group.remove(part.mesh)
      if (part.outlineGlowGroup) {
        this.group.remove(part.outlineGlowGroup)
        part.outlineGlowGroup.traverse(child => {
          const mesh = child as THREE.Mesh
          if (mesh.isMesh) {
            mesh.geometry.dispose()
            const m = mesh.material as THREE.Material | THREE.Material[]
            if (Array.isArray(m)) m.forEach(mm => mm.dispose())
            else m.dispose()
          }
        })
        part.outlineGlowGroup = undefined
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
    this.runtimeVertexCounter = 0
  }

  private createPartMaterial(type: PlantPartType, height: number): THREE.ShaderMaterial {
    const mat = this.unifiedMaterial.clone()
    mat.uniforms.uPartHeight = { value: height }
    mat.uniforms.uHeightRange = { value: 1.5 }
    mat.uniforms.uTime = { value: 0 }
    mat.uniforms.uProgress = { value: 0 }
    mat.uniforms.uColorTip = { value: new THREE.Color() }
    mat.uniforms.uColorMid = { value: new THREE.Color() }
    mat.uniforms.uColorBase = { value: new THREE.Color() }

    switch (type) {
      case 'seed':
        mat.uniforms.uColorTip.value.setHex(0x8d6e63)
        mat.uniforms.uColorMid.value.setHex(0x5d4037)
        mat.uniforms.uColorBase.value.setHex(0x4e342e)
        break
      case 'cotyledon':
        mat.uniforms.uColorTip.value.setHex(0xc5e1a5)
        mat.uniforms.uColorMid.value.setHex(0x9ccc65)
        mat.uniforms.uColorBase.value.setHex(0x7cb342)
        break
      case 'stem': {
        const hFactor = clamp(height / 1.2, 0, 1)
        const tip = new THREE.Color(0xaed581)
        const mid = new THREE.Color(0x388e3c)
        const base = new THREE.Color(0x5d4037)
        mat.uniforms.uColorTip.value.copy(tip)
        mat.uniforms.uColorMid.value.lerpColors(base, mid, hFactor)
        mat.uniforms.uColorBase.value.lerpColors(new THREE.Color(0x4e342e), base, hFactor)
        break
      }
      case 'branch':
        mat.uniforms.uColorTip.value.setHex(0xaed581)
        mat.uniforms.uColorMid.value.setHex(0x66bb6a)
        mat.uniforms.uColorBase.value.setHex(0x4caf50)
        break
      case 'leaf':
        mat.uniforms.uColorTip.value.setHex(0xaed581)
        mat.uniforms.uColorMid.value.setHex(0x66bb6a)
        mat.uniforms.uColorBase.value.setHex(0x388e3c)
        break
      case 'flower':
      default:
        mat.uniforms.uColorTip.value.setHex(0xaed581)
        mat.uniforms.uColorMid.value.setHex(0x4caf50)
        mat.uniforms.uColorBase.value.setHex(0x388e3c)
    }
    return mat
  }

  private createFlowerMaterial(): THREE.ShaderMaterial {
    const mat = this.flowerUnifiedMaterial.clone()
    mat.uniforms.uTime = { value: 0 }
    mat.uniforms.uProgress = { value: 0 }
    mat.uniforms.uColorInner = { value: new THREE.Color(0xff8fa3) }
    mat.uniforms.uColorOuter = { value: new THREE.Color(0xffffff) }
    mat.uniforms.uCenterRadius = { value: 0.02 }
    return mat
  }

  private addSeed(_budget: number): void {
    const mesh = new THREE.Mesh(this.baseSeedGeo, this.createPartMaterial('seed', 0))
    mesh.position.set(0, -0.1, 0)
    mesh.scale.set(0.8, 0.6, 0.8)

    const targetPos = new THREE.Vector3(0, 0, 0)
    const targetScale = new THREE.Vector3(0.8, 0.6, 0.8)
    const curPos = new THREE.Vector3(0, -0.1, 0)
    const curScale = new THREE.Vector3(0.8, 0.6, 0.8)

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
      targetPosition: targetPos.clone(),
      targetRotation: new THREE.Euler(0, 0, 0),
      targetScale: targetScale.clone(),
      targetBasePosition: targetPos.clone(),
      targetBaseRotation: new THREE.Euler(0, 0, 0),
      targetBaseScale: targetScale.clone(),
      currentPosition: curPos,
      currentRotation: new THREE.Euler(0, 0, 0),
      currentScale: curScale,
      baseColor: new THREE.Color(0x5d4037),
      seed: Math.random() * 100,
      partHeight: 0
    }
    mesh.userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  private addCotyledons(_budget: number): void {
    for (let i = 0; i < 2; i++) {
      if (!this.canAddVertices(200, 0.5)) break
      const side = i === 0 ? 'left' : 'right'
      const mesh = new THREE.Mesh(this.baseLeafGeo.clone(), this.createPartMaterial('cotyledon', 0.1))
      const angle = i === 0 ? Math.PI * 0.3 : -Math.PI * 0.3
      const curPos = new THREE.Vector3(Math.sin(angle) * 0.1, 0.08, 0)
      const tgtPos = new THREE.Vector3(Math.sin(angle) * 0.15, 0.15, 0)
      const tgtRot = new THREE.Euler(0.2, i * Math.PI, angle * 0.3)
      const curRot = new THREE.Euler(0, i * Math.PI, angle * 0.5)
      const tgtScale = new THREE.Vector3(0.7, 0.5, 1)
      const curScale = new THREE.Vector3(0.5, 0.4, 0.7)
      mesh.position.copy(curPos)
      mesh.rotation.copy(curRot)
      mesh.scale.copy(curScale)

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
        targetPosition: tgtPos,
        targetRotation: tgtRot,
        targetScale: tgtScale.clone(),
        targetBasePosition: tgtPos.clone(),
        targetBaseRotation: tgtRot.clone(),
        targetBaseScale: tgtScale.clone(),
        currentPosition: curPos,
        currentRotation: curRot,
        currentScale: curScale,
        baseColor: new THREE.Color(0xaed581),
        seed: Math.random() * 100,
        partHeight: 0.12
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
    budget: number
  ): void {
    const segments = Math.min(2 + Math.floor(this.branchDensity * 0.4), 4)
    const dir = side === 'left' ? 1 : -1
    let localY = 0
    const branchLength = params.length * 0.4
    const heightFromBase = clamp(attachY - 0.15, 0, 2)
    const branchProgress = heightFromBase / Math.max(0.1, 1.5)

    for (let i = 0; i < segments; i++) {
      if (!this.canAddVertices(80, 0.95)) break

      const segLen = branchLength / segments
      const segStart = startProg + 0.02 + i * 0.03
      const segEnd = startProg + 0.05 + (i + 1) * 0.03

      const stemGeo = this.baseStemGeo.clone()
      stemGeo.scale(0.4, segLen, 0.4)
      this.addToVertexCounter(stemGeo)

      const colorLerp = clamp(branchProgress + (i / segments) * 0.3, 0, 1)
      const mat = this.createPartMaterial('branch', attachY + localY)
      mat.uniforms.uColorMid.value.lerpColors(
        new THREE.Color(0x4caf50),
        new THREE.Color(0x66bb6a),
        colorLerp
      )

      const mesh = new THREE.Mesh(stemGeo, mat)

      const curveX = dir * Math.sin(horizAngle) * (segLen * 0.4 + i * segLen * 0.5)
      const curveZ = Math.cos(twist) * Math.sin(horizAngle * 0.7) * i * segLen * 0.3
      const totalRise = segLen * 0.7

      const tgtX = curveX
      const tgtY = attachY + localY + totalRise / 2
      const tgtZ = curveZ

      const rx = -Math.sin(horizAngle * 0.6)
      const rz = dir * Math.sin(horizAngle) * 0.7
      const ry = twist * 0.5

      const tgtPos = new THREE.Vector3(tgtX, tgtY, tgtZ)
      const tgtRot = new THREE.Euler(rx, ry, rz)
      const tgtScale = new THREE.Vector3(1, 1, 1)
      const curPos = new THREE.Vector3(0, attachY + segLen / 2, 0)
      const curRot = new THREE.Euler(0, 0, 0)
      const curScale = new THREE.Vector3(0.2, 0.1, 0.2)

      mesh.position.copy(curPos)
      mesh.rotation.copy(curRot)
      mesh.scale.copy(curScale)

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
        targetPosition: tgtPos,
        targetRotation: tgtRot,
        targetScale: tgtScale.clone(),
        targetBasePosition: tgtPos.clone(),
        targetBaseRotation: tgtRot.clone(),
        targetBaseScale: tgtScale.clone(),
        currentPosition: curPos,
        currentRotation: curRot,
        currentScale: curScale,
        baseColor: new THREE.Color(0x7cb342),
        seed: Math.random() * 100,
        partHeight: attachY + localY + segLen / 2
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)

      if (this.canAddVertices(100, 0.92) && Math.random() < 0.45 + this.branchDensity * 0.06) {
        this.addLeaf(
          tgtX + dir * 0.05,
          tgtY + segLen * 0.3,
          tgtZ,
          side,
          branchIdx,
          Math.min(segStart + 0.02, 0.95),
          budget
        )
      }

      localY += totalRise
    }

    if (this.branchDensity >= 3 && Math.random() < 0.4 && this.canAddVertices(400, 0.9)) {
      this.addFlower(
        dir * Math.sin(horizAngle) * branchLength * 0.5,
        attachY + localY + 0.05,
        Math.cos(twist) * branchLength * 0.2,
        `侧花${branchIdx}-${side === 'left' ? '左' : '右'}`,
        Math.min(startProg + 0.2, 0.9),
        true,
        budget
      )
    }
  }

  private addLeavesOnStem(y: number, branchIdx: number, startProg: number, budget: number): void {
    const count = Math.min(1 + Math.floor(Math.random() * 2), 2)
    for (let i = 0; i < count; i++) {
      if (!this.canAddVertices(100, 0.92)) break
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const side = angle < Math.PI ? 'left' : 'right'
      this.addLeaf(
        Math.sin(angle) * 0.08,
        y,
        Math.cos(angle) * 0.08,
        side as 'left' | 'right',
        branchIdx + 100,
        startProg + i * 0.01,
        budget
      )
    }
  }

  private addLeaf(
    x: number, y: number, z: number,
    side: 'left' | 'right',
    branchIdx: number,
    startProg: number,
    _budget: number
  ): void {
    if (!this.canAddVertices(80, 0.96)) return
    const mesh = new THREE.Mesh(this.baseLeafGeo.clone(), this.createPartMaterial('leaf', y))
    const size = 0.8 + Math.random() * 0.5
    const dir = side === 'left' ? 1 : -1
    const tgtRot = new THREE.Euler(
      0.3 + Math.random() * 0.3,
      dir * (0.8 + Math.random() * 0.8),
      dir * (0.4 + Math.random() * 0.3)
    )
    const tgtPos = new THREE.Vector3(x, y, z)
    const tgtScale = new THREE.Vector3(size, size * 0.4, size * 1.1)
    const curPos = new THREE.Vector3(x * 0.2, y - 0.1, z * 0.2)
    const curRot = new THREE.Euler(0, 0, 0)
    const curScale = new THREE.Vector3(0.1, 0.1, 0.1)
    mesh.position.copy(curPos)
    mesh.rotation.copy(curRot)
    mesh.scale.copy(curScale)

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
      targetPosition: tgtPos,
      targetRotation: tgtRot,
      targetScale: tgtScale.clone(),
      targetBasePosition: tgtPos.clone(),
      targetBaseRotation: tgtRot.clone(),
      targetBaseScale: tgtScale.clone(),
      currentPosition: curPos,
      currentRotation: curRot,
      currentScale: curScale,
      baseColor: new THREE.Color(0x81c784),
      seed: Math.random() * 100,
      partHeight: y
    }
    mesh.userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  private addFlowers(topY: number, startProg: number, budget: number): void {
    this.addFlower(0, topY + 0.1, 0, '顶花', startProg, false, budget)

    const count = Math.min(Math.floor(1 + this.branchDensity * 0.4), 3)
    for (let i = 0; i < count; i++) {
      if (!this.canAddVertices(400, 0.95)) break
      const angle = (i / count) * Math.PI * 2
      const r = 0.15 + this.branchDensity * 0.02
      this.addFlower(
        Math.sin(angle) * r,
        topY - 0.05,
        Math.cos(angle) * r,
        `花${i + 1}`,
        startProg + 0.04 + i * 0.01,
        true,
        budget
      )
    }
  }

  private addFlower(
    x: number, y: number, z: number,
    name: string,
    startProg: number,
    isSide: boolean,
    _budget: number
  ): void {
    if (!this.canAddVertices(350, 0.96)) return
    const groupMesh = new THREE.Group()

    const petalCount = 5
    for (let i = 0; i < petalCount; i++) {
      const petal = new THREE.Mesh(this.baseFlowerPetalGeo.clone(), this.createFlowerMaterial())
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
    centerGeo.scale(1, 1, 1)
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xffd54f })
    const center = new THREE.Mesh(centerGeo, centerMat)
    center.position.y = 0.02
    groupMesh.add(center)

    const mesh = groupMesh as unknown as THREE.Mesh
    const baseSize = 0.9 + Math.random() * 0.3
    const targetScaleVal = this.bloomSize * baseSize

    const tgtPos = new THREE.Vector3(x, y, z)
    const tgtRot = new THREE.Euler(isSide ? 0.3 : 0, 0, 0)
    const tgtScale = new THREE.Vector3(targetScaleVal, targetScaleVal, targetScaleVal)
    const curPos = new THREE.Vector3(x * 0.3, y - 0.2, z * 0.3)
    const curRot = new THREE.Euler(0, 0, 0)
    const curScale = new THREE.Vector3(0.05, 0.05, 0.05)
    mesh.position.copy(curPos)
    mesh.rotation.copy(curRot)
    mesh.scale.copy(curScale)

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
      targetPosition: tgtPos,
      targetRotation: tgtRot,
      targetScale: tgtScale.clone(),
      targetBasePosition: tgtPos.clone(),
      targetBaseRotation: tgtRot.clone(),
      targetBaseScale: tgtScale.clone(),
      currentPosition: curPos,
      currentRotation: curRot,
      currentScale: curScale,
      baseColor: new THREE.Color(0xff8fa3),
      seed: Math.random() * 100,
      partHeight: y
    }
    ;(mesh as any).userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  public setGrowthSpeed(speed: number): void {
    this.targetGrowthSpeed = clamp(speed, 0.5, 3.0)
    this.paramTransitionProgress = 0
  }

  public setBranchDensity(density: number): void {
    density = clamp(density, 1, 5)
    if (Math.abs(density - this.targetBranchDensity) < 0.001) return
    this.targetBranchDensity = density
    this.paramTransitionProgress = 0
    this.calculateTransitionTargets()
  }

  private calculateTransitionTargets(): void {
    const densityDiff = this.targetBranchDensity - this.branchDensity
    const normalizedDensityChange = clamp(Math.abs(densityDiff) / 4, 0, 1)
    const easing = this.getEasing()

    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i]
      const cached = this.cachedTargetStates.get(i)
      if (!cached) continue

      let influence = 0.1
      switch (part.type) {
        case 'stem': influence = this.densityTransition.stemInfluence; break
        case 'branch': influence = this.densityTransition.branchInfluence; break
        case 'leaf': influence = this.densityTransition.leafInfluence; break
        case 'flower': influence = this.densityTransition.flowerInfluence; break
        case 'cotyledon': influence = this.densityTransition.cotyledonInfluence; break
        case 'seed': influence = this.densityTransition.seedInfluence; break
      }

      const partFactor = normalizedDensityChange * influence
      const invPartFactor = 1 - partFactor * 0.7

      const densityRatio = this.targetBranchDensity / Math.max(0.1, this.branchDensity || 3)
      const sign = densityDiff > 0 ? 1 : -1

      const scaleAdjust = 1 + sign * partFactor * 0.2
      const posAdjustAmount = partFactor * 0.06

      part.targetPosition.x = cached.targetBasePosition.x + posAdjustAmount * Math.sin(part.seed)
      part.targetPosition.z = cached.targetBasePosition.z + posAdjustAmount * Math.cos(part.seed)
      part.targetPosition.y = cached.targetBasePosition.y + posAdjustAmount * 0.5 * (part.type === 'flower' || part.type === 'leaf' ? 1 : 0.3)

      part.targetRotation.x = cached.targetBaseRotation.x + sign * partFactor * 0.1
      part.targetRotation.z = cached.targetBaseRotation.z + sign * partFactor * 0.08

      if (part.type === 'flower') {
        const bloomRatio = this.bloomSize / Math.max(0.1, this.bloomSize)
        const f = scaleAdjust * bloomRatio * densityRatio
        part.targetScale.x = cached.targetBaseScale.x * f
        part.targetScale.y = cached.targetBaseScale.y * f
        part.targetScale.z = cached.targetBaseScale.z * f
        void easing
      } else {
        part.targetScale.x = cached.targetBaseScale.x * invPartFactor * scaleAdjust
        part.targetScale.y = cached.targetBaseScale.y * scaleAdjust
        part.targetScale.z = cached.targetBaseScale.z * invPartFactor * scaleAdjust
      }
    }
  }

  public setBloomSize(size: number): void {
    size = clamp(size, 0.5, 2.0)
    if (Math.abs(size - this.targetBloomSize) < 0.001) return
    this.targetBloomSize = size
    this.paramTransitionProgress = 0

    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i]
      if (part.type === 'flower') {
        const cached = this.cachedTargetStates.get(i)
        if (cached) {
          const bloomScaleRatio = this.targetBloomSize / Math.max(0.01, this.bloomSize)
          const f = bloomScaleRatio
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

    if (!part.outlineGlowGroup) {
      const glowGroup = this.createGlowOutlineForPart(part)
      if (glowGroup) {
        part.outlineGlowGroup = glowGroup
        this.group.attach(part.outlineGlowGroup)
      }
    }

    this.highlightedPart = part
    this.highlightStartTime = this.time
  }

  private createGlowOutlineForPart(part: PlantPart): THREE.Group | null {
    const geos: THREE.BufferGeometry[] = []
    const collectGeos = (obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.geometry) {
        geos.push(mesh.geometry)
      }
      if (obj.children && obj.children.length > 0) {
        obj.children.forEach(collectGeos)
      }
    }
    collectGeos(part.mesh)

    if (geos.length === 0) return null

    const mergedGeo = geos.length === 1 ? geos[0].clone() : this.mergeGeometries(geos)
    const glowGroup = new THREE.Group()

    const layerConfigs = [
      { thickness: 0.008, strength: 1.2, scale: 1.02 },
      { thickness: 0.020, strength: 0.7, scale: 1.06 },
      { thickness: 0.040, strength: 0.35, scale: 1.14 }
    ]

    for (const cfg of layerConfigs) {
      const layerMat = this.createGlowLayerMaterial(cfg.strength)
      ;(layerMat as any).uniforms.uThickness.value = cfg.thickness
      const layerMesh = new THREE.Mesh(mergedGeo.clone(), layerMat)
      layerMesh.scale.setScalar(cfg.scale)
      glowGroup.add(layerMesh)
    }

    return glowGroup
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
        } else {
          normals.push(0, 1, 0)
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
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    merged.setIndex(indices)

    return merged
  }

  private removeHighlight(part: PlantPart): void {
    if (part.outlineGlowGroup) {
      this.group.remove(part.outlineGlowGroup)
      part.outlineGlowGroup.traverse(child => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const m = mesh.material as THREE.Material | THREE.Material[]
          if (Array.isArray(m)) m.forEach(mm => mm.dispose())
          else m.dispose()
        }
      })
      part.outlineGlowGroup = undefined
    }
  }

  private highlightPulseCurve(t: number): number {
    if (t <= 0) return 0
    if (t >= 1) return 0
    const rise = easeOutQuad(t / 0.15)
    if (t < 0.15) return rise * 0.85
    const pulsePhase = (t - 0.15) / 0.7
    const pulse = 0.7 + 0.3 * Math.sin(pulsePhase * Math.PI * 2)
    if (t < 0.85) return rise * pulse
    const fall = 1 - easeOutQuad((t - 0.85) / 0.15)
    return rise * pulse * fall
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

      if (part.outlineGlowGroup) {
        part.outlineGlowGroup.position.copy(part.mesh.position)
        part.outlineGlowGroup.rotation.copy(part.mesh.rotation)
        part.outlineGlowGroup.scale.copy(part.mesh.scale)
      }

      const updateMaterialUniforms = (mat: THREE.Material | THREE.Material[]) => {
        if (Array.isArray(mat)) {
          mat.forEach(m => updateMaterialUniforms(m))
          return
        }
        if ((mat as any).uniforms) {
          ;(mat as any).uniforms.uTime.value = this.time
          if ((mat as any).uniforms.uProgress !== undefined) {
            ;(mat as any).uniforms.uProgress.value = localT
          }
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

    if (this.highlightedPart && this.highlightedPart.outlineGlowGroup) {
      const elapsed = this.time - this.highlightStartTime
      const totalDuration = 1.0

      if (elapsed > totalDuration) {
        this.removeHighlight(this.highlightedPart)
        this.highlightedPart = null
      } else {
        const pulseValue = this.highlightPulseCurve(elapsed / totalDuration)
        this.highlightedPart.outlineGlowGroup.traverse(child => {
          const mesh = child as THREE.Mesh
          if (mesh.isMesh && mesh.material && (mesh.material as any).uniforms) {
            ;(mesh.material as any).uniforms.uGlowStrength.value = 1.2 * pulseValue
          }
        })
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
