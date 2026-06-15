import { ColorTheme, ElementOption } from './types';

export const colorThemes: ColorTheme[] = [
  {
    id: 'neon-purple',
    name: '霓虹紫',
    primary: '#a855f7',
    secondary: '#c084fc',
    border: '#7c3aed',
    background: '#2e1065',
    accent: '#e9d5ff',
  },
  {
    id: 'retro-orange',
    name: '复古橙',
    primary: '#f97316',
    secondary: '#fb923c',
    border: '#ea580c',
    background: '#431407',
    accent: '#ffedd5',
  },
  {
    id: 'glacier-blue',
    name: '冰河蓝',
    primary: '#06b6d4',
    secondary: '#22d3ee',
    border: '#0891b2',
    background: '#083344',
    accent: '#cffafe',
  },
  {
    id: 'forest-green',
    name: '森林绿',
    primary: '#22c55e',
    secondary: '#4ade80',
    border: '#16a34a',
    background: '#052e16',
    accent: '#dcfce7',
  },
  {
    id: 'sakura-pink',
    name: '樱花粉',
    primary: '#ec4899',
    secondary: '#f472b6',
    border: '#db2777',
    background: '#500724',
    accent: '#fce7f3',
  },
  {
    id: 'sunset-yellow',
    name: '日落黄',
    primary: '#eab308',
    secondary: '#facc15',
    border: '#ca8a04',
    background: '#422006',
    accent: '#fef9c3',
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
