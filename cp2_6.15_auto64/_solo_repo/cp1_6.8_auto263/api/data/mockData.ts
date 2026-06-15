export interface Taste {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  spicy: number;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface FlavorProfile {
  id: string;
  foodName: string;
  description: string;
  imageUrl: string;
  taste: Taste;
  smell: string;
  mood: string;
  moodType: 'happy' | 'relaxed' | 'excited' | 'nostalgic' | 'neutral';
  likes: number;
  liked: boolean;
  saved: boolean;
  author: Author;
  tags: string[];
  createdAt: string;
  comments: Comment[];
}

export interface SimilarFood {
  id: string;
  foodName: string;
  imageUrl: string;
  similarity: number;
}

export interface NetworkNode {
  id: string;
  foodName: string;
  size: number;
  color: string;
  x: number;
  y: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

const users: Author[] = [
  { id: 'u1', name: '小味', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 'u2', name: '食光旅人', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: 'u3', name: '味蕾探险家', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: 'u4', name: '香气收集者', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: 'u5', name: '甜酸人生', avatar: 'https://i.pravatar.cc/150?img=5' },
];

export const flavorProfiles: FlavorProfile[] = [
  {
    id: 'f1',
    foodName: '担担面',
    description: '麻辣鲜香的川味经典，花生碎与芝麻酱交织出层次丰富的味觉体验',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=A+steaming+bowl+of+Dan+Dan+noodles+with+chili+oil+peanut+crumbles+and+green+onions+in+a+white+ceramic+bowl+warm+lighting+food+photography&image_size=square',
    taste: { sweet: 2, salty: 7, sour: 1, bitter: 0, umami: 8, spicy: 8 },
    smell: '花椒的麻香混合芝麻酱的浓郁',
    mood: '🔥',
    moodType: 'excited',
    likes: 42,
    liked: false,
    saved: false,
    author: users[0],
    tags: ['川菜', '面食', '麻辣'],
    createdAt: '2026-06-07T10:30:00Z',
    comments: [
      { id: 'c1', authorId: 'u2', authorName: '食光旅人', authorAvatar: users[1].avatar, content: '麻香真的好上头！', createdAt: '2026-06-07T11:00:00Z' },
    ],
  },
  {
    id: 'f2',
    foodName: '抹茶千层',
    description: '细腻的抹茶奶油与薄如蝉翼的可丽饼层叠，苦甜交织的优雅甜点',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Matcha+mille+crepe+cake+slice+showing+thin+layers+with+green+tea+cream+dusted+with+matcha+powder+elegant+plating&image_size=square',
    taste: { sweet: 6, salty: 0, sour: 0, bitter: 4, umami: 1, spicy: 0 },
    smell: '清新的抹茶粉末香，带着一丝奶香',
    mood: '😌',
    moodType: 'relaxed',
    likes: 38,
    liked: false,
    saved: false,
    author: users[1],
    tags: ['日式', '甜点', '抹茶'],
    createdAt: '2026-06-06T15:20:00Z',
    comments: [
      { id: 'c2', authorId: 'u3', authorName: '味蕾探险家', authorAvatar: users[2].avatar, content: '每一层都是惊喜', createdAt: '2026-06-06T16:00:00Z' },
      { id: 'c3', authorId: 'u0', authorName: '小味', authorAvatar: users[0].avatar, content: '苦甜平衡恰到好处', createdAt: '2026-06-06T17:30:00Z' },
    ],
  },
  {
    id: 'f3',
    foodName: '酸辣汤',
    description: '酸与辣在舌尖起舞，豆腐丝与木耳丝增添口感层次的经典汤品',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Hot+and+sour+soup+in+a+dark+ceramic+bowl+with+tofu+strips+wood+ear+mushroom+egg+ribbons+garnished+with+cilantro+steam+rising&image_size=square',
    taste: { sweet: 1, salty: 5, sour: 8, bitter: 0, umami: 6, spicy: 7 },
    smell: '醋香扑鼻，胡椒的温暖气息',
    mood: '🤩',
    moodType: 'excited',
    likes: 29,
    liked: false,
    saved: false,
    author: users[2],
    tags: ['中餐', '汤品', '酸辣'],
    createdAt: '2026-06-05T12:10:00Z',
    comments: [],
  },
  {
    id: 'f4',
    foodName: '提拉米苏',
    description: '咖啡浸润的手指饼干与丝滑马斯卡彭奶酪的经典意式甜品，入口即化',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Classic+Italian+tiramisu+in+a+glass+dish+with+layers+of+mascarpone+cream+and+coffee+soaked+ladyfingers+dusted+with+cocoa+powder&image_size=square',
    taste: { sweet: 7, salty: 0, sour: 0, bitter: 3, umami: 0, spicy: 0 },
    smell: '浓郁的咖啡与可可粉的苦甜香气',
    mood: '🥰',
    moodType: 'happy',
    likes: 55,
    liked: false,
    saved: false,
    author: users[3],
    tags: ['意式', '甜点', '咖啡'],
    createdAt: '2026-06-04T20:00:00Z',
    comments: [
      { id: 'c4', authorId: 'u1', authorName: '食光旅人', authorAvatar: users[1].avatar, content: '每次吃都像在意大利', createdAt: '2026-06-04T21:00:00Z' },
    ],
  },
  {
    id: 'f5',
    foodName: '冬阴功汤',
    description: '泰式酸辣汤的灵魂之作，香茅与青柠叶交织出热带的风味旋律',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Thai+Tom+Yum+Goong+soup+with+shrimp+mushrooms+lemongrass+and+chili+in+a+traditional+hotpot+steaming+vibrant+red+broth&image_size=square',
    taste: { sweet: 2, salty: 4, sour: 9, bitter: 0, umami: 7, spicy: 8 },
    smell: '香茅的清新与辣椒的热烈碰撞',
    mood: '😆',
    moodType: 'excited',
    likes: 33,
    liked: false,
    saved: false,
    author: users[4],
    tags: ['泰式', '汤品', '海鲜'],
    createdAt: '2026-06-03T18:45:00Z',
    comments: [],
  },
  {
    id: 'f6',
    foodName: '红烧肉',
    description: '肥而不腻的五花肉在酱油与冰糖中慢炖，浓油赤酱的温暖记忆',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Braised+pork+belly+in+dark+soy+sauce+glaze+garnished+with+green+onions+in+a+clay+pot+rich+glossy+sauce+Chinese+style&image_size=square',
    taste: { sweet: 5, salty: 6, sour: 0, bitter: 0, umami: 9, spicy: 1 },
    smell: '酱油焦糖化的甜香与八角桂皮的暖香',
    mood: '🥹',
    moodType: 'nostalgic',
    likes: 61,
    liked: false,
    saved: false,
    author: users[0],
    tags: ['中餐', '肉类', '家常'],
    createdAt: '2026-06-02T12:00:00Z',
    comments: [
      { id: 'c5', authorId: 'u4', authorName: '甜酸人生', authorAvatar: users[4].avatar, content: '奶奶的味道', createdAt: '2026-06-02T13:00:00Z' },
      { id: 'c6', authorId: 'u2', authorName: '食光旅人', authorAvatar: users[1].avatar, content: '肥瘦相间太绝了', createdAt: '2026-06-02T14:00:00Z' },
    ],
  },
  {
    id: 'f7',
    foodName: '寿司拼盘',
    description: '新鲜鱼生与醋饭的简约组合，每一贯都是海洋的鲜活味道',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Assorted+sushi+platter+with+salmon+tuna+and+shrimp+nigiri+on+a+dark+slate+board+with+wasabi+and+pickled+ginger+minimalist+Japanese+presentation&image_size=square',
    taste: { sweet: 2, salty: 4, sour: 3, bitter: 0, umami: 9, spicy: 1 },
    smell: '清淡的醋香与海苔的鲜香',
    mood: '😌',
    moodType: 'relaxed',
    likes: 47,
    liked: false,
    saved: false,
    author: users[1],
    tags: ['日式', '海鲜', '寿司'],
    createdAt: '2026-06-01T19:30:00Z',
    comments: [
      { id: 'c7', authorId: 'u3', authorName: '味蕾探险家', authorAvatar: users[2].avatar, content: '金枪鱼大toro太赞了', createdAt: '2026-06-01T20:00:00Z' },
    ],
  },
  {
    id: 'f8',
    foodName: '焦糖布丁',
    description: '丝滑蛋奶布丁上覆盖着薄脆的焦糖层，轻轻一敲便是甜蜜的碎裂声',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Classic+creme+caramel+flan+with+golden+caramel+sauce+in+a+ramekin+smooth+custard+surface+warm+ambient+lighting&image_size=square',
    taste: { sweet: 8, salty: 0, sour: 0, bitter: 2, umami: 0, spicy: 0 },
    smell: '焦糖的温暖甜蜜与香草的轻柔',
    mood: '😊',
    moodType: 'happy',
    likes: 36,
    liked: false,
    saved: false,
    author: users[3],
    tags: ['法式', '甜点', '焦糖'],
    createdAt: '2026-05-31T16:00:00Z',
    comments: [],
  },
  {
    id: 'f9',
    foodName: '麻辣火锅',
    description: '红油翻滚中的毛肚鸭肠，花椒与辣椒编织出四川的灵魂沸腾',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sichuan+hot+pot+with+boiling+red+chili+broth+filled+with+various+ingredients+sliced+meat+mushrooms+vegetables+steam+rising+vibrant+red+color&image_size=square',
    taste: { sweet: 1, salty: 6, sour: 2, bitter: 0, umami: 7, spicy: 10 },
    smell: '牛油的醇厚与数十种香料的猛烈冲击',
    mood: '🔥',
    moodType: 'excited',
    likes: 72,
    liked: false,
    saved: false,
    author: users[4],
    tags: ['川菜', '火锅', '麻辣'],
    createdAt: '2026-05-30T19:00:00Z',
    comments: [
      { id: 'c8', authorId: 'u0', authorName: '小味', authorAvatar: users[0].avatar, content: '九宫格才是灵魂', createdAt: '2026-05-30T20:00:00Z' },
      { id: 'c9', authorId: 'u1', authorName: '食光旅人', authorAvatar: users[1].avatar, content: '香油蒜泥永远的神', createdAt: '2026-05-30T20:30:00Z' },
    ],
  },
  {
    id: 'f10',
    foodName: '柠檬塔',
    description: '酥脆塔壳承载着明亮柠檬凝乳，酸甜清爽的午后之选',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Lemon+tart+with+glossy+curd+filling+in+a+golden+shortcrust+shell+garnished+with+candied+lemon+slices+and+mint+leaves+French+patisserie+style&image_size=square',
    taste: { sweet: 6, salty: 0, sour: 7, bitter: 1, umami: 0, spicy: 0 },
    smell: '明亮清新的柠檬香气与黄油的温暖',
    mood: '🌞',
    moodType: 'happy',
    likes: 28,
    liked: false,
    saved: false,
    author: users[2],
    tags: ['法式', '甜点', '柠檬'],
    createdAt: '2026-05-29T14:30:00Z',
    comments: [],
  },
  {
    id: 'f11',
    foodName: '味噌拉面',
    description: '浓郁的味噌汤底裹着弹牙面条，叉烧与溏心蛋的完美搭配',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Miso+ramen+in+a+large+bow+with+rich+amber+broth+chashu+pork+soft+boiled+egg+corn+nori+bamboo+shoots+and+green+onions+Japanese+ramen+shop+style&image_size=square',
    taste: { sweet: 2, salty: 7, sour: 1, bitter: 0, umami: 9, spicy: 2 },
    smell: '味噌发酵的醇厚与骨汤的浓香',
    mood: '🍜',
    moodType: 'relaxed',
    likes: 44,
    liked: false,
    saved: false,
    author: users[0],
    tags: ['日式', '面食', '味噌'],
    createdAt: '2026-05-28T21:00:00Z',
    comments: [
      { id: 'c10', authorId: 'u4', authorName: '甜酸人生', authorAvatar: users[4].avatar, content: '冬天来一碗太治愈了', createdAt: '2026-05-28T22:00:00Z' },
    ],
  },
  {
    id: 'f12',
    foodName: '桂花糕',
    description: '晶莹剔透的糯米糕点，桂花的清甜在口中缓缓绽放如秋日私语',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Osmanthus+cake+translucent+glutinous+rice+dessert+with+golden+osmanthus+flowers+scattered+on+top+on+a+porcelain+plate+Chinese+traditional+sweet+delicate+and+elegant&image_size=square',
    taste: { sweet: 7, salty: 0, sour: 0, bitter: 0, umami: 0, spicy: 0 },
    smell: '桂花的清幽甜香，如同秋日的低语',
    mood: '🥹',
    moodType: 'nostalgic',
    likes: 31,
    liked: false,
    saved: false,
    author: users[3],
    tags: ['中式', '糕点', '桂花'],
    createdAt: '2026-05-27T10:00:00Z',
    comments: [],
  },
];
