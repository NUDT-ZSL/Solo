export interface CardTheme {
  front: string;
  back: string;
  glow: string;
  accent: string;
}

export interface CardData {
  id: number;
  title: string;
  description: string;
  theme: CardTheme;
}

export const cardThemes: CardTheme[] = [
  {
    front: '#2d3561',
    back: '#5c6bc0',
    glow: '#7986cb',
    accent: '#e8eaf6'
  },
  {
    front: '#00695c',
    back: '#26a69a',
    glow: '#4db6ac',
    accent: '#e0f2f1'
  },
  {
    front: '#e65100',
    back: '#ff9800',
    glow: '#ffb74d',
    accent: '#fff3e0'
  },
  {
    front: '#880e4f',
    back: '#ec407a',
    glow: '#f48fb1',
    accent: '#fce4ec'
  },
  {
    front: '#1a237e',
    back: '#5c6bc0',
    glow: '#7986cb',
    accent: '#e8eaf6'
  },
  {
    front: '#bf360c',
    back: '#ff5722',
    glow: '#ff8a65',
    accent: '#fbe9e7'
  },
  {
    front: '#004d40',
    back: '#00897b',
    glow: '#26a69a',
    accent: '#e0f2f1'
  },
  {
    front: '#4a148c',
    back: '#9c27b0',
    glow: '#ba68c8',
    accent: '#f3e5f5'
  }
];

export const cardContents: { title: string; description: string }[] = [
  {
    title: '星辰大海',
    description: '探索无垠宇宙的奥秘，每一颗星星都承载着人类的梦想与希望。'
  },
  {
    title: '数字世界',
    description: '在虚拟与现实的交汇处，我们创造着无限可能的数字未来。'
  },
  {
    title: '自然之美',
    description: '山川湖海，花鸟虫鱼，大自然的鬼斧神工令人叹为观止。'
  },
  {
    title: '艺术创造',
    description: '色彩与形态的碰撞，灵感与技艺的融合，绽放艺术之花。'
  },
  {
    title: '科技创新',
    description: '从蒸汽机到人工智能，人类的智慧推动着文明不断前行。'
  },
  {
    title: '城市之光',
    description: '霓虹闪烁的都市夜景，是现代文明最生动的写照。'
  },
  {
    title: '深海秘境',
    description: '蔚蓝深处隐藏着未知的生命，等待着勇敢者的探索。'
  },
  {
    title: '时空旅人',
    description: '穿越时间与空间的边界，见证历史与未来的交汇。'
  }
];

export function generateCardData(): CardData[] {
  return cardContents.map((content, index) => ({
    id: index,
    title: content.title,
    description: content.description,
    theme: cardThemes[index % cardThemes.length]
  }));
}
