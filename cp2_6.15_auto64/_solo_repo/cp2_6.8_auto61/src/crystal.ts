import * as THREE from 'three'

export interface CrystalParameters {
  ionConcentration: number
  temperature: number
  pH: number
}

export interface CrystalFaceInfo {
  index: string
  growthRate: number
  worldPosition: THREE.Vector3
  normal: THREE.Vector3
}

export type CrystalSystem = 'hexagonal' | 'tetragonal' | 'orthorhombic' | 'cubic'

export class Crystal {
  public group: THREE.Group
  public crystalMesh!: THREE.Mesh
  public glowMesh!: THREE.LineSegments
  public nucleusMesh!: THREE.Mesh
  public currentParams: CrystalParameters
  public isGrowing: boolean = false
  public growthProgress: number = 0
  public targetScale: number = 1
  public currentScale: number = 0
  public crystalSystem: CrystalSystem = 'hexagonal'
  public faceMaterials: THREE.MeshStandardMaterial[] = []
  public faceIndices: string[] = []
  public growthRates: number[] = []

  private growthStartTime: number = 0
  private readonly GROWTH_DURATION = 3000
  private targetGeometry!: THREE.BufferGeometry

  constructor(scene: THREE.Scene, params: CrystalParameters) {
    this.currentParams = { ...params }
    this.group = new THREE.Group()
    scene.add(this.group)
    this.createNucleus()
    this.generateCrystalGeometry()
    this.updateMaterialProperties()
  }

