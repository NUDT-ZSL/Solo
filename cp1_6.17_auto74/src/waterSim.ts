import * as THREE from 'three'
import type { RootSystem, RootNode } from './rootSystem'
import { updateNodeWaterContent } from './rootSystem'

export interface WaterMolecule {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  active: boolean
}

export interface WaterSimulation {
  molecules: WaterMolecule[]
  waterGroup: THREE.Group
  absorptionCount: { wheat: number; corn: number }
  lastAbsorptionTime: number
  timeScale: number
  totalWaterAbsorbed: { wheat: number; corn: number }
  cumulativeWaterRemoved: number
  drynessFront: number
}

const WATER_COLOR = 0x00BFFF
const MOLECULE_RADIUS = 0.05
const GRAVITY_SPEED = 0.5
const MAX_MOLECULES = 500
const INITIAL_MOLECULES = 200
const ABSORPTION_RADIUS = 0.3
const GRID_CELL_SIZE = 0.8

const WET_SOIL_COLOR = new THREE.Color(0x4E342E)
const DRY_SOIL_COLOR = new THREE.Color(0xA1887F)

class SpatialHashGrid<T extends { position: THREE.Vector3 }> {
  private cellSize: number
  private cells: Map<string, T[]>

  constructor(cellSize: number = GRID_CELL_SIZE) {
    this.cellSize = cellSize
    this.cells = new Map()
  }

  clear(): void {
    this.cells.clear()
  }

