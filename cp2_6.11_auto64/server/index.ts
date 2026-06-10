
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface ScentItem {
  name: string;
  key: string;
  value: number;
  color: string;
  warm: boolean;
}

interface ScentCard {
  id: string;
  title: string;
  description: string;
  imageData?: string;
  scents: ScentItem[];
  createdAt: number;
}

const BASE_SCENT_KEYS = ['rose', 'sandalwood', 'seaSalt', 'pine', 'incense'];
const BASE_SCENT_NAMES: Record<string, string> = {
  rose: '玫瑰',
  sandalwood: '檀木',
  seaSalt: '海盐',
  pine: '松针',
  incense: '焚香'
};
const BASE_SCENT_COLORS: Record<string, string> = {
  rose: '#FF6BCB',
  sandalwood: '#8B5A2B',
  seaSalt: '#B0E0E6',
  pine: '#228B22',
  incense: '#A0522D'
};
const BASE_SCENT_WARM: Record<string, boolean> = {
  rose: true,
  sandalwood: true,
  seaSalt: false,
  pine: false,
  incense: true
};

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const cards: ScentCard[] = [];

function createDemoCard(
  title: string,
  description: string,
  values: Record<string, number>,
  daysAgo: number
): ScentCard {
  const scents: ScentItem[] = BASE_SCENT_KEYS.map(key => ({
    name: BASE_SCENT_NAMES[key],
    key,
    value: values[key] || 0,
    color: BASE_SCENT_COLORS[key],
    warm: BASE_SCENT_WARM[key]
  }));
  return {
    id: uuidv4(),
    title,
    description,
    scents,
    createdAt: Date.now() - 86400000 * daysAgo
  };
}

const DEMO_CARDS: ScentCard[] = [
  createDemoCard(
    '雨后花园的清晨',
    '薄雾中的玫瑰花瓣上挂着晶莹的露珠，湿润的松针散发出清冽的木质气息，远处飘来淡淡的海盐味，仿佛整个世界都被洗涤过一般纯净。',
    { rose: 45, sandalwood: 10, seaSalt: 20, pine: 25, incense: 0 },
    3
  ),
  createDemoCard(
    '古寺禅意',
    '袅袅青烟从古刹中升起，檀木的深沉与焚香的悠远交织在一起，庭院中的松树散发着宁静的气息，时间在这里仿佛静止。',
    { rose: 0, sandalwood: 40, seaSalt: 0, pine: 20, incense: 40 },
    2
  ),
  createDemoCard(
    '海边落日',
    '温暖的夕阳洒在波光粼粼的海面上，咸湿的海风中带着一丝玫瑰的甜意，远处的松林在晚风中轻轻摇曳，一切都笼罩在金色的光晕中。',
    { rose: 25, sandalwood: 5, seaSalt: 50, pine: 15, incense: 5 },
    1
  ),
  createDemoCard(
    '森林深处的小屋',
    '壁炉里的火光跳跃着，松脂和檀木的香气弥漫整个房间，桌上摆着一束干枯的玫瑰，窗外是无尽的墨绿色松海。',
    { rose: 15, sandalwood: 35, seaSalt: 0, pine: 40, incense: 10 },
    0.5
  ),
  createDemoCard(
    '情人节的粉色梦境',
    '无数朵玫瑰在房间里绽放，甜美的花香中带着一丝焚香的神秘，檀木的底调让这份浪漫更加持久而温暖。',
    { rose: 60, sandalwood: 20, seaSalt: 0, pine: 0, incense: 20 },
    0.25
  )
];

cards.push(...DEMO_CARDS);

function extractTitle(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= 20) return trimmed;
  return trimmed.slice(0, 20);
}

function validateScents(scents: unknown): scents is ScentItem[] {
  if (!Array.isArray(scents)) return false;
  if (scents.length !== 5) return false;

  const seenKeys = new Set<string>();
  for (let i = 0; i < scents.length; i++) {
    const item = scents[i];
    if (item === null || item === undefined || typeof item !== 'object') return false;
    const s = item as Record<string, unknown>;

    if (typeof s.key !== 'string' || s.key.length === 0) return false;
    if (!BASE_SCENT_KEYS.includes(s.key)) return false;
    if (seenKeys.has(s.key)) return false;
    seenKeys.add(s.key);

    if (typeof s.value !== 'number' || !Number.isFinite(s.value)) return false;
    if (!Number.isInteger(s.value)) return false;
    if (s.value < 0 || s.value > 100) return false;

    if (typeof s.name !== 'string' || s.name.length === 0) return false;
    if (typeof s.color !== 'string' || s.color.length === 0) return false;
    if (typeof s.warm !== 'boolean') return false;
  }

  return seenKeys.size === 5;
}

app.get('/api/cards', (_req, res) => {
  res.json({
    success: true,
    data: cards
  });
});

app.get('/api/cards/:id', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    res.status(404).json({
      success: false,
      error: '卡片不存在'
    });
    return;
  }
  res.json({
    success: true,
    data: card
  });
});

app.post('/api/cards', (req, res) => {
  const { description, imageData, scents } = req.body as {
    description?: string;
    imageData?: string;
    scents?: unknown;
  };

  if (!description || typeof description !== 'string' || !description.trim()) {
    res.status(400).json({
      success: false,
      error: '请填写气味描述文字'
    });
    return;
  }

  if (description.trim().length > 200) {
    res.status(400).json({
      success: false,
      error: '描述文字不能超过200字'
    });
    return;
  }

  if (!validateScents(scents)) {
    res.status(400).json({
      success: false,
      error: '气味比例数据格式不正确'
    });
    return;
  }

  const total = scents.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    res.status(400).json({
      success: false,
      error: '请至少调整一个气味比例'
    });
    return;
  }

  const newCard: ScentCard = {
    id: uuidv4(),
    title: extractTitle(description),
    description: description.trim(),
    imageData: typeof imageData === 'string' && imageData.length > 0 ? imageData : undefined,
    scents: [...scents],
    createdAt: Date.now()
  };

  cards.unshift(newCard);

  res.status(201).json({
    success: true,
    data: newCard
  });
});

app.listen(PORT, () => {
  console.log(`[Scent Archive Server] running on http://localhost:${PORT}`);
});
