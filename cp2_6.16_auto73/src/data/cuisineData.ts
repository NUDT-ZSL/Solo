export interface Dish {
  id: string;
  name: string;
  description: string;
  gradient: { from: string; to: string };
  origin: string;
  drinkPairing: string;
  sideDish: string;
}

export interface Region {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  position: { x: number; y: number };
  dishes: Dish[];
}

export interface Pairing {
  id: string;
  items: string[];
  description: string;
  fullDescription: string;
}

export const regions: Region[] = [
  {
    id: 'italy',
    name: '意大利',
    nameEn: 'Italy',
    color: '#e63946',
    position: { x: 48, y: 35 },
    dishes: [
      {
        id: 'italy-1',
        name: '玛格丽特披萨',
        description: '经典那不勒斯风味，番茄、马苏里拉奶酪与罗勒的完美结合',
        gradient: { from: '#ff6b6b', to: '#ffd93d' },
        origin: '意大利南部那不勒斯地区，被誉为披萨的故乡',
        drinkPairing: '基安蒂红酒',
        sideDish: '意式橄榄拼盘'
      },
      {
        id: 'italy-2',
        name: '墨鱼面',
        description: '威尼斯传统美食，墨鱼汁赋予面条深邃的黑色与鲜美',
        gradient: { from: '#2c3e50', to: '#3498db' },
        origin: '意大利威尼斯水城，渔民的传统料理',
        drinkPairing: '灰皮诺白葡萄酒',
        sideDish: '蒜蓉面包'
      },
      {
        id: 'italy-3',
        name: '提拉米苏',
        description: '意式经典甜点，咖啡与马斯卡彭奶酪的浪漫邂逅',
        gradient: { from: '#6f4e37', to: '#d4a574' },
        origin: '意大利威尼托地区，传说起源于特雷维索',
        drinkPairing: '阿玛罗尼甜酒',
        sideDish: '意式浓缩咖啡'
      },
      {
        id: 'italy-4',
        name: '千层面',
        description: '博洛尼亚经典，层层叠叠的面皮与肉酱的完美交融',
        gradient: { from: '#e74c3c', to: '#f39c12' },
        origin: '意大利艾米利亚-罗马涅大区',
        drinkPairing: '巴罗洛红酒',
        sideDish: '凯撒沙拉'
      }
    ]
  },
  {
    id: 'mexico',
    name: '墨西哥',
    nameEn: 'Mexico',
    color: '#2a9d8f',
    position: { x: 25, y: 55 },
    dishes: [
      {
        id: 'mexico-1',
        name: '塔可',
        description: '墨西哥国民美食，玉米饼包裹各种馅料的街头美味',
        gradient: { from: '#e76f51', to: '#f4a261' },
        origin: '墨西哥全境，阿兹特克文明的传统食物',
        drinkPairing: '玛格丽特鸡尾酒',
        sideDish: '墨西哥玉米片配鳄梨酱'
      },
      {
        id: 'mexico-2',
        name: '恩奇拉达',
        description: '玉米卷饼覆盖辣酱与奶酪的经典烤制料理',
        gradient: { from: '#d62828', to: '#fcbf49' },
        origin: '墨西哥中部地区',
        drinkPairing: '龙舌兰酒',
        sideDish: '墨西哥米饭'
      },
      {
        id: 'mexico-3',
        name: '墨西哥烤肉',
        description: '慢烤腌制猪肉，配菠萝的传统烧烤',
        gradient: { from: '#bc6c25', to: '#dda15e' },
        origin: '墨西哥尤卡坦半岛',
        drinkPairing: '墨西哥啤酒',
        sideDish: '烤仙人掌'
      },
      {
        id: 'mexico-4',
        name: '摩尔酱',
        description: '复杂香料与巧克力融合的神秘酱汁',
        gradient: { from: '#6c584c', to: '#a98467' },
        origin: '墨西哥瓦哈卡州，被誉为墨西哥国酱',
        drinkPairing: '梅斯卡尔酒',
        sideDish: '墨西哥红豆饭'
      }
    ]
  },
  {
    id: 'japan',
    name: '日本',
    nameEn: 'Japan',
    color: '#f4a261',
    position: { x: 82, y: 38 },
    dishes: [
      {
        id: 'japan-1',
        name: '寿司',
        description: '醋饭与新鲜鱼料的艺术结合，日式料理的代表',
        gradient: { from: '#ff9f1c', to: '#2ec4b6' },
        origin: '日本东京地区，江户时代发展而来',
        drinkPairing: '日本清酒',
        sideDish: '味噌汤'
      },
      {
        id: 'japan-2',
        name: '拉面',
        description: '浓郁汤底与劲道面条的温暖治愈',
        gradient: { from: '#f95738', to: '#f3de2c' },
        origin: '日本福冈博多，中国面条的日本创新',
        drinkPairing: '朝日啤酒',
        sideDish: '日式煎饺'
      },
      {
        id: 'japan-3',
        name: '天妇罗',
        description: '薄脆面衣包裹鲜嫩食材的炸物料理',
        gradient: { from: '#f7b267', to: '#f4845f' },
        origin: '日本东京，源自葡萄牙传教士的油炸技法',
        drinkPairing: '獭祭清酒',
        sideDish: '腌萝卜'
      },
      {
        id: 'japan-4',
        name: '怀石料理',
        description: '日式茶道中的精致多道料理，美学与味觉的极致',
        gradient: { from: '#8d99ae', to: '#edf2f4' },
        origin: '日本京都，禅宗茶道文化的产物',
        drinkPairing: '宇治抹茶',
        sideDish: '日式腌菜拼盘'
      }
    ]
  },
  {
    id: 'india',
    name: '印度',
    nameEn: 'India',
    color: '#ff9f1c',
    position: { x: 65, y: 48 },
    dishes: [
      {
        id: 'india-1',
        name: '咖喱鸡',
        description: '多种香料炖煮的浓郁鸡肉咖喱',
        gradient: { from: '#fca311', to: '#e71d36' },
        origin: '印度北部旁遮普地区',
        drinkPairing: '印度奶茶',
        sideDish: '印度薄饼'
      },
      {
        id: 'india-2',
        name: '比尔亚尼焖饭',
        description: '香料米饭与肉类的分层焖制料理',
        gradient: { from: '#ffb703', to: '#fb8500' },
        origin: '印度海得拉巴，莫卧儿帝国宫廷菜',
        drinkPairing: '印度酸奶饮料',
        sideDish: '酸辣酱拼盘'
      },
      {
        id: 'india-3',
        name: '玛莎拉薄饼',
        description: '酥脆薄饼搭配马萨拉调味料的街头美食',
        gradient: { from: '#d62828', to: '#f77f00' },
        origin: '印度孟买街头',
        drinkPairing: '柠檬汽水',
        sideDish: '印度土豆球'
      },
      {
        id: 'india-4',
        name: '唐杜里烤鸡',
        description: '酸奶腌制后泥炉烤制的香辣烤鸡',
        gradient: { from: '#dd6e42', to: '#e8dab2' },
        origin: '印度旁遮普地区，传统泥炉烹饪',
        drinkPairing: '印度啤酒',
        sideDish: '薄荷酸奶酱'
      }
    ]
  },
  {
    id: 'france',
    name: '法国',
    nameEn: 'France',
    color: '#3a86ff',
    position: { x: 46, y: 32 },
    dishes: [
      {
        id: 'france-1',
        name: '法式洋葱汤',
        description: '慢煮焦糖洋葱配格鲁耶尔奶酪的经典汤品',
        gradient: { from: '#d5bdaf', to: '#f5ebe0' },
        origin: '法国巴黎，传统家常菜',
        drinkPairing: '白葡萄酒',
        sideDish: '法棍面包'
      },
      {
        id: 'france-2',
        name: '鹅肝酱',
        description: '奢华法式前菜，细腻如丝的鹅肝',
        gradient: { from: '#f4a261', to: '#e9c46a' },
        origin: '法国西南部佩里戈尔地区',
        drinkPairing: '苏玳甜白葡萄酒',
        sideDish: '无花果酱吐司'
      },
      {
        id: 'france-3',
        name: '勃艮第红酒炖牛肉',
        description: '红酒慢炖的 tender 牛肉，法餐经典',
        gradient: { from: '#7d0633', to: '#c9184a' },
        origin: '法国勃艮第地区',
        drinkPairing: '勃艮第红酒',
        sideDish: '黄油土豆'
      },
      {
        id: 'france-4',
        name: '马卡龙',
        description: '精致法式甜点，外酥内软的杏仁小圆饼',
        gradient: { from: '#ffb3c1', to: '#ff8fa3' },
        origin: '法国巴黎，拉杜丽甜品店发扬光大',
        drinkPairing: '香槟',
        sideDish: '英式下午茶'
      }
    ]
  },
  {
    id: 'thailand',
    name: '泰国',
    nameEn: 'Thailand',
    color: '#e63946',
    position: { x: 75, y: 55 },
    dishes: [
      {
        id: 'thailand-1',
        name: '冬阴功汤',
        description: '酸辣鲜香的泰式国汤，虾与香茅的完美融合',
        gradient: { from: '#ff0054', to: '#ffbd00' },
        origin: '泰国中部地区',
        drinkPairing: '泰式冰茶',
        sideDish: '泰国茉莉香米'
      },
      {
        id: 'thailand-2',
        name: '泰式炒河粉',
        description: '甜酸咸辣平衡的街头炒粉',
        gradient: { from: '#f77f00', to: '#fcbf49' },
        origin: '泰国曼谷街头美食代表',
        drinkPairing: '大象啤酒',
        sideDish: '青木瓜沙拉'
      },
      {
        id: 'thailand-3',
        name: '绿咖喱鸡',
        description: '新鲜青辣椒与椰奶调制的芳香咖喱',
        gradient: { from: '#80b918', to: '#aacc00' },
        origin: '泰国中部，皇家菜系',
        drinkPairing: '椰子汁',
        sideDish: '泰式芒果糯米饭'
      },
      {
        id: 'thailand-4',
        name: '泰式烤肉串',
        description: '香茅腌制的烤肉串配花生酱',
        gradient: { from: '#bc6c25', to: '#fefae0' },
        origin: '泰国北部清迈地区',
        drinkPairing: '泰国威士忌苏打',
        sideDish: '糯米团'
      }
    ]
  },
  {
    id: 'morocco',
    name: '摩洛哥',
    nameEn: 'Morocco',
    color: '#9b5de5',
    position: { x: 45, y: 50 },
    dishes: [
      {
        id: 'morocco-1',
        name: '塔吉锅',
        description: '锥形锅盖慢炖的香料炖菜，摩洛哥国菜',
        gradient: { from: '#774936', to: '#edc4b3' },
        origin: '摩洛哥全境，柏柏尔人传统烹饪方式',
        drinkPairing: '摩洛哥薄荷茶',
        sideDish: '古斯米'
      },
      {
        id: 'morocco-2',
        name: '哈里拉汤',
        description: '斋月期间的传统浓汤，扁豆与番茄',
        gradient: { from: '#d62828', to: '#f77f00' },
        origin: '摩洛哥斋月传统食品',
        drinkPairing: '玫瑰水',
        sideDish: '枣椰'
      },
      {
        id: 'morocco-3',
        name: '巴斯蒂亚派',
        description: '甜味与咸味交融的千层酥皮派',
        gradient: { from: '#ddb892', to: '#b08968' },
        origin: '摩洛哥非斯城',
        drinkPairing: '摩洛哥香槟',
        sideDish: '腌柠檬沙拉'
      },
      {
        id: 'morocco-4',
        name: '摩洛哥烤全羊',
        description: '整只慢烤的香料羊肉，节日盛宴',
        gradient: { from: '#9c6644', to: '#ddb892' },
        origin: '摩洛哥南部沙漠地区',
        drinkPairing: '椰枣酒',
        sideDish: '烤蔬菜拼盘'
      }
    ]
  },
  {
    id: 'brazil',
    name: '巴西',
    nameEn: 'Brazil',
    color: '#06d6a0',
    position: { x: 32, y: 68 },
    dishes: [
      {
        id: 'brazil-1',
        name: '巴西烤肉',
        description: '炭火慢烤的精选牛肉，巴西国菜',
        gradient: { from: '#bc6c25', to: '#dda15e' },
        origin: '巴西南部里约格朗德州，高乔人传统',
        drinkPairing: '巴西甘蔗酒',
        sideDish: '法式炸薯条'
      },
      {
        id: 'brazil-2',
        name: '黑豆饭',
        description: '黑豆与多种肉类炖煮的国民料理',
        gradient: { from: '#3d405b', to: '#81b29a' },
        origin: '巴西里约热内卢，非洲奴隶的创造',
        drinkPairing: '巴西啤酒',
        sideDish: '木薯粉'
      },
      {
        id: 'brazil-3',
        name: '巴西莓碗',
        description: '亚马逊超级食物的健康美味',
        gradient: { from: '#5a189a', to: '#9d4edd' },
        origin: '巴西亚马逊雨林原住民传统',
        drinkPairing: '巴西柠檬水',
        sideDish: '格兰诺拉麦片'
      },
      {
        id: 'brazil-4',
        name: '炸鸡肉包',
        description: '酥脆外皮包裹芝士鸡肉的街头小吃',
        gradient: { from: '#ffd166', to: '#ef476f' },
        origin: '巴西圣保罗街头',
        drinkPairing: '瓜拉纳汽水',
        sideDish: '椰丝布丁'
      }
    ]
  }
];

