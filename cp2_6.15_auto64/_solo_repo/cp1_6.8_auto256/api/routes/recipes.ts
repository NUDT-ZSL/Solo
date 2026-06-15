import { Router, type Request, type Response } from 'express';
import type { Recipe } from '../../shared/types.js';

const router = Router();

const now = new Date();
const futureDate = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const pastDate = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const recipes: Recipe[] = [
  {
    id: '1',
    title: '外婆红烧肉',
    tags: ['家常菜', '硬菜', '经典'],
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20in%20brown%20sauce%20on%20white%20plate%20warm%20lighting%20food%20photography&image_size=landscape_4_3',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20close%20up%20glistening%20sauce%20chinese%20food%20photography%20warm%20tones&image_size=landscape_16_9',
    ingredients: ['五花肉 500g', '冰糖 30g', '生抽 2勺', '老抽 1勺', '料酒 2勺', '姜片 5片', '八角 2个', '桂皮 1小段', '香叶 2片'],
    steps: [
      '五花肉切3cm方块，冷水下锅焯水去腥，捞出沥干',
      '锅中放少许油，小火煸炒冰糖至琥珀色起大泡',
      '放入肉块快速翻炒上色，使每块肉均匀裹上糖色',
      '加入姜片、八角、桂皮、香叶炒出香味',
      '倒入料酒、生抽、老抽翻炒均匀',
      '加入没过肉的热水，大火烧开后转小火炖60分钟',
      '大火收汁至汤汁浓稠，肉块油亮即可出锅'
    ],
    unlockDate: pastDate(30),
    isPublic: true,
    createdAt: pastDate(60)
  },
  {
    id: '2',
    title: '妈妈的手工水饺',
    tags: ['面食', '家常', '温暖'],
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20dumplings%20on%20bamboo%20steamer%20warm%20lighting%20homestyle%20food%20photography&image_size=landscape_4_3',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handmade%20dumplings%20close%20up%20steam%20rising%20chinese%20food%20photography%20cozy%20atmosphere&image_size=landscape_16_9',
    ingredients: ['面粉 500g', '猪肉馅 400g', '大葱 2根', '姜末 适量', '生抽 2勺', '香油 1勺', '盐 适量', '胡椒粉 少许'],
    steps: [
      '面粉加温水揉成光滑面团，盖湿布醒30分钟',
      '猪肉馅中加入生抽、盐、胡椒粉顺一个方向搅拌上劲',
      '大葱切末，加香油拌匀后加入肉馅',
      '面团搓长条，切小剂子，擀成中间厚边缘薄的饺子皮',
      '包入馅料，对折捏紧，两端向中间弯成月牙形',
      '大火烧开水，下饺子轻推防粘底，三开三点水',
      '饺子全部浮起膨胀，即可捞出装盘'
    ],
    unlockDate: pastDate(15),
    isPublic: true,
    createdAt: pastDate(45)
  },
  {
    id: '3',
    title: '奶奶的糖醋排骨',
    tags: ['经典', '酸甜', '硬菜'],
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sweet%20and%20sour%20ribs%20glazed%20on%20plate%20chinese%20food%20warm%20lighting%20photography&image_size=landscape_4_3',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=close%20up%20sweet%20sour%20pork%20ribs%20glossy%20sauce%20chinese%20cuisine%20warm%20food%20photography&image_size=landscape_16_9',
    ingredients: ['小排 500g', '白砂糖 3勺', '醋 4勺', '生抽 2勺', '料酒 2勺', '番茄酱 1勺', '姜片 3片', '白芝麻 适量'],
    steps: [
      '小排斩小段，冷水下锅焯水去血沫，捞出洗净',
      '锅中放油，放入排骨煎至两面金黄',
      '加入姜片、料酒翻炒去腥',
      '调入生抽、白砂糖、醋、番茄酱翻炒均匀',
      '加入没过排骨的热水，大火烧开转小火炖40分钟',
      '大火收汁至浓稠，撒上白芝麻出锅'
    ],
    unlockDate: futureDate(2),
    isPublic: false,
    createdAt: pastDate(10)
  },
  {
    id: '4',
    title: '爷爷的葱油拌面',
    tags: ['面食', '快手', '怀旧'],
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=scallion%20oil%20noodles%20in%20bowl%20chinese%20food%20warm%20lighting%20simple%20photography&image_size=landscape_4_3',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=close%20up%20scallion%20oil%20noodles%20garnished%20with%20green%20onions%20warm%20food%20photography&image_size=landscape_16_9',
    ingredients: ['细面条 200g', '小葱 1把', '生抽 3勺', '老抽 1勺', '白砂糖 1勺', '食用油 适量'],
    steps: [
      '小葱洗净切段，葱白葱绿分开',
      '锅中多放油，小火慢慢煎葱段至焦黄酥脆，捞出葱油备用',
      '用葱油调汁：生抽、老抽、白砂糖混合',
      '面条煮至刚好断生，捞出沥干',
      '趁热浇上葱油汁，撒上焦葱段拌匀即可'
    ],
    unlockDate: futureDate(1),
    isPublic: false,
    createdAt: pastDate(5)
  },
  {
    id: '5',
    title: '老宅秘制酱牛肉',
    tags: ['凉菜', '秘方', '节庆'],
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sliced%20braised%20beef%20on%20plate%20chinese%20cold%20dish%20warm%20lighting%20photography&image_size=landscape_4_3',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=thinly%20sliced%20spiced%20beef%20close%20up%20chinese%20food%20warm%20photography%20elegant&image_size=landscape_16_9',
    ingredients: ['牛腱子 1000g', '生抽 半碗', '老抽 3勺', '甜面酱 2勺', '黄酱 2勺', '冰糖 20g', '料酒 3勺', '香料包 1个（花椒、八角、桂皮、香叶、草果、丁香）', '姜片 5片', '大葱 2段'],
    steps: [
      '牛腱子整块冷水浸泡4小时去血水，中间换水2次',
      '用竹签在肉上扎孔便于入味，抹上甜面酱腌制过夜',
      '冷水下锅焯水，撇去浮沫捞出洗净',
      '老汤或清水加所有调料和香料包烧开，放入牛肉',
      '大火烧开转小火炖2.5小时至筷子可扎透',
      '关火后在汤中浸泡4小时以上使其充分入味',
      '捞出沥水，冰箱冷藏后切薄片摆盘'
    ],
    unlockDate: futureDate(90),
    isPublic: false,
    createdAt: pastDate(3)
  },
  {
    id: '6',
    title: '古法桂花糕',
    tags: ['甜品', '古方', '节庆'],
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=osmanthus%20cake%20on%20ceramic%20plate%20chinese%20dessert%20warm%20lighting%20photography&image_size=landscape_4_3',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=close%20up%20chinese%20osmanthus%20cake%20golden%20yellow%20delicate%20warm%20food%20photography&image_size=landscape_16_9',
    ingredients: ['糯米粉 200g', '粘米粉 80g', '白糖 80g', '干桂花 2勺', '桂花蜜 3勺', '清水 适量'],
    steps: [
      '糯米粉和粘米粉混合，加入白糖拌匀',
      '分次加入清水揉成软硬适中的面团',
      '面团过筛成细腻粉粒，加入干桂花轻轻拌匀',
      '模具刷油，将粉粒松散地填入模具，不要压实',
      '蒸锅水烧开，大火蒸30分钟',
      '出锅后趁热刷上一层桂花蜜，晾凉脱模切件'
    ],
    unlockDate: futureDate(90),
    isPublic: false,
    createdAt: pastDate(1)
  }
];

router.get('/', (_req: Request, res: Response) => {
  res.json(recipes);
});

router.get('/:id', (req: Request, res: Response) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(recipe);
});

export default router;
