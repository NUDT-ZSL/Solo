import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'data.json');

interface DataStore {
  members: any[];
  inventory: any[];
  recipes: any[];
}

const ingredientPrices: Record<string, number> = {
  '西红柿': 8, '黄瓜': 5, '胡萝卜': 4, '土豆': 3, '西兰花': 12,
  '菠菜': 6, '白菜': 3, '青椒': 7, '洋葱': 3, '蘑菇': 15,
  '鸡蛋': 12, '鸡胸肉': 25, '猪肉': 35, '牛肉': 60, '虾仁': 45,
  '三文鱼': 80, '牛奶': 15, '酸奶': 10, '奶酪': 30,
  '米饭': 6, '面条': 8, '面包': 12, '燕麦': 20,
  '酱油': 10, '盐': 2, '糖': 5, '油': 15, '醋': 8, '大蒜': 6, '姜': 5,
  '苹果': 12, '香蕉': 8, '坚果': 40, '巧克力': 30, '柠檬': 6, '花生': 25
};

const builtinRecipes = [
  {
    id: uuidv4(), name: '番茄炒蛋', category: 'breakfast',
    ingredients: [
      { name: '西红柿', quantity: 200, unit: '克', category: 'vegetable' },
      { name: '鸡蛋', quantity: 3, unit: '个', category: 'meat' }
    ],
    cookTime: 15, calories: 280,
    steps: ['西红柿切块', '鸡蛋打散', '热锅下油炒鸡蛋盛出', '炒西红柿加少许糖', '加入鸡蛋翻炒均匀']
  },
  {
    id: uuidv4(), name: '燕麦牛奶粥', category: 'breakfast',
    ingredients: [
      { name: '燕麦', quantity: 50, unit: '克', category: 'grain' },
      { name: '牛奶', quantity: 250, unit: '毫升', category: 'dairy' }
    ],
    cookTime: 10, calories: 220,
    steps: ['燕麦加水煮开', '转小火煮5分钟', '加入牛奶搅拌', '根据口味加糖']
  },
  {
    id: uuidv4(), name: '三明治', category: 'breakfast',
    ingredients: [
      { name: '面包', quantity: 4, unit: '片', category: 'grain' },
      { name: '鸡蛋', quantity: 2, unit: '个', category: 'meat' }
    ],
    cookTime: 12, calories: 350,
    steps: ['煎荷包蛋', '面包烤香', '依次叠放面包、蛋', '对角切开即可']
  },
  {
    id: uuidv4(), name: '宫保鸡丁', category: 'lunch',
    ingredients: [
      { name: '鸡胸肉', quantity: 300, unit: '克', category: 'meat' },
      { name: '青椒', quantity: 100, unit: '克', category: 'vegetable' },
      { name: '花生', quantity: 50, unit: '克', category: 'other' }
    ],
    cookTime: 25, calories: 450,
    steps: ['鸡肉切丁腌制', '调酱汁', '爆香姜蒜', '炒鸡丁至变色', '加青椒和酱汁翻炒', '最后加花生']
  },
  {
    id: uuidv4(), name: '红烧牛肉', category: 'dinner',
    ingredients: [
      { name: '牛肉', quantity: 400, unit: '克', category: 'meat' },
      { name: '土豆', quantity: 200, unit: '克', category: 'vegetable' },
      { name: '胡萝卜', quantity: 100, unit: '克', category: 'vegetable' }
    ],
    cookTime: 90, calories: 520,
    steps: ['牛肉切块焯水', '爆香调料', '加牛肉翻炒上色', '加水炖40分钟', '加土豆胡萝卜继续炖20分钟', '收汁']
  },
  {
    id: uuidv4(), name: '清蒸三文鱼', category: 'dinner',
    ingredients: [
      { name: '三文鱼', quantity: 200, unit: '克', category: 'meat' },
      { name: '柠檬', quantity: 1, unit: '个', category: 'other' }
    ],
    cookTime: 15, calories: 380,
    steps: ['三文鱼洗净擦干', '抹盐和黑胡椒', '水开后蒸8分钟', '淋柠檬汁和少许橄榄油']
  },
  {
    id: uuidv4(), name: '蒜蓉西兰花', category: 'lunch',
    ingredients: [
      { name: '西兰花', quantity: 300, unit: '克', category: 'vegetable' },
      { name: '大蒜', quantity: 3, unit: '瓣', category: 'seasoning' }
    ],
    cookTime: 10, calories: 120,
    steps: ['西兰花切小朵焯水', '爆香蒜末', '下西兰花翻炒', '加盐调味即可']
  },
  {
    id: uuidv4(), name: '番茄牛肉盖饭', category: 'lunch',
    ingredients: [
      { name: '牛肉', quantity: 150, unit: '克', category: 'meat' },
      { name: '西红柿', quantity: 200, unit: '克', category: 'vegetable' },
      { name: '米饭', quantity: 200, unit: '克', category: 'grain' }
    ],
    cookTime: 30, calories: 580,
    steps: ['牛肉切片腌制', '番茄切块', '炒牛肉盛出', '炒番茄出汁', '加入牛肉', '淋在米饭上']
  },
  {
    id: uuidv4(), name: '水果沙拉', category: 'snack',
    ingredients: [
      { name: '苹果', quantity: 1, unit: '个', category: 'other' },
      { name: '香蕉', quantity: 1, unit: '根', category: 'other' },
      { name: '酸奶', quantity: 100, unit: '克', category: 'dairy' }
    ],
    cookTime: 5, calories: 180,
    steps: ['苹果香蕉切块', '淋上酸奶', '拌匀即可']
  },
  {
    id: uuidv4(), name: '坚果拼盘', category: 'snack',
    ingredients: [
      { name: '坚果', quantity: 30, unit: '克', category: 'other' }
    ],
    cookTime: 2, calories: 200,
    steps: ['取适量坚果', '装盘即可享用']
  },
  {
    id: uuidv4(), name: '酱牛肉', category: 'dinner',
    ingredients: [
      { name: '牛肉', quantity: 500, unit: '克', category: 'meat' },
      { name: '酱油', quantity: 50, unit: '毫升', category: 'seasoning' }
    ],
    cookTime: 120, calories: 480,
    steps: ['牛肉焯水', '加调料和水', '大火烧开转小火炖2小时', '浸泡过夜切片']
  },
  {
    id: uuidv4(), name: '蛋炒饭', category: 'lunch',
    ingredients: [
      { name: '米饭', quantity: 300, unit: '克', category: 'grain' },
      { name: '鸡蛋', quantity: 2, unit: '个', category: 'meat' },
      { name: '胡萝卜', quantity: 50, unit: '克', category: 'vegetable' }
    ],
    cookTime: 15, calories: 520,
    steps: ['鸡蛋打散炒散', '加胡萝卜丁', '加米饭翻炒', '加盐调味']
  },
  {
    id: uuidv4(), name: '牛奶燕麦', category: 'breakfast',
    ingredients: [
      { name: '牛奶', quantity: 300, unit: '毫升', category: 'dairy' },
      { name: '燕麦', quantity: 40, unit: '克', category: 'grain' }
    ],
    cookTime: 8, calories: 240,
    steps: ['牛奶加热', '加入燕麦搅拌', '煮3分钟即可']
  },
  {
    id: uuidv4(), name: '清炒时蔬', category: 'dinner',
    ingredients: [
      { name: '白菜', quantity: 300, unit: '克', category: 'vegetable' },
      { name: '蘑菇', quantity: 100, unit: '克', category: 'vegetable' }
    ],
    cookTime: 12, calories: 95,
    steps: ['白菜撕片蘑菇切片', '热锅下油', '炒至变软', '加盐调味']
  },
  {
    id: uuidv4(), name: '虾仁滑蛋', category: 'lunch',
    ingredients: [
      { name: '虾仁', quantity: 150, unit: '克', category: 'meat' },
      { name: '鸡蛋', quantity: 3, unit: '个', category: 'meat' }
    ],
    cookTime: 15, calories: 320,
    steps: ['虾仁腌制', '鸡蛋打散', '滑炒虾仁', '淋蛋液快速翻炒']
  },
  {
    id: uuidv4(), name: '酸奶杯', category: 'snack',
    ingredients: [
      { name: '酸奶', quantity: 200, unit: '克', category: 'dairy' },
      { name: '坚果', quantity: 20, unit: '克', category: 'other' }
    ],
    cookTime: 3, calories: 220,
    steps: ['酸奶倒入杯中', '撒上坚果', '即可享用']
  }
];

