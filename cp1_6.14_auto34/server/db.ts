import { JSONFilePreset } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
  rating: number;
  ratingCount: number;
  favorite: boolean;
  notes: string;
  gradient: string;
}

export interface DbSchema {
  recipes: Recipe[];
}

const gradients = [
  'linear-gradient(135deg, #f97316, #fbbf24)',
  'linear-gradient(135deg, #ef4444, #f97316)',
  'linear-gradient(135deg, #22c55e, #86efac)',
  'linear-gradient(135deg, #3b82f6, #93c5fd)',
  'linear-gradient(135deg, #8b5cf6, #c4b5fd)',
  'linear-gradient(135deg, #ec4899, #f9a8d4)',
  'linear-gradient(135deg, #14b8a6, #5eead4)',
  'linear-gradient(135deg, #f59e0b, #fde68a)',
  'linear-gradient(135deg, #6366f1, #a5b4fc)',
  'linear-gradient(135deg, #d946ef, #f0abfc)',
];

const categories = ['中式', '西式', '甜品', '汤羹'];

const sampleRecipes: Array<{
  name: string;
  description: string;
  category: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
}> = [
  {
    name: '宫保鸡丁',
    description: '经典川菜，鸡丁与花生的完美搭配，麻辣鲜香',
    category: '中式',
    cookTime: '30分钟',
    ingredients: ['鸡肉', '花生', '干辣椒', '花椒', '葱', '姜', '蒜', '酱油', '醋', '糖'],
    steps: ['鸡肉切丁，加酱油、淀粉腌制15分钟', '调制碗汁：酱油、醋、糖、淀粉水拌匀', '热锅冷油，爆香干辣椒和花椒', '下鸡丁滑炒至变色', '加入葱姜蒜翻炒', '倒入碗汁快速翻炒', '最后加入花生米翻匀出锅'],
  },
  {
    name: '红烧肉',
    description: '肥而不腻、入口即化的经典家常菜',
    category: '中式',
    cookTime: '90分钟',
    ingredients: ['五花肉', '酱油', '冰糖', '料酒', '八角', '桂皮', '葱', '姜'],
    steps: ['五花肉切块焯水去血沫', '锅中放少许油，加冰糖炒出焦糖色', '放入肉块翻炒上色', '加入料酒、酱油、八角、桂皮', '加开水没过肉块', '大火烧开后转小火炖60分钟', '大火收汁至浓稠即可'],
  },
  {
    name: '番茄炒蛋',
    description: '简单快手的国民家常菜，酸甜可口',
    category: '中式',
    cookTime: '15分钟',
    ingredients: ['番茄', '鸡蛋', '葱', '盐', '糖', '油'],
    steps: ['番茄切块，鸡蛋打散', '热锅下油，倒入蛋液炒至凝固盛出', '锅中再加油，下番茄块炒出汁', '加少许糖和盐调味', '倒回炒好的鸡蛋翻匀', '撒上葱花出锅'],
  },
  {
    name: '麻婆豆腐',
    description: '麻辣鲜香的四川名菜，豆腐嫩滑入味',
    category: '中式',
    cookTime: '25分钟',
    ingredients: ['豆腐', '猪肉末', '豆瓣酱', '花椒粉', '辣椒粉', '葱', '姜', '蒜', '酱油', '淀粉'],
    steps: ['豆腐切块焯水备用', '热锅下油，炒香肉末', '加入豆瓣酱炒出红油', '下姜蒜末翻炒', '加水烧开，放入豆腐', '小火煮5分钟入味', '勾薄芡，撒花椒粉和葱花'],
  },
  {
    name: '清蒸鱼',
    description: '保留鱼的原汁原味，鲜嫩无比',
    category: '中式',
    cookTime: '20分钟',
    ingredients: ['鲈鱼', '葱', '姜', '蒸鱼豉油', '料酒', '盐', '油'],
    steps: ['鱼洗净，两面划刀，抹盐和料酒', '盘底铺葱姜，放上鱼', '水开后大火蒸8-10分钟', '倒掉蒸出的汤汁', '鱼身铺上葱丝姜丝', '淋上蒸鱼豉油', '浇上热油激香'],
  },
  {
    name: '意大利肉酱面',
    description: '浓郁的番茄肉酱搭配弹牙意面，经典西式美味',
    category: '西式',
    cookTime: '45分钟',
    ingredients: ['意面', '牛肉末', '番茄', '洋葱', '蒜', '番茄酱', '罗勒', '橄榄油', '盐', '黑胡椒'],
    steps: ['大锅水烧开，加盐煮意面至al dente', '另起锅加橄榄油，炒香洋葱和蒜', '加入牛肉末炒散', '加入番茄块和番茄酱', '小火炖煮20分钟', '加盐和黑胡椒调味', '将肉酱浇在煮好的意面上，撒罗勒叶'],
  },
  {
    name: '凯撒沙拉',
    description: '清爽的罗马生菜配自制凯撒酱和帕玛森芝士',
    category: '西式',
    cookTime: '15分钟',
    ingredients: ['罗马生菜', '帕玛森芝士', '面包丁', '鸡蛋', '柠檬', '蒜', '橄榄油', '鳀鱼', '黑胡椒'],
    steps: ['制作凯撒酱：蛋黄、柠檬汁、蒜泥、鳀鱼打匀', '缓慢加入橄榄油乳化', '加盐和黑胡椒调味', '生菜洗净撕成大片', '加入面包丁和刨好的帕玛森芝士', '淋上凯撒酱拌匀', '顶部再撒芝士碎和黑胡椒'],
  },
  {
    name: '法式洋葱汤',
    description: '浓郁的洋葱甜味配上焦香芝士面包，法式经典',
    category: '汤羹',
    cookTime: '60分钟',
    ingredients: ['洋葱', '黄油', '面粉', '白葡萄酒', '牛肉高汤', '法棍面包', '格鲁耶尔芝士', '盐', '黑胡椒'],
    steps: ['洋葱切薄片', '锅中融化黄油，小火慢炒洋葱至深褐色约30分钟', '撒入面粉炒匀', '倒入白葡萄酒去底', '加入牛肉高汤，小火炖15分钟', '法棍切片烤至金黄', '汤盛入烤碗，放面包片铺芝士', '入烤箱烤至芝士融化起泡'],
  },
  {
    name: '提拉米苏',
    description: '意大利经典甜品，咖啡与马斯卡彭的浪漫邂逅',
    category: '甜品',
    cookTime: '40分钟',
    ingredients: ['马斯卡彭芝士', '手指饼干', '浓缩咖啡', '鸡蛋', '糖', '可可粉', '朗姆酒'],
    steps: ['蛋黄加糖打发至浓稠', '加入马斯卡彭芝士拌匀', '蛋白打发至硬性发泡，轻柔拌入', '咖啡加朗姆酒混合', '手指饼干快速蘸咖啡液', '铺一层饼干，抹一层芝士糊', '重复铺层，冷藏4小时以上', '食用前撒可可粉'],
  },
  {
    name: '芒果布丁',
    description: '嫩滑香甜的热带风情甜品',
    category: '甜品',
    cookTime: '20分钟',
    ingredients: ['芒果', '牛奶', '淡奶油', '吉利丁片', '糖'],
    steps: ['吉利丁片冷水泡软', '芒果去皮切丁，部分打成泥', '牛奶和淡奶油加热，加糖搅拌融化', '加入泡软的吉利丁片搅匀', '稍凉后加入芒果泥拌匀', '倒入模具，放入芒果丁', '冷藏3小时至凝固'],
  },
  {
    name: '酸辣汤',
    description: '酸辣开胃的经典中式汤品',
    category: '汤羹',
    cookTime: '25分钟',
    ingredients: ['豆腐', '木耳', '鸡蛋', '胡萝卜', '香菇', '醋', '白胡椒', '淀粉', '葱', '酱油'],
    steps: ['豆腐、木耳、胡萝卜、香菇切丝', '锅中烧水，放入所有丝状材料', '加酱油调色', '煮开后加醋和白胡椒调味', '勾薄芡使汤浓稠', '打入蛋花', '撒葱花出锅'],
  },
  {
    name: '牛排',
    description: '煎至完美的西式牛排，外焦里嫩',
    category: '西式',
    cookTime: '20分钟',
    ingredients: ['牛排', '盐', '黑胡椒', '黄油', '蒜', '迷迭香', '橄榄油'],
    steps: ['牛排提前30分钟回温，擦干水分', '两面撒盐和黑胡椒', '热锅加橄榄油至冒烟', '放入牛排煎2-3分钟', '翻面继续煎2分钟', '加黄油、蒜和迷迭香，用黄油反复浇淋', '取出静置5分钟后切片'],
  },
  {
    name: '蛋炒饭',
    description: '最简单也最考验功力的家常炒饭',
    category: '中式',
    cookTime: '10分钟',
    ingredients: ['米饭', '鸡蛋', '葱', '盐', '油', '酱油'],
    steps: ['隔夜米饭打散备用', '鸡蛋打散', '热锅下油，倒入蛋液', '蛋液半凝固时加入米饭', '大火快速翻炒，使米饭粒粒分明', '沿锅边淋入少许酱油', '撒葱花翻匀出锅'],
  },
  {
    name: '奶油蘑菇汤',
    description: '浓郁丝滑的经典西式浓汤',
    category: '汤羹',
    cookTime: '30分钟',
    ingredients: ['蘑菇', '洋葱', '黄油', '面粉', '牛奶', '淡奶油', '盐', '白胡椒', '百里香'],
    steps: ['蘑菇切片，洋葱切丁', '锅中融化黄油，炒香洋葱', '加入蘑菇炒至出水', '撒入面粉炒匀', '缓慢加入牛奶搅拌均匀', '小火煮10分钟至浓稠', '加淡奶油、盐、白胡椒和百里香调味'],
  },
  {
    name: '糖醋排骨',
    description: '酸甜可口的经典中式菜肴',
    category: '中式',
    cookTime: '40分钟',
    ingredients: ['排骨', '酱油', '醋', '糖', '料酒', '姜', '葱', '八角', '淀粉'],
    steps: ['排骨斩块焯水', '锅中放油，加糖炒糖色', '放入排骨翻炒上色', '加料酒、酱油、八角、葱姜', '加水没过排骨，大火烧开', '转小火炖30分钟', '加醋调味，大火收汁', '勾薄芡使酱汁裹匀'],
  },
  {
    name: '巧克力熔岩蛋糕',
    description: '切开流心的巧克力诱惑',
    category: '甜品',
    cookTime: '25分钟',
    ingredients: ['黑巧克力', '黄油', '鸡蛋', '糖', '面粉', '朗姆酒'],
    steps: ['黑巧克力和黄油隔水融化', '鸡蛋加糖打发', '将巧克力液倒入蛋糊中拌匀', '筛入面粉轻轻拌匀', '加入少许朗姆酒', '倒入抹油撒粉的模具中', '200度烤箱烤12分钟', '脱模趁热食用'],
  },
  {
    name: '烤鸡翅',
    description: '外皮焦香、内里多汁的美味鸡翅',
    category: '西式',
    cookTime: '35分钟',
    ingredients: ['鸡翅', '酱油', '蜂蜜', '蒜', '姜', '黑胡椒', '盐', '橄榄油'],
    steps: ['鸡翅划刀方便入味', '加酱油、蜂蜜、蒜泥、姜末腌制2小时', '烤盘铺锡纸，刷橄榄油', '鸡翅排放在烤盘上', '200度烤25分钟', '中途翻面一次', '最后刷蜂蜜水烤5分钟上色'],
  },
  {
    name: '紫菜蛋花汤',
    description: '简单快速的家常汤品，鲜美营养',
    category: '汤羹',
    cookTime: '10分钟',
    ingredients: ['紫菜', '鸡蛋', '葱', '盐', '香油', '虾皮'],
    steps: ['紫菜撕成小片', '锅中烧水，放入紫菜和虾皮', '煮开后加盐调味', '打入蛋花', '关火淋香油', '撒葱花即可'],
  },
  {
    name: '披萨',
    description: '自制意式薄底披萨，料多味美',
    category: '西式',
    cookTime: '50分钟',
    ingredients: ['面粉', '酵母', '番茄', '芝士', '洋葱', '青椒', '火腿', '橄榄油', '盐', '罗勒'],
    steps: ['面粉加酵母、盐、橄榄油和水和面', '揉至光滑，发酵30分钟', '擀成薄圆饼状', '抹番茄酱，撒罗勒', '铺上芝士和各种配料', '放入预热220度的烤箱', '烤15分钟至芝士融化饼底金黄'],
  },
  {
    name: '红豆沙',
    description: '绵密香甜的传统中式甜品',
    category: '甜品',
    cookTime: '60分钟',
    ingredients: ['红豆', '糖', '陈皮', '桂花'],
    steps: ['红豆提前浸泡4小时', '加水和陈皮大火烧开', '转小火煮40分钟至豆烂', '加入糖搅拌至融化', '继续煮5分钟收浓', '盛碗撒上桂花'],
  },
];

function generateRecipes(count: number): Recipe[] {
  const recipes: Recipe[] = [];
  for (let i = 0; i < count; i++) {
    const template = sampleRecipes[i % sampleRecipes.length];
    const recipe: Recipe = {
      id: uuidv4(),
      name: count > sampleRecipes.length ? `${template.name} v${Math.floor(i / sampleRecipes.length) + 1}` : template.name,
      description: template.description,
      category: template.category,
      cookTime: template.cookTime,
      ingredients: [...template.ingredients],
      steps: [...template.steps],
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      ratingCount: Math.floor(Math.random() * 50) + 1,
      favorite: false,
      notes: '',
      gradient: gradients[i % gradients.length],
    };
    recipes.push(recipe);
  }
  return recipes;
}

let db: Awaited<ReturnType<typeof JSONFilePreset<DbSchema>>> | null = null;

export async function getDb() {
  if (db) return db;
  const defaultData: DbSchema = { recipes: generateRecipes(100) };
  db = await JSONFilePreset<DbSchema>(join(__dirname, 'db.json'), defaultData);
  await db.write();
  return db;
}
