export interface BasePairData {
  base1: {
    char: string
    x: number
    y: number
    z: number
    color: string
  }
  base2: {
    char: string
    x: number
    y: number
    z: number
    color: string
  }
  z: number
}

export interface ParsedDNAData {
  basePairs: BasePairData[]
  validBases: number
  invalidChars: string[]
}

const BASE_COLORS: Record<string, string> = {
  A: '#ff4444',
  T: '#44aaff',
  C: '#44ff44',
  G: '#ffaa44',
  U: '#44aaff',
}

const COMPLEMENTARY_BASES: Record<string, string> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
  U: 'A',
}

const HELIX_RADIUS = 1.0
const BASES_PER_TURN = 10
const STEP_Z = 0.34
const MAX_BASES = 3000

export function getComplementaryBase(base: string): string {
  return COMPLEMENTARY_BASES[base] || 'N'
}

export function getBaseColor(base: string): string {
  return BASE_COLORS[base] || '#888888'
}

export function parseDNASequence(rawSequence: string): ParsedDNAData {
  const cleaned = rawSequence.toUpperCase().replace(/\s/g, '')
  const validChars = 'ATCGU'
  const basePairs: BasePairData[] = []
  const invalidChars: string[] = []
  const seenInvalid = new Set<string>()

  let validCount = 0

  for (let i = 0; i < cleaned.length && validCount < MAX_BASES; i++) {
    const char = cleaned[i]
    if (validChars.includes(char)) {
      const base1Char = char
      const base2Char = getComplementaryBase(base1Char)

      const angle = (validCount / BASES_PER_TURN) * Math.PI * 2
      const z = validCount * STEP_Z

      const x1 = Math.cos(angle) * HELIX_RADIUS
      const y1 = Math.sin(angle) * HELIX_RADIUS

      const x2 = Math.cos(angle + Math.PI) * HELIX_RADIUS
      const y2 = Math.sin(angle + Math.PI) * HELIX_RADIUS

      basePairs.push({
        base1: {
          char: base1Char,
          x: x1,
          y: y1,
          z: z,
          color: getBaseColor(base1Char),
        },
        base2: {
          char: base2Char,
          x: x2,
          y: y2,
          z: z,
          color: getBaseColor(base2Char),
        },
        z: z,
      })

      validCount++
    } else {
      if (!seenInvalid.has(char)) {
        seenInvalid.add(char)
        invalidChars.push(char)
      }
    }
  }

  if (basePairs.length > 0) {
    const halfZ = basePairs[basePairs.length - 1].z / 2
    basePairs.forEach((bp) => {
      bp.base1.z -= halfZ
      bp.base2.z -= halfZ
      bp.z -= halfZ
    })
  }

  return {
    basePairs,
    validBases: validCount,
    invalidChars,
  }
}
