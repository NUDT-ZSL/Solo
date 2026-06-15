export type Category = '增长' | '效率' | '体验' | '技术';

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: Category;
  intuitionScore: number;
  createdAt: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface CategoryStats {
  category: Category;
  count: number;
  color: string;
}

export interface Stats {
  totalIdeas: number;
  categoryStats: CategoryStats[];
  averageScore: number;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  '增长': '#FF6584',
  '效率': '#6C63FF',
  '体验': '#8B5CF6',
  '技术': '#00C9A7',
};

export function calculateScore(idea: Idea): number {
  const commentWeight = 2;
  const recencyWeight = 0.5;
  const now = Date.now();
  const created = new Date(idea.createdAt).getTime();
  const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, 24 - hoursSinceCreation) * recencyWeight;
  const commentBonus = idea.comments.length * commentWeight;
  return Math.min(100, idea.intuitionScore + recencyBonus + commentBonus);
}

export function sortByScore(ideas: Idea[]): Idea[] {
  return [...ideas].sort((a, b) => {
    const scoreA = calculateScore(a);
    const scoreB = calculateScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function sortByTime(ideas: Idea[]): Idea[] {
  return [...ideas].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function groupByCategory(ideas: Idea[]): Record<Category, Idea[]> {
  const groups: Record<Category, Idea[]> = {
    '增长': [],
    '效率': [],
    '体验': [],
    '技术': [],
  };
  for (const idea of ideas) {
    groups[idea.category].push(idea);
  }
  return groups;
}

export function computeStats(ideas: Idea[]): Stats {
  const categories: Category[] = ['增长', '效率', '体验', '技术'];
  const categoryStats: CategoryStats[] = categories.map((cat) => ({
    category: cat,
    count: ideas.filter((i) => i.category === cat).length,
    color: CATEGORY_COLORS[cat],
  }));

  const totalScore = ideas.reduce((sum, i) => sum + i.intuitionScore, 0);
  const averageScore = ideas.length > 0 ? Math.round(totalScore / ideas.length) : 0;

  return {
    totalIdeas: ideas.length,
    categoryStats,
    averageScore,
  };
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export function getScoreColor(score: number): string {
  if (score < 30) return '#888888';
  if (score <= 60) return '#FF9F43';
  return '#00C9A7';
}

const RANDOM_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona',
  'George', 'Hannah', 'Ivan', 'Julia', 'Kevin', 'Luna',
  'Mike', 'Nancy', 'Oscar', 'Penny', 'Quinn', 'Rachel',
  'Sam', 'Tina', 'Victor', 'Wendy', 'Xavier', 'Yuki',
];

export function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}
