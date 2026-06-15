import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

interface Supply {
  name: string
  total: number
}

interface Activity {
  id: string
  name: string
  date: string
  maxParticipants: number
  supplies: Supply[]
}

interface Signup {
  id: string
  activityId: string
  nickname: string
  phone: string
  registeredAt: string
  confirmed: boolean
  supplies: string[]
}

const activities: Activity[] = [
  {
    id: 'act-1',
    name: '秋季长城徒步',
    date: '2026-10-15',
    maxParticipants: 30,
    supplies: [
      { name: '登山杖', total: 15 },
      { name: '头灯', total: 5 },
      { name: '急救包', total: 2 },
    ],
  },
  {
    id: 'act-2',
    name: '星空露营之夜',
    date: '2026-08-20',
    maxParticipants: 25,
    supplies: [
      { name: '帐篷', total: 10 },
      { name: '睡袋', total: 15 },
      { name: '防潮垫', total: 10 },
      { name: '炉具', total: 5 },
    ],
  },
  {
    id: 'act-3',
    name: '攀岩挑战赛',
    date: '2026-09-05',
    maxParticipants: 20,
    supplies: [
      { name: '安全绳', total: 8 },
      { name: '头盔', total: 10 },
      { name: '安全带', total: 6 },
      { name: '粉袋', total: 5 },
    ],
  },
  {
    id: 'act-4',
    name: '溪谷溯溪探险',
    date: '2026-07-18',
    maxParticipants: 15,
    supplies: [
      { name: '救生衣', total: 10 },
      { name: '防水包', total: 8 },
      { name: '登山杖', total: 5 },
    ],
  },
  {
    id: 'act-5',
    name: '高山滑雪体验',
    date: '2026-12-10',
    maxParticipants: 25,
    supplies: [
      { name: '滑雪板', total: 10 },
      { name: '雪杖', total: 8 },
      { name: '护目镜', total: 10 },
      { name: '头盔', total: 8 },
    ],
  },
  {
    id: 'act-6',
    name: '森林定向越野',
    date: '2026-11-08',
    maxParticipants: 40,
    supplies: [
      { name: '指南针', total: 15 },
      { name: '地图', total: 20 },
      { name: '口哨', total: 15 },
      { name: '急救包', total: 10 },
    ],
  },
  {
    id: 'act-7',
    name: '海岸线徒步',
    date: '2026-09-22',
    maxParticipants: 35,
    supplies: [
      { name: '防晒霜', total: 20 },
      { name: '登山杖', total: 10 },
      { name: '头灯', total: 8 },
    ],
  },
  {
    id: 'act-8',
    name: '雪山登顶远征',
    date: '2027-01-15',
    maxParticipants: 12,
    supplies: [
      { name: '冰镐', total: 6 },
      { name: '冰爪', total: 6 },
      { name: '安全绳', total: 4 },
      { name: '头盔', total: 6 },
      { name: '高度计', total: 4 },
    ],
  },
]

