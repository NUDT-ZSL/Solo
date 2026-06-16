import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type Instrument = 'piano' | 'guitar' | 'violin' | 'vocal';

interface Track {
  id: string;
  title: string;
  composer: string;
  instrument: Instrument;
  difficulty: number;
  duration: number;
  description: string;
}

interface Student {
  id: string;
  name: string;
  level: number;
  instrument: Instrument;
  avatarColor: string;
}

interface Feedback {
  id: string;
  studentId: string;
  teacherName: string;
  content: string;
  emoji: '👍' | '💪';
  timestamp: number;
  isNew: boolean;
}

const instrumentColors: Record<Instrument, string> = {
  piano: '#8B5CF6',
  guitar: '#10B981',
  violin: '#F59E0B',
  vocal: '#EC4899',
};

const generateTracks = (): Track[] => {
  const pianoTracks: Omit<Track, 'id' | 'instrument'>[] = [
    { title: 'C大调音阶', composer: '基础练习', difficulty: 1, duration: 5, description: '左右手分开再合手，重点练习均匀度' },
    { title: '哈农练习曲 No.1', composer: '哈农', difficulty: 1, duration: 10, description: '手指独立性训练，慢速练习' },
    { title: '小步舞曲', composer: '巴赫', difficulty: 2, duration: 12, description: '复调音乐入门，注意声部平衡' },
    { title: '致爱丽丝', composer: '贝多芬', difficulty: 3, duration: 8, description: '经典钢琴小品，注意表情记号' },
    { title: '月光奏鸣曲第一乐章', composer: '贝多芬', difficulty: 3, duration: 15, description: '三连音节奏稳定，踏板运用' },
    { title: '童年的回忆', composer: '克莱德曼', difficulty: 2, duration: 6, description: '分解和弦流畅度练习' },
    { title: '梦中的婚礼', composer: '克莱德曼', difficulty: 3, duration: 7, description: '八度跳跃的准确性' },
    { title: '土耳其进行曲', composer: '莫扎特', difficulty: 4, duration: 10, description: '快速音阶与装饰音' },
    { title: '小星星变奏曲', composer: '莫扎特', difficulty: 3, duration: 12, description: '12段变奏逐个突破' },
    { title: '车尔尼599 No.20', composer: '车尔尼', difficulty: 2, duration: 5, description: '分解和弦与转位' },
    { title: '车尔尼599 No.50', composer: '车尔尼', difficulty: 3, duration: 6, description: '左右手交替流畅' },
    { title: '车尔尼849 No.1', composer: '车尔尼', difficulty: 3, duration: 8, description: '流畅性练习曲' },
    { title: '二部创意曲 No.8', composer: '巴赫', difficulty: 4, duration: 10, description: '两声部独立性' },
    { title: '圆舞曲 Op.64 No.1', composer: '肖邦', difficulty: 4, duration: 9, description: '小狗圆舞曲，速度与弹性' },
    { title: '夜曲 Op.9 No.2', composer: '肖邦', difficulty: 4, duration: 12, description: '歌唱性旋律与踏板' },
  ];

  const guitarTracks: Omit<Track, 'id' | 'instrument'>[] = [
    { title: 'C大调和弦转换', composer: '基础练习', difficulty: 1, duration: 8, description: 'C-G-Am-F 转换流畅度' },
    { title: '爬格子练习', composer: '基础练习', difficulty: 1, duration: 10, description: '每根弦1234指顺序练习' },
    { title: '53231323分解和弦', composer: '基础练习', difficulty: 1, duration: 6, description: '右手拨弦稳定性' },
    { title: '小星星', composer: '传统民谣', difficulty: 1, duration: 4, description: '单音旋律入门' },
    { title: '兰花草', composer: '传统民谣', difficulty: 2, duration: 5, description: '简易分解和弦伴奏' },
    { title: '童年', composer: '罗大佑', difficulty: 2, duration: 7, description: '扫弦节奏练习' },
    { title: '成都', composer: '赵雷', difficulty: 3, duration: 8, description: '分解和弦与拍弦技巧' },
    { title: '晴天', composer: '周杰伦', difficulty: 3, duration: 10, description: '前奏指弹与扫弦' },
    { title: '稻香', composer: '周杰伦', difficulty: 3, duration: 9, description: '和弦转换与节奏型' },
    { title: '安河桥北间奏', composer: '宋冬野', difficulty: 4, duration: 8, description: '指弹技巧练习' },
    { title: 'Fight!', composer: '押尾桑', difficulty: 5, duration: 12, description: 'Percussive指弹技巧' },
    { title: '风之诗', composer: '押尾桑', difficulty: 4, duration: 10, description: '情感表达与音色控制' },
    { title: 'Canon in D', composer: '帕赫贝尔', difficulty: 4, duration: 12, description: '指弹改编版本' },
  ];

  const violinTracks: Omit<Track, 'id' | 'instrument'>[] = [
    { title: 'D大调音阶', composer: '基础练习', difficulty: 1, duration: 8, description: '两个八度，注意音准' },
    { title: '开塞练习曲 No.1', composer: '开塞', difficulty: 1, duration: 10, description: '入门练习曲，注意分弓' },
    { title: '开塞练习曲 No.10', composer: '开塞', difficulty: 2, duration: 12, description: '连弓与换弦练习' },
    { title: '沃尔法特 No.15', composer: '沃尔法特', difficulty: 2, duration: 8, description: '短弓练习' },
    { title: '加沃特舞曲', composer: '戈塞克', difficulty: 2, duration: 6, description: '经典小曲目' },
    { title: '小步舞曲', composer: '博凯里尼', difficulty: 3, duration: 7, description: '优雅的舞曲风格' },
    { title: '圣母颂', composer: '巴赫/古诺', difficulty: 3, duration: 6, description: '长弓与抒情旋律' },
    { title: '查尔达什舞曲', composer: '蒙蒂', difficulty: 4, duration: 10, description: '泛音与快速段落' },
    { title: '流浪者之歌', composer: '萨拉萨蒂', difficulty: 5, duration: 15, description: '高难度炫技曲目' },
    { title: '铃木第二册 - 猎人合唱', composer: '韦伯', difficulty: 2, duration: 5, description: '双音练习入门' },
    { title: '维瓦尔第a小调协奏曲第一乐章', composer: '维瓦尔第', difficulty: 3, duration: 12, description: '巴洛克风格学习' },
  ];

  const vocalTracks: Omit<Track, 'id' | 'instrument'>[] = [
    { title: '气泡音练习', composer: '基础练习', difficulty: 1, duration: 5, description: '声带闭合与放松' },
    { title: '哼鸣练习', composer: '基础练习', difficulty: 1, duration: 6, description: '共鸣位置寻找' },
    { title: 'C大调音阶练声', composer: '基础练习', difficulty: 1, duration: 8, description: 'a-e-i-o-u母音练习' },
    { title: '两只老虎', composer: '传统', difficulty: 1, duration: 3, description: '节奏音准入门' },
    { title: '送别', composer: '李叔同', difficulty: 2, duration: 5, description: '气息与乐句连贯' },
    { title: '雪绒花', composer: '罗杰斯', difficulty: 2, duration: 6, description: '温柔抒情风格' },
    { title: '故乡的云', composer: '谭健常', difficulty: 3, duration: 8, description: '情感表达练习' },
    { title: '青花瓷', composer: '周杰伦', difficulty: 3, duration: 9, description: '转音与咬字' },
    { title: '泡沫', composer: '邓紫棋', difficulty: 4, duration: 10, description: '头声与混声转换' },
    { title: '也许明天', composer: '张惠妹', difficulty: 5, duration: 12, description: '高音与爆发力' },
    { title: '我爱你中国', composer: '郑秋枫', difficulty: 4, duration: 12, description: '美声花腔练习' },
  ];

  const tracks: Track[] = [];
  pianoTracks.forEach(t => tracks.push({ ...t, id: uuidv4(), instrument: 'piano' }));
  guitarTracks.forEach(t => tracks.push({ ...t, id: uuidv4(), instrument: 'guitar' }));
  violinTracks.forEach(t => tracks.push({ ...t, id: uuidv4(), instrument: 'violin' }));
  vocalTracks.forEach(t => tracks.push({ ...t, id: uuidv4(), instrument: 'vocal' }));

  return tracks;
};

