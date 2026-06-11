import * as THREE from 'three'

export type PlantPartType = 'seed' | 'stem' | 'branch' | 'leaf' | 'flower' | 'cotyledon'

export interface PlantPartInfo {
  name: string
  age: number
  color: string
  type: PlantPartType
}

interface PlantPart {
  mesh: THREE.Mesh
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
  highlightMesh?: THREE.Mesh
}

interface LSystemParams {
  iterations: number
  angle: number
  length: number
  branchProbability: number
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

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
  private stemMaterial: THREE.ShaderMaterial
  private leafMaterial: THREE.ShaderMaterial
  private flowerMaterial: THREE.ShaderMaterial
  private baseLeafGeo: THREE.SphereGeometry
  private baseSeedGeo: THREE.SphereGeometry

  constructor() {
    this.group = new THREE.Group()

    this.baseLeafGeo = new THREE.SphereGeometry(0.15, 8, 6)
    this.baseLeafGeo.scale(1, 0.1, 1.8)
    this.baseSeedGeo = new THREE.SphereGeometry(0.12, 10, 8)

    this.stemMaterial = this.createStemShader()
    this.leafMaterial = this.createLeafShader()
    this.flowerMaterial = this.createFlowerShader()

    this.generatePlant()
  }

  private createStemShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uBaseColor1: { value: new THREE.Color(0x9ccc65) },
        uBaseColor2: { value: new THREE.Color(0x2e7d32) },
        uBaseColor3: { value: new THREE.Color(0x5d4037) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying float vHeight;
        varying vec3 vPosition;
        uniform float uTime;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vHeight = position.y;
          vPosition = position;
          vec3 pos = position;
          pos.x += sin(uTime * 0.5 + position.y * 3.0) * 0.005;
          pos.z += cos(uTime * 0.6 + position.y * 2.5) * 0.005;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying float vHeight;
        uniform vec3 uBaseColor1;
        uniform vec3 uBaseColor2;
        uniform vec3 uBaseColor3;
        void main() {
          float h = clamp(vHeight + 0.5, 0.0, 1.0);
          vec3 color;
          if (h < 0.5) {
            color = mix(uBaseColor3, uBaseColor2, h * 2.0);
          } else {
            color = mix(uBaseColor2, uBaseColor1, (h - 0.5) * 2.0);
          }
          float light = max(dot(vNormal, normalize(vec3(0.5, 1.0, 0.5))), 0.0);
          color *= 0.7 + light * 0.5;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    })
  }

  private createLeafShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor1: { value: new THREE.Color(0x8bc34a) },
        uColor2: { value: new THREE.Color(0x33691e) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vHeight;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vHeight;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        void main() {
          float grad = vUv.y;
          vec3 color = mix(uColor2, uColor1, grad);
          float light = max(dot(vNormal, normalize(vec3(0.3, 1.0, 0.4))), 0.0);
          color *= 0.75 + light * 0.4;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    })
  }

  private createFlowerShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0xffb6c1) },
        uColor2: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        void main() {
          float d = length(vPosition);
          float grad = smoothstep(0.0, 0.15, d);
          vec3 color = mix(uColor2, uColor1, grad);
          float light = max(dot(vNormal, normalize(vec3(0.4, 0.9, 0.3))), 0.0);
          color *= 0.8 + light * 0.4;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    })
  }

  private getLSystemParams(density: number): LSystemParams {
    return {
      iterations: Math.floor(2 + density * 0.6),
      angle: (25 + density * 4) * Math.PI / 180,
      length: 0.6 + density * 0.08,
      branchProbability: 0.2 + density * 0.12
    }
  }

  private generatePlant(): void {
    this.clearPlant()
    const params = this.getLSystemParams(this.branchDensity)

    this.addSeed()
    this.addCotyledons()
    this.generateBranches(params)
  }

  private clearPlant(): void {
    for (const part of this.parts) {
      this.group.remove(part.mesh)
      if (part.highlightMesh) {
        this.group.remove(part.highlightMesh)
      }
      part.mesh.geometry.dispose()
    }
    this.parts = []
  }

  private addSeed(): void {
    const mesh = new THREE.Mesh(this.baseSeedGeo, this.stemMaterial.clone())
    mesh.position.set(0, -0.1, 0)
    mesh.scale.set(0.8, 0.6, 0.8)

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
      currentPosition: mesh.position.clone(),
      currentRotation: mesh.rotation.clone(),
      currentScale: mesh.scale.clone(),
      baseColor: new THREE.Color(0x5d4037)
    }
    mesh.userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  private addCotyledons(): void {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'left' : 'right'
      const mesh = new THREE.Mesh(this.baseLeafGeo.clone(), this.leafMaterial.clone())
      const angle = i === 0 ? Math.PI * 0.3 : -Math.PI * 0.3
      mesh.position.set(Math.sin(angle) * 0.1, 0.08, 0)
      mesh.rotation.set(0, i * Math.PI, angle * 0.5)
      mesh.scale.set(0.5, 0.4, 0.7)

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
        currentPosition: mesh.position.clone(),
        currentRotation: mesh.rotation.clone(),
        currentScale: mesh.scale.clone(),
        baseColor: new THREE.Color(0xaed581)
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)
    }
  }

  private generateBranches(params: LSystemParams): void {
    const mainStemSegments = 5 + Math.floor(this.branchDensity)
    let currentHeight = 0.15
    let branchCounter = 0

    for (let i = 0; i < mainStemSegments; i++) {
      const segLength = params.length / mainStemSegments * (1 + i * 0.08)
      const segStartProgress = 0.15 + (i / mainStemSegments) * 0.5
      const segEndProgress = 0.15 + ((i + 1) / mainStemSegments) * 0.5
      const radiusTop = 0.05 - i * 0.006
      const radiusBot = 0.07 - i * 0.005

      const stemGeo = new THREE.CylinderGeometry(
        Math.max(0.015, radiusTop),
        Math.max(0.025, radiusBot),
        segLength, 6, 1
      )
      const mesh = new THREE.Mesh(stemGeo, this.stemMaterial.clone())
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
        currentPosition: new THREE.Vector3(0, -0.3 + segLength / 2, 0),
        currentRotation: new THREE.Euler(0, 0, 0),
        currentScale: new THREE.Vector3(0.3, 0.1, 0.3),
        baseColor: new THREE.Color(0x66bb6a)
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)

      const addBranchHere = i >= 1 && Math.random() < params.branchProbability * (1 + this.branchDensity * 0.1)
      if (addBranchHere) {
        branchCounter++
        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? 'left' : 'right'
          const horizAngle = (s === 0 ? 1 : -1) * (params.angle + Math.random() * 0.2)
          const twist = (branchCounter % 3) * (Math.PI * 2 / 3)
          this.addBranch(
            currentHeight + segLength * 0.8,
            branchCounter,
            side as 'left' | 'right',
            horizAngle,
            twist,
            segStartProgress + 0.05,
            params
          )
        }
      }

      if (i >= 1) {
        this.addLeavesOnStem(
          currentHeight + segLength * 0.5,
          branchCounter,
          segStartProgress + 0.03
        )
      }

      currentHeight += segLength
    }

    this.addFlowers(currentHeight, segEndProgressOfMain(mainStemSegments))
  }

  private addBranch(
    attachY: number,
    branchIdx: number,
    side: 'left' | 'right',
    horizAngle: number,
    twist: number,
    startProg: number,
    params: LSystemParams
  ): void {
    const segments = 2 + Math.floor(this.branchDensity * 0.5)
    const dir = side === 'left' ? 1 : -1
    let localY = 0
    const branchLength = params.length * 0.45

    for (let i = 0; i < segments; i++) {
      const segLen = branchLength / segments
      const segStart = startProg + 0.02 + i * 0.03
      const segEnd = startProg + 0.05 + (i + 1) * 0.03

      const stemGeo = new THREE.CylinderGeometry(
        0.02 - i * 0.003,
        0.035 - i * 0.004,
        segLen, 5, 1
      )
      const mesh = new THREE.Mesh(stemGeo, this.stemMaterial.clone())

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
        currentPosition: new THREE.Vector3(0, attachY + segLen / 2, 0),
        currentRotation: new THREE.Euler(0, 0, 0),
        currentScale: new THREE.Vector3(0.2, 0.1, 0.2),
        baseColor: new THREE.Color(0x7cb342)
      }
      mesh.userData = { partInfo: info }
      this.group.add(mesh)
      this.parts.push(info)

      if (i >= 0 && Math.random() < 0.5 + this.branchDensity * 0.08) {
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

    if (this.branchDensity >= 3 && Math.random() < 0.45) {
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
    const count = 1 + Math.floor(Math.random() * 2)
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
    const mesh = new THREE.Mesh(this.baseLeafGeo.clone(), this.leafMaterial.clone())
    const size = 0.8 + Math.random() * 0.5
    mesh.scale.set(size, size * 0.4, size * 1.1)

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
      currentPosition: new THREE.Vector3(x * 0.2, y - 0.1, z * 0.2),
      currentRotation: new THREE.Euler(0, 0, 0),
      currentScale: new THREE.Vector3(0.1, 0.1, 0.1),
      baseColor: new THREE.Color(0x81c784)
    }
    mesh.userData = { partInfo: info }
    mesh.position.copy(info.currentPosition)
    this.group.add(mesh)
    this.parts.push(info)
  }

  private addFlowers(topY: number, startProg: number): void {
    this.addFlower(0, topY + 0.1, 0, '顶花', startProg, false)

    const count = Math.floor(1 + this.branchDensity * 0.5)
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
      const petalGeo = new THREE.SphereGeometry(0.08, 8, 6)
      petalGeo.scale(1, 0.3, 1.5)
      const petal = new THREE.Mesh(petalGeo, this.flowerMaterial.clone())
      const angle = (i / petalCount) * Math.PI * 2
      petal.position.set(
        Math.sin(angle) * 0.06,
        0,
        Math.cos(angle) * 0.06
      )
      petal.rotation.set(0.2, angle, 0.3)
      groupMesh.add(petal)
    }

    const centerGeo = new THREE.SphereGeometry(0.06, 8, 6)
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
      currentPosition: new THREE.Vector3(x * 0.3, y - 0.2, z * 0.3),
      currentRotation: new THREE.Euler(0, 0, 0),
      currentScale: new THREE.Vector3(0.05, 0.05, 0.05),
      baseColor: new THREE.Color(0xff8fa3)
    }
    ;(mesh as any).userData = { partInfo: info }
    this.group.add(mesh)
    this.parts.push(info)
  }

  public setGrowthSpeed(speed: number): void {
    this.targetGrowthSpeed = speed
  }

  public setBranchDensity(density: number): void {
    this.targetBranchDensity = density
    this.paramTransitionProgress = 0
  }

  public setBloomSize(size: number): void {
    this.targetBloomSize = size
    this.paramTransitionProgress = 0
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

    if (!part.highlightMesh) {
      const bbox = new THREE.Box3().setFromObject(part.mesh)
      const size = new THREE.Vector3()
      bbox.getSize(size)
      const center = new THREE.Vector3()
      bbox.getCenter(center)

      const maxDim = Math.max(size.x, size.y, size.z) * 1.6
      const ringGeo = new THREE.TorusGeometry(maxDim * 0.6, maxDim * 0.08, 8, 24)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(center)
      ring.rotation.x = Math.PI / 2
      ring.layers.enable(1)

      this.group.attach(ring)
      part.highlightMesh = ring
    }

    this.highlightedPart = part
    this.highlightStartTime = this.time
  }

  private removeHighlight(part: PlantPart): void {
    if (part.highlightMesh) {
      this.group.remove(part.highlightMesh)
      part.highlightMesh.geometry.dispose()
      ;(part.highlightMesh.material as THREE.Material).dispose()
      part.highlightMesh = undefined
    }
  }

  public update(delta: number): void {
    this.time += delta

    if (this.paramTransitionProgress < 1) {
      this.paramTransitionProgress = Math.min(1, this.paramTransitionProgress + delta / 0.8)
      const t = easeInOutCubic(this.paramTransitionProgress)

      this.currentGrowthSpeed = lerp(this.currentGrowthSpeed, this.targetGrowthSpeed, t)

      if (Math.abs(this.targetBranchDensity - this.branchDensity) > 0.01) {
        const oldDensity = this.branchDensity
        this.branchDensity = lerp(this.branchDensity, this.targetBranchDensity, t)
        if (this.paramTransitionProgress >= 1 && Math.abs(this.targetBranchDensity - oldDensity) > 0.5) {
          this.generatePlant()
          return
        }
      }

      this.bloomSize = lerp(this.bloomSize, this.targetBloomSize, t)

      for (const part of this.parts) {
        if (part.type === 'flower') {
          part.targetScale.set(
            Math.abs(this.bloomSize) * 0.9,
            Math.abs(this.bloomSize) * 0.9,
            Math.abs(this.bloomSize) * 0.9
          )
        }
      }
    }

    this.growthProgress = Math.min(1, this.growthProgress + delta * this.currentGrowthSpeed / 30)

    for (const part of this.parts) {
      let localT = 0
      if (this.growthProgress <= part.startProgress) {
        localT = 0
      } else if (this.growthProgress >= part.endProgress) {
        localT = 1
      } else {
        localT = (this.growthProgress - part.startProgress) / (part.endProgress - part.startProgress)
      }
      localT = easeInOutCubic(localT)

      const swayOffset = new THREE.Vector3(
        Math.sin(this.time * 0.8 + part.targetPosition.y * 3) * 0.015 * localT,
        0,
        Math.cos(this.time * 0.7 + part.targetPosition.y * 2.5) * 0.015 * localT
      )

      part.mesh.position.lerpVectors(part.currentPosition, part.targetPosition, localT).add(swayOffset)

      part.mesh.rotation.set(
        lerp(part.currentRotation.x, part.targetRotation.x, localT) + Math.sin(this.time * 0.6 + part.targetPosition.y * 2) * 0.015 * localT,
        lerp(part.currentRotation.y, part.targetRotation.y, localT) + Math.cos(this.time * 0.5 + part.targetPosition.y * 1.5) * 0.02 * localT,
        lerp(part.currentRotation.z, part.targetRotation.z, localT)
      )

      part.mesh.scale.lerpVectors(part.currentScale, part.targetScale, localT)

      const mat = part.mesh.material
      if (mat && (mat as any).uniforms) {
        ;(mat as any).uniforms.uTime.value = this.time
        ;(mat as any).uniforms.uProgress.value = localT
      }
      if (part.type === 'flower') {
        part.mesh.traverse(child => {
          const m = (child as THREE.Mesh).material
          if (m && (m as any).uniforms) {
            ;(m as any).uniforms.uTime.value = this.time
          }
        })
      }
    }

    if (this.highlightedPart && this.highlightedPart.highlightMesh) {
      const elapsed = this.time - this.highlightStartTime
      if (elapsed > 1) {
        this.removeHighlight(this.highlightedPart)
        this.highlightedPart = null
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 / 1.2)
        const ring = this.highlightedPart.highlightMesh
        ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.5
        ring.scale.setScalar(0.95 + pulse * 0.1)
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
}

function segEndProgressOfMain(seg: number): number {
  return 0.15 + (seg / seg) * 0.5 + 0.1
}
