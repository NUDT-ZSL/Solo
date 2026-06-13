import express, { Request, Response } from 'express'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const dbDir = path.join(__dirname, '..', 'data')
const postersDb = Datastore.create({ filename: path.join(dbDir, 'posters.db'), autoload: true })
const registrationsDb = Datastore.create({ filename: path.join(dbDir, 'registrations.db'), autoload: true })

function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const DEFAULT_TEMPLATES = [
  {
    id: 'template-1',
    name: '清新绿意',
    gradient: { from: '#d1fae5', to: '#ffffff' },
    width: 600,
    height: 900,
    elements: [
      { id: 'el-title', type: 'text', content: '社区春日茶话会', x: 60, y: 80, width: 480, height: 60, fontSize: 40, fontWeight: 700, color: '#065f46', opacity: 1, zIndex: 3 },
      { id: 'el-subtitle', type: 'text', content: '与邻居共赴一场温暖之约', x: 60, y: 160, width: 480, height: 36, fontSize: 22, fontWeight: 500, color: '#047857', opacity: 0.9, zIndex: 2 },
      { id: 'el-image', type: 'image', src: '', x: 100, y: 230, width: 400, height: 300, opacity: 1, zIndex: 1 },
      { id: 'el-date', type: 'text', content: '2026年6月20日 周六 14:00', x: 60, y: 580, width: 480, height: 32, fontSize: 20, fontWeight: 600, color: '#065f46', opacity: 1, zIndex: 2 },
      { id: 'el-location', type: 'text', content: '社区中心二楼多功能厅', x: 60, y: 630, width: 480, height: 28, fontSize: 18, fontWeight: 400, color: '#047857', opacity: 0.85, zIndex: 2 }
    ]
  },
  {
    id: 'template-2',
    name: '暖橙时光',
    gradient: { from: '#fed7aa', to: '#fef3c7' },
    width: 600,
    height: 900,
    elements: [
      { id: 'el-title', type: 'text', content: '亲子烘焙工坊', x: 60, y: 80, width: 480, height: 60, fontSize: 40, fontWeight: 700, color: '#9a3412', opacity: 1, zIndex: 3 },
      { id: 'el-subtitle', type: 'text', content: '和孩子一起制作甜蜜回忆', x: 60, y: 160, width: 480, height: 36, fontSize: 22, fontWeight: 500, color: '#c2410c', opacity: 0.9, zIndex: 2 },
      { id: 'el-image', type: 'image', src: '', x: 100, y: 230, width: 400, height: 300, opacity: 1, zIndex: 1 },
      { id: 'el-date', type: 'text', content: '2026年7月5日 周日 10:00', x: 60, y: 580, width: 480, height: 32, fontSize: 20, fontWeight: 600, color: '#9a3412', opacity: 1, zIndex: 2 },
      { id: 'el-location', type: 'text', content: '社区活动中心·创意厨房', x: 60, y: 630, width: 480, height: 28, fontSize: 18, fontWeight: 400, color: '#c2410c', opacity: 0.85, zIndex: 2 }
    ]
  },
  {
    id: 'template-3',
    name: '深蓝商务',
    gradient: { from: '#1e3a5f', to: '#e2e8f0' },
    width: 600,
    height: 900,
    elements: [
      { id: 'el-title', type: 'text', content: '创业分享沙龙', x: 60, y: 80, width: 480, height: 60, fontSize: 40, fontWeight: 700, color: '#ffffff', opacity: 1, zIndex: 3 },
      { id: 'el-subtitle', type: 'text', content: '洞察行业趋势 链接创业伙伴', x: 60, y: 160, width: 480, height: 36, fontSize: 22, fontWeight: 500, color: '#bfdbfe', opacity: 0.95, zIndex: 2 },
      { id: 'el-image', type: 'image', src: '', x: 100, y: 230, width: 400, height: 300, opacity: 1, zIndex: 1 },
      { id: 'el-date', type: 'text', content: '2026年6月28日 周日 19:00', x: 60, y: 580, width: 480, height: 32, fontSize: 20, fontWeight: 600, color: '#ffffff', opacity: 1, zIndex: 2 },
      { id: 'el-location', type: 'text', content: '社区创业空间·路演厅', x: 60, y: 630, width: 480, height: 28, fontSize: 18, fontWeight: 400, color: '#bfdbfe', opacity: 0.9, zIndex: 2 }
    ]
  }
]

