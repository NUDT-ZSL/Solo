import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface EnemyWave {
  type: 'mummy' | 'skeleton' | 'scarab' | 'pharaoh';
  count: number;
  interval: number;
}

interface Wave {
  id: string;
  enemies: EnemyWave[];
}

interface Level {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialGold: number;
  waves: Wave[];
}

interface LevelState {
  levelId: string;
  currentWaveIndex: number;
  isWaveActive: boolean;
  isLevelComplete: boolean;
  isGameOver: boolean;
  lives: number;
  gold: number;
  score: number;
}

const levels: Level[] = [
  {
    id: 'level-1',
    name: '沙漠边境',
    difficulty: 'easy',
    initialGold: 200,
    waves: [
      {
        id: 'wave-1-1',
        enemies: [{ type: 'mummy', count: 5, interval: 1200 }],
      },
      {
        id: 'wave-1-2',
        enemies: [
          { type: 'mummy', count: 3, interval: 1000 },
          { type: 'skeleton', count: 3, interval: 800 },
        ],
      },
      {
        id: 'wave-1-3',
        enemies: [
          { type: 'mummy', count: 4, interval: 900 },
          { type: 'skeleton', count: 4, interval: 700 },
        ],
      },
      {
        id: 'wave-1-boss',
        enemies: [
          { type: 'skeleton', count: 5, interval: 600 },
          { type: 'pharaoh', count: 1, interval: 0 },
        ],
      },
    ],
  },
  {
    id: 'level-2',
    name: '金字塔守卫',
    difficulty: 'medium',
    initialGold: 150,
    waves: [
      {
        id: 'wave-2-1',
        enemies: [
          { type: 'mummy', count: 4, interval: 1000 },
          { type: 'skeleton', count: 2, interval: 800 },
        ],
      },
      {
        id: 'wave-2-2',
        enemies: [
          { type: 'skeleton', count: 6, interval: 700 },
          { type: 'scarab', count: 2, interval: 1500 },
        ],
      },
      {
        id: 'wave-2-3',
        enemies: [
          { type: 'mummy', count: 5, interval: 800 },
          { type: 'scarab', count: 3, interval: 1200 },
        ],
      },
      {
        id: 'wave-2-4',
        enemies: [
          { type: 'skeleton', count: 8, interval: 500 },
          { type: 'scarab', count: 2, interval: 1000 },
        ],
      },
      {
        id: 'wave-2-5',
        enemies: [
          { type: 'mummy', count: 6, interval: 700 },
          { type: 'scarab', count: 4, interval: 900 },
        ],
      },
      {
        id: 'wave-2-boss',
        enemies: [
          { type: 'scarab', count: 3, interval: 1000 },
          { type: 'skeleton', count: 6, interval: 500 },
          { type: 'pharaoh', count: 1, interval: 0 },
        ],
      },
    ],
  },
  {
    id: 'level-3',
    name: '法老之怒',
    difficulty: 'hard',
    initialGold: 100,
    waves: [
      {
        id: 'wave-3-1',
        enemies: [
          { type: 'skeleton', count: 5, interval: 700 },
          { type: 'scarab', count: 2, interval: 1200 },
        ],
      },
      {
        id: 'wave-3-2',
        enemies: [
          { type: 'mummy', count: 6, interval: 800 },
          { type: 'scarab', count: 3, interval: 1000 },
        ],
      },
      {
        id: 'wave-3-3',
        enemies: [
          { type: 'skeleton', count: 8, interval: 500 },
          { type: 'scarab', count: 4, interval: 800 },
        ],
      },
      {
        id: 'wave-3-4',
        enemies: [
          { type: 'mummy', count: 5, interval: 600 },
          { type: 'skeleton', count: 5, interval: 500 },
          { type: 'scarab', count: 3, interval: 900 },
        ],
      },
      {
        id: 'wave-3-5',
        enemies: [
          { type: 'scarab', count: 6, interval: 700 },
          { type: 'skeleton', count: 8, interval: 400 },
        ],
      },
      {
        id: 'wave-3-6',
        enemies: [
          { type: 'mummy', count: 8, interval: 500 },
          { type: 'scarab', count: 5, interval: 700 },
          { type: 'pharaoh', count: 1, interval: 0 },
        ],
      },
      {
        id: 'wave-3-7',
        enemies: [
          { type: 'skeleton', count: 10, interval: 350 },
          { type: 'scarab', count: 6, interval: 600 },
        ],
      },
      {
        id: 'wave-3-boss',
        enemies: [
          { type: 'scarab', count: 4, interval: 800 },
          { type: 'skeleton', count: 8, interval: 400 },
          { type: 'pharaoh', count: 2, interval: 3000 },
        ],
      },
    ],
  },
];

const levelStates: Map<string, LevelState> = new Map();

app.get('/api/levels', (req, res) => {
  res.json(levels.map(({ id, name, difficulty, initialGold, waves }) => ({
    id,
    name,
    difficulty,
    initialGold,
    waveCount: waves.length,
  })));
});

app.post('/api/levels/:levelId/waves', (req, res) => {
  const { levelId } = req.params;
  const level = levels.find((l) => l.id === levelId);

  if (!level) {
    return res.status(404).json({ error: '关卡不存在' });
  }

  let state = levelStates.get(levelId);
  if (!state) {
    state = {
      levelId,
      currentWaveIndex: 0,
      isWaveActive: false,
      isLevelComplete: false,
      isGameOver: false,
      lives: 20,
      gold: level.initialGold,
      score: 0,
    };
    levelStates.set(levelId, state);
  }

  if (state.isWaveActive) {
    return res.status(400).json({ error: '当前波次进行中' });
  }

  if (state.currentWaveIndex >= level.waves.length) {
    return res.status(400).json({ error: '所有波次已完成' });
  }

  const wave = level.waves[state.currentWaveIndex];
  state.isWaveActive = true;
  state.currentWaveIndex++;

  res.json({
    wave,
    waveIndex: state.currentWaveIndex,
    totalWaves: level.waves.length,
  });
});

app.get('/api/levels/:levelId/state', (req, res) => {
  const { levelId } = req.params;
  const level = levels.find((l) => l.id === levelId);

  if (!level) {
    return res.status(404).json({ error: '关卡不存在' });
  }

  let state = levelStates.get(levelId);
  if (!state) {
    state = {
      levelId,
      currentWaveIndex: 0,
      isWaveActive: false,
      isLevelComplete: false,
      isGameOver: false,
      lives: 20,
      gold: level.initialGold,
      score: 0,
    };
    levelStates.set(levelId, state);
  }

  res.json(state);
});

app.listen(PORT, () => {
  console.log(`[Tower Defense Server] 运行在 http://localhost:${PORT}`);
});
