import { ColorTheme, ElementOption } from './types';

export const colorThemes: ColorTheme[] = [
  {
    id: 'deep-blue',
    name: '深海蓝',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    border: '#2563eb',
    background: '#1e3a5f',
    accent: '#dbeafe',
  },
  {
    id: 'dark-purple',
    name: '暗夜紫',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    border: '#7c3aed',
    background: '#2e1065',
    accent: '#ede9fe',
  },
  {
    id: 'ink-green',
    name: '墨玉绿',
    primary: '#10b981',
    secondary: '#34d399',
    border: '#059669',
    background: '#064e3b',
    accent: '#d1fae5',
  },
  {
    id: 'crimson-red',
    name: '绯朱砂',
    primary: '#ef4444',
    secondary: '#f87171',
    border: '#dc2626',
    background: '#450a0a',
    accent: '#fee2e2',
  },
  {
    id: 'amber-gold',
    name: '琥珀金',
    primary: '#f59e0b',
    secondary: '#fbbf24',
    border: '#d97706',
    background: '#451a03',
    accent: '#fef3c7',
  },
  {
    id: 'rose-pink',
    name: '玫瑰粉',
    primary: '#ec4899',
    secondary: '#f472b6',
    border: '#db2777',
    background: '#500724',
    accent: '#fce7f3',
  },
];

export const hairOptions: ElementOption[] = [
  { id: 'lotus', name: '荷叶头' },
  { id: 'spiky', name: '刺头' },
  { id: 'bob', name: '波波头' },
  { id: 'curly', name: '卷发' },
  { id: 'bald', name: '光头' },
];

export const eyesOptions: ElementOption[] = [
  { id: 'big', name: '大眼' },
  { id: 'squint', name: '眯眼' },
  { id: 'star', name: '星星眼' },
  { id: 'sunglasses', name: '墨镜' },
];

export const accessoryOptions: ElementOption[] = [
  { id: 'headphone', name: '耳机' },
  { id: 'hat', name: '帽子' },
  { id: 'bow', name: '蝴蝶结' },
  { id: 'mask', name: '面具' },
  { id: 'glasses', name: '眼镜' },
];
