import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, User, Skill, Match, SkillCategory, SkillLevel, SkillType } from './db.js'

const router = Router()

const avatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe'
]

router.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: '用户名不能为空' })
    }

    const id = uuidv4()
    const user: User = {
      id,
      name,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      createdAt: Date.now()
    }

    const created = await db.users.insert(user)
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '注册失败' })
  }
})

router.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await db.users.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '获取用户失败' })
  }
})

router.post('/api/skills', async (req: Request, res: Response) => {
  try {
    const { userId, name, category, level, description, type } = req.body as {
      userId: string
      name: string
      category: SkillCategory
      level: SkillLevel
      description: string
      type: SkillType
    }

    if (!userId || !name || !category || !level || !type) {
      return res.status(400).json({ error: '缺少必要字段' })
    }

    if (description && description.length > 100) {
      return res.status(400).json({ error: '描述不能超过100字' })
    }

    const skill: Skill = {
      id: uuidv4(),
      userId,
      name,
      category,
      level,
      description: description || '',
      type,
      createdAt: Date.now()
    }

    const created = await db.skills.insert(skill)
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '发布技能失败' })
  }
})

router.get('/api/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await db.skills.findAll()
    const enriched = []
    for (const skill of skills) {
      const user = await db.users.findById(skill.userId)
      enriched.push({ ...skill, userName: user?.name, userAvatar: user?.avatar })
    }
    res.json(enriched)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '获取技能列表失败' })
  }
})

router.get('/api/users/:userId/skills', async (req: Request, res: Response) => {
  try {
    const skills = await db.skills.findByUserId(req.params.userId)
    res.json(skills)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '获取用户技能失败' })
  }
})

router.get('/api/matches/suggest/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId
    const mySkills = await db.skills.findByUserId(userId)
    const allSkills = await db.skills.findAll()
    const users = await db.users.findAll()

    const userMap = new Map(users.map(u => [u.id, u]))

    const myLearn = mySkills.filter(s => s.type === 'learn')
    const myTeach = mySkills.filter(s => s.type === 'teach')

    const levelScore: Record<SkillLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 }

    const suggestions: any[] = []
    const processedPairs = new Set<string>()

    for (const wantToLearn of myLearn) {
      for (const canTeach of allSkills) {
        if (canTeach.userId === userId || canTeach.type !== 'teach') continue
        if (canTeach.name !== wantToLearn.name) continue

        for (const wantToTeach of myTeach) {
          for (const theyLearn of allSkills) {
            if (theyLearn.userId !== canTeach.userId || theyLearn.type !== 'learn') continue
            if (theyLearn.name !== wantToTeach.name) continue

            const pairKey = [userId, canTeach.userId].sort().join('_')
            if (processedPairs.has(pairKey)) continue
            processedPairs.add(pairKey)

            const levelMatchA = 1 - Math.abs(levelScore[wantToLearn.level] - levelScore[canTeach.level]) / 4
            const levelMatchB = 1 - Math.abs(levelScore[wantToTeach.level] - levelScore[theyLearn.level]) / 4
            const timeBonus = Math.min(1, (Date.now() - Math.min(wantToLearn.createdAt, wantToTeach.createdAt, canTeach.createdAt, theyLearn.createdAt)) / (1000 * 60 * 60 * 24 * 7))

            const score = (levelMatchA + levelMatchB) / 2 * 0.7 + timeBonus * 0.3

            suggestions.push({
              partner: userMap.get(canTeach.userId),
              skillIWant: wantToLearn,
              skillTeachMe: canTeach,
              skillTeachThem: wantToTeach,
              skillTheyWant: theyLearn,
              score
            })
          }
        }
      }
    }

    suggestions.sort((a, b) => b.score - a.score)
    res.json(suggestions.slice(0, 10))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '获取匹配建议失败' })
  }
})

router.post('/api/matches', async (req: Request, res: Response) => {
  try {
    const { userIdA, userIdB, skillAId, skillBId } = req.body

    if (!userIdA || !userIdB || !skillAId || !skillBId) {
      return res.status(400).json({ error: '缺少必要字段' })
    }

    const match: Match = {
      id: uuidv4(),
      userIdA,
      userIdB,
      skillAId,
      skillBId,
      status: 'pending',
      createdAt: Date.now()
    }

    const created = await db.matches.insert(match)
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '创建匹配失败' })
  }
})

router.get('/api/users/:userId/matches', async (req: Request, res: Response) => {
  try {
    const matches = await db.matches.findByUserId(req.params.userId)
    const enriched = []
    for (const m of matches) {
      const partnerId = m.userIdA === req.params.userId ? m.userIdB : m.userIdA
      const partner = await db.users.findById(partnerId)
      const skillA = await db.skills.findById(m.skillAId)
      const skillB = await db.skills.findById(m.skillBId)
      enriched.push({ ...m, partner, skillA, skillB })
    }
    res.json(enriched)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '获取匹配列表失败' })
  }
})

router.put('/api/matches/:id', async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '状态无效' })
    }
    const updated = await db.matches.update(req.params.id, { status })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '更新匹配失败' })
  }
})

router.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

export default router
