import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

type FeedbackType = 'feature' | 'bug' | 'performance'
type FeedbackStatus = 'pending' | 'processing' | 'closed'
type Sentiment = 'positive' | 'neutral' | 'negative'

interface Feedback {
  id: string
  type: FeedbackType
  title: string
  description: string
  status: FeedbackStatus
  sentiment: Sentiment
  keywords: string[]
  createdAt: string
  updatedAt: string
  closedAt?: string
}

const feedbacks: Feedback[] = [
  {
    id: uuidv4(),
    type: 'feature',
    title: '希望增加深色模式',
    description: '现在白天使用还好，晚上看屏幕太刺眼了，希望能加一个深色模式切换功能，保护眼睛。',
    status: 'pending',
    sentiment: 'neutral',
    keywords: ['深色模式', '眼睛', '切换'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: uuidv4(),
    type: 'bug',
    title: '登录页面点击无反应',
    description: '点击登录按钮完全没反应，控制台也没有报错，刷新好几次都不行，太糟糕了！',
    status: 'processing',
    sentiment: 'negative',
    keywords: ['登录', '按钮', '报错'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: uuidv4(),
    type: 'performance',
    title: '首页加载速度慢',
    description: '首页打开需要等好久，图片加载特别慢，希望能优化一下性能，体验会更好。',
    status: 'closed',
    sentiment: 'negative',
    keywords: ['首页', '加载', '性能', '图片'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    closedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: uuidv4(),
    type: 'feature',
    title: '建议增加数据导出功能',
    description: '能够把数据导出成Excel就太好了，这样方便我们做报表分析，非常实用的功能！',
    status: 'pending',
    sentiment: 'positive',
    keywords: ['导出', 'Excel', '报表'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: uuidv4(),
    type: 'bug',
    title: '搜索结果不准确',
    description: '搜索关键词经常搜不到想要的内容，明明存在的文件就是搜不到，很影响使用。',
    status: 'pending',
    sentiment: 'negative',
    keywords: ['搜索', '结果', '文件'],
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    id: uuidv4(),
    type: 'performance',
    title: '滚动时掉帧严重',
    description: '列表滚动的时候一卡一卡的，体验很差，希望能优化一下渲染性能。',
    status: 'processing',
    sentiment: 'negative',
    keywords: ['滚动', '卡顿', '渲染'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
]

const positiveWords = ['好', '棒', '喜欢', '满意', '优秀', '太好了', '实用', '赞', '不错', '希望', '建议']
const negativeWords = ['差', '糟糕', '慢', '卡', 'bug', '错', '失败', '问题', '严重', '影响', '讨厌', '垃圾']

function analyzeSentiment(text: string): Sentiment {
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

function extractKeywords(text: string): string[] {
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']
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

app.get('/api/feedbacks', (req, res) => {
  res.json(feedbacks)
})

app.post('/api/feedbacks', (req, res) => {
  const { type, title, description } = req.body
  if (!type || !title || !description) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  const sentiment = analyzeSentiment(description)
  const keywords = extractKeywords(description)
  const now = new Date().toISOString()
  const feedback: Feedback = {
    id: uuidv4(),
    type,
    title,
    description,
    status: 'pending',
    sentiment,
    keywords,
    createdAt: now,
    updatedAt: now
  }
  feedbacks.unshift(feedback)
  res.status(201).json(feedback)
})

app.put('/api/feedbacks/:id', (req, res) => {
  const { id } = req.params
  const { status, title, description, type } = req.body
  const index = feedbacks.findIndex(f => f.id === id)
  if (index === -1) {
    return res.status(404).json({ error: '反馈不存在' })
  }
  const now = new Date().toISOString()
  feedbacks[index] = {
    ...feedbacks[index],
    status: status || feedbacks[index].status,
    title: title || feedbacks[index].title,
    description: description || feedbacks[index].description,
    type: type || feedbacks[index].type,
    updatedAt: now,
    closedAt: status === 'closed' ? now : feedbacks[index].closedAt
  }
  if (description) {
    feedbacks[index].sentiment = analyzeSentiment(description)
    feedbacks[index].keywords = extractKeywords(description)
  }
  res.json(feedbacks[index])
})

app.delete('/api/feedbacks/:id', (req, res) => {
  const { id } = req.params
  const index = feedbacks.findIndex(f => f.id === id)
  if (index === -1) {
    return res.status(404).json({ error: '反馈不存在' })
  }
  feedbacks.splice(index, 1)
  res.status(204).send()
})

app.post('/api/analyze', (req, res) => {
  const { text } = req.body
  if (!text) {
    return res.status(400).json({ error: '缺少文本' })
  }
  res.json({
    sentiment: analyzeSentiment(text),
    keywords: extractKeywords(text)
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