const signups: Signup[] = [
  { id: 'sgn-1', activityId: 'act-1', nickname: '山野行者', phone: '13800001001', registeredAt: '2026-09-01T08:00:00Z', confirmed: true, supplies: ['登山杖', '头灯'] },
  { id: 'sgn-2', activityId: 'act-1', nickname: '林间漫步', phone: '13800001002', registeredAt: '2026-09-02T09:30:00Z', confirmed: true, supplies: ['登山杖'] },
  { id: 'sgn-3', activityId: 'act-1', nickname: '云端飞鸟', phone: '13800001003', registeredAt: '2026-09-03T10:15:00Z', confirmed: false, supplies: [] },
  { id: 'sgn-4', activityId: 'act-1', nickname: '风过无痕', phone: '13800001004', registeredAt: '2026-09-04T14:20:00Z', confirmed: true, supplies: ['头灯', '急救包'] },
  { id: 'sgn-5', activityId: 'act-1', nickname: '溪水潺潺', phone: '13800001005', registeredAt: '2026-09-05T16:45:00Z', confirmed: false, supplies: ['登山杖'] },
  { id: 'sgn-6', activityId: 'act-1', nickname: '岩石攀登', phone: '13800001006', registeredAt: '2026-09-06T07:00:00Z', confirmed: true, supplies: ['登山杖', '头灯', '急救包'] },
  { id: 'sgn-7', activityId: 'act-1', nickname: '晨露微光', phone: '13800001007', registeredAt: '2026-09-07T11:30:00Z', confirmed: true, supplies: ['登山杖'] },
  { id: 'sgn-8', activityId: 'act-1', nickname: '晚霞余晖', phone: '13800001008', registeredAt: '2026-09-08T13:00:00Z', confirmed: false, supplies: [] },

  { id: 'sgn-9', activityId: 'act-2', nickname: '星空守望', phone: '13800002001', registeredAt: '2026-07-10T08:00:00Z', confirmed: true, supplies: ['帐篷', '睡袋'] },
  { id: 'sgn-10', activityId: 'act-2', nickname: '篝火旅人', phone: '13800002002', registeredAt: '2026-07-11T09:00:00Z', confirmed: true, supplies: ['帐篷'] },
  { id: 'sgn-11', activityId: 'act-2', nickname: '月下独行', phone: '13800002003', registeredAt: '2026-07-12T10:30:00Z', confirmed: false, supplies: ['睡袋', '防潮垫'] },
  { id: 'sgn-12', activityId: 'act-2', nickname: '萤火虫光', phone: '13800002004', registeredAt: '2026-07-13T14:00:00Z', confirmed: true, supplies: ['帐篷', '睡袋', '炉具'] },
  { id: 'sgn-13', activityId: 'act-2', nickname: '银河拾梦', phone: '13800002005', registeredAt: '2026-07-14T16:00:00Z', confirmed: false, supplies: ['防潮垫'] },
  { id: 'sgn-14', activityId: 'act-2', nickname: '松涛阵阵', phone: '13800002006', registeredAt: '2026-07-15T07:30:00Z', confirmed: true, supplies: ['帐篷', '睡袋'] },

  { id: 'sgn-15', activityId: 'act-3', nickname: '壁虎游走', phone: '13800003001', registeredAt: '2026-08-01T08:00:00Z', confirmed: true, supplies: ['安全绳', '头盔', '安全带'] },
  { id: 'sgn-16', activityId: 'act-3', nickname: '岩壁舞者', phone: '13800003002', registeredAt: '2026-08-02T09:00:00Z', confirmed: true, supplies: ['安全绳', '头盔'] },
  { id: 'sgn-17', activityId: 'act-3', nickname: '鹰击长空', phone: '13800003003', registeredAt: '2026-08-03T11:00:00Z', confirmed: false, supplies: ['粉袋'] },
  { id: 'sgn-18', activityId: 'act-3', nickname: '悬壁之花', phone: '13800003004', registeredAt: '2026-08-04T13:30:00Z', confirmed: true, supplies: ['安全带', '头盔'] },
  { id: 'sgn-19', activityId: 'act-3', nickname: '石缝求生', phone: '13800003005', registeredAt: '2026-08-05T15:00:00Z', confirmed: false, supplies: ['头盔'] },

  { id: 'sgn-20', activityId: 'act-4', nickname: '水声潺潺', phone: '13800004001', registeredAt: '2026-06-20T08:00:00Z', confirmed: true, supplies: ['救生衣', '防水包'] },
  { id: 'sgn-21', activityId: 'act-4', nickname: '激流勇进', phone: '13800004002', registeredAt: '2026-06-21T09:00:00Z', confirmed: false, supplies: ['登山杖'] },
  { id: 'sgn-22', activityId: 'act-4', nickname: '清泉石上', phone: '13800004003', registeredAt: '2026-06-22T10:00:00Z', confirmed: true, supplies: ['救生衣'] },

  { id: 'sgn-23', activityId: 'act-5', nickname: '雪域雄鹰', phone: '13800005001', registeredAt: '2026-11-01T08:00:00Z', confirmed: true, supplies: ['滑雪板', '雪杖', '护目镜'] },
  { id: 'sgn-24', activityId: 'act-5', nickname: '冰原漫步', phone: '13800005002', registeredAt: '2026-11-02T09:00:00Z', confirmed: true, supplies: ['滑雪板', '头盔'] },
  { id: 'sgn-25', activityId: 'act-5', nickname: '白雪飘飘', phone: '13800005003', registeredAt: '2026-11-03T10:30:00Z', confirmed: false, supplies: ['护目镜'] },
  { id: 'sgn-26', activityId: 'act-5', nickname: '雪山飞狐', phone: '13800005004', registeredAt: '2026-11-04T12:00:00Z', confirmed: true, supplies: ['雪杖', '头盔'] },
  { id: 'sgn-27', activityId: 'act-5', nickname: '冬日暖阳', phone: '13800005005', registeredAt: '2026-11-05T14:00:00Z', confirmed: false, supplies: [] },

  { id: 'sgn-28', activityId: 'act-6', nickname: '丛林探险', phone: '13800006001', registeredAt: '2026-10-01T08:00:00Z', confirmed: true, supplies: ['指南针', '地图'] },
  { id: 'sgn-29', activityId: 'act-6', nickname: '方位猎手', phone: '13800006002', registeredAt: '2026-10-02T09:00:00Z', confirmed: true, supplies: ['指南针', '口哨'] },
  { id: 'sgn-30', activityId: 'act-6', nickname: '迷雾追踪', phone: '13800006003', registeredAt: '2026-10-03T10:00:00Z', confirmed: false, supplies: ['地图', '急救包'] },
  { id: 'sgn-31', activityId: 'act-6', nickname: '绿色足迹', phone: '13800006004', registeredAt: '2026-10-04T11:30:00Z', confirmed: true, supplies: ['指南针', '地图', '口哨'] },
  { id: 'sgn-32', activityId: 'act-6', nickname: '密林信号', phone: '13800006005', registeredAt: '2026-10-05T13:00:00Z', confirmed: false, supplies: ['口哨'] },
  { id: 'sgn-33', activityId: 'act-6', nickname: '树冠守望', phone: '13800006006', registeredAt: '2026-10-06T14:30:00Z', confirmed: true, supplies: ['地图'] },
  { id: 'sgn-34', activityId: 'act-6', nickname: '荆棘前行', phone: '13800006007', registeredAt: '2026-10-07T16:00:00Z', confirmed: true, supplies: ['指南针', '急救包'] },

  { id: 'sgn-35', activityId: 'act-7', nickname: '海风拂面', phone: '13800007001', registeredAt: '2026-08-15T08:00:00Z', confirmed: true, supplies: ['防晒霜', '登山杖'] },
  { id: 'sgn-36', activityId: 'act-7', nickname: '潮汐行者', phone: '13800007002', registeredAt: '2026-08-16T09:00:00Z', confirmed: false, supplies: ['头灯'] },
  { id: 'sgn-37', activityId: 'act-7', nickname: '浪花飞舞', phone: '13800007003', registeredAt: '2026-08-17T10:00:00Z', confirmed: true, supplies: ['防晒霜', '登山杖', '头灯'] },
  { id: 'sgn-38', activityId: 'act-7', nickname: '贝壳拾遗', phone: '13800007004', registeredAt: '2026-08-18T11:00:00Z', confirmed: true, supplies: ['防晒霜'] },

  { id: 'sgn-39', activityId: 'act-8', nickname: '冰雪勇士', phone: '13800008001', registeredAt: '2026-12-01T08:00:00Z', confirmed: true, supplies: ['冰镐', '冰爪', '安全绳', '头盔'] },
  { id: 'sgn-40', activityId: 'act-8', nickname: '高原之鹰', phone: '13800008002', registeredAt: '2026-12-02T09:00:00Z', confirmed: true, supplies: ['冰爪', '头盔', '高度计'] },
  { id: 'sgn-41', activityId: 'act-8', nickname: '雪线之上', phone: '13800008003', registeredAt: '2026-12-03T10:00:00Z', confirmed: false, supplies: ['冰镐'] },
]

