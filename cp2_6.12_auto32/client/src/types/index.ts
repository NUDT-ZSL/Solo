export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Timeline {
  id: string;
  userId: string;
  title: string;
  themeColor: string;
  shareHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  timelineId: string;
  date: string;
  title: string;
  description: string;
  coverImage?: string;
  sortOrder: number;
  likes: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  eventId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export const THEME_COLORS = [
  { name: '深邃蓝', primary: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  { name: '翠绿', primary: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  { name: '琥珀', primary: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  { name: '玫瑰', primary: '#f43f5e', bg: '#fff1f2', text: '#9f1239' },
  { name: '紫罗兰', primary: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6' },
  { name: '青蓝', primary: '#06b6d4', bg: '#ecfeff', text: '#0e7490' },
  { name: '石灰', primary: '#84cc16', bg: '#f7fee7', text: '#3f6212' },
  { name: '赤陶', primary: '#ea580c', bg: '#fff7ed', text: '#9a3412' }
];
