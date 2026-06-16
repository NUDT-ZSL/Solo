import type { Recipe, RecipeCategory } from './types';

const categories: RecipeCategory[] = ['chinese', 'western', 'dessert'];
const colorSchemes: Array<'orange' | 'green' | 'blue'> = ['orange', 'green', 'blue'];

const recipeNames = [
  '红烧排骨', '宫保鸡丁', '麻婆豆腐', '糖醋里脊',
  '意大利面', '法式洋葱汤', '烤鸡沙拉', '牛肉汉堡',
  '提拉米苏', '芒果布丁', '草莓蛋糕', '巧克力曲奇',
];

const stepTemplates = [
  '准备所有食材，洗净切好备用',
  '热锅下油，放入葱姜爆香',
  '加入主料翻炒至变色',
  '加入调味料和适量清水',
  '大火烧开后转小火慢炖',
  '收汁后撒上葱花即可出锅',
];

function generateSteps(recipeId: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${recipeId}-step-${i}`,
    description: stepTemplates[i % stepTemplates.length],
    durationSeconds: (Math.floor(Math.random() * 20) + 5) * 60,
  }));
}

function generateRecipe(index: number): Recipe {
  const id = `recipe-${index}`;
  const category = categories[index % 3];
  const stepCount = Math.floor(Math.random() * 3) + 4;
  const totalMinutes = Math.floor(Math.random() * 60) + 20;

  return {
    id,
    name: recipeNames[index % recipeNames.length],
    category,
    totalMinutes,
    colorScheme: colorSchemes[index % 3],
    steps: generateSteps(id, stepCount),
    ratings: [
      { userId: 'user1', score: Math.floor(Math.random() * 2) + 4 },
      { userId: 'user2', score: Math.floor(Math.random() * 2) + 3 },
    ],
    isFavorite: false,
  };
}

export const mockRecipes: Recipe[] = Array.from({ length: 10 }, (_, i) => generateRecipe(i));
