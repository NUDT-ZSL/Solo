
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface ScentRatio {
  rose: number;
  sandalwood: number;
  seaSalt: number;
  pine: number;
  incense: number;
}

interface ScentCard {
  id: string;
  title: string;
  description: string;
  imageData?: string;
  scentRatios: ScentRatio;
  createdAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const cards: ScentCard[] = [];

const DEMO_CARDS: ScentCard[] = [
  {
    id: uuidv4(),
    title: '雨后花园的清晨',
    description: '薄雾中的玫瑰花瓣上挂着晶莹的露珠，湿润的松针散发出清冽的木质气息，远处飘来淡淡的海盐味，仿佛整个世界都被洗涤过一般纯净。',
    scentRatios: { rose: 45, sandalwood: 10, seaSalt: 20, pine: 25, incense: 0 },
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: uuidv4(),
    title: '古寺禅意',
    description: '袅袅青烟从古刹中升起，檀木的深沉与焚香的悠远交织在一起，庭院中的松树散发着宁静的气息，时间在这里仿佛静止。',
    scentRatios: { rose: 0, sandalwood: 40, seaSalt: 0, pine: 20, incense: 40 },
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: uuidv4(),
    title: '海边落日',
    description: '温暖的夕阳洒在波光粼粼的海面上，咸湿的海风中带着一丝玫瑰的甜意，远处的松林在晚风中轻轻摇曳，一切都笼罩在金色的光晕中。',
    scentRatios: { rose: 25, sandalwood: 5, seaSalt: 50, pine: 15, incense: 5 },
    createdAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: '森林深处的小屋',
    description: '壁炉里的火光跳跃着，松脂和檀木的香气弥漫整个房间，桌上摆着一束干枯的玫瑰，窗外是无尽的墨绿色松海。',
    scentRatios: { rose: 15, sandalwood: 35, seaSalt: 0, pine: 40, incense: 10 },
    createdAt: Date.now() - 3600000 * 12
  },
  {
    id: uuidv4(),
    title: '情人节的粉色梦境',
    description: '无数朵玫瑰在房间里绽放，甜美的花香中带着一丝焚香的神秘，檀木的底调让这份浪漫更加持久而温暖。',
    scentRatios: { rose: 60, sandalwood: 20, seaSalt: 0, pine: 0, incense: 20 },
    createdAt: Date.now() - 3600000 * 6
  }
];

cards.push(...DEMO_CARDS);

function extractTitle(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= 20) return trimmed;
  return trimmed.slice(0, 20);
}

function validateScentRatios(ratios: unknown): ratios is ScentRatio {
  if (!ratios || typeof ratios !== 'object') return false;
  const keys: Array<keyof ScentRatio> = ['rose', 'sandalwood', 'seaSalt', 'pine', 'incense'];
  for (const key of keys) {
    const val = (ratios as Record<string, unknown>)[key];
    if (typeof val !== 'number' || val < 0 || val > 100 || !Number.isInteger(val)) {
      return false;
    }
  }
  return true;
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
  const { description, imageData, scentRatios } = req.body as {
    description?: string;
    imageData?: string;
    scentRatios?: unknown;
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

  if (!validateScentRatios(scentRatios)) {
    res.status(400).json({
      success: false,
      error: '气味比例数据无效'
    });
    return;
  }

  const total = scentRatios.rose + scentRatios.sandalwood + scentRatios.seaSalt + scentRatios.pine + scentRatios.incense;
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
    imageData: typeof imageData === 'string' ? imageData : undefined,
    scentRatios,
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
