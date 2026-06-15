import * as THREE from 'three'
import type { CrystalData } from './CrystalCluster'

export interface SparkBall {
  mesh: THREE.Mesh
  baseOpacity: number
}

export interface SparkBand {
  id: number
  balls: SparkBall[]
  startPoint: THREE.Vector3
  endPoint: THREE.Vector3
  life: number
  maxLife: number
  pulseFrequency: number
  startTime: number
}

let sparkBandIdCounter = 0

function createSparkBallMaterial(opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: opacity,
    depthWrite: false,
  })
}

export function createSparkBand(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  scene: THREE.Scene
): SparkBand {
  const balls: SparkBall[] = []
  const ballCount = 5
  const ballGeometry = new THREE.SphereGeometry(0.05, 8, 8)

  for (let i = 0; i < ballCount; i++) {
    const t = i / (ballCount - 1)
    const baseOpacity = 0.3 + Math.random() * 0.6

    const material = createSparkBallMaterial(baseOpacity)
    const mesh = new THREE.Mesh(ballGeometry.clone(), material)

    const position = new THREE.Vector3().lerpVectors(startPoint, endPoint, t)
    position.x += (Math.random() - 0.5) * 0.1
    position.y += (Math.random() - 0.5) * 0.1
    position.z += (Math.random() - 0.5) * 0.1

    mesh.position.copy(position)
    scene.add(mesh)

    balls.push({ mesh, baseOpacity })
  }

  return {
    id: sparkBandIdCounter++,
    balls,
    startPoint: startPoint.clone(),
    endPoint: endPoint.clone(),
    life: 1.5,
    maxLife: 1.5,
    pulseFrequency: 2,
    startTime: performance.now() / 1000,
  }
}

function getRandomEdgePoint(crystal: CrystalData): THREE.Vector3 {
  const position = crystal.position.clone()
  const height = crystal.currentHeight
  const radius = crystal.radius

  const edgeType = Math.floor(Math.random() * 3)

  if (edgeType === 0) {
    position.y += height * (0.3 + Math.random() * 0.6)
    const angle = Math.random() * Math.PI * 2
    position.x += Math.cos(angle) * radius * 0.7
    position.z += Math.sin(angle) * radius * 0.7
  } else if (edgeType === 1) {
    position.y += height * (0.7 + Math.random() * 0.3)
    const angle = Math.random() * Math.PI * 2
    position.x += Math.cos(angle) * radius * 0.4
    position.z += Math.sin(angle) * radius * 0.4
  } else {
    position.y += height * 0.5
    const angle = Math.random() * Math.PI * 2
    position.x += Math.cos(angle) * radius * 0.9
    position.z += Math.sin(angle) * radius * 0.9
  }

  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(crystal.rotation)
  const relativePos = position.clone().sub(crystal.position)
  relativePos.applyMatrix4(rotationMatrix)
  return crystal.position.clone().add(relativePos)
}

export function findSparkPair(
  crystals: CrystalData[],
  maxDistance: number = 1.5
): { start: THREE.Vector3; end: THREE.Vector3 } | null {
  const activeCrystals = crystals.filter(c => !c.isExploding)
  if (activeCrystals.length < 2) return null

  for (let attempt = 0; attempt < 100; attempt++) {
    const idx1 = Math.floor(Math.random() * activeCrystals.length)
    let idx2 = Math.floor(Math.random() * activeCrystals.length)
    while (idx2 === idx1 && activeCrystals.length > 1) {
      idx2 = Math.floor(Math.random() * activeCrystals.length)
    }

    const crystal1 = activeCrystals[idx1]
    const crystal2 = activeCrystals[idx2]

    const dist = crystal1.position.distanceTo(crystal2.position)
    if (dist < maxDistance + 1) {
      const point1 = getRandomEdgePoint(crystal1)
      const point2 = getRandomEdgePoint(crystal2)

      const edgeDist = point1.distanceTo(point2)
      if (edgeDist < maxDistance * 2 && edgeDist > 0.2) {
        return { start: point1, end: point2 }
      }
    }
  }

  return null
}

export function updateSparkBands(
  sparkBands: SparkBand[],
  deltaTime: number,
  scene: THREE.Scene
): SparkBand[] {
  const activeBands: SparkBand[] = []

  for (const band of sparkBands) {
    band.life -= deltaTime

    if (band.life <= 0) {
      for (const ball of band.balls) {
        scene.remove(ball.mesh)
        ball.mesh.geometry.dispose()
        ;(ball.mesh.material as THREE.Material).dispose()
      }
      continue
    }

    const lifeRatio = band.life / band.maxLife
    const currentTime = performance.now() / 1000
    const pulsePhase = (currentTime - band.startTime) * band.pulseFrequency * Math.PI * 2

    for (let i = 0; i < band.balls.length; i++) {
      const ball = band.balls[i]
      const pulseOffset = (i / band.balls.length) * Math.PI * 2
      const pulseValue = (Math.sin(pulsePhase + pulseOffset) + 1) / 2
      const opacity = ball.baseOpacity * (0.3 + pulseValue * 0.7) * lifeRatio

      ;(ball.mesh.material as THREE.MeshBasicMaterial).opacity = opacity

      const t = i / (band.balls.length - 1)
      const newPos = new THREE.Vector3().lerpVectors(band.startPoint, band.endPoint, t)
      ball.mesh.position.x = newPos.x + (Math.random() - 0.5) * 0.02
      ball.mesh.position.y = newPos.y + (Math.random() - 0.5) * 0.02
      ball.mesh.position.z = newPos.z + (Math.random() - 0.5) * 0.02
    }

    activeBands.push(band)
  }

  return activeBands
}
