import { v4 as uuidv4 } from 'uuid'

export type PlantType = 'succulent' | 'foliage' | 'flowering' | 'herb' | 'vegetable'
export type PlantStatus = 'offering' | 'seeking'

export interface Plant {
  id: string
  name: string
  variety: string
  age: string
  description: string
  type: PlantType
  status: PlantStatus
  ownerId: string
  ownerName: string
  region: string
  imageUrl?: string
  createdAt: number
}

export interface ExchangeRequest {
  id: string
  plantId: string
  requesterId: string
  requesterName: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

export interface User {
  id: string
  name: string
  avatar?: string
  bio: string
  region: string
}

export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  maxParticipants: number
  creatorId: string
  creatorName: string
  participants: string[]
  participantNames: string[]
  status: 'upcoming' | 'ongoing' | 'ended'
  ratings: number[]
  createdAt: number
}

export const plantTypeLabels: Record<PlantType, string> = {
  succulent: '多肉',
  foliage: '观叶',
  flowering: '开花',
  herb: '香草',
  vegetable: '蔬果'
}

export const regions = ['华北', '华东', '华南', '华中', '西南', '西北', '东北']

class DataStore {
  private plants: Plant[] = []
  private users: User[] = []
  private exchangeRequests: ExchangeRequest[] = []
  private events: Event[] = []
  private currentUserId: string = 'user-1'

  constructor() {
    this.initializeMockData()
  }

  private initializeMockData() {
    this.users = [
      { id: 'user-1', name: '园艺爱好者小明', bio: '喜欢多肉和观叶植物，养了5年花', region: '华东' },
      { id: 'user-2', name: '花仙子', bio: '香草种植达人，欢迎交流', region: '华北' },
      { id: 'user-3', name: '绿手指', bio: '蔬果种植爱好者', region: '华南' },
      { id: 'user-4', name: '植物控', bio: '什么都想养养看', region: '华东' },
      { id: 'user-5', name: '多肉达人', bio: '专注多肉十年', region: '西南' }
    ]

    this.plants = [
      {
        id: 'plant-1',
        name: '玉露',
        variety: '姬玉露',
        age: '2年',
        description: '窗面透亮，状态很好，多出来的小苗可以交换',
        type: 'succulent',
        status: 'offering',
        ownerId: 'user-1',
        ownerName: '园艺爱好者小明',
        region: '华东',
        createdAt: Date.now() - 86400000
      },
      {
        id: 'plant-2',
        name: '绿萝',
        variety: '大叶绿萝',
        age: '1年',
        description: '长得太茂盛了，剪了很多枝条，可以水培交换',
        type: 'foliage',
        status: 'offering',
        ownerId: 'user-2',
        ownerName: '花仙子',
        region: '华北',
        createdAt: Date.now() - 172800000
      },
      {
        id: 'plant-3',
        name: '月季',
        variety: '粉龙沙宝石',
        age: '3年',
        description: '开花机器，每年春天爆花，想换其他品种月季',
        type: 'flowering',
        status: 'offering',
        ownerId: 'user-3',
        ownerName: '绿手指',
        region: '华南',
        createdAt: Date.now() - 259200000
      },
      {
        id: 'plant-4',
        name: '薄荷',
        variety: '留兰香薄荷',
        age: '半年',
        description: '味道浓郁，可以泡茶，交换其他香草',
        type: 'herb',
        status: 'offering',
        ownerId: 'user-2',
        ownerName: '花仙子',
        region: '华北',
        createdAt: Date.now() - 345600000
      },
      {
        id: 'plant-5',
        name: '番茄苗',
        variety: '千禧小番茄',
        age: '1个月',
        description: '自己育的苗，壮实健康，多了几棵',
        type: 'vegetable',
        status: 'offering',
        ownerId: 'user-3',
        ownerName: '绿手指',
        region: '华南',
        createdAt: Date.now() - 432000000
      },
      {
        id: 'plant-6',
        name: '熊童子',
        variety: '绿熊',
        age: '1年半',
        description: '毛茸茸的小熊爪，很可爱',
        type: 'succulent',
        status: 'offering',
        ownerId: 'user-5',
        ownerName: '多肉达人',
        region: '西南',
        createdAt: Date.now() - 518400000
      },
      {
        id: 'plant-7',
        name: '龟背竹',
        variety: '普通龟背',
        age: '2年',
        description: '已经开背了，叶片很大',
        type: 'foliage',
        status: 'offering',
        ownerId: 'user-4',
        ownerName: '植物控',
        region: '华东',
        createdAt: Date.now() - 604800000
      },
      {
        id: 'plant-8',
        name: '薰衣草',
        variety: '英国薰衣草',
        age: '1年',
        description: '紫色花穗，香气怡人',
        type: 'herb',
        status: 'offering',
        ownerId: 'user-1',
        ownerName: '园艺爱好者小明',
        region: '华东',
        createdAt: Date.now() - 691200000
      },
      {
        id: 'plant-9',
        name: '生石花',
        variety: '混合种',
        age: '3年',
        description: '屁股花，有十几个品种',
        type: 'succulent',
        status: 'seeking',
        ownerId: 'user-4',
        ownerName: '植物控',
        region: '华东',
        createdAt: Date.now() - 777600000
      },
      {
        id: 'plant-10',
        name: '蝴蝶兰',
        variety: '大花蝴蝶兰',
        age: '2年',
        description: '想求购/交换大花品种蝴蝶兰',
        type: 'flowering',
        status: 'seeking',
        ownerId: 'user-5',
        ownerName: '多肉达人',
        region: '西南',
        createdAt: Date.now() - 864000000
      }
    ]

    this.exchangeRequests = [
      {
        id: 'req-1',
        plantId: 'plant-1',
        requesterId: 'user-2',
        requesterName: '花仙子',
        message: '我有绿萝可以交换吗？',
        status: 'pending',
        createdAt: Date.now() - 3600000
      },
      {
        id: 'req-2',
        plantId: 'plant-1',
        requesterId: 'user-3',
        requesterName: '绿手指',
        message: '我有月季小苗想交换',
        status: 'pending',
        createdAt: Date.now() - 7200000
      }
    ]

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 86400000)
    const nextWeek = new Date(now.getTime() + 7 * 86400000)
    const yesterday = new Date(now.getTime() - 86400000)

