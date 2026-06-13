import * as THREE from 'three'

const GRID_SIZE = 20
const CELL_SIZE = 4
const BAR_WIDTH = 3.6
const COLOR_LOW = new THREE.Color(0x22c55e)
const COLOR_MID = new THREE.Color(0xfde047)
const COLOR_HIGH = new THREE.Color(0xef4444)

export function getNoiseColor(value: number): THREE.Color {
  const clamped = Math.max(0, Math.min(100, value))
  const t = clamped / 100
  const color = new THREE.Color()
  if (t <= 0.5) {
    color.copy(COLOR_LOW).lerp(COLOR_MID, t * 2)
  } else {
    color.copy(COLOR_MID).lerp(COLOR_HIGH, (t - 0.5) * 2)
  }
  return color
}

export function createHeatmapMeshes(scene: THREE.Scene): THREE.InstancedMesh {
  const geometry = new THREE.BoxGeometry(BAR_WIDTH, 1, BAR_WIDTH)
  geometry.translate(0, 0.5, 0)
  const material = new THREE.MeshPhongMaterial({
    transparent: true,
    opacity: 0.6,
    shininess: 80,
  })
  const count = GRID_SIZE * GRID_SIZE
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const colorArray = new Float32Array(count * 3)
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3)
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
  scene.add(mesh)
  return mesh
}

export function updateHeatmap(
  mesh: THREE.InstancedMesh,
  data: number[][],
  breathFactor: number = 1.0
): void {
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let idx = 0
  const offset = -((GRID_SIZE * CELL_SIZE) / 2) + CELL_SIZE / 2
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const value = data[row]?.[col] ?? 0
      const height = Math.max(0.01, value / 10)
      dummy.position.set(
        offset + col * CELL_SIZE,
        0,
        offset + row * CELL_SIZE
      )
      dummy.scale.set(1, height * breathFactor, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(idx, dummy.matrix)
      const noiseColor = getNoiseColor(value)
      const dimmed = noiseColor.clone().multiplyScalar(breathFactor)
      mesh.instanceColor.setXYZ(idx, dimmed.r, dimmed.g, dimmed.b)
      idx++
    }
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate = true
}

export function createGroundPlane(scene: THREE.Scene): void {
  const totalSize = GRID_SIZE * CELL_SIZE
  const groundGeo = new THREE.PlaneGeometry(totalSize, totalSize)
  const groundMat = new THREE.MeshPhongMaterial({
    color: 0xe5e7eb,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  scene.add(ground)
}

export function createGridLines(scene: THREE.Scene): void {
  const totalSize = GRID_SIZE * CELL_SIZE
  const halfSize = totalSize / 2
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = -halfSize + i * CELL_SIZE
    points.push(new THREE.Vector3(pos, 0, -halfSize))
    points.push(new THREE.Vector3(pos, 0, halfSize))
    points.push(new THREE.Vector3(-halfSize, 0, pos))
    points.push(new THREE.Vector3(halfSize, 0, pos))
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x9ca3af,
    transparent: true,
    opacity: 0.4,
  })
  const gridLines = new THREE.LineSegments(geometry, material)
  gridLines.position.y = 0.01
  scene.add(gridLines)
}
