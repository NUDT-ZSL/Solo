import * as THREE from 'three'
import { WallData, MazeData, hslToHex } from './MazeGenerator'

export interface OpticsState {
  totalDistance: number
  lastMilestone: number
  deadEndCount: number
  lastProgressTime: number
  lastProgressDistance: number
  isPunished: boolean
  punishEndTime: number
  dominantHue: number
  avgReflectivity: number
  hueShift: number
}

export interface WallRenderData {
  mesh: THREE.Mesh
  data: WallData
  material: THREE.MeshPhysicalMaterial
  currentHue: number
  currentReflectivity: number
  currentTransparency: number
  baseHue: number
}

const MIN_REFLECTIVITY = 0.30
const MAX_REFLECTIVITY = 0.80
const MIN_TRANSPARENCY = 0.20
const MAX_TRANSPARENCY = 0.60
const MILESTONE_DISTANCE = 10
const DEAD_END_TIME = 30
const DEAD_END_MIN_DISTANCE = 5
const MAX_DEAD_END_COUNT = 3
const PUNISH_DURATION = 2000
const HUE_MILESTONE_SHIFT = 15
const REFLECTION_HUE_OFFSET = 20

export class OpticsManager {
  private wallRenderData: Map<string, WallRenderData> = new Map()
  private state: OpticsState
  private mazeData: MazeData
  private renderCallback?: () => void

  constructor(mazeData: MazeData) {
    this.mazeData = mazeData
    this.state = {
      totalDistance: 0,
      lastMilestone: 0,
      deadEndCount: 0,
      lastProgressTime: performance.now(),
      lastProgressDistance: 0,
      isPunished: false,
      punishEndTime: 0,
      dominantHue: 0,
      avgReflectivity: 0.6,
      hueShift: 0
    }
    this.calculateDominantHue()
    this.calculateAvgReflectivity()
  }

  registerWall(id: string, mesh: THREE.Mesh, data: WallData, material: THREE.MeshPhysicalMaterial): void {
    this.wallRenderData.set(id, {
      mesh,
      data,
      material,
      currentHue: data.colorHue,
      currentReflectivity: data.reflectivity,
      currentTransparency: data.transparency,
      baseHue: data.colorHue
    })
  }

  getState(): OpticsState {
    return { ...this.state }
  }

  getWallRenderData(): Map<string, WallRenderData> {
    return this.wallRenderData
  }

  addDistance(delta: number): void {
    const now = performance.now()
    this.state.totalDistance += delta

    if (this.state.totalDistance - this.state.lastProgressDistance >= DEAD_END_MIN_DISTANCE) {
      this.state.lastProgressTime = now
      this.state.lastProgressDistance = this.state.totalDistance
      this.state.deadEndCount = 0
    } else if (now - this.state.lastProgressTime >= DEAD_END_TIME * 1000) {
      this.state.deadEndCount++
      this.state.lastProgressTime = now
      if (this.state.deadEndCount >= MAX_DEAD_END_COUNT) {
        this.triggerPunishment()
        this.state.deadEndCount = 0
      }
    }

    while (this.state.totalDistance - this.state.lastMilestone >= MILESTONE_DISTANCE) {
      this.state.lastMilestone += MILESTONE_DISTANCE
      this.applyMilestoneChanges()
    }
  }

  private triggerPunishment(): void {
    this.state.isPunished = true
    this.state.punishEndTime = performance.now() + PUNISH_DURATION
    this.applyPunishmentColors()
  }

  private applyPunishmentColors(): void {
    for (const wrd of this.wallRenderData.values()) {
      const grayHex = '#888888'
      wrd.material.color.set(grayHex)
      wrd.material.emissive = new THREE.Color('#333333')
    }
  }

  private restoreColors(): void {
    for (const wrd of this.wallRenderData.values()) {
      this.updateWallAppearance(wrd)
    }
  }

