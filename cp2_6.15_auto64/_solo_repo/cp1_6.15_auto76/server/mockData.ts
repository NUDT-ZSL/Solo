import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

app.use((_, res, next) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  next();
});

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

interface Ingredient {
  name: string;
  amount: string;
}

interface Step {
  description: string;
  duration: number;
  tip?: string;
}

interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
}

interface Recipe {
  id: string;
  title: string;
  authorId: string;
  cuisine: string;
  cookingTime: number;
  imageUrl: string;
  ingredients: Ingredient[];
  steps: Step[];
  ratings: number[];
  tags: string[];
  comments: Comment[];
  createdAt: number;
}

const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
const GIVEN_NAMES = ['小厨', '美食家', '厨房达人', '料理人', '味道控', '私房菜', '巧手', '味蕾', '食光', '厨娘', '大厨', '私厨', '佳味', '鲜味', '香坊'];

const users: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: `${SURNAMES[i % SURNAMES.length]}${GIVEN_NAMES[i % GIVEN_NAMES.length]}`,
  avatarUrl: `https://i.pravatar.cc/80?img=${(i % 70) + 1}`,
}));

const CUISINES = ['中餐', '西餐', '日料', '烘焙'] as const;

const CUISINE_RECIPES: Record<string, { titles: string[]; ingredientsList: Ingredient[][]; stepsList: Step[][]; tags: string[] }> = {
  中餐: {
    titles: [
      '红烧肉', '宫保鸡丁', '麻婆豆腐', '回锅肉', '鱼香肉丝',
      '水煮鱼', '糖醋排骨', '东坡肉', '辣子鸡', '蒜蓉粉丝蒸虾',
      '番茄炒蛋', '青椒肉丝', '干煸四季豆', '酸菜鱼', '毛血旺',
      '蚂蚁上树', '夫妻肺片', '口水鸡', '白切鸡', '梅菜扣肉',
      '红烧狮子头', '清蒸鲈鱼', '剁椒鱼头', '油焖大虾', '蒜泥白肉',
      '干锅花菜', '铁板牛肉', '椒盐排骨', '京酱肉丝', '木须肉',
    ],
    ingredientsList: [
      [{ name: '五花肉', amount: '500g' }, { name: '冰糖', amount: '30g' }, { name: '生抽', amount: '2勺' }, { name: '老抽', amount: '1勺' }, { name: '料酒', amount: '2勺' }, { name: '葱姜', amount: '适量' }],
      [{ name: '鸡胸肉', amount: '300g' }, { name: '花生米', amount: '50g' }, { name: '干辣椒', amount: '8个' }, { name: '花椒', amount: '1勺' }, { name: '醋', amount: '2勺' }, { name: '糖', amount: '1勺' }],
      [{ name: '嫩豆腐', amount: '1块' }, { name: '牛肉末', amount: '100g' }, { name: '豆瓣酱', amount: '2勺' }, { name: '花椒粉', amount: '1勺' }, { name: '蒜末', amount: '3瓣' }],
      [{ name: '五花肉', amount: '400g' }, { name: '青蒜', amount: '2根' }, { name: '豆瓣酱', amount: '1勺' }, { name: '甜面酱', amount: '1勺' }],
      [{ name: '猪里脊', amount: '300g' }, { name: '木耳', amount: '50g' }, { name: '胡萝卜', amount: '1根' }, { name: '醋', amount: '3勺' }, { name: '糖', amount: '2勺' }],
    ],
    stepsList: [
      [{ description: '五花肉切方块，冷水下锅焯水去血沫', duration: 8 }, { description: '锅中放油，加冰糖小火炒出焦糖色', duration: 5 }, { description: '放入肉块翻炒上色', duration: 3 }, { description: '加入生抽、老抽、料酒和开水', duration: 2 }, { description: '大火烧开转小火炖1小时', duration: 60 }, { description: '大火收汁至浓稠即可', duration: 5 }],
      [{ description: '鸡胸肉切丁，用料酒和淀粉腌制', duration: 10 }, { description: '调碗汁：醋、酱油、糖、淀粉水', duration: 3 }, { description: '锅中热油，爆香干辣椒和花椒', duration: 2 }, { description: '下鸡丁滑炒至变色', duration: 4 }, { description: '加入花生米和碗汁快速翻炒', duration: 2 }],
      [{ description: '豆腐切小块，入盐水焯一下', duration: 5 }, { description: '锅中热油，炒香牛肉末', duration: 3 }, { description: '加豆瓣酱炒出红油', duration: 2 }, { description: '加入豆腐轻轻翻匀', duration: 3 }, { description: '加水焖煮5分钟', duration: 5 }, { description: '勾芡出锅，撒花椒粉', duration: 2 }],
    ],
    tags: ['家常菜', '下饭菜', '川菜', '麻辣', '快手菜', '硬菜', '宴客', '传统'],
  },
  西餐: {
    titles: [
      '意式番茄肉酱面', '奶油蘑菇浓汤', '香煎牛排', '凯撒沙拉', '焗烤千层面',
      '法式洋葱汤', '烤鸡翅', '奶油培根意面', '芝士焗饭', '黑椒牛柳意面',
      '蒜香烤虾', '烤羊排配迷迭香', '英式炸鱼薯条', '奶油南瓜汤', '烟熏三文鱼沙拉',
      '烤全鸡', '蘑菇烩饭', '番茄罗勒意面', '芝士汉堡', '泰式酸辣虾',
    ],
    ingredientsList: [
      [{ name: '意面', amount: '200g' }, { name: '牛肉末', amount: '200g' }, { name: '番茄罐头', amount: '1罐' }, { name: '洋葱', amount: '1个' }, { name: '蒜', amount: '3瓣' }, { name: '罗勒', amount: '适量' }],
      [{ name: '蘑菇', amount: '300g' }, { name: '淡奶油', amount: '200ml' }, { name: '洋葱', amount: '1个' }, { name: '黄油', amount: '30g' }, { name: '面粉', amount: '2勺' }],
      [{ name: '牛排', amount: '1块' }, { name: '黑胡椒', amount: '适量' }, { name: '海盐', amount: '适量' }, { name: '黄油', amount: '20g' }, { name: '迷迭香', amount: '2枝' }],
    ],
    stepsList: [
      [{ description: '锅中热油，炒香洋葱和蒜末', duration: 5 }, { description: '加入牛肉末炒散', duration: 5 }, { description: '倒入番茄罐头，小火炖煮20分钟', duration: 20 }, { description: '煮意面至al dente', duration: 8 }, { description: '将酱汁浇在面上，撒罗勒叶', duration: 2 }],
      [{ description: '蘑菇切片，洋葱切碎', duration: 5 }, { description: '黄油炒香洋葱至透明', duration: 5 }, { description: '加入蘑菇片翻炒', duration: 5 }, { description: '撒面粉搅匀，加淡奶油', duration: 3 }, { description: '小火煮至浓稠，调味', duration: 10 }],
    ],
    tags: ['西式', '烘焙', '烤箱菜', '沙拉', '汤品', '意面', '快手'],
  },
  日料: {
    titles: [
      '日式味噌汤', '寿司拼盘', '天妇罗', '日式咖喱饭', '照烧鸡腿',
      '日式拉面', '三文鱼刺身', '日式煎饺', '茶碗蒸', '日式炸猪排',
      '鳗鱼饭', '冷荞麦面', '亲子丼', '关东煮', '大阪烧',
      '章鱼小丸子', '日式土豆炖肉', '抹茶布丁', '日式年糕汤', '味付海苔',
    ],
    ingredientsList: [
      [{ name: '味噌酱', amount: '3勺' }, { name: '豆腐', amount: '半块' }, { name: '海带', amount: '1片' }, { name: '柴鱼片', amount: '1把' }, { name: '葱花', amount: '适量' }],
      [{ name: '寿司米', amount: '300g' }, { name: '海苔', amount: '5片' }, { name: '三文鱼', amount: '150g' }, { name: '黄瓜', amount: '1根' }, { name: '寿司醋', amount: '3勺' }],
      [{ name: '大虾', amount: '8只' }, { name: '红薯', amount: '1个' }, { name: '茄子', amount: '1根' }, { name: '低筋面粉', amount: '100g' }, { name: '鸡蛋', amount: '1个' }, { name: '冰水', amount: '150ml' }],
    ],
    stepsList: [
      [{ description: '海带泡水煮开，取出海带', duration: 5 }, { description: '加入柴鱼片煮2分钟，过滤', duration: 4 }, { description: '豆腐切小丁', duration: 2 }, { description: '将味噌酱溶入高汤中', duration: 2 }, { description: '加入豆腐丁，撒葱花', duration: 1 }],
      [{ description: '寿司米煮熟，拌入寿司醋', duration: 25 }, { description: '三文鱼切条，黄瓜切条', duration: 5 }, { description: '在竹帘上铺海苔和米饭', duration: 3 }, { description: '放上三文鱼和黄瓜条', duration: 2 }, { description: '卷紧切段', duration: 3 }],
    ],
    tags: ['日式', '刺身', '拉面', '清淡', '精致', '和风'],
  },
  烘焙: {
    titles: [
      '经典戚风蛋糕', '蔓越莓饼干', '法式可颂', '提拉米苏', '巧克力熔岩蛋糕',
      '柠檬磅蛋糕', '肉松小贝', '葡式蛋挞', '红豆面包', '抹茶千层蛋糕',
      '原味曲奇', '舒芙蕾', '焦糖布丁', '黄油司康', '肉桂卷',
      '黑森林蛋糕', '奶油泡芙', '芒果慕斯', '椰蓉球', '全麦吐司',
    ],
    ingredientsList: [
      [{ name: '低筋面粉', amount: '100g' }, { name: '鸡蛋', amount: '5个' }, { name: '细砂糖', amount: '80g' }, { name: '牛奶', amount: '60ml' }, { name: '植物油', amount: '40ml' }],
      [{ name: '低筋面粉', amount: '150g' }, { name: '黄油', amount: '100g' }, { name: '糖粉', amount: '50g' }, { name: '蔓越莓干', amount: '40g' }, { name: '鸡蛋', amount: '1个' }],
      [{ name: '高筋面粉', amount: '250g' }, { name: '黄油（片状）', amount: '150g' }, { name: '酵母', amount: '3g' }, { name: '牛奶', amount: '130ml' }, { name: '糖', amount: '30g' }, { name: '盐', amount: '5g' }],
    ],
    stepsList: [
      [{ description: '分离蛋清蛋黄', duration: 5 }, { description: '蛋黄加牛奶和油搅匀，筛入面粉', duration: 5 }, { description: '蛋清分三次加糖打至硬性发泡', duration: 8 }, { description: '取1/3蛋白霜与蛋黄糊翻拌', duration: 3 }, { description: '倒回蛋白霜中翻拌均匀', duration: 3 }, { description: '倒入模具，震出气泡', duration: 2 }, { description: '烤箱150°C烤50分钟', duration: 50 }, { description: '出炉倒扣晾凉脱模', duration: 60 }],
      [{ description: '黄油软化加糖粉打发', duration: 5 }, { description: '加入蛋液搅拌均匀', duration: 3 }, { description: '筛入面粉拌匀，加蔓越莓', duration: 3 }, { description: '整形成长条，冷藏1小时', duration: 60 }, { description: '切片，烤箱170°C烤15分钟', duration: 15 }],
    ],
    tags: ['烘焙', '甜点', '蛋糕', '饼干', '面包', '下午茶', '免烤箱'],
  },
};

