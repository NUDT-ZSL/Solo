import express from 'express'
import cors from 'cors'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const defaultData = {
  artworks: [
    {
      id: '1',
      title: '晨曦之光',
      author: '林风眠',
      year: 2023,
      size: '60 x 80 cm',
      material: '布面油画',
      description: '这幅作品描绘了清晨第一缕阳光穿透薄雾，洒落在静谧湖面的景象。画面运用了柔和的暖色调，表现出大自然的宁静与美好。艺术家通过细腻的笔触，捕捉了光线在水面上跳跃的瞬间，给人以温暖和希望的感受。',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80',
      likes: 42,
      liked: false,
      createdAt: '2024-01-15T08:30:00Z',
      comments: [
        {
          id: 'c1',
          username: '收藏家王先生',
          avatar: 'https://i.pravatar.cc/80?img=1',
          content: '光线的处理令人惊叹，仿佛能感受到清晨的凉意。',
          createdAt: '2024-01-16T10:20:00Z'
        },
        {
          id: 'c2',
          username: '艺术爱好者',
          avatar: 'https://i.pravatar.cc/80?img=2',
          content: '色彩非常和谐，挂在客厅一定很美。',
          createdAt: '2024-01-17T14:05:00Z'
        }
      ]
    },
    {
      id: '2',
      title: '山间小径',
      author: '赵无极',
      year: 2022,
      size: '50 x 70 cm',
      material: '水墨设色',
      description: '一条蜿蜒的小径消失在远山之间，画面充满了诗意与禅意。艺术家运用中国传统水墨技法，结合现代构图理念，创造出这幅意境深远的作品。',
      image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&q=80',
      likes: 78,
      liked: false,
      createdAt: '2024-01-10T12:00:00Z',
      comments: [
        {
          id: 'c3',
          username: '水墨画爱好者',
          avatar: 'https://i.pravatar.cc/80?img=3',
          content: '留白处理得非常妙，有宋画的韵味。',
          createdAt: '2024-01-12T09:15:00Z'
        }
      ]
    },
    {
      id: '3',
      title: '城市印象',
      author: '吴冠中',
      year: 2024,
      size: '80 x 100 cm',
      material: '丙烯画布',
      description: '繁华都市的缩影，高楼林立间透露出生活的烟火气息。作品以鲜明的色块和流动的线条，表现现代都市的律动与活力。',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80',
      likes: 156,
      liked: true,
      createdAt: '2024-02-01T16:45:00Z',
      comments: [
        {
          id: 'c4',
          username: '当代艺术藏家',
          avatar: 'https://i.pravatar.cc/80?img=4',
          content: '非常有时代感的作品！',
          createdAt: '2024-02-02T11:30:00Z'
        },
        {
          id: 'c5',
          username: '画廊主理人',
          avatar: 'https://i.pravatar.cc/80?img=5',
          content: '色彩搭配很有冲击力。',
          createdAt: '2024-02-03T08:20:00Z'
        },
        {
          id: 'c6',
          username: '青年艺术家',
          avatar: 'https://i.pravatar.cc/80?img=6',
          content: '学习了！笔触非常自由。',
          createdAt: '2024-02-05T20:10:00Z'
        }
      ]
    },
    {
      id: '4',
      title: '静谧湖畔',
      author: '潘玉良',
      year: 2023,
      size: '40 x 50 cm',
      material: '水彩纸本',
      description: '秋日的湖畔，落叶飘零，水面如镜。水彩的透明质感完美呈现了湖面倒影的朦胧美感。',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80',
      likes: 89,
      liked: false,
      createdAt: '2024-01-20T09:00:00Z',
      comments: []
    },
    {
      id: '5',
      title: '花语',
      author: '常玉',
      year: 2024,
      size: '30 x 40 cm',
      material: '布面油画',
      description: '瓶中鲜花的静物写生，简约的构图中蕴含着对生命的热爱与赞美。每一朵花都仿佛在诉说着自己的故事。',
      image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&q=80',
      likes: 203,
      liked: true,
      createdAt: '2024-02-10T14:30:00Z',
      comments: [
        {
          id: 'c7',
          username: '花艺设计师',
          avatar: 'https://i.pravatar.cc/80?img=7',
          content: '太美了，插花的灵感来源！',
          createdAt: '2024-02-11T10:00:00Z'
        }
      ]
    },
    {
      id: '6',
      title: '旧时光',
      author: '徐悲鸿',
      year: 2022,
      size: '60 x 60 cm',
      material: '综合材料',
      description: '老物件的记忆，泛黄的照片、斑驳的墙皮，都是岁月留下的痕迹。艺术家通过拼贴与绘画结合的方式，唤起人们对往昔的追忆。',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
      likes: 67,
      liked: false,
      createdAt: '2024-01-05T11:20:00Z',
      comments: [
        {
          id: 'c8',
          username: '怀旧收藏家',
          avatar: 'https://i.pravatar.cc/80?img=8',
          content: '看到这幅作品，想起了很多往事。',
          createdAt: '2024-01-06T15:40:00Z'
        }
      ]
    },
    {
      id: '7',
      title: '海岸线',
      author: '刘海粟',
      year: 2023,
      size: '70 x 90 cm',
      material: '布面油画',
      description: '波涛汹涌的大海与岸边礁石的对话，展现了大自然的壮美与力量。艺术家运用厚重的颜料堆叠，表现出海浪的动感。',
      image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80',
      likes: 134,
      liked: false,
      createdAt: '2024-01-25T07:50:00Z',
      comments: []
    },
    {
      id: '8',
      title: '人物肖像',
      author: '蒋兆和',
      year: 2024,
      size: '45 x 60 cm',
      material: '素描铅笔',
      description: '一位老者的肖像，岁月在他脸上刻下的每一道皱纹都是故事。细腻的笔触捕捉了人物深邃的眼神和丰富的内心世界。',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
      likes: 178,
      liked: true,
      createdAt: '2024-02-08T13:10:00Z',
      comments: [
        {
          id: 'c9',
          username: '美院学生',
          avatar: 'https://i.pravatar.cc/80?img=9',
          content: '素描功底太扎实了，学习！',
          createdAt: '2024-02-09T09:30:00Z'
        },
        {
          id: 'c10',
          username: '肖像收藏家',
          avatar: 'https://i.pravatar.cc/80?img=10',
          content: '眼神画活了，非常传神。',
          createdAt: '2024-02-10T16:45:00Z'
        }
      ]
    },
    {
      id: '9',
      title: '抽象构成',
      author: '朱德群',
      year: 2023,
      size: '100 x 100 cm',
      material: '布面丙烯',
      description: '纯粹的色彩与形状构成的抽象世界，观者可以在其中自由驰骋想象。艺术家将情感转化为视觉语言，创造出充满韵律的画面。',
      image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80',
      likes: 95,
      liked: false,
      createdAt: '2024-01-30T15:30:00Z',
      comments: []
    },
    {
      id: '10',
      title: '雪后初晴',
      author: '李可染',
      year: 2024,
      size: '55 x 75 cm',
      material: '水墨纸本',
      description: '大雪覆盖的山村迎来了第一缕阳光，白雪在阳光下熠熠生辉。传统水墨技法与光影表现的完美结合。',
      image: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400&q=80',
      likes: 234,
      liked: true,
      createdAt: '2024-02-12T10:00:00Z',
      comments: [
        {
          id: 'c11',
          username: '山水画爱好者',
          avatar: 'https://i.pravatar.cc/80?img=11',
          content: '李可染先生的传人，笔墨功夫了得。',
          createdAt: '2024-02-13T08:20:00Z'
        }
      ]
    },
    {
      id: '11',
      title: '光影几何',
      author: '王怀庆',
      year: 2022,
      size: '60 x 80 cm',
      material: '布面油画',
      description: '建筑光影与几何结构的组合，充满现代感与秩序感。艺术家对空间和光影的理解令人叹服。',
      image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&q=80',
      likes: 112,
      liked: false,
      createdAt: '2024-01-18T14:20:00Z',
      comments: []
    },
    {
      id: '12',
      title: '田野风光',
      author: '罗中立',
      year: 2023,
      size: '70 x 90 cm',
      material: '布面油画',
      description: '金色的麦浪在微风中摇曳，远处的村庄升起袅袅炊烟。一幅充满乡土气息的田园画卷。',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80',
      likes: 189,
      liked: false,
      createdAt: '2024-02-05T09:40:00Z',
      comments: [
        {
          id: 'c12',
          username: '乡村艺术爱好者',
          avatar: 'https://i.pravatar.cc/80?img=12',
          content: '看了让人想家。',
          createdAt: '2024-02-06T12:00:00Z'
        },
        {
          id: 'c13',
          username: '美术馆策展人',
          avatar: 'https://i.pravatar.cc/80?img=13',
          content: '非常有力量的作品。',
          createdAt: '2024-02-07T17:30:00Z'
        }
      ]
    },
    {
      id: '13',
      title: '夜色阑珊',
      author: '关良',
      year: 2024,
      size: '50 x 60 cm',
      material: '布面油画',
      description: '都市夜晚的霓虹闪烁，街道上行人稀少，却透着温暖的灯光。夜色中的城市有着独特的魅力。',
      image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&q=80',
      likes: 76,
      liked: true,
      createdAt: '2024-02-14T20:15:00Z',
      comments: []
    },
    {
      id: '14',
      title: '静物与壶',
      author: '林风眠',
      year: 2023,
      size: '40 x 40 cm',
      material: '布面油画',
      description: '简约的静物构图，茶壶与水果的搭配，东方韵味十足。',
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80',
      likes: 98,
      liked: false,
      createdAt: '2024-01-22T11:00:00Z',
      comments: [
        {
          id: 'c14',
          username: '东方艺术藏家',
          avatar: 'https://i.pravatar.cc/80?img=14',
          content: '林风眠先生的风格，很有辨识度。',
          createdAt: '2024-01-23T14:30:00Z'
        }
      ]
    },
    {
      id: '15',
      title: '云端之上',
      author: '赵无极',
      year: 2024,
      size: '90 x 120 cm',
      material: '布面油画',
      description: '站在高山之巅，云海翻涌，气势磅礴。抽象与具象之间的完美平衡。',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      likes: 267,
      liked: true,
      createdAt: '2024-02-15T08:00:00Z',
      comments: [
        {
          id: 'c15',
          username: '资深收藏家',
          avatar: 'https://i.pravatar.cc/80?img=15',
          content: '这是我见过最好的一幅赵无极风格作品。',
          createdAt: '2024-02-16T10:20:00Z'
        }
      ]
    }
  ]
}

