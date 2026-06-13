import express from 'express';
import Datastore from 'nedb-promises';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(express.json());

const dbDir = path.join(__dirname, '..', 'data');
const recipesDb = Datastore.create({ filename: path.join(dbDir, 'recipes.db'), autoload: true });
const favoritesDb = Datastore.create({ filename: path.join(dbDir, 'favorites.db'), autoload: true });
const notesDb = Datastore.create({ filename: path.join(dbDir, 'notes.db'), autoload: true });
const shoppingListsDb = Datastore.create({ filename: path.join(dbDir, 'shoppinglists.db'), autoload: true });

const seedRecipes = [
  {
    id: 'r1',
    name: '番茄炒蛋',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱', amount: '少许' },
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1小勺' }
    ],
    steps: [
      '番茄切块，鸡蛋打散备用。',
      '热锅下油，倒入蛋液，炒至凝固后盛出。',
      '锅中再加少许油，放入番茄块翻炒出汁。',
      '加入盐和糖调味，倒入炒好的鸡蛋翻炒均匀。',
      '撒上葱花即可出锅。'
    ]
  },
  {
    id: 'r2',
    name: '宫保鸡丁',
    ingredients: [
      { name: '鸡肉', amount: '300克' },
      { name: '花生', amount: '50克' },
      { name: '干辣椒', amount: '8个' },
      { name: '葱', amount: '2根' },
      { name: '姜', amount: '3片' },
      { name: '蒜', amount: '3瓣' },
      { name: '酱油', amount: '1勺' },
      { name: '醋', amount: '1勺' },
      { name: '糖', amount: '1勺' }
    ],
    steps: [
      '鸡肉切丁，用少许盐、料酒、淀粉腌制15分钟。',
      '调汁：酱油、醋、糖、淀粉、水混合备用。',
      '热锅下油，炒香干辣椒、姜蒜。',
      '放入鸡丁快速翻炒至变色。',
      '倒入调好的料汁，加入花生翻炒均匀。',
      '撒上葱段即可出锅。'
    ]
  },
  {
    id: 'r3',
    name: '洋葱炒牛肉',
    ingredients: [
      { name: '牛肉', amount: '250克' },
      { name: '洋葱', amount: '1个' },
      { name: '青椒', amount: '1个' },
      { name: '蒜', amount: '2瓣' },
      { name: '酱油', amount: '1勺' },
      { name: '蚝油', amount: '1勺' },
      { name: '淀粉', amount: '1小勺' }
    ],
    steps: [
      '牛肉切片，用酱油、淀粉、少许油腌制10分钟。',
      '洋葱切丝，青椒切块。',
      '热锅下油，爆香蒜末，放入牛肉快速翻炒至8成熟盛出。',
      '锅中加油，放入洋葱和青椒翻炒。',
      '加入蚝油和少许盐调味，倒入牛肉翻炒均匀即可。'
    ]
  },
  {
    id: 'r4',
    name: '土豆炖牛肉',
    ingredients: [
      { name: '牛肉', amount: '400克' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '半个' },
      { name: '番茄', amount: '1个' },
      { name: '姜', amount: '3片' },
      { name: '八角', amount: '2个' },
      { name: '酱油', amount: '2勺' }
    ],
    steps: [
      '牛肉切块焯水，去除血沫后捞出。',
      '土豆、胡萝卜切块，洋葱切丝，番茄切块。',
      '锅中下油，炒香姜片、八角和洋葱。',
      '加入番茄炒出酱汁，放入牛肉翻炒上色。',
      '加入酱油和适量水，大火烧开转小火炖40分钟。',
      '放入土豆和胡萝卜，继续炖20分钟至软烂即可。'
    ]
  },
  {
    id: 'r5',
    name: '红烧鸡翅',
    ingredients: [
      { name: '鸡翅', amount: '8个' },
      { name: '姜', amount: '3片' },
      { name: '葱', amount: '2根' },
      { name: '酱油', amount: '2勺' },
      { name: '老抽', amount: '半勺' },
      { name: '糖', amount: '1勺' },
      { name: '料酒', amount: '1勺' }
    ],
    steps: [
      '鸡翅两面划刀，便于入味。',
      '冷水下锅，放入姜片和料酒焯水，捞出洗净。',
      '锅中少许油，放入鸡翅煎至两面金黄。',
      '加入酱油、老抽、糖和适量水没过鸡翅。',
      '大火烧开转中小火炖20分钟。',
      '大火收汁，撒上葱段即可。'
    ]
  },
  {
    id: 'r6',
    name: '麻婆豆腐',
    ingredients: [
      { name: '豆腐', amount: '1块' },
      { name: '猪肉末', amount: '100克' },
      { name: '蒜', amount: '3瓣' },
      { name: '姜', amount: '2片' },
      { name: '豆瓣酱', amount: '1勺' },
      { name: '花椒粉', amount: '少许' },
      { name: '葱', amount: '少许' }
    ],
    steps: [
      '豆腐切小块，用盐水浸泡5分钟后捞出沥干。',
      '热锅下油，炒香肉末至变色。',
      '加入蒜末、姜末和豆瓣酱炒出红油。',
      '加入适量水烧开，放入豆腐块。',
      '小火炖5分钟让豆腐入味，勾薄芡。',
      '撒上花椒粉和葱花即可。'
    ]
  },
  {
    id: 'r7',
    name: '青椒土豆丝',
    ingredients: [
      { name: '土豆', amount: '2个' },
      { name: '青椒', amount: '2个' },
      { name: '蒜', amount: '2瓣' },
      { name: '醋', amount: '1勺' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      '土豆去皮切丝，用清水浸泡去除淀粉。',
      '青椒切丝，蒜切末。',
      '热锅下油，爆香蒜末。',
      '放入土豆丝快速翻炒，淋入醋。',
      '加入青椒丝和盐，翻炒至断生即可。'
    ]
  },
  {
    id: 'r8',
    name: '蒜蓉西兰花',
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '蒜', amount: '5瓣' },
      { name: '盐', amount: '适量' },
      { name: '蚝油', amount: '半勺' }
    ],
    steps: [
      '西兰花掰小朵，用盐水浸泡10分钟后洗净。',
      '锅中烧水，加少许盐和油，西兰花焯水1分钟捞出。',
      '热锅下油，爆香蒜末。',
      '放入西兰花翻炒，加入蚝油和少许盐。',
      '翻炒均匀即可出锅。'
    ]
  },
  {
    id: 'r9',
    name: '番茄牛腩汤',
    ingredients: [
      { name: '牛腩', amount: '500克' },
      { name: '番茄', amount: '3个' },
      { name: '洋葱', amount: '半个' },
      { name: '姜', amount: '3片' },
      { name: '土豆', amount: '1个' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      '牛腩切块焯水，捞出洗净。',
      '番茄切块，洋葱切丝，土豆切块。',
      '锅中下油，炒香洋葱和姜片，加入番茄炒出汁。',
      '加入牛腩和足量水，大火烧开转小火炖1.5小时。',
      '放入土豆继续炖20分钟。',
      '加盐调味即可。'
    ]
  },
  {
    id: 'r10',
    name: '糖醋里脊',
    ingredients: [
      { name: '猪肉', amount: '300克' },
      { name: '鸡蛋', amount: '1个' },
      { name: '淀粉', amount: '3勺' },
      { name: '番茄酱', amount: '3勺' },
      { name: '糖', amount: '2勺' },
      { name: '醋', amount: '1勺' },
      { name: '盐', amount: '少许' }
    ],
    steps: [
      '猪肉切条，用盐和少许料酒腌制10分钟。',
      '鸡蛋和淀粉调成糊，裹上猪肉条。',
      '油温六成热，逐条放入肉条炸至金黄捞出。',
      '油温升高，复炸一次至酥脆。',
      '锅中留底油，放入番茄酱、糖、醋和少许水熬至浓稠。',
      '倒入炸好的里脊快速翻炒均匀即可。'
    ]
  }
];

