import express, { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { LevelData, LevelObject } from '../core/types'

const app = express()
const PORT = 3001

app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

const createId = () => uuidv4()

const presetLevels: LevelData[] = [
  {
    version: '1.0',
    name: '教程关卡 - 入门',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objects: [
      {
        id: createId(),
        type: 'player-start',
        x: 100,
        y: 500,
        width: 30,
        height: 40,
        rotation: 0,
        color: '#00FF88'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 150,
        y: 560,
        width: 200,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 400,
        y: 500,
        width: 150,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 620,
        y: 440,
        width: 150,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 850,
        y: 380,
        width: 200,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'goal-flag',
        x: 950,
        y: 320,
        width: 30,
        height: 60,
        rotation: 0,
        color: '#FFD700'
      }
    ] as LevelObject[]
  },
  {
    version: '1.0',
    name: '中级关卡 - 陷阱迷宫',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objects: [
      {
        id: createId(),
        type: 'player-start',
        x: 80,
        y: 480,
        width: 30,
        height: 40,
        rotation: 0,
        color: '#00FF88'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 150,
        y: 540,
        width: 180,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'trap-spike',
        x: 380,
        y: 540,
        width: 100,
        height: 30,
        rotation: 0,
        color: '#FF6B6B'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 540,
        y: 540,
        width: 120,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'trap-moving',
        x: 720,
        y: 480,
        width: 100,
        height: 25,
        rotation: 0,
        color: '#533483',
        moveRangeX: 100,
        moveRangeY: 0,
        moveSpeed: 2
      } as LevelObject,
      {
        id: createId(),
        type: 'platform-rect',
        x: 900,
        y: 420,
        width: 100,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'platform-triangle',
        x: 1050,
        y: 360,
        width: 100,
        height: 80,
        rotation: 0,
        color: '#E94560',
        baseWidth: 100,
        triangleHeight: 80
      } as LevelObject,
      {
        id: createId(),
        type: 'trap-spike',
        x: 1180,
        y: 300,
        width: 60,
        height: 30,
        rotation: 0,
        color: '#FF6B6B'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 1300,
        y: 300,
        width: 180,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'goal-flag',
        x: 1380,
        y: 240,
        width: 30,
        height: 60,
        rotation: 0,
        color: '#FFD700'
      }
    ] as LevelObject[]
  },
  {
    version: '1.0',
    name: '高级关卡 - 垂直挑战',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objects: [
      {
        id: createId(),
        type: 'player-start',
        x: 100,
        y: 600,
        width: 30,
        height: 40,
        rotation: 0,
        color: '#00FF88'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 150,
        y: 650,
        width: 250,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'trap-spike',
        x: 480,
        y: 650,
        width: 80,
        height: 30,
        rotation: 0,
        color: '#FF6B6B'
      },
      {
        id: createId(),
        type: 'trap-moving',
        x: 650,
        y: 600,
        width: 90,
        height: 25,
        rotation: 0,
        color: '#533483',
        moveRangeX: 0,
        moveRangeY: 80,
        moveSpeed: 1.5
      } as LevelObject,
      {
        id: createId(),
        type: 'platform-rect',
        x: 820,
        y: 550,
        width: 130,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 620,
        y: 460,
        width: 120,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'trap-spike',
        x: 450,
        y: 460,
        width: 80,
        height: 30,
        rotation: 0,
        color: '#FF6B6B'
      },
      {
        id: createId(),
        type: 'platform-triangle',
        x: 280,
        y: 420,
        width: 120,
        height: 90,
        rotation: 0,
        color: '#E94560',
        baseWidth: 120,
        triangleHeight: 90
      } as LevelObject,
      {
        id: createId(),
        type: 'trap-moving',
        x: 100,
        y: 330,
        width: 100,
        height: 25,
        rotation: 0,
        color: '#533483',
        moveRangeX: 120,
        moveRangeY: 0,
        moveSpeed: 2.5
      } as LevelObject,
      {
        id: createId(),
        type: 'platform-rect',
        x: 350,
        y: 280,
        width: 150,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 580,
        y: 220,
        width: 150,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'trap-spike',
        x: 760,
        y: 170,
        width: 80,
        height: 25,
        rotation: 0,
        color: '#FF6B6B'
      },
      {
        id: createId(),
        type: 'platform-rect',
        x: 920,
        y: 170,
        width: 180,
        height: 30,
        rotation: 0,
        color: '#E94560'
      },
      {
        id: createId(),
        type: 'goal-flag',
        x: 1000,
        y: 110,
        width: 30,
        height: 60,
        rotation: 0,
        color: '#FFD700'
      }
    ] as LevelObject[]
  }
]

interface LeaderboardEntry {
  id: string
  levelName: string
  playerName: string
  timeInSeconds: number
  deaths: number
  createdAt: string
}

let leaderboard: LeaderboardEntry[] = [
  {
    id: createId(),
    levelName: '教程关卡 - 入门',
    playerName: '玩家大师',
    timeInSeconds: 12.5,
    deaths: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: createId(),
    levelName: '教程关卡 - 入门',
    playerName: '跳跳侠',
    timeInSeconds: 15.3,
    deaths: 1,
    createdAt: new Date(Date.now() - 72000000).toISOString()
  },
  {
    id: createId(),
    levelName: '教程关卡 - 入门',
    playerName: '新手小白',
    timeInSeconds: 22.8,
    deaths: 3,
    createdAt: new Date(Date.now() - 36000000).toISOString()
  },
  {
    id: createId(),
    levelName: '中级关卡 - 陷阱迷宫',
    playerName: '通关达人',
    timeInSeconds: 28.1,
    deaths: 2,
    createdAt: new Date(Date.now() - 50000000).toISOString()
  },
  {
    id: createId(),
    levelName: '中级关卡 - 陷阱迷宫',
    playerName: '无畏战士',
    timeInSeconds: 35.6,
    deaths: 5,
    createdAt: new Date(Date.now() - 20000000).toISOString()
  },
  {
    id: createId(),
    levelName: '高级关卡 - 垂直挑战',
    playerName: '跑酷王',
    timeInSeconds: 45.2,
    deaths: 4,
    createdAt: new Date(Date.now() - 10000000).toISOString()
  }
]

app.get('/api/levels', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: presetLevels,
      total: presetLevels.length
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '获取预设关卡失败'
    })
  }
})

