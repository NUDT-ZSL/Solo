import express, { Request, Response } from 'express'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 5000

app.use(express.json({ limit: '10mb' }))

const dataDir = path.join(__dirname, '..', 'data')
const projectsDB = Datastore.create({
  filename: path.join(dataDir, 'projects.db'),
  autoload: true,
}) as any
const paragraphsDB = Datastore.create({
  filename: path.join(dataDir, 'paragraphs.db'),
  autoload: true,
}) as any
const confirmationsDB = Datastore.create({
  filename: path.join(dataDir, 'confirmations.db'),
  autoload: true,
}) as any

const STAGES = ['创作', '编曲', '排练', '录制', '发布']
const COLOR_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899']

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function getRandomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
}

app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const { name, genres, description, leaderName, leaderAvatar } = req.body
    if (!name || !leaderName) {
      return res.status(400).json({ error: '项目名称和队长名称不能为空' })
    }

    const project = {
      _id: uuidv4(),
      name,
      genres: genres || [],
      description: description || '',
      status: '创作中',
      themeColor: getRandomColor(),
      inviteCode: generateInviteCode(),
      leaderId: uuidv4(),
      members: [
        {
          id: uuidv4(),
          name: leaderName,
          avatar: leaderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leaderName)}`,
          role: '队长',
        },
      ],
      timeline: [
        { stage: '项目创建', date: new Date().toISOString(), completed: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const inserted = await projectsDB.insert(project)

    for (let i = 0; i < STAGES.length; i++) {
      await confirmationsDB.insert({
        _id: uuidv4(),
        projectId: project._id,
        stageIndex: i,
        stageName: STAGES[i],
        confirmedBy: [],
        allConfirmed: false,
      })
    }

    res.status(201).json(inserted)
  } catch (err) {
    console.error('创建项目失败:', err)
    res.status(500).json({ error: '创建项目失败' })
  }
})

app.get('/api/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await projectsDB.find({}).sort({ updatedAt: -1 })
    res.json(projects)
  } catch (err) {
    console.error('获取项目列表失败:', err)
    res.status(500).json({ error: '获取项目列表失败' })
  }
})

app.get('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const project = await projectsDB.findOne({ _id: id })
    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    const confirmations = await confirmationsDB.find({ projectId: id }).sort({ stageIndex: 1 })
    res.json({ ...project, confirmations })
  } catch (err) {
    console.error('获取项目详情失败:', err)
    res.status(500).json({ error: '获取项目详情失败' })
  }
})

app.post('/api/projects/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { inviteCode, memberName, memberAvatar } = req.body

    const project = await projectsDB.findOne({ _id: id })
    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    if (project.inviteCode !== inviteCode) {
      return res.status(400).json({ error: '邀请码错误' })
    }

    const newMember = {
      id: uuidv4(),
      name: memberName,
      avatar: memberAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(memberName)}`,
      role: '成员',
    }

    project.members.push(newMember)
    project.updatedAt = new Date().toISOString()

    await projectsDB.update({ _id: id }, { $set: { members: project.members, updatedAt: project.updatedAt } })

    res.json({ member: newMember, project })
  } catch (err) {
    console.error('加入项目失败:', err)
    res.status(500).json({ error: '加入项目失败' })
  }
})

app.get('/api/projects/:id/paragraphs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const paragraphs = await paragraphsDB.find({ projectId: id }).sort({ order: 1 })
    res.json(paragraphs)
  } catch (err) {
    console.error('获取段落失败:', err)
    res.status(500).json({ error: '获取段落失败' })
  }
})

app.post('/api/projects/:id/paragraphs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { paragraphs } = req.body

    await paragraphsDB.remove({ projectId: id }, { multi: true })

    if (Array.isArray(paragraphs) && paragraphs.length > 0) {
      const toInsert = paragraphs.map((p: any) => ({
        ...p,
        _id: p._id || uuidv4(),
        projectId: id,
      }))
      const inserted = await paragraphsDB.insert(toInsert)

      await projectsDB.update(
        { _id: id },
        { $set: { updatedAt: new Date().toISOString() } }
      )

      res.json(inserted)
    } else {
      res.json([])
    }
  } catch (err) {
    console.error('保存段落失败:', err)
    res.status(500).json({ error: '保存段落失败' })
  }
})

