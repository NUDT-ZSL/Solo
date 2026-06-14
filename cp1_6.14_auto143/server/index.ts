import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

dotenv.config()

type Cuisine = 'chinese' | 'western' | 'japanese' | 'korean'
type MatchLevel = 'perfect' | 'partial' | 'little'
type UserReaction = 'like' | 'dislike' | null

interface Ingredient {
  name: string
  isMain: boolean
}

interface Recipe {
  id: string
  title: string
  steps: string
  coverImage: string
  cuisine: Cuisine
  ingredients: Ingredient[]
  rating: number
  ratingCount: number
  authorId: string
  createdAt: string
}

interface Comment {
  id: string
  recipeId: string
  content: string
  likes: number
  dislikes: number
  userLike: UserReaction
  createdAt: string
}

interface MatchedRecipe extends Recipe {
  matchLevel: MatchLevel
  matchedIngredients: string[]
}

interface RecipeCreateBody {
  title: string
  steps: string
  coverImage: string
  cuisine: Cuisine
  ingredients: Ingredient[]
}

interface RateBody {
  rating: number
}

interface CommentBody {
  content: string
}

interface ReactBody {
  type: 'like' | 'dislike'
}

interface MatchBody {
  ingredients: string[]
}

const recipes: Recipe[] = []
const comments: Comment[] = []
const favorites: Set<string> = new Set()
const ingredientsSet: Set<string> = new Set()

