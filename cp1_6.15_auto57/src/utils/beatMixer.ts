import type { BeatPoint } from './types'

export function mergeBeatSequences(sequences: BeatPoint[][]): BeatPoint[] {
  const allPoints: BeatPoint[] = []

  for (const seq of sequences) {
    for (const point of seq) {
      allPoints.push(point)
    }
  }

  allPoints.sort((a, b) => a.time - b.time)

  const result: BeatPoint[] = []
  const seenTimes = new Set<number>()

  for (const point of allPoints) {
    const roundedTime = Math.round(point.time * 100) / 100
    if (!seenTimes.has(roundedTime)) {
      seenTimes.add(roundedTime)
      result.push(point)
    }
  }

  return result
}
