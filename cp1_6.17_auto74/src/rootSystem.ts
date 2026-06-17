import * as THREE from 'three'

export interface RootNode {
  id: string
  position: THREE.Vector3
  children: RootNode[]
  parent: RootNode | null
  depth: number
  mesh: THREE.Mesh
  connections: THREE.Mesh[]
  plantType: 'wheat' | 'corn'
  waterContent: number
  originalColor: THREE.Color
  capillaryCount: number
  highlighted: boolean
}

export interface RootSystem {
  nodes: Map<string, RootNode>
  rootGroup: THREE.Group
  wheatTotalWater: number
  cornTotalWater: number
  wheatWaterRate: number
  cornWaterRate: number
}

const NODE_RADIUS = 0.15
const CONNECTION_RADIUS = 0.05
const WHEAT_COLOR = 0x8B5E3C
const CORN_COLOR = 0x2E8B57

export function addRoots(
  scene: THREE.Scene,
  containerSize: { width: number; height: number; depth: number }
): RootSystem {
  const rootGroup = new THREE.Group()
  const nodes = new Map<string, RootNode>()

  const wheatNodes = generateWheatRoots(containerSize)
  wheatNodes.forEach((node) => nodes.set(node.id, node))

  const cornNodes = generateCornRoots(containerSize)
  cornNodes.forEach((node) => nodes.set(node.id, node))

  wheatNodes.forEach((node) => {
    rootGroup.add(node.mesh)
    node.connections.forEach((conn) => rootGroup.add(conn))
  })
  cornNodes.forEach((node) => {
    rootGroup.add(node.mesh)
    node.connections.forEach((conn) => rootGroup.add(conn))
  })

  scene.add(rootGroup)

  return {
    nodes,
    rootGroup,
    wheatTotalWater: 0,
    cornTotalWater: 0,
    wheatWaterRate: 0,
    cornWaterRate: 0
  }
}

function generateWheatRoots(
  containerSize: { width: number; height: number; depth: number }
): RootNode[] {
  const nodes: RootNode[] = []
  const baseX = -3
  const baseZ = 0
  const surfaceY = 0
  const maxDepth = 6

  const rootPositions: { pos: THREE.Vector3; depth: number; parent: RootNode | null }[] = []

  const mainRootCount = 3
  for (let i = 0; i < mainRootCount; i++) {
    const angle = (i / mainRootCount) * Math.PI * 2
    const startX = baseX + Math.cos(angle) * 0.3
    const startZ = baseZ + Math.sin(angle) * 0.3

    const startPos = new THREE.Vector3(startX, surfaceY, startZ)
    rootPositions.push({ pos: startPos, depth: 0, parent: null })

    const segments = 12
    let currentPos = startPos.clone()
    let parentNode: RootNode | null = null

    for (let j = 1; j <= segments; j++) {
      const t = j / segments
      const depthY = -t * maxDepth
      const wobbleX = Math.sin(t * Math.PI * 2 + i) * 0.3 * t
      const wobbleZ = Math.cos(t * Math.PI * 1.5 + i * 0.7) * 0.2 * t

      const newPos = new THREE.Vector3(
        baseX + wobbleX + (startX - baseX) * (1 - t * 0.5),
        depthY,
        baseZ + wobbleZ + (startZ - baseZ) * (1 - t * 0.5)
      )

      const nodeId = `wheat_main_${i}_${j}`
      const node = createRootNode(nodeId, newPos, 'wheat', parentNode, j)
      nodes.push(node)

      if (parentNode) {
        const connection = createConnection(parentNode.position, newPos, WHEAT_COLOR)
        parentNode.connections.push(connection)
      }

      if (j >= 3 && j <= 10 && j % 2 === 0) {
        const lateralCount = 2 + Math.floor(Math.random() * 2)
        for (let k = 0; k < lateralCount; k++) {
          const lateralAngle = Math.random() * Math.PI * 2
          const lateralLength = 0.8 + Math.random() * 1.5
          const lateralSegments = 3 + Math.floor(Math.random() * 3)

          let latCurrentPos = newPos.clone()
          let latParent = node

          for (let l = 1; l <= lateralSegments; l++) {
            const latT = l / lateralSegments
            const latDist = lateralLength * latT
            const latDepthOffset = -latDist * 0.3

            const latX = newPos.x + Math.cos(lateralAngle) * latDist
            const latZ = newPos.z + Math.sin(lateralAngle) * latDist
            const latY = newPos.y + latDepthOffset

            const clampedX = Math.max(-containerSize.width / 2 + 0.5, Math.min(containerSize.width / 2 - 0.5, latX))
            const clampedZ = Math.max(-containerSize.depth / 2 + 0.5, Math.min(containerSize.depth / 2 - 0.5, latZ))
            const clampedY = Math.max(-containerSize.height + 0.5, Math.min(0, latY))

            const latNodePos = new THREE.Vector3(clampedX, clampedY, clampedZ)
            const latNodeId = `wheat_lat_${i}_${j}_${k}_${l}`
            const latNode = createRootNode(latNodeId, latNodePos, 'wheat', latParent, j + l)
            nodes.push(latNode)

            const latConnection = createConnection(latParent.position, latNodePos, WHEAT_COLOR)
            latParent.connections.push(latConnection)

            latParent = latNode
          }
        }
      }

      parentNode = node
      currentPos = newPos
    }
  }

  return nodes
}

