import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface SeasoningPortion {
  name: string;
  portion: number;
}

interface Particle {
  x: number;
  y: number;
  color: string;
  radius: number;
  isGold?: boolean;
}

interface TasteRecord {
  id: string;
  dishName: string;
  seasonings: SeasoningPortion[];
  particles: Particle[];
  createdAt: string;
}

const SEASONING_COLORS: Record<string, string> = {
  '盐': '#FFFFFF80',
  '糖': '#FFB6C180',
  '酱油': '#5C403380',
  '醋': '#B8860B80',
  '辣椒油': '#DC143C80',
  '芝麻油': '#DAA52080',
  '蚝油': '#2F4F4F80',
  '料酒': '#F5DEB380',
};

const RADIUS = 150;
const CENTER = 150;
const GRAVITY_STRENGTH = 0.015;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateParticles(seasonings: SeasoningPortion[]): Particle[] {
  const particles: Particle[] = [];
  const totalPortion = seasonings.reduce((sum, s) => sum + s.portion, 0);
  if (totalPortion === 0) return particles;

  const baseCount = 100 + Math.floor(Math.random() * 101);
  const hasGold = Math.random() < 0.1;

  seasonings.forEach((s) => {
    if (s.portion <= 0) return;
    const ratio = s.portion / totalPortion;
    const count = Math.round(baseCount * ratio);
    const color = SEASONING_COLORS[s.name] || '#CCCCCC80';

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * RADIUS;
      const baseX = CENTER + Math.cos(angle) * dist;
      const baseY = CENTER + Math.sin(angle) * dist;

      const toCenterAngle = Math.atan2(CENTER - baseY, CENTER - baseX);
      const gravityDist = dist * GRAVITY_STRENGTH;
      const x = baseX + Math.cos(toCenterAngle) * gravityDist;
      const y = baseY + Math.sin(toCenterAngle) * gravityDist;

      particles.push({
        x,
        y,
        color,
        radius: 2 + Math.random() * 3,
      });
    }
  });

  if (hasGold && particles.length > 0) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * RADIUS * 0.6;
    particles.push({
      x: CENTER + Math.cos(angle) * dist,
      y: CENTER + Math.sin(angle) * dist,
      color: '#FFD700',
      radius: 8,
      isGold: true,
    });
  }

  return particles;
}

let records: TasteRecord[] = [];

app.post('/api/create', (req, res) => {
  const { dishName, seasonings } = req.body as {
    dishName: string;
    seasonings: SeasoningPortion[];
  };

  const particles = generateParticles(seasonings);

  const record: TasteRecord = {
    id: generateId(),
    dishName: dishName || '未命名菜品',
    seasonings,
    particles,
    createdAt: new Date().toISOString(),
  };

  records.unshift(record);
  res.json(record);
});

app.get('/api/list', (_req, res) => {
  const list = records.map((r) => ({
    id: r.id,
    dishName: r.dishName,
    createdAt: r.createdAt,
    particles: r.particles,
    seasonings: r.seasonings,
  }));
  res.json(list);
});

app.get('/api/detail/:id', (req, res) => {
  const record = records.find((r) => r.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  res.json(record);
});

app.delete('/api/delete/:id', (req, res) => {
  const index = records.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  records.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`TasteMap server running on http://localhost:${PORT}`);
});
