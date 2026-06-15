export interface SceneObject {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  emoji: string
  color: string
  memoryText: string
  puzzleKey: string
  clicked: boolean
}

export type PuzzleType = 'sequence' | 'matching' | 'cipher' | 'arrange' | 'riddle'

export interface PuzzleConfig {
  type: PuzzleType
  title: string
  description: string
  data: SequencePuzzleData | MatchingPuzzleData | CipherPuzzleData | ArrangePuzzleData | RiddlePuzzleData
}

export interface SequencePuzzleData {
  items: string[]
  correctOrder: number[]
}

export interface MatchingPuzzleData {
  pairs: [string, string][]
}

export interface CipherPuzzleData {
  encrypted: string
  shift: number
  hint: string
}

export interface ArrangePuzzleData {
  pieces: string[]
  correctPositions: number[]
}

export interface RiddlePuzzleData {
  question: string
  answer: string
  hints: string[]
}

export interface MemoryTransition {
  text: string
  duration: number
  images: string[]
}

export interface Level {
  id: number
  title: string
  subtitle: string
  objects: Omit<SceneObject, 'clicked'>[]
  puzzle: PuzzleConfig
  memory: MemoryTransition
  backgroundGradient: [string, string]
  accentColor: string
}

export const levels: Level[] = [
  {
    id: 1,
    title: '旧钟之室',
    subtitle: '时间在这里凝固',
    objects: [
      { id: 'clock1', name: '古董座钟', x: 15, y: 20, width: 14, height: 22, emoji: '🕰️', color: '#c9a96e', memoryText: '那是祖母的座钟，每到整点便会奏响一段古老的旋律...', puzzleKey: 'seq1', },
      { id: 'letter1', name: '泛黄信件', x: 55, y: 35, width: 12, height: 16, emoji: '✉️', color: '#d4b896', memoryText: '信上写着："当时针指向第三次，门便会为你开启。"', puzzleKey: 'seq2', },
      { id: 'key1', name: '铜钥匙', x: 35, y: 60, width: 10, height: 10, emoji: '🗝️', color: '#b8860b', memoryText: '钥匙上刻着一行数字：3-1-4-2', puzzleKey: 'seq3', },
      { id: 'flower1', name: '干枯玫瑰', x: 72, y: 55, width: 10, height: 12, emoji: '🌹', color: '#c4737a', memoryText: '花瓣的排列似乎暗含某种顺序...', puzzleKey: 'seq4', },
    ],
    puzzle: {
      type: 'sequence',
      title: '时光之序',
      description: '根据回忆线索，将物件按正确的时间顺序排列',
      data: {
        items: ['古董座钟', '泛黄信件', '铜钥匙', '干枯玫瑰'],
        correctOrder: [2, 0, 3, 1],
      },
    },
    memory: {
      text: '你看见一间布满灰尘的房间，阳光从百叶窗的缝隙间洒入。座钟的滴答声是这里唯一的脉搏...',
      duration: 4000,
      images: [],
    },
    backgroundGradient: ['#f5f0e8', '#e8dcc8'],
    accentColor: '#c9a96e',
  },
  {
    id: 2,
    title: '花语庭院',
    subtitle: '每朵花都藏着秘密',
    objects: [
      { id: 'rose2', name: '粉红蔷薇', x: 20, y: 25, width: 12, height: 14, emoji: '🌸', color: '#e8a0b4', memoryText: '蔷薇代表爱情，而它的配对是晨露中的蝴蝶...', puzzleKey: 'match1', },
      { id: 'lily2', name: '白色百合', x: 50, y: 20, width: 10, height: 16, emoji: '百合', color: '#f0e6d6', memoryText: '百合象征纯洁，与之相伴的是远方的钟声...', puzzleKey: 'match2', },
      { id: 'sage2', name: '鼠尾草', x: 35, y: 55, width: 11, height: 13, emoji: '🌿', color: '#9ab87a', memoryText: '鼠尾草有疗愈之力，它对应着那本古老的草药书...', puzzleKey: 'match3', },
      { id: 'sunflower2', name: '向日葵', x: 70, y: 50, width: 13, height: 15, emoji: '🌻', color: '#e8c84a', memoryText: '向日葵追逐阳光，正如飞鸟追逐南方...', puzzleKey: 'match4', },
      { id: 'butterfly2', name: '蝴蝶标本', x: 18, y: 58, width: 10, height: 10, emoji: '🦋', color: '#7ab5c4', memoryText: '蝴蝶与蔷薇，如同影子与光...', puzzleKey: 'match5', },
      { id: 'herbbook2', name: '草药书', x: 65, y: 25, width: 12, height: 14, emoji: '📖', color: '#8b7355', memoryText: '书中记载着鼠尾草的配方...', puzzleKey: 'match6', },
    ],
    puzzle: {
      type: 'matching',
      title: '花语配对',
      description: '将相关联的花朵与物件配对',
      data: {
        pairs: [
          ['粉红蔷薇', '蝴蝶标本'],
          ['鼠尾草', '草药书'],
          ['白色百合', '向日葵'],
        ],
      },
    },
    memory: {
      text: '庭院中花香弥漫，蜜蜂在花丛间穿梭。你仿佛看见了那个在花间欢笑的少女...',
      duration: 4000,
      images: [],
    },
    backgroundGradient: ['#f0ede4', '#dce8d0'],
    accentColor: '#9ab87a',
  },
  {
    id: 3,
    title: '密信之匣',
    subtitle: '文字中隐藏着真相',
    objects: [
      { id: 'diary3', name: '密码日记', x: 25, y: 22, width: 13, height: 16, emoji: '📔', color: '#a0785a', memoryText: '日记的每一页都使用了不同的密码...', puzzleKey: 'cipher1', },
      { id: 'ink3', name: '墨水瓶', x: 55, y: 30, width: 10, height: 10, emoji: '🪶', color: '#3d3d5c', memoryText: '墨水浸染处，隐约可见偏移了三位的字母...', puzzleKey: 'cipher2', },
      { id: 'seal3', name: '蜡封信', x: 38, y: 55, width: 11, height: 13, emoji: '💌', color: '#c0392b', memoryText: '蜡封之下藏着一句凯撒密码加密的话...', puzzleKey: 'cipher3', },
      { id: 'quill3', name: '羽毛笔', x: 72, y: 50, width: 10, height: 14, emoji: '✒️', color: '#6c5b7b', memoryText: '笔尖留下的痕迹暗示了偏移量为3...', puzzleKey: 'cipher4', },
    ],
    puzzle: {
      type: 'cipher',
      title: '凯撒密码',
      description: '解密隐藏在信件中的密文（偏移量为3）',
      data: {
        encrypted: 'KHOOR ZRUOG',
        shift: 3,
        hint: '每个字母向前移动3位',
      },
    },
    memory: {
      text: '昏暗的书房中，烛光摇曳。你看见一双年轻的手正在小心翼翼地写下密文...',
      duration: 4000,
      images: [],
    },
    backgroundGradient: ['#e8e0d4', '#d4c8b8'],
    accentColor: '#a0785a',
  },
  {
    id: 4,
    title: '碎片之廊',
    subtitle: '将记忆的碎片拼回原位',
    objects: [
      { id: 'photo4', name: '撕碎的照片', x: 20, y: 25, width: 12, height: 14, emoji: '🖼️', color: '#b8a088', memoryText: '照片被撕成了碎片，但每片都保留了部分画面...', puzzleKey: 'arr1', },
      { id: 'map4', name: '残缺地图', x: 50, y: 20, width: 14, height: 16, emoji: '🗺️', color: '#c4a87a', memoryText: '地图被分成了几块，需要按正确位置拼合...', puzzleKey: 'arr2', },
      { id: 'music4', name: '散落乐谱', x: 30, y: 55, width: 12, height: 12, emoji: '🎵', color: '#8b6f5c', memoryText: '乐谱的顺序被打乱了，需要重新排列...', puzzleKey: 'arr3', },
      { id: 'poem4', name: '断简残篇', x: 68, y: 52, width: 11, height: 14, emoji: '📜', color: '#d4c4a8', memoryText: '诗行的顺序已失，但韵脚暗示了正确的排列...', puzzleKey: 'arr4', },
    ],
    puzzle: {
      type: 'arrange',
      title: '碎片归位',
      description: '将打乱的碎片按正确位置排列',
      data: {
        pieces: ['春·花开', '夏·蝉鸣', '秋·叶落', '冬·雪飘'],
        correctPositions: [3, 0, 2, 1],
      },
    },
    memory: {
      text: '长长的走廊两侧挂满了画框，有些画已经褪色，有些被撕碎。你试图将它们一一拼回...',
      duration: 4000,
      images: [],
    },
    backgroundGradient: ['#e4ddd0', '#d0c4b0'],
    accentColor: '#c4a87a',
  },
  {
    id: 5,
    title: '终章·归途',
    subtitle: '所有记忆在此汇聚',
    objects: [
      { id: 'mirror5', name: '古老铜镜', x: 40, y: 15, width: 14, height: 18, emoji: '🪞', color: '#b8976e', memoryText: '镜中映出的不是你的脸，而是一段被遗忘的承诺...', puzzleKey: 'riddle1', },
      { id: 'compass5', name: '指南针', x: 18, y: 45, width: 10, height: 10, emoji: '🧭', color: '#6c7a89', memoryText: '指针永远指向北方，但真正的方向在心中...', puzzleKey: 'riddle2', },
      { id: 'candle5', name: '残烛', x: 68, y: 40, width: 8, height: 14, emoji: '🕯️', color: '#f0d58c', memoryText: '烛光虽微，却足以照亮回家的路...', puzzleKey: 'riddle3', },
      { id: 'book5', name: '合上的相册', x: 35, y: 60, width: 16, height: 14, emoji: '📕', color: '#8b4513', memoryText: '相册的最后一页写着谜题，答案就是整个故事的结局...', puzzleKey: 'riddle4', },
    ],
    puzzle: {
      type: 'riddle',
      title: '最终谜题',
      description: '回答最后的谜语，揭开整个故事的真相',
      data: {
        question: '我无脚却能行遍天下，我无口却能诉说万物，我无手却能触碰心灵，我无眼却见证一切。我是什么？',
        answer: '记忆',
        hints: ['它与时间有关', '你一直在寻找的就是它', '它存在于每个相页之中'],
      },
    },
    memory: {
      text: '所有的碎片在此汇聚，光影交错中，你终于看清了那个完整的故事——原来你就是那本相册的守护者，而每一段回忆，都是你自己的...',
      duration: 5000,
      images: [],
    },
    backgroundGradient: ['#f5efe4', '#e0d4c0'],
    accentColor: '#d4a854',
  },
]
