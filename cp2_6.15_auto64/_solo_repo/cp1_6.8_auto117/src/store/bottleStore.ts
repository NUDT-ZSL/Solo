import { create } from 'zustand'
import type { Bottle, Comment, EmotionTag } from '@/types'

interface BottleStore {
  bottles: Bottle[]
  addBottle: (bottle: Omit<Bottle, 'id' | 'likes' | 'liked' | 'comments' | 'createdAt'>) => void
  toggleLike: (id: string) => void
  addComment: (bottleId: string, text: string) => void
  getBottle: (id: string) => Bottle | undefined
}

const MOCK_BOTTLES: Bottle[] = [
  {
    id: '1',
    audioUrl: '',
    text: '午后窗外的雨声，淅淅沥沥地敲打着玻璃，像是在诉说一个遥远的故事。泡一杯热茶，听雨声入眠。',
    emotion: 'calm',
    likes: 42,
    liked: false,
    comments: [
      { id: 'c1', bottleId: '1', text: '好治愈的声音', authorName: '小鱼', createdAt: '2026-06-07T10:30:00Z' },
      { id: 'c2', bottleId: '1', text: '让我想起了老家', authorName: '海风', createdAt: '2026-06-07T11:20:00Z' },
    ],
    createdAt: '2026-06-07T10:00:00Z',
    authorName: '雨声旅人',
  },
  {
    id: '2',
    audioUrl: '',
    text: '城市天际线的最后一抹晚霞，霓虹灯渐次亮起。我站在天桥上，录下了这座城市最忙碌时刻的喧嚣。',
    emotion: 'excited',
    likes: 28,
    liked: false,
    comments: [
      { id: 'c3', bottleId: '2', text: '好有城市感', authorName: '夜行者', createdAt: '2026-06-06T18:45:00Z' },
    ],
    createdAt: '2026-06-06T18:30:00Z',
    authorName: '霓虹猎手',
  },
  {
    id: '3',
    audioUrl: '',
    text: '翻开旧相册时，磁带播放机突然响起了那首歌。时间好像停在了那个夏天的午后，蝉鸣声里全是回忆。',
    emotion: 'sad',
    likes: 56,
    liked: false,
    comments: [
      { id: 'c4', bottleId: '3', text: '听得想哭了', authorName: '星空', createdAt: '2026-06-05T22:10:00Z' },
      { id: 'c5', bottleId: '3', text: '磁带的声音太有感觉了', authorName: '时光机', createdAt: '2026-06-05T23:00:00Z' },
    ],
    createdAt: '2026-06-05T22:00:00Z',
    authorName: '旧时光',
  },
  {
    id: '4',
    audioUrl: '',
    text: '凌晨三点，录音笔放在窗台上。蟋蟀、远处的火车、偶尔划过的风声——夜晚比想象中热闹得多。',
    emotion: 'curious',
    likes: 33,
    liked: false,
    comments: [],
    createdAt: '2026-06-04T03:00:00Z',
    authorName: '夜行探险家',
  },
  {
    id: '5',
    audioUrl: '',
    text: '外婆家老灶台烧柴火的声音，噼里啪啦的。灶台上蒸着年糕，满屋子都是甜糯的味道。这是我记忆里最温暖的声音。',
    emotion: 'nostalgic',
    likes: 71,
    liked: false,
    comments: [
      { id: 'c6', bottleId: '5', text: '好温馨的画面', authorName: '暖阳', createdAt: '2026-06-03T14:30:00Z' },
      { id: 'c7', bottleId: '5', text: '想起了奶奶家的灶台', authorName: '小溪', createdAt: '2026-06-03T15:00:00Z' },
      { id: 'c8', bottleId: '5', text: '年糕的味道浮现在脑海里', authorName: '云朵', createdAt: '2026-06-03T16:20:00Z' },
    ],
    createdAt: '2026-06-03T14:00:00Z',
    authorName: '灶台边的猫',
  },
  {
    id: '6',
    audioUrl: '',
    text: '海浪拍打礁石的声音，一浪接一浪。坐在海边发呆的下午，什么都不想，只听潮起潮落。',
    emotion: 'calm',
    likes: 48,
    liked: false,
    comments: [
      { id: 'c9', bottleId: '6', text: '海浪声是最好的白噪音', authorName: '贝壳', createdAt: '2026-06-02T16:00:00Z' },
    ],
    createdAt: '2026-06-02T15:30:00Z',
    authorName: '听海人',
  },
  {
    id: '7',
    audioUrl: '',
    text: '游乐园过山车的尖叫声、旋转木马的音乐、爆米花机的砰砰声——所有快乐的声音混在一起！',
    emotion: 'excited',
    likes: 19,
    liked: false,
    comments: [],
    createdAt: '2026-06-01T11:00:00Z',
    authorName: '快乐制造机',
  },
  {
    id: '8',
    audioUrl: '',
    text: '老式收音机调频时的滋滋声，偶尔串台听到一段戏曲，然后又消失了。像是在时光隧道里捡到了碎片。',
    emotion: 'nostalgic',
    likes: 37,
    liked: false,
    comments: [
      { id: 'c10', bottleId: '8', text: '收音机的声音太有年代感了', authorName: '电波', createdAt: '2026-05-31T20:00:00Z' },
    ],
    createdAt: '2026-05-31T19:30:00Z',
    authorName: '频道漂流者',
  },
]

export const useBottleStore = create<BottleStore>((set, get) => ({
  bottles: MOCK_BOTTLES,
  addBottle: (bottle) => {
    const newBottle: Bottle = {
      ...bottle,
      id: Date.now().toString(),
      likes: 0,
      liked: false,
      comments: [],
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ bottles: [newBottle, ...state.bottles] }))
  },
  toggleLike: (id) => {
    set((state) => ({
      bottles: state.bottles.map((b) =>
        b.id === id
          ? { ...b, liked: !b.liked, likes: b.liked ? b.likes - 1 : b.likes + 1 }
          : b
      ),
    }))
  },
  addComment: (bottleId, text) => {
    const comment: Comment = {
      id: Date.now().toString(),
      bottleId,
      text,
      authorName: '匿名旅人',
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      bottles: state.bottles.map((b) =>
        b.id === bottleId ? { ...b, comments: [...b.comments, comment] } : b
      ),
    }))
  },
  getBottle: (id) => get().bottles.find((b) => b.id === id),
}))
