export interface Ingredient {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  shape: 'circle' | 'square' | 'triangle' | 'ellipse';
}

export interface RecipeStep {
  from: string;
  to: string;
  action: string;
}

export interface Recipe {
  name: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

const ICON_SPACING = 64;
const ICON_SIZE = 16;
const CANVAS_HEIGHT = 320;
const PADDING_TOP = 80;

const PALETTE = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
  '#FF9F43', '#6C5CE7', '#00B894', '#E17055',
  '#FDCB6E', '#636E72', '#74B9FF', '#55EFC4'
];

const RECIPES: Recipe[] = [
  {
    name: '番茄炒蛋',
    ingredients: [
      { id: 'egg', name: '鸡蛋', color: '#FFE66D', x: 0, y: 0, shape: 'circle' },
      { id: 'tomato', name: '番茄', color: '#FF6B6B', x: 0, y: 0, shape: 'circle' },
      { id: 'oil', name: '食用油', color: '#FDCB6E', x: 0, y: 0, shape: 'ellipse' },
      { id: 'salt', name: '盐', color: '#636E72', x: 0, y: 0, shape: 'square' },
      { id: 'sugar', name: '糖', color: '#FFFFFF', x: 0, y: 0, shape: 'square' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'egg', to: 'oil', action: '打蛋' },
      { from: 'tomato', to: 'oil', action: '切番茄' },
      { from: 'oil', to: 'salt', action: '炒蛋' },
      { from: 'salt', to: 'sugar', action: '加番茄' },
      { from: 'sugar', to: 'dish', action: '调味出锅' }
    ]
  },
  {
    name: '宫保鸡丁',
    ingredients: [
      { id: 'chicken', name: '鸡胸肉', color: '#F38181', x: 0, y: 0, shape: 'square' },
      { id: 'peanut', name: '花生', color: '#E17055', x: 0, y: 0, shape: 'circle' },
      { id: 'pepper', name: '干辣椒', color: '#FF6B6B', x: 0, y: 0, shape: 'triangle' },
      { id: 'scallion', name: '葱段', color: '#00B894', x: 0, y: 0, shape: 'ellipse' },
      { id: 'ginger', name: '姜末', color: '#FDCB6E', x: 0, y: 0, shape: 'square' },
      { id: 'garlic', name: '蒜末', color: '#FFFFFF', x: 0, y: 0, shape: 'circle' },
      { id: 'sauce', name: '调味汁', color: '#AA96DA', x: 0, y: 0, shape: 'ellipse' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'chicken', to: 'pepper', action: '切丁腌制' },
      { from: 'pepper', to: 'scallion', action: '爆香辣椒' },
      { from: 'peanut', to: 'ginger', action: '炸花生' },
      { from: 'scallion', to: 'garlic', action: '炒鸡丁' },
      { from: 'ginger', to: 'sauce', action: '加姜蒜' },
      { from: 'garlic', to: 'sauce', action: '翻炒' },
      { from: 'sauce', to: 'dish', action: '勾芡出锅' }
    ]
  },
  {
    name: '麻婆豆腐',
    ingredients: [
      { id: 'tofu', name: '豆腐', color: '#FFFFFF', x: 0, y: 0, shape: 'square' },
      { id: 'meat', name: '猪肉末', color: '#F38181', x: 0, y: 0, shape: 'circle' },
      { id: 'douban', name: '豆瓣酱', color: '#FF6B6B', x: 0, y: 0, shape: 'ellipse' },
      { id: 'pepper', name: '花椒粉', color: '#636E72', x: 0, y: 0, shape: 'circle' },
      { id: 'scallion', name: '葱花', color: '#00B894', x: 0, y: 0, shape: 'circle' },
      { id: 'sauce', name: '调味汁', color: '#E17055', x: 0, y: 0, shape: 'ellipse' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'tofu', to: 'meat', action: '切块焯水' },
      { from: 'meat', to: 'douban', action: '炒肉末' },
      { from: 'douban', to: 'sauce', action: '炒豆瓣酱' },
      { from: 'sauce', to: 'pepper', action: '煮豆腐' },
      { from: 'pepper', to: 'scallion', action: '加花椒' },
      { from: 'scallion', to: 'dish', action: '撒葱花出锅' }
    ]
  },
  {
    name: '红烧肉',
    ingredients: [
      { id: 'pork', name: '五花肉', color: '#F38181', x: 0, y: 0, shape: 'square' },
      { id: 'sugar', name: '冰糖', color: '#FFFFFF', x: 0, y: 0, shape: 'circle' },
      { id: 'soy', name: '酱油', color: '#636E72', x: 0, y: 0, shape: 'ellipse' },
      { id: 'wine', name: '料酒', color: '#AA96DA', x: 0, y: 0, shape: 'ellipse' },
      { id: 'ginger', name: '姜片', color: '#FDCB6E', x: 0, y: 0, shape: 'square' },
      { id: 'star', name: '八角', color: '#E17055', x: 0, y: 0, shape: 'triangle' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'pork', to: 'sugar', action: '切块焯水' },
      { from: 'sugar', to: 'soy', action: '炒糖色' },
      { from: 'soy', to: 'wine', action: '加酱油' },
      { from: 'wine', to: 'ginger', action: '加料酒' },
      { from: 'ginger', to: 'star', action: '加香料' },
      { from: 'star', to: 'dish', action: '慢炖收汁' }
    ]
  },
  {
    name: '清炒时蔬',
    ingredients: [
      { id: 'greens', name: '青菜', color: '#00B894', x: 0, y: 0, shape: 'ellipse' },
      { id: 'garlic', name: '蒜片', color: '#FFFFFF', x: 0, y: 0, shape: 'circle' },
      { id: 'oil', name: '食用油', color: '#FDCB6E', x: 0, y: 0, shape: 'ellipse' },
      { id: 'salt', name: '盐', color: '#636E72', x: 0, y: 0, shape: 'square' },
      { id: 'dish', name: '成品', color: '#55EFC4', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'greens', to: 'oil', action: '洗净沥干' },
      { from: 'garlic', to: 'oil', action: '切蒜片' },
      { from: 'oil', to: 'salt', action: '爆香蒜片' },
      { from: 'salt', to: 'dish', action: '快炒调味' }
    ]
  },
  {
    name: '酸辣土豆丝',
    ingredients: [
      { id: 'potato', name: '土豆', color: '#FDCB6E', x: 0, y: 0, shape: 'circle' },
      { id: 'vinegar', name: '醋', color: '#AA96DA', x: 0, y: 0, shape: 'ellipse' },
      { id: 'chili', name: '辣椒', color: '#FF6B6B', x: 0, y: 0, shape: 'triangle' },
      { id: 'garlic', name: '蒜末', color: '#FFFFFF', x: 0, y: 0, shape: 'circle' },
      { id: 'oil', name: '食用油', color: '#E17055', x: 0, y: 0, shape: 'ellipse' },
      { id: 'salt', name: '盐', color: '#636E72', x: 0, y: 0, shape: 'square' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'potato', to: 'vinegar', action: '切丝泡水' },
      { from: 'vinegar', to: 'chili', action: '醋浸泡' },
      { from: 'chili', to: 'garlic', action: '爆辣椒' },
      { from: 'garlic', to: 'oil', action: '加蒜' },
      { from: 'oil', to: 'salt', action: '炒土豆丝' },
      { from: 'salt', to: 'dish', action: '调味出锅' }
    ]
  },
  {
    name: '鱼香肉丝',
    ingredients: [
      { id: 'pork', name: '猪肉', color: '#F38181', x: 0, y: 0, shape: 'square' },
      { id: 'carrot', name: '胡萝卜', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' },
      { id: 'fungus', name: '木耳', color: '#2D3436', x: 0, y: 0, shape: 'circle' },
      { id: 'bamboo', name: '笋丝', color: '#FAEBD7', x: 0, y: 0, shape: 'ellipse' },
      { id: 'sauce', name: '鱼香汁', color: '#E17055', x: 0, y: 0, shape: 'ellipse' },
      { id: 'oil', name: '食用油', color: '#FDCB6E', x: 0, y: 0, shape: 'ellipse' },
      { id: 'garlic', name: '蒜末', color: '#FFFFFF', x: 0, y: 0, shape: 'circle' },
      { id: 'dish', name: '成品', color: '#FF6B6B', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'pork', to: 'oil', action: '切丝腌制' },
      { from: 'carrot', to: 'fungus', action: '切胡萝卜丝' },
      { from: 'fungus', to: 'bamboo', action: '泡发切丝' },
      { from: 'oil', to: 'garlic', action: '炒肉丝' },
      { from: 'bamboo', to: 'sauce', action: '备料' },
      { from: 'garlic', to: 'sauce', action: '炒配料' },
      { from: 'sauce', to: 'dish', action: '调鱼香汁出锅' }
    ]
  },
  {
    name: '可乐鸡翅',
    ingredients: [
      { id: 'wing', name: '鸡翅', color: '#F38181', x: 0, y: 0, shape: 'ellipse' },
      { id: 'cola', name: '可乐', color: '#2D3436', x: 0, y: 0, shape: 'ellipse' },
      { id: 'soy', name: '酱油', color: '#636E72', x: 0, y: 0, shape: 'ellipse' },
      { id: 'ginger', name: '姜片', color: '#FDCB6E', x: 0, y: 0, shape: 'square' },
      { id: 'scallion', name: '葱段', color: '#00B894', x: 0, y: 0, shape: 'ellipse' },
      { id: 'wine', name: '料酒', color: '#AA96DA', x: 0, y: 0, shape: 'ellipse' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'wing', to: 'wine', action: '改刀焯水' },
      { from: 'wine', to: 'ginger', action: '加料酒' },
      { from: 'ginger', to: 'soy', action: '煎鸡翅' },
      { from: 'soy', to: 'cola', action: '加酱油' },
      { from: 'cola', to: 'scallion', action: '倒可乐' },
      { from: 'scallion', to: 'dish', action: '收汁撒葱' }
    ]
  },
  {
    name: '蒜蓉西兰花',
    ingredients: [
      { id: 'broccoli', name: '西兰花', color: '#00B894', x: 0, y: 0, shape: 'ellipse' },
      { id: 'garlic', name: '蒜蓉', color: '#FFFFFF', x: 0, y: 0, shape: 'circle' },
      { id: 'oil', name: '食用油', color: '#FDCB6E', x: 0, y: 0, shape: 'ellipse' },
      { id: 'salt', name: '盐', color: '#636E72', x: 0, y: 0, shape: 'square' },
      { id: 'dish', name: '成品', color: '#55EFC4', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'broccoli', to: 'oil', action: '切朵焯水' },
      { from: 'garlic', to: 'oil', action: '剁蒜蓉' },
      { from: 'oil', to: 'salt', action: '爆蒜蓉' },
      { from: 'salt', to: 'dish', action: '翻炒出锅' }
    ]
  },
  {
    name: '蛋炒饭',
    ingredients: [
      { id: 'rice', name: '米饭', color: '#FAEBD7', x: 0, y: 0, shape: 'square' },
      { id: 'egg', name: '鸡蛋', color: '#FFE66D', x: 0, y: 0, shape: 'circle' },
      { id: 'oil', name: '食用油', color: '#FDCB6E', x: 0, y: 0, shape: 'ellipse' },
      { id: 'scallion', name: '葱花', color: '#00B894', x: 0, y: 0, shape: 'circle' },
      { id: 'salt', name: '盐', color: '#636E72', x: 0, y: 0, shape: 'square' },
      { id: 'dish', name: '成品', color: '#FF9F43', x: 0, y: 0, shape: 'ellipse' }
    ],
    steps: [
      { from: 'egg', to: 'oil', action: '打散' },
      { from: 'oil', to: 'rice', action: '炒蛋' },
      { from: 'rice', to: 'salt', action: '加米饭' },
      { from: 'salt', to: 'scallion', action: '调味' },
      { from: 'scallion', to: 'dish', action: '撒葱出锅' }
    ]
  }
];

export function getPalette(): string[] {
  return [...PALETTE];
}

export function getAllRecipes(): Recipe[] {
  return RECIPES.map(r => ({ ...r, ingredients: r.ingredients.map(i => ({ ...i })) }));
}

export function getRecipeByName(name: string): Recipe | null {
  const normalized = name.trim().toLowerCase();
  const recipe = RECIPES.find(r => 
    r.name.toLowerCase().includes(normalized) || 
    normalized.includes(r.name.toLowerCase())
  );
  if (!recipe) return null;
  return {
    ...recipe,
    ingredients: recipe.ingredients.map(i => ({ ...i }))
  };
}

export function calculateLayout(recipe: Recipe, viewportWidth: number): Recipe {
  const count = recipe.ingredients.length;
  const totalWidth = count * ICON_SIZE + (count - 1) * ICON_SPACING;
  const canvasWidth = Math.max(viewportWidth, totalWidth + 100);
  const startX = (canvasWidth - totalWidth) / 2;
  const centerY = PADDING_TOP + (CANVAS_HEIGHT - PADDING_TOP * 2) / 2;

  const orderedIngredients: Ingredient[] = [];
  const processedIds = new Set<string>();
  
  const stepMap = new Map<string, string[]>();
  for (const step of recipe.steps) {
    if (!stepMap.has(step.from)) {
      stepMap.set(step.from, []);
    }
    stepMap.get(step.from)!.push(step.to);
  }

  const startIds = recipe.ingredients
    .filter(i => !recipe.steps.some(s => s.to === i.id))
    .map(i => i.id);

  const queue = [...startIds];
  let xPos = startX;
  const rowHeight = 100;
  let currentRow = 0;
  const rowCounts = new Map<number, number>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (processedIds.has(id)) continue;
    processedIds.add(id);

    const ingredient = recipe.ingredients.find(i => i.id === id);
    if (!ingredient) continue;

    const rowCount = rowCounts.get(currentRow) || 0;
    const yOffset = (currentRow % 2 === 0 ? -1 : 1) * Math.floor(currentRow / 2) * rowHeight;
    const y = centerY + yOffset;

    orderedIngredients.push({
      ...ingredient,
      x: xPos,
      y: y
    });

    rowCounts.set(currentRow, rowCount + 1);
    
    const nextIds = stepMap.get(id) || [];
    for (const nextId of nextIds) {
      if (!processedIds.has(nextId) && !queue.includes(nextId)) {
        queue.push(nextId);
      }
    }

    xPos += ICON_SIZE + ICON_SPACING;
    
    if (xPos > canvasWidth - ICON_SIZE - 50) {
      currentRow++;
      xPos = startX + (ICON_SIZE + ICON_SPACING) / 2;
    }
  }

  for (const ing of recipe.ingredients) {
    if (!processedIds.has(ing.id)) {
      orderedIngredients.push({
        ...ing,
        x: xPos,
        y: centerY
      });
      xPos += ICON_SIZE + ICON_SPACING;
    }
  }

  return {
    ...recipe,
    ingredients: orderedIngredients
  };
}

export function getCanvasDimensions(recipe: Recipe, viewportWidth: number): { width: number; height: number } {
  const count = recipe.ingredients.length;
  const totalWidth = count * ICON_SIZE + (count - 1) * ICON_SPACING;
  return {
    width: Math.max(viewportWidth, totalWidth + 100),
    height: CANVAS_HEIGHT
  };
}

export const CONSTANTS = {
  ICON_SIZE,
  ICON_SPACING,
  CANVAS_HEIGHT,
  PADDING_TOP
};
