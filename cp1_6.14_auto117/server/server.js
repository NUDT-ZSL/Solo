import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const recipesDB = [
  {
    id: 1,
    name: '番茄炒蛋',
    matchScore: 95,
    matchedIngredients: ['番茄', '鸡蛋'],
    allIngredients: [
      { id: 1, name: '番茄', amount: 2, unit: '个', category: '蔬菜', owned: 0 },
      { id: 2, name: '鸡蛋', amount: 3, unit: '个', category: '蛋类', owned: 0 },
      { id: 3, name: '葱花', amount: 5, unit: '克', category: '调味品', owned: 0 },
      { id: 4, name: '盐', amount: 3, unit: '克', category: '调味品', owned: 0 },
      { id: 5, name: '食用油', amount: 15, unit: '毫升', category: '调味品', owned: 0 }
    ],
    steps: [
      '番茄洗净切块，鸡蛋打散加少许盐搅匀',
      '热锅倒油，油温七成热时倒入蛋液，炒至凝固盛出',
      '锅中再加少许油，放入番茄块翻炒出汁',
      '加入炒好的鸡蛋，翻炒均匀',
      '加盐调味，撒上葱花即可出锅'
    ]
  },
  {
    id: 2,
    name: '青椒肉丝',
    matchScore: 88,
    matchedIngredients: ['青椒', '猪肉'],
    allIngredients: [
      { id: 1, name: '青椒', amount: 2, unit: '个', category: '蔬菜', owned: 0 },
      { id: 2, name: '猪肉', amount: 200, unit: '克', category: '肉类', owned: 0 },
      { id: 3, name: '生抽', amount: 10, unit: '毫升', category: '调味品', owned: 0 },
      { id: 4, name: '料酒', amount: 5, unit: '毫升', category: '调味品', owned: 0 },
      { id: 5, name: '淀粉', amount: 5, unit: '克', category: '调味品', owned: 0 },
      { id: 6, name: '盐', amount: 2, unit: '克', category: '调味品', owned: 0 }
    ],
    steps: [
      '猪肉切丝，用生抽、料酒、淀粉腌制10分钟',
      '青椒洗净去籽切丝',
      '热锅倒油，放入肉丝滑炒至变色盛出',
      '锅中留底油，放入青椒丝翻炒片刻',
      '倒入肉丝，加盐调味，翻炒均匀即可'
    ]
  },
  {
    id: 3,
    name: '土豆烧牛肉',
    matchScore: 82,
    matchedIngredients: ['土豆', '牛肉'],
    allIngredients: [
      { id: 1, name: '土豆', amount: 2, unit: '个', category: '蔬菜', owned: 0 },
      { id: 2, name: '牛肉', amount: 300, unit: '克', category: '肉类', owned: 0 },
      { id: 3, name: '胡萝卜', amount: 1, unit: '根', category: '蔬菜', owned: 0 },
      { id: 4, name: '生抽', amount: 15, unit: '毫升', category: '调味品', owned: 0 },
      { id: 5, name: '老抽', amount: 5, unit: '毫升', category: '调味品', owned: 0 },
      { id: 6, name: '八角', amount: 1, unit: '个', category: '调味品', owned: 0 }
    ],
    steps: [
      '牛肉切块焯水去血沫，土豆胡萝卜切块',
      '热锅倒油，放入八角爆香，加入牛肉翻炒',
      '加生抽、老抽上色，加开水没过牛肉',
      '大火烧开后转小火炖40分钟',
      '加入土豆胡萝卜继续炖20分钟',
      '大火收汁即可出锅'
    ]
  },
  {
    id: 4,
    name: '蒜蓉西兰花',
    matchScore: 90,
    matchedIngredients: ['西兰花', '大蒜'],
    allIngredients: [
      { id: 1, name: '西兰花', amount: 1, unit: '颗', category: '蔬菜', owned: 0 },
      { id: 2, name: '大蒜', amount: 3, unit: '瓣', category: '调味品', owned: 0 },
      { id: 3, name: '盐', amount: 2, unit: '克', category: '调味品', owned: 0 },
      { id: 4, name: '食用油', amount: 10, unit: '毫升', category: '调味品', owned: 0 }
    ],
    steps: [
      '西兰花掰成小朵，洗净沥干',
      '大蒜切末备用',
      '锅中水烧开，加少许盐和油，放入西兰花焯水1分钟捞出',
      '热锅倒油，放入蒜末爆香',
      '倒入西兰花翻炒均匀，加盐调味即可'
    ]
  },
  {
    id: 5,
    name: '宫保鸡丁',
    matchScore: 75,
    matchedIngredients: ['鸡胸肉', '花生'],
    allIngredients: [
      { id: 1, name: '鸡胸肉', amount: 250, unit: '克', category: '肉类', owned: 0 },
      { id: 2, name: '花生', amount: 50, unit: '克', category: '干货', owned: 0 },
      { id: 3, name: '干辣椒', amount: 5, unit: '个', category: '调味品', owned: 0 },
      { id: 4, name: '花椒', amount: 3, unit: '克', category: '调味品', owned: 0 },
      { id: 5, name: '生抽', amount: 10, unit: '毫升', category: '调味品', owned: 0 },
      { id: 6, name: '醋', amount: 5, unit: '毫升', category: '调味品', owned: 0 },
      { id: 7, name: '白糖', amount: 5, unit: '克', category: '调味品', owned: 0 }
    ],
    steps: [
      '鸡胸肉切丁，用生抽、淀粉腌制10分钟',
      '干辣椒剪段，调酱汁：生抽、醋、白糖、淀粉、水',
      '热锅倒油，放入花生炸至金黄捞出',
      '锅中留底油，爆香干辣椒和花椒',
      '放入鸡丁翻炒至变色',
      '倒入调好的酱汁，翻炒至浓稠',
      '最后加入炸好的花生翻炒均匀即可'
    ]
  },
  {
    id: 6,
    name: '西红柿牛腩汤',
    matchScore: 70,
    matchedIngredients: ['番茄', '牛腩'],
    allIngredients: [
      { id: 1, name: '番茄', amount: 3, unit: '个', category: '蔬菜', owned: 0 },
      { id: 2, name: '牛腩', amount: 400, unit: '克', category: '肉类', owned: 0 },
      { id: 3, name: '洋葱', amount: 1, unit: '个', category: '蔬菜', owned: 0 },
      { id: 4, name: '姜片', amount: 3, unit: '片', category: '调味品', owned: 0 },
      { id: 5, name: '盐', amount: 5, unit: '克', category: '调味品', owned: 0 }
    ],
    steps: [
      '牛腩切块焯水去血沫',
      '番茄去皮切块，洋葱切块',
      '热锅倒油，炒香洋葱和姜片',
      '加入番茄炒出汤汁',
      '放入牛腩，加开水没过食材',
      '大火烧开后转小火炖1.5小时',
      '加盐调味，撒上香菜即可'
    ]
  },
  {
    id: 7,
    name: '麻婆豆腐',
    matchScore: 85,
    matchedIngredients: ['豆腐', '猪肉'],
    allIngredients: [
      { id: 1, name: '豆腐', amount: 1, unit: '块', category: '豆制品', owned: 0 },
      { id: 2, name: '猪肉末', amount: 100, unit: '克', category: '肉类', owned: 0 },
      { id: 3, name: '豆瓣酱', amount: 15, unit: '克', category: '调味品', owned: 0 },
      { id: 4, name: '花椒粉', amount: 3, unit: '克', category: '调味品', owned: 0 },
      { id: 5, name: '生抽', amount: 5, unit: '毫升', category: '调味品', owned: 0 }
    ],
    steps: [
      '豆腐切小块，用盐水浸泡5分钟',
      '热锅倒油，放入肉末炒散',
      '加入豆瓣酱炒出红油',
      '加适量水烧开，放入豆腐块',
      '小火煮3分钟让豆腐入味',
      '加水淀粉勾芡，撒上花椒粉即可'
    ]
  },
  {
    id: 8,
    name: '清炒时蔬',
    matchScore: 92,
    matchedIngredients: ['青菜', '大蒜'],
    allIngredients: [
      { id: 1, name: '青菜', amount: 300, unit: '克', category: '蔬菜', owned: 0 },
      { id: 2, name: '大蒜', amount: 2, unit: '瓣', category: '调味品', owned: 0 },
      { id: 3, name: '盐', amount: 2, unit: '克', category: '调味品', owned: 0 },
      { id: 4, name: '食用油', amount: 10, unit: '毫升', category: '调味品', owned: 0 }
    ],
    steps: [
      '青菜洗净沥干水分',
      '大蒜切片备用',
      '热锅倒油，爆香蒜片',
      '放入青菜大火快炒',
      '加盐调味，翻炒均匀即可出锅'
    ]
  },
  {
    id: 9,
    name: '糖醋排骨',
    matchScore: 68,
    matchedIngredients: ['排骨', '白糖'],
    allIngredients: [
      { id: 1, name: '排骨', amount: 500, unit: '克', category: '肉类', owned: 0 },
      { id: 2, name: '白糖', amount: 30, unit: '克', category: '调味品', owned: 0 },
      { id: 3, name: '醋', amount: 20, unit: '毫升', category: '调味品', owned: 0 },
      { id: 4, name: '生抽', amount: 15, unit: '毫升', category: '调味品', owned: 0 },
      { id: 5, name: '料酒', amount: 10, unit: '毫升', category: '调味品', owned: 0 },
      { id: 6, name: '姜片', amount: 3, unit: '片', category: '调味品', owned: 0 }
    ],
    steps: [
      '排骨焯水去血沫，捞出沥干',
      '调糖醋汁：白糖、醋、生抽、料酒、水',
      '热锅倒油，放入排骨煎至金黄',
      '加入姜片爆香',
      '倒入糖醋汁，大火烧开',
      '转小火炖20分钟',
      '大火收汁至浓稠即可'
    ]
  }
];

