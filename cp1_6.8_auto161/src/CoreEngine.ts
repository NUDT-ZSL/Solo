export type EmotionType =
  | 'joy'
  | 'sorrow'
  | 'calm'
  | 'passion'
  | 'longing'
  | 'awe'
  | 'melancholy'
  | 'hope'

export interface EmotionProfile {
  emotion: EmotionType
  intensity: number
  keywords: string[]
}

export interface ColorDef {
  emotion: EmotionType
  primary: string
  secondary: string
  glow: string
}

export interface ParsedLine {
  index: number
  text: string
  emotion: EmotionProfile
  color: ColorDef
  layout: WaterfallLayout
}

export interface WaterfallLayout {
  x: number
  y: number
  width: number
  height: number
  delay: number
}

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  joy: ['笑', '喜', '欢', '乐', '花', '春', '暖', '晴', '歌', '舞', '明', '灿', '欢', '悦', '甜', '畅', '欣'],
  sorrow: ['泪', '悲', '哭', '愁', '别', '离', '苦', '痛', '伤', '哀', '泣', '叹', '凄', '惘', '惋'],
  calm: ['静', '淡', '远', '闲', '清', '幽', '寂', '空', '素', '宁', '和', '平', '悠', '安', '默'],
  passion: ['火', '烈', '热', '怒', '狂', '血', '焰', '燃', '奔', '涌', '激', '奋', '啸', '腾', '赤'],
  longing: ['望', '思', '念', '梦', '忆', '寻', '归', '盼', '等', '期', '想', '怀', '恋', '渴', '期'],
  awe: ['山', '海', '天', '星', '月', '雪', '风', '云', '浪', '峰', '渊', '浩', '苍', '茫', '穹'],
  melancholy: ['秋', '暮', '残', '落', '枯', '衰', '旧', '故', '烟', '雨', '灰', '凉', '晚', '萧', '褪'],
  hope: ['光', '明', '新', '生', '芽', '晨', '曦', '曙', '破', '开', '起', '升', '绽', '绿', '初'],
}

export const COLOR_PALETTES: Record<string, ColorDef[]> = {
  default: [
    { emotion: 'joy', primary: '#f9a825', secondary: '#fff3e0', glow: 'rgba(249,168,37,0.3)' },
    { emotion: 'sorrow', primary: '#5c6bc0', secondary: '#e8eaf6', glow: 'rgba(92,107,192,0.3)' },
    { emotion: 'calm', primary: '#78909c', secondary: '#eceff1', glow: 'rgba(120,144,156,0.3)' },
    { emotion: 'passion', primary: '#e53935', secondary: '#ffebee', glow: 'rgba(229,57,53,0.3)' },
    { emotion: 'longing', primary: '#8e24aa', secondary: '#f3e5f5', glow: 'rgba(142,36,170,0.3)' },
    { emotion: 'awe', primary: '#00897b', secondary: '#e0f2f1', glow: 'rgba(0,137,123,0.3)' },
    { emotion: 'melancholy', primary: '#6d4c41', secondary: '#efebe9', glow: 'rgba(109,76,65,0.3)' },
    { emotion: 'hope', primary: '#43a047', secondary: '#e8f5e9', glow: 'rgba(67,160,71,0.3)' },
  ],
  ink: [
    { emotion: 'joy', primary: '#c9a96e', secondary: '#faf6ed', glow: 'rgba(201,169,110,0.25)' },
    { emotion: 'sorrow', primary: '#5b6a7a', secondary: '#edf0f3', glow: 'rgba(91,106,122,0.25)' },
    { emotion: 'calm', primary: '#8a9a8e', secondary: '#f2f5f2', glow: 'rgba(138,154,142,0.25)' },
    { emotion: 'passion', primary: '#b05050', secondary: '#f9eded', glow: 'rgba(176,80,80,0.25)' },
    { emotion: 'longing', primary: '#7a6a8e', secondary: '#f3f0f6', glow: 'rgba(122,106,142,0.25)' },
    { emotion: 'awe', primary: '#4a7a7a', secondary: '#eaf3f3', glow: 'rgba(74,122,122,0.25)' },
    { emotion: 'melancholy', primary: '#6e5e50', secondary: '#f0ece8', glow: 'rgba(110,94,80,0.25)' },
    { emotion: 'hope', primary: '#6a9a5a', secondary: '#f0f7ee', glow: 'rgba(106,154,90,0.25)' },
  ],
  twilight: [
    { emotion: 'joy', primary: '#f4a261', secondary: '#fff5eb', glow: 'rgba(244,162,97,0.3)' },
    { emotion: 'sorrow', primary: '#6a7bba', secondary: '#eaecf5', glow: 'rgba(106,123,186,0.3)' },
    { emotion: 'calm', primary: '#9cb8c4', secondary: '#f0f6f8', glow: 'rgba(156,184,196,0.3)' },
    { emotion: 'passion', primary: '#e76f51', secondary: '#fdeee9', glow: 'rgba(231,111,81,0.3)' },
    { emotion: 'longing', primary: '#a87ec4', secondary: '#f6eff9', glow: 'rgba(168,126,196,0.3)' },
    { emotion: 'awe', primary: '#2a9d8f', secondary: '#e6f5f3', glow: 'rgba(42,157,143,0.3)' },
    { emotion: 'melancholy', primary: '#7a6552', secondary: '#f1ece7', glow: 'rgba(122,101,82,0.3)' },
    { emotion: 'hope', primary: '#6abf69', secondary: '#edf9ed', glow: 'rgba(106,191,105,0.3)' },
  ],
}

