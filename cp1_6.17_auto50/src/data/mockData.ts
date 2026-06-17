export interface Artwork {
  id: string;
  title: string;
  shortTitle: string;
  thumbnail: string;
  description: string;
  author: {
    name: string;
    avatar: string;
    bio: string;
  };
  styles: string[];
}

export interface Commission {
  id: string;
  artworkId: string;
  artworkTitle: string;
  description: string;
  budget: number;
  deadline: string;
  status: CommissionStatus;
  progress: number;
  createdAt: string;
}

export type CommissionStatus = 'pending' | 'negotiating' | 'creating' | 'revising' | 'completed';

export interface Message {
  id: string;
  commissionId: string;
  sender: 'client' | 'designer';
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: 'status' | 'message';
}

export const styleTags = [
  '水彩', '油画', '扁平插画', '日系', '赛博朋克',
  '极简', '复古', '卡通', '写实', '国潮'
];

export const statusLabels: Record<CommissionStatus, string> = {
  pending: '待接洽',
  negotiating: '协商中',
  creating: '创作中',
  revising: '修改中',
  completed: '已完成'
};

export const mockArtworks: Artwork[] = [
  {
    id: 'a1',
    title: '春日花语 · 樱花与紫藤的水彩诗',
    shortTitle: '春日花语',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20painting%20of%20spring%20flowers%20cherry%20blossom%20soft%20pastel%20colors%20artistic&image_size=square_hd',
    description: '以樱花与紫藤为主题，用水彩晕染出春日花瓣轻盈飘落的瞬间，柔和的粉紫色调营造出梦幻而治愈的氛围。',
    author: {
      name: '林雨桐',
      avatar: 'https://i.pravatar.cc/80?img=47',
      bio: '自由插画师，毕业于中国美术学院，擅长水彩与日系风格，作品多见于杂志封面与绘本插画。热爱捕捉自然光影中那些稍纵即逝的温柔。'
    },
    styles: ['水彩', '日系']
  },
  {
    id: 'a2',
    title: '城市霓虹 · 赛博朋克未来都市夜景',
    shortTitle: '城市霓虹',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cyberpunk%20neon%20cityscape%20night%20futuristic%20digital%20art&image_size=portrait_4_3',
    description: '赛博朋克风格的未来城市场景，霓虹灯光在雨夜中折射出迷幻的色彩，高楼林立间透着科技与冷峻的美感。',
    author: {
      name: '陈墨白',
      avatar: 'https://i.pravatar.cc/80?img=12',
      bio: '概念设计师，曾参与多款游戏与影视项目的美术设计，专注于赛博朋克与科幻题材的数字绘画创作。'
    },
    styles: ['赛博朋克', '写实']
  },
  {
    id: 'a3',
    title: '猫咪日常 · 喵星人的治愈生活图鉴',
    shortTitle: '猫咪日常',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20cat%20illustration%20flat%20design%20warm%20colors%20kawaii&image_size=square',
    description: '一系列可爱的猫咪生活小插画，用扁平风格和温暖的色调记录喵星人日常的呆萌瞬间，治愈每个疲惫的心灵。',
    author: {
      name: '苏小暖',
      avatar: 'https://i.pravatar.cc/80?img=23',
      bio: '独立插画师，自称「职业撸猫人」，擅长卡通风格与可爱系创作，拥有三只猫主子和一群云吸猫粉丝。'
    },
    styles: ['卡通', '扁平插画']
  },
  {
    id: 'a4',
    title: '山水之间 · 东方水墨禅意山水画',
    shortTitle: '山水之间',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ink%20painting%20mountain%20landscape%20minimal%20zen&image_size=landscape_4_3',
    description: '以极简水墨手法描绘中国传统山水意境，大面积留白让画面充满禅意与想象空间，体现东方美学的精髓。',
    author: {
      name: '王清远',
      avatar: 'https://i.pravatar.cc/80?img=33',
      bio: '国画世家传人，自幼研习水墨画，将传统笔墨与现代设计理念融合，作品多次入选国内外艺术展览。'
    },
    styles: ['国潮', '极简', '水墨']
  },
  {
    id: 'a5',
    title: '复古海报 · 80年代怀旧视觉设计',
    shortTitle: '复古海报',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20retro%20poster%20design%2080s%20style%20warm%20colors%20graphic%20art&image_size=square_hd',
    description: '80年代复古风格海报设计系列，采用暖色调与颗粒质感，怀旧又时尚，是复古美学与现代设计的碰撞。',
    author: {
      name: '张艺然',
      avatar: 'https://i.pravatar.cc/80?img=5',
      bio: '平面设计师兼插画师，对复古美学情有独钟，擅长将怀旧元素与现代排版结合，打造独特的视觉语言。'
    },
    styles: ['复古', '扁平插画']
  },
  {
    id: 'a6',
    title: '深海幻境 · 发光水母的梦幻水下世界',
    shortTitle: '深海幻境',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=underwater%20fantasy%20scene%20jellyfish%20bioluminescent%20dreamy%20digital%20art&image_size=portrait_16_9',
    description: '深海之中，发光水母悠然漂浮，如梦似幻的光影交织出神秘的水下世界，让人沉浸在宁静与想象之中。',
    author: {
      name: '李思海',
      avatar: 'https://i.pravatar.cc/80?img=68',
      bio: '数字艺术家，热爱潜水与海洋生物，把对深海的迷恋融入创作，擅长用光影营造梦幻而神秘的氛围。'
    },
    styles: ['写实', '日系']
  },
  {
    id: 'a7',
    title: '几何之美 · 大地色系抽象构成艺术',
    shortTitle: '几何之美',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=geometric%20abstract%20art%20minimal%20flat%20design%20earth%20tones%20modern&image_size=square',
    description: '以大地色系为基调的几何抽象作品，简单的形状组合出富有韵律的画面，是极简主义与现代审美的完美结合。',
    author: {
      name: '赵千雅',
      avatar: 'https://i.pravatar.cc/80?img=44',
      bio: '视觉艺术家与大学讲师，研究方向为极简主义与构成设计，作品常被应用于品牌视觉与空间装饰领域。'
    },
    styles: ['极简', '扁平插画']
  },
  {
    id: 'a8',
    title: '少女与蝶 · 日系漫画风青春插画',
    shortTitle: '少女与蝶',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=anime%20style%20girl%20with%20butterflies%20soft%20lighting%20japanese%20illustration&image_size=portrait_4_3',
    description: '日系漫画风格的青春少女形象，蝴蝶围绕身旁翩翩起舞，柔和光线下透着淡淡的梦幻与诗意。',
    author: {
      name: '林雪晴',
      avatar: 'https://i.pravatar.cc/80?img=49',
      bio: '同人画师，活跃于二次元创作圈，擅长日系少女风绘画，笔下的人物灵动唯美，拥有大量作品粉丝。'
    },
    styles: ['日系', '水彩']
  },
  {
    id: 'a9',
    title: '老城记忆 · 油画笔下的怀旧时光',
    shortTitle: '老城记忆',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=oil%20painting%20old%20town%20street%20warm%20sunset%20nostalgic%20artistic&image_size=landscape_16_9',
    description: '油画笔触下的老城街巷，夕阳洒落石板路，温暖的色调勾起对旧时光的怀念，每一帧都是岁月的故事。',
    author: {
      name: '周建国',
      avatar: 'https://i.pravatar.cc/80?img=60',
      bio: '资深油画创作者，从教三十年，擅长风景与城市题材，作品以温暖色调和细腻笔触著称，被多家画廊收藏。'
    },
    styles: ['油画', '写实']
  },
  {
    id: 'a10',
    title: '食物插画集 · 萌系美食马卡龙色系',
    shortTitle: '食物插画集',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20food%20illustration%20flat%20design%20kawaii%20desserts%20warm%20pastel&image_size=square_hd',
    description: '一组萌系美食插画，甜品与饮品化身为可爱的小伙伴，清新柔和的马卡龙色系让人心情也变得甜甜的。',
    author: {
      name: '吴甜甜',
      avatar: 'https://i.pravatar.cc/80?img=25',
      bio: '美食博主转行插画师，用画笔记录每一道吃过的美味，作品常见于餐饮品牌与美食杂志合作。'
    },
    styles: ['卡通', '扁平插画']
  },
  {
    id: 'a11',
    title: '敦煌飞天 · 金碧辉煌的古典艺术再现',
    shortTitle: '敦煌飞天',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dunhuang%20flying%20apsaras%20chinese%20traditional%20art%20gold%20and%20red%20elegant&image_size=portrait_4_3',
    description: '取材于敦煌壁画的飞天形象，在传统金碧辉煌的配色基础上融入现代审美，展现东方古典艺术的永恒之美。',
    author: {
      name: '唐风',
      avatar: 'https://i.pravatar.cc/80?img=15',
      bio: '传统文化研究者与插画师，专注于敦煌与唐代艺术题材的再创作，致力于让传统艺术走进年轻一代的视野。'
    },
    styles: ['国潮', '复古']
  },
  {
    id: 'a12',
    title: '星河漫游 · 宇航员的宇宙浪漫诗篇',
    shortTitle: '星河漫游',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20galaxy%20astronaut%20dreamy%20cosmic%20digital%20illustration%20purple%20blue&image_size=square_hd',
    description: '宇航员独自漂浮在浩瀚星河中，梦幻的紫蓝色调充满科幻与诗意，展现人类对宇宙的永恒向往与孤独。',
    author: {
      name: '郑星辰',
      avatar: 'https://i.pravatar.cc/80?img=8',
      bio: '科幻插画师，天文爱好者，作品围绕宇宙与未来主题展开，画面充满宏大叙事与浪漫想象。'
    },
    styles: ['赛博朋克', '写实']
  }
];

export const designerReplies = [
  '您好！感谢您的委托，我已经仔细阅读了您的需求。',
  '这个创意非常棒，我有几个想法想和您进一步沟通。',
  '关于预算，我们可以再商量一下，我会尽力满足您的期望。',
  '初稿已经在构思中，预计3天内可以给您看草图。',
  '收到您的修改意见，我会尽快调整后发送给您确认。',
  '颜色调整已经完成，您看看这个版本是否满意？',
  '作品已经完成，请您验收，有任何问题随时告诉我。'
];
