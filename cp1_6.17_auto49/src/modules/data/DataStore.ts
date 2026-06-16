import { create } from 'zustand';

export type MusicianId = 'galaxy' | 'jazzCat' | 'electronicRain' | 'mountainWind' | 'lonelyStar';

export interface Musician {
  id: MusicianId;
  name: string;
  style: string;
  wallColor: string;
  floorColor: string;
  accentColor: string;
  description: string;
}

export interface MusicItem {
  id: string;
  musicianId: MusicianId;
  name: string;
  icon: string;
  riddle: string;
  answer: string;
  melody: number[];
  unlockedTrack: {
    title: string;
    artist: string;
    story: string;
  };
}

export interface ExplorationRecord {
  itemId: string;
  musicianId: MusicianId;
  attempts: number;
  unlocked: boolean;
  unlockedAt: number | null;
  lockedUntil: number | null;
  explorationTime: number;
}

export interface DataStoreState {
  userName: string | null;
  currentMusicianId: MusicianId | null;
  musicians: Musician[];
  musicItems: MusicItem[];
  explorationRecords: ExplorationRecord[];
  totalScore: number;
  currentPage: 'register' | 'map' | 'portfolio' | 'report';
  
  setUserName: (name: string) => void;
  setCurrentMusician: (musicianId: MusicianId) => void;
  setCurrentPage: (page: 'register' | 'map' | 'portfolio' | 'report') => void;
  recordExploration: (itemId: string, correct: boolean, attempts: number) => void;
  addExplorationTime: (musicianId: MusicianId, seconds: number) => void;
  getItemRecord: (itemId: string) => ExplorationRecord | undefined;
  getUnlockedTracks: () => Array<{ item: MusicItem; record: ExplorationRecord }>;
  getStats: () => {
    totalUnlocked: number;
    totalExplored: number;
    avgAttempts: number;
    perMusicianStats: Record<MusicianId, { unlocked: number; total: number; explorationTime: number }>;
  };
  resetLock: (itemId: string) => void;
}

export const musicians: Musician[] = [
  {
    id: 'galaxy',
    name: '银河乐队',
    style: '星云壁纸+银灰家具',
    wallColor: '#1A237E',
    floorColor: '#455A64',
    accentColor: '#B388FF',
    description: '来自宇宙深处的迷幻电子摇滚'
  },
  {
    id: 'jazzCat',
    name: '爵士猫',
    style: '复古红砖墙+黄色灯光',
    wallColor: '#BF360C',
    floorColor: '#5D4037',
    accentColor: '#FFB300',
    description: '午夜酒馆的慵懒爵士三重奏'
  },
  {
    id: 'electronicRain',
    name: '电子雨',
    style: '霓虹都市+赛博朋克',
    wallColor: '#0D47A1',
    floorColor: '#263238',
    accentColor: '#00E5FF',
    description: '未来都市的合成器浪潮'
  },
  {
    id: 'mountainWind',
    name: '山风谣',
    style: '原木木屋+自然绿植',
    wallColor: '#33691E',
    floorColor: '#8D6E63',
    accentColor: '#8BC34A',
    description: '山谷间飘荡的民谣诗篇'
  },
  {
    id: 'lonelyStar',
    name: '孤独星',
    style: '极简白+孤独蓝调',
    wallColor: '#37474F',
    floorColor: '#546E7A',
    accentColor: '#64B5F6',
    description: '一个人的深夜独奏'
  }
];

const itemNames = ['吉他', '奖杯', '老照片', '唱片机', '海报', '盆栽', '咖啡杯', '收音机'];
const itemIcons = ['🎸', '🏆', '📷', '📀', '🖼️', '🌿', '☕', '📻'];

