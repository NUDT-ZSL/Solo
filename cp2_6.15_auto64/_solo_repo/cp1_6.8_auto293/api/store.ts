import { v4 as uuidv4 } from 'uuid'

export interface InvitedFriend {
  id: string
  email: string
  name: string
  avatar: string
  status: 'pending' | 'accepted'
}

export interface Capsule {
  id: string
  year: number
  title: string
  events: string[]
  mood: string
  photos: string[]
  unlockYear: number
  createdAt: string
  isPublic: boolean
  shareId?: string
  invitedFriends: InvitedFriend[]
}

export interface Countdown {
  years: number
  months: number
  days: number
  progress: number
}

const capsules: Capsule[] = [
  {
    id: uuidv4(),
    year: 2024,
    title: '毕业时光',
    events: ['参加了毕业典礼', '和室友拍了毕业照', '最后一次聚餐'],
    mood: '怀旧',
    photos: ['https://picsum.photos/seed/grad1/400/300', 'https://picsum.photos/seed/grad2/400/300'],
    unlockYear: 2025,
    createdAt: '2024-06-15T10:00:00.000Z',
    isPublic: true,
    shareId: uuidv4(),
    invitedFriends: [
      { id: uuidv4(), email: 'friend1@example.com', name: '小明', avatar: 'https://picsum.photos/seed/avatar1/100/100', status: 'accepted' },
      { id: uuidv4(), email: 'friend2@example.com', name: '小红', avatar: 'https://picsum.photos/seed/avatar2/100/100', status: 'pending' }
    ]
  },
  {
    id: uuidv4(),
    year: 2023,
    title: '旅行记忆',
    events: ['去了一趟云南', '在洱海边骑行', '品尝了当地美食'],
    mood: '快乐',
    photos: ['https://picsum.photos/seed/travel1/400/300', 'https://picsum.photos/seed/travel2/400/300', 'https://picsum.photos/seed/travel3/400/300'],
    unlockYear: 2024,
    createdAt: '2023-08-20T08:30:00.000Z',
    isPublic: false,
    invitedFriends: [
      { id: uuidv4(), email: 'traveler@example.com', name: '旅行者', avatar: 'https://picsum.photos/seed/avatar3/100/100', status: 'accepted' }
    ]
  },
  {
    id: uuidv4(),
    year: 2026,
    title: '新年愿望',
    events: ['写下了新年计划', '和朋友们一起跨年', '放飞了许愿灯'],
    mood: '期待',
    photos: ['https://picsum.photos/seed/newyear1/400/300'],
    unlockYear: 2028,
    createdAt: '2026-01-01T00:00:00.000Z',
    isPublic: false,
    invitedFriends: []
  },
  {
    id: uuidv4(),
    year: 2026,
    title: '十年之约',
    events: ['立下了职业目标', '开始学习新技能', '坚持每天锻炼'],
    mood: '憧憬',
    photos: ['https://picsum.photos/seed/goal1/400/300', 'https://picsum.photos/seed/goal2/400/300'],
    unlockYear: 2030,
    createdAt: '2026-03-10T14:00:00.000Z',
    isPublic: true,
    shareId: uuidv4(),
    invitedFriends: [
      { id: uuidv4(), email: 'partner@example.com', name: '伙伴', avatar: 'https://picsum.photos/seed/avatar4/100/100', status: 'pending' }
    ]
  },
  {
    id: uuidv4(),
    year: 2025,
    title: '友情岁月',
    events: ['和老朋友重逢', '一起看了演唱会', '深夜聊天到天亮'],
    mood: '温暖',
    photos: ['https://picsum.photos/seed/friend1/400/300', 'https://picsum.photos/seed/friend2/400/300'],
    unlockYear: 2027,
    createdAt: '2025-11-05T20:00:00.000Z',
    isPublic: false,
    invitedFriends: [
      { id: uuidv4(), email: 'oldfriend@example.com', name: '老友', avatar: 'https://picsum.photos/seed/avatar5/100/100', status: 'accepted' },
      { id: uuidv4(), email: 'newfriend@example.com', name: '新朋友', avatar: 'https://picsum.photos/seed/avatar6/100/100', status: 'pending' }
    ]
  }
]

export function getAllCapsules(): Capsule[] {
  return capsules
}

export function getCapsuleById(id: string): Capsule | undefined {
  return capsules.find(c => c.id === id)
}

export function createCapsule(data: Omit<Capsule, 'id' | 'createdAt' | 'invitedFriends'>): Capsule {
  const capsule: Capsule = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    invitedFriends: []
  }
  capsules.push(capsule)
  return capsule
}

export function updateCapsule(id: string, data: Partial<Omit<Capsule, 'id' | 'createdAt'>>): Capsule | undefined {
  const index = capsules.findIndex(c => c.id === id)
  if (index === -1) return undefined
  capsules[index] = { ...capsules[index], ...data }
  return capsules[index]
}

export function deleteCapsule(id: string): boolean {
  const index = capsules.findIndex(c => c.id === id)
  if (index === -1) return false
  capsules.splice(index, 1)
  return true
}

export function addFriend(capsuleId: string, email: string, name: string): Capsule | undefined {
  const capsule = capsules.find(c => c.id === capsuleId)
  if (!capsule) return undefined
  const friend: InvitedFriend = {
    id: uuidv4(),
    email,
    name,
    avatar: `https://picsum.photos/seed/${uuidv4()}/100/100`,
    status: 'pending'
  }
  capsule.invitedFriends.push(friend)
  return capsule
}

export function generateShareLink(capsuleId: string): Capsule | undefined {
  const capsule = capsules.find(c => c.id === capsuleId)
  if (!capsule) return undefined
  capsule.shareId = uuidv4()
  capsule.isPublic = true
  return capsule
}

export function getCapsuleByShareId(shareId: string): Capsule | undefined {
  return capsules.find(c => c.shareId === shareId)
}

export function calculateCountdown(capsule: Capsule): Countdown {
  const now = new Date()
  const unlockDate = new Date(`${capsule.unlockYear}-01-01T00:00:00.000Z`)
  const createdDate = new Date(capsule.createdAt)

  if (now >= unlockDate) {
    return { years: 0, months: 0, days: 0, progress: 1 }
  }

  const totalMs = unlockDate.getTime() - createdDate.getTime()
  const elapsedMs = now.getTime() - createdDate.getTime()
  const remainingMs = unlockDate.getTime() - now.getTime()

  const progress = Math.min(Math.max(elapsedMs / totalMs, 0), 1)

  const totalDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
  const years = Math.floor(totalDays / 365)
  const months = Math.floor((totalDays % 365) / 30)
  const days = totalDays % 30

  return { years, months, days, progress }
}