const file = new JSONFile('db.json')
const db = new Low(file, defaultData)
await db.read()
if (!db.data) {
  db.data = defaultData
}
await db.write()

app.get('/api/artworks', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 12
  const start = (page - 1) * limit
  const end = start + limit
  const artworks = db.data.artworks.slice(start, end).map(({ comments, ...rest }) => ({
    ...rest,
    commentCount: comments.length
  }))
  const total = db.data.artworks.length
  res.json({
    data: artworks,
    pagination: {
      page,
      limit,
      total,
      hasMore: end < total
    }
  })
})

app.get('/api/artworks/:id', (req, res) => {
  const { id } = req.params
  const artwork = db.data.artworks.find(a => a.id === id)
  if (!artwork) {
    return res.status(404).json({ error: '作品不存在' })
  }
  res.json(artwork)
})

app.post('/api/artworks', async (req, res) => {
  const { title, author, year, size, material, description, image } = req.body
  if (!title || !author || !year || !size || !material || !description || !image) {
    return res.status(400).json({ error: '请填写所有字段并上传图片' })
  }
  const newArtwork = {
    id: uuidv4(),
    title,
    author,
    year: parseInt(year),
    size,
    material,
    description,
    image,
    thumbnail: image,
    likes: 0,
    liked: false,
    createdAt: new Date().toISOString(),
    comments: []
  }
  db.data.artworks.unshift(newArtwork)
  await db.write()
  res.status(201).json(newArtwork)
})

app.post('/api/artworks/:id/comments', async (req, res) => {
  const { id } = req.params
  const { username, content, avatar } = req.body
  if (!username || !content) {
    return res.status(400).json({ error: '用户名和评论内容不能为空' })
  }
  const artwork = db.data.artworks.find(a => a.id === id)
  if (!artwork) {
    return res.status(404).json({ error: '作品不存在' })
  }
  const newComment = {
    id: uuidv4(),
    username,
    content,
    avatar: avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(username)}`,
    createdAt: new Date().toISOString()
  }
  artwork.comments.push(newComment)
  await db.write()
  res.status(201).json(newComment)
})

app.post('/api/artworks/:id/like', async (req, res) => {
  const { id } = req.params
  const artwork = db.data.artworks.find(a => a.id === id)
  if (!artwork) {
    return res.status(404).json({ error: '作品不存在' })
  }
  artwork.liked = !artwork.liked
  artwork.likes += artwork.liked ? 1 : -1
  if (artwork.likes < 0) artwork.likes = 0
  await db.write()
  res.json({ liked: artwork.liked, likes: artwork.likes })
})

app.listen(PORT, () => {
  console.log(`TimelessCanvas 后端服务运行在 http://localhost:${PORT}`)
})
