export type ItemCategory = 'sofa' | 'chandelier' | 'painting'

export interface FurnitureItem {
  id: string
  category: ItemCategory
  name: string
  color: string
  secondaryColor?: string
}

export interface SlotPosition {
  category: ItemCategory
  x: number
  y: number
  width: number
  height: number
}

export interface ThemeConfig {
  id: string
  name: string
  wallColor: string
  wallColorDark: string
  floorColor: string
  ceilingColor: string
  shadowColor: string
  accentColor: string
  itemColorMap: Record<string, string>
}

export const SOFA_ITEMS: FurnitureItem[] = [
  { id: 'sofa-beige', category: 'sofa', name: '米白沙发', color: '#E8DFD0', secondaryColor: '#D4C8B5' },
  { id: 'sofa-brown', category: 'sofa', name: '深棕沙发', color: '#6B4F3A', secondaryColor: '#503B2B' },
  { id: 'sofa-green', category: 'sofa', name: '森林绿沙发', color: '#4A6741', secondaryColor: '#3A5234' },
]

export const CHANDELIER_ITEMS: FurnitureItem[] = [
  { id: 'chandelier-gold', category: 'chandelier', name: '金色吊灯', color: '#D4AF37', secondaryColor: '#B8941F' },
  { id: 'chandelier-black', category: 'chandelier', name: '黑色吊灯', color: '#2D2926', secondaryColor: '#1a1817' },
]

export const PAINTING_ITEMS: FurnitureItem[] = [
  { id: 'painting-abstract', category: 'painting', name: '抽象艺术画', color: '#C9A87C', secondaryColor: '#8B6914' },
  { id: 'painting-landscape', category: 'painting', name: '风景装饰画', color: '#7BA3A8', secondaryColor: '#5B8388' },
  { id: 'painting-floral', category: 'painting', name: '花卉装饰画', color: '#D4A5A5', secondaryColor: '#B88585' },
  { id: 'painting-geometric', category: 'painting', name: '几何图案画', color: '#A67B5B', secondaryColor: '#8B6548' },
]

export const ALL_ITEMS: FurnitureItem[] = [
  ...SOFA_ITEMS,
  ...CHANDELIER_ITEMS,
  ...PAINTING_ITEMS,
]

export const SLOT_POSITIONS: Record<ItemCategory, SlotPosition> = {
  sofa: { category: 'sofa', x: 50, y: 65, width: 30, height: 18 },
  chandelier: { category: 'chandelier', x: 50, y: 8, width: 18, height: 14 },
  painting: { category: 'painting', x: 78, y: 30, width: 14, height: 20 },
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'nordic',
    name: '北欧白',
    wallColor: '#FAF8F5',
    wallColorDark: '#E8E4E0',
    floorColor: '#D4C8B5',
    ceilingColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    accentColor: '#A67B5B',
    itemColorMap: {
      'sofa-beige': '#E8DFD0',
      'sofa-brown': '#6B4F3A',
      'sofa-green': '#4A6741',
      'chandelier-gold': '#D4AF37',
      'chandelier-black': '#2D2926',
      'painting-abstract': '#C9A87C',
      'painting-landscape': '#7BA3A8',
      'painting-floral': '#D4A5A5',
      'painting-geometric': '#A67B5B',
    },
  },
  {
    id: 'mocha',
    name: '摩卡棕',
    wallColor: '#C9B8A8',
    wallColorDark: '#A8988A',
    floorColor: '#6B4F3A',
    ceilingColor: '#E8DFD0',
    shadowColor: 'rgba(74, 47, 28, 0.15)',
    accentColor: '#6B4F3A',
    itemColorMap: {
      'sofa-beige': '#D4C0A8',
      'sofa-brown': '#5A3E2E',
      'sofa-green': '#3D5538',
      'chandelier-gold': '#B8941F',
      'chandelier-black': '#2D241E',
      'painting-abstract': '#B8956A',
      'painting-landscape': '#6A8B90',
      'painting-floral': '#B89090',
      'painting-geometric': '#8B6548',
    },
  },
  {
    id: 'forest',
    name: '森林绿',
    wallColor: '#D4DDD0',
    wallColorDark: '#B0BBA8',
    floorColor: '#6B5D4A',
    ceilingColor: '#EAEFE6',
    shadowColor: 'rgba(58, 82, 52, 0.15)',
    accentColor: '#4A6741',
    itemColorMap: {
      'sofa-beige': '#E0D8C8',
      'sofa-brown': '#5A4230',
      'sofa-green': '#3D5538',
      'chandelier-gold': '#C9A227',
      'chandelier-black': '#2D2926',
      'painting-abstract': '#B8A06A',
      'painting-landscape': '#5A838A',
      'painting-floral': '#B89090',
      'painting-geometric': '#8B6548',
    },
  },
  {
    id: 'smoke',
    name: '烟灰蓝',
    wallColor: '#D4D9DD',
    wallColorDark: '#A8B0B8',
    floorColor: '#5A6B7A',
    ceilingColor: '#EAEEF2',
    shadowColor: 'rgba(50, 70, 90, 0.15)',
    accentColor: '#5A6B7A',
    itemColorMap: {
      'sofa-beige': '#E0D8D0',
      'sofa-brown': '#5A4A3A',
      'sofa-green': '#3D5248',
      'chandelier-gold': '#C09030',
      'chandelier-black': '#2D2926',
      'painting-abstract': '#B8A078',
      'painting-landscape': '#5A8390',
      'painting-floral': '#B08898',
      'painting-geometric': '#7A6A58',
    },
  },
  {
    id: 'sunset',
    name: '暮霞橘',
    wallColor: '#E8D8CF',
    wallColorDark: '#D4B8A8',
    floorColor: '#7A5A4A',
    ceilingColor: '#F5ECE8',
    shadowColor: 'rgba(122, 60, 40, 0.15)',
    accentColor: '#C47451',
    itemColorMap: {
      'sofa-beige': '#E8D5C5',
      'sofa-brown': '#6B4A38',
      'sofa-green': '#4A6048',
      'chandelier-gold': '#D49A2A',
      'chandelier-black': '#2D2420',
      'painting-abstract': '#C99A6A',
      'painting-landscape': '#6A8B95',
      'painting-floral': '#C48A8A',
      'painting-geometric': '#9A6A52',
    },
  },
]

export const DEFAULT_THEME_ID = 'nordic'