const categoryColors = {
  '蔬菜': '#48bb78',
  '肉类': '#e53e3e',
  '蛋类': '#d69e2e',
  '豆制品': '#805ad5',
  '调味品': '#4299e1',
  '干货': '#ed8936'
};

app.get('/api/recipes', (req, res) => {
  const { ingredients } = req.query;
  if (!ingredients) {
    return res.json([]);
  }

  const userIngredients = String(ingredients)
    .split(/[,\s，、]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);

  const scoredRecipes = recipesDB.map(recipe => {
    const allIngNames = recipe.allIngredients.map(ing => ing.name.toLowerCase());
    const matchedCount = userIngredients.filter(ing => allIngNames.includes(ing)).length;
    const matchScore = Math.min(100, Math.round((matchedCount / recipe.allIngredients.length) * 100));
    const matchedIngredients = recipe.allIngredients
      .filter(ing => userIngredients.includes(ing.name.toLowerCase()))
      .map(ing => ing.name);

    return {
      ...recipe,
      matchScore: Math.max(recipe.matchScore, matchScore),
      matchedIngredients: matchedIngredients.length > 0 ? matchedIngredients : recipe.matchedIngredients
    };
  });

  const filtered = scoredRecipes
    .filter(r => r.matchScore > 40)
    .sort((a, b) => b.matchScore - a.matchScore);

  setTimeout(() => {
    res.json(filtered);
  }, 800);
});