const riddles: Record<MusicianId, string[]> = {
  galaxy: [
    '六根弦上星云舞，指尖划过宇宙路',
    '金光闪烁荣誉榜，银河深处最响亮',
    '黑白定格旧时光，星尘故事里面藏',
    '黑胶旋转音波起，银河回声千万里',
    '墙上贴满星际梦，巡演足迹遍星空',
    '翠绿盆栽吸辐射，空间站里添生机',
    '咖啡香浓提精神，熬夜创作太空人',
    '无线电波传信号，外星生命也听到'
  ],
  jazzCat: [
    '六弦弹起蓝调曲，午夜酒馆最惬意',
    '爵士大赛第一名，金猫奖杯亮晶晶',
    '泛黄照片忆当年，爵士大师留笑颜',
    '黑胶唱片转不停，萨克斯风伴月明',
    '复古海报贴满墙，爵士名伶聚一堂',
    '猫尾草盆栽青青，慵懒猫咪最爱它',
    '浓缩咖啡加牛奶，爵士深夜离不开',
    '调频找到爵士台，摇摆旋律传过来'
  ],
  electronicRain: [
    '电吉他失真轰鸣，霓虹灯下最激情',
    '电音比赛拿金奖，合成器声音最响',
    '赛博朋克旧照片，霓虹灯影忆从前',
    '打碟机旋转不停，电子雨落霓虹灯',
    '电子音乐节海报，霓虹色彩真闪耀',
    '空气净化器盆栽，都市雾霾全走开',
    '能量饮料加冰块，电子舞曲high起来',
    '合成器键盘收音，电子脉冲入人心'
  ],
  mountainWind: [
    '木吉他声山谷回，清风明月来相会',
    '民歌比赛拿金奖，山间回响最嘹亮',
    '老照片里乡愁浓，山间小路旧颜容',
    '老唱机放山歌调，山风伴舞乐逍遥',
    '民谣巡演海报贴，山间小镇都走遍',
    '山间野花盆栽香，自然气息满室芳',
    '山泉水泡山茶叶，民谣歌手心愉悦',
    '收音机里山歌飘，山间牧童也逍遥'
  ],
  lonelyStar: [
    '木吉他独奏夜未央，孤单心事轻轻唱',
    '音乐奖杯独自赏，无人分享也荣光',
    '旧照片里独行人，往事如烟忆旧尘',
    '老唱片转声悠悠，一人听也解千愁',
    '单人演唱会海报，孤独灵魂也骄傲',
    '仙人球耐旱盆栽，独自绽放也精彩',
    '冷咖啡杯在手边，独自创作到明天',
    '深夜电台传歌声，寂寞灵魂有人等'
  ]
};

const answers: Record<MusicianId, string[]> = {
  galaxy: ['吉他', '奖杯', '老照片', '唱片机', '海报', '盆栽', '咖啡杯', '收音机'],
  jazzCat: ['吉他', '奖杯', '老照片', '唱片机', '海报', '盆栽', '咖啡杯', '收音机'],
  electronicRain: ['吉他', '奖杯', '老照片', '唱片机', '海报', '盆栽', '咖啡杯', '收音机'],
  mountainWind: ['吉他', '奖杯', '老照片', '唱片机', '海报', '盆栽', '咖啡杯', '收音机'],
  lonelyStar: ['吉他', '奖杯', '老照片', '唱片机', '海报', '盆栽', '咖啡杯', '收音机']
};