  private getCellKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.cellSize)}_${Math.floor(y / this.cellSize)}_${Math.floor(z / this.cellSize)}`
  }

  insert(item: T): void {
    const key = this.getCellKey(item.position.x, item.position.y, item.position.z)
    let cell = this.cells.get(key)
    if (!cell) {
      cell = []
      this.cells.set(key, cell)
    }
    cell.push(item)
  }

  query(position: THREE.Vector3, radius: number): T[] {
    const results: T[] = []
    const minX = Math.floor((position.x - radius) / this.cellSize)
    const maxX = Math.floor((position.x + radius) / this.cellSize)
    const minY = Math.floor((position.y - radius) / this.cellSize)
    const maxY = Math.floor((position.y + radius) / this.cellSize)
    const minZ = Math.floor((position.z - radius) / this.cellSize)
    const maxZ = Math.floor((position.z + radius) / this.cellSize)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = `${x}_${y}_${z}`
          const cell = this.cells.get(key)
          if (cell) {
            for (const item of cell) {
              if (item.position.distanceTo(position) <= radius) {
                results.push(item)
              }
            }
          }
        }
      }
    }

    return results
  }
}

interface RootNodeWrapper {
  position: THREE.Vector3
  node: RootNode
}

export function createWaterSimulation(
  scene: THREE.Scene,
  containerSize: { width: number; height: number; depth: number }
): WaterSimulation {
  const waterGroup = new THREE.Group()
  const molecules: WaterMolecule[] = []

  const geometry = new THREE.SphereGeometry(MOLECULE_RADIUS, 8, 8)
  const material = new THREE.MeshBasicMaterial({
    color: WATER_COLOR,
    transparent: true,
    opacity: 0.5
  })

  for (let i = 0; i < INITIAL_MOLECULES; i++) {
    const mesh = new THREE.Mesh(geometry, material.clone())
    const pos = randomPositionInContainer(containerSize)
    mesh.position.copy(pos)
    waterGroup.add(mesh)

    molecules.push({
      mesh,
      velocity: new THREE.Vector3(0, -GRAVITY_SPEED, 0),
      active: true
    })
  }

  scene.add(waterGroup)

  return {
    molecules,
    waterGroup,
    absorptionCount: { wheat: 0, corn: 0 },
    lastAbsorptionTime: performance.now(),
    timeScale: 1,
    totalWaterAbsorbed: { wheat: 0, corn: 0 },
    cumulativeWaterRemoved: 0,
    drynessFront: 0
  }
}

function randomPositionInContainer(
  containerSize: { width: number; height: number; depth: number }
): THREE.Vector3 {
  return new THREE.Vector3(
    (Math.random() - 0.5) * (containerSize.width - 1),
    -Math.random() * (containerSize.height - 1),
    (Math.random() - 0.5) * (containerSize.depth - 1)
  )
}

function spawnMolecule(
  sim: WaterSimulation,
  containerSize: { width: number; height: number; depth: number }
): void {
  if (sim.molecules.filter((m) => m.active).length >= MAX_MOLECULES) return

  let inactiveMolecule = sim.molecules.find((m) => !m.active)

  if (!inactiveMolecule) {
    const geometry = new THREE.SphereGeometry(MOLECULE_RADIUS, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: WATER_COLOR,
      transparent: true,
      opacity: 0.5
    })
    const mesh = new THREE.Mesh(geometry, material)
    sim.waterGroup.add(mesh)

    inactiveMolecule = {
      mesh,
      velocity: new THREE.Vector3(0, -GRAVITY_SPEED, 0),
      active: false
    }
    sim.molecules.push(inactiveMolecule)
  }

  const pos = new THREE.Vector3(
    (Math.random() - 0.5) * (containerSize.width - 1),
    -0.1,
    (Math.random() - 0.5) * (containerSize.depth - 1)
  )
  inactiveMolecule.mesh.position.copy(pos)
  inactiveMolecule.active = true
  inactiveMolecule.mesh.visible = true
}

export function updateWater(
  sim: WaterSimulation,
  rootSystem: RootSystem,
  deltaTime: number,
  containerSize: { width: number; height: number; depth: number },
  soilMaterial: THREE.MeshStandardMaterial
): void {
  const dt = deltaTime * sim.timeScale
  const spawnRate = 30 * sim.timeScale
  const spawnChance = spawnRate * deltaTime

  if (Math.random() < spawnChance) {
    spawnMolecule(sim, containerSize)
  }

  const rootWrappers: RootNodeWrapper[] = []
  rootSystem.nodes.forEach((node) => {
    rootWrappers.push({ position: node.mesh.position, node })
  })

  const rootGrid = new SpatialHashGrid<RootNodeWrapper>()
  for (const wrapper of rootWrappers) {
    rootGrid.insert(wrapper)
  }

  let wheatAbsorbed = 0
  let cornAbsorbed = 0
  let waterRemoved = 0

  const activeMolecules = sim.molecules.filter((m) => m.active)

  for (const molecule of activeMolecules) {
    molecule.mesh.position.y += molecule.velocity.y * dt

    molecule.mesh.position.x += (Math.random() - 0.5) * 0.05 * dt
    molecule.mesh.position.z += (Math.random() - 0.5) * 0.05 * dt

    if (molecule.mesh.position.y < -containerSize.height + 0.1) {
      molecule.mesh.position.y = -0.1
      molecule.mesh.position.x = (Math.random() - 0.5) * (containerSize.width - 1)
      molecule.mesh.position.z = (Math.random() - 0.5) * (containerSize.depth - 1)
    }

    const nearbyRoots = rootGrid.query(molecule.mesh.position, ABSORPTION_RADIUS)
    for (const wrapper of nearbyRoots) {
      const distance = molecule.mesh.position.distanceTo(wrapper.node.mesh.position)
      if (distance < ABSORPTION_RADIUS) {
        molecule.active = false
        molecule.mesh.visible = false
        waterRemoved++

        updateNodeWaterContent(wrapper.node, 1)

        if (wrapper.node.plantType === 'wheat') {
          wheatAbsorbed++
          sim.totalWaterAbsorbed.wheat++
        } else {
          cornAbsorbed++
          sim.totalWaterAbsorbed.corn++
        }
        break
      }
    }
  }

  rootSystem.wheatWaterRate = wheatAbsorbed / deltaTime
  rootSystem.cornWaterRate = cornAbsorbed / deltaTime

  rootSystem.wheatTotalWater = sim.totalWaterAbsorbed.wheat
  rootSystem.cornTotalWater = sim.totalWaterAbsorbed.corn

  sim.cumulativeWaterRemoved += waterRemoved

  updateSoilDryness(sim, soilMaterial, containerSize)
}

function updateSoilDryness(
  sim: WaterSimulation,
  soilMaterial: THREE.MeshStandardMaterial,
  containerSize: { width: number; height: number; depth: number }
): void {
  const totalAbsorbed = sim.totalWaterAbsorbed.wheat + sim.totalWaterAbsorbed.corn
  const maxWater = INITIAL_MOLECULES * 3
  const overallDryness = Math.min(1, totalAbsorbed / maxWater)

  const timeFactor = 0.0001 * sim.timeScale
  sim.drynessFront = Math.min(1, sim.drynessFront + timeFactor * (0.5 + overallDryness))

  const targetDryness = Math.max(overallDryness, sim.drynessFront)
  const currentDryness = (soilMaterial.color.r - WET_SOIL_COLOR.r) / (DRY_SOIL_COLOR.r - WET_SOIL_COLOR.r)
  const smoothDryness = currentDryness + (targetDryness - currentDryness) * 0.05

  const finalDryness = Math.max(0, Math.min(1, smoothDryness))
  const currentColor = WET_SOIL_COLOR.clone().lerp(DRY_SOIL_COLOR, finalDryness)
  soilMaterial.color.copy(currentColor)
}

export function setTimeScale(sim: WaterSimulation, scale: number): void {
  sim.timeScale = scale
}
