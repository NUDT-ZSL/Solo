import * as THREE from 'three'
import { ProductType, AccessoryType } from '@/store'

export function createBraceletBaseGeometry(): THREE.BufferGeometry {
  const tubeRadius = 0.045
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

  const geometry = new THREE.TubeGeometry(path, 256, tubeRadius, 20, true)
  return geometry
}

export function createBraceletConnectorCords(): {
  geometry: THREE.BufferGeometry
  positions: THREE.Vector3[]
} {
  const beadCount = 22
  const radius = 1.45
  const beadRadius = 0.11
  const cordRadius = 0.025

  const beadPositions: THREE.Vector3[] = []
  const cordGeometries: THREE.BufferGeometry[] = []

  for (let i = 0; i < beadCount; i++) {
    const angle = (i / beadCount) * Math.PI * 2
    beadPositions.push(
      new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    )
  }

  for (let i = 0; i < beadCount; i++) {
    const start = beadPositions[i]
    const end = beadPositions[(i + 1) % beadCount]

    const gapStart = start.clone().add(
      end.clone().sub(start).normalize().multiplyScalar(beadRadius * 0.9)
    )
    const gapEnd = end.clone().add(
      start.clone().sub(end).normalize().multiplyScalar(beadRadius * 0.9)
    )

    const cordPath = new THREE.LineCurve3(gapStart, gapEnd)
    const cordGeo = new THREE.TubeGeometry(cordPath, 8, cordRadius, 8, false)
    cordGeometries.push(cordGeo)
  }

  return {
    geometry: mergeGeometries(cordGeometries),
    positions: beadPositions,
  }
}

export function getBraceletBeadPositions(): THREE.Vector3[] {
  const beadCount = 22
  const radius = 1.45
  const positions: THREE.Vector3[] = []
  for (let i = 0; i < beadCount; i++) {
    const angle = (i / beadCount) * Math.PI * 2
    positions.push(
      new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    )
  }
  return positions
}

export function createInterlockedChainLinks(): {
  geometry: THREE.BufferGeometry
  transforms: { position: THREE.Vector3; rotation: THREE.Euler }[]
} {
  const linkOuterR = 0.13
  const linkInnerR = 0.075
  const linkThickness = 0.05
  const totalLinks = 42
  const radius = 1.85

  const linkShape = new THREE.Shape()
  linkShape.absarc(0, 0, linkOuterR, 0, Math.PI * 2, false)
  linkShape.holes.push(
    new THREE.Path().absarc(0, 0, linkInnerR, 0, Math.PI * 2, true)
  )

  const linkGeometry = new THREE.ExtrudeGeometry(linkShape, {
    depth: linkThickness,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 4,
  })
  linkGeometry.center()

  const transforms: { position: THREE.Vector3; rotation: THREE.Euler }[] = []

  for (let i = 0; i < totalLinks; i++) {
    const t = i / totalLinks
    const angle = t * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius * 0.58 - 0.3

    const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle) * 0.58, 0).normalize()

    const zOffset = (i % 2 === 0 ? 1 : -1) * linkThickness * 0.8

    const position = new THREE.Vector3(x, y, zOffset)

    const rotation = new THREE.Euler()
    rotation.z = Math.atan2(tangent.y, tangent.x) + Math.PI / 2
    rotation.x = (i % 2 === 0 ? 1 : -1) * Math.PI / 3
    rotation.y = (i % 2 === 0 ? 1 : -1) * 0.15

    transforms.push({ position, rotation })
  }

  return { geometry: linkGeometry, transforms }
}

export function getNecklaceChainData(): {
  linkGeometry: THREE.BufferGeometry
  transforms: { position: THREE.Vector3; rotation: THREE.Euler }[]
} {
  return createInterlockedChainLinks()
}

export function createClaspGeometry(): THREE.BufferGeometry {
  const hookShape = new THREE.Shape()
  hookShape.moveTo(0, 0)
  hookShape.absarc(0.15, 0, 0.15, Math.PI * 0.9, Math.PI * 0.05, false)
  hookShape.lineTo(0.13, -0.08)

  const hookGeo = new THREE.ExtrudeGeometry(hookShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
  })
  hookGeo.center()
  hookGeo.translate(-0.02, 0, 0)

  const ringCurve = new THREE.EllipseCurve(0, 0, 0.09, 0.09, 0, Math.PI * 2, false, 0)
  const ringPoints = ringCurve.getPoints(32)
  const ringShape = new THREE.Shape(ringPoints)
  ringShape.holes.push(
    new THREE.Path(
      new THREE.EllipseCurve(0, 0, 0.055, 0.055, 0, Math.PI * 2, false, 0).getPoints(32)
    )
  )
  const ringGeo = new THREE.ExtrudeGeometry(ringShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 3,
  })
  ringGeo.center()
  ringGeo.translate(0.2, 0, 0)

  return mergeGeometries([hookGeo, ringGeo])
}

