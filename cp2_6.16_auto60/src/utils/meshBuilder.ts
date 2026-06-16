import * as THREE from 'three'
import { WalletStyle, StitchType } from '@/types'
import { getLeatherTexture } from './textureGenerator'

interface WalletDimensions {
  width: number
  height: number
  depth: number
  radius: number
}

const styleDimensions: Record<WalletStyle, WalletDimensions> = {
  [WalletStyle.SHORT_FOLD]: { width: 0.18, height: 0.10, depth: 0.04, radius: 0.008 },
  [WalletStyle.LONG_ZIPPER]: { width: 0.20, height: 0.11, depth: 0.025, radius: 0.006 },
  [WalletStyle.COIN_POUCH]: { width: 0.12, height: 0.09, depth: 0.03, radius: 0.010 },
}

function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const w = width / 2 - radius
  const h = height / 2 - radius

  shape.moveTo(-w, -h + radius)
  shape.lineTo(-w, h - radius)
  shape.quadraticCurveTo(-w, h, -w + radius, h)
  shape.lineTo(w - radius, h)
  shape.quadraticCurveTo(w, h, w, h - radius)
  shape.lineTo(w, -h + radius)
  shape.quadraticCurveTo(w, -h, w - radius, -h)
  shape.lineTo(-w + radius, -h)
  shape.quadraticCurveTo(-w, -h, -w, -h + radius)

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.5,
    bevelSegments: 3,
    curveSegments: 12,
  }

  return new THREE.ExtrudeGeometry(shape, extrudeSettings).translate(0, 0, -depth / 2)
}

function createStitchMesh(
  points: THREE.Vector3[],
  stitchType: StitchType,
): THREE.Group {
  const group = new THREE.Group()

  const stitchConfigs = {
    single: { radius: 0.0008, gap: 0.006, angle: 0, rows: 1, offset: 0 },
    double: { radius: 0.0006, gap: 0.005, angle: 0, rows: 2, offset: 0.002 },
    cross: { radius: 0.0005, gap: 0.008, angle: Math.PI / 4, rows: 2, offset: 0.003 },
  }

  const config = stitchConfigs[stitchType]

  for (let row = 0; row < config.rows; row++) {
    const rowOffset = (row - (config.rows - 1) / 2) * config.offset

    for (let i = 0; i < points.length - 1; i += Math.max(1, Math.floor(config.gap / 2))) {
      const p1 = points[i]
      const p2 = points[Math.min(i + 1, points.length - 1)]

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize()
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(rowOffset)
      mid.add(perp)

      const cylinderGeo = new THREE.CylinderGeometry(
        config.radius,
        config.radius,
        config.gap * 0.7,
        8,
      )
      const stitchMat = new THREE.MeshStandardMaterial({
        color: 0xf5deb3,
        roughness: 0.6,
        metalness: 0.1,
      })
      const stitch = new THREE.Mesh(cylinderGeo, stitchMat)

      stitch.position.copy(mid)

      const axis = new THREE.Vector3(0, 1, 0)
      const angle = Math.atan2(dir.x, dir.z) + config.angle * (row % 2 === 0 ? 1 : -1)
      stitch.quaternion.setFromAxisAngle(axis, angle)

      group.add(stitch)
    }
  }

  return group
}

