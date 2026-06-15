import type { MoodColorKey } from './types';

export interface MoodColorConfig {
  key: MoodColorKey;
  name: string;
  primary: string;
  gradient: string;
  complementary: string;
  rgb: string;
}

export const MOOD_COLORS: MoodColorConfig[] = [
  {
    key: 'duskOrange',
    name: '黄昏橙',
    primary: '#FF8C42',
    gradient: 'linear-gradient(135deg, #FF8C42 0%, #FFB347 100%)',
    complementary: '#42B5FF',
    rgb: '255, 140, 66',
  },
  {
    key: 'starryBlue',
    name: '星夜蓝',
    primary: '#3D5A80',
    gradient: 'linear-gradient(135deg, #3D5A80 0%, #5C7EA8 100%)',
    complementary: '#80633D',
    rgb: '61, 90, 128',
  },
  {
    key: 'mistPurple',
    name: '晨雾紫',
    primary: '#9B72CF',
    gradient: 'linear-gradient(135deg, #9B72CF 0%, #B89AE0 100%)',
    complementary: '#A6CF72',
    rgb: '155, 114, 207',
  },
  {
    key: 'mintGreen',
    name: '薄荷绿',
    primary: '#6EC6A6',
    gradient: 'linear-gradient(135deg, #6EC6A6 0%, #9ED9C2 100%)',
    complementary: '#C66E8E',
    rgb: '110, 198, 166',
  },
  {
    key: 'rosePink',
    name: '玫瑰粉',
    primary: '#E89BB1',
    gradient: 'linear-gradient(135deg, #E89BB1 0%, #F2BCCC 100%)',
    complementary: '#9BE8D2',
    rgb: '232, 155, 177',
  },
  {
    key: 'lemonYellow',
    name: '柠檬黄',
    primary: '#F5D547',
    gradient: 'linear-gradient(135deg, #F5D547 0%, #F9E380 100%)',
    complementary: '#4767F5',
    rgb: '245, 213, 71',
  },
  {
    key: 'deepSea',
    name: '深海青',
    primary: '#2A6470',
    gradient: 'linear-gradient(135deg, #2A6470 0%, #3D8B99 100%)',
    complementary: '#70362A',
    rgb: '42, 100, 112',
  },
  {
    key: 'cherryPink',
    name: '樱花粉',
    primary: '#FFB7C5',
    gradient: 'linear-gradient(135deg, #FFB7C5 0%, #FFD4DE 100%)',
    complementary: '#B7FFF1',
    rgb: '255, 183, 197',
  },
  {
    key: 'sunsetRed',
    name: '日落红',
    primary: '#D9534F',
    gradient: 'linear-gradient(135deg, #D9534F 0%, #E8827F 100%)',
    complementary: '#4FD9D5',
    rgb: '217, 83, 79',
  },
  {
    key: 'cloudGray',
    name: '云雾灰',
    primary: '#8D99AE',
    gradient: 'linear-gradient(135deg, #8D99AE 0%, #B1BACB 100%)',
    complementary: '#AEA28D',
    rgb: '141, 153, 174',
  },
  {
    key: 'forestGreen',
    name: '森林绿',
    primary: '#4A7C46',
    gradient: 'linear-gradient(135deg, #4A7C46 0%, #6FA66A 100%)',
    complementary: '#7C467A',
    rgb: '74, 124, 70',
  },
  {
    key: 'lavender',
    name: '薰衣草',
    primary: '#B57EDC',
    gradient: 'linear-gradient(135deg, #B57EDC 0%, #CDA8F0 100%)',
    complementary: '#A5DC7E',
    rgb: '181, 126, 220',
  },
];

export function getMoodColor(key: MoodColorKey): MoodColorConfig {
  return MOOD_COLORS.find((c) => c.key === key) || MOOD_COLORS[0];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function getComplementaryColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
}