const uploadsDir = path.join(projectRoot, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({ storage, dest: 'uploads/' })

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function addIngredients(list: Ingredient[]): void {
  list.forEach((ing) => ingredientsSet.add(ing.name))
}

function createMockData(): void {
  const mockRecipes: Recipe[] = [
    {
      id: 'r-1',
      title: '宫保鸡丁',
      steps: '1. 鸡肉切丁腌制；2. 花生米炸香；3. 热油爆香干辣椒和花椒；4. 下鸡丁滑炒；5. 加入葱姜蒜和酱汁；6. 最后放花生米翻炒出锅。',
      coverImage: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800',
      cuisine: 'chinese',
      ingredients: [
        { name: '鸡胸肉', isMain: true },
        { name: '花生米', isMain: true },
        { name: '干辣椒', isMain: false },
        { name: '花椒', isMain: false },
        { name: '大葱', isMain: false },
        { name: '生抽', isMain: false },
      ],
      rating: 4.5,
      ratingCount: 128,
      authorId: 'user-1',
      createdAt: daysAgo(5),
    },
    {
      id: 'r-2',
      title: '麻婆豆腐',
      steps: '1. 豆腐切块焯水；2. 牛肉末炒香；3. 加豆瓣酱炒出红油；4. 加入高汤和豆腐；5. 勾芡撒花椒粉和葱花。',
      coverImage: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=800',
      cuisine: 'chinese',
      ingredients: [
        { name: '嫩豆腐', isMain: true },
        { name: '牛肉末', isMain: true },
        { name: '豆瓣酱', isMain: true },
        { name: '花椒粉', isMain: false },
        { name: '葱花', isMain: false },
      ],
      rating: 4.7,
      ratingCount: 256,
      authorId: 'user-2',
      createdAt: daysAgo(3),
    },
    {
      id: 'r-3',
      title: '意大利肉酱面',
      steps: '1. 洋葱芹菜胡萝卜切碎炒香；2. 加入牛肉末炒至变色；3. 加番茄酱和红酒；4. 小火慢炖1小时；5. 煮意面拌入肉酱撒芝士。',
      coverImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
      cuisine: 'western',
      ingredients: [
        { name: '意大利面', isMain: true },
        { name: '牛肉末', isMain: true },
        { name: '番茄酱', isMain: true },
        { name: '洋葱', isMain: false },
        { name: '胡萝卜', isMain: false },
        { name: '帕玛森芝士', isMain: false },
      ],
      rating: 4.6,
      ratingCount: 189,
      authorId: 'user-1',
      createdAt: daysAgo(7),
    },
    {
      id: 'r-4',
      title: '奶油蘑菇汤',
      steps: '1. 蘑菇切片；2. 洋葱炒香加蘑菇炒软；3. 加入面粉炒出香味；4. 倒入牛奶和鸡汤；5. 用料理棒打顺滑调味。',
      coverImage: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
      cuisine: 'western',
      ingredients: [
        { name: '口蘑', isMain: true },
        { name: '淡奶油', isMain: true },
        { name: '洋葱', isMain: false },
        { name: '面粉', isMain: false },
        { name: '鸡汤', isMain: false },
      ],
      rating: 4.3,
      ratingCount: 95,
      authorId: 'user-3',
      createdAt: daysAgo(10),
    },
    {
      id: 'r-5',
      title: '日式亲子丼',
      steps: '1. 鸡腿肉切块腌制；2. 洋葱切丝；3. 酱汁（酱油+味淋+糖+高汤）煮开；4. 下鸡肉和洋葱煮至半熟；5. 淋入蛋液半凝固后盖在米饭上。',
      coverImage: 'https://images.unsplash.com/photo-1569058242567-93de6f36f8e6?w=800',
      cuisine: 'japanese',
      ingredients: [
        { name: '鸡腿肉', isMain: true },
        { name: '鸡蛋', isMain: true },
        { name: '洋葱', isMain: false },
        { name: '酱油', isMain: false },
        { name: '味淋', isMain: false },
        { name: '米饭', isMain: true },
      ],
      rating: 4.8,
      ratingCount: 312,
      authorId: 'user-2',
      createdAt: daysAgo(2),
    },
    {
      id: 'r-6',
      title: '豚骨拉面',
      steps: '1. 猪骨焯水后大火熬煮4小时至奶白；2. 叉烧肉腌制后煎香炖煮；3. 溏心蛋腌制；4. 面条煮好；5. 组装：面+汤+叉烧+溏心蛋+笋干+海苔+葱花。',
      coverImage: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800',
      cuisine: 'japanese',
      ingredients: [
        { name: '猪骨', isMain: true },
        { name: '叉烧肉', isMain: true },
        { name: '拉面', isMain: true },
        { name: '溏心蛋', isMain: false },
        { name: '笋干', isMain: false },
        { name: '海苔', isMain: false },
      ],
      rating: 4.9,
      ratingCount: 478,
      authorId: 'user-1',
      createdAt: daysAgo(1),
    },
    {
      id: 'r-7',
      title: '韩式石锅拌饭',
      steps: '1. 各种蔬菜分别焯水或炒香调味；2. 牛肉腌制后炒熟；3. 石锅刷香油放入米饭；4. 铺上各色蔬菜和牛肉；5. 中间放煎蛋，撒芝麻，小火烤出锅巴。',
      coverImage: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800',
      cuisine: 'korean',
      ingredients: [
        { name: '米饭', isMain: true },
        { name: '牛肉片', isMain: true },
        { name: '菠菜', isMain: false },
        { name: '胡萝卜丝', isMain: false },
        { name: '黄豆芽', isMain: false },
        { name: '鸡蛋', isMain: false },
        { name: '韩式辣酱', isMain: true },
      ],
      rating: 4.4,
      ratingCount: 167,
      authorId: 'user-3',
      createdAt: daysAgo(4),
    },
    {
      id: 'r-8',
      title: '韩式部队锅',
      steps: '1. 午餐肉、香肠切片；2. 辛拉面调料加水做汤底；3. 铺上金针菇、泡菜、年糕、午餐肉、香肠、芝士片；4. 煮开后放入面饼和芝士；5. 边煮边吃。',
      coverImage: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
      cuisine: 'korean',
      ingredients: [
        { name: '辛拉面', isMain: true },
        { name: '午餐肉', isMain: true },
        { name: '韩式泡菜', isMain: true },
        { name: '芝士片', isMain: false },
        { name: '年糕', isMain: false },
        { name: '金针菇', isMain: false },
      ],
      rating: 4.6,
      ratingCount: 234,
      authorId: 'user-2',
      createdAt: daysAgo(6),
    },
    {
      id: 'r-9',
      title: '糖醋里脊',
      steps: '1. 里脊肉切条腌制；2. 裹淀粉炸至金黄酥脆；3. 调糖醋汁（番茄酱+糖+醋+水+淀粉）；4. 酱汁熬稠下炸好的里脊快速翻匀出锅。',
      coverImage: 'https://images.unsplash.com/photo-1625944525533-473f1b3d9684?w=800',
      cuisine: 'chinese',
      ingredients: [
        { name: '里脊肉', isMain: true },
        { name: '番茄酱', isMain: false },
        { name: '淀粉', isMain: false },
        { name: '白糖', isMain: false },
        { name: '白醋', isMain: false },
      ],
      rating: 4.5,
      ratingCount: 201,
      authorId: 'user-1',
      createdAt: daysAgo(8),
    },
  ]

  mockRecipes.forEach((r) => {
    recipes.push(r)
    addIngredients(r.ingredients)
  })

  const mockComments: Comment[] = [
    { id: 'c-1', recipeId: 'r-1', content: '超好吃！按照步骤做出来和饭店一个味～', likes: 12, dislikes: 0, userLike: null, createdAt: daysAgo(4) },
    { id: 'c-2', recipeId: 'r-1', content: '花生米要最后放，不然会软掉，亲测有效！', likes: 8, dislikes: 1, userLike: 'like', createdAt: daysAgo(3) },
    { id: 'c-3', recipeId: 'r-1', content: '干辣椒可以少放一点，对我来说有点辣。', likes: 3, dislikes: 0, userLike: null, createdAt: daysAgo(2) },
    { id: 'c-4', recipeId: 'r-2', content: '经典川菜！豆腐嫩得不行～', likes: 15, dislikes: 0, userLike: 'like', createdAt: daysAgo(2) },
    { id: 'c-5', recipeId: 'r-2', content: '花椒粉是灵魂，一定要加！', likes: 9, dislikes: 0, userLike: null, createdAt: daysAgo(1) },
    { id: 'c-6', recipeId: 'r-3', content: '慢炖出来的肉酱真的香，拌什么都好吃。', likes: 20, dislikes: 1, userLike: 'like', createdAt: daysAgo(6) },
    { id: 'c-7', recipeId: 'r-3', content: '加了一点红酒，风味提升很多。', likes: 11, dislikes: 0, userLike: null, createdAt: daysAgo(5) },
    { id: 'c-8', recipeId: 'r-5', content: '亲子丼我的最爱！蛋液半熟的状态刚刚好。', likes: 25, dislikes: 0, userLike: 'like', createdAt: daysAgo(1) },
    { id: 'c-9', recipeId: 'r-6', content: '豚骨熬了一下午，奶白奶白的，太满足了！', likes: 33, dislikes: 2, userLike: 'like', createdAt: daysAgo(0) },
    { id: 'c-10', recipeId: 'r-7', content: '锅巴脆脆的，配上辣酱绝了！', likes: 14, dislikes: 0, userLike: null, createdAt: daysAgo(3) },
    { id: 'c-11', recipeId: 'r-8', content: '部队锅就是冬天的救赎，芝士融化在汤里太香了。', likes: 18, dislikes: 0, userLike: 'like', createdAt: daysAgo(5) },
    { id: 'c-12', recipeId: 'r-9', content: '外酥里嫩，酸甜可口，小朋友超喜欢！', likes: 16, dislikes: 0, userLike: null, createdAt: daysAgo(7) },
  ]

  mockComments.forEach((c) => comments.push(c))

  favorites.add('r-2')
  favorites.add('r-5')
  favorites.add('r-6')
}

createMockData()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.get('/api/recipes', (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 8
  const start = (page - 1) * limit
  const end = start + limit
  const paged = recipes.slice(start, end)
  res.status(200).json({
    data: paged,
    total: recipes.length,
    page,
    limit,
  })
})

app.get('/api/recipes/:id', (req: Request, res: Response): void => {
  const recipe = recipes.find((r) => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ success: false, error: 'Recipe not found' })
    return
  }
  res.status(200).json(recipe)
})