app.get('/api/templates', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: DEFAULT_TEMPLATES
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '获取模板失败' })
  }
})

app.post('/api/save', async (req: Request, res: Response) => {
  try {
    const { templateId, elements, gradient } = req.body

    if (!templateId || !elements) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }

    let shortId = generateShortId()
    let exists = await postersDb.findOne({ shortId })
    while (exists) {
      shortId = generateShortId()
      exists = await postersDb.findOne({ shortId })
    }

    const poster = {
      _id: uuidv4(),
      shortId,
      templateId,
      elements,
      gradient: gradient || { from: '#ffffff', to: '#ffffff' },
      width: 600,
      height: 900,
      createdAt: Date.now()
    }

    await postersDb.insert(poster)

    res.json({
      success: true,
      data: {
        shortId,
        url: `/p/${shortId}`
      }
    })
  } catch (err) {
    console.error('Save error:', err)
    res.status(500).json({ success: false, error: '保存失败' })
  }
})

app.get('/api/poster/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const poster = await postersDb.findOne({ shortId: id })

    if (!poster) {
      const templateMatch = DEFAULT_TEMPLATES.find(t => t.id === id)
      if (templateMatch) {
        return res.json({
          success: true,
          data: {
            ...templateMatch,
            shortId: id,
            registrationCount: 0
          }
        })
      }
      return res.status(404).json({ success: false, error: '海报不存在' })
    }

    const count = await registrationsDb.count({ posterId: poster._id })

    res.json({
      success: true,
      data: {
        ...poster,
        registrationCount: count
      }
    })
  } catch (err) {
    console.error('Get poster error:', err)
    res.status(500).json({ success: false, error: '获取海报失败' })
  }
})

app.get('/api/poster/:id/count', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const poster = await postersDb.findOne({ shortId: id })
    if (!poster) {
      return res.status(404).json({ success: false, error: '海报不存在' })
    }

    const count = await registrationsDb.count({ posterId: poster._id })

    res.json({
      success: true,
      data: {
        count
      }
    })
  } catch (err) {
    console.error('Get count error:', err)
    res.status(500).json({ success: false, error: '获取报名数失败' })
  }
})

app.post('/api/register/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phone, peopleCount } = req.body

    if (!name || !phone || !peopleCount) {
      return res.status(400).json({ success: false, error: '请填写完整的报名信息' })
    }

    const poster = await postersDb.findOne({ shortId: id })
    if (!poster) {
      return res.status(404).json({ success: false, error: '海报不存在' })
    }

    const existing = await registrationsDb.findOne({ posterId: poster._id, phone })
    if (existing) {
      const count = await registrationsDb.count({ posterId: poster._id })
      return res.json({
        success: true,
        data: {
          message: '您已经报名过了',
          count,
          alreadyRegistered: true
        }
      })
    }

    const registration = {
      _id: uuidv4(),
      posterId: poster._id,
      name,
      phone,
      peopleCount: Number(peopleCount),
      createdAt: Date.now()
    }

    await registrationsDb.insert(registration)

    const count = await registrationsDb.count({ posterId: poster._id })

    res.json({
      success: true,
      data: {
        message: '报名成功',
        count,
        alreadyRegistered: false
      }
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ success: false, error: '报名失败' })
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 EventCanva 后端服务已启动:`)
  console.log(`   📡 API 端口: http://localhost:${PORT}`)
  console.log(`   📋 GET    /api/templates`)
  console.log(`   💾 POST   /api/save`)
  console.log(`   🖼️  GET    /api/poster/:id`)
  console.log(`   📊 GET    /api/poster/:id/count`)
  console.log(`   ✍️  POST   /api/register/:id\n`)
})