const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '喜悦',
  sorrow: '悲伤',
  calm: '宁静',
  passion: '热烈',
  longing: '思念',
  awe: '敬畏',
  melancholy: '惆怅',
  hope: '希望',
}

export function parsePoem(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 10)
}

function matchEmotion(line: string): EmotionProfile {
  const scores: Record<EmotionType, number> = {
    joy: 0,
    sorrow: 0,
    calm: 0,
    passion: 0,
    longing: 0,
    awe: 0,
    melancholy: 0,
    hope: 0,
  }

  const matchedKeywords: string[] = []

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (line.includes(kw)) {
        scores[emotion as EmotionType] += 1
        if (!matchedKeywords.includes(kw)) {
          matchedKeywords.push(kw)
        }
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) {
    return {
      emotion: 'calm',
      intensity: 0.3,
      keywords: [],
    }
  }

  const topEmotion = (Object.entries(scores).find(([, s]) => s === maxScore)![0]) as EmotionType
  const totalHits = Object.values(scores).reduce((a, b) => a + b, 0)
  const intensity = Math.min(1, (maxScore / Math.max(1, totalHits)) * (0.5 + maxScore * 0.15))

  return {
    emotion: topEmotion,
    intensity: Math.round(intensity * 100) / 100,
    keywords: matchedKeywords,
  }
}

function getColor(emotion: EmotionType, paletteName: string): ColorDef {
  const palette = COLOR_PALETTES[paletteName] || COLOR_PALETTES.default
  return palette.find((c) => c.emotion === emotion) || palette[2]
}

function computeWaterfallLayout(
  lineCount: number,
  containerWidth: number,
  baseDelay: number,
): WaterfallLayout[] {
  const lineHeight = 64
  const gapY = 20
  const paddingX = 48
  const usableWidth = containerWidth - paddingX * 2
  const colCount = lineCount <= 4 ? 1 : lineCount <= 7 ? 2 : 3
  const colWidth = (usableWidth - (colCount - 1) * 24) / colCount

  const colHeights: number[] = new Array(colCount).fill(0)
  const layouts: WaterfallLayout[] = []

  for (let i = 0; i < lineCount; i++) {
    const shortestCol = colHeights.indexOf(Math.min(...colHeights))
    const x = paddingX + shortestCol * (colWidth + 24)
    const y = colHeights[shortestCol]
    const h = lineHeight + Math.floor(Math.random() * 16)

    layouts.push({
      x,
      y,
      width: colWidth,
      height: h,
      delay: i * baseDelay,
    })

    colHeights[shortestCol] += h + gapY
  }

  return layouts
}

export function analyzePoem(raw: string, paletteName: string, containerWidth: number, animSpeed: number): ParsedLine[] {
  const lines = parsePoem(raw)
  const baseDelay = 300 / animSpeed
  const layouts = computeWaterfallLayout(lines.length, containerWidth, baseDelay)

  return lines.map((text, i) => {
    const emotion = matchEmotion(text)
    const color = getColor(emotion.emotion, paletteName)
    return {
      index: i,
      text,
      emotion,
      color,
      layout: layouts[i],
    }
  })
}

export function getEmotionLabel(emotion: EmotionType): string {
  return EMOTION_LABELS[emotion]
}
