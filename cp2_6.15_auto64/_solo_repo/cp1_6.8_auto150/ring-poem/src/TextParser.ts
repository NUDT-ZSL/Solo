export type EmotionTag =
  | 'joy'
  | 'sorrow'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'peace'
  | 'nostalgia'
  | 'hope'

export interface TimeNode {
  index: number
  timestamp: string
  content: string
  summary: string
  emotion: EmotionTag
}

const EMOTION_KEYWORDS: Record<EmotionTag, string[]> = {
  joy: ['快乐', '开心', '幸福', '欢喜', '喜悦', '笑', '乐', '欢', '甜', '美好', '温暖', '阳光', '灿烂', '欣喜', '满足', 'happy', 'joy', 'glad', 'smile', 'laugh'],
  sorrow: ['悲伤', '难过', '忧伤', '哭泣', '泪', '痛', '苦', '哀', '愁', '惆怅', '凄', '悲', '失落', '遗憾', 'sad', 'sorrow', 'cry', 'tear', 'grief'],
  anger: ['愤怒', '生气', '恼怒', '愤', '恨', '怒', '暴', '烦', '怨', '厌恶', 'angry', 'fury', 'rage', 'hate'],
  fear: ['恐惧', '害怕', '惊恐', '慌', '惧', '畏', '胆怯', '不安', '担忧', '焦虑', 'fear', 'afraid', 'scared', 'anxiety'],
  surprise: ['惊讶', '意外', '震惊', '惊奇', '没想到', '突然', '出人意料', 'surprise', 'shock', 'amaze'],
  peace: ['平静', '安宁', '宁静', '淡然', '从容', '悠然', '安详', '恬', '闲', 'peace', 'calm', 'quiet', 'serene'],
  nostalgia: ['回忆', '怀念', '往事', '曾经', '从前', '记忆', '那年', '旧', '故', '忆', 'nostalgia', 'memory', 'remember', 'miss'],
  hope: ['希望', '期待', '憧憬', '向往', '梦想', '未来', '盼', '愿', '望', 'hope', 'wish', 'dream', 'expect'],
}

function detectEmotion(text: string): EmotionTag {
  let maxScore = 0
  let detected: EmotionTag = 'peace'
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      const count = text.split(kw).length - 1
      score += count * kw.length
    }
    if (score > maxScore) {
      maxScore = score
      detected = emotion as EmotionTag
    }
  }
  return detected
}

function generateTimestamp(index: number, total: number): string {
  const year = 2020 + index
  const month = String(((index * 3) % 12) + 1).padStart(2, '0')
  const day = String(((index * 7) % 28) + 1).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function summarize(text: string, maxLen: number = 20): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen) + '…'
}

function splitIntoParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n{1,}|\r\n{1,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
  if (paragraphs.length >= 5) return paragraphs
  const sentences = text
    .split(/[。！？；\.\!\?;]/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
  if (sentences.length >= 5) {
    const chunks: string[] = []
    const chunkSize = Math.ceil(sentences.length / Math.min(8, Math.max(5, sentences.length)))
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join('。') + '。')
    }
    return chunks
  }
  const chars = text.replace(/\s+/g, '').trim()
  const nodeCount = Math.min(8, Math.max(5, Math.ceil(chars.length / 30)))
  const chunkLen = Math.ceil(chars.length / nodeCount)
  const result: string[] = []
  for (let i = 0; i < chars.length; i += chunkLen) {
    const chunk = chars.slice(i, i + chunkLen)
    if (chunk.length > 0) result.push(chunk)
  }
  return result.length > 0 ? result : [text]
}

export function parseText(rawText: string): TimeNode[] {
  if (!rawText.trim()) return []
  const segments = splitIntoParagraphs(rawText)
  const clamped = segments.slice(0, 8)
  const total = clamped.length
  return clamped.map((content, index) => ({
    index,
    timestamp: generateTimestamp(index, total),
    content,
    summary: summarize(content),
    emotion: detectEmotion(content),
  }))
}
