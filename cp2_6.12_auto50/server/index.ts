import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const db = new Database(path.join(__dirname, 'recipe-lab.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    match_score INTEGER NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    required_ingredients TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cooking_logs (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    match_score INTEGER NOT NULL,
    notes TEXT,
    rating INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`);

interface Ingredient {
  id: string;
  name: string;
  category: string;
}

interface RecipePattern {
  name: string;
  matchIngredients: string[];
  description: string;
  requiredIngredients: { name: string; amount: string }[];
  steps: string[];
}

interface Recipe {
  id: string;
  name: string;
  matchScore: number;
  description: string;
  requiredIngredients: string;
  steps: string;
  ingredients: string;
}

interface CookingLog {
  id: string;
  recipe_id: string;
  recipe_name: string;
  match_score: number;
  notes: string | null;
  rating: number;
  created_at: string;
}

const seedIngredients: { name: string; category: string }[] = [
  { name: '西红柿', category: '蔬菜' },
  { name: '洋葱', category: '蔬菜' },
  { name: '大蒜', category: '蔬菜' },
  { name: '胡萝卜', category: '蔬菜' },
  { name: '土豆', category: '蔬菜' },
  { name: '西兰花', category: '蔬菜' },
  { name: '青椒', category: '蔬菜' },
  { name: '蘑菇', category: '蔬菜' },
  { name: '菠菜', category: '蔬菜' },
  { name: '白菜', category: '蔬菜' },
  { name: '鸡肉', category: '肉类' },
  { name: '猪肉', category: '肉类' },
  { name: '牛肉', category: '肉类' },
  { name: '培根', category: '肉类' },
  { name: '香肠', category: '肉类' },
  { name: '火腿', category: '肉类' },
  { name: '羊肉', category: '肉类' },
  { name: '鸭肉', category: '肉类' },
  { name: '虾', category: '海鲜' },
  { name: '三文鱼', category: '海鲜' },
  { name: '鳕鱼', category: '海鲜' },
  { name: '鱿鱼', category: '海鲜' },
  { name: '螃蟹', category: '海鲜' },
  { name: '蛤蜊', category: '海鲜' },
  { name: '金枪鱼', category: '海鲜' },
  { name: '带子', category: '海鲜' },
  { name: '盐', category: '调味品' },
  { name: '酱油', category: '调味品' },
  { name: '糖', category: '调味品' },
  { name: '醋', category: '调味品' },
  { name: '黑胡椒', category: '调味品' },
  { name: '橄榄油', category: '调味品' },
  { name: '黄油', category: '调味品' },
  { name: '番茄酱', category: '调味品' },
  { name: '料酒', category: '调味品' },
  { name: '生抽', category: '调味品' },
  { name: '牛奶', category: '乳制品' },
  { name: '鸡蛋', category: '乳制品' },
  { name: '奶酪', category: '乳制品' },
  { name: '酸奶', category: '乳制品' },
  { name: '奶油', category: '乳制品' },
  { name: '芝士', category: '乳制品' },
  { name: '炼乳', category: '乳制品' },
  { name: '奶粉', category: '乳制品' },
];

const ingredientCount = db.prepare('SELECT COUNT(*) as count FROM ingredients').get() as { count: number };
if (ingredientCount.count === 0) {
  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (id, name, category) VALUES (?, ?, ?)'
  );
  const insertTransaction = db.transaction((ingredients: { name: string; category: string }[]) => {
    for (const ing of ingredients) {
      insertIngredient.run(uuidv4(), ing.name, ing.category);
    }
  });
  insertTransaction(seedIngredients);
}

const recipePatterns: RecipePattern[] = [
  {
    name: '西红柿炒蛋',
    matchIngredients: ['西红柿', '鸡蛋', '盐', '糖'],
    description: '经典家常菜，酸甜可口，老少皆宜。',
    requiredIngredients: [
      { name: '西红柿', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1勺' },
      { name: '橄榄油', amount: '适量' },
    ],
    steps: [
      '将西红柿切块，鸡蛋打散备用。',
      '热锅下油，倒入蛋液炒至凝固盛出。',
      '锅中再加油，放入西红柿翻炒出汁。',
      '加入盐和糖调味，倒入炒好的鸡蛋。',
      '翻炒均匀即可出锅。',
    ],
  },
  {
    name: '红烧牛肉',
    matchIngredients: ['牛肉', '土豆', '胡萝卜', '洋葱', '大蒜', '酱油', '糖'],
    description: '浓郁鲜香的红烧牛肉，软烂入味，配饭绝佳。',
    requiredIngredients: [
      { name: '牛肉', amount: '500g' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '半个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '酱油', amount: '2勺' },
      { name: '糖', amount: '1勺' },
      { name: '料酒', amount: '1勺' },
    ],
    steps: [
      '牛肉切块焯水去血沫，捞出沥干。',
      '土豆、胡萝卜切滚刀块，洋葱切片，大蒜拍碎。',
      '热锅下油，爆香大蒜和洋葱。',
      '加入牛肉翻炒，加料酒、酱油、糖上色。',
      '加水没过牛肉，大火烧开转小火炖40分钟。',
      '加入土豆和胡萝卜，再炖20分钟至软烂。',
      '大火收汁即可。',
    ],
  },
  {
    name: '宫保鸡丁',
    matchIngredients: ['鸡肉', '花生', '青椒', '大蒜', '酱油', '醋', '糖'],
    description: '川菜经典，鸡肉嫩滑，花生酥脆，酸甜微辣。',
    requiredIngredients: [
      { name: '鸡肉', amount: '300g' },
      { name: '花生', amount: '50g' },
      { name: '青椒', amount: '1个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '酱油', amount: '1勺' },
      { name: '醋', amount: '1勺' },
      { name: '糖', amount: '1勺' },
      { name: '盐', amount: '适量' },
    ],
    steps: [
      '鸡肉切丁，加盐和料酒腌制10分钟。',
      '青椒切丁，大蒜切末。',
      '调酱汁：酱油、醋、糖、淀粉和水混合。',
      '热锅下油，炒香花生后盛出。',
      '锅中加油，爆香蒜末，放入鸡丁翻炒至变色。',
      '加入青椒丁翻炒，倒入调好的酱汁。',
      '最后加入花生翻炒均匀即可。',
    ],
  },
  {
    name: '蒜蓉西兰花',
    matchIngredients: ['西兰花', '大蒜', '盐', '橄榄油'],
    description: '清爽健康的素菜，蒜香浓郁，西兰花翠绿爽脆。',
    requiredIngredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '大蒜', amount: '5瓣' },
      { name: '盐', amount: '适量' },
      { name: '橄榄油', amount: '适量' },
    ],
    steps: [
      '西兰花掰成小朵，用盐水浸泡10分钟后洗净。',
      '大蒜切末备用。',
      '锅中烧开水，加少许盐和油，放入西兰花焯水2分钟。',
      '捞出沥干水分。',
      '热锅下橄榄油，爆香蒜末。',
      '放入西兰花快速翻炒，加盐调味即可。',
    ],
  },
  {
    name: '糖醋里脊',
    matchIngredients: ['猪肉', '鸡蛋', '番茄酱', '糖', '醋', '盐'],
    description: '外酥里嫩，酸甜可口的经典糖醋菜。',
    requiredIngredients: [
      { name: '猪肉', amount: '300g' },
      { name: '鸡蛋', amount: '1个' },
      { name: '番茄酱', amount: '3勺' },
      { name: '糖', amount: '2勺' },
      { name: '醋', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '淀粉', amount: '适量' },
    ],
    steps: [
      '猪肉切条，加盐和料酒腌制15分钟。',
      '鸡蛋打散，加入淀粉调成糊状。',
      '将肉条裹上蛋糊。',
      '油温六成热，逐条放入肉条炸至金黄捞出。',
      '升高油温复炸一次至酥脆。',
      '锅中留底油，加番茄酱、糖、醋和水煮开。',
      '水淀粉勾芡，倒入炸好的肉条翻炒均匀。',
    ],
  },
  {
    name: '白灼虾',
    matchIngredients: ['虾', '大蒜', '酱油', '盐'],
    description: '保留鲜虾原味，搭配蘸料，鲜美无比。',
    requiredIngredients: [
      { name: '虾', amount: '500g' },
      { name: '大蒜', amount: '3瓣' },
      { name: '酱油', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '姜', amount: '3片' },
    ],
    steps: [
      '虾剪去虾须，挑去虾线，洗净沥干。',
      '大蒜切末，姜切片。',
      '锅中加水烧开，放入姜片和少许盐。',
      '放入虾煮3-4分钟至变红卷曲。',
      '捞出摆盘。',
      '蒜末加酱油调成蘸料，配虾食用。',
    ],
  },
  {
    name: '香煎三文鱼',
    matchIngredients: ['三文鱼', '柠檬', '盐', '黑胡椒', '黄油'],
    description: '外皮酥脆，肉质鲜嫩的西式煎三文鱼。',
    requiredIngredients: [
      { name: '三文鱼', amount: '2块' },
      { name: '柠檬', amount: '半个' },
      { name: '盐', amount: '适量' },
      { name: '黑胡椒', amount: '适量' },
      { name: '黄油', amount: '20g' },
      { name: '橄榄油', amount: '适量' },
    ],
    steps: [
      '三文鱼用厨房纸吸干水分。',
      '两面撒上盐和黑胡椒腌制10分钟。',
      '平底锅中火加热，放入橄榄油和黄油。',
      '三文鱼皮朝下放入锅中，煎4-5分钟至皮酥脆。',
      '翻面再煎2-3分钟。',
      '挤上柠檬汁即可出锅。',
    ],
  },
  {
    name: '奶油蘑菇汤',
    matchIngredients: ['蘑菇', '洋葱', '大蒜', '牛奶', '奶油', '黄油', '盐', '黑胡椒'],
    description: '浓郁丝滑的法式奶油蘑菇汤，香气四溢。',
    requiredIngredients: [
      { name: '蘑菇', amount: '300g' },
      { name: '洋葱', amount: '半个' },
      { name: '大蒜', amount: '2瓣' },
      { name: '牛奶', amount: '200ml' },
      { name: '奶油', amount: '100ml' },
      { name: '黄油', amount: '30g' },
      { name: '盐', amount: '适量' },
      { name: '黑胡椒', amount: '适量' },
    ],
    steps: [
      '蘑菇切片，洋葱切碎，大蒜切末。',
      '锅中放入黄油融化，炒香洋葱和蒜末。',
      '加入蘑菇片翻炒至变软出水。',
      '将炒好的蘑菇放入料理机，加少许牛奶打成泥。',
      '将蘑菇泥倒回锅中，加入剩余牛奶和奶油。',
      '小火加热煮开，加盐和黑胡椒调味。',
    ],
  },
  {
    name: '芝士焗土豆泥',
    matchIngredients: ['土豆', '牛奶', '黄油', '芝士', '盐', '黑胡椒'],
    description: '香浓拉丝的芝士土豆泥，小朋友的最爱。',
    requiredIngredients: [
      { name: '土豆', amount: '3个' },
      { name: '牛奶', amount: '100ml' },
      { name: '黄油', amount: '30g' },
      { name: '芝士', amount: '100g' },
      { name: '盐', amount: '适量' },
      { name: '黑胡椒', amount: '适量' },
    ],
    steps: [
      '土豆去皮切块，蒸熟或煮熟。',
      '趁热压成土豆泥。',
      '加入黄油、牛奶、盐和黑胡椒搅拌均匀。',
      '将土豆泥放入烤碗中抹平。',
      '表面撒上芝士碎。',
      '烤箱180度烤15-20分钟至芝士融化金黄。',
    ],
  },
  {
    name: '土豆烧牛肉',
    matchIngredients: ['牛肉', '土豆', '胡萝卜', '洋葱', '大蒜', '酱油', '盐'],
    description: '家常硬菜，牛肉软烂，土豆入味。',
    requiredIngredients: [
      { name: '牛肉', amount: '500g' },
      { name: '土豆', amount: '3个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '1个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '酱油', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '料酒', amount: '1勺' },
    ],
    steps: [
      '牛肉切块焯水，捞出沥干。',
      '土豆、胡萝卜切块，洋葱切条，大蒜拍碎。',
      '热锅下油，爆香大蒜和洋葱。',
      '加入牛肉翻炒，加料酒和酱油。',
      '加水没过牛肉，炖30分钟。',
      '加入土豆和胡萝卜，继续炖20分钟。',
      '大火收汁加盐调味。',
    ],
  },
  {
    name: '青椒肉丝',
    matchIngredients: ['猪肉', '青椒', '大蒜', '酱油', '盐'],
    description: '经典川菜，青椒爽脆，肉丝嫩滑。',
    requiredIngredients: [
      { name: '猪肉', amount: '300g' },
      { name: '青椒', amount: '3个' },
      { name: '大蒜', amount: '2瓣' },
      { name: '酱油', amount: '1勺' },
      { name: '盐', amount: '适量' },
      { name: '淀粉', amount: '适量' },
    ],
    steps: [
      '猪肉切丝，加盐、料酒、淀粉腌制10分钟。',
      '青椒切丝，大蒜切末。',
      '热锅下油，爆香蒜末。',
      '放入肉丝快速翻炒至变色。',
      '加入青椒丝继续翻炒。',
      '加酱油和盐调味，翻炒均匀出锅。',
    ],
  },
  {
    name: '培根意面',
    matchIngredients: ['培根', '鸡蛋', '奶酪', '大蒜', '黑胡椒', '盐'],
    description: '经典意式奶油培根意面，浓郁奶香。',
    requiredIngredients: [
      { name: '培根', amount: '100g' },
      { name: '鸡蛋', amount: '2个' },
      { name: '奶酪', amount: '50g' },
      { name: '大蒜', amount: '2瓣' },
      { name: '黑胡椒', amount: '适量' },
      { name: '盐', amount: '适量' },
      { name: '意面', amount: '200g' },
    ],
    steps: [
      '意面煮至八分熟，捞出备用。',
      '培根切条，大蒜切末，奶酪擦碎。',
      '鸡蛋打散，加入奶酪碎和黑胡椒拌匀。',
      '锅中煎香培根至出油，加入蒜末炒香。',
      '关火，倒入意面和鸡蛋奶酪酱。',
      '利用余温快速翻拌均匀，加盐调味。',
    ],
  },
  {
    name: '蒜蓉蒸虾',
    matchIngredients: ['虾', '大蒜', '酱油', '盐', '橄榄油'],
    description: '鲜嫩多汁的蒸虾，蒜香浓郁。',
    requiredIngredients: [
      { name: '虾', amount: '500g' },
      { name: '大蒜', amount: '10瓣' },
      { name: '酱油', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '橄榄油', amount: '适量' },
    ],
    steps: [
      '虾开背去虾线，洗净摆盘。',
      '大蒜剁成蒜蓉。',
      '锅中热油，下一半蒜蓉炒至金黄。',
      '将生熟蒜蓉混合，加盐拌匀。',
      '将蒜蓉铺在虾背上。',
      '水开后上锅蒸5分钟。',
      '淋上酱油，浇上热油即可。',
    ],
  },
  {
    name: '麻婆豆腐',
    matchIngredients: ['猪肉', '豆腐', '大蒜', '酱油', '盐', '花椒'],
    description: '麻辣鲜香的川菜代表，下饭神器。',
    requiredIngredients: [
      { name: '猪肉', amount: '150g' },
      { name: '豆腐', amount: '1块' },
      { name: '大蒜', amount: '3瓣' },
      { name: '酱油', amount: '1勺' },
      { name: '盐', amount: '适量' },
      { name: '花椒', amount: '适量' },
      { name: '豆瓣酱', amount: '1勺' },
    ],
    steps: [
      '豆腐切块，用盐水焯烫后捞出。',
      '猪肉剁成肉末，大蒜切末。',
      '热锅下油，炒香肉末至变色。',
      '加入蒜末和豆瓣酱炒出红油。',
      '加水煮开，放入豆腐块。',
      '加酱油和盐调味，小火煮5分钟。',
      '水淀粉勾芡，撒上花椒粉。',
    ],
  },
  {
    name: '咖喱鸡',
    matchIngredients: ['鸡肉', '土豆', '胡萝卜', '洋葱', '大蒜', '牛奶', '盐'],
    description: '浓郁咖喱香，鸡肉嫩滑，配饭绝佳。',
    requiredIngredients: [
      { name: '鸡肉', amount: '500g' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '1个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '牛奶', amount: '100ml' },
      { name: '盐', amount: '适量' },
      { name: '咖喱块', amount: '1盒' },
    ],
    steps: [
      '鸡肉切块，土豆、胡萝卜切滚刀块，洋葱切块，大蒜拍碎。',
      '热锅下油，爆香大蒜和洋葱。',
      '加入鸡肉翻炒至变色。',
      '加水没过食材，煮开后转小火炖20分钟。',
      '加入咖喱块搅拌融化。',
      '加入牛奶，继续煮5分钟至浓稠。',
      '加盐调味即可。',
    ],
  },
  {
    name: '清蒸鳕鱼',
    matchIngredients: ['鳕鱼', '大蒜', '酱油', '盐', '橄榄油'],
    description: '清淡健康的蒸鳕鱼，鲜嫩爽滑。',
    requiredIngredients: [
      { name: '鳕鱼', amount: '2块' },
      { name: '大蒜', amount: '3瓣' },
      { name: '酱油', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '姜', amount: '3片' },
    ],
    steps: [
      '鳕鱼解冻，用厨房纸吸干水分。',
      '两面撒少许盐腌制10分钟。',
      '大蒜切末，姜切丝。',
      '盘中放姜丝，摆上鳕鱼块。',
      '水开后上锅蒸8-10分钟。',
      '倒掉盘中多余汤汁，淋上酱油。',
      '撒上蒜末，浇上热油即可。',
    ],
  },
  {
    name: '火腿蛋炒饭',
    matchIngredients: ['火腿', '鸡蛋', '盐', '酱油', '洋葱'],
    description: '粒粒分明，香气扑鼻的经典炒饭。',
    requiredIngredients: [
      { name: '火腿', amount: '100g' },
      { name: '鸡蛋', amount: '2个' },
      { name: '米饭', amount: '2碗' },
      { name: '盐', amount: '适量' },
      { name: '酱油', amount: '1勺' },
      { name: '洋葱', amount: '半个' },
    ],
    steps: [
      '火腿切丁，洋葱切碎，鸡蛋打散。',
      '热锅下油，倒入蛋液快速炒散盛出。',
      '锅中再加少许油，炒香洋葱。',
      '加入火腿丁翻炒。',
      '倒入米饭，用铲子压散翻炒均匀。',
      '加入炒好的鸡蛋，加盐和酱油调味。',
      '大火翻炒至米饭粒粒分明。',
    ],
  },
  {
    name: '酸辣土豆丝',
    matchIngredients: ['土豆', '青椒', '大蒜', '醋', '盐'],
    description: '爽口开胃的家常素菜，酸辣香脆。',
    requiredIngredients: [
      { name: '土豆', amount: '2个' },
      { name: '青椒', amount: '1个' },
      { name: '大蒜', amount: '2瓣' },
      { name: '醋', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '花椒', amount: '少许' },
    ],
    steps: [
      '土豆去皮切细丝，泡水洗去淀粉。',
      '青椒切丝，大蒜切末。',
      '热锅下油，爆香花椒和蒜末。',
      '捞出花椒，放入土豆丝大火快炒。',
      '加入青椒丝继续翻炒。',
      '沿锅边淋入醋，加盐调味。',
      '翻炒均匀即可出锅。',
    ],
  },
  {
    name: '菠菜鸡蛋汤',
    matchIngredients: ['菠菜', '鸡蛋', '盐', '橄榄油'],
    description: '清淡营养的快手汤，色泽翠绿。',
    requiredIngredients: [
      { name: '菠菜', amount: '200g' },
      { name: '鸡蛋', amount: '2个' },
      { name: '盐', amount: '适量' },
      { name: '橄榄油', amount: '适量' },
    ],
    steps: [
      '菠菜洗净切段，鸡蛋打散。',
      '锅中加水烧开，加少许盐和油。',
      '放入菠菜焯水1分钟，捞出过凉。',
      '锅中重新加水烧开。',
      '淋入蛋液，形成蛋花。',
      '加入菠菜，加盐和橄榄油调味。',
    ],
  },
  {
    name: '烤香肠披萨',
    matchIngredients: ['香肠', '奶酪', '番茄酱', '洋葱', '青椒', '蘑菇'],
    description: '料足拉丝的家庭版披萨，简单美味。',
    requiredIngredients: [
      { name: '香肠', amount: '2根' },
      { name: '奶酪', amount: '150g' },
      { name: '番茄酱', amount: '3勺' },
      { name: '洋葱', amount: '半个' },
      { name: '青椒', amount: '半个' },
      { name: '蘑菇', amount: '5个' },
      { name: '披萨饼底', amount: '1个' },
    ],
    steps: [
      '香肠切片，洋葱青椒切丝，蘑菇切片。',
      '披萨饼底刷上番茄酱。',
      '撒上一层奶酪碎。',
      '均匀摆上香肠、洋葱、青椒、蘑菇。',
      '表面再撒满奶酪碎。',
      '烤箱200度烤15-20分钟至奶酪融化金黄。',
    ],
  },
];

app.get('/api/ingredients', (_req, res) => {
  const rows = db.prepare('SELECT id, name, category FROM ingredients ORDER BY category, name').all() as Ingredient[];
  res.json({ ingredients: rows });
});

app.post('/api/generate-recipe', (req, res) => {
  const { selectedIngredients } = req.body as { selectedIngredients: string[] };

  if (!selectedIngredients || !Array.isArray(selectedIngredients)) {
    res.status(400).json({ error: 'selectedIngredients must be an array' });
    return;
  }

  const selectedSet = new Set(selectedIngredients);

  const scoredRecipes = recipePatterns.map((pattern) => {
    const matchCount = pattern.matchIngredients.filter((ing) => selectedSet.has(ing)).length;
    let score = Math.round((matchCount / pattern.matchIngredients.length) * 100);

    const requiredNames = pattern.requiredIngredients.map((ri) => ri.name);
    const bonusCount = requiredNames.filter(
      (name) => selectedSet.has(name) && !pattern.matchIngredients.includes(name)
    ).length;
    score += bonusCount * 5;
    score = Math.min(score, 100);

    return { pattern, score };
  });

  scoredRecipes.sort((a, b) => b.score - a.score);

  const topRecipes = scoredRecipes.slice(0, 3);

  while (topRecipes.length < 3) {
    const usedNames = new Set(topRecipes.map((r) => r.pattern.name));
    const remaining = recipePatterns.filter((p) => !usedNames.has(p.name));
    if (remaining.length === 0) break;
    const randomPattern = remaining[Math.floor(Math.random() * remaining.length)];
    const randomScore = Math.floor(Math.random() * 21) + 40;
    topRecipes.push({ pattern: randomPattern, score: randomScore });
  }

  const recipes: Recipe[] = topRecipes.map(({ pattern, score }) => {
    const id = uuidv4();
    const matchedIngredients = pattern.matchIngredients.filter((ing) => selectedSet.has(ing));
    const ingredientsStr = matchedIngredients.length > 0 ? matchedIngredients.join(',') : pattern.matchIngredients.slice(0, 3).join(',');

    const recipe: Recipe = {
      id,
      name: pattern.name,
      matchScore: score,
      description: pattern.description,
      requiredIngredients: JSON.stringify(pattern.requiredIngredients),
      steps: JSON.stringify(pattern.steps),
      ingredients: ingredientsStr,
    };

    db.prepare(
      'INSERT INTO recipes (id, name, match_score, description, ingredients, steps, required_ingredients) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      recipe.id,
      recipe.name,
      recipe.matchScore,
      recipe.description,
      recipe.ingredients,
      recipe.steps,
      recipe.requiredIngredients
    );

    return recipe;
  });

  res.json({ recipes });
});

app.post('/api/logs', (req, res) => {
  const { recipeId, recipeName, matchScore, notes, rating } = req.body as {
    recipeId: string;
    recipeName: string;
    matchScore: number;
    notes?: string;
    rating: number;
  };

  if (!recipeId || !recipeName || rating === undefined) {
    res.status(400).json({ error: 'recipeId, recipeName and rating are required' });
    return;
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const insertStmt = db.prepare(
    'INSERT INTO cooking_logs (id, recipe_id, recipe_name, match_score, notes, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertStmt.run(
    id,
    recipeId,
    recipeName,
    matchScore ?? 0,
    notes ?? null,
    rating,
    createdAt
  );

  const log: CookingLog = {
    id,
    recipe_id: recipeId,
    recipe_name: recipeName,
    match_score: matchScore ?? 0,
    notes: notes ?? null,
    rating,
    created_at: createdAt,
  };

  res.json({ success: true, log });
});

app.get('/api/logs', (_req, res) => {
  const logs = db.prepare(
    'SELECT id, recipe_id, recipe_name, match_score, notes, rating, created_at FROM cooking_logs ORDER BY created_at DESC'
  ).all() as CookingLog[];
  res.json({ logs });
});

app.listen(PORT, () => {
  console.log(`Recipe Lab server running on http://localhost:${PORT}`);
});