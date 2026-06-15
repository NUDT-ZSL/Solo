import { scaleLinear } from 'd3-scale'
import type { KeywordInfo } from './textAnalysis'

export interface CloudWord {
  text: string
  x: number
  y: number
  fontSize: number
  rotation: number
  color: string
  frequency: number
  sentiment: string
  sourceLines: string[]
  width: number
  height: number
}

const sentimentColors: Record<string, string> = {
  positive: '#B8860B',
  heroic: '#2C3E7B',
  melancholic: '#6B5B73',
  neutral: '#5A5A5A',
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function rectsOverlap(a: Rect, b: Rect, padding: number): boolean {
  return !(
    a.x + a.width / 2 + padding < b.x - b.width / 2 - padding ||
    a.x - a.width / 2 - padding > b.x + b.width / 2 + padding ||
    a.y + a.height / 2 + padding < b.y - b.height / 2 - padding ||
    a.y - a.height / 2 - padding > b.y + b.height / 2 + padding
  )
}

export function computeCloudLayout(
  keywords: KeywordInfo[],
  width: number,
  height: number,
): CloudWord[] {
  if (keywords.length === 0) return []

  const maxFreq = Math.max(...keywords.map(k => k.frequency))
  const minFreq = Math.min(...keywords.map(k => k.frequency))

  const fontScale = scaleLinear()
    .domain([minFreq, maxFreq])
    .range([14, 48])

  const centerX = width / 2
  const centerY = height / 2

  const placed: CloudWord[] = []

  for (const kw of keywords) {
    const fontSize = fontScale(kw.frequency)
    const rotation = 0
    const estimatedWidth = kw.word.length * fontSize * 0.85
    const estimatedHeight = fontSize * 1.2

    const a = 2
    const b = 0.8
    let bestX = centerX
    let bestY = centerY
    let found = false

    for (let theta = 0; theta < 200; theta += 0.3) {
      const r = a + b * theta
      const x = centerX + r * Math.cos(theta)
      const y = centerY + r * Math.sin(theta)

      const candidate: Rect = {
        x,
        y,
        width: estimatedWidth,
        height: estimatedHeight,
      }

      const hasOverlap = placed.some(p =>
        rectsOverlap(candidate, { x: p.x, y: p.y, width: p.width, height: p.height }, 6),
      )

      if (!hasOverlap) {
        bestX = x
        bestY = y
        found = true
        break
      }
    }

    if (!found) {
      const theta = placed.length * 0.5
      const r = a + b * theta
      bestX = centerX + r * Math.cos(theta)
      bestY = centerY + r * Math.sin(theta)
    }

    const dx = bestX - centerX
    const dy = bestY - centerY
    const maxDist = Math.min(width, height) * 0.45
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxDist) {
      const scale = maxDist / dist
      bestX = centerX + dx * scale
      bestY = centerY + dy * scale
    }

    placed.push({
      text: kw.word,
      x: bestX,
      y: bestY,
      fontSize,
      rotation,
      color: sentimentColors[kw.sentiment] || sentimentColors.neutral,
      frequency: kw.frequency,
      sentiment: kw.sentiment,
      sourceLines: kw.sourceLines,
      width: estimatedWidth,
      height: estimatedHeight,
    })
  }

  return placed
}
