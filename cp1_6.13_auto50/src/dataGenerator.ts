import * as THREE from 'three'

export interface NodeData {
  id: number
  name: string
  position: THREE.Vector3
  color: string
  ip: string
  upload: number
  download: number
  connectionCount: number
}

export interface LinkData {
  source: number
  target: number
  traffic: number
}

export interface ParticleData {
  id: number
  sourceId: number
  targetId: number
  progress: number
  speed: number
  controlPoint: THREE.Vector3
  startTime: number
}

export interface TrafficStats {
  activeConnections: number
  totalTraffic: number
  topPairs: Array<{ source: string; target: string; traffic: number }>
}

const NODE_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#34d399', '#f472b6', '#fb923c']
const NODE_COUNT = 10
const SPHERE_RADIUS = 8

function randomIP(): string {
  return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
}

function generateNodePositions(): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = phi * i
    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY
    positions.push(new THREE.Vector3(x * SPHERE_RADIUS, y * SPHERE_RADIUS, z * SPHERE_RADIUS))
  }
  return positions
}

export function generateInitialData(): { nodes: NodeData[]; links: LinkData[] } {
  const positions = generateNodePositions()
  const nodes: NodeData[] = []

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      id: i,
      name: `Node-${String(i + 1).padStart(2, '0')}`,
      position: positions[i],
      color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
      ip: randomIP(),
      upload: Math.random() * 500 + 50,
      download: Math.random() * 500 + 50,
      connectionCount: Math.floor(Math.random() * 5) + 2
    })
  }

  const links: LinkData[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      if (Math.random() < 0.45) {
        links.push({
          source: i,
          target: j,
          traffic: Math.random() * 100 + 10
        })
      }
    }
  }

  return { nodes, links }
}

export function updateNodeTraffic(nodes: NodeData[]): NodeData[] {
  return nodes.map((node) => ({
    ...node,
    upload: Math.max(10, node.upload + (Math.random() - 0.5) * 100),
    download: Math.max(10, node.download + (Math.random() - 0.5) * 100),
    connectionCount: Math.max(1, Math.min(10, node.connectionCount + Math.floor((Math.random() - 0.5) * 2)))
  }))
}

export function updateLinkTraffic(links: LinkData[]): LinkData[] {
  return links.map((link) => ({
    ...link,
    traffic: Math.max(5, link.traffic + (Math.random() - 0.5) * 30)
  }))
}

export function generateTrafficStats(nodes: NodeData[], links: LinkData[]): TrafficStats {
  const activeConnections = links.length
  const totalTraffic = links.reduce((sum, link) => sum + link.traffic, 0)

  const sortedLinks = [...links].sort((a, b) => b.traffic - a.traffic).slice(0, 3)
  const topPairs = sortedLinks.map((link) => ({
    source: nodes[link.source].name,
    target: nodes[link.target].name,
    traffic: link.traffic
  }))

  return {
    activeConnections,
    totalTraffic,
    topPairs
  }
}

let particleIdCounter = 0

export function generateParticle(links: LinkData[]): ParticleData | null {
  if (links.length === 0) return null
  const link = links[Math.floor(Math.random() * links.length)]
  const sourceNode = generateNodePositions()[link.source]
  const targetNode = generateNodePositions()[link.target]

  const mid = new THREE.Vector3().addVectors(sourceNode, targetNode).multiplyScalar(0.5)
  const offset = new THREE.Vector3(
    (Math.random() - 0.5) * 3,
    (Math.random() - 0.5) * 3,
    (Math.random() - 0.5) * 3
  )
  const controlPoint = mid.add(offset)

  return {
    id: particleIdCounter++,
    sourceId: link.source,
    targetId: link.target,
    progress: 0,
    speed: 0.3 + Math.random() * 0.2,
    controlPoint,
    startTime: performance.now()
  }
}
