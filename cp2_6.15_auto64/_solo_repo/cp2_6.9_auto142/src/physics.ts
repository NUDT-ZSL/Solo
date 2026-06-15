import * as THREE from 'three'

export interface EraConfig {
  absorption: number
  seatMaterial: string
  label: string
}

export const ERA_CONFIGS: Record<number, EraConfig> = {
  [-300]: { absorption: 0.10, seatMaterial: 'bare', label: '公元前300年' },
  [100]:  { absorption: 0.25, seatMaterial: 'wood', label: '公元100年' },
  [500]:  { absorption: 0.45, seatMaterial: 'fabric', label: '公元500年' }
}

export interface RaySegment {
  start: THREE.Vector3
  end: THREE.Vector3
  color: THREE.Color
}

export interface AcousticRay {
  segments: RaySegment[]
  alive: boolean
  reflections: number
  energy: number
  travelTime: number
  position: THREE.Vector3
  direction: THREE.Vector3
  baseHue: number
  brightness: number
}

export interface SeatEnergySample {
  row: number
  position: THREE.Vector3
  totalEnergy: number
  rayCount: number
}

const RAY_COUNT = 60
const MAX_REFLECTIONS = 5
const MIN_ENERGY = 0.05
const STEP_DISTANCE = 0.2
const ENERGY_ATTENUATION_PER_REFLECTION = 0.20
const SPEED_OF_SOUND = 343
const WORLD_SCALE = 1

export class AcousticPhysics {
  private rays: AcousticRay[] = []
  private collidables: THREE.Object3D[] = []
  private raycaster: THREE.Raycaster
  private absorptionCoefficient: number = 0.10
  private seatSamples: SeatEnergySample[] = []
  private maxRows: number = 15
  private theaterRadius: number = 12
  private stagePosition: THREE.Vector3 = new THREE.Vector3(0, 0.3, 0)

  constructor() {
    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 100
  }

  public setCollidables(objects: THREE.Object3D[]): void {
    this.collidables = objects
  }

  public setAbsorption(absorption: number): void {
    this.absorptionCoefficient = absorption
  }

  public setTheaterParams(radius: number, rows: number): void {
    this.theaterRadius = radius
    this.maxRows = rows
    this.initSeatSamples()
  }

  public getSeatSamples(): SeatEnergySample[] {
    return this.seatSamples
  }

  public initSeatSamples(): void {
    this.seatSamples = []
    for (let r = 0; r < this.maxRows; r++) {
      const rowRadius = 4 + (r * (this.theaterRadius - 4) / this.maxRows)
      const y = 0.6 + r * 0.4
      const pos = new THREE.Vector3(0, y, -rowRadius)
      this.seatSamples.push({
        row: r,
        position: pos,
        totalEnergy: 0,
        rayCount: 0
      })
    }
  }

  public resetSeatEnergies(): void {
    for (const s of this.seatSamples) {
      s.totalEnergy = 0
      s.rayCount = 0
    }
  }

  public spawnRays(): AcousticRay[] {
    this.rays = []
    this.resetSeatEnergies()

    for (let i = 0; i < RAY_COUNT; i++) {
      const hue = (i / RAY_COUNT) * 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.6 + Math.PI * 0.1
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).normalize()

      this.rays.push({
        segments: [{
          start: this.stagePosition.clone(),
          end: this.stagePosition.clone(),
          color: new THREE.Color().setHSL(hue / 360, 1.0, 0.55)
        }],
        alive: true,
        reflections: 0,
        energy: 1.0,
        travelTime: 0,
        position: this.stagePosition.clone(),
        direction: dir,
        baseHue: hue,
        brightness: 1.0
      })
    }
    return this.rays
  }

  public getRays(): AcousticRay[] {
    return this.rays
  }

  public step(): boolean {
    let anyAlive = false
    for (const ray of this.rays) {
      if (!ray.alive) continue
      anyAlive = true
      this.propagateRay(ray)
    }
    return anyAlive
  }

  private propagateRay(ray: AcousticRay): void {
    const maxSteps = 5
    for (let s = 0; s < maxSteps && ray.alive; s++) {
      this.raycaster.set(ray.position.clone(), ray.direction.clone())
      const intersects = this.raycaster.intersectObjects(this.collidables, true)

      let moveDist = STEP_DISTANCE
      let hit: THREE.Intersection | null = null

      if (intersects.length > 0 && intersects[0].distance < STEP_DISTANCE) {
        hit = intersects[0]
        moveDist = Math.max(0.001, hit.distance - 0.001)
      }

      const newPos = ray.position.clone().add(
        ray.direction.clone().multiplyScalar(moveDist)
      )

      const lastSeg = ray.segments[ray.segments.length - 1]
      lastSeg.end.copy(newPos)

      ray.travelTime += moveDist / (SPEED_OF_SOUND * WORLD_SCALE * 0.01)
      ray.position.copy(newPos)

      this.accumulateSeatEnergy(ray)

      if (hit && hit.face) {
        this.reflectRay(ray, hit)
      }

      if (ray.energy < MIN_ENERGY || ray.reflections > MAX_REFLECTIONS) {
        ray.alive = false
      }

      if (ray.position.length() > 80) {
        ray.alive = false
      }
    }
  }

  private reflectRay(ray: AcousticRay, hit: THREE.Intersection): void {
    if (!hit.face) return

    const normal = hit.face.normal.clone()
    normal.transformDirection(hit.object.matrixWorld)
    normal.normalize()

    const dot = ray.direction.dot(normal)
    if (dot > 0) normal.negate()

    const reflected = ray.direction.clone()
    reflected.sub(normal.clone().multiplyScalar(2 * dot)).normalize()
    ray.direction.copy(reflected)

    ray.reflections++
    ray.brightness *= 0.85
    ray.energy *= (1 - ENERGY_ATTENUATION_PER_REFLECTION)
    ray.energy *= (1 - this.absorptionCoefficient)

    ray.position.add(ray.direction.clone().multiplyScalar(0.01))

    const newColor = new THREE.Color().setHSL(
      ray.baseHue / 360,
      1.0,
      0.55 * ray.brightness
    )
    ray.segments.push({
      start: ray.position.clone(),
      end: ray.position.clone(),
      color: newColor
    })
  }

  private accumulateSeatEnergy(ray: AcousticRay): void {
    for (const sample of this.seatSamples) {
      const dx = ray.position.x - sample.position.x
      const dy = ray.position.y - sample.position.y
      const dz = ray.position.z - sample.position.z
      const dist2 = dx * dx + dy * dy + dz * dz
      if (dist2 < 0.6) {
        sample.totalEnergy += ray.energy * Math.max(0, 1 - dist2 / 0.6)
        sample.rayCount++
      }
    }
  }

  public computeRT60(): number {
    const times: number[] = []
    for (const ray of this.rays) {
      if (ray.segments.length > 0 || ray.travelTime > 0) {
        if (ray.energy < MIN_ENERGY || !ray.alive) {
          times.push(ray.travelTime)
        }
      }
    }
    if (times.length === 0) {
      const avg = this.rays.reduce((s, r) => s + r.travelTime, 0) / Math.max(1, this.rays.length)
      return avg * 4
    }
    times.sort((a, b) => a - b)
    const median = times[Math.floor(times.length / 2)]
    return median * 4
  }

  public clear(): void {
    this.rays = []
  }
}
