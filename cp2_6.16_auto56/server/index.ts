import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type WaveState = 'idle' | 'preparing' | 'wave_active' | 'cooldown' | 'complete';

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
  waveState: WaveState;
  currentWaveIndex: number;
  totalWaves: number;
  isLevelComplete: boolean;
  isGameOver: boolean;
  lives: number;
  gold: number;
  score: number;
  prepareStartTime: number | null;
  prepareDuration: number;
}

const PREPARE_DURATION = 10000;

const levels: Level[] = [
  {
    id: 'level-1',
    name: '沙漠边境',
    difficulty: 'easy',
    initialGold: 200,
    waves: [
      { id: 'wave-1-1', enemies: [{ type: 'mummy', count: 5, interval: 1200 }] },
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

function getOrCreateState(levelId: string): LevelState | null {
  const level = levels.find((l) => l.id === levelId);
  if (!level) return null;

  let state = levelStates.get(levelId);
  if (!state) {
    state = {
      levelId,
      waveState: 'idle',
      currentWaveIndex: 0,
      totalWaves: level.waves.length,
      isLevelComplete: false,
      isGameOver: false,
      lives: 20,
      gold: level.initialGold,
      score: 0,
      prepareStartTime: null,
      prepareDuration: PREPARE_DURATION,
    };
    levelStates.set(levelId, state);
  }
  return state;
}

function getRemainingCountdown(state: LevelState): number {
  if (state.waveState !== 'preparing' || !state.prepareStartTime) return 0;
  const elapsed = Date.now() - state.prepareStartTime;
  return Math.max(0, state.prepareDuration - elapsed);
}

app.get('/api/levels', (req, res) => {
  res.json(
    levels.map(({ id, name, difficulty, initialGold, waves }) => ({
      id,
      name,
      difficulty,
      initialGold,
      waveCount: waves.length,
    }))
  );
});

app.post('/api/levels/:levelId/waves', (req, res) => {
  const { levelId } = req.params;
  const level = levels.find((l) => l.id === levelId);
  if (!level) {
    return res.status(404).json({ error: '关卡不存在' });
  }

  const state = getOrCreateState(levelId);
  if (!state) {
    return res.status(404).json({ error: '关卡状态初始化失败' });
  }

  switch (state.waveState) {
    case 'idle': {
      if (state.currentWaveIndex >= level.waves.length) {
        return res.status(400).json({ error: '所有波次已完成', waveState: 'complete' });
      }
      state.waveState = 'preparing';
      state.prepareStartTime = Date.now();
      state.prepareDuration = PREPARE_DURATION;
      return res.json({
        waveState: 'preparing',
        countdown: state.prepareDuration,
        waveIndex: state.currentWaveIndex,
        totalWaves: level.waves.length,
      });
    }

    case 'preparing': {
      const remaining = getRemainingCountdown(state);
      if (remaining > 0) {
        return res.status(400).json({
          error: '准备倒计时未结束',
          waveState: 'preparing',
          countdown: remaining,
        });
      }
      const wave = level.waves[state.currentWaveIndex];
      state.waveState = 'wave_active';
      state.currentWaveIndex++;
      state.prepareStartTime = null;
      return res.json({
        waveState: 'wave_active',
        wave,
        waveIndex: state.currentWaveIndex,
        totalWaves: level.waves.length,
      });
    }

    case 'wave_active': {
      return res.status(400).json({ error: '当前波次进行中', waveState: 'wave_active' });
    }

    case 'cooldown': {
      state.waveState = 'preparing';
      state.prepareStartTime = Date.now();
      state.prepareDuration = PREPARE_DURATION;
      return res.json({
        waveState: 'preparing',
        countdown: state.prepareDuration,
        waveIndex: state.currentWaveIndex,
        totalWaves: level.waves.length,
      });
    }

    case 'complete': {
      return res.status(400).json({ error: '关卡已完成', waveState: 'complete' });
    }

    default:
      return res.status(500).json({ error: '未知状态' });
  }
});

app.post('/api/levels/:levelId/waves/complete', (req, res) => {
  const { levelId } = req.params;
  const level = levels.find((l) => l.id === levelId);
  if (!level) {
    return res.status(404).json({ error: '关卡不存在' });
  }

  const state = getOrCreateState(levelId);
  if (!state || state.waveState !== 'wave_active') {
    return res.status(400).json({ error: '当前无进行中的波次' });
  }

  if (state.currentWaveIndex >= level.waves.length) {
    state.waveState = 'complete';
    state.isLevelComplete = true;
    return res.json({ waveState: 'complete', isLevelComplete: true });
  }

  state.waveState = 'cooldown';
  return res.json({ waveState: 'cooldown' });
});

app.post('/api/levels/:levelId/waves/skip', (req, res) => {
  const { levelId } = req.params;
  const level = levels.find((l) => l.id === levelId);
  if (!level) {
    return res.status(404).json({ error: '关卡不存在' });
  }

  const state = getOrCreateState(levelId);
  if (!state || state.waveState !== 'preparing') {
    return res.status(400).json({ error: '当前不在准备阶段' });
  }

  const wave = level.waves[state.currentWaveIndex];
  state.waveState = 'wave_active';
  state.currentWaveIndex++;
  state.prepareStartTime = null;
  return res.json({
    waveState: 'wave_active',
    wave,
    waveIndex: state.currentWaveIndex,
    totalWaves: level.waves.length,
  });
});

app.get('/api/levels/:levelId/state', (req, res) => {
  const { levelId } = req.params;
  const state = getOrCreateState(levelId);
  if (!state) {
    return res.status(404).json({ error: '关卡不存在' });
  }

  const countdown = getRemainingCountdown(state);
  res.json({
    ...state,
    countdown,
  });
});

app.post('/api/levels/:levelId/reset', (req, res) => {
  const { levelId } = req.params;
  levelStates.delete(levelId);
  const state = getOrCreateState(levelId);
  res.json(state);
});

app.listen(PORT, () => {
  console.log(`[Tower Defense Server] 运行在 http://localhost:${PORT}`);
});
