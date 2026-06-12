import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Ingredient {
  name: string;
  emoji: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  category: string;
}

export interface UserPreference {
  favoriteRecipes: Array<{ recipeId: string; addedAt: string }>;
  ratings: Record<string, number>;
  searchHistory: string[][];
}

export interface Database {
  recipes: Recipe[];
  ingredients: Ingredient[];
  preferences: UserPreference;
}

const defaultData: Database = {
  ingredients: [
    { name: '鸡蛋', emoji: '🥚' },
    { name: '番茄', emoji: '🍅' },
    { name: '土豆', emoji: '🥔' },
    { name: '鸡肉', emoji: '🍗' },
    { name: '牛肉', emoji: '🥩' },
    { name: '猪肉', emoji: '🥓' },
    { name: '鱼', emoji: '🐟' },
    { name: '虾', emoji: '🦐' },
    { name: '豆腐', emoji: '🧈' },
    { name: '白菜', emoji: '🥬' },
    { name: '黄瓜', emoji: '🥒' },
    { name: '胡萝卜', emoji: '🥕' },
    { name: '洋葱', emoji: '🧅' },
    { name: '大蒜', emoji: '🧄' },
    { name: '辣椒', emoji: '🌶️' },
    { name: '青椒', emoji: '🫑' },
    { name: '米饭', emoji: '🍚' },
    { name: '面条', emoji: '🍜' },
    { name: '面粉', emoji: '🌾' },
    { name: '牛奶', emoji: '🥛' },
    { name: '奶酪', emoji: '🧀' },
    { name: '黄油', emoji: '🧈' },
    { name: '蘑菇', emoji: '🍄' },
    { name: '西兰花', emoji: '🥦' },
    { name: '玉米', emoji: '🌽' },
    { name: '酱油', emoji: '🍶' },
    { name: '醋', emoji: '🧴' },
    { name: '糖', emoji: '🍬' },
    { name: '盐', emoji: '🧂' },
    { name: '葱姜', emoji: '🌿' }
  ],
  recipes: [
    {
      id: 'r1',
      name: '番茄炒蛋',
      category: '家常菜',
      ingredients: [
        { name: '番茄', amount: '2个' },
        { name: '鸡蛋', amount: '3个' },
        { name: '葱姜', amount: '适量' },
        { name: '盐', amount: '适量' },
        { name: '糖', amount: '少许' }
      ],
      steps: [
        '番茄切块，鸡蛋打散备用',
        '热锅倒油，倒入蛋液炒至凝固盛出',
        '锅中留油，爆香葱姜',
        '加入番茄翻炒出汁',
        '加入炒好的鸡蛋，加盐和糖调味',
        '翻炒均匀即可出锅'
      ]
    },
    {
      id: 'r2',
      name: '青椒肉丝',
      category: '家常菜',
      ingredients: [
        { name: '猪肉', amount: '200g' },
        { name: '青椒', amount: '3个' },
        { name: '大蒜', amount: '3瓣' },
        { name: '酱油', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '猪肉切丝，加少许酱油腌制10分钟',
        '青椒切丝，大蒜切末',
        '热锅倒油，爆香蒜末',
        '加入肉丝翻炒至变色',
        '加入青椒丝继续翻炒',
        '加酱油和盐调味，炒匀即可'
      ]
    },
    {
      id: 'r3',
      name: '土豆炖牛肉',
      category: '炖菜',
      ingredients: [
        { name: '牛肉', amount: '500g' },
        { name: '土豆', amount: '2个' },
        { name: '胡萝卜', amount: '1根' },
        { name: '洋葱', amount: '半个' },
        { name: '葱姜', amount: '适量' },
        { name: '酱油', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '牛肉切块焯水去血沫',
        '土豆、胡萝卜切块，洋葱切丝',
        '热锅倒油，爆香葱姜',
        '加入牛肉翻炒，加酱油上色',
        '加开水没过牛肉，小火炖40分钟',
        '加入土豆、胡萝卜、洋葱继续炖20分钟',
        '加盐调味，大火收汁即可'
      ]
    },
    {
      id: 'r4',
      name: '宫保鸡丁',
      category: '川菜',
      ingredients: [
        { name: '鸡肉', amount: '300g' },
        { name: '花生', amount: '50g' },
        { name: '辣椒', amount: '适量' },
        { name: '大蒜', amount: '3瓣' },
        { name: '葱姜', amount: '适量' },
        { name: '酱油', amount: '适量' },
        { name: '醋', amount: '适量' },
        { name: '糖', amount: '适量' }
      ],
      steps: [
        '鸡肉切丁，加酱油腌制15分钟',
        '调汁：酱油、醋、糖、水按比例混合',
        '热锅倒油，爆香辣椒和蒜末',
        '加入鸡丁翻炒至变色',
        '倒入调好的酱汁翻炒均匀',
        '最后加入花生米炒匀出锅'
      ]
    },
    {
      id: 'r5',
      name: '麻婆豆腐',
      category: '川菜',
      ingredients: [
        { name: '豆腐', amount: '1块' },
        { name: '猪肉', amount: '100g' },
        { name: '大蒜', amount: '3瓣' },
        { name: '辣椒', amount: '适量' },
        { name: '葱姜', amount: '适量' },
        { name: '酱油', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '豆腐切块，用盐水浸泡5分钟',
        '猪肉切末，大蒜切末',
        '热锅倒油，爆香蒜末和辣椒',
        '加入肉末翻炒至变色',
        '加入豆腐轻轻翻动',
        '加酱油和少许水，小火煮5分钟',
        '勾芡撒葱花出锅'
      ]
    },
    {
      id: 'r6',
      name: '蒜蓉西兰花',
      category: '素菜',
      ingredients: [
        { name: '西兰花', amount: '1颗' },
        { name: '大蒜', amount: '5瓣' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '西兰花掰成小朵，洗净焯水1分钟',
        '大蒜切末',
        '热锅倒油，爆香蒜末',
        '加入西兰花快速翻炒',
        '加盐调味出锅'
      ]
    },
    {
      id: 'r7',
      name: '红烧鱼',
      category: '海鲜',
      ingredients: [
        { name: '鱼', amount: '1条' },
        { name: '葱姜', amount: '适量' },
        { name: '大蒜', amount: '3瓣' },
        { name: '酱油', amount: '适量' },
        { name: '醋', amount: '少许' },
        { name: '糖', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '鱼处理干净，两面划刀',
        '热锅倒油，将鱼煎至两面金黄',
        '加入葱姜蒜爆香',
        '加酱油、醋、糖、盐和适量水',
        '小火炖15分钟，中间翻面一次',
        '大火收汁即可'
      ]
    },
    {
      id: 'r8',
      name: '白灼虾',
      category: '海鲜',
      ingredients: [
        { name: '虾', amount: '500g' },
        { name: '葱姜', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '虾洗净去虾线',
        '锅中加水，放入姜片和葱段',
        '水开后加盐',
        '放入虾煮3-4分钟至变红',
        '捞出摆盘即可'
      ]
    },
    {
      id: 'r9',
      name: '鸡蛋羹',
      category: '家常菜',
      ingredients: [
        { name: '鸡蛋', amount: '3个' },
        { name: '牛奶', amount: '100ml' },
        { name: '盐', amount: '适量' },
        { name: '葱姜', amount: '适量' },
        { name: '酱油', amount: '少许' }
      ],
      steps: [
        '鸡蛋打散，加入牛奶和盐搅匀',
        '过筛去除浮沫',
        '盖上保鲜膜，扎几个小孔',
        '水开后上锅蒸12分钟',
        '出锅淋少许酱油，撒葱花即可'
      ]
    },
    {
      id: 'r10',
      name: '地三鲜',
      category: '东北菜',
      ingredients: [
        { name: '土豆', amount: '2个' },
        { name: '番茄', amount: '1个' },
        { name: '青椒', amount: '1个' },
        { name: '大蒜', amount: '3瓣' },
        { name: '酱油', amount: '适量' },
        { name: '糖', amount: '少许' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '土豆切块，油炸至金黄捞出',
        '青椒切块过油，番茄切块',
        '热锅留底油，爆香蒜末',
        '加入番茄翻炒出汁',
        '加入土豆和青椒翻炒',
        '加酱油、糖、盐调味出锅'
      ]
    },
    {
      id: 'r11',
      name: '蘑菇炒肉',
      category: '家常菜',
      ingredients: [
        { name: '蘑菇', amount: '300g' },
        { name: '猪肉', amount: '150g' },
        { name: '大蒜', amount: '3瓣' },
        { name: '葱姜', amount: '适量' },
        { name: '酱油', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '蘑菇切片焯水，猪肉切片',
        '热锅倒油，爆香葱姜蒜',
        '加入肉片翻炒至变色',
        '加入蘑菇继续翻炒',
        '加酱油和盐调味出锅'
      ]
    },
    {
      id: 'r12',
      name: '玉米排骨汤',
      category: '汤类',
      ingredients: [
        { name: '猪肉', amount: '300g' },
        { name: '玉米', amount: '2根' },
        { name: '胡萝卜', amount: '1根' },
        { name: '葱姜', amount: '适量' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        '排骨焯水去血沫',
        '玉米切段，胡萝卜切块',
        '锅中加水，放入排骨、玉米、胡萝卜、葱姜',
        '大火烧开后转小火炖1.5小时',
        '加盐调味即可'
      ]
    }
  ],
  preferences: {
    favoriteRecipes: [],
    ratings: {},
    searchHistory: []
  }
};

let db: Low<Database> | null = null;

export async function getDB(): Promise<Low<Database>> {
  if (!db) {
    const file = path.join(__dirname, 'db.json');
    const adapter = new JSONFile<Database>(file);
    db = new Low(adapter, defaultData);
    await db.read();
    if (!db.data) {
      db.data = defaultData;
      await db.write();
    }
  }
  return db;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  return db.data.recipes;
}

export async function getAllIngredients(): Promise<Ingredient[]> {
  const db = await getDB();
  return db.data.ingredients;
}

export async function getPreferences(): Promise<UserPreference> {
  const db = await getDB();
  return db.data.preferences;
}

export async function updatePreferences(
  updater: (prefs: UserPreference) => void
): Promise<UserPreference> {
  const db = await getDB();
  updater(db.data.preferences);
  await db.write();
  return db.data.preferences;
}
