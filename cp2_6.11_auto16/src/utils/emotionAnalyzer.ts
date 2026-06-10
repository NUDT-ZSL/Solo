export interface EmotionVector {
  joy: number
  sadness: number
  anger: number
  fear: number
  surprise: number
  disgust: number
  trust: number
  anticipation: number
}

export interface ColorBlock {
  id: string
  emotion: string
  color: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  borderRadius: number
  intensity: number
}

export interface EmotionAnalysisResult {
  emotions: EmotionVector
  dominantEmotion: string
  dominantColor: string
  colorBlocks: ColorBlock[]
  palette: string[]
}

const EMOTION_COLORS: Record<string, string> = {
  joy: '#FFD93D',
  sadness: '#4A90D9',
  anger: '#FF6B6B',
  fear: '#9B59B6',
  surprise: '#FF9F43',
  disgust: '#27AE60',
  trust: '#3498DB',
  anticipation: '#E056FD',
}

const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ['开心', '快乐', '喜悦', '愉快', '高兴', '幸福', '满足', '欣喜', '愉悦', '欢笑', '兴奋', '甜蜜'],
  sadness: ['难过', '悲伤', '伤心', '失落', '沮丧', '忧愁', '惆怅', '泪', '哭', '痛苦', '凄凉', '孤单'],
  anger: ['愤怒', '生气', '恼火', '气愤', '暴怒', '怨恨', '不满', '发火', '怒', '暴躁', '恼火', '愤慨'],
  fear: ['害怕', '恐惧', '担忧', '焦虑', '不安', '紧张', '担心', '恐慌', '畏惧', '恐怕', '忧虑', '惶恐'],
  surprise: ['惊讶', '惊喜', '意外', '震惊', '吃惊', '惊奇', '诧异', '没想到', '突然', '意外', '惊喜', '震惊'],
  disgust: ['厌恶', '讨厌', '反感', '恶心', '鄙视', '嫌弃', '憎恶', '厌烦', '腻烦', '嫌恶', '唾弃', '鄙夷'],
  trust: ['信任', '安心', '放心', '踏实', '安全', '可靠', '相信', '坦诚', '真诚', '信赖', '安心', '稳定'],
  anticipation: ['期待', '盼望', '憧憬', '希望', '向往', '渴望', '期盼', '期许', '展望', '翘首', '企盼', '希冀'],
}

function seededRandom(seed: number): () => number {
  let s = seed
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function analyzeEmotion(text: string, seed?: number): EmotionAnalysisResult {
  const random = seededRandom(seed ?? Date.now())
  const emotions: EmotionVector = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    trust: 0,
    anticipation: 0,
  }

  const lowerText = text.toLowerCase()

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let count = 0
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi')
      const matches = lowerText.match(regex)
      if (matches) {
        count += matches.length
      }
    }
    emotions[emotion as keyof EmotionVector] = count
  }

  const totalEmotion = Object.values(emotions).reduce((a, b) => a + b, 0)
  if (totalEmotion === 0) {
    emotions.joy = 0.3 + random() * 0.2
    emotions.trust = 0.2 + random() * 0.2
    emotions.anticipation = 0.2 + random() * 0.15
    emotions.sadness = random() * 0.15
    emotions.fear = random() * 0.1
  } else {
    for (const key of Object.keys(emotions) as (keyof EmotionVector)[]) {
      emotions[key] = emotions[key] / totalEmotion
      emotions[key] += (random() - 0.5) * 0.1
      emotions[key] = Math.max(0, Math.min(1, emotions[key]))
    }
  }

  const emotionEntries = Object.entries(emotions) as [keyof EmotionVector, number][]
  emotionEntries.sort((a, b) => b[1] - a[1])
  const dominantEmotion = emotionEntries[0][0]
  const dominantColor = EMOTION_COLORS[dominantEmotion]

  const palette = emotionEntries
    .filter(([, value]) => value > 0.05)
    .map(([emotion]) => EMOTION_COLORS[emotion])

  const blockCount = Math.floor(5 + random() * 8)
  const colorBlocks: ColorBlock[] = []

  const canvasWidth = 800
  const canvasHeight = 600

  for (let i = 0; i < blockCount; i++) {
    const emotionIndex = Math.floor(random() * Math.min(emotionEntries.length, 6))
    const [emotion, intensity] = emotionEntries[emotionIndex] || emotionEntries[0]
    const baseColor = EMOTION_COLORS[emotion]

    const width = 60 + random() * 200 * intensity + 50
    const height = 60 + random() * 180 * intensity + 40
    const x = random() * (canvasWidth - width - 40) + 20
    const y = random() * (canvasHeight - height - 40) + 20
    const rotation = (random() - 0.5) * 30
    const borderRadius = 8 + random() * 4

    colorBlocks.push({
      id: generateId(),
      emotion: emotion,
      color: baseColor,
      x,
      y,
      width,
      height,
      rotation,
      borderRadius,
      intensity,
    })
  }

  colorBlocks.sort((a, b) => a.intensity - b.intensity)

  return {
    emotions,
    dominantEmotion,
    dominantColor,
    colorBlocks,
    palette,
  }
}

export function getEmotionKeyword(emotion: string): string {
  const keywordMap: Record<string, string> = {
    joy: '愉悦',
    sadness: '忧伤',
    anger: '愤怒',
    fear: '焦虑',
    surprise: '惊喜',
    disgust: '反感',
    trust: '安心',
    anticipation: '期待',
  }
  return keywordMap[emotion] || '平静'
}

export function adjustColorSaturation(hex: string, saturationFactor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  let s = max === 0 ? 0 : delta / max
  const l = max / 255

  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6
        break
      case g:
        h = (b - r) / delta + 2
        break
      case b:
        h = (r - g) / delta + 4
        break
    }
    h *= 60
    if (h < 0) h += 360
  }

  s *= saturationFactor
  s = Math.max(0, Math.min(1, s))

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r1 = 0, g1 = 0, b1 = 0
  if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0 }
  else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0 }
  else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x }
  else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c }
  else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c }
  else if (h >= 300 && h < 360) { r1 = c; g1 = 0; b1 = x }

  const finalR = Math.round((r1 + m) * 255)
  const finalG = Math.round((g1 + m) * 255)
  const finalB = Math.round((b1 + m) * 255)

  return `#${finalR.toString(16).padStart(2, '0')}${finalG.toString(16).padStart(2, '0')}${finalB.toString(16).padStart(2, '0')}`
}

export function getGradientColor(color1: string, color2: string, ratio: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)

  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)

  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