  private createNucleus(): void {
    const nucleusGeo = new THREE.SphereGeometry(0.3, 16, 16)
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    })
    this.nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat)
    this.group.add(this.nucleusMesh)
  }

  private determineCrystalSystem(): CrystalSystem {
    const { ionConcentration, temperature, pH } = this.currentParams
    if (pH >= 8 && ionConcentration >= 1.2) return 'hexagonal'
    if (temperature >= 45 && pH < 6) return 'tetragonal'
    if (ionConcentration < 0.6) return 'orthorhombic'
    return 'cubic'
  }

  private getCrystalSystemName(): string {
    const names: Record<CrystalSystem, string> = {
      hexagonal: '六方晶系',
      tetragonal: '四方晶系',
      orthorhombic: '正交晶系',
      cubic: '立方晶系'
    }
    return names[this.crystalSystem]
  }

  private generateHexagonalPrismWithBipyramid(height: number, radius: number): THREE.BufferGeometry {
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const faceColors: number[] = []

    const segments = 6
    const halfH = height / 2
    const topH = halfH * 0.7
    const botH = -halfH * 0.7
    const midH = halfH * 0.3

    let vertexCount = 0

    const faceColorsList = [
      [1.0, 0.85, 0.95],
      [0.85, 0.95, 1.0],
      [0.95, 1.0, 0.85],
      [1.0, 0.95, 0.85],
      [0.9, 0.9, 1.0],
      [1.0, 0.9, 0.95]
    ]

    const topConeIdx: number[] = []
    const botConeIdx: number[] = []

    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2
      const angle2 = ((i + 1) / segments) * Math.PI * 2

      const x1 = Math.cos(angle1) * radius
      const z1 = Math.sin(angle1) * radius
      const x2 = Math.cos(angle2) * radius
      const z2 = Math.sin(angle2) * radius

      const nTop = vertexCount++
      positions.push(x1, midH, z1)
      normals.push(0, 1, 0)
      uvs.push(i / segments, 0.5)
      faceColors.push(...faceColorsList[i % 6])

      const nTop2 = vertexCount++
      positions.push(x2, midH, z2)
      normals.push(0, 1, 0)
      uvs.push((i + 1) / segments, 0.5)
      faceColors.push(...faceColorsList[i % 6])

      const nTopTip = vertexCount++
      positions.push(0, halfH, 0)
      normals.push(0, 1, 0)
      uvs.push(0.5, 1)
      faceColors.push(...faceColorsList[i % 6])

      topConeIdx.push(nTop, nTop2, nTopTip)

      const nBot = vertexCount++
      positions.push(x1, -midH, z1)
      normals.push(0, -1, 0)
      uvs.push(i / segments, 0.5)
      faceColors.push(...faceColorsList[i % 6])

      const nBot2 = vertexCount++
      positions.push(x2, -midH, z2)
      normals.push(0, -1, 0)
      uvs.push((i + 1) / segments, 0.5)
      faceColors.push(...faceColorsList[i % 6])

      const nBotTip = vertexCount++
      positions.push(0, -halfH, 0)
      normals.push(0, -1, 0)
      uvs.push(0.5, 0)
      faceColors.push(...faceColorsList[i % 6])

      botConeIdx.push(nBot2, nBot, nBotTip)

      const sideNormal = new THREE.Vector3(
        Math.cos(angle1 + Math.PI / segments),
        0,
        Math.sin(angle1 + Math.PI / segments)
      ).normalize()

      const ns1 = vertexCount++
      positions.push(x1, midH, z1)
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z)
      uvs.push(i / segments, 0.7)
      faceColors.push(...faceColorsList[i % 6])

      const ns2 = vertexCount++
      positions.push(x2, midH, z2)
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z)
      uvs.push((i + 1) / segments, 0.7)
      faceColors.push(...faceColorsList[i % 6])

      const ns3 = vertexCount++
      positions.push(x2, -midH, z2)
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z)
      uvs.push((i + 1) / segments, 0.3)
      faceColors.push(...faceColorsList[i % 6])

      const ns4 = vertexCount++
      positions.push(x1, -midH, z1)
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z)
      uvs.push(i / segments, 0.3)
      faceColors.push(...faceColorsList[i % 6])

      indices.push(ns1, ns2, ns3, ns1, ns3, ns4)
    }

    for (const idx of topConeIdx) indices.push(idx)
    for (const idx of botConeIdx) indices.push(idx)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(faceColors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  private generateTetragonalCrystal(height: number, size: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const h = height / 2
    const s = size / 2
    const ts = size * 0.35

    const positions = [
      -s, -h, -s, s, -h, -s, s, -h, s, -s, -h, s,
      -s, -h * 0.5, -s, s, -h * 0.5, -s, s, -h * 0.5, s, -s, -h * 0.5, s,
      -s, h * 0.5, -s, s, h * 0.5, -s, s, h * 0.5, s, -s, h * 0.5, s,
      -s, h, -s, s, h, -s, s, h, s, -s, h, s,
      0, -h * 1.1, 0, 0, h * 1.1, 0,
      -ts, -h * 0.7, -ts, ts, -h * 0.7, -ts, ts, -h * 0.7, ts, -ts, -h * 0.7, ts,
      -ts, h * 0.7, -ts, ts, h * 0.7, -ts, ts, h * 0.7, ts, -ts, h * 0.7, ts
    ]

    const indices = [
      4, 5, 1, 4, 1, 0,
      5, 6, 2, 5, 2, 1,
      6, 7, 3, 6, 3, 2,
      7, 4, 0, 7, 0, 3,
      8, 9, 5, 8, 5, 4,
      9, 10, 6, 9, 6, 5,
      10, 11, 7, 10, 7, 6,
      11, 8, 4, 11, 4, 7,
      12, 8, 11, 12, 11, 15,
      13, 9, 8, 13, 8, 12,
      14, 10, 9, 14, 9, 13,
      15, 11, 10, 15, 10, 14,
      16, 17, 18, 17, 21, 20, 17, 20, 18,
      12, 13, 19, 13, 14, 19, 14, 15, 19, 15, 12, 19
    ]

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const colors: number[] = []
    const colorCount = geometry.getAttribute('position').count
    const palette = [
      [0.9, 0.85, 1.0],
      [0.85, 0.95, 1.0],
      [1.0, 0.9, 0.95],
      [0.95, 1.0, 0.9]
    ]
    for (let i = 0; i < colorCount; i++) {
      colors.push(...palette[i % palette.length])
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }

  private generateOrthorhombicCrystal(height: number, width: number, depth: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const h = height / 2
    const w = width / 2
    const d = depth / 2
    const hw = w * 0.6
    const hd = d * 0.6

    const positions = [
      -w, -h, -d, w, -h, -d, w, -h, d, -w, -h, d,
      -hw, -h * 0.6, -hd, hw, -h * 0.6, -hd, hw, -h * 0.6, hd, -hw, -h * 0.6, hd,
      -hw, h * 0.6, -hd, hw, h * 0.6, -hd, hw, h * 0.6, hd, -hw, h * 0.6, hd,
      -w, h, -d, w, h, -d, w, h, d, -w, h, d,
    ]

    const indices = [
      4, 5, 1, 4, 1, 0,
      5, 6, 2, 5, 2, 1,
      6, 7, 3, 6, 3, 2,
      7, 4, 0, 7, 0, 3,
      8, 9, 5, 8, 5, 4,
      9, 10, 6, 9, 6, 5,
      10, 11, 7, 10, 7, 6,
      11, 8, 4, 11, 4, 7,
      12, 13, 9, 12, 9, 8,
      13, 14, 10, 13, 10, 9,
      14, 15, 11, 14, 11, 10,
      15, 12, 8, 15, 8, 11
    ]

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const colors: number[] = []
    const colorCount = geometry.getAttribute('position').count
    const palette = [
      [0.88, 0.9, 1.0],
      [1.0, 0.92, 0.88],
      [0.9, 1.0, 0.95]
    ]
    for (let i = 0; i < colorCount; i++) {
      colors.push(...palette[i % palette.length])
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }

  private generateCubicCrystal(size: number): THREE.BufferGeometry {
    const s = size / 2
    const fs = size * 0.45

    const positions = [
      -s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s,
      -s, s, -s, s, s, -s, s, s, s, -s, s, s,
      -fs, 0, -fs, fs, 0, -fs, fs, 0, fs, -fs, 0, fs
    ]

    const indices = [
      0, 1, 5, 0, 5, 4,
      1, 2, 6, 1, 6, 5,
      2, 3, 7, 2, 7, 6,
      3, 0, 4, 3, 4, 7,
      0, 3, 2, 0, 2, 1,
      4, 5, 6, 4, 6, 7,
      8, 9, 5, 8, 5, 4,
      9, 10, 6, 9, 6, 5,
      10, 11, 7, 10, 7, 6,
      11, 8, 4, 11, 4, 7,
      8, 0, 1, 8, 1, 9,
      9, 1, 2, 9, 2, 10,
      10, 2, 3, 10, 3, 11,
      11, 3, 0, 11, 0, 8
    ]

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const colors: number[] = []
    const colorCount = geometry.getAttribute('position').count
    const palette = [
      [0.85, 0.9, 1.0],
      [1.0, 0.88, 0.95],
      [0.92, 1.0, 0.9]
    ]
    for (let i = 0; i < colorCount; i++) {
      colors.push(...palette[i % palette.length])
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }

  private calculateGrowthRate(faceIndex: string): number {
    const { ionConcentration, temperature, pH } = this.currentParams
    let base = 0.5 + ionConcentration * 0.3
    base += (temperature - 20) / 80
    const pHBonus = Math.abs(pH - 7) * 0.05
    base += pHBonus

    const faceMultipliers: Record<string, number> = {
      '{100}': 1.0,
      '{010}': 1.0,
      '{001}': 0.8,
      '{110}': 1.2,
      '{101}': 1.1,
      '{011}': 1.1,
      '{111}': 1.3,
      '{10-11}': 0.9,
      '{11-20}': 1.0
    }
    return base * (faceMultipliers[faceIndex] || 1.0)
  }

  private generateCrystalGeometry(): void {
    this.crystalSystem = this.determineCrystalSystem()
    const { ionConcentration, temperature } = this.currentParams
    const baseSize = 1.5 + ionConcentration * 1.5 + (temperature - 20) * 0.03

    let geometry: THREE.BufferGeometry

    switch (this.crystalSystem) {
      case 'hexagonal':
        geometry = this.generateHexagonalPrismWithBipyramid(baseSize * 1.8, baseSize * 0.8)
        this.faceIndices = ['{11-20}', '{10-11}', '{100}', '{110}', '{101}', '{001}']
        break
      case 'tetragonal':
        geometry = this.generateTetragonalCrystal(baseSize * 1.6, baseSize * 1.1)
        this.faceIndices = ['{100}', '{001}', '{101}', '{110}']
        break
      case 'orthorhombic':
        geometry = this.generateOrthorhombicCrystal(baseSize * 1.5, baseSize * 1.0, baseSize * 0.7)
        this.faceIndices = ['{100}', '{010}', '{001}', '{110}']
        break
      case 'cubic':
      default:
        geometry = this.generateCubicCrystal(baseSize * 1.4)
        this.faceIndices = ['{100}', '{110}', '{111}']
        break
    }

    this.growthRates = this.faceIndices.map(idx => this.calculateGrowthRate(idx))
    this.targetGeometry = geometry

    if (this.crystalMesh) {
      this.crystalMesh.geometry.dispose()
    }

    const crystalMaterial = this.createCrystalMaterial()
    this.crystalMesh = new THREE.Mesh(geometry, crystalMaterial)
    this.crystalMesh.scale.setScalar(0.001)
    this.crystalMesh.castShadow = true
    this.crystalMesh.receiveShadow = true
    this.group.add(this.crystalMesh)

    this.createGlowOutline(geometry)
  }

  private createCrystalMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.15,
      roughness: 0.15,
      transmission: 0.75,
      thickness: 1.2,
      ior: 1.54,
      transparent: true,
      opacity: 0.85,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      vertexColors: true,
      envMapIntensity: 1.5,
      reflectivity: 0.6,
      sheen: 0.3,
      sheenColor: new THREE.Color(0x88ccff)
    })
  }

  private createGlowOutline(geometry: THREE.BufferGeometry): void {
    if (this.glowMesh) {
      this.group.remove(this.glowMesh)
      this.glowMesh.geometry.dispose()
    }

    const edges = new THREE.EdgesGeometry(geometry, 20)
    const glowMaterial = new THREE.LineBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.0,
      linewidth: 2
    })
    this.glowMesh = new THREE.LineSegments(edges, glowMaterial)
    this.glowMesh.scale.setScalar(0.001)
    this.group.add(this.glowMesh)
  }

  private updateMaterialProperties(): void {
    if (!this.crystalMesh) return
    const mat = this.crystalMesh.material as THREE.MeshPhysicalMaterial
    const { ionConcentration, pH } = this.currentParams

    mat.roughness = Math.max(0.08, 0.25 - ionConcentration * 0.07)
    mat.transmission = 0.6 + ionConcentration * 0.12
    mat.clearcoat = 0.7 + ionConcentration * 0.15
    mat.opacity = 0.75 + Math.min(0.15, ionConcentration * 0.08)
    mat.thickness = 0.8 + ionConcentration * 0.5

    if (pH < 5) {
      mat.sheenColor = new THREE.Color(0xfb923c)
    } else if (pH > 8) {
      mat.sheenColor = new THREE.Color(0x8b5cf6)
    } else {
      mat.sheenColor = new THREE.Color(0x34d399)
    }
  }

  public startGrowth(): void {
    if (this.isGrowing) return
    this.isGrowing = true
    this.growthStartTime = performance.now()
    this.growthProgress = 0

    if (this.crystalMesh) {
      this.group.remove(this.crystalMesh)
      this.crystalMesh.geometry.dispose()
    }
    if (this.glowMesh) {
      this.group.remove(this.glowMesh)
      this.glowMesh.geometry.dispose()
    }

    this.generateCrystalGeometry()
    this.updateMaterialProperties()
    this.currentScale = 0
  }

  public updateParameters(params: CrystalParameters): void {
    const changed =
      params.ionConcentration !== this.currentParams.ionConcentration ||
      params.temperature !== this.currentParams.temperature ||
      params.pH !== this.currentParams.pH

    if (changed) {
      this.currentParams = { ...params }
      this.startGrowth()
    }
  }

  public update(time: number, camera: THREE.Camera): void {
    if (this.isGrowing) {
      const elapsed = time - this.growthStartTime
      this.growthProgress = Math.min(1, elapsed / this.GROWTH_DURATION)

      const easeProgress = 1 - Math.pow(1 - this.growthProgress, 3)
      this.currentScale = easeProgress

      if (this.crystalMesh) {
        this.crystalMesh.scale.setScalar(Math.max(0.001, this.currentScale))
      }
      if (this.glowMesh) {
        this.glowMesh.scale.setScalar(Math.max(0.001, this.currentScale))
      }
      if (this.nucleusMesh) {
        const mat = this.nucleusMesh.material as THREE.MeshBasicMaterial
        mat.opacity = Math.max(0.05, 0.35 * (1 - this.growthProgress * 0.8))
      }

      if (this.growthProgress >= 1) {
        this.isGrowing = false
      }
    }

    if (this.glowMesh) {
      const glowMat = this.glowMesh.material as THREE.LineBasicMaterial
      const targetOpacity = this.isGrowing
        ? this.growthProgress * 0.6
        : 0.5 + Math.sin(time * 0.003) * 0.2

      glowMat.opacity += (targetOpacity - glowMat.opacity) * 0.1

      const crystalSize = this.currentScale
      const cameraDistance = camera.position.length()
      const glowWidth = Math.max(1, 2 + crystalSize * 1.5)
      glowMat.linewidth = glowWidth

      const centerColor = new THREE.Color(0xffffff)
      const edgeColor = new THREE.Color(0x88ccff)
      const t = Math.min(1, crystalSize * 0.5)
      glowMat.color.copy(centerColor).lerp(edgeColor, t)
    }

    this.group.rotation.y += 0.0008
  }

  public getCrystalSystemInfo(): { system: CrystalSystem; name: string } {
    return {
      system: this.crystalSystem,
      name: this.getCrystalSystemName()
    }
  }

  public intersect(raycaster: THREE.Raycaster): THREE.Intersection | null {
    if (!this.crystalMesh || this.currentScale < 0.3) return null
    const intersects = raycaster.intersectObject(this.crystalMesh, false)
    return intersects.length > 0 ? intersects[0] : null
  }

  public getFaceInfo(intersection: THREE.Intersection): CrystalFaceInfo | null {
    if (!intersection.face || !this.crystalMesh) return null

    const faceIdx = Math.floor(intersection.faceIndex! / 2) % this.faceIndices.length
    const index = this.faceIndices[faceIdx] || this.faceIndices[0]
    const growthRate = this.growthRates[faceIdx] || this.growthRates[0]

    const worldPos = intersection.point.clone()
    const worldNormal = intersection.face.normal.clone()
    worldNormal.transformDirection(this.crystalMesh.matrixWorld)

    return {
      index,
      growthRate,
      worldPosition: worldPos,
      normal: worldNormal
    }
  }

  public highlightFace(faceInfo: CrystalFaceInfo | null): void {
    if (!this.crystalMesh) return
    const mat = this.crystalMesh.material as THREE.MeshPhysicalMaterial

    if (faceInfo) {
      mat.emissive = new THREE.Color(0xffd700)
      mat.emissiveIntensity = 0.35
      mat.transparent = true
      mat.opacity = 0.75
    } else {
      mat.emissive = new THREE.Color(0x000000)
      mat.emissiveIntensity = 0
      this.updateMaterialProperties()
    }
  }
}