export const crossCulturePairings: Pairing[] = [
  {
    id: 'pair-1',
    items: ['意大利墨鱼面', '日本清酒', '巴西烤串'],
    description: '地中海鲜美 × 东瀛清冽 × 南美热情',
    fullDescription: '意大利墨鱼面的海鲜鲜味与日本清酒的清爽口感形成奇妙对比，再来一串巴西烤肉增添热情风味。墨鱼汁的深邃与清酒的纯净相互映衬，最后以烤肉的烟熏味收尾，带来层次丰富的味觉旅程。'
  },
  {
    id: 'pair-2',
    items: ['墨西哥塔可', '泰国冬阴功汤', '法国马卡龙'],
    description: '拉美火辣 × 东南亚酸辣 × 法式甜蜜',
    fullDescription: '墨西哥塔可的热情火辣开启味蕾，泰国冬阴功汤的酸辣鲜香持续刺激，最后以法国马卡龙的精致甜美完美收尾。三种完全不同的风味在口中碰撞，产生令人惊喜的和谐。'
  },
  {
    id: 'pair-3',
    items: ['印度咖喱鸡', '摩洛哥薄荷茶', '日本天妇罗'],
    description: '南亚浓郁 × 北非清新 × 东瀛酥脆',
    fullDescription: '印度咖喱的香料轰炸之后，用摩洛哥薄荷茶的清凉来中和，再搭配日本天妇罗的酥脆口感。浓郁与清新、软嫩与酥脆的对比，创造出丰富的味觉层次。'
  },
  {
    id: 'pair-4',
    items: ['法国鹅肝酱', '巴西莓碗', '泰国绿咖喱鸡'],
    description: '欧式奢华 × 南美健康 × 东南亚芳香',
    fullDescription: '法国鹅肝酱的奢华细腻开场，巴西莓碗的清新健康作为中场，泰国绿咖喱的椰香芳香收尾。从奢华到健康再到浓郁，三种风格迥异的美食带来意想不到的味觉旅程。'
  },
  {
    id: 'pair-5',
    items: ['日本寿司', '意大利提拉米苏', '墨西哥烤肉'],
    description: '东瀛精致 × 意式甜蜜 × 拉美豪放',
    fullDescription: '日本寿司的新鲜精致作为前菜，意大利提拉米苏的甜美作为中场甜点，墨西哥烤肉的豪放作为主菜压轴。日意墨三国风味的奇妙组合，带来从清淡到浓郁的完整体验。'
  },
  {
    id: 'pair-6',
    items: ['摩洛哥塔吉锅', '法国勃艮第红酒炖牛肉', '巴西黑豆饭'],
    description: '北非香料 × 法式经典 × 南美朴实',
    fullDescription: '摩洛哥塔吉锅的异域香料开场，法国红酒炖牛肉的经典醇厚作为主菜，巴西黑豆饭的朴实温暖收尾。三种慢炖料理的跨文化对话，每一口都充满故事。'
  },
  {
    id: 'pair-7',
    items: ['泰国泰式炒河粉', '印度比尔亚尼焖饭', '意大利千层面'],
    description: '东南亚街头 × 南亚宫廷 × 地中海家常',
    fullDescription: '泰国街头炒粉的锅气香气，印度比尔亚尼饭的宫廷奢华，意大利千层面的家常温暖。三种主食的跨文化碰撞，从街头到宫廷再到家庭的完整美食地图。'
  },
  {
    id: 'pair-8',
    items: ['墨西哥摩尔酱', '日本怀石料理', '摩洛哥巴斯蒂亚派', '法国马卡龙'],
    description: '拉美神秘 × 东瀛美学 × 北非传奇 × 法式精致',
    fullDescription: '四道完全不同文化背景的料理组成的豪华盛宴：墨西哥摩尔酱的神秘巧克力风味、日本怀石料理的禅意美学、摩洛哥巴斯蒂亚派的甜咸交织、法国马卡龙的精致甜美。一场真正的环球美食之旅。'
  }
];

export function searchRegions(keyword: string): Region[] {
  if (!keyword.trim()) return [];
  const lower = keyword.toLowerCase().trim();
  return regions.filter(region => 
    region.name.toLowerCase().includes(lower) ||
    region.nameEn.toLowerCase().includes(lower) ||
    region.dishes.some(dish => 
      dish.name.toLowerCase().includes(lower) ||
      dish.description.toLowerCase().includes(lower)
    )
  );
}

export function getRandomPairings(count: number = 3): Pairing[] {
  const shuffled = [...crossCulturePairings].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