function loadData(): DataStore {
  if (fs.existsSync(dataPath)) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      const data = JSON.parse(raw);
      if (!data.recipes || data.recipes.length === 0) {
        data.recipes = builtinRecipes;
        saveData(data);
      }
      return data;
    } catch {
      return { members: [], inventory: [], recipes: builtinRecipes };
    }
  }
  const initialData: DataStore = { members: [], inventory: [], recipes: builtinRecipes };
  saveData(initialData);
  return initialData;
}

function saveData(data: DataStore): void {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

let dataStore = loadData();

interface MemberBody {
  name: string;
  age: number;
  preferences: string[];
  allergens: string[];
}

interface InventoryBody {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
}

function getRandomColor(): string {
  const colors = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#be185d'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getAllRecipes(): any[] {
  return dataStore.recipes;
}

function checkAllergens(recipe: any, allergens: string[]): boolean {
  return recipe.ingredients.some((ing: any) =>
    allergens.some(a => ing.name.includes(a))
  );
}

function checkPreferences(recipe: any, preferences: string[]): string[] {
  const warnings: string[] = [];
  const recipeIngredients = recipe.ingredients.map((i: any) => i.name).join(' ');
  
  preferences.forEach(pref => {
    if (pref.includes('不吃') || pref.includes('低碳水')) {
      if (pref.includes('海鲜') && recipeIngredients.includes('虾')) {
        warnings.push(`含海鲜，与"${pref}"冲突`);
      }
      if (pref.includes('低碳水') && recipe.ingredients.some((i: any) => i.category === 'grain')) {
        warnings.push(`含主食，与"${pref}"冲突`);
      }
      if (pref.includes('辣') && !recipeIngredients.includes('辣') && !recipe.name.includes('辣')) {
        warnings.push(`菜品不辣，不符合"${pref}"`);
      }
    }
  });
  
  return warnings;
}

app.post('/api/members', (req: Request<{}, {}, MemberBody>, res: Response) => {
  try {
    const { name, age, preferences, allergens } = req.body;
    const id = uuidv4();
    const avatarColor = getRandomColor();
    const member = { id, name, age, preferences, allergens, avatarColor };
    dataStore.members.push(member);
    saveData(dataStore);
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/members', (_req: Request, res: Response) => {
  try {
    res.json(dataStore.members);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/members/:id', (req: Request, res: Response) => {
  try {
    dataStore.members = dataStore.members.filter(m => m.id !== req.params.id);
    saveData(dataStore);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/inventory', (req: Request<{}, {}, InventoryBody>, res: Response) => {
  try {
    const { name, quantity, unit, expiryDate } = req.body;
    const id = uuidv4();
    const item = { id, name, quantity, unit, expiryDate };
    dataStore.inventory.push(item);
    dataStore.inventory.sort((a, b) =>
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
    saveData(dataStore);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/inventory', (_req: Request, res: Response) => {
  try {
    const sorted = [...dataStore.inventory].sort((a, b) =>
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/inventory/:id', (req: Request, res: Response) => {
  try {
    dataStore.inventory = dataStore.inventory.filter(i => i.id !== req.params.id);
    saveData(dataStore);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/generate-meal-plan', (req: Request, res: Response) => {
  const { members, inventory } = req.body;
  
  try {
    const allRecipes = getAllRecipes();
    const mealPlan: any[] = [];
    const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const allAllergens = [...new Set(members.flatMap((m: any) => m.allergens))];
    
    for (let day = 0; day < 7; day++) {
      for (const mealType of mealTypes) {
        const suitableRecipes = allRecipes.filter(r => {
          if (r.category !== mealType) return false;
          return !checkAllergens(r, allAllergens);
        });
        
        const usedRecipes = mealPlan
          .filter(m => m.recipe)
          .map(m => m.recipe.id);
        
        const availableRecipes = suitableRecipes.filter(r => !usedRecipes.includes(r.id));
        const recipePool = availableRecipes.length > 0 ? availableRecipes : suitableRecipes;
        
        let selectedRecipe = null;
        let alternatives: any[] = [];
        let warnings: string[] = [];
        
        if (recipePool.length > 0) {
          const shuffled = [...recipePool].sort(() => Math.random() - 0.5);
          selectedRecipe = shuffled[0];
          alternatives = shuffled.slice(1, 4);
          
          members.forEach((member: any) => {
            const memberWarnings = checkPreferences(selectedRecipe, member.preferences);
            memberWarnings.forEach(w => warnings.push(`${member.name}: ${w}`));
          });
        }
        
        mealPlan.push({
          id: uuidv4(),
          day,
          mealType,
          recipe: selectedRecipe,
          alternatives,
          warnings
        });
      }
    }
    
    setTimeout(() => res.json(mealPlan), 500);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/generate-shopping-list', (req: Request, res: Response) => {
  const { mealPlan, inventory } = req.body;
  
  const requiredIngredients: Record<string, { quantity: number; unit: string; category: string }> = {};
  
  mealPlan.forEach((slot: any) => {
    if (slot.recipe) {
      slot.recipe.ingredients.forEach((ing: any) => {
        const key = ing.name;
        if (!requiredIngredients[key]) {
          requiredIngredients[key] = { quantity: 0, unit: ing.unit, category: ing.category };
        }
        requiredIngredients[key].quantity += ing.quantity;
      });
    }
  });
  
  inventory.forEach((item: any) => {
    if (requiredIngredients[item.name]) {
      requiredIngredients[item.name].quantity -= item.quantity;
      if (requiredIngredients[item.name].quantity <= 0) {
        delete requiredIngredients[item.name];
      }
    }
  });
  
  const categories: Record<string, any[]> = {
    '蔬菜': [], '肉蛋': [], '主食': [], '乳品': [], '调味料': [], '其他': []
  };
  
  const categoryMap: Record<string, string> = {
    vegetable: '蔬菜', meat: '肉蛋', grain: '主食', dairy: '乳品', seasoning: '调味料', other: '其他'
  };
  
  let total = 0;
  let saved = 0;
  
  Object.entries(requiredIngredients).forEach(([name, data]) => {
    const category = categoryMap[data.category] || '其他';
    const pricePerUnit = ingredientPrices[name] || 10;
    const estimatedPrice = Math.ceil(data.quantity / 100 * pricePerUnit * 100) / 100;
    
    categories[category].push({
      id: uuidv4(),
      name,
      quantity: Math.ceil(data.quantity * 10) / 10,
      unit: data.unit,
      category,
      estimatedPrice,
      purchased: false
    });
    
    total += estimatedPrice;
  });
  
  inventory.forEach((item: any) => {
    const pricePerUnit = ingredientPrices[item.name] || 10;
    saved += Math.ceil(item.quantity / 100 * pricePerUnit * 100) / 100;
  });
  
  const result = Object.entries(categories)
    .filter(([_, items]) => items.length > 0)
    .map(([name, items]) => ({ name, items, collapsed: false }));
  
  res.json({ categories: result, total: Math.ceil(total * 100) / 100, saved: Math.ceil(saved * 100) / 100 });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
