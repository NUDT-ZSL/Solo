export interface DataPoint {
  latitude: number
  longitude: number
  anomaly: number
}

const START_YEAR = 1880
const END_YEAR = 2023
const LON_COUNT = 24
const LAT_COUNT = 12

const lons: number[] = []
const lats: number[] = []

for (let i = 0; i < LON_COUNT; i++) {
  lons.push(-180 + (360 / LON_COUNT) * i + 360 / LON_COUNT / 2)
}
for (let i = 0; i < LAT_COUNT; i++) {
  lats.push(-90 + (180 / LAT_COUNT) * i + 180 / LAT_COUNT / 2)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function generateAnomaly(year: number, lat: number, lon: number): number {
  const t = (year - START_YEAR) / (END_YEAR - START_YEAR)
  const baseAnomaly = -0.2 + t * 1.4
  const absLat = Math.abs(lat) / 90
  const arcticAmplification = 1 + absLat * absLat * 1.8
  const latFactor = arcticAmplification
  const seed = year * 10000 + (lat + 90) * 100 + (lon + 180)
  const noise = (seededRandom(seed) - 0.5) * 0.5
  return baseAnomaly * latFactor + noise
}

const dataCache: Map<number, DataPoint[]> = new Map()

function generateYearData(year: number): DataPoint[] {
  const points: DataPoint[] = []
  for (const lat of lats) {
    for (const lon of lons) {
      points.push({
        latitude: lat,
        longitude: lon,
        anomaly: generateAnomaly(year, lat, lon),
      })
    }
  }
  return points
}

export function getDataForYear(year: number): DataPoint[] {
  const clampedYear = Math.max(START_YEAR, Math.min(END_YEAR, Math.round(year)))
  if (dataCache.has(clampedYear)) {
    return dataCache.get(clampedYear)!
  }
  const data = generateYearData(clampedYear)
  dataCache.set(clampedYear, data)
  return data
}

export function initializeData(): void {
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    dataCache.set(year, generateYearData(year))
  }
}

export { LON_COUNT, LAT_COUNT, lons, lats, START_YEAR, END_YEAR }
