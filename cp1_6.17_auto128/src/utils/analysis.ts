export type Sentiment = 'positive' | 'neutral' | 'negative'

const positiveWords = ['好', '棒', '喜欢', '满意', '优秀', '太好了', '实用', '赞', '不错', '希望', '建议', '方便', '出色']
const negativeWords = ['差', '糟糕', '慢', '卡', 'bug', '错', '失败', '问题', '严重', '影响', '讨厌', '垃圾', '崩溃', '无法']

export function analyzeSentiment(text: string): Sentiment {
  let positive = 0
  let negative = 0
  for (const word of positiveWords) {
    if (text.includes(word)) positive++
  }
  for (const word of negativeWords) {
    if (text.includes(word)) negative++
  }
  if (positive > negative) return 'positive'
  if (negative > positive) return 'negative'
  return 'neutral'
}

export function extractKeywords(text: string): string[] {
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '我们', '你们', '他们', '可以', '什么', '怎么', '为什么', '能', '能够', '非常', '特别', '比较', '更', '最', '还', '还是', '或者', '但是', '因为', '所以', '如果', '虽然', '然后', '就是', '这个', '那个', '这些', '那些', '一下', '一点', '一些']
  const words = text.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]+/g) || []
  const filtered = words.filter(w => !stopWords.includes(w) && w.length >= 2)
  const countMap: Record<string, number> = {}
  for (const w of filtered) {
    countMap[w] = (countMap[w] || 0) + 1
  }
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

export const sentimentEmoji: Record<Sentiment, string> = {
  positive: '☀️',
  neutral: '☁️',
  negative: '🌧️'
}

export const sentimentLabel: Record<Sentiment, string> = {
  positive: '正面',
  neutral: '中性',
  negative: '负面'
}
