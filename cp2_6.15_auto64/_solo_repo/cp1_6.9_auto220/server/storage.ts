import { v4 as uuidv4 } from 'uuid';

export type TagType = '技术' | '设计' | '商业' | '生活' | '其他';

export interface Inspiration {
  id: string;
  title: string;
  description: string;
  tags: TagType[];
  votes: number;
  createdAt: number;
}

let inspirations: Inspiration[] = [
  {
    id: uuidv4(),
    title: 'AI驱动的日程管家',
    description: '根据用户习惯自动安排每日任务优先级，智能识别冲突并给出最优方案。',
    tags: ['技术', '商业'],
    votes: 42,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: uuidv4(),
    title: '极简植物养护App',
    description: '拍照识别植物种类，自动生成浇水、施肥、换盆的提醒日历，附带养护小知识。',
    tags: ['设计', '生活'],
    votes: 28,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    title: '二手技能交易市场',
    description: '把闲置的专业技能变现，比如教人做一道菜、教一小时吉他、帮忙改简历。',
    tags: ['商业', '生活'],
    votes: 67,
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: uuidv4(),
    title: '沉浸式阅读模式浏览器插件',
    description: '自动去除页面广告和干扰元素，生成柔和渐变背景，配合白噪音提升专注度。',
    tags: ['技术', '设计'],
    votes: 15,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: uuidv4(),
    title: '邻里食材共享平台',
    description: '多余的蔬菜、烘焙成果、自制酱料可以分享给邻居，减少浪费，增进社区感情。',
    tags: ['生活', '其他'],
    votes: 33,
    createdAt: Date.now() - 3600000,
  },
];

export const storage = {
  getAll(): Inspiration[] {
    return [...inspirations];
  },

  getById(id: string): Inspiration | undefined {
    return inspirations.find((item) => item.id === id);
  },

  create(data: { title: string; description: string; tags: TagType[] }): Inspiration {
    const newItem: Inspiration = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      tags: data.tags,
      votes: 0,
      createdAt: Date.now(),
    };
    inspirations.unshift(newItem);
    return newItem;
  },

  vote(id: string): Inspiration | null {
    const item = inspirations.find((i) => i.id === id);
    if (!item) return null;
    item.votes += 1;
    return item;
  },

  remove(id: string): boolean {
    const index = inspirations.findIndex((i) => i.id === id);
    if (index === -1) return false;
    inspirations.splice(index, 1);
    return true;
  },
};