const stories: Record<MusicianId, string[]> = {
  galaxy: [
    '这首曲子创作于一次观测流星雨的夜晚，每一个音符都对应着一颗流星的轨迹。',
    '这是我们乐队获得的第一个奖项，那天晚上我们在颁奖典礼上演奏了三首歌。',
    '这是我们第一次巡演时拍的照片，当时我们只有一辆破旧的面包车。',
    '这张黑胶唱片收录了我们最早的Demo，当时我们在车库里录了整整一个夏天。',
    '这张海报是我们第一次星际音乐节演出的宣传画，设计灵感来自超新星爆发。',
    '这盆植物陪伴我们完成了第三张专辑，它见证了无数个创作的深夜。',
    '在录制这张专辑时，我们喝掉了300杯咖啡，这是我们的创作燃料。',
    '这首歌的灵感来自一次偶然收到的太空信号，我们将其转化为了旋律。'
  ],
  jazzCat: [
    '这首蓝调曲子是我在一个雨夜写的，窗外的雨滴声就是最好的节拍。',
    '这座奖杯是我第一次参加爵士比赛获得的，那时候我还只是个学生。',
    '这张照片里的老人是我的启蒙老师，他教会了我什么是真正的爵士乐。',
    '这张唱片是我最崇拜的爵士大师的专辑，它改变了我对音乐的理解。',
    '这是我第一次专场演出的海报，那天来了很多朋友，我永远记得。',
    '这只猫是我最好的听众，它总是在我弹琴时静静地趴在旁边。',
    '爵士乐和咖啡是绝配，这杯意式浓缩帮我度过了无数创作瓶颈。',
    '深夜的爵士电台是我最好的伙伴，那些老歌总能触动心弦。'
  ],
  electronicRain: [
    '这首曲子用了32层合成器堆叠，模拟霓虹灯下雨夜的层次感。',
    '这个奖项是我第一次在国际电子音乐节上获奖，那天我激动得手抖。',
    '这张照片拍于我第一次在地下俱乐部演出，当时只有50个观众。',
    '这张唱片是电子音乐的开山之作，它让我决定成为一名电子音乐人。',
    '这是我第一次万人演唱会的海报，那天的灯光秀我至今难忘。',
    '工作室里的这盆绿植是我与自然的唯一连接，在赛博都市中很珍贵。',
    '能量饮料是我通宵制作音乐的必备，这杯已经是今晚的第三杯了。',
    '这首曲子里的每个音效都来自我收集的城市声音，真正的城市之音。'
  ],
  mountainWind: [
    '这首歌是我在山顶看日出时写的，旋律随着朝阳一同升起。',
    '这个民歌奖项是对我多年坚持的肯定，山里的父老乡亲都为我高兴。',
    '这张照片是我和爷爷的合影，他是我的第一位吉他老师。',
    '这张老唱片是爷爷留给我的，里面的山歌陪伴了我的整个童年。',
    '这是我第一次在山里举办民谣音乐会的海报，来了好多村民。',
    '这盆野花是我从山上挖下来的，它让工作室充满山的气息。',
    '山里的泉水泡的茶特别甜，这是我写歌时最好的陪伴。',
    '山里的收音机信号不好，但总能收到远方的歌声，很奇妙。'
  ],
  lonelyStar: [
    '这首歌写于一个失眠的夜晚，只有吉他和我，还有窗外的月亮。',
    '这个奖项是我独自参加比赛获得的，虽然孤独但很有成就感。',
    '这张照片里的人是曾经的自己，那时候我以为音乐路上会有人同行。',
    '这张唱片陪我度过了最艰难的日子，孤独的时候还有音乐。',
    '这场演唱会只有我一个人，但台下的每一双眼睛都让我感动。',
    '这盆仙人球不需要太多照顾，就像我，一个人也能活得很好。',
    '冷咖啡已经续了第三杯，没关系，创作本来就是孤独的旅程。',
    '深夜电台里的这首歌，像是另一个孤独的灵魂在对我说话。'
  ]
};

const trackTitles: Record<MusicianId, string[]> = {
  galaxy: ['星云华尔兹', '超新星之梦', '星际迷航', '黑洞引力', '银河回声', '量子纠缠', '光年之外', '暗物质'],
  jazzCat: ['午夜蓝调', '咖啡馆即兴', '萨克斯独白', '钢琴三重奏', '摇摆时光', '爵士春秋', '慵懒午后', '夜幕低垂'],
  electronicRain: ['霓虹梦境', '赛博朋克', '合成器起义', '数字雨', '脉冲信号', '未来都市', '电子灵魂', '机械心跳'],
  mountainWind: ['山谷回响', '溪水潺潺', '松涛阵阵', '云海日出', '梯田牧歌', '竹林清风', '山涧鸟鸣', '炊烟袅袅'],
  lonelyStar: ['独白', '深夜车站', '单人房间', '无声电影', '零度温暖', '透明人', '记忆碎片', '晚安城市']
};

const melodies: Record<string, number[]> = {
  guitar: [261.63, 293.66, 329.63, 261.63],
  trophy: [523.25, 659.25, 783.99, 1046.50],
  photo: [220.00, 246.94, 261.63, 220.00],
  vinyl: [196.00, 220.00, 246.94, 196.00],
  poster: [329.63, 392.00, 493.88, 329.63],
  plant: [261.63, 220.00, 196.00, 174.61],
  coffee: [293.66, 349.23, 440.00, 349.23],
  radio: [440.00, 392.00, 349.23, 293.66]
};

const itemIds = ['guitar', 'trophy', 'photo', 'vinyl', 'poster', 'plant', 'coffee', 'radio'];

function generateMusicItems(): MusicItem[] {
  const items: MusicItem[] = [];
  musicians.forEach(musician => {
    itemNames.forEach((name, index) => {
      items.push({
        id: `${musician.id}-${itemIds[index]}`,
        musicianId: musician.id,
        name,
        icon: itemIcons[index],
        riddle: riddles[musician.id][index],
        answer: answers[musician.id][index],
        melody: melodies[itemIds[index]],
        unlockedTrack: {
          title: trackTitles[musician.id][index],
          artist: musician.name,
          story: stories[musician.id][index]
        }
      });
    });
  });
  return items;
}

