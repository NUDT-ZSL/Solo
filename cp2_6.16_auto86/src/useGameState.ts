import { useState, useCallback, useMemo } from 'react';
import type { GameState, Bubble, Boss, BubbleType } from './types';
import {
  GAME_WIDTH,
  LAYER_HEIGHT,
  BUBBLE_MIN_RADIUS,
  BUBBLE_MAX_RADIUS,
  BUBBLES_PER_LAYER_MIN,
  BUBBLES_PER_LAYER_MAX,
  PLAYER_START_X,
  PLAYER_START_Y,
  BOSS_RADIUS,
  BOSS_MAX_HEALTH,
  BOSS_SPAWN_INTERVAL,
  COLOR_START,
  COLOR_END,
  VISIBLE_LAYERS,
} from './constants';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function generateBubbleId(): string {
  return `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateLayerBubbles(level: number, isBossLayer: boolean): Bubble[] {
  if (isBossLayer) {
    const bubbles: Bubble[] = [];
    const centerX = GAME_WIDTH / 2;
    const y = level * LAYER_HEIGHT + LAYER_HEIGHT / 2;
    
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2;
      const radius = 150;
      bubbles.push({
        id: generateBubbleId(),
        x: centerX + Math.cos(angle) * radius,
        y,
        radius: 40,
        type: 'elastic',
        color: interpolateColor(COLOR_START, COLOR_END, 0.7),
        glowColor: interpolateColor(COLOR_START, COLOR_END, 0.7),
        breathPhase: Math.random(),
        isBroken: false,
        fragments: [],
      });
    }
    return bubbles;
  }

  const bubbleCount =
    Math.floor(Math.random() * (BUBBLES_PER_LAYER_MAX - BUBBLES_PER_LAYER_MIN + 1)) +
    BUBBLES_PER_LAYER_MIN;
  const bubbles: Bubble[] = [];
  const centerX = GAME_WIDTH / 2;
  const y = level * LAYER_HEIGHT + LAYER_HEIGHT / 2;
  const ringRadius = 120;

  const bubbleTypes: BubbleType[] = ['elastic', 'sticky', 'fragile', 'spike'];
  const typeWeights = [0.4, 0.25, 0.25, 0.1];

  for (let i = 0; i < bubbleCount; i++) {
    const angle = (i / bubbleCount) * Math.PI * 2 + Math.random() * 0.3;
    const randomRadius =
      BUBBLE_MIN_RADIUS + Math.random() * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS);

    let type: BubbleType = 'elastic';
    const rand = Math.random();
    let cumulative = 0;
    for (let j = 0; j < bubbleTypes.length; j++) {
      cumulative += typeWeights[j];
      if (rand < cumulative) {
        type = bubbleTypes[j];
        break;
      }
    }

    let color: string;
    if (type === 'spike') {
      color = '#2c3e50';
    } else if (type === 'elastic') {
      color = interpolateColor(COLOR_START, COLOR_END, 0.6 + Math.random() * 0.4);
    } else if (type === 'sticky') {
      color = interpolateColor(COLOR_START, COLOR_END, 0.3 + Math.random() * 0.3);
    } else {
      color = interpolateColor(COLOR_START, COLOR_END, Math.random() * 0.3);
    }

    bubbles.push({
      id: generateBubbleId(),
      x: centerX + Math.cos(angle) * ringRadius,
      y,
      radius: randomRadius,
      type,
      color,
      glowColor: color,
      breathPhase: Math.random(),
      isBroken: false,
      fragments: [],
    });
  }

  return bubbles;
}

function generateBoss(level: number): Boss {
  return {
    x: GAME_WIDTH / 2,
    y: level * LAYER_HEIGHT + LAYER_HEIGHT / 2,
    radius: BOSS_RADIUS,
    rotation: 0,
    health: BOSS_MAX_HEALTH,
    maxHealth: BOSS_MAX_HEALTH,
    spikeTimer: 0,
    active: true,
  };
}

function generateInitialBubbles(): Bubble[][] {
  const bubbles: Bubble[][] = [];
  for (let level = 0; level < VISIBLE_LAYERS + 2; level++) {
    const isBossLayer = (level + 1) % BOSS_SPAWN_INTERVAL === 0;
    bubbles.push(generateLayerBubbles(level, isBossLayer));
  }
  return bubbles;
}

const initialState: GameState = {
  phase: 'menu',
  level: 1,
  score: 0,
  lives: 3,
  maxLives: 3,
  scoreMultiplier: 1,
  bubbles: [],
  boss: null,
  trackingSpikes: [],
  cameraY: 0,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialState);

  const startGame = useCallback(() => {
    const bubbles = generateInitialBubbles();
    setGameState({
      phase: 'playing',
      level: 1,
      score: 0,
      lives: 3,
      maxLives: 3,
      scoreMultiplier: 1,
      bubbles,
      boss: null,
      trackingSpikes: [],
      cameraY: 0,
    });
  }, []);

  const pauseGame = useCallback(() => {
    setGameState((prev) =>
      prev.phase === 'playing' || prev.phase === 'boss' ? { ...prev, phase: 'paused' } : prev
    );
  }, []);

  const resumeGame = useCallback(() => {
    setGameState((prev) =>
      prev.phase === 'paused' ? { ...prev, phase: prev.boss ? 'boss' : 'playing' } : prev
    );
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initialState);
  }, []);

  const hitSpike = useCallback(() => {
    setGameState((prev) => {
      const newLives = prev.lives - 1;
      if (newLives <= 0) {
        return { ...prev, lives: 0, phase: 'gameover' };
      }
      return {
        ...prev,
        lives: newLives,
      };
    });
  }, []);

  const addScore = useCallback((points: number) => {
    setGameState((prev) => ({
      ...prev,
      score: prev.score + points * prev.scoreMultiplier,
    }));
  }, []);

  const nextLevel = useCallback(() => {
    setGameState((prev) => {
      const newLevel = prev.level + 1;
      const isBossLayer = newLevel % BOSS_SPAWN_INTERVAL === 0;

      const newBubbles = [...prev.bubbles];
      while (newBubbles.length <= newLevel + VISIBLE_LAYERS) {
        const layerIndex = newBubbles.length;
        const layerIsBoss = (layerIndex + 1) % BOSS_SPAWN_INTERVAL === 0;
        newBubbles.push(generateLayerBubbles(layerIndex, layerIsBoss));
      }

      const targetCameraY = Math.max(0, (newLevel - 2) * LAYER_HEIGHT);

      if (isBossLayer) {
        return {
          ...prev,
          phase: 'boss',
          level: newLevel,
          bubbles: newBubbles,
          boss: generateBoss(newLevel - 1),
          cameraY: targetCameraY,
          trackingSpikes: [],
        };
      }

      return {
        ...prev,
        phase: 'playing',
        level: newLevel,
        bubbles: newBubbles,
        cameraY: targetCameraY,
        score: prev.score + 50 * prev.scoreMultiplier,
      };
    });
  }, []);

  const defeatBoss = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: 'reward',
      scoreMultiplier: prev.scoreMultiplier * 2,
      boss: null,
      trackingSpikes: [],
      score: prev.score + 500 * prev.scoreMultiplier,
    }));
    setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        phase: 'playing',
      }));
    }, 1500);
  }, []);

  const updateBubbles = useCallback((bubbles: Bubble[][]) => {
    setGameState((prev) => ({ ...prev, bubbles }));
  }, []);

  const updateBoss = useCallback((boss: Boss | null) => {
    setGameState((prev) => ({ ...prev, boss }));
  }, []);

  const updateSpikes = useCallback((spikes: typeof gameState.trackingSpikes) => {
    setGameState((prev) => ({ ...prev, trackingSpikes: spikes }));
  }, []);

  const damageBoss = useCallback(() => {
    setGameState((prev) => {
      if (!prev.boss) return prev;
      const newHealth = prev.boss.health - 15;
      if (newHealth <= 0) {
        return {
          ...prev,
          boss: { ...prev.boss, health: 0, active: false },
          score: prev.score + 200 * prev.scoreMultiplier,
        };
      }
      return {
        ...prev,
        boss: { ...prev.boss, health: newHealth },
        score: prev.score + 200 * prev.scoreMultiplier,
      };
    });
  }, []);

  const playerStartPos = useMemo(
    () => ({ x: PLAYER_START_X, y: PLAYER_START_Y }),
    []
  );

  return {
    gameState,
    playerStartPos,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    hitSpike,
    addScore,
    nextLevel,
    defeatBoss,
    updateBubbles,
    updateBoss,
    updateSpikes,
    damageBoss,
  };
}