app.post('/api/recipes', (req: Request, res: Response): void => {
  const body = req.body as RecipeCreateBody
  const newRecipe: Recipe = {
    id: `r-${uuidv4()}`,
    title: body.title,
    steps: body.steps,
    coverImage: body.coverImage,
    cuisine: body.cuisine,
    ingredients: body.ingredients,
    rating: 0,
    ratingCount: 0,
    authorId: 'user-1',
    createdAt: new Date().toISOString(),
  }
  recipes.unshift(newRecipe)
  addIngredients(newRecipe.ingredients)
  res.status(201).json(newRecipe)
})

app.put('/api/recipes/:id', (req: Request, res: Response): void => {
  const idx = recipes.findIndex((r) => r.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Recipe not found' })
    return
  }
  const body = req.body as Partial<RecipeCreateBody>
  const updated: Recipe = {
    ...recipes[idx],
    title: body.title ?? recipes[idx].title,
    steps: body.steps ?? recipes[idx].steps,
    coverImage: body.coverImage ?? recipes[idx].coverImage,
    cuisine: body.cuisine ?? recipes[idx].cuisine,
    ingredients: body.ingredients ?? recipes[idx].ingredients,
  }
  if (body.ingredients) {
    addIngredients(body.ingredients)
  }
  recipes[idx] = updated
  res.status(200).json(updated)
})

