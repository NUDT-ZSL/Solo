import { EP, MoodTagColorMap } from './types'

export const moodTagColors: MoodTagColorMap = {
  '温暖': '#F1C40F',
  '忧郁': '#3498DB',
  '迷幻': '#9B59B6',
  '激昂': '#E74C3C',
  '宁静': '#2ECC71',
  '怀旧': '#E67E22',
  '梦幻': '#1ABC9C',
  '叛逆': '#C0392B',
  '治愈': '#F39C12',
  '实验': '#8E44AD'
}

export const epsData: EP[] = [
  {
    id: 'ep-1',
    title: '初醒',
    releaseDate: '2019-03-15',
    year: 2019,
    coverColor: {
      primary: '#FF6B35',
      secondary: '#F7DC6F',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-1-1',
        title: '清晨的光',
        duration: 240,
        lyricSnippet: '阳光透过窗帘，温柔地唤醒了沉睡的梦，新的一天在等待着我...'
      },
      {
        id: 'track-1-2',
        title: '咖啡香气',
        duration: 198,
        lyricSnippet: '杯子里升腾的热气，带着苦涩的甜蜜，这是属于我的仪式...'
      },
      {
        id: 'track-1-3',
        title: '第一步',
        duration: 276,
        lyricSnippet: '踏出家门的那一刻，世界在我面前展开，未知的冒险在召唤...'
      }
    ],
    moodTags: ['温暖', '治愈', '宁静'],
    description: '关于早晨、希望和新开始的三张小品'
  },
  {
    id: 'ep-2',
    title: '雨季',
    releaseDate: '2019-07-22',
    year: 2019,
    coverColor: {
      primary: '#3498DB',
      secondary: '#2C3E50',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-2-1',
        title: '窗外的雨',
        duration: 312,
        lyricSnippet: '雨滴敲打玻璃窗，像是在诉说什么，我静静地听着，任凭思绪飘远...'
      },
      {
        id: 'track-2-2',
        title: '灰色天空',
        duration: 258,
        lyricSnippet: '今天的天空是灰色的，像我的心情一样，找不到出口...'
      }
    ],
    moodTags: ['忧郁', '宁静', '怀旧'],
    description: '雨季的忧郁与诗意'
  },
  {
    id: 'ep-3',
    title: '霓虹夜',
    releaseDate: '2020-01-10',
    year: 2020,
    coverColor: {
      primary: '#9B59B6',
      secondary: '#E91E63',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-3-1',
        title: '午夜霓虹',
        duration: 294,
        lyricSnippet: '城市的霓虹灯在闪烁，映照着每张疲惫的脸，我们在黑暗中寻找光明...'
      },
      {
        id: 'track-3-2',
        title: '迷幻公路',
        duration: 342,
        lyricSnippet: '车轮滚动，视线模糊，前方是未知的旅程，我只想一直往前开...'
      },
      {
        id: 'track-3-3',
        title: '电子梦境',
        duration: 276,
        lyricSnippet: '合成器的声音在耳边盘旋，我进入了另一个世界，那里没有烦恼...'
      }
    ],
    moodTags: ['迷幻', '梦幻', '实验'],
    description: '电子音乐与城市夜景的融合'
  },
  {
    id: 'ep-4',
    title: '野火',
    releaseDate: '2020-06-05',
    year: 2020,
    coverColor: {
      primary: '#E74C3C',
      secondary: '#C0392B',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-4-1',
        title: '燃烧的心',
        duration: 264,
        lyricSnippet: '我的心在燃烧，像野火一样蔓延，无法扑灭，无法阻挡...'
      },
      {
        id: 'track-4-2',
        title: '呐喊',
        duration: 222,
        lyricSnippet: '我要大声呐喊，让全世界都听见，我的愤怒，我的渴望，我的存在...'
      }
    ],
    moodTags: ['激昂', '叛逆'],
    description: '愤怒与激情的释放'
  },
  {
    id: 'ep-5',
    title: '老照片',
    releaseDate: '2021-02-14',
    year: 2021,
    coverColor: {
      primary: '#E67E22',
      secondary: '#D35400',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-5-1',
        title: '泛黄的回忆',
        duration: 288,
        lyricSnippet: '翻开旧相册，那些熟悉的面孔，如今都散落在天涯...'
      },
      {
        id: 'track-5-2',
        title: '童年的夏天',
        duration: 306,
        lyricSnippet: '蝉鸣、西瓜、老风扇，那是我再也回不去的夏天...'
      },
      {
        id: 'track-5-3',
        title: '写给未来的信',
        duration: 252,
        lyricSnippet: '亲爱的我，你现在还好吗？是否还记得年轻时的梦想...'
      }
    ],
    moodTags: ['怀旧', '温暖', '治愈'],
    description: '关于回忆与时间的音乐日记'
  },
  {
    id: 'ep-6',
    title: '深海',
    releaseDate: '2021-11-20',
    year: 2021,
    coverColor: {
      primary: '#1ABC9C',
      secondary: '#16A085',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-6-1',
        title: '潜入深蓝',
        duration: 324,
        lyricSnippet: '海水包围着我，压力越来越大，我却感到前所未有的平静...'
      },
      {
        id: 'track-6-2',
        title: '鲸歌',
        duration: 270,
        lyricSnippet: '远处传来鲸鱼的歌声，那是来自深海的呼唤，我循着声音游去...'
      }
    ],
    moodTags: ['梦幻', '宁静', '迷幻'],
    description: '海洋深处的冥想与幻想'
  },
  {
    id: 'ep-7',
    title: '机械心',
    releaseDate: '2022-08-08',
    year: 2022,
    coverColor: {
      primary: '#8E44AD',
      secondary: '#2C3E50',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-7-1',
        title: '齿轮转动',
        duration: 294,
        lyricSnippet: '滴答滴答，齿轮在转动，我的心是机械做的，不会痛...'
      },
      {
        id: 'track-7-2',
        title: '二进制的爱',
        duration: 246,
        lyricSnippet: '0和1构成的世界，我们的爱是一段代码，永恒而冰冷...'
      },
      {
        id: 'track-7-3',
        title: '系统崩溃',
        duration: 318,
        lyricSnippet: '错误、警告、系统崩溃，我是谁？我在哪里？一切都在瓦解...'
      },
      {
        id: 'track-7-4',
        title: '重启',
        duration: 234,
        lyricSnippet: '按下重启键，一切归零，新的系统正在加载...'
      }
    ],
    moodTags: ['实验', '迷幻', '叛逆'],
    description: '赛博朋克式的实验性作品'
  },
  {
    id: 'ep-8',
    title: '归途',
    releaseDate: '2023-04-01',
    year: 2023,
    coverColor: {
      primary: '#2ECC71',
      secondary: '#27AE60',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-8-1',
        title: '回家的路',
        duration: 276,
        lyricSnippet: '火车缓缓驶入站台，我知道，离家越来越近了...'
      },
      {
        id: 'track-8-2',
        title: '熟悉的味道',
        duration: 240,
        lyricSnippet: '妈妈做的饭菜香，还是记忆中的味道，那一刻，所有的疲惫都消失了...'
      }
    ],
    moodTags: ['温暖', '治愈', '宁静'],
    description: '关于回家与归属的温暖篇章'
  },
  {
    id: 'ep-9',
    title: '裂缝中的光',
    releaseDate: '2023-09-15',
    year: 2023,
    coverColor: {
      primary: '#F39C12',
      secondary: '#E67E22',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-9-1',
        title: '黑暗中的微光',
        duration: 300,
        lyricSnippet: '在最深的绝望里，我看见了一丝光，虽然微弱，却足以照亮前行的路...'
      },
      {
        id: 'track-9-2',
        title: '破茧',
        duration: 258,
        lyricSnippet: '束缚我的茧正在破裂，痛苦中我获得新生，翅膀在阳光下闪耀...'
      },
      {
        id: 'track-9-3',
        title: '光的孩子',
        duration: 282,
        lyricSnippet: '我们都是光的孩子，从黑暗中来，终将回到光中去...'
      }
    ],
    moodTags: ['治愈', '温暖', '激昂'],
    description: '在黑暗中寻找光明的旅程'
  },
  {
    id: 'ep-10',
    title: '星际漫游',
    releaseDate: '2024-01-20',
    year: 2024,
    coverColor: {
      primary: '#6C5CE7',
      secondary: '#0984E3',
      text: '#FFFFFF'
    },
    tracks: [
      {
        id: 'track-10-1',
        title: '失重',
        duration: 336,
        lyricSnippet: '身体漂浮在空中，没有重力，没有方向，只有无尽的星空...'
      },
      {
        id: 'track-10-2',
        title: '光年之外',
        duration: 294,
        lyricSnippet: '距离地球多少光年？我已经记不清了，只记得星星的名字...'
      },
      {
        id: 'track-10-3',
        title: '黑洞边缘',
        duration: 312,
        lyricSnippet: '时间在这里静止，空间在这里扭曲，我在黑洞边缘起舞...'
      },
      {
        id: 'track-10-4',
        title: '星云摇篮曲',
        duration: 264,
        lyricSnippet: '星云在旋转，恒星在诞生，宇宙在轻声哼唱...'
      },
      {
        id: 'track-10-5',
        title: '回家的信号',
        duration: 288,
        lyricSnippet: '遥远的地方传来熟悉的信号，那是家的方向，我要回去了...'
      }
    ],
    moodTags: ['迷幻', '梦幻', '实验', '宁静'],
    description: '关于宇宙、时间与存在的太空摇滚史诗'
  }
]
