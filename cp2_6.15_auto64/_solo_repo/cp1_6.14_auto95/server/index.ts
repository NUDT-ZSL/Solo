import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface Ingredient {
  name: string
  amount: string
}

interface Step {
  id: string
  text: string
  duration: number
}

interface Recipe {
  id: string
  name: string
  description: string
  tags: string[]
  imageUrl: string
  ingredients: Ingredient[]
  steps: Step[]
  servings: number
}

const recipes: Recipe[] = [
  {
    id: '1',
    name: '红烧排骨',
    description: '经典家常红烧排骨，外酥里嫩，色泽红亮，入口即化的美味体验。',
    tags: ['家常菜', '30分钟'],
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=640',
    ingredients: [
      { name: '排骨', amount: '500g' },
      { name: '生姜', amount: '3片' },
      { name: '大葱', amount: '2根' },
      { name: '八角', amount: '2个' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽', amount: '2汤匙' },
      { name: '老抽', amount: '1汤匙' },
      { name: '料酒', amount: '2汤匙' },
    ],
    steps: [
      { id: 's1', text: '排骨冷水下锅，加入姜片和料酒焯水5分钟', duration: 5 },
      { id: 's2', text: '捞出排骨沥干水分，锅中放少许油，加入冰糖小火炒糖色', duration: 5 },
      { id: 's3', text: '放入排骨翻炒均匀，加入生抽、老抽上色', duration: 3 },
      { id: 's4', text: '加入葱段、八角，倒入没过排骨的热水', duration: 2 },
      { id: 's5', text: '大火烧开后转小火，盖上盖子炖煮30分钟', duration: 30 },
      { id: 's6', text: '大火收汁，撒上葱花即可出锅', duration: 5 },
    ],
    servings: 2,
  },
  {
    id: '2',
    name: '番茄炒蛋',
    description: '酸甜可口的番茄炒蛋，简单快手，是每个家庭的必备经典菜肴。',
    tags: ['家常菜', '15分钟', '快手菜'],
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=640',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱花', amount: '适量' },
      { name: '盐', amount: '少许' },
      { name: '白糖', amount: '1茶匙' },
    ],
    steps: [
      { id: 's1', text: '番茄切块，鸡蛋打散加少许盐', duration: 2 },
      { id: 's2', text: '热锅冷油，倒入蛋液快速划散，盛出备用', duration: 3 },
      { id: 's3', text: '锅中加油，放入番茄块炒出红油', duration: 5 },
      { id: 's4', text: '加入少许白糖和盐调味，倒入炒好的鸡蛋', duration: 2 },
      { id: 's5', text: '翻炒均匀，撒上葱花出锅', duration: 3 },
    ],
    servings: 2,
  },
  {
    id: '3',
    name: '蒜蓉西兰花',
    description: '清爽健康的蒜蓉西兰花，翠绿诱人，简单炒制保留了西兰花的营养和口感。',
    tags: ['素菜', '10分钟', '健康'],
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=640',
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '大蒜', amount: '5瓣' },
      { name: '盐', amount: '适量' },
      { name: '蚝油', amount: '1汤匙' },
    ],
    steps: [
      { id: 's1', text: '西兰花掰成小朵，用淡盐水浸泡10分钟后沥干', duration: 10 },
      { id: 's2', text: '大蒜切末备用', duration: 2 },
      { id: 's3', text: '烧开水，加少许盐和油，西兰花焯水2分钟捞出', duration: 3 },
      { id: 's4', text: '热锅放油，爆香蒜末', duration: 1 },
      { id: 's5', text: '倒入西兰花，加盐和蚝油翻炒均匀即可', duration: 3 },
    ],
    servings: 2,
  },
  {
    id: '4',
    name: '可乐鸡翅',
    description: '甜香浓郁的可乐鸡翅，小孩大人都爱吃，色泽诱人，操作简单。',
    tags: ['家常菜', '40分钟', '宴客菜'],
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=640',
    ingredients: [
      { name: '鸡翅中', amount: '8个' },
      { name: '可乐', amount: '1罐' },
      { name: '生姜', amount: '3片' },
      { name: '生抽', amount: '2汤匙' },
      { name: '老抽', amount: '1汤匙' },
    ],
    steps: [
      { id: 's1', text: '鸡翅两面划几刀，便于入味', duration: 3 },
      { id: 's2', text: '冷水下锅焯水，去除血水后沥干', duration: 5 },
      { id: 's3', text: '锅中少油，鸡翅煎至两面金黄', duration: 8 },
      { id: 's4', text: '加入姜片、生抽、老抽翻炒上色', duration: 2 },
      { id: 's5', text: '倒入可乐，没过鸡翅，大火烧开转小火', duration: 20 },
      { id: 's6', text: '大火收汁至浓稠即可', duration: 5 },
    ],
    servings: 2,
  },
  {
    id: '5',
    name: '麻婆豆腐',
    description: '麻辣鲜香的川菜经典，嫩滑的豆腐配上香辣的肉末，下饭神器。',
    tags: ['川菜', '25分钟', '下饭菜'],
    imageUrl: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=640',
    ingredients: [
      { name: '嫩豆腐', amount: '1盒' },
      { name: '猪肉末', amount: '100g' },
      { name: '豆瓣酱', amount: '1汤匙' },
      { name: '花椒粉', amount: '1茶匙' },
      { name: '蒜末', amount: '1汤匙' },
      { name: '葱花', amount: '适量' },
    ],
    steps: [
      { id: 's1', text: '豆腐切成2厘米的方块，用淡盐水浸泡', duration: 10 },
      { id: 's2', text: '热锅放油，炒散肉末至变色', duration: 3 },
      { id: 's3', text: '加入豆瓣酱、蒜末炒出红油', duration: 2 },
      { id: 's4', text: '加适量水烧开，放入豆腐块轻轻推动', duration: 2 },
      { id: 's5', text: '中火煮5分钟让豆腐入味', duration: 5 },
      { id: 's6', text: '水淀粉勾芡，撒花椒粉和葱花出锅', duration: 3 },
    ],
    servings: 2,
  },
  {
    id: '6',
    name: '红烧肉',
    description: '肥而不腻、入口即化的经典红烧肉，色泽红亮，香气扑鼻。',
    tags: ['家常菜', '60分钟', '宴客菜'],
    imageUrl: 'https://images.unsplash.com/photo-1625398407796-826956951988?w=640',
    ingredients: [
      { name: '五花肉', amount: '600g' },
      { name: '冰糖', amount: '40g' },
      { name: '生姜', amount: '5片' },
      { name: '大葱', amount: '1根' },
      { name: '八角', amount: '3个' },
      { name: '生抽', amount: '3汤匙' },
      { name: '老抽', amount: '1汤匙' },
      { name: '料酒', amount: '2汤匙' },
    ],
    steps: [
      { id: 's1', text: '五花肉切成3厘米方块，冷水下锅焯水', duration: 8 },
      { id: 's2', text: '锅中少油，小火慢煎五花肉至四面金黄出油', duration: 10 },
      { id: 's3', text: '加入冰糖小火炒糖色', duration: 5 },
      { id: 's4', text: '加生抽、老抽、料酒、葱姜八角炒匀', duration: 3 },
      { id: 's5', text: '加热水没过肉，大火烧开转小火炖45分钟', duration: 45 },
      { id: 's6', text: '大火收汁即可', duration: 5 },
    ],
    servings: 4,
  },
]

app.get('/api/recipes', (_req, res) => {
  res.json(recipes)
})

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ error: '菜谱不存在' })
    return
  }
  res.json(recipe)
})

app.post('/api/recipes', (req, res) => {
  const newRecipe: Recipe = {
    id: Date.now().toString(),
    name: req.body.name || '新菜谱',
    description: req.body.description || '',
    tags: req.body.tags || [],
    imageUrl: req.body.imageUrl || '',
    ingredients: req.body.ingredients || [],
    steps: req.body.steps || [],
    servings: req.body.servings || 2,
  }
  recipes.unshift(newRecipe)
  res.status(201).json(newRecipe)
})

app.listen(PORT, () => {
  console.log(`RecipeNest server is running on http://localhost:${PORT}`)
})
