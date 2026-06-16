import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Game {
  id: string
  title: string
  developer: string
  genre: '动作' | '解谜' | '模拟' | '角色扮演'
  thumbnail: string
  description: string
  rating: number
  totalScore: number
  releaseDate: string
  platforms: string[]
  screenshots: string[]
  devLogs: DevLog[]
  unlockContent: UnlockContent
}

interface DevLog {
  id: string
  date: string
  title: string
  content: string
  likes: number
}

interface UnlockContent {
  conceptImages: string[]
  interviewUrl: string
  shareLink: string
}

interface ScoreRecord {
  id: string
  gameId: string
  score: number
  timestamp: string
}

const scoreRecords: ScoreRecord[] = []

const games: Game[] = [
  {
    id: '1',
    title: '暗影裂隙',
    developer: '星尘工作室',
    genre: '动作',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20fantasy%20action%20game%20cover%20art%2C%20warrior%20with%20glowing%20sword%20in%20shadow%20rift%2C%20dramatic%20lighting&image_size=landscape_4_3',
    description: '一款黑暗幻想风格的动作游戏，在暗影裂隙中挥舞光之剑，挑战无尽的暗影怪物。',
    rating: 4.5,
    totalScore: 85,
    releaseDate: '2026-03-15',
    platforms: ['PC', 'Switch'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20fantasy%20gameplay%20screenshot%20warrior%20fighting%20shadow%20creatures&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20fantasy%20boss%20fight%20massive%20shadow%20demon&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20fantasy%20environment%20ancient%20ruins%20purple%20mist&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l1-1', date: '2026-06-10', title: '战斗系统2.0上线', content: '我们重构了整个战斗系统，新增连招、闪避和反击机制。每个武器类型都有独特的连招树，玩家可以自由搭配出属于自己的战斗风格。', likes: 42 },
      { id: 'l1-2', date: '2026-05-20', title: '新区域"幽暗深渊"制作完成', content: '幽暗深渊是一个充满危险陷阱和隐藏宝藏的地下城区域，我们花费了三个月来打磨这个区域的每一个细节。', likes: 28 },
      { id: 'l1-3', date: '2026-04-08', title: '角色动画升级', content: '全新的动作捕捉系统让角色动作更加流畅自然，特别是在战斗和跑酷场景中。', likes: 15 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=early%20concept%20art%20dark%20warrior%20character%20sketch&image_size=landscape_4_3',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20shadow%20rift%20environment%20painting&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/shadow-rift',
    },
  },
  {
    id: '2',
    title: '量子迷途',
    developer: '像素实验室',
    genre: '解谜',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quantum%20puzzle%20game%20cover%20art%2C%20glowing%20cubes%20floating%20in%20space%2C%20neon%20blue&image_size=landscape_4_3',
    description: '操控量子方块穿越维度，挑战烧脑谜题，揭开量子世界的终极奥秘。',
    rating: 4.8,
    totalScore: 96,
    releaseDate: '2026-01-22',
    platforms: ['PC', 'Mobile'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quantum%20puzzle%20gameplay%20glowing%20blocks%20manipulation&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quantum%20puzzle%20dimension%20shift%20effect%20neon&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quantum%20puzzle%20final%20level%20cosmic%20reveal&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l2-1', date: '2026-06-12', title: '最终章节发布', content: '量子迷途的最终章节"奇点"已经上线！这个章节将揭示整个量子世界的真相，并带来了全新的维度转换机制。', likes: 67 },
      { id: 'l2-2', date: '2026-05-15', title: '社区关卡编辑器测试', content: '我们正在开发社区关卡编辑器，让玩家可以创建和分享自己的量子谜题。', likes: 53 },
      { id: 'l2-3', date: '2026-03-01', title: '音效系统重构', content: '与知名音乐人合作，为游戏的每个维度设计了独特的音景。', likes: 34 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20quantum%20dimension%20early%20sketch%20blueprint%20style&image_size=landscape_4_3',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20quantum%20cube%20character%20design%20iterations&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/quantum-lost',
    },
  },
  {
    id: '3',
    title: '星尘农场',
    developer: '暖阳游戏',
    genre: '模拟',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20space%20farm%20game%20cover%2C%20cute%20alien%20plants%20on%20asteroid%2C%20warm%20colors&image_size=landscape_4_3',
    description: '在小行星上建造你的太空农场，种植外星作物，与星际商人交易稀有资源。',
    rating: 4.2,
    totalScore: 72,
    releaseDate: '2026-05-01',
    platforms: ['PC', 'Switch', 'Mobile'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20farm%20gameplay%20growing%20alien%20crops&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20space%20farm%20market%20trading%20scene&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20farm%20greenhouse%20on%20asteroid%20sunset&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l3-1', date: '2026-06-08', title: 'v1.2更新：太空市场', content: '全新的太空市场系统上线！玩家现在可以在星际市场出售自己的太空作物，与其他农场主交易稀有种子。', likes: 31 },
      { id: 'l3-2', date: '2026-04-20', title: '新作物：星云花', content: '星云花是一种只在夜间绽放的神秘植物，收获后可以用来制作特殊的星际肥料。', likes: 22 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20cute%20alien%20plant%20design%20iterations&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/stardust-farm',
    },
  },
  {
    id: '4',
    title: '龙语编年',
    developer: '古卷工作室',
    genre: '角色扮演',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20RPG%20game%20cover%2C%20dragon%20language%20runes%20glowing%2C%20medieval%20fantasy&image_size=landscape_4_3',
    description: '掌握失落的龙语魔法，召唤远古巨龙，在中世纪奇幻世界中书写属于你的史诗。',
    rating: 4.7,
    totalScore: 92,
    releaseDate: '2025-12-10',
    platforms: ['PC', 'PS5'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20RPG%20gameplay%20dragon%20summoning%20magic&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=medieval%20fantasy%20village%20NPC%20dialogue&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20dragon%20boss%20encounter%20cliff%20edge&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l4-1', date: '2026-06-14', title: '龙语系统深度解析', content: '龙语是本作的核心系统。玩家通过收集龙语符文来解锁不同的龙族技能，每个符文都有独特的组合方式。', likes: 89 },
      { id: 'l4-2', date: '2026-05-28', title: 'DLC"龙族遗产"预告', content: '全新的DLC将扩展龙语系统，新增三条龙族血脉和对应的故事线。', likes: 76 },
      { id: 'l4-3', date: '2026-04-15', title: '平衡性调整', content: '基于社区反馈，我们对法师和战士职业进行了平衡性调整。', likes: 38 },
      { id: 'l4-4', date: '2026-03-01', title: '首发回顾', content: '龙语编年发售三个月了，感谢每一位玩家的支持！', likes: 45 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20dragon%20rune%20system%20early%20design&image_size=landscape_4_3',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20medieval%20fantasy%20world%20map%20sketch&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/dragon-chronicle',
    },
  },
  {
    id: '5',
    title: '霓虹冲刺',
    developer: '电子猫工作室',
    genre: '动作',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=neon%20cyberpunk%20racing%20game%20cover%2C%20speed%20lines%2C%20synthwave%20colors&image_size=landscape_4_3',
    description: '在霓虹闪烁的赛博朋克都市中极速狂飙，挑战极限速度，争夺街头王者之名。',
    rating: 4.0,
    totalScore: 65,
    releaseDate: '2026-04-18',
    platforms: ['PC', 'Mobile'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cyberpunk%20racing%20gameplay%20neon%20city%20night&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=synthwave%20racing%20boost%20pad%20rain%20streets&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l5-1', date: '2026-06-05', title: '新赛道：霓虹暴雨', content: '在霓虹暴雨赛道中，雨水会让路面变得湿滑，同时霓虹灯的倒影会产生视觉干扰，考验你的极限反应能力。', likes: 19 },
      { id: 'l5-2', date: '2026-05-10', title: '排行榜系统上线', content: '全球排行榜系统已经上线！挑战最高分，争夺每周冠军。', likes: 14 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20cyberpunk%20vehicle%20design%20iterations&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/neon-rush',
    },
  },
  {
    id: '6',
    title: '时间织匠',
    developer: '织梦社',
    genre: '解谜',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=time%20manipulation%20puzzle%20game%20cover%2C%20clock%20gears%20floating%2C%20golden%20light&image_size=landscape_4_3',
    description: '操控时间的流动，穿越过去与未来，在齿轮与钟表的世界中解开层层谜题。',
    rating: 4.6,
    totalScore: 88,
    releaseDate: '2026-02-14',
    platforms: ['PC', 'Switch'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=time%20puzzle%20gameplay%20rewinding%20clock%20mechanism&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=steampunk%20clockwork%20puzzle%20room%20golden%20light&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=time%20puzzle%20split%20timeline%20parallel%20worlds&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l6-1', date: '2026-06-11', title: '时间分裂机制详解', content: '最新的时间分裂机制允许玩家同时操控两个时间线的角色，协作解决跨时空谜题。', likes: 55 },
      { id: 'l6-2', date: '2026-05-05', title: '情人节特别关卡', content: '为庆祝情人节，我们设计了一个特殊的双人合作关卡，讲述了一对跨越时间的恋人故事。', likes: 41 },
      { id: 'l6-3', date: '2026-03-20', title: '性能优化报告', content: '这次更新大幅减少了时间回溯时的内存占用，现在即使是低端设备也能流畅运行。', likes: 23 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20time%20weaver%20character%20design%20clockwork&image_size=landscape_4_3',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20steampunk%20clock%20tower%20environment&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/time-weaver',
    },
  },
  {
    id: '7',
    title: '深海物语',
    developer: '蓝鲸团队',
    genre: '模拟',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=deep%20sea%20exploration%20simulator%20cover%2C%20bioluminescent%20creatures%2C%20submarine&image_size=landscape_4_3',
    description: '驾驶潜水艇探索神秘深海，与发光生物相遇，建造属于你的海底基地。',
    rating: 4.3,
    totalScore: 78,
    releaseDate: '2026-06-01',
    platforms: ['PC'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=deep%20sea%20exploration%20gameplay%20submarine%20bioluminescent&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=underwater%20base%20building%20coral%20reef&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l7-1', date: '2026-06-13', title: '首发日感言', content: '深海物语终于与大家见面了！这是我们三年心血的结晶，希望每位玩家都能在深海中找到属于自己的宁静。', likes: 36 },
      { id: 'l7-2', date: '2026-05-25', title: '发售前最后测试', content: '感谢所有参与内测的玩家，你们的反馈帮助我们修复了大量问题。', likes: 20 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20deep%20sea%20creatures%20design%20bioluminescent&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/deep-sea',
    },
  },
  {
    id: '8',
    title: '符文觉醒',
    developer: '北境之火',
    genre: '角色扮演',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rune%20magic%20RPG%20cover%2C%20glowing%20runes%20floating%20around%20mage%2C%20northern%20lights&image_size=landscape_4_3',
    description: '收集失落的符文，组合出两百种以上魔法，在北境极光下踏上冒险之旅。',
    rating: 4.1,
    totalScore: 68,
    releaseDate: '2026-03-28',
    platforms: ['PC', 'PS5', 'Xbox'],
    screenshots: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rune%20magic%20RPG%20gameplay%20spell%20casting%20aurora&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=nordic%20fantasy%20village%20snow%20mountains&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rune%20RPG%20boss%20frost%20giant%20battle&image_size=landscape_16_9',
    ],
    devLogs: [
      { id: 'l8-1', date: '2026-06-09', title: '符文组合系统指南', content: '符文觉醒的核心玩法在于自由组合不同属性的符文。火+风=烈焰风暴，冰+地=永冻之墙——超过200种组合等你发现！', likes: 27 },
      { id: 'l8-2', date: '2026-04-30', title: '多人合作模式开发中', content: '我们正在开发2-4人的在线合作模式，玩家可以组队挑战大型符文副本。', likes: 33 },
    ],
    unlockContent: {
      conceptImages: [
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concept%20art%20rune%20system%20design%20nordic%20patterns&image_size=landscape_4_3',
      ],
      interviewUrl: '#',
      shareLink: 'https://example.com/share/rune-awakening',
    },
  },
]

app.get('/api/games', (_req: Request, res: Response) => {
  const genre = _req.query.genre as string | undefined
  let result = [...games]
  if (genre && genre !== '全部') {
    result = result.filter(g => g.genre === genre)
  }
  result.sort((a, b) => b.rating - a.rating)
  res.json(result.map(({ devLogs, unlockContent, screenshots, ...rest }) => ({
    ...rest,
    previewScreenshots: screenshots.slice(0, 3),
  })))
})

app.get('/api/games/:id', (req: Request, res: Response) => {
  const game = games.find(g => g.id === req.params.id)
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }
  res.json(game)
})

app.post('/api/scores', (req: Request, res: Response) => {
  const { gameId, score } = req.body as { gameId: string; score: number }
  if (!gameId || !score || score < 1 || score > 5) {
    res.status(400).json({ error: 'Invalid score' })
    return
  }
  const game = games.find(g => g.id === gameId)
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }
  scoreRecords.push({
    id: `sr-${Date.now()}`,
    gameId,
    score,
    timestamp: new Date().toISOString(),
  })
  const gameScores = scoreRecords.filter(s => s.gameId === gameId)
  const newTotal = game.totalScore + score
  game.totalScore = newTotal
  game.rating = Math.round((gameScores.reduce((a, b) => a + b.score, 0) / gameScores.length) * 10) / 10
  const unlocked = newTotal >= 100
  res.json({ totalScore: newTotal, unlocked, rating: game.rating })
})

app.get('/api/unlocks/:gameId', (req: Request, res: Response) => {
  const game = games.find(g => g.id === req.params.gameId)
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }
  if (game.totalScore < 100) {
    res.status(403).json({ error: 'Not enough score to unlock' })
    return
  }
  res.json(game.unlockContent)
})

app.post('/api/devlogs/:logId/like', (req: Request, res: Response) => {
  for (const game of games) {
    const log = game.devLogs.find(l => l.id === req.params.logId)
    if (log) {
      log.likes += 1
      res.json({ likes: log.likes })
      return
    }
  }
  res.status(404).json({ error: 'Log not found' })
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