function getEdgePoints(
  dims: WalletDimensions,
  style: WalletStyle,
): THREE.Vector3[][] {
  const w = dims.width / 2
  const h = dims.height / 2
  const d = dims.depth / 2
  const r = dims.radius
  const stitchInset = 0.003

  const createCornerArc = (
    cx: number,
    cy: number,
    cz: number,
    startAngle: number,
    endAngle: number,
    inset: number,
  ): THREE.Vector3[] => {
    const points: THREE.Vector3[] = []
    const segments = 6
    const insetR = r - inset
    for (let i = 0; i <= segments; i++) {
      const t = startAngle + (endAngle - startAngle) * (i / segments)
      const dirX = Math.cos(t)
      const dirY = Math.sin(t)
      points.push(
        new THREE.Vector3(
          cx + dirX * (r - inset) - dirX * inset,
          cy + dirY * (r - inset) - dirY * inset,
          cz,
        ),
      )
    }
    return points
  }

  const createEdge = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    z: number,
    inset: number,
  ): THREE.Vector3[] => {
    const points: THREE.Vector3[] = []
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    const segments = Math.max(2, Math.floor(dist / 0.004))
    const dirX = (x2 - x1) / dist
    const dirY = (y2 - y1) / dist
    const normX = -dirY
    const normY = dirX

    const insetX = normX * inset
    const insetY = normY * inset

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      points.push(
        new THREE.Vector3(
          x1 + (x2 - x1) * t + insetX,
          y1 + (y2 - y1) * t + insetY,
          z,
        ),
      )
    }
    return points
  }

  const edges: THREE.Vector3[][] = []

  const frontZ = d - 0.0005
  const backZ = -d + 0.0005

  const frontEdges = [
    ...createCornerArc(w - r, h - r, frontZ, 0, Math.PI / 2, stitchInset),
    ...createEdge(w - r, h, -w + r, h, frontZ, stitchInset).slice(1),
    ...createCornerArc(-w + r, h - r, frontZ, Math.PI / 2, Math.PI, stitchInset).slice(1),
    ...createEdge(-w, h - r, -w, -h + r, frontZ, stitchInset).slice(1),
    ...createCornerArc(-w + r, -h + r, frontZ, Math.PI, Math.PI * 1.5, stitchInset).slice(1),
    ...createEdge(-w + r, -h, w - r, -h, frontZ, stitchInset).slice(1),
    ...createCornerArc(w - r, -h + r, frontZ, Math.PI * 1.5, Math.PI * 2, stitchInset).slice(1),
    ...createEdge(w, -h + r, w, h - r, frontZ, stitchInset).slice(1),
  ]
  edges.push(frontEdges)

  const backEdges = [
    ...createCornerArc(w - r, h - r, backZ, 0, Math.PI / 2, -stitchInset),
    ...createEdge(w - r, h, -w + r, h, backZ, -stitchInset).slice(1),
    ...createCornerArc(-w + r, h - r, backZ, Math.PI / 2, Math.PI, -stitchInset).slice(1),
    ...createEdge(-w, h - r, -w, -h + r, backZ, -stitchInset).slice(1),
    ...createCornerArc(-w + r, -h + r, backZ, Math.PI, Math.PI * 1.5, -stitchInset).slice(1),
    ...createEdge(-w + r, -h, w - r, -h, backZ, -stitchInset).slice(1),
    ...createCornerArc(w - r, -h + r, backZ, Math.PI * 1.5, Math.PI * 2, -stitchInset).slice(1),
    ...createEdge(w, -h + r, w, h - r, backZ, -stitchInset).slice(1),
  ]
  edges.push(backEdges)

  if (style === WalletStyle.SHORT_FOLD) {
    const foldLine = createEdge(0, h - r, 0, -h + r, frontZ + 0.0005, 0)
    edges.push(foldLine)
  }

  return edges
}

function addStyleDetails(
  group: THREE.Group,
  style: WalletStyle,
  dims: WalletDimensions,
  material: THREE.MeshStandardMaterial,
): void {
  const w = dims.width / 2
  const h = dims.height / 2
  const d = dims.depth / 2

  if (style === WalletStyle.LONG_ZIPPER) {
    const zipperGeo = new THREE.BoxGeometry(dims.width - 0.01, 0.003, 0.002)
    const zipperMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    })
    const zipper = new THREE.Mesh(zipperGeo, zipperMat)
    zipper.position.set(0, h - 0.004, d + 0.001)
    group.add(zipper)

    const pullGeo = new THREE.BoxGeometry(0.006, 0.010, 0.003)
    const pull = new THREE.Mesh(pullGeo, zipperMat)
    pull.position.set(0.020, h - 0.004, d + 0.002)
    group.add(pull)
  }

  if (style === WalletStyle.COIN_POUCH) {
    const openingShape = new THREE.Shape()
    openingShape.absarc(0, 0, 0.025, 0, Math.PI, true)
    openingShape.lineTo(-0.025, 0)

    const openingGeo = new THREE.ExtrudeGeometry(openingShape, {
      depth: 0.002,
      bevelEnabled: false,
    })
    const openingMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
    })
    const opening = new THREE.Mesh(openingGeo, openingMat)
    opening.position.set(0, h - 0.030, d + 0.001)
    group.add(opening)

    const buttonGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 16)
    const buttonMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.1,
    })
    const button = new THREE.Mesh(buttonGeo, buttonMat)
    button.rotation.x = Math.PI / 2
    button.position.set(0, h - 0.055, d + 0.002)
    group.add(button)
  }
}

export function buildWalletModel(
  style: WalletStyle,
  color: string,
  texture: string,
  stitchType: StitchType,
): THREE.Group {
  const group = new THREE.Group()
  const dims = styleDimensions[style]

  const geometry = createRoundedBoxGeometry(dims.width, dims.height, dims.depth, dims.radius)

  const leatherTexture = getLeatherTexture(texture)

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    map: leatherTexture,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.DoubleSide,
  })

  const body = new THREE.Mesh(geometry, material)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  addStyleDetails(group, style, dims, material)

  const edgePoints = getEdgePoints(dims, style)
  edgePoints.forEach((points) => {
    const stitches = createStitchMesh(points, stitchType)
    group.add(stitches)
  })

  return group
}
