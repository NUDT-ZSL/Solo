/**
 * ============================================================
 *  buildings.ts - 建筑生成模块
 * ============================================================
 *
 * 【职责】
 *    负责随机生成10栋城市建筑、地面和网格辅助线
 *
 * 【被调用关系】
 *    main.ts → buildingsModule.getBuildings()         获取建筑数据
 *    main.ts → buildingsModule.createGround()         创建地面
 *    main.ts → buildingsModule.createGridHelper()     创建网格辅助线
 *
 * 【数据输出】
 *    → BuildingData[]: 包含10栋建筑的网格、楼层数、旋转角度
 *
 * 【建筑参数】
 *    - 数量：10栋
 *    - 位置：原点周围 -200~200 范围（XZ平面）
 *    - 高度：5~30层，每层3米 → 15m ~ 90m
 *    - 尺寸：宽15m × 深15m
 *    - 朝向：0~90度随机旋转（Y轴）
 *    - 颜色：从5种预设灰色系中随机选取
 * ============================================================
 */

import * as THREE from 'three'

export interface BuildingData {
  mesh: THREE.Mesh
  floors: number
  rotation: number
}

/**
 * 5种预设建筑配色方案（浅灰色系，有细微差异）
 * 每栋建筑从这个数组中随机选取，而非随机RGB值
 */
const BUILDING_COLORS: number[] = [
  0xe8e8e8,
  0xdcdcdc,
  0xd0d0d0,
  0xc8c8c8,
  0xc0c0c0
]

/**
 * 建筑物理参数常量定义
 */
const FLOOR_HEIGHT: number = 3
const BUILDING_WIDTH: number = 15
const BUILDING_DEPTH: number = 15
const MIN_FLOORS: number = 5
const MAX_FLOORS: number = 30
const BUILDING_COUNT: number = 10
const SPAWN_RANGE: number = 200
const MIN_SPACING: number = BUILDING_WIDTH * 2.5

/**
 * 生成随机建筑群
 *
 * 【计算逻辑】
 *  1. 楼层数: Math.floor(random * 26) + 5 → 范围 5~30
 *  2. 建筑高度: 楼层数 × FLOOR_HEIGHT(3m) → 范围 15m ~ 90m
 *  3. 几何尺寸: BoxGeometry(15, 高度, 15)
 *  4. Y轴位置: 高度 / 2（确保建筑底面位于 y=0 平面）
 *  5. 旋转角度: 0 ~ PI/2 随机（0~90度）
 *  6. 颜色: 从 BUILDING_COLORS 数组中随机索引选取
 */
function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = []
  const usedPositions: { x: number; z: number }[] = []

  for (let i = 0; i < BUILDING_COUNT; i++) {
    let x: number, z: number
    let attempts: number = 0

    do {
      x = (Math.random() - 0.5) * 2 * SPAWN_RANGE
      z = (Math.random() - 0.5) * 2 * SPAWN_RANGE
      attempts++
    } while (
      attempts < 100 &&
      usedPositions.some(
        (pos) => Math.hypot(pos.x - x, pos.z - z) < MIN_SPACING
      )
    )

    usedPositions.push({ x, z })

    const floors: number = Math.floor(Math.random() * (MAX_FLOORS - MIN_FLOORS + 1)) + MIN_FLOORS
    const height: number = floors * FLOOR_HEIGHT
    const rotation: number = Math.random() * Math.PI / 2

    const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(
      BUILDING_WIDTH,
      height,
      BUILDING_DEPTH
    )

    const colorIndex: number = Math.floor(Math.random() * BUILDING_COLORS.length)
    const buildingColor: number = BUILDING_COLORS[colorIndex]

    const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
      color: buildingColor,
      roughness: 0.75,
      metalness: 0.15
    })

    const mesh: THREE.Mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, height / 2, z)
    mesh.rotation.y = rotation
    mesh.castShadow = true
    mesh.receiveShadow = true

    mesh.userData = {
      floors: floors,
      rotation: rotation,
      baseHeight: height,
      width: BUILDING_WIDTH,
      depth: BUILDING_DEPTH,
      positionX: x,
      positionZ: z,
      colorIndex: colorIndex
    }

    buildings.push({
      mesh: mesh,
      floors: floors,
      rotation: rotation
    })
  }

  return buildings
}

/**
 * 创建接收阴影的地面（y=0平面）
 */
function createGround(): THREE.Mesh {
  const geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(800, 800)
  const material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e1e1e,
    roughness: 0.92,
    metalness: 0.05
  })
  const ground: THREE.Mesh = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  return ground
}

/**
 * 创建半透明的网格辅助线，用于空间定位参考
 */
function createGridHelper(): THREE.GridHelper {
  const grid: THREE.GridHelper = new THREE.GridHelper(600, 60, 0x555555, 0x444444)
  grid.position.y = 0.01
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.35
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
