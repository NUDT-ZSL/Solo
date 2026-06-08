import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  ingredients: string[];
  steps: string;
  ratings: number[];
  averageRating: number;
  createdAt: Date;
}

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    title: '番茄炒蛋',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20egg%20stir%20fry%20chinese%20food%20delicious%20home%20cooking&image_size=square',
    description: '经典家常菜，酸甜可口，简单易做，是每个厨房新手的入门菜。',
    ingredients: ['番茄', '鸡蛋', '盐', '糖', '葱花'],
    steps: '1. 番茄切块，鸡蛋打散。\n2. 热锅下油，炒鸡蛋至凝固盛出。\n3. 下番茄翻炒出汁，加入盐和糖。\n4. 倒入鸡蛋翻炒均匀，撒葱花出锅。',
    ratings: [5, 4, 5],
    averageRating: 4.67,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '红烧肉',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20chinese%20cuisine%20saucy%20delicious%20food%20photography&image_size=square',
    description: '肥而不腻，入口即化的传统美味，浓油赤酱让人垂涎三尺。',
    ingredients: ['五花肉', '酱油', '冰糖', '料酒', '八角', '桂皮', '姜片'],
    steps: '1. 五花肉切块焯水。\n2. 炒糖色至枣红色。\n3. 下肉块翻炒上色。\n4. 加调料和水，小火炖煮1小时收汁。',
    ratings: [5, 5, 4, 5],
    averageRating: 4.75,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '清炒时蔬',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=stir%20fried%20vegetables%20healthy%20green%20chinese%20food&image_size=square',
    description: '清淡健康的素菜，保留蔬菜原有的清甜和营养。',
    ingredients: ['青菜', '蒜末', '盐', '食用油'],
    steps: '1. 青菜洗净沥干。\n2. 热锅下油爆香蒜末。\n3. 下青菜大火快炒。\n4. 加盐调味出锅。',
    ratings: [4, 3, 4],
    averageRating: 3.67,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '麻婆豆腐',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mapo%20tofu%20spicy%20sichuan%20chinese%20food&image_size=square',
    description: '麻辣鲜香的川菜经典，嫩滑的豆腐配上浓郁的麻辣酱汁。',
    ingredients: ['豆腐', '豆瓣酱', '花椒粉', '蒜末', '葱花', '生抽'],
    steps: '1. 豆腐切块焯水。\n2. 炒香豆瓣酱和蒜末。\n3. 加水烧开下豆腐。\n4. 勾芡撒花椒粉和葱花。',
    ratings: [5, 4, 5, 4],
    averageRating: 4.5,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '糖醋里脊',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sweet%20and%20sour%20pork%20chinese%20food%20crispy&image_size=square',
    description: '外酥里嫩，酸甜开胃，大人小孩都爱吃的经典菜式。',
    ingredients: ['猪里脊', '番茄酱', '白糖', '白醋', '淀粉', '鸡蛋'],
    steps: '1. 里脊切条腌制。\n2. 裹淀粉糊油炸至金黄。\n3. 调糖醋汁烧开。\n4. 倒入里脊翻炒均匀。',
    ratings: [5, 5, 4, 5, 5],
    averageRating: 4.8,
    createdAt: new Date(),
  },
];

interface RecommendationResult {
  recipe: Recipe;
  similarity: number;
  sharedIngredients: string[];
}

function calculateJaccardSimilarity(ingredients1: string[], ingredients2: string[]): number {
  const set1 = new Set(ingredients1.map((i) => i.trim().toLowerCase()));
  const set2 = new Set(ingredients2.map((i) => i.trim().toLowerCase()));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function getSharedIngredients(ingredients1: string[], ingredients2: string[]): string[] {
  const set1 = new Set(ingredients1.map((i) => i.trim().toLowerCase()));
  const set2 = new Set(ingredients2.map((i) => i.trim().toLowerCase()));
  return ingredients2.filter((i) => set1.has(i.trim().toLowerCase()));
}

app.get('/api/recipes', (req: any, res: any) => {
  res.json(recipes);
});

app.get('/api/recipes/:id', (req: any, res: any) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: '食谱未找到' });
    return;
  }
  res.json(recipe);
});

app.post('/api/recipes', (req: any, res: any) => {
  const { title, imageUrl, description, ingredients, steps } = req.body;

  if (!title || !imageUrl || !ingredients || ingredients.length === 0) {
    res.status(400).json({ error: '请填写必填项' });
    return;
  }

  if (description && description.length > 200) {
    res.status(400).json({ error: '描述不能超过200字' });
    return;
  }

  const newRecipe: Recipe = {
    id: uuidv4(),
    title,
    imageUrl,
    description: description || '',
    ingredients,
    steps: steps || '',
    ratings: [],
    averageRating: 0,
    createdAt: new Date(),
  };

  recipes.unshift(newRecipe);
  res.status(201).json({ message: '食谱上传成功！', recipe: newRecipe });
});

app.post('/api/recipes/:id/rate', (req: any, res: any) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: '食谱未找到' });
    return;
  }

  const { rating } = req.body;
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    res.status(400).json({ error: '评分必须在1-5之间' });
    return;
  }

  recipe.ratings.push(rating);
  recipe.averageRating =
    recipe.ratings.reduce((a, b) => a + b, 0) / recipe.ratings.length;

  res.json({ message: '评分成功！', averageRating: recipe.averageRating });
});

app.get('/api/recommendations/:id', (req: any, res: any) => {
  const referenceRecipe = recipes.find((r) => r.id === req.params.id);
  if (!referenceRecipe) {
    res.status(404).json({ error: '参考食谱未找到' });
    return;
  }

  const recommendations: RecommendationResult[] = recipes
    .filter((r) => r.id !== referenceRecipe.id)
    .map((r) => ({
      recipe: r,
      similarity: calculateJaccardSimilarity(
        referenceRecipe.ingredients,
        r.ingredients
      ),
      sharedIngredients: getSharedIngredients(
        referenceRecipe.ingredients,
        r.ingredients
      ),
    }))
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  res.json(recommendations);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
