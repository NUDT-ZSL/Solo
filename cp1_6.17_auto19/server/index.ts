import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

export type Tag =
  | 'RPG'
  | '解谜'
  | '动作'
  | '步行模拟'
  | '策略'
  | '恐怖'
  | '像素'
  | '视觉小说'
  | '平台跳跃'
  | 'Roguelike'
  | '模拟经营'
  | '卡牌';

export interface Game {
  id: string;
  title: string;
  description: string;
  releaseDate: string;
  tags: Tag[];
  coverUrl: string;
}

export interface Rating {
  id: string;
  gameId: string;
  score: number;
  comment: string;
  createdAt: string;
}

const PREDEFINED_TAGS: Tag[] = [
  'RPG',
  '解谜',
  '动作',
  '步行模拟',
  '策略',
  '恐怖',
  '像素',
  '视觉小说',
  '平台跳跃',
  'Roguelike',
  '模拟经营',
  '卡牌',
];

const GAME_TEMPLATES = [
  {
    title: '星河彼岸',
    description:
      '一款关于孤独宇航员在废弃空间站中寻找回家之路的第一人称探索游戏。在这片寂静的宇宙中，每一个选择都将影响故事的走向。',
  },
  {
    title: '雾都夜行者',
    description:
      '维多利亚时代背景下的哥特式解谜冒险。你将扮演一名私家侦探，在雾气弥漫的城市中追踪一系列离奇的失踪案件。',
  },
  {
    title: '山海绘卷',
    description:
      '以中国传统神话为灵感的2D横版动作游戏。跟随少女阿瑶的脚步，与山海经中的奇珍异兽相遇，展开一段治愈的冒险旅程。',
  },
  {
    title: '时间之隙',
    description:
      '独特的时间操控机制解谜游戏。你可以暂停、倒放、加速局部时间，利用这些能力解开层层机关，揭示尘封的秘密。',
  },
  {
    title: '像素农场物语',
    description:
      '继承爷爷留下的破旧农场，从零开始打造属于你的田园生活。种植作物、饲养动物、与村民交朋友，每一季都有新惊喜。',
  },
  {
    title: '深渊回响',
    description:
      '心理恐怖向探索游戏。你收到一封来自失踪多年妹妹的信，信中指向一座废弃的孤儿院。深入其中，面对你最深的恐惧。',
  },
  {
    title: '机甲阵线',
    description:
      '回合制策略游戏。指挥你的机甲小队，在末世战场上与敌对势力展开激烈交锋。每个兵种的组合都能形成独特战术。',
  },
  {
    title: '星陨之城',
    description:
      'Roguelike地牢探索游戏。每一次冒险的地图、怪物、道具都是随机生成的，收集圣物构建你的专属战斗流派。',
  },
  {
    title: '夏日回响',
    description:
      '温馨治愈的视觉小说。大学生的回乡暑假，与童年玩伴重逢，在蝉鸣声中重新回忆起那段被遗忘的夏日约定。',
  },
  {
    title: '水晶塔防',
    description:
      '融合卡牌元素的塔防游戏。收集元素卡牌构建你的防御塔，每个塔都有独特的技能和升级路线，策略性十足。',
  },
  {
    title: '梦境漫游者',
    description:
      '步行模拟类游戏。踏入一个由无数人梦境编织而成的奇异世界，每一幅画面都像一幅流动的油画，每一个转角都有惊喜。',
  },
  {
    title: '云端咖啡馆',
    description:
      '轻松有趣的模拟经营游戏。在漂浮于云海之上的小岛上经营你的咖啡馆，研发新奇饮品，招待形形色色的客人。',
  },
  {
    title: '疾风忍者传',
    description:
      '高难度平台跳跃动作游戏。精确的操控手感，流畅的连击系统，挑战一系列设计精巧的关卡，成为最强忍者。',
  },
  {
    title: '苍穹编年史',
    description:
      '史诗级开放世界RPG。在魔法与科技并存的大陆上自由探索，组建你的冒险队伍，选择阵营，书写属于你的传奇。',
  },
  {
    title: '记忆碎片',
    description:
      '独特的叙事解谜游戏。通过收集散落在各处的记忆碎片，拼凑出一个关于爱、失去与希望的动人故事。',
  },
  {
    title: '深海探险队',
    description:
      '水下探索生存游戏。驾驶潜艇深入未知的海洋深处，发现奇异的深海生物，解开远古文明留下的谜团。',
  },
  {
    title: '月影传说',
    description:
      '日式和风RPG。在妖怪横行的战国时代，你将作为半妖少年踏上旅程，寻找自己的身世之谜，守护重要之人。',
  },
  {
    title: '方块建筑师',
    description:
      '沙盒建造游戏。用各式各样的方块构建你梦想中的城市，从简单的小屋到宏伟的城堡，一切由你决定。',
  },
];

const COVER_PROMPTS = [
  'pixel art style space station floating in dark nebula',
  'victorian london foggy night street gas lamps',
  'chinese mythology landscape with mountains and mythical creature',
  'clockwork gears and frozen time particles',
  'cozy pixel farm with crops animals sunset',
  'abandoned orphanage dark horror atmosphere',
  'giant mecha robot battle post apocalyptic city',
  'dungeon fantasy glowing crystals torchlight',
  'anime style summer seaside town nostalgic',
  'fantasy tower defense magic crystals',
  'dreamlike surreal landscape flowing colors',
  'cozy cafe in the sky above clouds',
  'ninja silhouette moon rooftop japan',
  'epic fantasy open world mountains dragons',
  'ethereal floating memory fragments glowing',
  'deep sea bioluminescent creatures submarine',
  'japanese edo period yokai cherry blossoms',
  'voxel building blocks city construction',
];

