import express, { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(express.json())

type DisputeType = 'service_incomplete' | 'health_issue' | 'fee_dispute'
type DisputeStatus = 'pending' | 'mediating' | 'resolved'
type MessageRole = 'owner' | 'sitter' | 'customer_service'

interface EvidenceImage {
  id: string
  url: string
  thumbnail: string
  description: string
}

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  type: 'text' | 'image'
  timestamp: string
  orderNode?: OrderNode
}

interface OrderNode {
  type: 'checkin' | 'checkout' | 'fee_change' | 'health_check'
  label: string
  time: string
}

interface Dispute {
  id: string
  petName: string
  petAvatar: string
  sitterName: string
  ownerName: string
  fosterStartDate: string
  fosterEndDate: string
  disputeType: DisputeType
  disputeStatus: DisputeStatus
  description: string
  evidenceImages: EvidenceImage[]
  chatMessages: ChatMessage[]
  suggestions: MediationSuggestion[]
  handlingRecords: string[]
  createdAt: string
}

interface MediationSuggestion {
  id: string
  content: string
  adopted: boolean
}

const petNames = ['毛毛', '豆豆', '球球', '小白', '布丁', '奶茶', '可乐', '旺财', '花花', '富贵']
const sitterNames = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '孙九', '周十']
const ownerNames = ['小明', '小红', '小华', '小丽', '小刚', '小芳']
const disputeTypeLabels: Record<DisputeType, string> = {
  service_incomplete: '服务未完成',
  health_issue: '健康问题',
  fee_dispute: '费用争议'
}

const generateImages = (count: number): EvidenceImage[] => {
  const colors = ['FF8C00', '4A3728', '8B4513', 'D2691E', 'CD853F']
  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    url: `https://placehold.co/600x400/${colors[i % colors.length]}/ffffff?text=Evidence+${i + 1}`,
    thumbnail: `https://placehold.co/120x90/${colors[i % colors.length]}/ffffff?text=E${i + 1}`,
    description: `证据图片 ${i + 1}`
  }))
}

const generateOrderNodes = (startDate: Date, endDate: Date): OrderNode[] => {
  const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2)
  return [
    { type: 'checkin', label: '送宠时间', time: startDate.toISOString() },
    { type: 'health_check', label: '健康检查', time: new Date(startDate.getTime() + 3600000).toISOString() },
    { type: 'fee_change', label: '费用调整', time: midDate.toISOString() },
    { type: 'checkout', label: '离店确认时间', time: endDate.toISOString() }
  ]
}

const generateChatMessages = (startDate: Date, orderNodes: OrderNode[]): ChatMessage[] => {
  const texts: Array<{ role: MessageRole; content: string }> = [
    { role: 'owner', content: '你好，我家狗狗在你那边怎么样了？' },
    { role: 'sitter', content: '您好，狗狗状态很好，放心吧~' },
    { role: 'owner', content: '今天有按时遛狗吗？' },
    { role: 'sitter', content: '遛了两次，每次半小时' },
    { role: 'owner', content: '我看到照片里狗狗好像不太开心' },
    { role: 'customer_service', content: '您好，我是平台客服，有什么可以帮您？' },
    { role: 'owner', content: '我怀疑寄养期间狗狗照顾不周' },
    { role: 'sitter', content: '我们一直按标准流程照顾的' },
    { role: 'customer_service', content: '请双方提供相关证据，我们会公正处理' }
  ]

  return texts.map((t, i) => {
    const msgTime = new Date(startDate.getTime() + i * 3600000 * 6)
    const hasOrderNode = i === 0 || i === 4 || i === 6
    return {
      id: uuidv4(),
      role: t.role,
      content: t.content,
      type: i === 4 ? 'image' : 'text',
      timestamp: msgTime.toISOString(),
      orderNode: hasOrderNode ? orderNodes[i % orderNodes.length] : undefined
    }
  })
}

