import { create } from 'zustand'
import type { BadgeColors, EmotionTag } from '@/utils/audioAnalysis'

export interface Comment {
  id: string
  author: string
  content: string
  createdAt: number
}

export interface Echo {
  id: string
  title: string
  memory: string
  audioUrl: string
  imageUrl: string
  emotionTag: EmotionTag
  badge: BadgeColors
  likes: number
  liked: boolean
  comments: Comment[]
  createdAt: number
  recordingCount: number
}

interface EchoState {
  echoes: Echo[]
  addEcho: (echo: Echo) => void
  toggleLike: (id: string) => void
  addComment: (echoId: string, comment: Comment) => void
  getEcho: (id: string) => Echo | undefined
}

const MOCK_IMAGES = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vinyl%20record%20shop%20warm%20lighting%20nostalgic%20atmosphere&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rainy%20window%20old%20cafe%20melancholic%20mood&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sunset%20over%20quiet%20lake%20peaceful%20serene&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=childhood%20memories%20old%20alley%20golden%20hour&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20path%20morning%20mist%20tranquil&image_size=landscape_4_3',
]

const MOCK_ECHOES: Echo[] = [
  {
    id: 'echo-1',
    title: '老唱片的午后',
    memory: '在那个老唱片店里，阳光穿过灰尘飘浮的空气，黑胶唱机传出沙哑的爵士乐，时间好像停在了那个角落。',
    audioUrl: '',
    imageUrl: MOCK_IMAGES[0],
    emotionTag: '怀旧',
    badge: {
      lowFreqColor: '#B85638',
      midFreqColor: '#3A8F65',
      highFreqColor: '#6FA8C7',
      gradientStops: ['#B85638', '#7A734E', '#3A8F65', '#549BA0', '#6FA8C7'],
      particleCount: 24,
    },
    likes: 42,
    liked: false,
    comments: [
      { id: 'c1', author: '旅人', content: '这样的午后，我也曾经历过。', createdAt: Date.now() - 86400000 },
      { id: 'c2', author: '拾光者', content: '黑胶的声音，总有种说不出的温度。', createdAt: Date.now() - 43200000 },
    ],
    createdAt: Date.now() - 259200000,
    recordingCount: 5,
  },
  {
    id: 'echo-2',
    title: '雨窗的低语',
    memory: '窗外是绵绵细雨，手边是一杯已凉的红茶。雨声敲打窗棂的节奏，像是谁在低声说着什么。',
    audioUrl: '',
    imageUrl: MOCK_IMAGES[1],
    emotionTag: '忧伤',
    badge: {
      lowFreqColor: '#9B4F3A',
      midFreqColor: '#2E7D5C',
      highFreqColor: '#89C4DE',
      gradientStops: ['#9B4F3A', '#656A4A', '#2E7D5C', '#5CA19E', '#89C4DE'],
      particleCount: 18,
    },
    likes: 38,
    liked: false,
    comments: [
      { id: 'c3', author: '听雨人', content: '雨声是最好的白噪音。', createdAt: Date.now() - 172800000 },
    ],
    createdAt: Date.now() - 172800000,
    recordingCount: 3,
  },
  {
    id: 'echo-3',
    title: '湖畔日出',
    memory: '清晨五点半，湖面如镜。第一缕光穿过薄雾，水鸟掠过水面，世界安静得只剩呼吸声。',
    audioUrl: '',
    imageUrl: MOCK_IMAGES[2],
    emotionTag: '宁静',
    badge: {
      lowFreqColor: '#A46840',
      midFreqColor: '#4CB88A',
      highFreqColor: '#7DBDD6',
      gradientStops: ['#A46840', '#789065', '#4CB88A', '#64B8B0', '#7DBDD6'],
      particleCount: 30,
    },
    likes: 56,
    liked: false,
    comments: [],
    createdAt: Date.now() - 86400000,
    recordingCount: 7,
  },
  {
    id: 'echo-4',
    title: '旧巷的回声',
    memory: '外婆家门前的那条巷子，青石板路被岁月磨得发亮。傍晚时分，邻家飘来饭菜的香气，我们在巷子里追逐嬉闹。',
    audioUrl: '',
    imageUrl: MOCK_IMAGES[3],
    emotionTag: '温暖',
    badge: {
      lowFreqColor: '#C46A3E',
      midFreqColor: '#35A06E',
      highFreqColor: '#5C9EBA',
      gradientStops: ['#C46A3E', '#7D8856', '#35A06E', '#489F94', '#5C9EBA'],
      particleCount: 36,
    },
    likes: 73,
    liked: false,
    comments: [
      { id: 'c4', author: '归人', content: '让我想起了奶奶家的弄堂。', createdAt: Date.now() - 43200000 },
      { id: 'c5', author: '晚风', content: '那些再也回不去的日子。', createdAt: Date.now() - 21600000 },
      { id: 'c6', author: '小橘', content: '眼泪都要掉下来了。', createdAt: Date.now() - 7200000 },
    ],
    createdAt: Date.now() - 432000000,
    recordingCount: 8,
  },
  {
    id: 'echo-5',
    title: '林间晨雾',
    memory: '走进那条被晨雾笼罩的林间小路，露水打湿了裤脚。远处传来布谷鸟的叫声，一切都在慢慢苏醒。',
    audioUrl: '',
    imageUrl: MOCK_IMAGES[4],
    emotionTag: '宁静',
    badge: {
      lowFreqColor: '#8E5035',
      midFreqColor: '#3D9968',
      highFreqColor: '#92C5DC',
      gradientStops: ['#8E5035', '#667550', '#3D9968', '#68AFB2', '#92C5DC'],
      particleCount: 21,
    },
    likes: 29,
    liked: false,
    comments: [
      { id: 'c7', author: '山客', content: '布谷鸟的声音是春天最好的证明。', createdAt: Date.now() - 3600000 },
    ],
    createdAt: Date.now() - 345600000,
    recordingCount: 4,
  },
]

function loadEchoes(): Echo[] {
  try {
    const stored = localStorage.getItem('echo-museum-data')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return MOCK_ECHOES
}

function saveEchoes(echoes: Echo[]) {
  try {
    localStorage.setItem('echo-museum-data', JSON.stringify(echoes))
  } catch {
    // ignore
  }
}

export const useEchoStore = create<EchoState>((set, get) => ({
  echoes: loadEchoes(),
  addEcho: (echo) => {
    set((state) => {
      const newEchoes = [echo, ...state.echoes]
      saveEchoes(newEchoes)
      return { echoes: newEchoes }
    })
  },
  toggleLike: (id) => {
    set((state) => {
      const newEchoes = state.echoes.map((e) =>
        e.id === id ? { ...e, liked: !e.liked, likes: e.liked ? e.likes - 1 : e.likes + 1 } : e
      )
      saveEchoes(newEchoes)
      return { echoes: newEchoes }
    })
  },
  addComment: (echoId, comment) => {
    set((state) => {
      const newEchoes = state.echoes.map((e) =>
        e.id === echoId ? { ...e, comments: [...e.comments, comment] } : e
      )
      saveEchoes(newEchoes)
      return { echoes: newEchoes }
    })
  },
  getEcho: (id) => get().echoes.find((e) => e.id === id),
}))