  private applyMilestoneChanges(): void {
    this.state.hueShift = (this.state.hueShift + HUE_MILESTONE_SHIFT) % 360

    for (const wrd of this.wallRenderData.values()) {
      const reflDelta = 0.05 + Math.random() * 0.10
      const transDelta = 0.03 + Math.random() * 0.07
      const reflSign = Math.random() > 0.5 ? 1 : -1
      const transSign = Math.random() > 0.5 ? 1 : -1

      wrd.currentReflectivity = Math.max(
        MIN_REFLECTIVITY,
        Math.min(MAX_REFLECTIVITY, wrd.currentReflectivity + reflSign * reflDelta)
      )
      wrd.currentTransparency = Math.max(
        MIN_TRANSPARENCY,
        Math.min(MAX_TRANSPARENCY, wrd.currentTransparency + transSign * transDelta)
      )
      wrd.currentHue = (wrd.baseHue + this.state.hueShift) % 360
    }

    this.calculateAvgReflectivity()
    this.calculateDominantHue()
    for (const wrd of this.wallRenderData.values()) {
      this.updateWallAppearance(wrd)
    }
  }

  private updateWallAppearance(wrd: WallRenderData): void {
    const hue = wrd.currentHue
    const hex = hslToHex(hue, 70, 55)
    wrd.material.color.set(hex)
    wrd.material.opacity = wrd.currentTransparency
    wrd.material.transparent = wrd.currentTransparency > 0.01
    wrd.material.metalness = wrd.currentReflectivity
    wrd.material.roughness = 1 - wrd.currentReflectivity
    wrd.material.envMapIntensity = wrd.currentReflectivity * 2

    const emissiveHex = hslToHex(hue, 50, 25)
    wrd.material.emissive = new THREE.Color(emissiveHex)
    wrd.material.emissiveIntensity = 0.15 + wrd.currentReflectivity * 0.3
  }

  private calculateAvgReflectivity(): void {
    let total = 0
    let count = 0
    for (const wrd of this.wallRenderData.values()) {
      total += wrd.currentReflectivity
      count++
    }
    this.state.avgReflectivity = count > 0 ? total / count : 0.6
  }

  private calculateDominantHue(): void {
    const hueBuckets: number[] = new Array(12).fill(0)
    for (const wrd of this.wallRenderData.values()) {
      const bucket = Math.floor(wrd.currentHue / 30) % 12
      hueBuckets[bucket]++
    }
    let maxBucket = 0
    for (let i = 1; i < hueBuckets.length; i++) {
      if (hueBuckets[i] > hueBuckets[maxBucket]) maxBucket = i
    }
    this.state.dominantHue = maxBucket * 30
  }

  getReflectionTint(wallId: string): THREE.Color {
    const wrd = this.wallRenderData.get(wallId)
    if (!wrd) return new THREE.Color('#ffffff')
    let hue = wrd.currentHue
    if (wrd.data.isCorrectPath) {
      hue = (hue + REFLECTION_HUE_OFFSET + 90) % 360
    } else {
      hue = (hue + REFLECTION_HUE_OFFSET) % 360
    }
    return new THREE.Color(hslToHex(hue, 60, 70))
  }

  getReflectionHintColor(wallId: string): string {
    const wrd = this.wallRenderData.get(wallId)
    if (!wrd) return '#ffffff'
    if (wrd.data.isCorrectPath) {
      return '#00ff88'
    }
    return '#ff4466'
  }

  update(deltaTime: number): void {
    const now = performance.now()
    if (this.state.isPunished && now >= this.state.punishEndTime) {
      this.state.isPunished = false
      this.restoreColors()
    }
    if (this.renderCallback) {
      this.renderCallback()
    }
  }

  setRenderCallback(cb: () => void): void {
    this.renderCallback = cb
  }

  initializeAllWalls(): void {
    for (const wrd of this.wallRenderData.values()) {
      this.updateWallAppearance(wrd)
    }
  }
}

export {
  MIN_REFLECTIVITY, MAX_REFLECTIVITY,
  MIN_TRANSPARENCY, MAX_TRANSPARENCY,
  MILESTONE_DISTANCE, REFLECTION_HUE_OFFSET
}