function generateCornRoots(
  containerSize: { width: number; height: number; depth: number }
): RootNode[] {
  const nodes: RootNode[] = []
  const baseX = 3
  const baseZ = 0
  const surfaceY = 0
  const maxDepth = 3

  const mainRootCount = 5
  for (let i = 0; i < mainRootCount; i++) {
    const angle = (i / mainRootCount) * Math.PI * 2 + Math.PI / mainRootCount
    const startX = baseX + Math.cos(angle) * 0.4
    const startZ = baseZ + Math.sin(angle) * 0.4

    const startPos = new THREE.Vector3(startX, surfaceY, startZ)

    const segments = 8
    let currentPos = startPos.clone()
    let parentNode: RootNode | null = null

    for (let j = 1; j <= segments; j++) {
      const t = j / segments
      const depthY = -t * maxDepth

      const horizontalSpread = t * 2.5
      const newX = baseX + Math.cos(angle) * horizontalSpread
      const newZ = baseZ + Math.sin(angle) * horizontalSpread
      const wobbleY = Math.sin(t * Math.PI * 3 + i) * 0.15

      const clampedX = Math.max(-containerSize.width / 2 + 0.5, Math.min(containerSize.width / 2 - 0.5, newX))
      const clampedZ = Math.max(-containerSize.depth / 2 + 0.5, Math.min(containerSize.depth / 2 - 0.5, newZ))
      const clampedY = Math.max(-containerSize.height + 0.5, Math.min(0, depthY + wobbleY))

      const newPos = new THREE.Vector3(clampedX, clampedY, clampedZ)

      const nodeId = `corn_main_${i}_${j}`
      const node = createRootNode(nodeId, newPos, 'corn', parentNode, j)
      nodes.push(node)

      if (parentNode) {
        const connection = createConnection(parentNode.position, newPos, CORN_COLOR)
        parentNode.connections.push(connection)
      }

      if (j >= 2 && j <= 6) {
        const fibrousCount = 3 + Math.floor(Math.random() * 3)
        for (let k = 0; k < fibrousCount; k++) {
          const fibAngle = angle + (Math.random() - 0.5) * Math.PI * 0.8
          const fibLength = 0.3 + Math.random() * 0.8
          const fibY = newPos.y - 0.1 - Math.random() * 0.3

          const fibX = newPos.x + Math.cos(fibAngle) * fibLength
          const fibZ = newPos.z + Math.sin(fibAngle) * fibLength

          const clampedFibX = Math.max(-containerSize.width / 2 + 0.3, Math.min(containerSize.width / 2 - 0.3, fibX))
          const clampedFibZ = Math.max(-containerSize.depth / 2 + 0.3, Math.min(containerSize.depth / 2 - 0.3, fibZ))
          const clampedFibY = Math.max(-containerSize.height + 0.3, Math.min(0, fibY))

          const fibPos = new THREE.Vector3(clampedFibX, clampedFibY, clampedFibZ)
          const fibNodeId = `corn_fib_${i}_${j}_${k}`
          const fibNode = createRootNode(fibNodeId, fibPos, 'corn', node, j + 1)
          nodes.push(fibNode)

          const fibConnection = createConnection(node.position, fibPos, CORN_COLOR)
          node.connections.push(fibConnection)
        }
      }

      parentNode = node
      currentPos = newPos
    }
  }

  return nodes
}

function createRootNode(
  id: string,
  position: THREE.Vector3,
  plantType: 'wheat' | 'corn',
  parent: RootNode | null,
  depth: number
): RootNode {
  const color = plantType === 'wheat' ? WHEAT_COLOR : CORN_COLOR
  const geometry = new THREE.SphereGeometry(NODE_RADIUS, 16, 16)
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.1,
    emissive: color,
    emissiveIntensity: 0.1
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(position)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const capillaryCount = 3 + Math.floor(Math.random() * 8)

  const node: RootNode = {
    id,
    position: position.clone(),
    children: [],
    parent,
    depth,
    mesh,
    connections: [],
    plantType,
    waterContent: Math.random() * 20 + 10,
    originalColor: new THREE.Color(color),
    capillaryCount,
    highlighted: false
  }

  if (parent) {
    parent.children.push(node)
  }

  mesh.userData.node = node

  return node
}

function createConnection(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()

  const geometry = new THREE.CylinderGeometry(CONNECTION_RADIUS, CONNECTION_RADIUS, length, 8)
  geometry.translate(0, length / 2, 0)
  geometry.rotateX(Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.05
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(start)
  mesh.lookAt(end)
  mesh.castShadow = true

  return mesh
}

export function highlightRoot(node: RootNode, scene: THREE.Scene): void {
  const nodesToHighlight: RootNode[] = []

  const collectNodes = (n: RootNode, level: number) => {
    if (level > 2) return
    nodesToHighlight.push(n)
    n.children.forEach((child) => collectNodes(child, level + 1))
  }

  collectNodes(node, 0)

  nodesToHighlight.forEach((n) => {
    const material = n.mesh.material as THREE.MeshStandardMaterial
    material.emissiveIntensity = 0.5
    n.highlighted = true
  })

  setTimeout(() => {
    nodesToHighlight.forEach((n) => {
      const material = n.mesh.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.1
      n.highlighted = false
    })
  }, 1500)
}

export function updateNodeWaterContent(node: RootNode, amount: number): void {
  node.waterContent = Math.min(100, node.waterContent + amount)

  const material = node.mesh.material as THREE.MeshStandardMaterial
  const saturationBoost = 1 + (node.waterContent / 100) * 0.1
  const newColor = node.originalColor.clone()
  newColor.multiplyScalar(saturationBoost)
  material.color.copy(newColor)
  material.emissive.copy(newColor)
}

export function getAllRootMeshes(rootSystem: RootSystem): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  rootSystem.nodes.forEach((node) => {
    meshes.push(node.mesh)
  })
  return meshes
}
