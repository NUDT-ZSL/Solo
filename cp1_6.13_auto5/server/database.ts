import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { addDays } from 'date-fns'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbDir = path.join(__dirname, '..', 'data')

const recipesDb = Datastore.create({
  filename: path.join(dbDir, 'recipes.db'),
  autoload: true,
})

const inventoryDb = Datastore.create({
  filename: path.join(dbDir, 'inventory.db'),
  autoload: true,
})

const shoppingListsDb = Datastore.create({
  filename: path.join(dbDir, 'shoppingLists.db'),
  autoload: true,
})

export interface Ingredient {
  _id?: string
  id: string
  name: string
  emoji: string
  quantity: number
  unit: string
  expireDate: string
}

export interface RecipeIngredient {
  ingredientId: string
  name: string
  emoji: string
  requiredQuantity: number
  unit: string
}

export interface Recipe {
  _id?: string
  id: string
  name: string
  thumbnail: string
  heroImage: string
  estimatedTime: number
  isUserCreated: boolean
  ingredients: RecipeIngredient[]
  steps: string[]
  createdAt: string
}

export interface ShoppingItem {
  ingredientId: string
  name: string
  emoji: string
  quantity: number
  unit: string
  isRequired: boolean
}

export interface RecommendationResult {
  recipeId: string
  recipeName: string
  missingItems: ShoppingItem[]
  lowStockItems: ShoppingItem[]
  completeness: number
}

async function seedDatabase() {
  const recipeCount = await recipesDb.count({})
  if (recipeCount === 0) {
    const seedRecipes: Recipe[] = [
      {
        id: uuidv4(),
        name: '番茄炒蛋',
        thumbnail: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=320&h=180&fit=crop',
        heroImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=440&fit=crop',
        estimatedTime: 15,
        isUserCreated: false,
        ingredients: [
          { ingredientId: 'egg', name: '鸡蛋', emoji: '🥚', requiredQuantity: 3, unit: '个' },
          { ingredientId: 'tomato', name: '番茄', emoji: '🍅', requiredQuantity: 2, unit: '个' },
          { ingredientId: 'green-onion', name: '葱', emoji: '🧅', requiredQuantity: 1, unit: '根' },
          { ingredientId: 'salt', name: '盐', emoji: '🧂', requiredQuantity: 3, unit: '克' },
          { ingredientId: 'sugar', name: '白糖', emoji: '🍬', requiredQuantity: 5, unit: '克' },
        ],
        steps: [
          '番茄切块，鸡蛋打散，葱切葱花备用',
          '热锅冷油，倒入蛋液炒至半凝固盛出',
          '锅中再加油，放入番茄翻炒出汁',
          '加入盐、糖调味，倒入炒好的鸡蛋',
          '翻炒均匀撒上葱花即可出锅',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: '红烧土豆牛肉',
        thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&h=180&fit=crop',
        heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=440&fit=crop',
        estimatedTime: 60,
        isUserCreated: false,
        ingredients: [
          { ingredientId: 'beef', name: '牛肉', emoji: '🥩', requiredQuantity: 500, unit: '克' },
          { ingredientId: 'potato', name: '土豆', emoji: '🥔', requiredQuantity: 3, unit: '个' },
          { ingredientId: 'onion', name: '洋葱', emoji: '🧅', requiredQuantity: 1, unit: '个' },
          { ingredientId: 'light-soy', name: '生抽', emoji: '🍶', requiredQuantity: 20, unit: '毫升' },
          { ingredientId: 'dark-soy', name: '老抽', emoji: '🫙', requiredQuantity: 10, unit: '毫升' },
          { ingredientId: 'rock-sugar', name: '冰糖', emoji: '🍬', requiredQuantity: 15, unit: '克' },
        ],
        steps: [
          '牛肉切块冷水下锅焯水，撇去浮沫捞出',
          '土豆去皮切块，洋葱切丝备用',
          '锅中放油，加入冰糖小火炒出糖色',
          '放入牛肉翻炒上色，加洋葱炒香',
          '加生抽、老抽调味，倒入开水没过牛肉',
          '大火烧开转小火炖40分钟',
          '加入土豆继续炖20分钟，大火收汁即可',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: '蒜蓉生菜',
        thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=320&h=180&fit=crop',
        heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=440&fit=crop',
        estimatedTime: 10,
        isUserCreated: false,
        ingredients: [
          { ingredientId: 'lettuce', name: '生菜', emoji: '🥬', requiredQuantity: 1, unit: '颗' },
          { ingredientId: 'garlic', name: '大蒜', emoji: '🧄', requiredQuantity: 5, unit: '瓣' },
          { ingredientId: 'oyster-sauce', name: '蚝油', emoji: '🥢', requiredQuantity: 15, unit: '毫升' },
          { ingredientId: 'cooking-oil', name: '食用油', emoji: '🫒', requiredQuantity: 20, unit: '毫升' },
        ],
        steps: [
          '生菜洗净沥干水分，大蒜切末备用',
          '锅中放水烧开，加少许盐和油',
          '放入生菜焯水30秒捞出摆盘',
          '锅中热油，放入蒜末小火炒香',
          '加入蚝油和少许水煮开',
          '将蒜蓉汁淋在生菜上即可',
        ],
        createdAt: new Date().toISOString(),
      },
    ]
    await recipesDb.insert(seedRecipes)
  }

  const inventoryCount = await inventoryDb.count({})
  if (inventoryCount === 0) {
    const seedInventory: Ingredient[] = [
      { id: 'egg', name: '鸡蛋', emoji: '🥚', quantity: 6, unit: '个', expireDate: addDays(new Date(), 3).toISOString() },
      { id: 'tomato', name: '番茄', emoji: '🍅', quantity: 2, unit: '个', expireDate: addDays(new Date(), 2).toISOString() },
      { id: 'potato', name: '土豆', emoji: '🥔', quantity: 4, unit: '个', expireDate: addDays(new Date(), 7).toISOString() },
      { id: 'lettuce', name: '生菜', emoji: '🥬', quantity: 1, unit: '颗', expireDate: addDays(new Date(), 1).toISOString() },
      { id: 'onion', name: '洋葱', emoji: '🧅', quantity: 3, unit: '个', expireDate: addDays(new Date(), 5).toISOString() },
      { id: 'beef', name: '牛肉', emoji: '🥩', quantity: 400, unit: '克', expireDate: addDays(new Date(), 4).toISOString() },
      { id: 'garlic', name: '大蒜', emoji: '🧄', quantity: 10, unit: '瓣', expireDate: addDays(new Date(), 10).toISOString() },
      { id: 'salt', name: '盐', emoji: '🧂', quantity: 500, unit: '克', expireDate: addDays(new Date(), 365).toISOString() },
      { id: 'light-soy', name: '生抽', emoji: '🍶', quantity: 500, unit: '毫升', expireDate: addDays(new Date(), 180).toISOString() },
      { id: 'dark-soy', name: '老抽', emoji: '🫙', quantity: 500, unit: '毫升', expireDate: addDays(new Date(), 180).toISOString() },
      { id: 'rock-sugar', name: '冰糖', emoji: '🍬', quantity: 200, unit: '克', expireDate: addDays(new Date(), 365).toISOString() },
      { id: 'oyster-sauce', name: '蚝油', emoji: '🥢', quantity: 300, unit: '毫升', expireDate: addDays(new Date(), 90).toISOString() },
    ]
    await inventoryDb.insert(seedInventory)
  }
}

seedDatabase().catch((err) => console.error('Seed database error:', err))

export { recipesDb, inventoryDb, shoppingListsDb }
