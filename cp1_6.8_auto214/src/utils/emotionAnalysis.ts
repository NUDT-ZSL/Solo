export type EmotionType = 'positive' | 'neutral' | 'negative'

export interface EmotionResult {
  type: EmotionType
  intensity: number
  label: string
  keywords: string[]
  color: string
  colorLight: string
  gradient: string
}

const POSITIVE_WORDS = new Set([
  '开心', '快乐', '幸福', '喜悦', '欢乐', '满足', '欣喜', '愉快', '兴奋', '激动',
  '美好', '温暖', '甜蜜', '感动', '感恩', '感谢', '喜欢', '热爱', '珍惜', '期待',
  '希望', '阳光', '微笑', '拥抱', '成功', '胜利', '自由', '勇敢', '自信', '骄傲',
  '可爱', '漂亮', '精彩', '出色', '优秀', '棒', '赞', '好', '妙', '美',
  '哈哈', '嘻嘻', '耶', '太好了', '不错', '厉害', '加油', '幸运', '祝福', '浪漫',
  '笑', '乐', '甜', '暖', '爱', '善', '美', '好', '妙', '优',
  '高兴', '欢乐', '乐观', '积极', '向上', '蓬勃', '朝气', '活力', '热情', '热心',
  'happy', 'joy', 'love', 'wonderful', 'great', 'amazing', 'awesome', 'beautiful',
  'smile', 'laugh', 'excited', 'grateful', 'blessed', 'hope', 'peace', 'warm',
  'sweet', 'kind', 'brave', 'free', 'bright', 'sunshine', 'cheerful', 'delight',
])

const NEGATIVE_WORDS = new Set([
  '难过', '伤心', '悲伤', '痛苦', '失望', '绝望', '孤独', '寂寞', '焦虑', '紧张',
  '害怕', '恐惧', '愤怒', '生气', '烦躁', '厌烦', '讨厌', '厌恶', '无奈', '迷茫',
  '困惑', '沮丧', '颓废', '疲惫', '厌倦', '崩溃', '抑郁', '低落', '消沉', '忧愁',
  '忧虑', '担忧', '不安', '惶恐', '凄凉', '惨', '糟', '差', '坏', '恨',
  '哭', '泪', '痛', '苦', '冷', '暗', '累', '烦', '闷', '愁',
  '倒霉', '不幸', '灾难', '挫折', '失败', '遗憾', '后悔', '愧疚', '羞耻', '尴尬',
  'sad', 'angry', 'fear', 'hate', 'pain', 'hurt', 'cry', 'lonely', 'depressed',
  'anxious', 'worried', 'stressed', 'frustrated', 'disappointed', 'hopeless',
  'miserable', 'terrible', 'awful', 'dark', 'cold', 'lost', 'broken', 'tired',
])

const EMOTION_QUOTES: Record<EmotionType, string[]> = {
  positive: [
    '每一份快乐都值得被珍藏 ✨',
    '阳光总在风雨后，而你就是那道彩虹 🌈',
    '你的笑容，是这世界最美的风景 🌻',
    '幸福不在远方，就在此刻的心间 💫',
    '愿你永远拥有这般温暖的力量 🌟',
    '快乐是会传染的，请继续发光吧 ☀️',
  ],
  neutral: [
    '平静是最深的力量 🍃',
    '在平凡中发现不平凡 🌿',
    '淡定从容，也是一种了不起 🌊',
    '生活的留白，是给未来的期待 ☁️',
    '此刻安然，便是最好的时光 🍵',
    '不急不躁，静待花开 🌸',
  ],
  negative: [
    '低谷之后，必有回响 💙',
    '你的坚强，比你以为的更强大 🌙',
    '黑暗只是黎明前的短暂序曲 🌅',
    '允许自己难过，也相信明天会更好 🤗',
    '每一朵乌云都镶着银边 🌤️',
    '这段路虽难，但你并不孤单 💜',
  ],
}

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  positive: ['欢欣', '雀跃', '满足', '温暖', '期待', '感恩', '热爱', '阳光'],
  neutral: ['平静', '淡然', '从容', '安定', '沉静', '释然', '恬淡', '悠然'],
  negative: ['忧虑', '迷茫', '低落', '孤独', '不安', '失落', '疲惫', '忧伤'],
}

