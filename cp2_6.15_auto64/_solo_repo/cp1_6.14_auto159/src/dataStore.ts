export type PledgeCategory = 'plastic' | 'transport' | 'local' | 'animal'

export interface Milestone {
  id: string
  date: string
  summary: string
  photo?: string
}

export interface Pledge {
  id: string
  userId: string
  userName: string
  destination: string
  departureDate: string
  category: PledgeCategory
  description: string
  progress: number
  milestones: Milestone[]
  createdAt: string
}

const STORAGE_KEY = 'travel-pledges'

const CATEGORY_COLORS: Record<PledgeCategory, string> = {
  plastic: '#22c55e',
  transport: '#3b82f6',
  local: '#f59e0b',
  animal: '#a855f7'
}

const CATEGORY_LABELS: Record<PledgeCategory, string> = {
  plastic: '减少塑料',
  transport: '低碳交通',
  local: '支持本地',
  animal: '动物友好'
}

export { CATEGORY_COLORS, CATEGORY_LABELS }

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function readStorage(): Pledge[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return getMockData()
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed) || parsed.length === 0) return getMockData()
    return parsed
  } catch {
    return getMockData()
  }
}

function writeStorage(pledges: Pledge[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pledges))
}

export function getAllPledges(): Pledge[] {
  return readStorage()
}

export function getPledgeById(id: string): Pledge | undefined {
  return readStorage().find((p) => p.id === id)
}

export function addPledge(
  pledge: Omit<Pledge, 'id' | 'progress' | 'milestones' | 'createdAt'>
): Pledge {
  const pledges = readStorage()
  const newPledge: Pledge = {
    ...pledge,
    id: generateId(),
    progress: 0,
    milestones: [],
    createdAt: new Date().toISOString()
  }
  pledges.unshift(newPledge)
  writeStorage(pledges)
  return newPledge
}

export function addMilestone(
  pledgeId: string,
  milestone: Omit<Milestone, 'id'>
): Pledge | undefined {
  const pledges = readStorage()
  const index = pledges.findIndex((p) => p.id === pledgeId)
  if (index === -1) return undefined

  const newMilestone: Milestone = {
    ...milestone,
    id: generateId()
  }

  pledges[index].milestones.unshift(newMilestone)
  const totalMilestones = Math.max(pledges[index].milestones.length, 3)
  pledges[index].progress = Math.min(
    Math.round((pledges[index].milestones.length / totalMilestones) * 100),
    100
  )

  writeStorage(pledges)
  return pledges[index]
}

export function updateProgress(pledgeId: string, progress: number): Pledge | undefined {
  const pledges = readStorage()
  const index = pledges.findIndex((p) => p.id === pledgeId)
  if (index === -1) return undefined
  pledges[index].progress = Math.max(0, Math.min(100, progress))
  writeStorage(pledges)
  return pledges[index]
}

export function getCurrentUserId(): string {
  let userId = localStorage.getItem('travel-pledge-user')
  if (!userId) {
    userId = generateId()
    localStorage.setItem('travel-pledge-user', userId)
  }
  return userId
}

function getMockData(): Pledge[] {
  const destinations = [
    '云南大理', '西藏拉萨', '四川成都', '浙江杭州', '福建厦门',
    '海南三亚', '陕西西安', '广西桂林', '青海西宁', '新疆伊犁',
    '湖南张家界', '安徽黄山', '山东青岛', '辽宁大连', '内蒙古呼伦贝尔',
    '泰国曼谷', '日本东京', '韩国首尔', '新加坡', '印度尼西亚巴厘岛'
  ]
  const names = ['李小明', '王晓华', '张大伟', '刘美丽', '陈志强', '周雅婷', '吴俊杰', '郑思琪']
  const categories: PledgeCategory[] = ['plastic', 'transport', 'local', 'animal']
  const descriptions = [
    '全程自带水杯和餐具，拒绝一次性塑料制品，购物使用环保袋，为海洋保护尽一份力。',
    '选择公共交通和共享单车出行，短途步行，减少碳排放，让每一次出行都绿色环保。',
    '住当地民宿，吃农家菜，购买手工艺品支持本地经济，让旅行真正造福目的地社区。',
    '拒绝观看动物表演，不购买野生动物制品，选择生态友好的景区，尊重每一个生命。',
    '自带洗漱用品，不使用酒店一次性用品，垃圾分类投放，让青山绿水永驻。',
    '优先选择高铁和火车出行，避免短途飞行，用实际行动支持低碳生活方式。',
    '在当地市场采购食材，和当地人学做家常菜，体验最真实的风土人情。',
    '参与海滩清洁活动，记录遇到的野生动物，用照片唤起更多人的保护意识。'
  ]
  const summaryTexts = [
    '今天成功拒绝了5个一次性塑料袋，店主都为我点赞！',
    '坐公交车游览整个古城，既省钱又环保，还认识了当地朋友。',
    '在农家乐帮忙摘菜，吃到了最新鲜的蔬菜，体验太棒了。',
    '参观了野生动物救助中心，了解到很多保护知识，收获满满。',
    '自带的水杯派上了大用场，景区的直饮水站很方便。',
    '骑行30公里环湖，风景绝美，身体也得到了锻炼。',
    '买了当地老奶奶手工编织的篮子，好看又实用。',
    '拍到了难得一见的候鸟，向导说这是保护环境的成果。'
  ]

  const mockPledges: Pledge[] = []
  const today = new Date()

  for (let i = 0; i < 25; i++) {
    const cat = categories[i % 4]
    const milestoneCount = Math.floor(Math.random() * 5)
    const milestones: Milestone[] = []

    for (let j = 0; j < milestoneCount; j++) {
      const mDate = new Date(today)
      mDate.setDate(mDate.getDate() - j)
      milestones.push({
        id: generateId(),
        date: mDate.toISOString().split('T')[0],
        summary: summaryTexts[(i + j) % summaryTexts.length]
      })
    }

    const totalMilestones = Math.max(milestoneCount, 3)
    const depDate = new Date(today)
    depDate.setDate(depDate.getDate() - Math.floor(Math.random() * 30))

    mockPledges.push({
      id: generateId(),
      userId: 'user-' + (i % 8),
      userName: names[i % names.length],
      destination: destinations[i % destinations.length],
      departureDate: depDate.toISOString().split('T')[0],
      category: cat,
      description: descriptions[i % descriptions.length],
      progress: milestoneCount > 0 ? Math.min(Math.round((milestoneCount / totalMilestones) * 100), 100) : 0,
      milestones,
      createdAt: depDate.toISOString()
    })
  }

  writeStorage(mockPledges)
  return mockPledges
}
