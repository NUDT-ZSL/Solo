import { v4 as uuidv4 } from 'uuid'

export type Category = '中式' | '西式' | '日式' | '甜点'
export type Difficulty = '简单' | '中等' | '困难'

export interface Recipe {
  id: string
  name: string
  image: string
  category: Category
  difficulty: Difficulty
  duration: number
  description: string
  isFavorite: boolean
}

const foodEmojis = [
  '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍝', '🍕', '🍔', '🌮',
  '🥗', '🍰', '🧁', '🍩', '🍪', '🎂', '🍮', '🥘', '🍤', '🥙'
]

const recipeNames = [
  '红烧排骨', '番茄炒蛋', '宫保鸡丁', '麻婆豆腐', '糖醋里脊',
  '意大利面', '凯撒沙拉', '法式洋葱汤', '牛排配薯条', '西班牙海鲜饭',
  '寿司拼盘', '天妇罗', '拉面', '日式咖喱', '味噌汤',
  '提拉米苏', '黑森林蛋糕', '马卡龙', '布丁', '水果塔'
]

const categories: Category[] = ['中式', '中式', '中式', '中式', '中式', '西式', '西式', '西式', '西式', '西式', '日式', '日式', '日式', '日式', '日式', '甜点', '甜点', '甜点', '甜点', '甜点']
const difficulties: Difficulty[] = ['中等', '简单', '中等', '简单', '中等', '中等', '简单', '困难', '困难', '中等', '中等', '中等', '简单', '简单', '简单', '中等', '困难', '困难', '简单', '中等']
const durations = [45, 15, 30, 20, 35, 25, 15, 60, 45, 50, 40, 25, 20, 30, 15, 45, 90, 60, 20, 50]
const descriptions = [
  '选用新鲜排骨，配以独特红烧酱汁，肉质酥烂入味，色泽红亮诱人。',
  '简单快手的家常菜，酸甜可口，营养丰富，是每个家庭的必备菜。',
  '经典川菜，鸡肉嫩滑，花生酥脆，麻辣鲜香，回味无穷。',
  '麻辣鲜香的四川名菜，豆腐嫩滑，肉末香酥，下饭神器。',
  '外酥里嫩，酸甜可口，色泽金黄，是老少皆宜的美味佳肴。',
  '经典意大利风味，面条劲道，番茄酱浓郁，配以罗勒叶香气四溢。',
  '清爽健康的罗马风味沙拉，脆嫩生菜配以特制凯撒酱。',
  '浓郁的洋葱汤配以烤至金黄的面包片和融化的奶酪，温暖身心。',
  '精选优质牛排，煎至恰到好处，配以金黄酥脆的薯条。',
  '西班牙传统美食，海鲜鲜美，米饭吸满汤汁，风味独特。',
  '新鲜刺身与醋饭的完美结合，色彩丰富，口感鲜美。',
  '各类海鲜蔬菜裹上薄脆面衣，炸至金黄，配以特制酱汁。',
  '浓郁的猪骨汤底，配以劲道的面条和叉烧，温暖满足。',
  '日式家常咖喱，浓郁香甜，配以米饭，简单美味。',
  '传统日式汤品，味噌香气浓郁，配以豆腐和海带，清爽开胃。',
  '意式经典甜点，咖啡与马斯卡彭的完美融合，入口即化。',
  '德国经典黑森林蛋糕，巧克力与樱桃的完美搭配。',
  '法式经典甜点，外壳酥脆内馅柔软，色彩缤纷。',
  '香滑细腻的焦糖布丁，入口即化，甜而不腻。',
  '酥脆塔皮配以新鲜水果和奶油，清新美味。'
]

export const generateInitialRecipes = (): Recipe[] => {
  return Array.from({ length: 20 }, (_, i) => ({
    id: uuidv4(),
    name: recipeNames[i],
    image: foodEmojis[i],
    category: categories[i],
    difficulty: difficulties[i],
    duration: durations[i],
    description: descriptions[i],
    isFavorite: false
  }))
}

export const toggleFavorite = (recipes: Recipe[], id: string): Recipe[] => {
  return recipes.map(recipe =>
    recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
  )
}

export const filterByCategory = (recipes: Recipe[], category: string): Recipe[] => {
  if (category === '全部') return recipes
  return recipes.filter(recipe => recipe.category === category)
}

export const filterByFavorite = (recipes: Recipe[]): Recipe[] => {
  return recipes.filter(recipe => recipe.isFavorite)
}

export const filterBySearch = (recipes: Recipe[], keyword: string): Recipe[] => {
  if (!keyword.trim()) return recipes
  const lowerKeyword = keyword.toLowerCase()
  return recipes.filter(
    recipe =>
      recipe.name.toLowerCase().includes(lowerKeyword) ||
      recipe.description.toLowerCase().includes(lowerKeyword)
  )
}

export const createRecipe = (
  name: string,
  category: Category,
  difficulty: Difficulty,
  duration: number,
  description: string,
  image?: string
): Recipe => {
  const emojiIndex = Math.floor(Math.random() * foodEmojis.length)
  return {
    id: uuidv4(),
    name,
    image: image || foodEmojis[emojiIndex],
    category,
    difficulty,
    duration,
    description,
    isFavorite: true
  }
}

export const addRecipe = (recipes: Recipe[], newRecipe: Recipe): Recipe[] => {
  return [newRecipe, ...recipes]
}

export const getDifficultyColor = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case '简单':
      return '#4CAF50'
    case '中等':
      return '#FF9800'
    case '困难':
      return '#F44336'
    default:
      return '#9E9E9E'
  }
}