async function seedDatabase() {
  const count = await recipesDb.count({});
  if (count === 0) {
    await recipesDb.insert(seedRecipes);
  }
}

seedDatabase();

app.get('/api/search', async (req, res) => {
  try {
    const ingredientsParam = req.query.ingredients as string;
    if (!ingredientsParam) {
      return res.json([]);
    }
    const inputIngredients = ingredientsParam.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
    const allRecipes = await recipesDb.find({});

    const results = allRecipes.map(recipe => {
      const recipeIngredientNames = recipe.ingredients.map((ing: any) => ing.name);
      const matched = inputIngredients.filter(input =>
        recipeIngredientNames.some(name =>
          name.includes(input) || input.includes(name)
        )
      );
      const matchCount = matched.length;
      const matchPercentage = Math.round((matchCount / recipe.ingredients.length) * 100);
      return {
        ...recipe,
        matchCount,
        matchPercentage,
        matchedIngredients: matched
      };
    })
      .filter(r => r.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 5);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/recipes/:id', async (req, res) => {
  try {
    const recipe = await recipesDb.findOne({ id: req.params.id });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recipe' });
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await favoritesDb.find({});
    const favoriteRecipes = [];
    for (const fav of favorites) {
      const recipe = await recipesDb.findOne({ id: fav.recipeId });
      if (recipe) {
        const note = await notesDb.findOne({ recipeId: fav.recipeId });
        favoriteRecipes.push({
          ...recipe,
          hasNote: !!note
        });
      }
    }
    res.json(favoriteRecipes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { recipeId } = req.body;
    const existing = await favoritesDb.findOne({ recipeId });
    if (existing) {
      return res.json({ favorited: true });
    }
    await favoritesDb.insert({ recipeId, createdAt: new Date().toISOString() });
    res.json({ favorited: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:recipeId', async (req, res) => {
  try {
    await favoritesDb.remove({ recipeId: req.params.recipeId }, {});
    res.json({ favorited: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

app.get('/api/favorites/:recipeId', async (req, res) => {
  try {
    const fav = await favoritesDb.findOne({ recipeId: req.params.recipeId });
    res.json({ favorited: !!fav });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

app.get('/api/notes/:recipeId', async (req, res) => {
  try {
    const note = await notesDb.findOne({ recipeId: req.params.recipeId });
    res.json(note ? note.content : '');
  } catch (err) {
    res.status(500).json({ error: 'Failed to get note' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { recipeId, content } = req.body;
    const existing = await notesDb.findOne({ recipeId });
    if (existing) {
      await notesDb.update({ recipeId }, { $set: { content, updatedAt: new Date().toISOString() } });
    } else {
      await notesDb.insert({ recipeId, content, createdAt: new Date().toISOString() });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

app.post('/api/shopping-list', async (req, res) => {
  try {
    const { recipeId, items } = req.body;
    const existing = await shoppingListsDb.findOne({ recipeId });
    if (existing) {
      await shoppingListsDb.update({ recipeId }, { $set: { items, updatedAt: new Date().toISOString() } });
    } else {
      await shoppingListsDb.insert({ recipeId, items, createdAt: new Date().toISOString() });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save shopping list' });
  }
});

app.get('/api/shopping-list/:recipeId', async (req, res) => {
  try {
    const list = await shoppingListsDb.findOne({ recipeId: req.params.recipeId });
    res.json(list ? list.items : []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get shopping list' });
  }
});

app.listen(PORT, () => {
  console.log(`RecipeScout server running on port ${PORT}`);
});