function generateRecipes(): Recipe[] {
  const recipes: Recipe[] = [];
  const EMOJIS = ['😋', '🤤', '👍', '❤️', '🔥', '✨', '💯', '👏', '🎉', '🥘', '🍜', '🍰', '🍳', '🥗', '🍲'];

  for (let i = 0; i < 500; i++) {
    const cuisine = CUISINES[i % 4];
    const cuisineData = CUISINE_RECIPES[cuisine];
    const titleIdx = i % cuisineData.titles.length;
    const baseTitle = cuisineData.titles[titleIdx];
    const variant = Math.floor(i / 4);
    const title = variant > 0 ? `${baseTitle} #${variant}` : baseTitle;

    const ingredients = cuisineData.ingredientsList[titleIdx % cuisineData.ingredientsList.length];
    const steps = cuisineData.stepsList[titleIdx % cuisineData.stepsList.length];

    const cookingTime = [10, 15, 20, 25, 30, 35, 45, 60, 90][i % 9];

    const ratingCount = 3 + (i % 20);
    const ratings: number[] = [];
    for (let r = 0; r < ratingCount; r++) {
      ratings.push(Math.min(5, Math.max(1, 3 + Math.floor(Math.random() * 3) - (r % 3 === 0 ? 1 : 0))));
    }

    const commentCount = i % 8;
    const comments: Comment[] = [];
    const commentTexts = [
      '太好吃了吧！家人都赞不绝口', '做法很详细，第一次做就成功了',
      '味道很正宗，跟我奶奶做的一样', '减了点油，味道也很好',
      '这道菜我已经做了三次了，每次都很棒', '请问可以不加辣椒吗？',
      '孩子特别喜欢，会经常做', '食材很常见，方便准备',
      '颜值和味道都在线！', '分享给了朋友，她们都想要菜谱',
    ];
    for (let c = 0; c < commentCount; c++) {
      comments.push({
        id: uuidv4(),
        userId: users[(i + c) % users.length].id,
        content: `${EMOJIS[c % EMOJIS.length]} ${commentTexts[c % commentTexts.length]}`,
        timestamp: Date.now() - (commentCount - c) * 86400000 * (1 + (c % 5)),
      });
    }

    const tagCount = 1 + (i % 3);
    const tags: string[] = [];
    for (let t = 0; t < tagCount; t++) {
      const tag = cuisineData.tags[(i + t) % cuisineData.tags.length];
      if (!tags.includes(tag)) tags.push(tag);
    }

    const hasImage = i % 5 !== 4;
    const imagePrompts: Record<string, string[]> = {
      中餐: ['chinese food braised pork', 'chinese stir fry dish', 'chinese hot pot', 'chinese dumplings'],
      西餐: ['pasta with tomato sauce', 'grilled steak', 'caesar salad', 'french onion soup'],
      日料: ['japanese sushi platter', 'miso soup', 'tempura shrimp', 'japanese ramen'],
      烘焙: ['chiffon cake slice', 'croissant pastry', 'chocolate lava cake', 'matcha layered cake'],
    };
    const prompts = imagePrompts[cuisine];
    const imageUrl = hasImage
      ? `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompts[i % prompts.length])}&image_size=landscape_4_3`
      : '';

    recipes.push({
      id: `recipe-${i + 1}`,
      title,
      authorId: users[i % users.length].id,
      cuisine,
      cookingTime,
      imageUrl,
      ingredients: [...ingredients],
      steps: steps.map((s, si) => ({
        ...s,
        tip: si % 3 === 0 ? '注意火候' : undefined,
      })),
      ratings,
      tags,
      comments,
      createdAt: Date.now() - i * 3600000,
    });
  }

  return recipes;
}

