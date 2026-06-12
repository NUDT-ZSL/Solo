export type Rarity = 'common' | 'rare' | 'legendary';

export interface CardData {
  id: string;
  name: string;
  type: 'plant' | 'insect';
  attack: number;
  defense: number;
  hp: number;
  rarity: Rarity;
  description: string;
  collectCondition: string;
  fragmentsRequired: number;
  color: string;
  emoji: string;
}

export const CARDS: CardData[] = [
  {
    id: 'dandelion',
    name: '蒲公英',
    type: 'plant',
    attack: 25,
    defense: 15,
    hp: 80,
    rarity: 'common',
    description: '随风飘散的希望之花，种子能飞遍山野',
    collectCondition: '浏览图鉴3次',
    fragmentsRequired: 5,
    color: '#FFE66D',
    emoji: '🌼'
  },
  {
    id: 'mantis',
    name: '螳螂',
    type: 'insect',
    attack: 45,
    defense: 20,
    hp: 70,
    rarity: 'rare',
    description: '挥舞镰刀的丛林猎手，潜伏于绿叶之间',
    collectCondition: '获得对战胜利3次',
    fragmentsRequired: 5,
    color: '#4ECB71',
    emoji: '🦗'
  },
  {
    id: 'rose',
    name: '玫瑰',
    type: 'plant',
    attack: 35,
    defense: 30,
    hp: 90,
    rarity: 'rare',
    description: '带刺的美丽花朵，浪漫与危险并存',
    collectCondition: '收集任意植物碎片10个',
    fragmentsRequired: 5,
    color: '#FF6B6B',
    emoji: '🌹'
  },
  {
    id: 'butterfly',
    name: '蝴蝶',
    type: 'insect',
    attack: 30,
    defense: 25,
    hp: 65,
    rarity: 'common',
    description: '翩翩起舞的花间精灵，翅膀闪烁彩虹光芒',
    collectCondition: '参与对战5次',
    fragmentsRequired: 5,
    color: '#A78BFA',
    emoji: '🦋'
  },
  {
    id: 'oak',
    name: '橡树',
    type: 'plant',
    attack: 20,
    defense: 50,
    hp: 150,
    rarity: 'rare',
    description: '森林中的千年古树，守护着无数生命',
    collectCondition: '累计浏览图鉴20次',
    fragmentsRequired: 5,
    color: '#8B7355',
    emoji: '🌳'
  },
  {
    id: 'dragonfly',
    name: '蜻蜓',
    type: 'insect',
    attack: 50,
    defense: 15,
    hp: 60,
    rarity: 'common',
    description: '水面上的飞行高手，速度快如闪电',
    collectCondition: '快速完成对战1次',
    fragmentsRequired: 5,
    color: '#4DABF7',
    emoji: '🪰'
  },
  {
    id: 'sunflower',
    name: '向日葵',
    type: 'plant',
    attack: 40,
    defense: 20,
    hp: 100,
    rarity: 'common',
    description: '永远朝向太阳的花朵，充满阳光能量',
    collectCondition: '连续3天登录',
    fragmentsRequired: 5,
    color: '#F59F00',
    emoji: '🌻'
  },
  {
    id: 'beetle',
    name: '甲虫',
    type: 'insect',
    attack: 35,
    defense: 45,
    hp: 95,
    rarity: 'rare',
    description: '披着坚硬外壳的勇士，力大无穷',
    collectCondition: '获得对战胜利5次',
    fragmentsRequired: 5,
    color: '#2F9E44',
    emoji: '🪲'
  },
  {
    id: 'mushroom',
    name: '蘑菇',
    type: 'plant',
    attack: 30,
    defense: 35,
    hp: 85,
    rarity: 'common',
    description: '森林中的神秘居民，拥有奇特的孢子力量',
    collectCondition: '浏览图鉴5次',
    fragmentsRequired: 5,
    color: '#E599F7',
    emoji: '🍄'
  },
  {
    id: 'firefly',
    name: '萤火虫',
    type: 'insect',
    attack: 55,
    defense: 10,
    hp: 50,
    rarity: 'legendary',
    description: '夜空中的璀璨星光，传说能实现愿望',
    collectCondition: '在深夜完成对战3次',
    fragmentsRequired: 5,
    color: '#FFF380',
    emoji: '✨'
  },
  {
    id: 'lotus',
    name: '莲花',
    type: 'plant',
    attack: 45,
    defense: 40,
    hp: 110,
    rarity: 'legendary',
    description: '出淤泥而不染的圣洁之花，拥有治愈之力',
    collectCondition: '收集全部普通植物',
    fragmentsRequired: 5,
    color: '#FF9FF3',
    emoji: '🪷'
  },
  {
    id: 'stagbeetle',
    name: '锹形虫',
    type: 'insect',
    attack: 60,
    defense: 35,
    hp: 100,
    rarity: 'legendary',
    description: '拥有霸气巨颚的虫之王，力量统治森林',
    collectCondition: '获得10场对战胜利',
    fragmentsRequired: 5,
    color: '#5C4033',
    emoji: '🐞'
  },
  {
    id: 'cactus',
    name: '仙人掌',
    type: 'plant',
    attack: 40,
    defense: 55,
    hp: 120,
    rarity: 'rare',
    description: '沙漠中的坚韧战士，满身是刺不好惹',
    collectCondition: '连续胜利5场',
    fragmentsRequired: 5,
    color: '#69DB7C',
    emoji: '🌵'
  },
  {
    id: 'bee',
    name: '蜜蜂',
    type: 'insect',
    attack: 42,
    defense: 18,
    hp: 75,
    rarity: 'common',
    description: '勤劳的花之使者，尾针蕴含致命力量',
    collectCondition: '收集任意5种植物',
    fragmentsRequired: 5,
    color: '#FFD43B',
    emoji: '🐝'
  },
  {
    id: 'bamboo',
    name: '竹子',
    type: 'plant',
    attack: 38,
    defense: 42,
    hp: 105,
    rarity: 'rare',
    description: '挺拔的气节之木，坚韧而不屈',
    collectCondition: '参与对战15次',
    fragmentsRequired: 5,
    color: '#94D82D',
    emoji: '🎋'
  }
];

export const RARITY_CONFIG: Record<Rarity, {
  gradient: string;
  glow: string;
  label: string;
  borderColors: [string, string];
  shadowColor: string;
}> = {
  common: {
    gradient: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #A0A0A0 100%)',
    glow: 'rgba(192, 192, 192, 0.6)',
    label: '普通',
    borderColors: ['#C0C0C0', '#A0A0A0'],
    shadowColor: 'rgba(192, 192, 192, 0.4)'
  },
  rare: {
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFF8DC 50%, #B8860B 100%)',
    glow: 'rgba(255, 215, 0, 0.6)',
    label: '稀有',
    borderColors: ['#FFD700', '#B8860B'],
    shadowColor: 'rgba(255, 215, 0, 0.5)'
  },
  legendary: {
    gradient: 'linear-gradient(135deg, #9B59B6 0%, #E74C3C 50%, #8E44AD 100%)',
    glow: 'rgba(155, 89, 182, 0.8)',
    label: '传说',
    borderColors: ['#9B59B6', '#8E44AD'],
    shadowColor: 'rgba(155, 89, 182, 0.6)'
  }
};

export function getCardById(id: string): CardData | undefined {
  return CARDS.find(c => c.id === id);
}

export function getCardsByType(type: 'plant' | 'insect'): CardData[] {
  return CARDS.filter(c => c.type === type);
}

export function getCardsByRarity(rarity: Rarity): CardData[] {
  return CARDS.filter(c => c.rarity === rarity);
}