app.post('/api/projects/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { stageIndex, memberId } = req.body

    const confirmation = await confirmationsDB.findOne({ projectId: id, stageIndex })
    if (!confirmation) {
      return res.status(404).json({ error: '阶段不存在' })
    }

    if (!confirmation.confirmedBy.includes(memberId)) {
      confirmation.confirmedBy.push(memberId)
    }

    const project = await projectsDB.findOne({ _id: id })
    const totalMembers = project?.members.length || 1
    confirmation.allConfirmed = confirmation.confirmedBy.length >= totalMembers

    await confirmationsDB.update(
      { _id: confirmation._id },
      { $set: { confirmedBy: confirmation.confirmedBy, allConfirmed: confirmation.allConfirmed } }
    )

    if (confirmation.allConfirmed) {
      const allConfirmations = await confirmationsDB.find({ projectId: id }).sort({ stageIndex: 1 })
      const completedCount = allConfirmations.filter((c: any) => c.allConfirmed).length
      let newStatus = project?.status || '创作中'

      if (completedCount >= 5) newStatus = '已发布'
      else if (completedCount >= 3) newStatus = '排练中'
      else newStatus = '创作中'

      if (project) {
        const newTimeline = [...(project.timeline || [])]
        const stageLabel = STAGES[stageIndex]
        const existing = newTimeline.findIndex((t: any) => t.stage === `${stageLabel}完成`)
        if (existing === -1) {
          newTimeline.push({
            stage: `${stageLabel}完成`,
            date: new Date().toISOString(),
            completed: true,
          })
        }
        await projectsDB.update(
          { _id: id },
          { $set: { status: newStatus, timeline: newTimeline, updatedAt: new Date().toISOString() } }
        )
      }
    }

    res.json(confirmation)
  } catch (err) {
    console.error('确认阶段失败:', err)
    res.status(500).json({ error: '确认阶段失败' })
  }
})

app.get('/api/projects/:id/confirmations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const confirmations = await confirmationsDB.find({ projectId: id }).sort({ stageIndex: 1 })
    res.json(confirmations)
  } catch (err) {
    console.error('获取确认状态失败:', err)
    res.status(500).json({ error: '获取确认状态失败' })
  }
})

app.post('/api/projects/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const project = await projectsDB.findOne({ _id: id })
    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    const paragraphs = await paragraphsDB.find({ projectId: id }).sort({ order: 1 })
    const confirmations = await confirmationsDB.find({ projectId: id }).sort({ stageIndex: 1 })

    const exportData = {
      project: {
        id: project._id,
        name: project.name,
        genres: project.genres,
        description: project.description,
        status: project.status,
        inviteCode: project.inviteCode,
        createdAt: project.createdAt,
        exportedAt: new Date().toISOString(),
      },
      members: project.members.map((m: any) => ({
        id: m.id,
        name: m.name,
        role: m.role,
      })),
      paragraphs: paragraphs.map((p: any) => ({
        id: p._id,
        name: p.name,
        rhythm: p.rhythm,
        notes: p.notes,
        order: p.order,
        position: p.position,
        connections: p.connections || [],
      })),
      connections: paragraphs.flatMap((p: any) =>
        (p.connections || []).map((c: any) => ({
          from: p._id,
          to: c.targetId,
          label: c.label,
        }))
      ),
      progress: {
        stages: STAGES.map((name, idx) => {
          const c = confirmations.find((cc: any) => cc.stageIndex === idx)
          return {
            stage: name,
            confirmed: c?.allConfirmed || false,
            confirmedBy: c?.confirmedBy || [],
          }
        }),
        completionPercent: Math.round(
          (confirmations.filter((c: any) => c.allConfirmed).length / STAGES.length) * 100
        ),
      },
    }

    res.json(exportData)
  } catch (err) {
    console.error('导出乐谱失败:', err)
    res.status(500).json({ error: '导出乐谱失败' })
  }
})

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`BandCollab API 服务已启动: http://localhost:${PORT}`)
  console.log(`数据存储目录: ${dataDir}`)
})
