export interface Dream {
  id: string;
  title: string;
  description: string;
  emotion: string;
  foodKeywords: string[];
  createdAt: number;
}

export interface EmotionConfig {
  emotion: string;
  label: string;
  color: string;
  particleColor: string;
  secondaryColor: string;
  particleBehavior: 'float' | 'bubble' | 'spiral' | 'burst';
}

export interface FoodConfig {
  food: string;
  label: string;
  taste: string;
  description: string;
  particleShape: 'glow' | 'bubble' | 'smoke' | 'spark';
  color: string;
}

export const EMOTION_CONFIGS: Record<string, EmotionConfig> = {
  happy: {
    emotion: 'happy',
    label: '快乐',
    color: '#FF8C42',
    particleColor: '#FFD700',
    secondaryColor: '#FFA500',
    particleBehavior: 'float',
  },
  sad: {
    emotion: 'sad',
    label: '忧伤',
    color: '#5B9BD5',
    particleColor: '#87CEEB',
    secondaryColor: '#4682B4',
    particleBehavior: 'bubble',
  },
  calm: {
    emotion: 'calm',
    label: '宁静',
    color: '#8B7355',
    particleColor: '#D2B48C',
    secondaryColor: '#A0522D',
    particleBehavior: 'spiral',
  },
  excited: {
    emotion: 'excited',
    label: '激动',
    color: '#FF4500',
    particleColor: '#FF6347',
    secondaryColor: '#FF0000',
    particleBehavior: 'burst',
  },
};

export const FOOD_CONFIGS: Record<string, FoodConfig> = {
  dessert: {
    food: 'dessert',
    label: '甜点',
    taste: '甜蜜绵密',
    description: '柔软的奶油在舌尖融化，甜蜜如同温暖的拥抱',
    particleShape: 'glow',
    color: '#FFB6C1',
  },
  soup: {
    food: 'soup',
    label: '热汤',
    taste: '醇厚温暖',
    description: '浓郁的汤汁缓缓流淌，温暖从喉间蔓延至心底',
    particleShape: 'bubble',
    color: '#F4A460',
  },
  coffee: {
    food: 'coffee',
    label: '咖啡',
    taste: '苦醇馥郁',
    description: '深邃的苦中带着微甜，如同清晨的第一缕思绪',
    particleShape: 'smoke',
    color: '#6F4E37',
  },
  barbecue: {
    food: 'barbecue',
    label: '烧烤',
    taste: '热烈奔放',
    description: '火焰般的滋味在口中绽放，烟熏的余韵久久不散',
    particleShape: 'spark',
    color: '#CD5C5C',
  },
  fruit: {
    food: 'fruit',
    label: '水果',
    taste: '清新多汁',
    description: '鲜活的汁水在齿间迸发，如同花园中的晨露',
    particleShape: 'glow',
    color: '#98FB98',
  },
  bread: {
    food: 'bread',
    label: '面包',
    taste: '温暖质朴',
    description: '松软的触感带着麦香，是最朴实的安慰',
    particleShape: 'smoke',
    color: '#DEB887',
  },
  icecream: {
    food: 'icecream',
    label: '冰淇淋',
    taste: '冰凉丝滑',
    description: '冰与甜的交融，在梦境中化作一片清凉星河',
    particleShape: 'glow',
    color: '#E0B0FF',
  },
  tea: {
    food: 'tea',
    label: '茶',
    taste: '清幽淡雅',
    description: '一缕清气袅袅升起，带着山间的雾与风',
    particleShape: 'smoke',
    color: '#9ACD32',
  },
};

export const MOCK_DREAMS: Dream[] = [
  {
    id: '1',
    title: '云端蛋糕城堡',
    description: '我梦见自己走进了一座由蛋糕构建的城堡，墙壁是海绵蛋糕，屋顶是奶油，窗户是焦糖做的。每一层都有不同的甜点守卫，它们用糖果权杖向我行礼。',
    emotion: 'happy',
    foodKeywords: ['dessert', 'fruit'],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: '2',
    title: '雨中的热汤河',
    description: '梦里下着蓝色的雨，地面流淌着温暖的热汤。我赤脚走在汤河里，每一步都冒出金色的气泡，忧伤却很温暖。',
    emotion: 'sad',
    foodKeywords: ['soup', 'bread'],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: '3',
    title: '午后的咖啡图书馆',
    description: '在一家漂浮的咖啡馆里，书页化作咖啡的蒸汽升腾。每一口咖啡都能读到一个新的故事，宁静而深邃。',
    emotion: 'calm',
    foodKeywords: ['coffee', 'bread'],
    createdAt: Date.now() - 86400000,
  },
  {
    id: '4',
    title: '烈焰烧烤星空',
    description: '夜空中的星星变成了炭火，我在星空下烤着银河里的鱼。火焰和星光交织，每一口都滚烫而激昂。',
    emotion: 'excited',
    foodKeywords: ['barbecue', 'fruit'],
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: '5',
    title: '冰淇淋极光',
    description: '天空飘着冰淇淋色的极光，我伸手就能摘到一勺。草莓味的极光最甜，薄荷味的极光最凉。',
    emotion: 'happy',
    foodKeywords: ['icecream', 'fruit'],
    createdAt: Date.now() - 3600000 * 12,
  },
  {
    id: '6',
    title: '茶山云海',
    description: '我站在一片无尽的茶山上，云雾就是茶蒸汽。每吸一口气，都能尝到不同的茶香——龙井、铁观音、普洱轮番出现。',
    emotion: 'calm',
    foodKeywords: ['tea', 'fruit'],
    createdAt: Date.now() - 3600000 * 8,
  },
];
