import * as THREE from 'three'

const POSITIVE_WORDS = new Set([
  'love', 'happy', 'joy', 'beautiful', 'wonderful', 'amazing', 'great', 'good',
  'best', 'excellent', 'fantastic', 'brilliant', 'lovely', 'perfect', 'sweet',
  'hope', 'peace', 'light', 'dream', 'star', 'shine', 'bright', 'warm',
  'smile', 'laugh', 'kind', 'gentle', 'brave', 'free', 'dance', 'sing',
  'bloom', 'rise', 'fly', 'glow', 'sparkle', 'magic', 'wonder', 'delight',
  '爱', '快乐', '幸福', '美好', '美丽', '温暖', '光明', '希望',
  '梦', '星', '闪耀', '灿烂', '喜欢', '开心', '微笑', '温柔',
  '勇敢', '自由', '善良', '甜蜜', '缤纷', '绚丽', '绽放', '飞翔',
  '璀璨', '梦幻', '诗意', '浪漫', '宁静', '祥和', '欢喜', '喜悦',
])

const NEGATIVE_WORDS = new Set([
  'sad', 'hate', 'angry', 'dark', 'cold', 'lost', 'alone', 'pain',
  'cry', 'fear', 'death', 'broken', 'empty', 'gloomy', 'lonely', 'bitter',
  'harsh', 'cruel', 'bleak', 'despair', 'sorrow', 'grief', 'agony', 'dread',
  '悲伤', '痛苦', '孤独', '黑暗', '寒冷', '失落', '绝望', '恐惧',
  '哭泣', '离别', '消逝', '沉寂', '荒凉', '忧伤', '愁', '怨',
  '恨', '怒', '哀', '泣', '凋零', '枯萎', '阴霾', '凄凉',
])

export type Emotion = 'positive' | 'negative' | 'neutral'

export function analyzeEmotion(words: string[]): Emotion {
  let posCount = 0
  let negCount = 0
  for (const word of words) {
    const w = word.toLowerCase()
    if (POSITIVE_WORDS.has(w)) posCount++
    if (NEGATIVE_WORDS.has(w)) negCount++
  }
  if (posCount > negCount) return 'positive'
  if (negCount > posCount) return 'negative'
  return 'neutral'
}

export function splitText(text: string): string[] {
  const chinesePattern = /[\u4e00-\u9fff]+/g
  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = chinesePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const englishPart = text.slice(lastIndex, match.index).trim()
      if (englishPart) {
        parts.push(...englishPart.split(/\s+/).filter(w => w.length > 0))
      }
    }
    for (const char of match[0]) {
      parts.push(char)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim()
    if (remaining) {
      parts.push(...remaining.split(/\s+/).filter(w => w.length > 0))
    }
  }
  return parts.filter(w => w.length > 0)
}

export function generateConstellationPoints(
  word: string,
  center: THREE.Vector3,
  spread: number,
  density: number
): THREE.Vector3[] {
  const starCount = Math.max(5, Math.min(12, word.length * 2 + 3))
  const points: THREE.Vector3[] = []
  const baseRadius = spread * 0.8
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = baseRadius * (0.3 + Math.random() * 0.7)
    points.push(
      new THREE.Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi)
      )
    )
  }
  const extraCount = Math.floor(density / 50)
  for (let i = 0; i < extraCount; i++) {
    const idx = Math.floor(Math.random() * points.length)
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * spread * 0.3,
      (Math.random() - 0.5) * spread * 0.3,
      (Math.random() - 0.5) * spread * 0.3
    )
    points.push(points[idx].clone().add(offset))
  }
  return points
}

export function generateConstellationLines(points: THREE.Vector3[]): [number, number][] {
  if (points.length < 2) return []
  const lines: [number, number][] = []
  const connected = new Set<number>([0])
  const remaining = new Set<number>()
  for (let i = 1; i < points.length; i++) remaining.add(i)
  while (remaining.size > 0) {
    let minDist = Infinity
    let bestFrom = -1
    let bestTo = -1
    for (const from of connected) {
      for (const to of remaining) {
        const d = points[from].distanceTo(points[to])
        if (d < minDist) {
          minDist = d
          bestFrom = from
          bestTo = to
        }
      }
    }
    if (bestTo >= 0) {
      lines.push([bestFrom, bestTo])
      connected.add(bestTo)
      remaining.delete(bestTo)
    } else break
  }
  return lines
}

export function getTextParticlePositions(
  text: string,
  center: THREE.Vector3,
  scale: number
): THREE.Vector3[] {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontSize = 64
  ctx.font = `bold ${fontSize}px sans-serif`
  const metrics = ctx.measureText(text)
  canvas.width = Math.ceil(metrics.width) + 20
  canvas.height = fontSize + 20
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'top'
  ctx.fillText(text, 10, 10)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const positions: THREE.Vector3[] = []
  const step = 3
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const idx = (y * canvas.width + x) * 4
      if (imageData.data[idx + 3] > 128) {
        positions.push(
          new THREE.Vector3(
            center.x + (x - canvas.width / 2) * scale * 0.05,
            center.y - (y - canvas.height / 2) * scale * 0.05,
            center.z + (Math.random() - 0.5) * 0.5
          )
        )
      }
    }
  }
  return positions
}

export function getPositionForWord(
  index: number,
  total: number,
  radius: number
): THREE.Vector3 {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2
  const ySpread = (Math.random() - 0.5) * radius * 0.4
  return new THREE.Vector3(
    radius * Math.cos(angle),
    ySpread,
    radius * Math.sin(angle)
  )
}
