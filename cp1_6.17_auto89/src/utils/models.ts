import * as THREE from 'three'
import { ProductType, AccessoryType } from '@/store'

export function createBraceletBeadGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(0.12, 32, 32)
  return geometry
}

export function createBraceletBaseGeometry(): THREE.BufferGeometry {
  const tubeRadius = 0.08
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.4, 0, 0),
    new THREE.Vector3(1.3, 0, 0.5),
    new THREE.Vector3(1.0, 0, 0.9),
    new THREE.Vector3(0.5, 0, 1.2),
    new THREE.Vector3(0, 0, 1.3),
    new THREE.Vector3(-0.5, 0, 1.2),
    new THREE.Vector3(-1.0, 0, 0.9),
    new THREE.Vector3(-1.3, 0, 0.5),
    new THREE.Vector3(-1.4, 0, 0),
    new THREE.Vector3(-1.3, 0, -0.5),
    new THREE.Vector3(-1.0, 0, -0.9),
    new THREE.Vector3(-0.5, 0, -1.2),
    new THREE.Vector3(0, 0, -1.3),
    new THREE.Vector3(0.5, 0, -1.2),
    new THREE.Vector3(1.0, 0, -0.9),
    new THREE.Vector3(1.3, 0, -0.5),
    new THREE.Vector3(1.4, 0, 0),
  ], true)

  const geometry = new THREE.TubeGeometry(path, 128, tubeRadius, 16, true)
  return geometry
}

export function getBraceletBeadPositions(count: number = 20): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  const radius = 1.45
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    positions.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ))
  }
  return positions
}

export function createChainLinkGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const outerR = 0.12
  const innerR = 0.07

  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false)
  shape.holes.push(new THREE.Path().absarc(0, 0, innerR, 0, Math.PI * 2, true))

  const extrudeSettings = {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 3,
  }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geometry.center()
  return geometry
}

export function getNecklaceChainPositions(): { position: THREE.Vector3; rotation: THREE.Euler }[] {
  const result: { position: THREE.Vector3; rotation: THREE.Euler }[] = []
  const totalLinks = 40
  const radius = 1.8

  for (let i = 0; i < totalLinks; i++) {
    const angle = (i / totalLinks) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius * 0.6 - 0.2
    const z = 0

    const rotation = new THREE.Euler(
      0,
      0,
      angle + Math.PI / 2 + (i % 2 === 0 ? Math.PI / 2 : 0)
    )

    result.push({ position: new THREE.Vector3(x, y, z), rotation })
  }

  return result
}

export function createClaspGeometry(): THREE.BufferGeometry {
  const group = new THREE.BufferGeometry()

  const hookShape = new THREE.Shape()
  hookShape.moveTo(0, 0)
  hookShape.absarc(0.15, 0, 0.15, Math.PI, 0, false)
  hookShape.lineTo(0.15, -0.1)

  const hookGeo = new THREE.ExtrudeGeometry(hookShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  })
  hookGeo.translate(-0.08, 0, 0)

  const ringGeo = new THREE.TorusGeometry(0.08, 0.025, 12, 24)

  const merged = mergeGeometries([hookGeo, ringGeo.clone().translate(0.18, 0, 0)])
  return merged
}

export function createPendantGeometry(): THREE.BufferGeometry {
  const gemShape = new THREE.Shape()

  gemShape.moveTo(0, 0.8)
  gemShape.lineTo(0.6, 0.3)
  gemShape.lineTo(0.5, -0.5)
  gemShape.lineTo(0, -0.8)
  gemShape.lineTo(-0.5, -0.5)
  gemShape.lineTo(-0.6, 0.3)
  gemShape.lineTo(0, 0.8)

  const gemGeo = new THREE.ExtrudeGeometry(gemShape, {
    depth: 0.35,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 6,
  })
  gemGeo.center()

  const holeGeo = new THREE.TorusGeometry(0.12, 0.035, 12, 24)
  holeGeo.rotateX(Math.PI / 2)
  holeGeo.translate(0, 0.85, 0)

  const settingGeo = new THREE.SphereGeometry(0.04, 12, 12)
  const settingPositions = [
    [0, 0.7, 0.2], [0, 0.7, -0.2],
    [0.55, 0.2, 0.2], [0.55, 0.2, -0.2],
    [-0.55, 0.2, 0.2], [-0.55, 0.2, -0.2],
    [0.45, -0.45, 0.2], [0.45, -0.45, -0.2],
    [-0.45, -0.45, 0.2], [-0.45, -0.45, -0.2],
  ]

  const allGeos: THREE.BufferGeometry[] = [gemGeo, holeGeo]
  settingPositions.forEach(([x, y, z]) => {
    const g = settingGeo.clone()
    g.translate(x, y, z)
    allGeos.push(g)
  })

  return mergeGeometries(allGeos)
}

export function getAccessoryMountPoints(
  productType: ProductType,
  accessoryType: AccessoryType,
  index: number = 0
): THREE.Vector3 {
  switch (productType) {
    case 'bracelet': {
      const mountPoints: Record<AccessoryType, THREE.Vector3[]> = {
        bead: [
          new THREE.Vector3(0, 0.05, 1.45),
          new THREE.Vector3(0.7, 0.05, 1.2),
          new THREE.Vector3(-0.7, 0.05, 1.2),
        ],
        charm: [
          new THREE.Vector3(0, -0.15, 1.45),
        ],
        hook: [
          new THREE.Vector3(1.3, 0.05, 0.4),
        ],
      }
      const points = mountPoints[accessoryType]
      return points[index % points.length]
    }
    case 'necklace': {
      const mountPoints: Record<AccessoryType, THREE.Vector3[]> = {
        bead: [
          new THREE.Vector3(0, -0.4, 0.5),
          new THREE.Vector3(0.8, -0.2, 0.4),
          new THREE.Vector3(-0.8, -0.2, 0.4),
        ],
        charm: [
          new THREE.Vector3(0, -2.0, 0.1),
        ],
        hook: [
          new THREE.Vector3(1.5, 0.5, 0.3),
        ],
      }
      const points = mountPoints[accessoryType]
      return points[index % points.length]
    }
    case 'pendant': {
      const mountPoints: Record<AccessoryType, THREE.Vector3[]> = {
        bead: [
          new THREE.Vector3(0.6, 0.4, 0.15),
          new THREE.Vector3(-0.6, 0.4, 0.15),
          new THREE.Vector3(0, -0.7, 0.15),
        ],
        charm: [
          new THREE.Vector3(0, -1.0, 0),
        ],
        hook: [
          new THREE.Vector3(0, 1.1, 0),
        ],
      }
      const points = mountPoints[accessoryType]
      return points[index % points.length]
    }
    default:
      return new THREE.Vector3(0, 0, 0)
  }
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  let indexOffset = 0

  geometries.forEach((geo) => {
    const posAttr = geo.getAttribute('position')
    const normAttr = geo.getAttribute('normal')
    const uvAttr = geo.getAttribute('uv')
    const indexAttr = geo.getIndex()

    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i++) {
        indices.push(indexAttr.getX(i) + indexOffset)
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(i + indexOffset)
      }
    }

    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
      if (normAttr) {
        normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
      }
      if (uvAttr) {
        uvs.push(uvAttr.getX(i), uvAttr.getY(i))
      }
    }

    indexOffset += posAttr.count
  })

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length > 0) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  }
  if (uvs.length > 0) {
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  }
  merged.setIndex(indices)

  return merged
}
