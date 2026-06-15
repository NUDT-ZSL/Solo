import { v4 as uuidv4 } from 'uuid';
import { Recipe, User, Category, Review } from './types';

const currentUser: User = {
  id: 'user-001',
  username: '美食达人',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
  createdAt: new Date()
};

const sampleUsers: User[] = [
  currentUser,
  { id: 'user-002', username: '厨房小白', createdAt: new Date() },
  { id: 'user-003', username: '甜品师小美', createdAt: new Date() },
  { id: 'user-004', username: '西餐主厨', createdAt: new Date() },
  { id: 'user-005', username: '川菜爱好者', createdAt: new Date() }
];

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '红烧肉',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
    category: '中餐',
    authorId: 'user-005',
    authorName: '川菜爱好者',
    ingredients: [
      { id: uuidv4(), quantity: '500', unit: '克', name: '五花肉' },
      { id: uuidv4(), quantity: '30', unit: '克', name: '冰糖' },
      { id: uuidv4(), quantity: '2', unit: '勺', name: '生抽' },
      { id: uuidv4(), quantity: '1', unit: '勺', name: '老抽' },
      { id: uuidv4(), quantity: '3', unit: '片', name: '生姜' },
      { id: uuidv4(), quantity: '2', unit: '个', name: '八角' }
    ],
    steps: [
      { id: uuidv4(), title: '准备食材', content: '五花肉切成3厘米见方的块，冷水下锅焯水，撇去浮沫后捞出沥干。' },
      { id: uuidv4(), title: '炒糖色', content: '锅中放少许油，加入冰糖小火慢慢炒至焦糖色，注意不要炒糊。' },
      { id: uuidv4(), title: '煸炒肉块', content: '将焯好水的五花肉倒入锅中，翻炒均匀，让每块肉都裹上糖色。' },
      { id: uuidv4(), title: '炖煮', content: '加入生抽、老抽、姜片、八角，倒入没过肉的热水，大火烧开后转小火炖60分钟。' },
      { id: uuidv4(), title: '收汁出锅', content: '最后开大火收汁，待汤汁浓稠裹满肉块即可出锅装盘。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-01-15'),
    reviews: [
      { id: uuidv4(), userId: 'user-002', rating: 5, comment: '太好吃了！', createdAt: new Date() },
      { id: uuidv4(), userId: 'user-003', rating: 4, comment: '颜色很漂亮', createdAt: new Date() }
    ],
    favoritedBy: ['user-002', 'user-003', 'user-001'],
    stepImages: [
      'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606755302530-873646529211?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606787997632-4464c8028742?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '意大利肉酱面',
    coverImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=400&fit=crop',
    category: '西餐',
    authorId: 'user-004',
    authorName: '西餐主厨',
    ingredients: [
      { id: uuidv4(), quantity: '400', unit: '克', name: '意大利面' },
      { id: uuidv4(), quantity: '300', unit: '克', name: '牛肉末' },
      { id: uuidv4(), quantity: '1', unit: '罐', name: '番茄罐头' },
      { id: uuidv4(), quantity: '1', unit: '个', name: '洋葱' },
      { id: uuidv4(), quantity: '3', unit: '瓣', name: '大蒜' },
      { id: uuidv4(), quantity: '适量', unit: '', name: '橄榄油' }
    ],
    steps: [
      { id: uuidv4(), title: '准备蔬菜', content: '洋葱和大蒜切碎备用。' },
      { id: uuidv4(), title: '炒香底料', content: '锅中加橄榄油，放入洋葱碎炒至透明，加入蒜末炒香。' },
      { id: uuidv4(), title: '制作肉酱', content: '加入牛肉末炒散变色，倒入番茄罐头，加盐、黑胡椒调味，小火熬煮30分钟。' },
      { id: uuidv4(), title: '煮面', content: '另起一锅烧水，加盐，放入意面煮至八分熟。' },
      { id: uuidv4(), title: '混合出锅', content: '将煮好的意面拌入肉酱中，撒上帕玛森芝士即可。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-02-10'),
    reviews: [
      { id: uuidv4(), userId: 'user-001', rating: 5, comment: '正宗味道！', createdAt: new Date() }
    ],
    favoritedBy: ['user-001', 'user-005'],
    stepImages: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '草莓千层蛋糕',
    coverImage: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&h=400&fit=crop',
    category: '甜品',
    authorId: 'user-003',
    authorName: '甜品师小美',
    ingredients: [
      { id: uuidv4(), quantity: '4', unit: '个', name: '鸡蛋' },
      { id: uuidv4(), quantity: '100', unit: '克', name: '低筋面粉' },
      { id: uuidv4(), quantity: '200', unit: '毫升', name: '牛奶' },
      { id: uuidv4(), quantity: '30', unit: '克', name: '黄油' },
      { id: uuidv4(), quantity: '300', unit: '毫升', name: '淡奶油' },
      { id: uuidv4(), quantity: '500', unit: '克', name: '新鲜草莓' }
    ],
    steps: [
      { id: uuidv4(), title: '制作面糊', content: '鸡蛋打散，加入牛奶、融化的黄油搅拌均匀，筛入低筋面粉拌匀，静置30分钟。' },
      { id: uuidv4(), title: '煎薄饼', content: '平底锅小火加热，倒入一勺面糊，摊成薄饼，两面煎熟，大约煎15-20张。' },
      { id: uuidv4(), title: '打发奶油', content: '淡奶油加糖打发至硬性发泡。' },
      { id: uuidv4(), title: '组装蛋糕', content: '一层薄饼抹一层奶油，铺一层切好的草莓片，重复此步骤直到用完所有薄饼。' },
      { id: uuidv4(), title: '冷藏定型', content: '做好的千层蛋糕放入冰箱冷藏4小时以上，让奶油充分凝固。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-03-05'),
    reviews: [
      { id: uuidv4(), userId: 'user-002', rating: 5, comment: '颜值太高了！', createdAt: new Date() },
      { id: uuidv4(), userId: 'user-004', rating: 5, createdAt: new Date() }
    ],
    favoritedBy: ['user-001', 'user-002', 'user-004', 'user-005'],
    stepImages: [
      'https://images.unsplash.com/photo-1486427944544-d2c6fe5c2127?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '日式咖喱饭',
    coverImage: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&h=400&fit=crop',
    category: '日料',
    authorId: 'user-002',
    authorName: '厨房小白',
    ingredients: [
      { id: uuidv4(), quantity: '400', unit: '克', name: '鸡腿肉' },
      { id: uuidv4(), quantity: '2', unit: '个', name: '土豆' },
      { id: uuidv4(), quantity: '1', unit: '根', name: '胡萝卜' },
      { id: uuidv4(), quantity: '1', unit: '个', name: '洋葱' },
      { id: uuidv4(), quantity: '1', unit: '盒', name: '咖喱块' }
    ],
    steps: [
      { id: uuidv4(), title: '处理食材', content: '鸡肉切块，土豆、胡萝卜去皮切块，洋葱切丝。' },
      { id: uuidv4(), title: '炒香食材', content: '锅中倒油，先炒洋葱丝至透明，加入鸡肉块炒至变色。' },
      { id: uuidv4(), title: '加水炖煮', content: '加入土豆、胡萝卜，倒入没过食材的水，大火煮开转中火煮20分钟。' },
      { id: uuidv4(), title: '加咖喱块', content: '关火，加入咖喱块搅拌至完全融化，再开小火煮5分钟至浓稠。' },
      { id: uuidv4(), title: '装盘', content: '米饭倒扣在盘中，浇上咖喱即可享用。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-03-20'),
    reviews: [
      { id: uuidv4(), userId: 'user-003', rating: 4, comment: '简单好做！', createdAt: new Date() }
    ],
    favoritedBy: ['user-003'],
    stepImages: [
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '石锅拌饭',
    coverImage: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600&h=400&fit=crop',
    category: '韩餐',
    authorId: 'user-001',
    authorName: '美食达人',
    ingredients: [
      { id: uuidv4(), quantity: '200', unit: '克', name: '大米' },
      { id: uuidv4(), quantity: '1', unit: '个', name: '鸡蛋' },
      { id: uuidv4(), quantity: '50', unit: '克', name: '菠菜' },
      { id: uuidv4(), quantity: '50', unit: '克', name: '胡萝卜丝' },
      { id: uuidv4(), quantity: '50', unit: '克', name: '豆芽' },
      { id: uuidv4(), quantity: '2', unit: '勺', name: '韩式辣酱' }
    ],
    steps: [
      { id: uuidv4(), title: '煮米饭', content: '大米淘洗干净，用电饭煲煮成米饭。' },
      { id: uuidv4(), title: '处理蔬菜', content: '菠菜、豆芽分别焯水，胡萝卜丝炒软，每种蔬菜用盐、香油、蒜末调味。' },
      { id: uuidv4(), title: '煎蛋', content: '煎一个半熟的太阳蛋。' },
      { id: uuidv4(), title: '组装拌饭', content: '石锅刷香油，放入米饭，上面整齐摆放各色蔬菜和煎蛋。' },
      { id: uuidv4(), title: '加热享用', content: '石锅小火加热至锅底米饭形成锅巴，加辣酱拌匀即可。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-04-01'),
    reviews: [
      { id: uuidv4(), userId: 'user-005', rating: 5, createdAt: new Date() }
    ],
    favoritedBy: ['user-002', 'user-004'],
    stepImages: [
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '水果茶',
    coverImage: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop',
    category: '饮品',
    authorId: 'user-003',
    authorName: '甜品师小美',
    ingredients: [
      { id: uuidv4(), quantity: '2', unit: '包', name: '红茶' },
      { id: uuidv4(), quantity: '1', unit: '个', name: '橙子' },
      { id: uuidv4(), quantity: '1', unit: '个', name: '苹果' },
      { id: uuidv4(), quantity: '5', unit: '颗', name: '草莓' },
      { id: uuidv4(), quantity: '适量', unit: '', name: '蜂蜜' }
    ],
    steps: [
      { id: uuidv4(), title: '泡红茶', content: '红茶包用热水泡开，晾凉备用。' },
      { id: uuidv4(), title: '处理水果', content: '橙子、苹果切片，草莓切块。' },
      { id: uuidv4(), title: '组装', content: '将所有水果放入茶壶中。' },
      { id: uuidv4(), title: '混合', content: '倒入晾凉的红茶，加入蜂蜜调味。' },
      { id: uuidv4(), title: '冷藏', content: '放入冰箱冷藏2小时，风味更佳。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-04-15'),
    reviews: [
      { id: uuidv4(), userId: 'user-001', rating: 4, comment: '清爽好喝！', createdAt: new Date() }
    ],
    favoritedBy: ['user-001', 'user-002'],
    stepImages: [
      'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '宫保鸡丁',
    coverImage: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&h=400&fit=crop',
    category: '中餐',
    authorId: 'user-005',
    authorName: '川菜爱好者',
    ingredients: [
      { id: uuidv4(), quantity: '300', unit: '克', name: '鸡胸肉' },
      { id: uuidv4(), quantity: '50', unit: '克', name: '花生米' },
      { id: uuidv4(), quantity: '3', unit: '根', name: '干辣椒' },
      { id: uuidv4(), quantity: '2', unit: '勺', name: '生抽' },
      { id: uuidv4(), quantity: '1', unit: '勺', name: '醋' },
      { id: uuidv4(), quantity: '1', unit: '勺', name: '白糖' }
    ],
    steps: [
      { id: uuidv4(), title: '处理鸡肉', content: '鸡胸肉切丁，用生抽、料酒、淀粉腌制15分钟。' },
      { id: uuidv4(), title: '调制料汁', content: '生抽、醋、白糖、淀粉、水调成料汁备用。' },
      { id: uuidv4(), title: '炸花生米', content: '花生米小火炸至金黄酥脆，捞出晾凉。' },
      { id: uuidv4(), title: '爆炒', content: '锅中油热，爆香干辣椒和花椒，下鸡丁快速翻炒至变色。' },
      { id: uuidv4(), title: '出锅', content: '倒入料汁翻炒均匀，最后加入花生米翻匀即可出锅。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-05-01'),
    reviews: [
      { id: uuidv4(), userId: 'user-004', rating: 5, comment: '经典川菜！', createdAt: new Date() }
    ],
    favoritedBy: ['user-002', 'user-003'],
    stepImages: [
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '提拉米苏',
    coverImage: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop',
    category: '甜品',
    authorId: 'user-003',
    authorName: '甜品师小美',
    ingredients: [
      { id: uuidv4(), quantity: '3', unit: '个', name: '蛋黄' },
      { id: uuidv4(), quantity: '250', unit: '克', name: '马斯卡彭奶酪' },
      { id: uuidv4(), quantity: '200', unit: '毫升', name: '淡奶油' },
      { id: uuidv4(), quantity: '1', unit: '包', name: '手指饼干' },
      { id: uuidv4(), quantity: '200', unit: '毫升', name: '浓缩咖啡' },
      { id: uuidv4(), quantity: '适量', unit: '', name: '可可粉' }
    ],
    steps: [
      { id: uuidv4(), title: '打发蛋黄', content: '蛋黄加糖隔水加热打发至颜色变浅、体积膨胀。' },
      { id: uuidv4(), title: '混合奶酪', content: '马斯卡彭奶酪搅拌顺滑，与打发的蛋黄混合均匀。' },
      { id: uuidv4(), title: '打发奶油', content: '淡奶油打发至有纹路，与奶酪糊翻拌均匀。' },
      { id: uuidv4(), title: '组装', content: '手指饼干快速蘸咖啡铺底，抹一层奶酪糊，重复一层。' },
      { id: uuidv4(), title: '冷藏', content: '表面筛可可粉，冰箱冷藏4小时以上即可。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-05-15'),
    reviews: [],
    favoritedBy: ['user-001'],
    stepImages: [
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '法式洋葱汤',
    coverImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=400&fit=crop',
    category: '西餐',
    authorId: 'user-004',
    authorName: '西餐主厨',
    ingredients: [
      { id: uuidv4(), quantity: '4', unit: '个', name: '黄洋葱' },
      { id: uuidv4(), quantity: '2', unit: '瓣', name: '大蒜' },
      { id: uuidv4(), quantity: '1', unit: '升', name: '牛肉高汤' },
      { id: uuidv4(), quantity: '100', unit: '毫升', name: '白葡萄酒' },
      { id: uuidv4(), quantity: '4', unit: '片', name: '法棍面包' },
      { id: uuidv4(), quantity: '适量', unit: '', name: '格鲁耶尔奶酪' }
    ],
    steps: [
      { id: uuidv4(), title: '切洋葱', content: '洋葱切成细丝，大蒜切末。' },
      { id: uuidv4(), title: '焦糖洋葱', content: '锅中放黄油，小火慢慢炒洋葱约40分钟至深褐色焦糖色。' },
      { id: uuidv4(), title: '加汤', content: '加入蒜末炒香，倒入白葡萄酒煮至浓缩，加入牛肉高汤煮20分钟。' },
      { id: uuidv4(), title: '烤面包', content: '法棍面包切片烤至金黄。' },
      { id: uuidv4(), title: '出炉', content: '汤装烤碗，放面包片，撒奶酪碎，入烤箱烤至奶酪融化金黄。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-06-01'),
    reviews: [],
    favoritedBy: [],
    stepImages: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '三文鱼寿司',
    coverImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop',
    category: '日料',
    authorId: 'user-002',
    authorName: '厨房小白',
    ingredients: [
      { id: uuidv4(), quantity: '200', unit: '克', name: '寿司米' },
      { id: uuidv4(), quantity: '20', unit: '毫升', name: '寿司醋' },
      { id: uuidv4(), quantity: '150', unit: '克', name: '新鲜三文鱼' },
      { id: uuidv4(), quantity: '1', unit: '根', name: '黄瓜' },
      { id: uuidv4(), quantity: '1', unit: '张', name: '海苔' }
    ],
    steps: [
      { id: uuidv4(), title: '煮寿司饭', content: '寿司米洗净，加水浸泡30分钟，煮成稍硬的米饭。' },
      { id: uuidv4(), title: '拌醋饭', content: '热饭拌入寿司醋，用扇子扇凉备用。' },
      { id: uuidv4(), title: '切三文鱼', content: '三文鱼逆纹切成0.5厘米厚的片。' },
      { id: uuidv4(), title: '卷寿司', content: '海苔上铺醋饭，放黄瓜条，用卷帘卷紧。' },
      { id: uuidv4(), title: '完成', content: '刀沾水切寿司卷，搭配三文鱼片一起摆盘。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-06-15'),
    reviews: [
      { id: uuidv4(), userId: 'user-001', rating: 4, comment: '看着很新鲜', createdAt: new Date() }
    ],
    favoritedBy: ['user-001', 'user-003'],
    stepImages: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '麻辣香锅',
    coverImage: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&h=400&fit=crop',
    category: '中餐',
    authorId: 'user-005',
    authorName: '川菜爱好者',
    ingredients: [
      { id: uuidv4(), quantity: '200', unit: '克', name: '虾' },
      { id: uuidv4(), quantity: '200', unit: '克', name: '午餐肉' },
      { id: uuidv4(), quantity: '100', unit: '克', name: '藕片' },
      { id: uuidv4(), quantity: '100', unit: '克', name: '土豆片' },
      { id: uuidv4(), quantity: '1', unit: '袋', name: '麻辣香锅调料' }
    ],
    steps: [
      { id: uuidv4(), title: '处理食材', content: '虾开背去虾线，午餐肉切片，蔬菜洗净备用。' },
      { id: uuidv4(), title: '焯水', content: '藕片、土豆片焯水至半熟捞出。' },
      { id: uuidv4(), title: '煎香', content: '虾和午餐肉煎至金黄盛出。' },
      { id: uuidv4(), title: '炒料', content: '锅中放调料炒香，加入所有食材翻炒。' },
      { id: uuidv4(), title: '出锅', content: '大火翻炒均匀，撒上白芝麻和香菜即可。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-07-01'),
    reviews: [
      { id: uuidv4(), userId: 'user-002', rating: 5, comment: '太下饭了！', createdAt: new Date() }
    ],
    favoritedBy: ['user-001', 'user-002', 'user-004'],
    stepImages: [
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&h=500&fit=crop'
    ]
  },
  {
    id: uuidv4(),
    name: '芝士年糕',
    coverImage: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600&h=400&fit=crop',
    category: '韩餐',
    authorId: 'user-001',
    authorName: '美食达人',
    ingredients: [
      { id: uuidv4(), quantity: '300', unit: '克', name: '芝士年糕' },
      { id: uuidv4(), quantity: '50', unit: '克', name: '马苏里拉芝士' },
      { id: uuidv4(), quantity: '2', unit: '勺', name: '韩式辣酱' },
      { id: uuidv4(), quantity: '1', unit: '勺', name: '番茄酱' },
      { id: uuidv4(), quantity: '1', unit: '勺', name: '白糖' }
    ],
    steps: [
      { id: uuidv4(), title: '煮年糕', content: '年糕煮软捞出备用。' },
      { id: uuidv4(), title: '调酱汁', content: '韩式辣酱、番茄酱、白糖、水调成酱汁。' },
      { id: uuidv4(), title: '翻炒', content: '酱汁倒入锅中煮开，放入年糕翻炒均匀。' },
      { id: uuidv4(), title: '加芝士', content: '撒上马苏里拉芝士，盖锅盖焖至融化。' },
      { id: uuidv4(), title: '出锅', content: '芝士拉丝即可出锅，趁热享用。' }
    ],
    isPublic: true,
    createdAt: new Date('2024-07-15'),
    reviews: [],
    favoritedBy: ['user-003'],
    stepImages: [
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop'
    ]
  }
];

export function getCurrentUser(): User {
  return currentUser;
}

export function getUsers(): User[] {
  return sampleUsers;
}

export function getAllRecipes(): Recipe[] {
  return recipes.filter(r => r.isPublic);
}

export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find(r => r.id === id);
}

export function getRecipesByUser(userId: string): Recipe[] {
  return recipes.filter(r => r.authorId === userId);
}

export function getFavoriteRecipes(userId: string): Recipe[] {
  return recipes.filter(r => r.favoritedBy.includes(userId));
}

export function getRecipesByCategory(category: Category): Recipe[] {
  return recipes.filter(r => r.isPublic && r.category === category);
}

export function addRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'reviews' | 'favoritedBy'>): Recipe {
  const newRecipe: Recipe = {
    ...recipe,
    id: uuidv4(),
    createdAt: new Date(),
    reviews: [],
    favoritedBy: []
  };
  recipes.unshift(newRecipe);
  return newRecipe;
}

export function toggleFavorite(recipeId: string, userId: string): boolean {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return false;
  const index = recipe.favoritedBy.indexOf(userId);
  if (index > -1) {
    recipe.favoritedBy.splice(index, 1);
    return false;
  } else {
    recipe.favoritedBy.push(userId);
    return true;
  }
}

export function isFavorited(recipeId: string, userId: string): boolean {
  const recipe = recipes.find(r => r.id === recipeId);
  return recipe ? recipe.favoritedBy.includes(userId) : false;
}

export function addReview(recipeId: string, userId: string, rating: number, comment?: string): Review | null {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return null;
  const existingReview = recipe.reviews.find(r => r.userId === userId);
  if (existingReview) {
    existingReview.rating = rating;
    existingReview.comment = comment;
    existingReview.createdAt = new Date();
    return existingReview;
  }
  const review: Review = {
    id: uuidv4(),
    userId,
    rating,
    comment,
    createdAt: new Date()
  };
  recipe.reviews.push(review);
  return review;
}

export function getAverageRating(recipe: Recipe): number {
  if (recipe.reviews.length === 0) return 0;
  const sum = recipe.reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / recipe.reviews.length) * 10) / 10;
}

export function getUserStats(userId: string) {
  const userRecipes = getRecipesByUser(userId);
  const totalRecipes = userRecipes.length;
  const totalFavorites = userRecipes.reduce((acc, r) => acc + r.favoritedBy.length, 0);
  const avgRating = totalRecipes > 0
    ? Math.round(userRecipes.reduce((acc, r) => acc + getAverageRating(r), 0) / totalRecipes * 10) / 10
    : 0;
  return { totalRecipes, totalFavorites, avgRating };
}

export function getSimilarRecipes(recipeId: string, limit: number = 4): Recipe[] {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return [];
  const similar = recipes
    .filter(r => r.id !== recipeId && r.isPublic && r.category === recipe.category);
  const shuffled = similar.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