const EMOTION_LABELS: Record<EmotionType, string> = {
  positive: '积极 ✨',
  neutral: '中性 🍃',
  negative: '消极 🌙',
}

const EMOTION_COLORS: Record<EmotionType, { color: string; colorLight: string; gradient: string }> = {
  positive: {
    color: '#F5A623',
    colorLight: 'rgba(245, 166, 35, 0.2)',
    gradient: 'radial-gradient(circle at 30% 30%, #FFD970, #F5A623, #E8853A)',
  },
  neutral: {
    color: '#5EC4A0',
    colorLight: 'rgba(94, 196, 160, 0.2)',
    gradient: 'radial-gradient(circle at 30% 30%, #9FE8CB, #5EC4A0, #3DA882)',
  },
  negative: {
    color: '#8B7EC8',
    colorLight: 'rgba(139, 126, 200, 0.2)',
    gradient: 'radial-gradient(circle at 30% 30%, #B8A9E8, #8B7EC8, #6C5FB5)',
  },
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function analyzeEmotion(text: string): EmotionResult {
  const tokens = tokenize(text)
  let positiveCount = 0
  let negativeCount = 0
  const matchedKeywords: string[] = []

  for (const token of tokens) {
    if (POSITIVE_WORDS.has(token)) {
      positiveCount++
      matchedKeywords.push(token)
    }
    if (NEGATIVE_WORDS.has(token)) {
      negativeCount++
      matchedKeywords.push(token)
    }
  }

  for (const word of POSITIVE_WORDS) {
    if (word.length >= 2 && text.includes(word) && !matchedKeywords.includes(word)) {
      positiveCount++
      matchedKeywords.push(word)
    }
  }

  for (const word of NEGATIVE_WORDS) {
    if (word.length >= 2 && text.includes(word) && !matchedKeywords.includes(word)) {
      negativeCount++
      matchedKeywords.push(word)
    }
  }

  const total = positiveCount + negativeCount
  let type: EmotionType
  let intensity: number

  if (total === 0) {
    type = 'neutral'
    intensity = 0.3
  } else if (positiveCount > negativeCount) {
    type = 'positive'
    intensity = Math.min(1, 0.4 + (positiveCount / tokens.length) * 1.5)
  } else if (negativeCount > positiveCount) {
    type = 'negative'
    intensity = Math.min(1, 0.4 + (negativeCount / tokens.length) * 1.5)
  } else {
    type = 'neutral'
    intensity = 0.5
  }

  const colors = EMOTION_COLORS[type]
  const emotionKeywords = EMOTION_KEYWORDS[type]
  const displayKeywords = matchedKeywords.length > 0
    ? matchedKeywords.slice(0, 4)
    : emotionKeywords.slice(0, 3)

  return {
    type,
    intensity,
    label: EMOTION_LABELS[type],
    keywords: displayKeywords,
    color: colors.color,
    colorLight: colors.colorLight,
    gradient: colors.gradient,
  }
}

export function getRandomQuote(type: EmotionType): string {
  const quotes = EMOTION_QUOTES[type]
  return quotes[Math.floor(Math.random() * quotes.length)]
}

export function analyzeTextToSegments(text: string): EmotionResult[] {
  const segments = text.split(/[，。！？；、\n,.;!?]+/).filter(s => s.trim().length > 0)
  if (segments.length === 0) {
    return [analyzeEmotion(text)]
  }
  return segments.map(segment => analyzeEmotion(segment.trim()))
}
