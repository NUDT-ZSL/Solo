import * as THREE from 'three'
import { ClimateParams, calculateSlope, getTerrainHeight } from './environment'

export type PlantType = 'grass' | 'shrub' | 'tree'
export type GrowthStage = 'seed' | 'young' | 'mature'

export interface PlantData {
  id: number
  type: PlantType
  x: number
  z: number
  y: number
  rotationY: number
  growth: number
  targetGrowth: number
  stage: GrowthStage
  flashTime: number
  flashing: boolean
  shrubHeight?: number
  treeTrunkHeight?: number
  treeTrunkRadius?: number
  treeCrownRadius?: number
  visible: boolean
  growAnimation?: {
    startTime: number
    duration: number
    startGrowth: number
    endGrowth: number
  }
}

export class VegetationSystem {
  private scene: THREE.Scene
  private terrainGeometry: THREE.PlaneGeometry
  private climate: ClimateParams
  private plants: PlantData[] = []
  private nextPlantId: number = 0
  public group: THREE.Group

  private readonly MAX_PLANTS = 8000
  private readonly GRASS_HEIGHT = 0.2
  private readonly SHRUB_MIN_HEIGHT = 0.5
  private readonly SHRUB_MAX_HEIGHT = 1
  private readonly TREE_TRUNK_HEIGHT = 2

  private seedLightColor = new THREE.Color(0xFFFFAA)
  private youngColor = new THREE.Color(0x90EE90)
  private matureColor = new THREE.Color(0x006400)
  private shrubColor = new THREE.Color(0x32CD32)
  private trunkColor = new THREE.Color(0x8B4513)
  private tmpColor = new THREE.Color()
  private tmpMat = new THREE.Matrix4()
  private tmpPos = new THREE.Vector3()
  private tmpQuat = new THREE.Quaternion()
  private tmpScale = new THREE.Vector3()

  private grassGeo: THREE.CylinderGeometry
  private grassMaterial: THREE.MeshLambertMaterial
  private grassInst: THREE.InstancedMesh | null = null

  private shrubTrunkGeo: THREE.CylinderGeometry
  private shrubLeafGeo: THREE.SphereGeometry
  private shrubMat: THREE.MeshLambertMaterial
  private shrubLeafMat: THREE.MeshLambertMaterial
  private shrubTrunkInst: THREE.InstancedMesh | null = null
  private shrubLeafInst: THREE.InstancedMesh | null = null

  private treeTrunkGeo: THREE.CylinderGeometry
  private treeCrownGeo: THREE.SphereGeometry
  private treeTrunkMat: THREE.MeshLambertMaterial
  private treeCrownMat: THREE.MeshLambertMaterial
  private treeTrunkInst: THREE.InstancedMesh | null = null
  private treeCrownInst: THREE.InstancedMesh | null = null

