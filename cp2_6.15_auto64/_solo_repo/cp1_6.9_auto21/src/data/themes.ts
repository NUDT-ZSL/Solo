import type { ThemeData } from '@/types';

export const THEMES: ThemeData[] = [
  {
    id: 'starry',
    name: '星空',
    icon: 'Stars',
    gradientStart: '#0B0C10',
    gradientEnd: '#1F2833',
    accentColor: '#66FCF1',
  },
  {
    id: 'forest',
    name: '森林',
    icon: 'TreePine',
    gradientStart: '#2D6A4F',
    gradientEnd: '#95D5B2',
    accentColor: '#D8F3DC',
  },
  {
    id: 'ocean',
    name: '海浪',
    icon: 'Waves',
    gradientStart: '#0077B6',
    gradientEnd: '#90E0EF',
    accentColor: '#CAF0F8',
  },
  {
    id: 'aurora',
    name: '极光',
    icon: 'Sparkles',
    gradientStart: '#0B132B',
    gradientEnd: '#5A189A',
    accentColor: '#C77DFF',
  },
  {
    id: 'sunshine',
    name: '暖阳',
    icon: 'Sun',
    gradientStart: '#E85D04',
    gradientEnd: '#FAA307',
    accentColor: '#FFE169',
  },
];

export function getThemeById(id: string): ThemeData | undefined {
  return THEMES.find(t => t.id === id);
}