function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(20250617);

function pickRandomTags(): Tag[] {
  const count = Math.floor(rand() * 3) + 1;
  const shuffled = [...PREDEFINED_TAGS].sort(() => rand() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(): string {
  const start = new Date('2022-01-01').getTime();
  const end = new Date('2025-06-17').getTime();
  const t = start + rand() * (end - start);
  return new Date(t).toISOString().split('T')[0];
}

function getCoverImage(index: number): string {
  const prompts = COVER_PROMPTS;
  const sizes = ['landscape_4_3', 'portrait_4_3', 'landscape_16_9', 'portrait_16_9'];
  const size = sizes[index % sizes.length];
  const prompt = encodeURIComponent(prompts[index % prompts.length]);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=${size}`;
}

function generateGames(): Game[] {
  return GAME_TEMPLATES.map((tpl, i) => ({
    id: `game-${String(i + 1).padStart(3, '0')}`,
    title: tpl.title,
    description: tpl.description,
    releaseDate: randomDate(),
    tags: pickRandomTags(),
    coverUrl: getCoverImage(i),
  }));
}

function generateInitialRatings(games: Game[]): Rating[] {
  const ratings: Rating[] = [];
  const commentTemplates = [
    '画面精美，剧情动人！强烈推荐给所有喜欢故事向游戏的玩家。',
    '难度适中，玩法有新意，几个晚上就通关了，意犹未尽。',
    '音乐太棒了，OST已经循环播放好几天，配合游戏氛围绝了。',
    '美术风格独树一帜，看得出来开发者投入了很多心血。',
    '期待续作！希望能看到更多世界观的展开和新角色的加入。',
    '操作手感非常流畅，打击感很棒，值得反复游玩。',
    '剧情反转很多，最后结局的处理让人泪目，值得深思。',
    '自由度很高，不同选择有不同结果，重玩价值满满。',
    '氛围营造一流，从头到尾沉浸感十足，很有代入感。',
    '优化做得不错，低配电脑也能流畅运行，好评！',
  ];
  games.forEach((game) => {
    const count = Math.floor(rand() * 15) + 3;
    for (let i = 0; i < count; i++) {
      const score = Math.floor(rand() * 3) + 3;
      const createdAt = new Date(
        new Date(game.releaseDate).getTime() + rand() * 1000 * 60 * 60 * 24 * 500
      ).toISOString();
      ratings.push({
        id: `r-${game.id}-${i}`,
        gameId: game.id,
        score,
        comment: commentTemplates[Math.floor(rand() * commentTemplates.length)],
        createdAt,
      });
    }
  });
  return ratings;
}

const games: Game[] = generateGames();
const ratings: Rating[] = generateInitialRatings(games);

function computeAggregatedRatings() {
  const agg: Record<string, { average: number; count: number; distribution: number[] }> = {};
  games.forEach((g) => {
    agg[g.id] = { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
  });
  ratings.forEach((r) => {
    const a = agg[r.gameId];
    a.count += 1;
    a.distribution[r.score - 1] += 1;
  });
  Object.keys(agg).forEach((gid) => {
    const a = agg[gid];
    const gameRatings = ratings.filter((r) => r.gameId === gid);
    if (gameRatings.length > 0) {
      const sum = gameRatings.reduce((s, r) => s + r.score, 0);
      a.average = Math.round((sum / gameRatings.length) * 10) / 10;
    }
  });
  return agg;
}

app.get('/api/games', (_req, res) => {
  const aggregated = computeAggregatedRatings();
  const result = games.map((g) => ({
    ...g,
    rating: aggregated[g.id],
  }));
  res.json(result);
});

app.get('/api/games/:id', (req, res) => {
  const { id } = req.params;
  const game = games.find((g) => g.id === id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  const gameRatings = ratings
    .filter((r) => r.gameId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const aggregated = computeAggregatedRatings();
  res.json({
    ...game,
    rating: aggregated[id],
    ratings: gameRatings,
  });
});

app.get('/api/tags', (_req, res) => {
  res.json(PREDEFINED_TAGS);
});

app.post('/api/ratings', (req, res) => {
  const { gameId, score, comment } = req.body;
  if (!gameId || typeof score !== 'number' || score < 1 || score > 5) {
    res.status(400).json({ error: 'Invalid rating data' });
    return;
  }
  const game = games.find((g) => g.id === gameId);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  const newRating: Rating = {
    id: `r-${gameId}-${Date.now()}`,
    gameId,
    score,
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };
  ratings.push(newRating);
  const aggregated = computeAggregatedRatings();
  res.json({
    success: true,
    rating: newRating,
    aggregated: aggregated[gameId],
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/api/games`);
  console.log(`  GET  http://localhost:${PORT}/api/games/:id`);
  console.log(`  GET  http://localhost:${PORT}/api/tags`);
  console.log(`  POST http://localhost:${PORT}/api/ratings`);
});
