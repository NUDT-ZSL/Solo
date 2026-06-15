import * as THREE from 'three'

export interface BuildingData {
  mesh: THREE.Mesh
  floors: number
  rotation: number
}

const BUILDING_COLORS = [
  0xe0e0e0,
  0xd0d0d0,
  0xc5c5c5,
  0xbdbdbd,
  0xb0b0b0
]

const FLOOR_HEIGHT = 3
const BUILDING_WIDTH = 15
const BUILDING_DEPTH = 15

function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = []
  const usedPositions: { x: number; z: number }[] = []

  for (let i = 0; i < 10; i++) {
    let x: number, z: number
    let attempts = 0
    do {
      x = (Math.random() - 0.5) * 400
      z = (Math.random() - 0.5) * 400
      attempts++
    } while (
      attempts < 100 &&
      usedPositions.some(
        (pos) => Math.hypot(pos.x - x, pos.z - z) < BUILDING_WIDTH * 2
      )
    )

    usedPositions.push({ x, z })

    const floors = Math.floor(Math.random() * 26) + 5
    const height = floors * FLOOR_HEIGHT
    const rotation = Math.random() * Math.PI / 2

    const geometry = new THREE.BoxGeometry(BUILDING_WIDTH, height, BUILDING_DEPTH)
    const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)]
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, height / 2, z)
    mesh.rotation.y = rotation
    mesh.castShadow = true
    mesh.receiveShadow = true

    mesh.userData = {
      floors,
      rotation,
      baseHeight: height
    }

    buildings.push({
      mesh,
      floors,
      rotation
    })
  }

  return buildings
}

function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(600, 600)
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
    metalness: 0.1
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  return ground
}

function createGridHelper(): THREE.GridHelper {
  const grid = new THREE.GridHelper(600, 60, 0x444444, 0x333333)
  grid.position.y = 0.01
  grid.material.transparent = true
  grid.material.opacity = 0.4
  return grid
}

export const buildingsModule = {
  getBuildings(): BuildingData[] {
    return generateBuildings()
  },
  createGround,
  createGridHelper,
  FLOOR_HEIGHT,
  BUILDING_WIDTH,
  BUILDING_DEPTH
}

export default buildingsModule
