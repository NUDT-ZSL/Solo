export interface Work {
  id: number;
  title: string;
  colors: [string, string, string];
  thumbnailDesc: string;
  tags: string[];
}

export const works: Work[] = [
  {
    id: 1,
    title: '数字山水',
    colors: ['#ff6b6b', '#4ecdc4', '#ffe66d'],
    thumbnailDesc: '抽象山水',
    tags: ['交互', '数据可视化']
  },
  {
    id: 2,
    title: '星云漫游',
    colors: ['#a855f7', '#3b82f6', '#06b6d4'],
    thumbnailDesc: '宇宙探索',
    tags: ['WebGL', '沉浸式']
  },
  {
    id: 3,
    title: '城市脉搏',
    colors: ['#f97316', '#ef4444', '#eab308'],
    thumbnailDesc: '数据城市',
    tags: ['动效', '三维地图']
  },
  {
    id: 4,
    title: '森林秘境',
    colors: ['#22c55e', '#10b981', '#14b8a6'],
    thumbnailDesc: '自然生态',
    tags: ['粒子系统', '艺术装置']
  },
  {
    id: 5,
    title: '机械花园',
    colors: ['#f43f5e', '#ec4899', '#8b5cf6'],
    thumbnailDesc: '赛博朋克',
    tags: ['机械动画', '创意编程']
  },
  {
    id: 6,
    title: '流光岁月',
    colors: ['#f59e0b', '#84cc16', '#0ea5e9'],
    thumbnailDesc: '时间艺术',
    tags: ['交互装置', '光影']
  }
];