    this.events = [
      {
        id: 'event-1',
        title: '本周末公园多肉交换',
        description: '周六上午中央公园多肉植物交换活动，欢迎带自己的多肉来交流',
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00-12:00',
        location: '中央公园东门草坪',
        maxParticipants: 30,
        creatorId: 'user-1',
        creatorName: '园艺爱好者小明',
        participants: ['user-1', 'user-2', 'user-5'],
        participantNames: ['园艺爱好者小明', '花仙子', '多肉达人'],
        status: 'upcoming',
        ratings: [],
        createdAt: Date.now() - 172800000
      },
      {
        id: 'event-2',
        title: '香草种植分享会',
        description: '一起交流香草种植经验，现场交换香草苗',
        date: nextWeek.toISOString().split('T')[0],
        time: '14:00-16:00',
        location: '社区活动中心',
        maxParticipants: 20,
        creatorId: 'user-2',
        creatorName: '花仙子',
        participants: ['user-2', 'user-4'],
        participantNames: ['花仙子', '植物控'],
        status: 'upcoming',
        ratings: [],
        createdAt: Date.now() - 259200000
      },
      {
        id: 'event-3',
        title: '春季花友见面会',
        description: '大型植物交换活动，各类植物都可以带过来',
        date: yesterday.toISOString().split('T')[0],
        time: '09:00-17:00',
        location: '市植物园',
        maxParticipants: 100,
        creatorId: 'user-3',
        creatorName: '绿手指',
        participants: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
        participantNames: ['园艺爱好者小明', '花仙子', '绿手指', '植物控', '多肉达人'],
        status: 'ended',
        ratings: [5, 4, 5, 4],
        createdAt: Date.now() - 604800000
      }
    ]
  }

  getCurrentUser(): User {
    const user = this.users.find(u => u.id === this.currentUserId)
    if (!user) throw new Error('User not found')
    return user
  }

  getPlants(status?: PlantStatus, type?: PlantType, region?: string, search?: string): Plant[] {
    let result = [...this.plants]
    if (status) result = result.filter(p => p.status === status)
    if (type) result = result.filter(p => p.type === type)
    if (region) result = result.filter(p => p.region === region)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.variety.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
      )
    }
    return result.sort((a, b) => b.createdAt - a.createdAt)
  }

  getPlantById(id: string): Plant | undefined {
    return this.plants.find(p => p.id === id)
  }

  addPlant(plant: Omit<Plant, 'id' | 'createdAt' | 'ownerId' | 'ownerName'>): Plant {
    const user = this.getCurrentUser()
    const newPlant: Plant = {
      ...plant,
      id: uuidv4(),
      createdAt: Date.now(),
      ownerId: user.id,
      ownerName: user.name
    }
    this.plants.unshift(newPlant)
    return newPlant
  }

  getExchangeRequests(plantId: string): ExchangeRequest[] {
    return this.exchangeRequests
      .filter(r => r.plantId === plantId && r.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  addExchangeRequest(plantId: string, message: string): ExchangeRequest {
    const user = this.getCurrentUser()
    const request: ExchangeRequest = {
      id: uuidv4(),
      plantId,
      requesterId: user.id,
      requesterName: user.name,
      message,
      status: 'pending',
      createdAt: Date.now()
    }
    this.exchangeRequests.push(request)
    return request
  }

  updateExchangeRequestStatus(requestId: string, status: 'accepted' | 'rejected'): boolean {
    const request = this.exchangeRequests.find(r => r.id === requestId)
    if (request) {
      request.status = status
      return true
    }
    return false
  }

  getEvents(status?: 'upcoming' | 'ongoing' | 'ended'): Event[] {
    let result = [...this.events]
    if (status) result = result.filter(e => e.status === status)
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  getEventById(id: string): Event | undefined {
    return this.events.find(e => e.id === id)
  }

  addEvent(event: Omit<Event, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'participants' | 'participantNames' | 'status' | 'ratings'>): Event {
    const user = this.getCurrentUser()
    const newEvent: Event = {
      ...event,
      id: uuidv4(),
      createdAt: Date.now(),
      creatorId: user.id,
      creatorName: user.name,
      participants: [user.id],
      participantNames: [user.name],
      status: 'upcoming',
      ratings: []
    }
    this.events.unshift(newEvent)
    return newEvent
  }

  joinEvent(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId)
    const user = this.getCurrentUser()
    if (event && !event.participants.includes(user.id) && event.participants.length < event.maxParticipants) {
      event.participants.push(user.id)
      event.participantNames.push(user.name)
      return true
    }
    return false
  }

  leaveEvent(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId)
    const user = this.getCurrentUser()
    if (event && event.participants.includes(user.id)) {
      event.participants = event.participants.filter(id => id !== user.id)
      event.participantNames = event.participantNames.filter(name => name !== user.name)
      return true
    }
    return false
  }

  rateEvent(eventId: string, rating: number): boolean {
    const event = this.events.find(e => e.id === eventId)
    if (event && event.status === 'ended') {
      event.ratings.push(rating)
      return true
    }
    return false
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id)
  }
}

export const dataStore = new DataStore()