const generateDisputes = (count: number): Dispute[] => {
  const types: DisputeType[] = ['service_incomplete', 'health_issue', 'fee_dispute']
  const statuses: DisputeStatus[] = ['pending', 'mediating', 'resolved']
  const disputes: Dispute[] = []

  for (let i = 0; i < count; i++) {
    const startDate = new Date(Date.now() - Math.random() * 30 * 24 * 3600000)
    const endDate = new Date(startDate.getTime() + (3 + Math.random() * 7) * 24 * 3600000)
    const orderNodes = generateOrderNodes(startDate, endDate)

    disputes.push({
      id: uuidv4(),
      petName: petNames[i % petNames.length],
      petAvatar: `https://placehold.co/60x60/FF8C00/ffffff?text=${encodeURIComponent(petNames[i % petNames.length][0])}`,
      sitterName: sitterNames[i % sitterNames.length],
      ownerName: ownerNames[i % ownerNames.length],
      fosterStartDate: startDate.toISOString(),
      fosterEndDate: endDate.toISOString(),
      disputeType: types[i % types.length],
      disputeStatus: statuses[i % statuses.length],
      description: `用户${ownerNames[i % ownerNames.length]}反馈寄养期间宠物${petNames[i % petNames.length]}出现${disputeTypeLabels[types[i % types.length]]}问题，要求平台介入处理。寄养人${sitterNames[i % sitterNames.length]}表示已按协议履行服务职责，双方存在争议。`,
      evidenceImages: generateImages(3 + Math.floor(Math.random() * 3)),
      chatMessages: generateChatMessages(startDate, orderNodes),
      suggestions: [],
      handlingRecords: [],
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString()
    })
  }

  return disputes
}

let allDisputes: Dispute[] = generateDisputes(50)

const delay = (min: number, max: number) =>
  new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)))

app.get('/api/disputes', async (req: Request, res: Response) => {
  await delay(100, 300)

  const { page = '1', pageSize = '10', type, startDate, endDate } = req.query

  let filtered = [...allDisputes]

  if (type && type !== 'all') {
    filtered = filtered.filter(d => d.disputeType === type)
  }

  if (startDate) {
    const start = new Date(startDate as string)
    filtered = filtered.filter(d => new Date(d.createdAt) >= start)
  }

  if (endDate) {
    const end = new Date(endDate as string)
    filtered = filtered.filter(d => new Date(d.createdAt) <= end)
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const pageNum = parseInt(page as string)
  const size = parseInt(pageSize as string)
  const startIdx = (pageNum - 1) * size
  const paged = filtered.slice(startIdx, startIdx + size)

  res.json({
    data: paged,
    total: filtered.length,
    page: pageNum,
    pageSize: size
  })
})

app.get('/api/disputes/:id', async (req: Request, res: Response) => {
  await delay(100, 300)

  const dispute = allDisputes.find(d => d.id === req.params.id)
  if (!dispute) {
    res.status(404).json({ error: '纠纷不存在' })
    return
  }
  res.json({ data: dispute })
})

app.patch('/api/disputes/:id/status', async (req: Request, res: Response) => {
  await delay(100, 300)

  const { status } = req.body
  const idx = allDisputes.findIndex(d => d.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: '纠纷不存在' })
    return
  }

  allDisputes[idx].disputeStatus = status
  allDisputes[idx].handlingRecords.push(
    `[${new Date().toLocaleString('zh-CN')}] 状态变更为：${status === 'pending' ? '待处理' : status === 'mediating' ? '调解中' : '已解决'}`
  )

  res.json({ data: allDisputes[idx] })
})

app.post('/api/disputes/:id/suggestions', async (req: Request, res: Response) => {
  await delay(100, 300)

  const idx = allDisputes.findIndex(d => d.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: '纠纷不存在' })
    return
  }

  const suggestions: MediationSuggestion[] = [
    {
      id: uuidv4(),
      content: `建议寄养人退还30%寄养费用（约${Math.floor(100 + Math.random() * 200)}元）作为服务补偿`,
      adopted: false
    },
    {
      id: uuidv4(),
      content: `建议平台提供宠物免费体检券（价值${Math.floor(200 + Math.random() * 300)}元）作为补偿方案`,
      adopted: false
    },
    {
      id: uuidv4(),
      content: `建议双方各承担50%责任，寄养费用按实际服务天数结算，减免${Math.floor(1 + Math.random() * 3)}天费用`,
      adopted: false
    }
  ]

  allDisputes[idx].suggestions = suggestions
  res.json({ data: suggestions })
})

app.post('/api/disputes/:id/suggestions/:suggestionId/adopt', async (req: Request, res: Response) => {
  await delay(100, 300)

  const { id, suggestionId } = req.params
  const idx = allDisputes.findIndex(d => d.id === id)
  if (idx === -1) {
    res.status(404).json({ error: '纠纷不存在' })
    return
  }

  const suggestionIdx = allDisputes[idx].suggestions.findIndex(s => s.id === suggestionId)
  if (suggestionIdx === -1) {
    res.status(404).json({ error: '建议不存在' })
    return
  }

  allDisputes[idx].suggestions[suggestionIdx].adopted = true
  allDisputes[idx].handlingRecords.push(
    `[${new Date().toLocaleString('zh-CN')}] 采纳调解建议：${allDisputes[idx].suggestions[suggestionIdx].content}`
  )

  res.json({ data: allDisputes[idx].suggestions[suggestionIdx] })
})

app.listen(PORT, () => {
  console.log(`Mock Server running on http://localhost:${PORT}`)
})
