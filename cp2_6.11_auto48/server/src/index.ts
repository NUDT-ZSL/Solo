import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface CardBehavior {
  id: number;
  clicks: number;
  hoverSeconds: number;
}

interface BehaviorRequest {
  cards: CardBehavior[];
  scrollDepth: number;
}

interface CardLayout {
  id: number;
  score: number;
  gridRow: string;
  gridColumn: string;
  backgroundColor: string;
  textColor: string;
  glowColor: string;
}

interface LayoutResponse {
  cards: CardLayout[];
  timestamp: number;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function calculateScore(card: CardBehavior, scrollDepth: number): number {
  return card.clicks * 2 + card.hoverSeconds + scrollDepth * 0.1;
}

function normalizeScores(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 0.5);
  return scores.map(s => (s - min) / (max - min));
}

app.post('/api/behavior', (req, res) => {
  try {
    const { cards, scrollDepth } = req.body as BehaviorRequest;

    if (!cards || cards.length !== 4) {
      return res.status(400).json({ error: '需要4个卡片的行为数据' });
    }

    const rawScores = cards.map(card => calculateScore(card, scrollDepth));
    const normalizedScores = normalizeScores(rawScores);

    const sortedIndices = rawScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);

    const layoutConfigs: CardLayout[] = cards.map((card, i) => {
      const t = normalizedScores[i];
      const backgroundColor = lerpColor('#f0f0f0', '#ffffff', t);
      const textColor = lerpColor('#555555', '#111111', t);

      let glowColor: string;
      if (t >= 0.66) {
        glowColor = lerpColor('#90EE90', '#00C853', t);
      } else if (t >= 0.33) {
        glowColor = lerpColor('#FFE082', '#FFD600', t);
      } else {
        glowColor = lerpColor('#FFAB91', '#FF5252', t);
      }

      const rank = sortedIndices.indexOf(i);
      let gridRow: string;
      let gridColumn: string;

      if (rank === 0) {
        gridRow = 'span 1.4';
        gridColumn = 'span 1.4';
      } else if (rank === 1) {
        gridRow = 'span 1.1';
        gridColumn = 'span 1.1';
      } else if (rank === 2) {
        gridRow = 'span 0.95';
        gridColumn = 'span 0.95';
      } else {
        gridRow = 'span 0.75';
        gridColumn = 'span 0.75';
      }

      return {
        id: card.id,
        score: rawScores[i],
        gridRow,
        gridColumn,
        backgroundColor,
        textColor,
        glowColor,
      };
    });

    const response: LayoutResponse = {
      cards: layoutConfigs,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('处理行为数据出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`流动界面后端服务运行在 http://localhost:${PORT}`);
});