export const musicItems = generateMusicItems();

export const useDataStore = create<DataStoreState>((set, get) => ({
  userName: null,
  currentMusicianId: null,
  musicians,
  musicItems,
  explorationRecords: [],
  totalScore: 0,
  currentPage: 'register',

  setUserName: (name: string) => set({ userName: name }),
  setCurrentMusician: (musicianId: MusicianId) => set({ currentMusicianId: musicianId }),
  setCurrentPage: (page) => set({ currentPage: page }),

  recordExploration: (itemId: string, correct: boolean, attempts: number) => {
    const state = get();
    const existing = state.explorationRecords.find(r => r.itemId === itemId);
    const item = state.musicItems.find(i => i.id === itemId);
    
    if (!item) return;

    const now = Date.now();
    
    if (existing) {
      const updatedRecords = state.explorationRecords.map(r => {
        if (r.itemId === itemId) {
          const newAttempts = r.attempts + attempts;
          const locked = newAttempts >= 3 && !correct;
          return {
            ...r,
            attempts: newAttempts,
            unlocked: correct,
            unlockedAt: correct ? now : r.unlockedAt,
            lockedUntil: locked ? now + 10 * 60 * 1000 : r.lockedUntil
          };
        }
        return r;
      });
      set({
        explorationRecords: updatedRecords,
        totalScore: correct ? state.totalScore + 10 : state.totalScore
      });
    } else {
      const locked = attempts >= 3 && !correct;
      const newRecord: ExplorationRecord = {
        itemId,
        musicianId: item.musicianId,
        attempts,
        unlocked: correct,
        unlockedAt: correct ? now : null,
        lockedUntil: locked ? now + 10 * 60 * 1000 : null,
        explorationTime: 0
      };
      set({
        explorationRecords: [...state.explorationRecords, newRecord],
        totalScore: correct ? state.totalScore + 10 : state.totalScore
      });
    }
  },

  addExplorationTime: (musicianId: MusicianId, seconds: number) => {
    const state = get();
    const updatedRecords = state.explorationRecords.map(r => {
      if (r.musicianId === musicianId) {
        return { ...r, explorationTime: r.explorationTime + seconds };
      }
      return r;
    });
    set({ explorationRecords: updatedRecords });
  },

  getItemRecord: (itemId: string) => {
    return get().explorationRecords.find(r => r.itemId === itemId);
  },

  getUnlockedTracks: () => {
    const state = get();
    return state.explorationRecords
      .filter(r => r.unlocked)
      .map(r => {
        const item = state.musicItems.find(i => i.id === r.itemId);
        return item ? { item, record: r } : null;
      })
      .filter(Boolean) as Array<{ item: MusicItem; record: ExplorationRecord }>;
  },

  getStats: () => {
    const state = get();
    const perMusicianStats: Record<MusicianId, { unlocked: number; total: number; explorationTime: number }> = {
      galaxy: { unlocked: 0, total: 0, explorationTime: 0 },
      jazzCat: { unlocked: 0, total: 0, explorationTime: 0 },
      electronicRain: { unlocked: 0, total: 0, explorationTime: 0 },
      mountainWind: { unlocked: 0, total: 0, explorationTime: 0 },
      lonelyStar: { unlocked: 0, total: 0, explorationTime: 0 }
    };

    state.musicItems.forEach(item => {
      perMusicianStats[item.musicianId].total++;
    });

    let totalAttempts = 0;
    let totalExplored = 0;

    state.explorationRecords.forEach(record => {
      if (record.unlocked) {
        perMusicianStats[record.musicianId].unlocked++;
      }
      totalAttempts += record.attempts;
      totalExplored++;
      perMusicianStats[record.musicianId].explorationTime += record.explorationTime;
    });

    const totalUnlocked = state.explorationRecords.filter(r => r.unlocked).length;

    return {
      totalUnlocked,
      totalExplored,
      avgAttempts: totalExplored > 0 ? totalAttempts / totalExplored : 0,
      perMusicianStats
    };
  },

  resetLock: (itemId: string) => {
    const state = get();
    const updatedRecords = state.explorationRecords.map(r => {
      if (r.itemId === itemId) {
        return { ...r, lockedUntil: null, attempts: 0 };
      }
      return r;
    });
    set({ explorationRecords: updatedRecords });
  }
}));
