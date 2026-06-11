import { Recipe } from '../types/Recipe';

export const mockRecipes: Recipe[] = [
  {
    id: 1,
    title: '番茄炒蛋',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20chinese%20tomato%20egg%20stir%20fry%20dish%20on%20plate%20food%20photography&image_size=square_hd',
    description: '经典家常快手菜，酸甜可口，营养丰富',
    ingredients: ['番茄', '鸡蛋', '葱花', '盐', '糖', '食用油'],
    steps: [
      '番茄洗净切块，鸡蛋打散加少许盐搅匀',
      '锅中加油烧热，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入番茄翻炒出汁',
      '加入盐和糖调味，倒入炒好的鸡蛋翻炒均匀',
      '撒上葱花即可出锅'
    ],
    tags: ['快手菜', '家常菜', '下饭菜'],
    likes: 256
  },
  {
    id: 2,
    title: '红烧肉',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20braised%20pork%20belly%20hongshao%20rou%20food%20photography&image_size=square_hd',
    description: '肥而不腻，入口即化的经典硬菜',
    ingredients: ['五花肉', '冰糖', '生抽', '老抽', '料酒', '八角', '桂皮', '姜片'],
    steps: [
      '五花肉切块，冷水下锅焯水去血沫',
      '锅中放少许油，加入冰糖小火炒出糖色',
      '放入五花肉翻炒上色',
      '加入生抽、老抽、料酒调味',
      '加入八角、桂皮、姜片和适量清水',
      '大火烧开后转小火炖1小时',
      '大火收汁即可'
    ],
    tags: ['家常菜', '硬菜', '宴客菜'],
    likes: 512
  },
  {
    id: 3,
    title: '提拉米苏',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=italian%20tiramisu%20dessert%20cake%20food%20photography&image_size=square_hd',
    description: '意式经典甜品，浓郁咖啡香与绵密口感',
    ingredients: ['马斯卡彭奶酪', '淡奶油', '鸡蛋', '糖', '手指饼干', '浓缩咖啡', '可可粉'],
    steps: [
      '蛋黄加糖打发至颜色变浅',
      '加入马斯卡彭奶酪搅拌均匀',
      '淡奶油打发至湿性发泡，与奶酪糊混合',
      '手指饼干快速蘸取咖啡液铺在容器底部',
      '铺一层奶酪糊，重复铺层',
      '冷藏4小时以上，食用前筛可可粉'
    ],
    tags: ['甜品', '烘焙', '意式'],
    likes: 389
  },
  {
    id: 4,
    title: '麻婆豆腐',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sichuan%20mapo%20tofu%20spicy%20chinese%20food%20photography&image_size=square_hd',
    description: '麻辣鲜香，川菜代表之作',
    ingredients: ['嫩豆腐', '牛肉末', '豆瓣酱', '花椒粉', '葱花', '蒜末', '生抽'],
    steps: [
      '豆腐切块，用淡盐水浸泡',
      '锅中加油，放入牛肉末炒香',
      '加入豆瓣酱和蒜末炒出红油',
      '加入适量水烧开，放入豆腐',
      '小火煮5分钟让豆腐入味',
      '勾芡撒花椒粉和葱花即可'
    ],
    tags: ['川菜', '下饭菜', '辣'],
    likes: 445
  },
  {
    id: 5,
    title: '寿司拼盘',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20sushi%20platter%20salmon%20tuna%20food%20photography&image_size=square_hd',
    description: '精致日式料理，新鲜美味',
    ingredients: ['寿司米', '三文鱼', '金枪鱼', '牛油果', '海苔', '寿司醋', '芥末'],
    steps: [
      '寿司米洗净煮熟，趁热拌入寿司醋',
      '三文鱼、金枪鱼切薄片',
      '牛油果切片',
      '手沾水取适量米饭捏成椭圆形',
      '盖上鱼片，用海苔条固定',
      '摆盘配芥末和酱油'
    ],
    tags: ['日料', '海鲜', '冷食'],
    likes: 298
  },
  {
    id: 6,
    title: '蒜蓉西兰花',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=garlic%20broccoli%20stir%20fry%20chinese%20vegetable%20dish&image_size=square_hd',
    description: '清爽健康的素菜，蒜香浓郁',
    ingredients: ['西兰花', '大蒜', '盐', '蚝油', '食用油'],
    steps: [
      '西兰花掰小朵，盐水浸泡10分钟',
      '大蒜切末',
      '锅中水烧开，加少许盐和油',
      '西兰花焯水1分钟捞出过凉',
      '锅中加油爆香蒜末',
      '放入西兰花翻炒，加盐和蚝油调味'
    ],
    tags: ['素菜', '快手菜', '健康'],
    likes: 187
  },
  {
    id: 7,
    title: '可乐鸡翅',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=coca%20cola%20chicken%20wings%20chinese%20food&image_size=square_hd',
    description: '甜香软嫩，小朋友最爱的家常菜',
    ingredients: ['鸡翅中', '可乐', '生抽', '老抽', '料酒', '姜片', '葱段'],
    steps: [
      '鸡翅两面划刀，便于入味',
      '冷水下锅焯水，去除血沫',
      '锅中少油，鸡翅煎至两面金黄',
      '加入生抽、老抽、料酒调味',
      '倒入可乐没过鸡翅',
      '放入姜片和葱段，大火烧开转小火',
      '煮20分钟后大火收汁'
    ],
    tags: ['家常菜', '快手菜', '甜口'],
    likes: 623
  },
  {
    id: 8,
    title: '芝士蛋糕',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=creamy%20cheesecake%20dessert%20food%20photography&image_size=square_hd',
    description: '绵密丝滑，浓郁芝士香',
    ingredients: ['奶油奶酪', '淡奶油', '鸡蛋', '糖', '消化饼干', '黄油', '柠檬汁'],
    steps: [
      '消化饼干压碎，与融化黄油混合铺底压实',
      '奶油奶酪室温软化加糖打发',
      '逐个加入鸡蛋搅匀',
      '加入淡奶油和柠檬汁拌匀',
      '倒入铺好饼干底的模具',
      '水浴法160度烤60分钟',
      '焖凉后冷藏4小时'
    ],
    tags: ['甜品', '烘焙', '蛋糕'],
    likes: 476
  },
  {
    id: 9,
    title: '酸辣土豆丝',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spicy%20sour%20shredded%20potato%20chinese%20dish&image_size=square_hd',
    description: '酸辣爽脆，超级下饭',
    ingredients: ['土豆', '干辣椒', '花椒', '醋', '盐', '葱花'],
    steps: [
      '土豆去皮切细丝，泡水去淀粉',
      '锅中加油爆香花椒和干辣椒',
      '捞出花椒，放入土豆丝大火快炒',
      '加盐和醋调味',
      '撒葱花出锅'
    ],
    tags: ['快手菜', '素菜', '下饭菜'],
    likes: 334
  },
  {
    id: 10,
    title: '意式肉酱面',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=italian%20spaghetti%20bolognese%20pasta%20food%20photography&image_size=square_hd',
    description: '经典意式风味，浓郁肉酱配Q弹意面',
    ingredients: ['意大利面', '牛肉末', '番茄', '洋葱', '大蒜', '番茄酱', '罗勒', '橄榄油'],
    steps: [
      '洋葱、大蒜切末，番茄切丁',
      '锅中加橄榄油，炒香洋葱和大蒜',
      '加入牛肉末炒至变色',
      '加入番茄丁和番茄酱小火熬煮',
      '另起锅煮意面至八分熟',
      '意面拌入肉酱，撒罗勒叶'
    ],
    tags: ['意式', '西餐', '主食'],
    likes: 412
  },
  {
    id: 11,
    title: '蛋炒饭',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20egg%20fried%20rice%20food%20photography&image_size=square_hd',
    description: '粒粒分明，金黄诱人的经典炒饭',
    ingredients: ['隔夜米饭', '鸡蛋', '葱花', '盐', '食用油'],
    steps: [
      '鸡蛋打散，米饭打散',
      '锅中加油烧热，倒入蛋液',
      '蛋液半凝固时倒入米饭',
      '大火翻炒均匀，让米粒裹上蛋液',
      '加盐调味，撒葱花出锅'
    ],
    tags: ['快手菜', '主食', '家常菜'],
    likes: 289
  },
  {
    id: 12,
    title: '芒果班戟',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mango%20pancake%20hong%20kong%20dessert%20food&image_size=square_hd',
    description: '港式经典甜品，芒果与奶油的完美结合',
    ingredients: ['低筋面粉', '牛奶', '鸡蛋', '糖', '黄油', '淡奶油', '芒果'],
    steps: [
      '面粉过筛，与牛奶、鸡蛋、糖混合成面糊',
      '加入融化黄油搅匀',
      '平底锅小火摊成薄饼',
      '淡奶油打发',
      '芒果切块',
      '饼皮中央放奶油和芒果，包成四方形'
    ],
    tags: ['甜品', '港式', '烘焙'],
    likes: 356
  },
  {
    id: 13,
    title: '水煮牛肉',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sichuan%20boiled%20beef%20spicy%20chinese%20dish&image_size=square_hd',
    description: '麻辣鲜香，川菜经典',
    ingredients: ['牛里脊', '豆芽', '干辣椒', '花椒', '豆瓣酱', '蒜末', '葱花'],
    steps: [
      '牛肉切薄片，用淀粉、蛋清、料酒腌制',
      '豆芽焯水铺在碗底',
      '锅中炒香豆瓣酱和蒜末',
      '加水烧开，放入牛肉片滑熟',
      '连汤倒入碗中',
      '撒干辣椒、花椒、蒜末',
      '浇上热油激香'
    ],
    tags: ['川菜', '辣', '下饭菜'],
    likes: 467
  },
  {
    id: 14,
    title: '法式吐司',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=french%20toast%20breakfast%20maple%20syrup%20food&image_size=square_hd',
    description: '外酥里嫩的甜蜜早餐',
    ingredients: ['吐司面包', '鸡蛋', '牛奶', '糖', '黄油', '蜂蜜', '水果'],
    steps: [
      '鸡蛋、牛奶、糖混合搅匀',
      '吐司两面蘸满蛋液',
      '平底锅加黄油小火煎至金黄',
      '淋蜂蜜，配水果享用'
    ],
    tags: ['早餐', '甜品', '快手菜'],
    likes: 234
  },
  {
    id: 15,
    title: '宫保鸡丁',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kung%20pao%20chicken%20chinese%20food%20photography&image_size=square_hd',
    description: '麻辣鲜香，花生酥脆',
    ingredients: ['鸡胸肉', '花生米', '干辣椒', '花椒', '葱', '蒜', '生抽', '醋', '糖'],
    steps: [
      '鸡胸肉切丁，用淀粉、料酒腌制',
      '调制料汁：生抽、醋、糖、淀粉、水',
      '锅中炒香干辣椒和花椒',
      '放入鸡丁翻炒变色',
      '加入葱蒜炒香',
      '倒入料汁快速翻炒',
      '最后加入花生米翻匀'
    ],
    tags: ['川菜', '家常菜', '下饭菜'],
    likes: 398
  },
  {
    id: 16,
    title: '抹茶千层蛋糕',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=matcha%20mille%20crepe%20cake%20japanese%20dessert&image_size=square_hd',
    description: '层层叠叠的抹茶风味',
    ingredients: ['低筋面粉', '抹茶粉', '牛奶', '鸡蛋', '糖', '黄油', '淡奶油'],
    steps: [
      '面粉、抹茶粉过筛，与牛奶、鸡蛋、糖混合',
      '加入融化黄油搅匀成面糊',
      '平底锅摊成薄饼约20张',
      '淡奶油加糖打发',
      '一层饼皮一层奶油叠放',
      '冷藏定型后切件'
    ],
    tags: ['甜品', '烘焙', '日式'],
    likes: 423
  },
  {
    id: 17,
    title: '清蒸鲈鱼',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20steamed%20sea%20bass%20fish%20food&image_size=square_hd',
    description: '鲜嫩爽滑，原汁原味',
    ingredients: ['鲈鱼', '葱', '姜', '蒸鱼豉油', '料酒'],
    steps: [
      '鲈鱼处理干净，两面划刀',
      '鱼身抹料酒，放姜片葱段',
      '水开后蒸8分钟',
      '倒掉汤汁，换新葱丝',
      '淋蒸鱼豉油',
      '浇热油激香'
    ],
    tags: ['家常菜', '海鲜', '宴客菜'],
    likes: 312
  },
  {
    id: 18,
    title: '巧克力曲奇',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chocolate%20chip%20cookies%20baked%20food&image_size=square_hd',
    description: '酥软香甜，巧克力流心',
    ingredients: ['黄油', '糖', '红糖', '鸡蛋', '低筋面粉', '可可粉', '巧克力豆'],
    steps: [
      '黄油室温软化，加糖和红糖打发',
      '加入鸡蛋搅匀',
      '筛入面粉和可可粉拌匀',
      '加入巧克力豆',
      '搓成球摆入烤盘',
      '180度烤12分钟'
    ],
    tags: ['甜品', '烘焙', '饼干'],
    likes: 278
  },
  {
    id: 19,
    title: '鱼香肉丝',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yuxiang%20shredded%20pork%20chinese%20food&image_size=square_hd',
    description: '酸甜微辣，鱼香味浓',
    ingredients: ['猪里脊', '胡萝卜', '青椒', '木耳', '蒜', '姜', '豆瓣酱', '醋', '糖', '生抽'],
    steps: [
      '猪肉切丝，用淀粉、料酒腌制',
      '胡萝卜、青椒、木耳切丝',
      '调制鱼香汁：醋、糖、生抽、淀粉、水',
      '肉丝滑炒盛出',
      '炒香豆瓣酱、姜蒜',
      '放入蔬菜丝翻炒',
      '倒入肉丝和鱼香汁炒匀'
    ],
    tags: ['川菜', '家常菜', '下饭菜'],
    likes: 367
  },
  {
    id: 20,
    title: '葡式蛋挞',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portuguese%20egg%20tart%20dessert%20food&image_size=square_hd',
    description: '酥脆外皮，嫩滑蛋液',
    ingredients: ['蛋挞皮', '牛奶', '淡奶油', '蛋黄', '糖', '炼乳'],
    steps: [
      '牛奶加糖加热融化',
      '加入淡奶油和炼乳搅匀',
      '降温后加入蛋黄过筛',
      '蛋挞皮解冻，倒入蛋液八分满',
      '220度烤20分钟至焦糖斑出现'
    ],
    tags: ['甜品', '烘焙', '葡式'],
    likes: 445
  },
  {
    id: 21,
    title: '糖醋排骨',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sweet%20sour%20pork%20ribs%20chinese%20food&image_size=square_hd',
    description: '酸甜可口，外酥里嫩',
    ingredients: ['猪排骨', '醋', '糖', '番茄酱', '生抽', '料酒', '姜片', '葱段'],
    steps: [
      '排骨冷水下锅焯水',
      '锅中加油，排骨炸至金黄',
      '锅中留底油，加糖炒出糖色',
      '加入排骨翻炒',
      '加醋、番茄酱、生抽、料酒',
      '加水没过排骨，放姜片葱段',
      '小火炖30分钟，大火收汁'
    ],
    tags: ['家常菜', '宴客菜', '甜口'],
    likes: 534
  },
  {
    id: 22,
    title: '日式咖喱饭',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20curry%20rice%20food%20photography&image_size=square_hd',
    description: '浓郁醇厚，日式家常味道',
    ingredients: ['咖喱块', '土豆', '胡萝卜', '洋葱', '牛肉', '米饭'],
    steps: [
      '牛肉切块焯水',
      '土豆、胡萝卜切块，洋葱切丝',
      '锅中炒香洋葱',
      '加入牛肉翻炒',
      '加水没过食材，煮20分钟',
      '加入咖喱块煮至浓稠',
      '配米饭享用'
    ],
    tags: ['日料', '主食', '家常菜'],
    likes: 378
  },
  {
    id: 23,
    title: '凉拌黄瓜',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cucumber%20salad%20chinese%20cold%20dish&image_size=square_hd',
    description: '清爽开胃，夏日必备',
    ingredients: ['黄瓜', '大蒜', '醋', '生抽', '糖', '辣椒油', '香油'],
    steps: [
      '黄瓜拍碎切段',
      '加盐腌制10分钟挤干水分',
      '蒜末、醋、生抽、糖、辣椒油调成料汁',
      '料汁倒入黄瓜拌匀',
      '淋香油即可'
    ],
    tags: ['素菜', '凉菜', '快手菜'],
    likes: 198
  },
  {
    id: 24,
    title: '红豆沙',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=red%20bean%20paste%20soup%20chinese%20dessert&image_size=square_hd',
    description: '细腻香甜，传统中式甜品',
    ingredients: ['红豆', '冰糖', '陈皮'],
    steps: [
      '红豆浸泡4小时以上',
      '红豆加水和陈皮大火煮开',
      '转小火煮1小时至红豆软烂',
      '加入冰糖煮化',
      '可用搅拌机打至更细腻'
    ],
    tags: ['甜品', '中式', '养生'],
    likes: 267
  }
];