app.delete('/api/recipes/:id', (req: Request, res: Response): void => {
  const idx = recipes.findIndex((r) => r.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Recipe not found' })
    return
  }
  recipes.splice(idx, 1)
  const commentIdx = comments.findIndex((c) => c.recipeId === req.params.id)
  if (commentIdx !== -1) {
    comments.splice(commentIdx, 1)
  }
  favorites.delete(req.params.id)
  res.status(200).json({ success: true })
})

app.post('/api/recipes/:id/rate', (req: Request, res: Response): void => {
  const recipe = recipes.find((r) => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ success: false, error: 'Recipe not found' })
    return
  }
  const { rating } = req.body as RateBody
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: 'Invalid rating' })
    return
  }
  const totalRating = recipe.rating * recipe.ratingCount + rating
  recipe.ratingCount += 1
  recipe.rating = Number((totalRating / recipe.ratingCount).toFixed(1))
  res.status(200).json({ rating: recipe.rating, ratingCount: recipe.ratingCount })
})

app.get('/api/recipes/:id/comments', (req: Request, res: Response): void => {
  const recipeComments = comments.filter((c) => c.recipeId === req.params.id)
  recipeComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.status(200).json(recipeComments)
})

app.post('/api/recipes/:id/comments', (req: Request, res: Response): void => {
  const recipe = recipes.find((r) => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ success: false, error: 'Recipe not found' })
    return
  }
  const body = req.body as CommentBody
  const newComment: Comment = {
    id: `c-${uuidv4()}`,
    recipeId: req.params.id,
    content: body.content,
    likes: 0,
    dislikes: 0,
    userLike: null,
    createdAt: new Date().toISOString(),
  }
  comments.push(newComment)
  res.status(201).json(newComment)
})

