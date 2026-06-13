
export interface Comment {
  id: string;
  text: string;
  createdAt: number;
}

export interface Gradient {
  id: string;
  name: string;
  color1: string;
  color2: string;
  angle: number;
  tags: string[];
  likes: number;
  liked: boolean;
  comments: Comment[];
}

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const demoGradients: Gradient[] = [
  {
    id: generateId(),
    name: '梦幻紫霞',
    color1: '#667eea',
    color2: '#764ba2',
    angle: 135,
    tags: ['梦幻', '紫色', '浪漫'],
    likes: 128,
    liked: false,
    comments: [
      { id: generateId(), text: '太美了！这个配色很有氛围感', createdAt: Date.now() - 3600000 },
      { id: generateId(), text: '用在登录页面应该很棒', createdAt: Date.now() - 7200000 },
    ],
  },
  {
    id: generateId(),
    name: '薄荷清新',
    color1: '#84fab0',
    color2: '#8fd3f4',
    angle: 120,
    tags: ['清新', '绿色', '极简'],
    likes: 89,
    liked: false,
    comments: [
      { id: generateId(), text: '看着很舒服～', createdAt: Date.now() - 1800000 },
    ],
  },
  {
    id: generateId(),
    name: '赛博霓虹',
    color1: '#f093fb',
    color2: '#f5576c',
    angle: 135,
    tags: ['赛博朋克', '霓虹', '粉色'],
    likes: 256,
    liked: true,
    comments: [
      { id: generateId(), text: '赛博朋克味十足！', createdAt: Date.now() - 5400000 },
      { id: generateId(), text: '酷毙了', createdAt: Date.now() - 9000000 },
      { id: generateId(), text: '收藏了', createdAt: Date.now() - 10800000 },
    ],
  },
  {
    id: generateId(),
    name: '日落余晖',
    color1: '#fa709a',
    color2: '#fee140',
    angle: 90,
    tags: ['温暖', '日落', '橙色'],
    likes: 167,
    liked: false,
    comments: [
      { id: generateId(), text: '像傍晚的天空一样美', createdAt: Date.now() - 3600000 },
    ],
  },
  {
    id: generateId(),
    name: '深海幽蓝',
    color1: '#30cfd0',
    color2: '#330867',
    angle: 180,
    tags: ['深邃', '蓝色', '海洋'],
    likes: 203,
    liked: false,
    comments: [],
  },
  {
    id: generateId(),
    name: '蜜桃苏打',
    color1: '#ffecd2',
    color2: '#fcb69f',
    angle: 135,
    tags: ['甜美', '粉色', '温柔'],
    likes: 145,
    liked: false,
    comments: [
      { id: generateId(), text: '好甜的感觉～', createdAt: Date.now() - 7200000 },
    ],
  },
  {
    id: generateId(),
    name: '极光之夜',
    color1: '#a8edea',
    color2: '#fed6e3',
    angle: 160,
    tags: ['梦幻', '极光', '清新'],
    likes: 189,
    liked: true,
    comments: [
      { id: generateId(), text: '真的有极光的感觉！', createdAt: Date.now() - 4500000 },
      { id: generateId(), text: '配色太绝了', createdAt: Date.now() - 8100000 },
    ],
  },
  {
    id: generateId(),
    name: '极简黑白',
    color1: '#232526',
    color2: '#414345',
    angle: 135,
    tags: ['极简', '黑白', '高级'],
    likes: 312,
    liked: false,
    comments: [
      { id: generateId(), text: '经典永不过时', createdAt: Date.now() - 12000000 },
      { id: generateId(), text: '商务风首选', createdAt: Date.now() - 14400000 },
    ],
  },
  {
    id: generateId(),
    name: '森林绿意',
    color1: '#11998e',
    color2: '#38ef7d',
    angle: 135,
    tags: ['自然', '绿色', '清新'],
    likes: 178,
    liked: false,
    comments: [],
  },
  {
    id: generateId(),
    name: '焦糖玛奇朵',
    color1: '#c79081',
    color2: '#dfa579',
    angle: 135,
    tags: ['温暖', '棕色', '复古'],
    likes: 96,
    liked: false,
    comments: [
      { id: generateId(), text: '好有秋日的感觉', createdAt: Date.now() - 6300000 },
    ],
  },
];
