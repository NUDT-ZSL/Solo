import { Ingredient } from '../types'

export const INGREDIENTS: Ingredient[] = [
  // 蔬菜类
  {
    id: 'veg-tomato',
    name: '番茄',
    icon: '🍅',
    category: 'vegetable',
    calories: 18,
    protein: 0.9,
    fat: 0.2,
    carbs: 3.9
  },
  {
    id: 'veg-cucumber',
    name: '黄瓜',
    icon: '🥒',
    category: 'vegetable',
    calories: 16,
    protein: 0.7,
    fat: 0.1,
    carbs: 3.6
  },
  {
    id: 'veg-carrot',
    name: '胡萝卜',
    icon: '🥕',
    category: 'vegetable',
    calories: 41,
    protein: 0.9,
    fat: 0.2,
    carbs: 9.6
  },
  {
    id: 'veg-broccoli',
    name: '西兰花',
    icon: '🥦',
    category: 'vegetable',
    calories: 34,
    protein: 2.8,
    fat: 0.4,
    carbs: 6.6
  },
  {
    id: 'veg-spinach',
    name: '菠菜',
    icon: '🥬',
    category: 'vegetable',
    calories: 23,
    protein: 2.9,
    fat: 0.4,
    carbs: 3.6
  },
  {
    id: 'veg-potato',
    name: '土豆',
    icon: '🥔',
    category: 'vegetable',
    calories: 77,
    protein: 2.0,
    fat: 0.1,
    carbs: 17.0
  },
  {
    id: 'veg-onion',
    name: '洋葱',
    icon: '🧅',
    category: 'vegetable',
    calories: 40,
    protein: 1.1,
    fat: 0.1,
    carbs: 9.3
  },

  // 蛋白质类
  {
    id: 'prot-chicken',
    name: '鸡胸肉',
    icon: '🍗',
    category: 'protein',
    calories: 165,
    protein: 31.0,
    fat: 3.6,
    carbs: 0
  },
  {
    id: 'prot-beef',
    name: '牛肉',
    icon: '🥩',
    category: 'protein',
    calories: 250,
    protein: 26.0,
    fat: 15.0,
    carbs: 0
  },
  {
    id: 'prot-fish',
    name: '三文鱼',
    icon: '🐟',
    category: 'protein',
    calories: 208,
    protein: 20.0,
    fat: 13.0,
    carbs: 0
  },
  {
    id: 'prot-egg',
    name: '鸡蛋',
    icon: '🥚',
    category: 'protein',
    calories: 155,
    protein: 13.0,
    fat: 11.0,
    carbs: 1.1
  },
  {
    id: 'prot-tofu',
    name: '豆腐',
    icon: '🧈',
    category: 'protein',
    calories: 76,
    protein: 8.0,
    fat: 4.8,
    carbs: 1.9
  },
  {
    id: 'prot-shrimp',
    name: '虾仁',
    icon: '🦐',
    category: 'protein',
    calories: 99,
    protein: 24.0,
    fat: 0.3,
    carbs: 0.2
  },
  {
    id: 'prot-pork',
    name: '猪里脊',
    icon: '🥓',
    category: 'protein',
    calories: 143,
    protein: 20.0,
    fat: 6.0,
    carbs: 0
  },

  // 主食类
  {
    id: 'stap-rice',
    name: '白米饭',
    icon: '🍚',
    category: 'staple',
    calories: 130,
    protein: 2.7,
    fat: 0.3,
    carbs: 28.0
  },
  {
    id: 'stap-noodle',
    name: '面条',
    icon: '🍜',
    category: 'staple',
    calories: 138,
    protein: 4.5,
    fat: 0.8,
    carbs: 27.0
  },
  {
    id: 'stap-bread',
    name: '全麦面包',
    icon: '🍞',
    category: 'staple',
    calories: 247,
    protein: 13.0,
    fat: 4.2,
    carbs: 41.0
  },
  {
    id: 'stap-oat',
    name: '燕麦',
    icon: '🥣',
    category: 'staple',
    calories: 389,
    protein: 16.9,
    fat: 6.9,
    carbs: 66.0
  },
  {
    id: 'stap-sweet',
    name: '红薯',
    icon: '🍠',
    category: 'staple',
    calories: 86,
    protein: 1.6,
    fat: 0.1,
    carbs: 20.0
  },
  {
    id: 'stap-corn',
    name: '玉米',
    icon: '🌽',
    category: 'staple',
    calories: 96,
    protein: 3.4,
    fat: 1.5,
    carbs: 21.0
  },

  // 调料类
  {
    id: 'seas-oil',
    name: '橄榄油',
    icon: '🫒',
    category: 'seasoning',
    calories: 884,
    protein: 0,
    fat: 100.0,
    carbs: 0
  },
  {
    id: 'seas-salt',
    name: '食盐',
    icon: '🧂',
    category: 'seasoning',
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0
  },
  {
    id: 'seas-sugar',
    name: '白糖',
    icon: '🍬',
    category: 'seasoning',
    calories: 387,
    protein: 0,
    fat: 0,
    carbs: 100.0
  },
  {
    id: 'seas-soy',
    name: '酱油',
    icon: '🍶',
    category: 'seasoning',
    calories: 53,
    protein: 8.0,
    fat: 0.3,
    carbs: 5.0
  },
  {
    id: 'seas-vinegar',
    name: '香醋',
    icon: '🍾',
    category: 'seasoning',
    calories: 21,
    protein: 0.3,
    fat: 0,
    carbs: 4.8
  },
  {
    id: 'seas-garlic',
    name: '大蒜',
    icon: '🧄',
    category: 'seasoning',
    calories: 149,
    protein: 6.4,
    fat: 0.5,
    carbs: 33.0
  },
  {
    id: 'seas-ginger',
    name: '生姜',
    icon: '🫚',
    category: 'seasoning',
    calories: 80,
    protein: 2.0,
    fat: 0.8,
    carbs: 18.0
  }
]

export const getIngredientsByCategory = (category: string): Ingredient[] => {
  return INGREDIENTS.filter(ing => ing.category === category)
}