export function createDetailedPendantGeometry(): {
  bodyGeometry: THREE.BufferGeometry
  holeGeometry: THREE.BufferGeometry
  settingPositions: THREE.Vector3[]
  accentPositions: THREE.Vector3[]
} {
  const gemShape = new THREE.Shape()
  gemShape.moveTo(0, 0.85)
  gemShape.bezierCurveTo(0.15, 0.7, 0.55, 0.35, 0.65, 0.25)
  gemShape.bezierCurveTo(0.7, 0.05, 0.58, -0.35, 0.52, -0.52)
  gemShape.bezierCurveTo(0.4, -0.72, 0.15, -0.85, 0, -0.88)
  gemShape.bezierCurveTo(-0.15, -0.85, -0.4, -0.72, -0.52, -0.52)
  gemShape.bezierCurveTo(-0.58, -0.35, -0.7, 0.05, -0.65, 0.25)
  gemShape.bezierCurveTo(-0.55, 0.35, -0.15, 0.7, 0, 0.85)

  const bodyGeo = new THREE.ExtrudeGeometry(gemShape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 10,
    curveSegments: 48,
  })
  bodyGeo.center()

  const holeOuter = new THREE.TorusGeometry(0.15, 0.055, 24, 48)
  holeOuter.rotateX(Math.PI / 2)
  holeOuter.translate(0, 0.9, 0)

  const holeInner = new THREE.TorusGeometry(0.105, 0.03, 18, 36)
  holeInner.rotateX(Math.PI / 2)
  holeInner.translate(0, 0.9, 0)

  const holeGeo = mergeGeometries([holeOuter, holeInner])

  const settingPositions: THREE.Vector3[] = [
    new THREE.Vector3(0, 0.72, 0.2),
    new THREE.Vector3(0, 0.72, -0.2),
    new THREE.Vector3(0.58, 0.18, 0.2),
    new THREE.Vector3(0.58, 0.18, -0.2),
    new THREE.Vector3(-0.58, 0.18, 0.2),
    new THREE.Vector3(-0.58, 0.18, -0.2),
    new THREE.Vector3(0.46, -0.48, 0.2),
    new THREE.Vector3(0.46, -0.48, -0.2),
    new THREE.Vector3(-0.46, -0.48, 0.2),
    new THREE.Vector3(-0.46, -0.48, -0.2),
    new THREE.Vector3(0, -0.76, 0.18),
    new THREE.Vector3(0, -0.76, -0.18),
  ]

  const accentPositions: THREE.Vector3[] = [
    new THREE.Vector3(0.48, 0.5, 0.18),
    new THREE.Vector3(-0.48, 0.5, 0.18),
    new THREE.Vector3(0.3, -0.1, 0.22),
    new THREE.Vector3(-0.3, -0.1, 0.22),
    new THREE.Vector3(0.48, 0.5, -0.18),
    new THREE.Vector3(-0.48, 0.5, -0.18),
  ]

  return { bodyGeometry: bodyGeo, holeGeometry: holeGeo, settingPositions, accentPositions }
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
          new THREE.Vector3(0.0, 0.0, 1.55),
          new THREE.Vector3(0.75, 0.0, 1.3),
          new THREE.Vector3(-0.75, 0.0, 1.3),
          new THREE.Vector3(1.3, 0.0, 0.7),
          new THREE.Vector3(-1.3, 0.0, 0.7),
        ],
        charm: [
          new THREE.Vector3(0.0, -0.2, 1.5),
        ],
        hook: [
          new THREE.Vector3(1.45, 0.0, 0.15),
        ],
      }
      const points = mountPoints[accessoryType]
      return points[index % points.length].clone()
    }
    case 'necklace': {
      const mountPoints: Record<AccessoryType, THREE.Vector3[]> = {
        bead: [
          new THREE.Vector3(0.0, -0.55, 0.45),
          new THREE.Vector3(0.85, -0.35, 0.4),
          new THREE.Vector3(-0.85, -0.35, 0.4),
          new THREE.Vector3(1.45, 0.05, 0.35),
          new THREE.Vector3(-1.45, 0.05, 0.35),
        ],
        charm: [
          new THREE.Vector3(0.0, -2.15, 0.15),
        ],
        hook: [
          new THREE.Vector3(1.6, 0.65, 0.2),
        ],
      }
      const points = mountPoints[accessoryType]
      return points[index % points.length].clone()
    }
    case 'pendant': {
      const mountPoints: Record<AccessoryType, THREE.Vector3[]> = {
        bead: [
          new THREE.Vector3(0.65, 0.45, 0.18),
          new THREE.Vector3(-0.65, 0.45, 0.18),
          new THREE.Vector3(0.0, -0.75, 0.18),
          new THREE.Vector3(0.55, -0.2, 0.22),
          new THREE.Vector3(-0.55, -0.2, 0.22),
        ],
        charm: [
          new THREE.Vector3(0.0, -1.15, 0.0),
        ],
        hook: [
          new THREE.Vector3(0.0, 1.25, 0.0),
        ],
      }
      const points = mountPoints[accessoryType]
      return points[index % points.length].clone()
    }
    default:
      return new THREE.Vector3(0, 0, 0)
  }
}

export function mergeGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  let indexOffset = 0

  geometries.forEach((geo) => {
    if (!geo.getAttribute('position')) return

    geo.computeVertexNormals()
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
      } else {
        uvs.push(0, 0)
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