const recipes = generateRecipes();

app.get('/api/recipes', (req, res) => {
  const { cuisine, cookingTime, search } = req.query;
  let result = [...recipes];

  if (cuisine && typeof cuisine === 'string') {
    result = result.filter((r) => r.cuisine === cuisine);
  }

  if (cookingTime && typeof cookingTime === 'string') {
    if (cookingTime === '<15') result = result.filter((r) => r.cookingTime < 15);
    else if (cookingTime === '15-30') result = result.filter((r) => r.cookingTime >= 15 && r.cookingTime <= 30);
    else if (cookingTime === '>30') result = result.filter((r) => r.cookingTime > 30);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)) ||
        r.ingredients.some((ing) => ing.name.includes(q))
    );
  }

  res.json({ recipes: result, total: result.length });
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(recipe);
});

app.get('/api/users', (_req, res) => {
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

app.post('/api/recipes/:id/rate', (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const { rating } = req.body;
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be 1-5' });
    return;
  }
  recipe.ratings.push(rating);
  const avg = recipe.ratings.reduce((a, b) => a + b, 0) / recipe.ratings.length;
  res.json({ averageRating: Math.round(avg * 10) / 10, ratingCount: recipe.ratings.length });
});

app.post('/api/recipes/:id/comments', (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const { userId, content } = req.body;
  if (!userId || !content) {
    res.status(400).json({ error: 'userId and content required' });
    return;
  }
  const comment: Comment = {
    id: uuidv4(),
    userId,
    content,
    timestamp: Date.now(),
  };
  recipe.comments.unshift(comment);
  res.json(comment);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
});
