export interface Ingredient {
  name: string;
  quantity: number;
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  image?: string;
}

export const INGREDIENT_LIBRARY: string[] = [
  '鸡蛋', '牛奶', '面粉', '番茄', '洋葱', '鸡胸肉',
  '土豆', '胡萝卜', '青椒', '黄瓜', '生菜', '猪肉',
  '牛肉', '羊肉', '虾', '鱼', '豆腐', '米饭',
  '面条', '酱油', '醋', '盐', '糖', '料酒',
  '葱姜蒜', '辣椒', '大蒜', '生姜', '香菜', '芝麻',
  '花生油', '橄榄油', '黄油', '芝士', '奶油', '酸奶',
  '淀粉', '花椒', '八角', '桂皮', '香叶', '番茄酱',
  '豆瓣酱', '甜面酱', '蚝油', '生抽', '老抽', '鸡精',
  '味精', '胡椒粉', '香油', '葱花', '玉米', '豌豆',
  '香菇', '木耳', '金针菇', '海带', '紫菜', '白菜'
];

export const RECIPES: Recipe[] = [
  {
    id: '1',
    name: '番茄炒蛋',
    description: '经典家常菜，酸甜可口，简单易做',
    ingredients: [
      { name: '番茄', quantity: 2, unit: '个' },
      { name: '鸡蛋', quantity: 3, unit: '个' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '糖', quantity: 1, unit: '勺' },
      { name: '花生油', quantity: 2, unit: '勺' },
      { name: '葱姜蒜', quantity: 1, unit: '份' }
    ],
    steps: [
      '番茄洗净切块，鸡蛋打散备用',
      '热锅凉油，倒入蛋液炒至凝固盛出',
      '锅中再加油，放入葱姜蒜爆香',
      '加入番茄翻炒出汁',
      '加入炒好的鸡蛋，放盐和糖调味',
      '翻炒均匀即可出锅'
    ]
  },
  {
    id: '2',
    name: '青椒炒肉丝',
    description: '香辣开胃，下饭神器',
    ingredients: [
      { name: '猪肉', quantity: 200, unit: '克' },
      { name: '青椒', quantity: 3, unit: '个' },
      { name: '生抽', quantity: 1, unit: '勺' },
      { name: '淀粉', quantity: 1, unit: '勺' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '料酒', quantity: 1, unit: '勺' },
      { name: '花生油', quantity: 2, unit: '勺' }
    ],
    steps: [
      '猪肉切丝，用生抽、料酒、淀粉腌制10分钟',
      '青椒去籽切丝备用',
      '热锅凉油，放入肉丝滑炒至变色盛出',
      '锅中留底油，放入青椒丝翻炒',
      '加入肉丝，放盐调味',
      '翻炒均匀即可出锅'
    ]
  },
  {
    id: '3',
    name: '土豆炖牛肉',
    description: '软烂入味，营养丰富',
    ingredients: [
      { name: '牛肉', quantity: 300, unit: '克' },
      { name: '土豆', quantity: 2, unit: '个' },
      { name: '胡萝卜', quantity: 1, unit: '根' },
      { name: '洋葱', quantity: 1, unit: '个' },
      { name: '生抽', quantity: 2, unit: '勺' },
      { name: '老抽', quantity: 1, unit: '勺' },
      { name: '料酒', quantity: 2, unit: '勺' },
      { name: '八角', quantity: 2, unit: '个' },
      { name: '葱姜蒜', quantity: 1, unit: '份' },
      { name: '盐', quantity: 1, unit: '勺' }
    ],
    steps: [
      '牛肉切块焯水，去除血沫',
      '土豆、胡萝卜切滚刀块，洋葱切块',
      '热锅放油，爆香葱姜蒜和八角',
      '放入牛肉翻炒，加料酒、生抽、老抽',
      '加开水没过牛肉，小火炖40分钟',
      '加入土豆、胡萝卜、洋葱继续炖20分钟',
      '放盐调味，大火收汁即可'
    ]
  },
  {
    id: '4',
    name: '宫保鸡丁',
    description: '川菜经典，麻辣鲜香',
    ingredients: [
      { name: '鸡胸肉', quantity: 250, unit: '克' },
      { name: '花生', quantity: 50, unit: '克' },
      { name: '黄瓜', quantity: 1, unit: '根' },
      { name: '辣椒', quantity: 5, unit: '个' },
      { name: '花椒', quantity: 1, unit: '勺' },
      { name: '生抽', quantity: 2, unit: '勺' },
      { name: '醋', quantity: 1, unit: '勺' },
      { name: '糖', quantity: 1, unit: '勺' },
      { name: '淀粉', quantity: 1, unit: '勺' },
      { name: '料酒', quantity: 1, unit: '勺' },
      { name: '葱姜蒜', quantity: 1, unit: '份' }
    ],
    steps: [
      '鸡胸肉切丁，用料酒、生抽、淀粉腌制10分钟',
      '黄瓜切丁，辣椒切段',
      '调碗汁：生抽、醋、糖、淀粉、水混合',
      '热锅凉油，放花椒爆香后捞出',
      '放入辣椒段、葱姜蒜爆香',
      '加入鸡丁翻炒至变色',
      '加入黄瓜丁翻炒',
      '倒入碗汁，加入花生米',
      '翻炒均匀即可出锅'
    ]
  },
  {
    id: '5',
    name: '麻婆豆腐',
    description: '麻辣鲜香，嫩滑可口',
    ingredients: [
      { name: '豆腐', quantity: 1, unit: '块' },
      { name: '猪肉', quantity: 100, unit: '克' },
      { name: '豆瓣酱', quantity: 2, unit: '勺' },
      { name: '花椒粉', quantity: 1, unit: '勺' },
      { name: '生抽', quantity: 1, unit: '勺' },
      { name: '淀粉', quantity: 1, unit: '勺' },
      { name: '葱花', quantity: 1, unit: '把' },
      { name: '葱姜蒜', quantity: 1, unit: '份' },
      { name: '花生油', quantity: 2, unit: '勺' }
    ],
    steps: [
      '豆腐切块，用盐水浸泡5分钟',
      '猪肉切末备用',
      '热锅放油，爆香葱姜蒜',
      '放入肉末炒散，加豆瓣酱炒出红油',
      '加适量水，放入豆腐块',
      '加生抽，小火煮5分钟',
      '水淀粉勾芡，撒上花椒粉和葱花'
    ]
  },
  {
    id: '6',
    name: '红烧鱼',
    description: '色泽红亮，肉质鲜嫩',
    ingredients: [
      { name: '鱼', quantity: 1, unit: '条' },
      { name: '生抽', quantity: 2, unit: '勺' },
      { name: '老抽', quantity: 1, unit: '勺' },
      { name: '料酒', quantity: 2, unit: '勺' },
      { name: '醋', quantity: 1, unit: '勺' },
      { name: '糖', quantity: 1, unit: '勺' },
      { name: '葱姜蒜', quantity: 1, unit: '份' },
      { name: '辣椒', quantity: 2, unit: '个' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '花生油', quantity: 3, unit: '勺' }
    ],
    steps: [
      '鱼处理干净，两面划刀，用料酒、盐腌制15分钟',
      '热锅放油，将鱼煎至两面金黄',
      '放入葱姜蒜、辣椒爆香',
      '加生抽、老抽、醋、糖和适量水',
      '大火烧开后转小火炖15分钟',
      '大火收汁，撒上葱花即可'
    ]
  },
  {
    id: '7',
    name: '西红柿鸡蛋面',
    description: '简单快手，温暖美味',
    ingredients: [
      { name: '面条', quantity: 200, unit: '克' },
      { name: '番茄', quantity: 2, unit: '个' },
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '糖', quantity: 0.5, unit: '勺' },
      { name: '花生油', quantity: 2, unit: '勺' },
      { name: '葱花', quantity: 1, unit: '把' }
    ],
    steps: [
      '番茄切块，鸡蛋打散',
      '热锅放油，炒鸡蛋盛出',
      '锅中加油，炒番茄出汁',
      '加水煮开，放入面条煮熟',
      '加入鸡蛋，放盐和糖调味',
      '撒上葱花即可'
    ]
  },
  {
    id: '8',
    name: '蒜蓉西兰花',
    description: '清淡健康，营养丰富',
    ingredients: [
      { name: '西兰花', quantity: 1, unit: '颗' },
      { name: '大蒜', quantity: 5, unit: '瓣' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '生抽', quantity: 1, unit: '勺' },
      { name: '花生油', quantity: 2, unit: '勺' }
    ],
    steps: [
      '西兰花掰小朵，用盐水浸泡10分钟',
      '大蒜切末',
      '锅中烧水，加少许盐和油，西兰花焯水1分钟',
      '捞出过凉水沥干',
      '热锅放油，爆香蒜末',
      '放入西兰花翻炒',
      '加盐和生抽调味即可'
    ]
  },
  {
    id: '9',
    name: '糖醋里脊',
    description: '酸甜可口，外酥里嫩',
    ingredients: [
      { name: '猪肉', quantity: 300, unit: '克' },
      { name: '番茄酱', quantity: 3, unit: '勺' },
      { name: '糖', quantity: 2, unit: '勺' },
      { name: '醋', quantity: 2, unit: '勺' },
      { name: '生抽', quantity: 1, unit: '勺' },
      { name: '淀粉', quantity: 3, unit: '勺' },
      { name: '面粉', quantity: 2, unit: '勺' },
      { name: '鸡蛋', quantity: 1, unit: '个' },
      { name: '料酒', quantity: 1, unit: '勺' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '花生油', quantity: 500, unit: '毫升' }
    ],
    steps: [
      '猪肉切条，用料酒、盐、生抽腌制15分钟',
      '调面糊：淀粉、面粉、鸡蛋加水拌匀',
      '肉条裹上面糊',
      '油温六成热，下肉条炸至金黄捞出',
      '油温升高复炸30秒至酥脆',
      '调糖醋汁：番茄酱、糖、醋、水混合',
      '锅中留底油，倒入糖醋汁熬至浓稠',
      '放入炸好的肉条翻炒均匀'
    ]
  },
  {
    id: '10',
    name: '酸辣土豆丝',
    description: '酸辣爽脆，超级下饭',
    ingredients: [
      { name: '土豆', quantity: 2, unit: '个' },
      { name: '辣椒', quantity: 3, unit: '个' },
      { name: '醋', quantity: 2, unit: '勺' },
      { name: '生抽', quantity: 1, unit: '勺' },
      { name: '盐', quantity: 1, unit: '勺' },
      { name: '花椒', quantity: 1, unit: '勺' },
      { name: '花生油', quantity: 2, unit: '勺' },
      { name: '葱姜蒜', quantity: 1, unit: '份' }
    ],
    steps: [
      '土豆去皮切细丝，用清水浸泡去除淀粉',
      '辣椒切丝，葱姜蒜切末',
      '热锅放油，爆香花椒后捞出',
      '放入葱姜蒜、辣椒丝爆香',
      '土豆丝沥干下锅大火快炒',
      '加醋、生抽、盐调味',
      '翻炒均匀即可出锅'
    ]
  }
];

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find(recipe => recipe.id === id);
}

export function getAllRecipes(): Recipe[] {
  return RECIPES;
}