function delay(ms?: number): Promise<void> {
  const d = ms ?? Math.floor(Math.random() * 200) + 100
  return new Promise((resolve) => setTimeout(resolve, d))
}

function computeAllocations(activityId: string) {
  const activity = activities.find((a) => a.id === activityId)
  if (!activity) return null
  const activitySignups = signups.filter((s) => s.activityId === activityId)
  return {
    ...activity,
    signupCount: activitySignups.length,
    supplies: activity.supplies.map((supply) => ({
      name: supply.name,
      total: supply.total,
      allocated: activitySignups.filter((s) => s.supplies.includes(supply.name)).length,
    })),
  }
}

export function registerRoutes(router: Router): void {
  router.get('/api/activities', async (_req: Request, res: Response) => {
    await delay()
    const result = activities.map((a) => computeAllocations(a.id))
    res.json(result)
  })

  router.get('/api/signups', async (req: Request, res: Response) => {
    await delay()
    const activityId = req.query.activityId as string
    if (!activityId) {
      res.status(400).json({ error: 'activityId is required' })
      return
    }
    const result = signups.filter((s) => s.activityId === activityId)
    res.json(result)
  })

  router.post('/api/signups', async (req: Request, res: Response) => {
    await delay()
    const { activityId, nickname, phone } = req.body
    if (!activityId || !nickname || !phone) {
      res.status(400).json({ error: 'activityId, nickname and phone are required' })
      return
    }
    if (!/^\d{11}$/.test(phone)) {
      res.status(400).json({ error: '手机号必须为11位数字' })
      return
    }
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) {
      res.status(404).json({ error: '活动不存在' })
      return
    }
    const activitySignups = signups.filter((s) => s.activityId === activityId)
    if (activitySignups.length >= activity.maxParticipants) {
      res.status(400).json({ error: '报名人数已满' })
      return
    }
    const newSignup: Signup = {
      id: uuidv4(),
      activityId,
      nickname,
      phone,
      registeredAt: new Date().toISOString(),
      confirmed: false,
      supplies: [],
    }
    signups.push(newSignup)
    const updatedActivity = computeAllocations(activityId)
    res.json({ signup: newSignup, activity: updatedActivity })
  })

  router.delete('/api/signups/:id', async (req: Request, res: Response) => {
    await delay()
    const { id } = req.params
    const index = signups.findIndex((s) => s.id === id)
    if (index === -1) {
      res.status(404).json({ error: '报名记录不存在' })
      return
    }
    const removed = signups.splice(index, 1)[0]
    const updatedActivity = computeAllocations(removed.activityId)
    res.json({ signup: removed, activity: updatedActivity })
  })

  router.put('/api/activities/:id/supplies', async (req: Request, res: Response) => {
    await delay()
    const { id } = req.params
    const { signupId, supplies } = req.body
    if (!signupId || !Array.isArray(supplies)) {
      res.status(400).json({ error: 'signupId and supplies array are required' })
      return
    }
    const signup = signups.find((s) => s.id === signupId)
    if (!signup) {
      res.status(404).json({ error: '报名记录不存在' })
      return
    }
    if (signup.activityId !== id) {
      res.status(400).json({ error: '报名记录不属于该活动' })
      return
    }
    signup.supplies = supplies
    const updatedActivity = computeAllocations(id)
    res.json({ signup, activity: updatedActivity })
  })
}
