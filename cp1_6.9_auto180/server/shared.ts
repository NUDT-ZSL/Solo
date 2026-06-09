export type EmotionType = 'joy' | 'sadness' | 'anger' | 'calm' | 'anxiety' | 'excitement' | 'loneliness' | 'gratitude' | 'fear' | 'hope'

export interface EmotionInfo {
  type: EmotionType
  name: string
  keywords: string[]
  hue: number
}

export interface Diary {
  id: string
  uuid: string
  content: string
  date: string
  weather: string
  mood: number
  emotions: Record<EmotionType, number>
  primaryEmotion: EmotionType
  hue: number
  saturation: number
  lightness: number
  intensity: number
  createdAt: number
}

export const EMOTIONS: EmotionInfo[] = [
  { type: 'joy', name: '快乐', keywords: ['快乐', '开心', '高兴', '愉快', '幸福', '喜悦', '欢乐', '欣喜', '愉悦', '乐', '爽'], hue: 60 },
  { type: 'sadness', name: '悲伤', keywords: ['悲伤', '难过', '伤心', '痛苦', '哭泣', '泪', '失落', '沮丧', '忧伤', '哀伤', '凄凉'], hue: 240 },
  { type: 'anger', name: '愤怒', keywords: ['愤怒', '生气', '恼火', '气愤', '暴怒', '发火', '愤怒', '气', '恨', '烦躁', '恼火'], hue: 0 },
  { type: 'calm', name: '平静', keywords: ['平静', '安宁', '宁静', '安静', '放松', '悠闲', '舒心', '平和', '淡定', '从容', '静谧'], hue: 180 },
  { type: 'anxiety', name: '焦虑', keywords: ['焦虑', '紧张', '担心', '不安', '忧虑', '着急', '恐慌', '忐忑', '心慌', '焦躁', '惶惑'], hue: 30 },
  { type: 'excitement', name: '兴奋', keywords: ['兴奋', '激动', '激情', '热血', '澎湃', '振奋', '激昂', '沸腾', '亢奋', '狂喜', '憧憬'], hue: 330 },
  { type: 'loneliness', name: '孤独', keywords: ['孤独', '寂寞', '孤单', '孤寂', '落寞', '寂寥', '空虚', '独自', '形单影只', '孤苦'], hue: 270 },
  { type: 'gratitude', name: '感恩', keywords: ['感恩', '感谢', '感激', '谢谢', '温暖', '感动', '欣慰', '珍惜', '知足', '幸运'], hue: 120 },
  { type: 'fear', name: '恐惧', keywords: ['恐惧', '害怕', '畏惧', '胆怯', '恐慌', '惊骇', '惧怕', '心惊', '胆战', '畏缩', '战栗'], hue: 300 },
  { type: 'hope', name: '希望', keywords: ['希望', '期待', '憧憬', '向往', '盼望', '未来', '信心', '光明', '憧憬', '梦想', '追求'], hue: 90 },
]

export function analyzeEmotion(text: string): {
  emotions: Record<EmotionType, number>
  primaryEmotion: EmotionType
  hue: number
  saturation: number
  lightness: number
  intensity: number
} {
  const emotions: Record<EmotionType, number> = {} as Record<EmotionType, number>
  EMOTIONS.forEach(e => emotions[e.type] = 0)

  let totalHits = 0

  EMOTIONS.forEach(emotion => {
    let count = 0
    emotion.keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi')
      const matches = text.match(regex)
      if (matches) {
        count += matches.length
      }
    })
    emotions[emotion.type] = count
    totalHits += count
  })

  let primaryType: EmotionType = 'calm'
  let maxCount = 0
  EMOTIONS.forEach(emotion => {
    if (emotions[emotion.type] > maxCount) {
      maxCount = emotions[emotion.type]
      primaryType = emotion.type
    }
  })

  const primaryEmotion = EMOTIONS.find(e => e.type === primaryType)!
  const intensity = Math.min(10, Math.max(1, totalHits > 0 ? totalHits : 1))

  const saturation = Math.min(100, Math.max(50, 50 + intensity * 5))
  const lightness = Math.min(80, Math.max(40, 40 + intensity * 4))

  return {
    emotions,
    primaryEmotion: primaryType,
    hue: primaryEmotion.hue,
    saturation,
    lightness,
    intensity,
  }
}
