import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'
import {
  insertOutfit,
  getOutfitById,
  getOutfits,
  getOutfitCount,
  deleteOutfit,
  toggleLike,
  getLikedOutfits,
  getLikeCount
} from './db'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

interface SaveOutfitRequestBody {
  name: string
  top_style: string
  top_color: string
  bottom_style: string
  bottom_color: string
  shoes_style: string
  shoes_color: string
  accessory_style?: string | null
  accessory_color?: string | null
  thumbnail?: string | null
}

interface LikeRequestBody {
  userId: string
}

app.post('/api/outfits', (req, res) => {
  try {
    const body = req.body as SaveOutfitRequestBody

    if (!body.name || !body.top_style || !body.top_color || !body.bottom_style || 
        !body.bottom_color || !body.shoes_style || !body.shoes_color) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段：上衣、下装和鞋子信息不能为空'
      })
    }

    const currentCount = getOutfitCount()
    if (currentCount >= 20) {
      return res.status(400).json({
        success: false,
        error: '最多只能保存20个搭配方案，请删除一些后再尝试'
      })
    }

    const id = uuidv4()
    const outfit = insertOutfit(
      id,
      body.name,
      body.top_style,
      body.top_color,
      body.bottom_style,
      body.bottom_color,
      body.shoes_style,
      body.shoes_color,
      body.accessory_style || null,
      body.accessory_color || null,
      body.thumbnail || null
    )

    res.json({
      success: true,
      data: outfit
    })
  } catch (error) {
    console.error('保存搭配失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.get('/api/outfits', (_req, res) => {
  try {
    const outfits = getOutfits(20)
    res.json({
      success: true,
      data: outfits
    })
  } catch (error) {
    console.error('获取搭配列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.get('/api/outfits/:id', (req, res) => {
  try {
    const { id } = req.params
    const outfit = getOutfitById(id)

    if (!outfit) {
      return res.status(404).json({
        success: false,
        error: '搭配方案不存在'
      })
    }

    res.json({
      success: true,
      data: outfit
    })
  } catch (error) {
    console.error('获取搭配详情失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.delete('/api/outfits/:id', (req, res) => {
  try {
    const { id } = req.params
    const success = deleteOutfit(id)

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '搭配方案不存在'
      })
    }

    res.json({
      success: true,
      data: { message: '删除成功' }
    })
  } catch (error) {
    console.error('删除搭配失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.post('/api/outfits/:id/like', (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body as LikeRequestBody

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少用户标识'
      })
    }

    const outfit = getOutfitById(id)
    if (!outfit) {
      return res.status(404).json({
        success: false,
        error: '搭配方案不存在'
      })
    }

    const likeId = uuidv4()
    const result = toggleLike(likeId, id, userId)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('收藏操作失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.get('/api/outfits/:id/likes', (req, res) => {
  try {
    const { id } = req.params
    const count = getLikeCount(id)

    res.json({
      success: true,
      data: { likes: count }
    })
  } catch (error) {
    console.error('获取收藏数失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.get('/api/likes/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const outfits = getLikedOutfits(userId)

    res.json({
      success: true,
      data: outfits
    })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  })
})

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   Virtual Stylist Server                                 ║
║                                                          ║
║   🚀 服务器运行在: http://localhost:${PORT}                ║
║                                                          ║
║   📦 API 端点:                                           ║
║      POST   /api/outfits       - 保存搭配方案            ║
║      GET    /api/outfits       - 获取搭配列表            ║
║      GET    /api/outfits/:id   - 获取搭配详情            ║
║      POST   /api/outfits/:id/like - 收藏/取消收藏        ║
║      GET    /api/likes/:userId  - 获取用户收藏列表       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `)
})

export default app