const tracks: Track[] = generateTracks();

const students: Student[] = [
  { id: uuidv4(), name: '李明', level: 2, instrument: 'piano', avatarColor: '#8B5CF6' },
  { id: uuidv4(), name: '王芳', level: 3, instrument: 'guitar', avatarColor: '#10B981' },
  { id: uuidv4(), name: '张晨', level: 1, instrument: 'violin', avatarColor: '#F59E0B' },
];

const feedbacks: Feedback[] = [
  {
    id: uuidv4(),
    studentId: students[0].id,
    teacherName: '陈老师',
    content: '本周音阶练习进步很大！均匀度明显提升，下周开始尝试增加速度到80BPM。右手放松做得很好，继续保持！👍',
    emoji: '👍',
    timestamp: Date.now() - 86400000 * 2,
    isNew: true,
  },
  {
    id: uuidv4(),
    studentId: students[0].id,
    teacherName: '陈老师',
    content: '注意车尔尼练习曲中的左手声部要保持清晰，不要被右手盖过。建议分手慢练！💪',
    emoji: '💪',
    timestamp: Date.now() - 86400000 * 5,
    isNew: false,
  },
  {
    id: uuidv4(),
    studentId: students[0].id,
    teacherName: '陈老师',
    content: '致爱丽丝的表情处理有进步，特别是中段的渐强渐弱。继续打磨踏板部分，注意和声切换时的踏板清理！',
    emoji: '👍',
    timestamp: Date.now() - 86400000 * 8,
    isNew: false,
  },
];

app.get('/api/tracks', (req, res) => {
  setTimeout(() => {
    const instrument = req.query.instrument as string;
    let result = tracks;
    if (instrument) {
      result = tracks.filter(t => t.instrument === instrument);
    }
    res.json(result);
  }, 120);
});

app.get('/api/students', (req, res) => {
  setTimeout(() => {
    res.json(students);
  }, 100);
});

app.get('/api/feedback', (req, res) => {
  setTimeout(() => {
    const studentId = req.query.studentId as string;
    let result = feedbacks;
    if (studentId) {
      result = feedbacks.filter(f => f.studentId === studentId);
    }
    res.json(result.sort((a, b) => b.timestamp - a.timestamp));
  }, 150);
});

app.post('/api/feedback', (req, res) => {
  setTimeout(() => {
    const newFeedback: Feedback = {
      id: uuidv4(),
      ...req.body,
      timestamp: Date.now(),
      isNew: true,
    };
    feedbacks.push(newFeedback);
    res.status(201).json(newFeedback);
  }, 100);
});

app.get('/api/instrument-colors', (_req: express.Request, res: express.Response) => {
  res.json(instrumentColors);
});

app.listen(PORT, () => {
  console.log(`🎵 Music Practice Server running on http://localhost:${PORT}`);
});