  constructor(
    scene: THREE.Scene,
    terrainGeometry: THREE.PlaneGeometry,
    climate: ClimateParams
  ) {
    this.scene = scene
    this.terrainGeometry = terrainGeometry
    this.climate = climate
    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.grassGeo = new THREE.CylinderGeometry(0.02, 0.02, this.GRASS_HEIGHT, 4)
    this.grassGeo.translate(0, this.GRASS_HEIGHT / 2, 0)
    this.grassMaterial = new THREE.MeshLambertMaterial({ color: this.youngColor })

    this.shrubTrunkGeo = new THREE.CylinderGeometry(0.03, 0.04, 1, 5)
    this.shrubLeafGeo = new THREE.SphereGeometry(1, 8, 6)
    this.shrubMat = new THREE.MeshLambertMaterial({ color: this.trunkColor })
    this.shrubLeafMat = new THREE.MeshLambertMaterial({ color: this.shrubColor })

    this.treeTrunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 1, 6)
    this.treeCrownGeo = new THREE.SphereGeometry(1, 10, 8)
    this.treeTrunkMat = new THREE.MeshLambertMaterial({ color: this.trunkColor })
    this.treeCrownMat = new THREE.MeshLambertMaterial({ color: this.matureColor, emissive: 0x000000 })
  }

  private rebuildInstancedMeshes(): void {
    this.disposeMeshes()

    const grassCount = this.plants.filter(p => p.type === 'grass').length
    const shrubCount = this.plants.filter(p => p.type === 'shrub').length
    const treeCount = this.plants.filter(p => p.type === 'tree').length

    if (grassCount > 0) {
      this.grassInst = new THREE.InstancedMesh(this.grassGeo, this.grassMaterial, grassCount)
      this.grassInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.grassInst.castShadow = true
      this.group.add(this.grassInst)
    }

    if (shrubCount > 0) {
      this.shrubTrunkInst = new THREE.InstancedMesh(this.shrubTrunkGeo, this.shrubMat, shrubCount)
      this.shrubLeafInst = new THREE.InstancedMesh(this.shrubLeafGeo, this.shrubLeafMat, shrubCount)
      this.shrubTrunkInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.shrubLeafInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.shrubTrunkInst.castShadow = true
      this.shrubLeafInst.castShadow = true
      this.group.add(this.shrubTrunkInst)
      this.group.add(this.shrubLeafInst)
    }

    if (treeCount > 0) {
      this.treeTrunkInst = new THREE.InstancedMesh(this.treeTrunkGeo, this.treeTrunkMat, treeCount)
      this.treeCrownInst = new THREE.InstancedMesh(this.treeCrownGeo, this.treeCrownMat, treeCount)
      this.treeTrunkInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.treeCrownInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.treeTrunkInst.castShadow = true
      this.treeCrownInst.castShadow = true
      this.group.add(this.treeTrunkInst)
      this.group.add(this.treeCrownInst)
    }

    this.updateAllInstances()
  }

  private disposeMeshes(): void {
    if (this.grassInst) { this.group.remove(this.grassInst); this.grassInst.dispose() }
    if (this.shrubTrunkInst) { this.group.remove(this.shrubTrunkInst); this.shrubTrunkInst.dispose() }
    if (this.shrubLeafInst) { this.group.remove(this.shrubLeafInst); this.shrubLeafInst.dispose() }
    if (this.treeTrunkInst) { this.group.remove(this.treeTrunkInst); this.treeTrunkInst.dispose() }
    if (this.treeCrownInst) { this.group.remove(this.treeCrownInst); this.treeCrownInst.dispose() }
    this.grassInst = null
    this.shrubTrunkInst = null
    this.shrubLeafInst = null
    this.treeTrunkInst = null
    this.treeCrownInst = null
  }

  public updateClimate(climate: ClimateParams): void {
    this.climate = climate
  }

  public generateTree(x?: number, z?: number, type: PlantType = 'tree'): PlantData | null {
    if (this.plants.length >= this.MAX_PLANTS) return null

    const width = this.terrainGeometry.parameters.width
    const height = this.terrainGeometry.parameters.height

    if (x === undefined) x = (Math.random() - 0.5) * width * 0.9
    if (z === undefined) z = (Math.random() - 0.5) * height * 0.9

    const slope = calculateSlope(this.terrainGeometry, x, z)
    if (type === 'grass' && slope >= 15) return null
    if (type === 'shrub' && (slope < 15 || slope >= 30)) return null
    if (type === 'tree' && slope >= 10) return null

    const y = getTerrainHeight(this.terrainGeometry, x, z)

    const plant: PlantData = {
      id: this.nextPlantId++,
      type,
      x, z, y,
      rotationY: Math.random() * Math.PI * 2,
      growth: 0,
      targetGrowth: 1,
      stage: 'seed',
      flashTime: 0,
      flashing: false,
      visible: true
    }

    if (type === 'shrub') {
      plant.shrubHeight = this.SHRUB_MIN_HEIGHT + Math.random() * (this.SHRUB_MAX_HEIGHT - this.SHRUB_MIN_HEIGHT)
    } else if (type === 'tree') {
      plant.treeTrunkHeight = 1 + Math.random() * 1
      plant.treeTrunkRadius = 0.05 + Math.random() * 0.05
      plant.treeCrownRadius = 0.3 + Math.random() * 0.2
    }

    this.plants.push(plant)
    this.rebuildInstancedMeshes()
    return plant
  }

  public growStep(): void {
    const now = performance.now()
    const growAmount = 0.01 * (0.5 + this.climate.temperature * 1.5)
    const flashPhase = Math.sin(now * 0.03) > 0

    let needUpdate = false
    for (const plant of this.plants) {
      let plantChanged = false

      if (plant.growAnimation) {
        const elapsed = now - plant.growAnimation.startTime
        const progress = Math.min(1, elapsed / plant.growAnimation.duration)
        const eased = this.easeInOutCubic(progress)
        const newGrowth = plant.growAnimation.startGrowth +
          (plant.growAnimation.endGrowth - plant.growAnimation.startGrowth) * eased
        if (newGrowth !== plant.growth) {
          plant.growth = newGrowth
          plantChanged = true
        }
        if (progress >= 1) plant.growAnimation = undefined
      } else if (plant.growth < plant.targetGrowth) {
        plant.growth = Math.min(plant.targetGrowth, plant.growth + growAmount)
        plantChanged = true
      }

      const newStage: GrowthStage = plant.growth >= 0.85 ? 'mature' : plant.growth >= 0.25 ? 'young' : 'seed'
      if (newStage !== plant.stage) {
        plant.stage = newStage
        plantChanged = true
      }

      if (plant.flashing) {
        plant.flashTime -= 16
        if (plant.flashTime <= 0) {
          plant.flashing = false
          plant.visible = true
        } else {
          plant.visible = flashPhase
        }
        plantChanged = true
      } else if (!plant.visible) {
        plant.visible = true
        plantChanged = true
      }

      if (plantChanged) needUpdate = true
    }

    if (needUpdate) {
      this.updateAllInstances()
    }
  }

  public recalculateArea(cx: number, cz: number, radius: number): void {
    const r2 = radius * radius
    this.plants = this.plants.filter(p => {
      const dx = p.x - cx, dz = p.z - cz
      return dx * dx + dz * dz > r2
    })

    this.generateArea(cx, cz, radius)

    for (const p of this.plants) {
      const dx = p.x - cx, dz = p.z - cz
      if (dx * dx + dz * dz <= r2) {
        p.flashing = true
        p.flashTime = 500
      }
    }

    this.rebuildInstancedMeshes()
  }

  public generateFullTerrain(): void {
    const width = this.terrainGeometry.parameters.width
    const height = this.terrainGeometry.parameters.height
    this.plants = []
    this.generateArea(0, 0, Math.max(width, height) / 2 * 0.9)
    this.rebuildInstancedMeshes()
  }

  public accelerateGrowth(cx: number, cz: number, size: number): void {
    const half = size / 2
    const now = performance.now()
    for (const plant of this.plants) {
      if (
        plant.x >= cx - half && plant.x <= cx + half &&
        plant.z >= cz - half && plant.z <= cz + half
      ) {
        plant.growAnimation = {
          startTime: now,
          duration: 2000,
          startGrowth: 0,
          endGrowth: 1
        }
        plant.stage = 'seed'
        plant.growth = 0
      }
    }
  }

  public checkTreeGeneration(globalHumidity: number, globalTemperature: number): void {
    if (globalHumidity >= 0.78 && globalHumidity <= 0.82 &&
        globalTemperature >= 0.58 && globalTemperature <= 0.62) {
      const treeCount = this.plants.filter(p => p.type === 'tree').length
      if (treeCount < 10) {
        const toGenerate = 10 - treeCount
        let added = 0
        for (let i = 0; i < toGenerate && added < toGenerate; i++) {
          if (this.generateRandomTreeInHumidArea()) added++
        }
        if (added > 0) this.rebuildInstancedMeshes()
      }
    }
  }

  public getPlantCount(): number {
    return this.plants.length
  }

  private generateArea(cx: number, cz: number, radius: number): void {
    const width = this.terrainGeometry.parameters.width
    const height = this.terrainGeometry.parameters.height

    const step = 0.5
    const rainMultiplier = 0.5 + this.climate.rainfall * 1.5

    for (let x = -radius; x <= radius && this.plants.length < this.MAX_PLANTS; x += step) {
      for (let z = -radius; z <= radius && this.plants.length < this.MAX_PLANTS; z += step) {
        const px = cx + x
        const pz = cz + z
        const dist2 = x * x + z * z
        if (dist2 > radius * radius) continue
        if (Math.abs(px) > width / 2 - 1 || Math.abs(pz) > height / 2 - 1) continue

        const slope = calculateSlope(this.terrainGeometry, px, pz)
        if (slope > 30) continue

        if (slope < 10) {
          const treeDensity = 0.3 * rainMultiplier
          if (Math.random() < treeDensity * step * step && this.plants.length < this.MAX_PLANTS) {
            const tx = px + (Math.random() - 0.5) * step
            const tz = pz + (Math.random() - 0.5) * step
            this.addPlantData(tx, tz, 'tree')
          }
          const grassDensity = Math.floor(3 * rainMultiplier)
          for (let g = 0; g < grassDensity && this.plants.length < this.MAX_PLANTS; g++) {
            const gx = px + (Math.random() - 0.5) * step
            const gz = pz + (Math.random() - 0.5) * step
            if (Math.random() < 0.6) this.addPlantData(gx, gz, 'grass')
          }
        } else if (slope < 15) {
          const grassDensity = Math.floor(3 * rainMultiplier)
          for (let g = 0; g < grassDensity && this.plants.length < this.MAX_PLANTS; g++) {
            const gx = px + (Math.random() - 0.5) * step
            const gz = pz + (Math.random() - 0.5) * step
            if (Math.random() < 0.7) this.addPlantData(gx, gz, 'grass')
          }
        } else if (slope < 30) {
          const shrubProb = rainMultiplier * 0.3
          if (Math.random() < shrubProb && this.plants.length < this.MAX_PLANTS) {
            const sx = px + (Math.random() - 0.5) * step
            const sz = pz + (Math.random() - 0.5) * step
            this.addPlantData(sx, sz, 'shrub')
          }
        }
      }
    }
  }

  private addPlantData(x: number, z: number, type: PlantType): void {
    const slope = calculateSlope(this.terrainGeometry, x, z)
    if (type === 'grass' && slope >= 15) return
    if (type === 'shrub' && (slope < 15 || slope >= 30)) return
    if (type === 'tree' && slope >= 10) return

    const y = getTerrainHeight(this.terrainGeometry, x, z)
    const growth = 0.3 + Math.random() * 0.7

    const data: PlantData = {
      id: this.nextPlantId++,
      type,
      x, z, y,
      rotationY: Math.random() * Math.PI * 2,
      growth,
      targetGrowth: 1,
      stage: growth >= 0.85 ? 'mature' : growth >= 0.25 ? 'young' : 'seed',
      flashTime: 0,
      flashing: false,
      visible: true
    }

    if (type === 'shrub') {
      data.shrubHeight = this.SHRUB_MIN_HEIGHT + Math.random() * (this.SHRUB_MAX_HEIGHT - this.SHRUB_MIN_HEIGHT)
    } else if (type === 'tree') {
      data.treeTrunkHeight = 1 + Math.random() * 1
      data.treeTrunkRadius = 0.05 + Math.random() * 0.05
      data.treeCrownRadius = 0.3 + Math.random() * 0.2
    }

    this.plants.push(data)
  }

  private generateRandomTreeInHumidArea(): boolean {
    const width = this.terrainGeometry.parameters.width
    const height = this.terrainGeometry.parameters.height
    let attempts = 0
    while (attempts < 50 && this.plants.length < this.MAX_PLANTS) {
      attempts++
      const x = (Math.random() - 0.5) * width * 0.8
      const z = (Math.random() - 0.5) * height * 0.8
      const slope = calculateSlope(this.terrainGeometry, x, z)
      if (slope < 10) {
        const y = getTerrainHeight(this.terrainGeometry, x, z)
        this.plants.push({
          id: this.nextPlantId++,
          type: 'tree',
          x, z, y,
          rotationY: Math.random() * Math.PI * 2,
          growth: 0.5 + Math.random() * 0.5,
          targetGrowth: 1,
          stage: 'young',
          flashTime: 0,
          flashing: false,
          treeTrunkHeight: 1 + Math.random() * 1,
          treeTrunkRadius: 0.05 + Math.random() * 0.05,
          treeCrownRadius: 0.3 + Math.random() * 0.2,
          visible: true
        })
        return true
      }
    }
    return false
  }

  private updateAllInstances(): void {
    let gIdx = 0, sIdx = 0, tIdx = 0

    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i]
      const g = Math.max(0.001, p.growth)

      if (!p.visible) {
        if (p.type === 'grass' && this.grassInst) this.setHiddenMatrix(this.grassInst, gIdx++)
        else if (p.type === 'shrub') {
          if (this.shrubTrunkInst) this.setHiddenMatrix(this.shrubTrunkInst, sIdx)
          if (this.shrubLeafInst) this.setHiddenMatrix(this.shrubLeafInst, sIdx)
          sIdx++
        } else if (p.type === 'tree') {
          if (this.treeTrunkInst) this.setHiddenMatrix(this.treeTrunkInst, tIdx)
          if (this.treeCrownInst) this.setHiddenMatrix(this.treeCrownInst, tIdx)
          tIdx++
        }
        continue
      }

      if (p.type === 'grass' && this.grassInst) {
        this.tmpPos.set(p.x, p.y, p.z)
        const scaleY = 0.1 + (1.5 - 0.1) * g
        this.tmpScale.set(1, scaleY, 1)
        this.tmpQuat.setFromEuler(new THREE.Euler(0, p.rotationY, 0))
        this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale)
        this.grassInst.setMatrixAt(gIdx, this.tmpMat)
        this.setInstanceColor(this.grassInst, gIdx, this.getPlantColor(p, this.youngColor, this.matureColor, false))
        gIdx++
      } else if (p.type === 'shrub') {
        const h = p.shrubHeight || 0.75
        if (this.shrubTrunkInst) {
          this.tmpPos.set(p.x, p.y + h * 0.2 * g, p.z)
          const cylScale = 0.1 + (1 - 0.1) * g
          this.tmpScale.set(cylScale, cylScale * h * 0.4, cylScale)
          this.tmpQuat.setFromEuler(new THREE.Euler(0, p.rotationY, 0))
          this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale)
          this.shrubTrunkInst.setMatrixAt(sIdx, this.tmpMat)
          this.setInstanceColor(this.shrubTrunkInst, sIdx, this.trunkColor)
        }
        if (this.shrubLeafInst) {
          const sphereGrow = 0.05 + (0.3 - 0.05) * g
          const sphereScale = sphereGrow / (h * 0.35)
          this.tmpPos.set(p.x, p.y + h * 0.6 * g, p.z)
          this.tmpScale.set(sphereScale, sphereScale, sphereScale)
          this.tmpQuat.setFromEuler(new THREE.Euler(0, p.rotationY, 0))
          this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale)
          this.shrubLeafInst.setMatrixAt(sIdx, this.tmpMat)
          this.setInstanceColor(this.shrubLeafInst, sIdx, this.getPlantColor(p, this.youngColor, this.shrubColor, false))
        }
        sIdx++
      } else if (p.type === 'tree') {
        const trunkH = p.treeTrunkHeight || this.TREE_TRUNK_HEIGHT
        const trunkR = p.treeTrunkRadius || 0.07
        const crownR = p.treeCrownRadius || 0.4
        const seedScale = Math.max(0.001, g)
        const cylScale = seedScale
        const trunkScaled = trunkH * cylScale
        const crownScale = seedScale
        if (this.treeTrunkInst) {
          this.tmpPos.set(p.x, p.y + trunkScaled / 2, p.z)
          this.tmpScale.set(trunkR / 0.07 * cylScale, trunkScaled, trunkR / 0.07 * cylScale)
          this.tmpQuat.setFromEuler(new THREE.Euler(0, p.rotationY, 0))
          this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale)
          this.treeTrunkInst.setMatrixAt(tIdx, this.tmpMat)
          this.setInstanceColor(this.treeTrunkInst, tIdx, this.trunkColor)
        }
        if (this.treeCrownInst) {
          this.tmpPos.set(p.x, p.y + trunkScaled + crownR * crownScale * 0.7, p.z)
          this.tmpScale.set(crownR / 0.5 * crownScale, crownR / 0.5 * crownScale, crownR / 0.5 * crownScale)
          this.tmpQuat.setFromEuler(new THREE.Euler(0, p.rotationY, 0))
          this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale)
          this.treeCrownInst.setMatrixAt(tIdx, this.tmpMat)
          if (p.stage === 'seed') {
            this.setInstanceColor(this.treeCrownInst, tIdx, this.seedLightColor)
          } else {
            this.setInstanceColor(this.treeCrownInst, tIdx, this.getPlantColor(p, this.youngColor, this.matureColor, false))
          }
        }
        tIdx++
      }
    }

    if (this.grassInst) { this.grassInst.instanceMatrix.needsUpdate = true; if (this.grassInst.instanceColor) this.grassInst.instanceColor.needsUpdate = true }
    if (this.shrubTrunkInst) { this.shrubTrunkInst.instanceMatrix.needsUpdate = true; if (this.shrubTrunkInst.instanceColor) this.shrubTrunkInst.instanceColor.needsUpdate = true }
    if (this.shrubLeafInst) { this.shrubLeafInst.instanceMatrix.needsUpdate = true; if (this.shrubLeafInst.instanceColor) this.shrubLeafInst.instanceColor.needsUpdate = true }
    if (this.treeTrunkInst) { this.treeTrunkInst.instanceMatrix.needsUpdate = true; if (this.treeTrunkInst.instanceColor) this.treeTrunkInst.instanceColor.needsUpdate = true }
    if (this.treeCrownInst) { this.treeCrownInst.instanceMatrix.needsUpdate = true; if (this.treeCrownInst.instanceColor) this.treeCrownInst.instanceColor.needsUpdate = true }
  }

  private setHiddenMatrix(mesh: THREE.InstancedMesh, idx: number): void {
    this.tmpMat.makeScale(0, 0, 0)
    mesh.setMatrixAt(idx, this.tmpMat)
  }

  private getPlantColor(plant: PlantData, young: THREE.Color, mature: THREE.Color, _isEmissive: boolean): THREE.Color {
    if (plant.stage === 'seed') {
      return this.seedLightColor
    }
    const t = Math.max(0, Math.min(1, (plant.growth - 0.3) / 0.7))
    return this.tmpColor.copy(young).lerp(mature, t)
  }

  private setInstanceColor(mesh: THREE.InstancedMesh, idx: number, color: THREE.Color): void {
    if (!mesh.instanceColor) {
      const colors = new Float32Array(mesh.count * 3)
      for (let i = 0; i < mesh.count; i++) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1
      }
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
    }
    mesh.setColorAt(idx, color)
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}
