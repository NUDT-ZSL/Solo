import * as THREE from 'three'
import type { GridCell } from '../types'

export const GRID_SIZE = 20
export const CELL_SIZE = 40 / GRID_SIZE

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  renderer: THREE.WebGLRenderer
  gridCells: GridCell[][]
  gridGroup: THREE.Group
  shipGroup: THREE.Group
  projectileGroup: THREE.Group
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0A0E27)
  scene.fog = new THREE.Fog(0x0A0E27, 20, 50)

  const aspect = container.clientWidth / container.clientHeight
  const viewSize = 25
  const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    1000
  )
  camera.up.set(0, 0, 1)
  camera.position.set(0, 35, 0.001)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0x4A5A8A, 0.6)
  scene.add(ambientLight)

  const nebulaLight1 = new THREE.PointLight(0x4FC3F7, 1.5, 30)
  nebulaLight1.position.set(-10, 8, -8)
  scene.add(nebulaLight1)

  const nebulaLight2 = new THREE.PointLight(0xCE93D8, 1.2, 28)
  nebulaLight2.position.set(10, 6, 8)
  scene.add(nebulaLight2)

  const nebulaLight3 = new THREE.PointLight(0xFF8A65, 0.8, 25)
  nebulaLight3.position.set(0, 10, -12)
  scene.add(nebulaLight3)

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.4)
  directionalLight.position.set(5, 20, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  const starField = createStarField()
  scene.add(starField)

  const gridGroup = new THREE.Group()
  const gridCells: GridCell[][] = []
  createGrid(gridGroup, gridCells)
  scene.add(gridGroup)

  const shipGroup = new THREE.Group()
  scene.add(shipGroup)

  const projectileGroup = new THREE.Group()
  scene.add(projectileGroup)

  return { scene, camera, renderer, gridCells, gridGroup, shipGroup, projectileGroup }
}

function createStarField(): THREE.Points {
  const starsGeometry = new THREE.BufferGeometry()
  const starCount = 800
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80
    positions[i * 3 + 1] = Math.random() * 40 - 5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80

    const colorChoice = Math.random()
    if (colorChoice < 0.33) {
      colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0
    } else if (colorChoice < 0.66) {
      colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0
    } else {
      colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.8
    }
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const starsMaterial = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  })

  return new THREE.Points(starsGeometry, starsMaterial)
}

function createGrid(group: THREE.Group, gridCells: GridCell[][]): void {
  const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2

  for (let i = 0; i < GRID_SIZE; i++) {
    gridCells[i] = []
    for (let j = 0; j < GRID_SIZE; j++) {
      const cellGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95)
      const cellMaterial = new THREE.MeshBasicMaterial({
        color: 0x1A1F3A,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
      const cell = new THREE.Mesh(cellGeometry, cellMaterial)
      cell.rotation.x = -Math.PI / 2
      cell.position.set(i * CELL_SIZE - offset, -0.01, j * CELL_SIZE - offset)
      group.add(cell)

      gridCells[i][j] = {
        x: i,
        z: j,
        occupied: false,
        highlighted: 'none',
        mesh: cell
      }
    }
  }

  const gridLinesMaterial = new THREE.LineBasicMaterial({
    color: 0x2A3B7C,
    transparent: true,
    opacity: 0.6
  })

  const linesPoints: THREE.Vector3[] = []
  const totalSize = GRID_SIZE * CELL_SIZE

  for (let i = 0; i <= GRID_SIZE; i++) {
    linesPoints.push(new THREE.Vector3(i * CELL_SIZE - offset - CELL_SIZE / 2, 0, -totalSize / 2))
    linesPoints.push(new THREE.Vector3(i * CELL_SIZE - offset - CELL_SIZE / 2, 0, totalSize / 2))
    linesPoints.push(new THREE.Vector3(-totalSize / 2, 0, i * CELL_SIZE - offset - CELL_SIZE / 2))
    linesPoints.push(new THREE.Vector3(totalSize / 2, 0, i * CELL_SIZE - offset - CELL_SIZE / 2))
  }

  const gridLinesGeometry = new THREE.BufferGeometry().setFromPoints(linesPoints)
  const gridLines = new THREE.LineSegments(gridLinesGeometry, gridLinesMaterial)
  group.add(gridLines)

  const playerZoneMaterial = new THREE.MeshBasicMaterial({
    color: 0x4FC3F7,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide
  })
  const playerZone = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE / 2),
    playerZoneMaterial
  )
  playerZone.rotation.x = -Math.PI / 2
  playerZone.position.set(0, -0.02, GRID_SIZE * CELL_SIZE / 4)
  group.add(playerZone)

  const enemyZoneMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF5252,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide
  })
  const enemyZone = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE / 2),
    enemyZoneMaterial
  )
  enemyZone.rotation.x = -Math.PI / 2
  enemyZone.position.set(0, -0.02, -GRID_SIZE * CELL_SIZE / 4)
  group.add(enemyZone)
}

export function gridToWorld(gridX: number, gridZ: number): THREE.Vector3 {
  const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2
  return new THREE.Vector3(gridX * CELL_SIZE - offset, 0, gridZ * CELL_SIZE - offset)
}

export function worldToGrid(worldX: number, worldZ: number): { x: number; z: number } {
  const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2
  return {
    x: Math.round((worldX + offset) / CELL_SIZE),
    z: Math.round((worldZ + offset) / CELL_SIZE)
  }
}

export function highlightCell(cell: GridCell, type: 'valid' | 'invalid' | 'none'): void {
  if (!cell.mesh) return
  const material = cell.mesh.material as THREE.MeshBasicMaterial
  cell.highlighted = type

  if (type === 'valid') {
    material.color.setHex(0x4CAF50)
    material.opacity = 0.4
  } else if (type === 'invalid') {
    material.color.setHex(0xF44336)
    material.opacity = 0.4
  } else {
    material.color.setHex(0x1A1F3A)
    material.opacity = 0.3
  }
}

export function clearAllHighlights(gridCells: GridCell[][]): void {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      highlightCell(gridCells[i][j], 'none')
    }
  }
}

export function handleResize(container: HTMLElement, ctx: SceneContext): void {
  const aspect = container.clientWidth / container.clientHeight
  const viewSize = 25
  ctx.camera.left = -viewSize * aspect
  ctx.camera.right = viewSize * aspect
  ctx.camera.top = viewSize
  ctx.camera.bottom = -viewSize
  ctx.camera.updateProjectionMatrix()
  ctx.renderer.setSize(container.clientWidth, container.clientHeight)
}