app.get('/api/recipes/:id/details', (req, res) => {
  const { id } = req.params;
  const recipe = recipesDB.find(r => r.id === parseInt(id));

  if (!recipe) {
    return res.status(404).json({ error: '菜谱不存在' });
  }

  setTimeout(() => {
    res.json({
      ...recipe,
      categoryColors
    });
  }, 300);
});

app.post('/api/shopping-list', (req, res) => {
  const { recipeId, ingredients, ownedAmounts } = req.body;

  const recipe = recipesDB.find(r => r.id === parseInt(recipeId));
  if (!recipe) {
    return res.status(404).json({ error: '菜谱不存在' });
  }

  const shoppingList = {};

  ingredients.forEach(ing => {
    const owned = ownedAmounts[ing.id] || 0;
    const needed = Math.max(0, ing.amount - owned);

    if (needed > 0) {
      if (!shoppingList[ing.category]) {
        shoppingList[ing.category] = [];
      }
      shoppingList[ing.category].push({
        name: ing.name,
        needed: needed,
        unit: ing.unit,
        color: categoryColors[ing.category] || '#718096'
      });
    }
  });

  setTimeout(() => {
    res.json({ shoppingList, categoryColors });
  }, 200);
});

app.listen(PORT, () => {
  console.log(`RecipeSolver API server running on http://localhost:${PORT}`);
});
