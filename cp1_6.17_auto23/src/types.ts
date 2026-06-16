export interface Star {
  id: number
  x: number
  y: number
  z: number
  color: string
  magnitude: number
  name?: string
}

export interface Constellation {
  id: string
  name: string
  nameEn: string
  description: string
  mythology: string
  mainStars: string[]
  starIndices: number[]
  lines: number[][]
}

export interface StarSystemOptions {
  starCount?: number
  radiusMin?: number
  radiusMax?: number
  minMagnitude?: number
  maxMagnitude?: number
}

export interface StarsDataFile {
  stars: Star[]
}

export interface ConstellationsDataFile {
  constellations: Constellation[]
}
