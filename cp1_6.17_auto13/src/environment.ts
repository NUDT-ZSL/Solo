import * as THREE from 'three'

export interface ClimateParams {
  humidity: number
  temperature: number
  rainfall: number
}

export function updateSlope(
  geometry: THREE.PlaneGeometry,
  centerX: number,
  centerZ: number,
  radius: number,
  amplitude: number
): void {
  const positions = geometry.attributes.position
  const segmentsX = geometry.parameters.widthSegments
  const segmentsY = geometry.parameters.heightSegments
  const width = geometry.parameters.width
  const height = geometry.parameters.height

  for (let i = 0; i < positions.count; i++) {
    const ix = (i % (segmentsX + 1)) / segmentsX
    const iy = Math.floor(i / (segmentsX + 1)) / segmentsY

    const x = ix * width - width / 2
    const z = iy * height - height / 2

    const dx = x - centerX
    const dz = z - centerZ
    const distance = Math.sqrt(dx * dx + dz * dz)

    if (distance < radius) {
      const falloff = 1 - distance / radius
      const smoothFalloff = falloff * falloff * (3 - 2 * falloff)
      const currentY = positions.getY(i)
      const randomOffset = (Math.random() - 0.5) * 2 * amplitude
      const offset = randomOffset * smoothFalloff
      positions.setY(i, Math.max(-10, Math.min(15, currentY + offset)))
    }
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
}

export function updateClimate(
  slopeDegrees: number,
  elevation: number,
  globalHumidity: number,
  globalTemperature: number,
  globalRainfall: number
): ClimateParams {
  const normalizedElevation = Math.max(0, Math.min(1, (elevation + 10) / 25))
  const slopeFactor = slopeDegrees / 90

  const humidity = Math.max(0, Math.min(1,
    globalHumidity * (1 - slopeFactor * 0.5) * (0.7 + normalizedElevation * 0.3)
  ))

  const temperature = Math.max(0, Math.min(1,
    globalTemperature * (1 - normalizedElevation * 0.6) * (1 - slopeFactor * 0.2)
  ))

  const rainfall = Math.max(0, Math.min(1,
    globalRainfall * (1 - slopeFactor * 0.3) * (0.8 + normalizedElevation * 0.2)
  ))

  return { humidity, temperature, rainfall }
}

export function calculateSlope(
  geometry: THREE.PlaneGeometry,
  x: number,
  z: number
): number {
  const positions = geometry.attributes.position
  const segmentsX = geometry.parameters.widthSegments
  const segmentsY = geometry.parameters.heightSegments
  const width = geometry.parameters.width
  const height = geometry.parameters.height

  const fx = ((x + width / 2) / width) * segmentsX
  const fz = ((z + height / 2) / height) * segmentsY

  const ix = Math.max(0, Math.min(segmentsX, Math.floor(fx)))
  const iz = Math.max(0, Math.min(segmentsY, Math.floor(fz)))

  const getHeight = (col: number, row: number): number => {
    const idx = row * (segmentsX + 1) + col
    return positions.getY(idx)
  }

  const h00 = getHeight(ix, iz)
  const h10 = getHeight(Math.min(ix + 1, segmentsX), iz)
  const h01 = getHeight(ix, Math.min(iz + 1, segmentsY))

  const dx = width / segmentsX
  const dz = height / segmentsY

  const dhdx = (h10 - h00) / dx
  const dhdz = (h01 - h00) / dz

  const gradientMagnitude = Math.sqrt(dhdx * dhdx + dhdz * dhdz)
  const slopeRadians = Math.atan(gradientMagnitude)
  return slopeRadians * (180 / Math.PI)
}

export function getTerrainHeight(
  geometry: THREE.PlaneGeometry,
  x: number,
  z: number
): number {
  const positions = geometry.attributes.position
  const segmentsX = geometry.parameters.widthSegments
  const segmentsY = geometry.parameters.heightSegments
  const width = geometry.parameters.width
  const height = geometry.parameters.height

  const fx = ((x + width / 2) / width) * segmentsX
  const fz = ((z + height / 2) / height) * segmentsY

  const ix = Math.max(0, Math.min(segmentsX - 1, Math.floor(fx)))
  const iz = Math.max(0, Math.min(segmentsY - 1, Math.floor(fz)))

  const tx = fx - ix
  const tz = fz - iz

  const getIdx = (col: number, row: number): number => row * (segmentsX + 1) + col

  const h00 = positions.getY(getIdx(ix, iz))
  const h10 = positions.getY(getIdx(ix + 1, iz))
  const h01 = positions.getY(getIdx(ix, iz + 1))
  const h11 = positions.getY(getIdx(ix + 1, iz + 1))

  const h0 = h00 + (h10 - h00) * tx
  const h1 = h01 + (h11 - h01) * tx
  return h0 + (h1 - h0) * tz
}