app.post('/api/comments/:id/react', (req: Request, res: Response): void => {
  const comment = comments.find((c) => c.id === req.params.id)
  if (!comment) {
    res.status(404).json({ success: false, error: 'Comment not found' })
    return
  }
  const { type } = req.body as ReactBody
  if (type !== 'like' && type !== 'dislike') {
    res.status(400).json({ success: false, error: 'Invalid type' })
    return
  }
  const previous = comment.userLike
  if (previous === type) {
    if (type === 'like') comment.likes -= 1
    else comment.dislikes -= 1
    comment.userLike = null
  } else {
    if (previous === 'like') comment.likes -= 1
    if (previous === 'dislike') comment.dislikes -= 1
    if (type === 'like') comment.likes += 1
    else comment.dislikes += 1
    comment.userLike = type
  }
  res.status(200).json(comment)
})

app.get('/api/ingredients/search', (req: Request, res: Response): void => {
  const q = (req.query.q as string || '').toLowerCase().trim()
  if (!q) {
    res.status(200).json([])
    return
  }
  const results = Array.from(ingredientsSet).filter((name) =>
    name.toLowerCase().includes(q),
  )
  res.status(200).json(results)
})

function matchRecipes(userIngredients: string[]): MatchedRecipe[] {
  const userIngLower = userIngredients.map((i) => i.toLowerCase())
  const result: MatchedRecipe[] = []

  for (const recipe of recipes) {
    const mainIngredients = recipe.ingredients.filter((i) => i.isMain).map((i) => i.name.toLowerCase())
    const allIngredients = recipe.ingredients.map((i) => i.name.toLowerCase())
    const matched: string[] = []

    for (const ing of allIngredients) {
      if (userIngLower.some((u) => ing.includes(u) || u.includes(ing))) {
        const original = recipe.ingredients.find((i) => i.name.toLowerCase() === ing)?.name || ing
        if (!matched.includes(original)) matched.push(original)
      }
    }

    const matchedMain = mainIngredients.filter((m) =>
      userIngLower.some((u) => m.includes(u) || u.includes(m)),
    )

    let matchLevel: MatchLevel
    if (mainIngredients.length > 0 && matchedMain.length === mainIngredients.length) {
      matchLevel = 'perfect'
    } else if (matchedMain.length > 0) {
      matchLevel = 'partial'
    } else if (matched.length > 0) {
      matchLevel = 'little'
    } else {
      continue
    }

    result.push({
      ...recipe,
      matchLevel,
      matchedIngredients: matched,
    })
  }

  const order: Record<MatchLevel, number> = { perfect: 0, partial: 1, little: 2 }
  result.sort((a, b) => {
    if (order[a.matchLevel] !== order[b.matchLevel]) return order[a.matchLevel] - order[b.matchLevel]
    return b.matchedIngredients.length - a.matchedIngredients.length
  })

  return result
}

app.post('/api/recipes/match', (req: Request, res: Response): void => {
  const body = req.body as MatchBody
  if (!Array.isArray(body.ingredients)) {
    res.status(400).json({ success: false, error: 'ingredients must be an array' })
    return
  }
  const matched = matchRecipes(body.ingredients)
  res.status(200).json(matched)
})

app.get('/api/user/recipes', (_req: Request, res: Response): void => {
  const myRecipes = recipes.filter((r) => r.authorId === 'user-1')
  res.status(200).json(myRecipes)
})

app.get('/api/user/favorites', (_req: Request, res: Response): void => {
  const favRecipes = recipes.filter((r) => favorites.has(r.id))
  res.status(200).json(favRecipes)
})

app.post('/api/recipes/:id/favorite', (req: Request, res: Response): void => {
  const recipe = recipes.find((r) => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ success: false, error: 'Recipe not found' })
    return
  }
  const isFavorited = favorites.has(req.params.id)
  if (isFavorited) {
    favorites.delete(req.params.id)
  } else {
    favorites.add(req.params.id)
  }
  res.status(200).json({ favorited: !isFavorited })
})

app.post('/api/upload', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' })
    return
  }
  const url = `/uploads/${req.file.filename}`
  res.status(200).json({ url })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
