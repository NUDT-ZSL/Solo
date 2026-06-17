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
}

const WATER_COLOR = 0x00BFFF
const MOLECULE_RADIUS = 0.05
const GRAVITY_SPEED = 0.5
const MAX_MOLECULES = 500
const INITIAL_MOLECULES = 200
const ABSORPTION_RADIUS = 0.25

const WET_SOIL_COLOR = new THREE.Color(0x4E342E)
const DRY_SOIL_COLOR = new THREE.Color(0xA1887F)

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
    totalWaterAbsorbed: { wheat: 0, corn: 0 }
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

  const rootNodes = Array.from(rootSystem.nodes.values())

  let wheatAbsorbed = 0
  let cornAbsorbed = 0

  sim.molecules.forEach((molecule) => {
    if (!molecule.active) return

    molecule.mesh.position.y += molecule.velocity.y * dt

    molecule.mesh.position.x += (Math.random() - 0.5) * 0.05 * dt
    molecule.mesh.position.z += (Math.random() - 0.5) * 0.05 * dt

    if (molecule.mesh.position.y < -containerSize.height + 0.1) {
      molecule.mesh.position.y = -0.1
      molecule.mesh.position.x = (Math.random() - 0.5) * (containerSize.width - 1)
      molecule.mesh.position.z = (Math.random() - 0.5) * (containerSize.depth - 1)
    }

    for (const node of rootNodes) {
      const distance = molecule.mesh.position.distanceTo(node.mesh.position)
      if (distance < ABSORPTION_RADIUS) {
        molecule.active = false
        molecule.mesh.visible = false

        updateNodeWaterContent(node, 1)

        if (node.plantType === 'wheat') {
          wheatAbsorbed++
          sim.totalWaterAbsorbed.wheat++
        } else {
          cornAbsorbed++
          sim.totalWaterAbsorbed.corn++
        }
        break
      }
    }
  })

  rootSystem.wheatWaterRate = wheatAbsorbed / deltaTime
  rootSystem.cornWaterRate = cornAbsorbed / deltaTime

  rootSystem.wheatTotalWater = sim.totalWaterAbsorbed.wheat
  rootSystem.cornTotalWater = sim.totalWaterAbsorbed.corn

  updateSoilDryness(sim, soilMaterial, containerSize)
}

function updateSoilDryness(
  sim: WaterSimulation,
  soilMaterial: THREE.MeshStandardMaterial,
  containerSize: { width: number; height: number; depth: number }
): void {
  const totalAbsorbed = sim.totalWaterAbsorbed.wheat + sim.totalWaterAbsorbed.corn
  const maxWater = INITIAL_MOLECULES * 2
  const dryness = Math.min(1, totalAbsorbed / maxWater)

  const currentColor = WET_SOIL_COLOR.clone().lerp(DRY_SOIL_COLOR, dryness)
  soilMaterial.color.copy(currentColor)
}

export function setTimeScale(sim: WaterSimulation, scale: number): void {
  sim.timeScale = scale
}