app.get('/api/levels/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id) || id < 0 || id >= presetLevels.length) {
      return res.status(404).json({
        success: false,
        error: '关卡不存在'
      })
    }
    res.json({
      success: true,
      data: presetLevels[id]
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '获取关卡详情失败'
    })
  }
})

app.get('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const { levelName, limit = 10 } = req.query
    let results = [...leaderboard]

    if (levelName && typeof levelName === 'string') {
      results = results.filter((e) =>
        e.levelName.toLowerCase().includes(levelName.toLowerCase())
      )
    }

    results.sort((a, b) => {
      if (a.timeInSeconds !== b.timeInSeconds) {
        return a.timeInSeconds - b.timeInSeconds
      }
      return a.deaths - b.deaths
    })

    const limitNum = Math.min(parseInt(limit as string) || 10, 100)
    results = results.slice(0, limitNum)

    res.json({
      success: true,
      data: results,
      total: results.length
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '获取排行榜失败'
    })
  }
})

app.post('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const { levelName, playerName, timeInSeconds, deaths } = req.body

    if (!levelName || !playerName || typeof timeInSeconds !== 'number') {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段：levelName, playerName, timeInSeconds'
      })
    }

    const entry: LeaderboardEntry = {
      id: createId(),
      levelName: String(levelName),
      playerName: String(playerName).slice(0, 20),
      timeInSeconds: Math.max(0, parseFloat(timeInSeconds.toFixed(2))),
      deaths: Math.max(0, parseInt(deaths || '0')),
      createdAt: new Date().toISOString()
    }

    leaderboard.push(entry)

    res.status(201).json({
      success: true,
      data: entry,
      message: '成绩已提交到排行榜'
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '提交排行榜失败'
    })
  }
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      levels: 'GET /api/levels, GET /api/levels/:id',
      leaderboard: 'GET /api/leaderboard, POST /api/leaderboard'
    }
  })
})

app.listen(PORT, () => {
  console.log(`
========================================
  🎮 关卡编辑器后端服务已启动
  端口: ${PORT}
  健康检查: http://localhost:${PORT}/api/health
  预设关卡: http://localhost:${PORT}/api/levels
  排行榜:   http://localhost:${PORT}/api/leaderboard
========================================
  `)
})

export default app
