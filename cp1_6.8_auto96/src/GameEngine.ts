import {
  EchoStoneData,
  generateStones,
  updateStone,
  drawStone,
  isStoneVisible,
} from './EchoStone';
import {
  ResonatorState,
  createResonator,
  updateResonator,
  isFrequencyMatch,
  triggerMatchFeedback,
  triggerMismatchFeedback,
  playMatchSound,
  playMismatchSound,
  playDoorOpenSound,
} from './Resonator';

export interface LevelConfig {
  name: string;
  hint: string;
  frequencies: number[];
  tolerance: number;
}

export const LEVELS: LevelConfig[] = [
  {
    name: '觉醒之厅',
    hint: '调整频率至共鸣石谐振点，唤醒沉睡的回声',
    frequencies: [200, 450, 700],
    tolerance: 15,
  },
  {
    name: '幻影回廊',
    hint: '更精密的频率校准，更微弱的共鸣信号',
    frequencies: [150, 330, 520, 780],
    tolerance: 12,
  },
  {
    name: '永恒圣殿',
    hint: '在混沌的频率中寻找秩序，解开最终封印',
    frequencies: [88, 234, 401, 567, 733, 912],
    tolerance: 10,
  },
];

export interface GameState {
  currentLevel: number;
  resonator: ResonatorState;
  stones: EchoStoneData[];
  collectedCount: number;
  totalStones: number;
  levelComplete: boolean;
  gameComplete: boolean;
  doorOpenAnim: number;
  mismatchFlash: number;
  time: number;
  canvasW: number;
  canvasH: number;
}

export function createGameState(canvasW: number, canvasH: number): GameState {
  const level = LEVELS[0];
  return {
    currentLevel: 0,
    resonator: createResonator(),
    stones: generateStones(level.frequencies, canvasW, canvasH),
    collectedCount: 0,
    totalStones: level.frequencies.length,
    levelComplete: false,
    gameComplete: false,
    doorOpenAnim: 0,
    mismatchFlash: 0,
    time: 0,
    canvasW,
    canvasH,
  };
}

export function loadLevel(
  state: GameState,
  levelIndex: number,
): GameState {
  if (levelIndex < 0 || levelIndex >= LEVELS.length) return state;
  const level = LEVELS[levelIndex];
  return {
    ...state,
    currentLevel: levelIndex,
    resonator: createResonator(),
    stones: generateStones(level.frequencies, state.canvasW, state.canvasH),
    collectedCount: 0,
    totalStones: level.frequencies.length,
    levelComplete: false,
    gameComplete: false,
    doorOpenAnim: 0,
    mismatchFlash: 0,
  };
}

export function resizeGame(
  state: GameState,
  canvasW: number,
  canvasH: number,
): GameState {
  const level = LEVELS[state.currentLevel];
  const uncollectedFreqs = state.stones
    .filter((s) => !s.collected)
    .map((s) => s.frequency);
  const newStones = generateStones(level.frequencies, canvasW, canvasH);
  const mergedStones = newStones.map((ns) => {
    if (!uncollectedFreqs.includes(ns.frequency)) {
      return { ...ns, collected: true, vanishAnim: 1 };
    }
    return ns;
  });

  return {
    ...state,
    canvasW,
    canvasH,
    stones: mergedStones,
  };
}

let prevMatchState: Record<string, boolean> = {};

export function updateGame(state: GameState, dt: number): GameState {
  if (state.gameComplete) return state;

  const newTime = state.time + dt;
  let resonator = updateResonator(state.resonator, dt);
  let mismatchFlash = Math.max(0, state.mismatchFlash - dt * 5);
  let doorOpenAnim = state.doorOpenAnim;

  const tolerance = LEVELS[state.currentLevel].tolerance;
  let collectedCount = state.collectedCount;

  const updatedStones = state.stones.map((stone) => {
    if (stone.collected) return updateStone(stone, dt);

    const matched = isFrequencyMatch(resonator.frequency, stone.frequency);
    const wasMatched = prevMatchState[stone.id] || false;

    if (matched && !wasMatched) {
      playMatchSound(stone.frequency);
      resonator = triggerMatchFeedback(resonator);
    } else if (!matched && wasMatched) {
      resonator = triggerMismatchFeedback(resonator);
      mismatchFlash = 0.5;
      playMismatchSound();
    }

    prevMatchState[stone.id] = matched;

    const updatedStone = updateStone(
      { ...stone, matching: matched },
      dt,
    );

    if (matched && !stone.collected && updatedStone.collectAnim >= 0.9) {
      prevMatchState[stone.id] = false;
      collectedCount++;
      return { ...updatedStone, collected: true };
    }

    return updatedStone;
  });

  const levelComplete = collectedCount >= state.totalStones;

  if (levelComplete && !state.levelComplete) {
    playDoorOpenSound();
    doorOpenAnim = 0;
  }

  if (levelComplete) {
    doorOpenAnim = Math.min(1, doorOpenAnim + dt * 0.8);
  }

  const gameComplete = levelComplete && state.currentLevel >= LEVELS.length - 1;

  return {
    ...state,
    time: newTime,
    resonator,
    stones: updatedStones,
    collectedCount,
    levelComplete,
    gameComplete,
    doorOpenAnim,
    mismatchFlash,
  };
}

export function setFrequency(state: GameState, freq: number): GameState {
  return {
    ...state,
    resonator: {
      ...state.resonator,
      targetFrequency: Math.max(0, Math.min(1000, freq)),
    },
  };
}

export function adjustFrequency(state: GameState, delta: number): GameState {
  return {
    ...state,
    resonator: {
      ...state.resonator,
      targetFrequency: Math.max(
        0,
        Math.min(1000, state.resonator.targetFrequency + delta),
      ),
    },
  };
}

export function nextLevel(state: GameState): GameState {
  if (state.currentLevel < LEVELS.length - 1) {
    return loadLevel(state, state.currentLevel + 1);
  }
  return state;
}

export function restartGame(state: GameState): GameState {
  prevMatchState = {};
  return loadLevel(state, 0);
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { canvasW, canvasH } = state;

  ctx.clearRect(0, 0, canvasW, canvasH);

  drawBackground(ctx, state);

  state.stones.forEach((stone) => {
    if (isStoneVisible(stone)) {
      drawStone(ctx, stone, state.time);
    }
  });

  drawFrequencyWave(ctx, state);

  if (state.levelComplete) {
    drawDoor(ctx, state);
  }

  if (state.mismatchFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 50, 50, ${state.mismatchFlash * 0.15})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { canvasW, canvasH } = state;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  bgGrad.addColorStop(0, '#0d0d1a');
  bgGrad.addColorStop(0.5, '#0a0a14');
  bgGrad.addColorStop(1, '#050510');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.save();
  ctx.strokeStyle = 'rgba(218, 165, 32, 0.04)';
  ctx.lineWidth = 1;

  const spacing = 60;
  for (let x = 0; x < canvasW; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasH);
    ctx.stroke();
  }
  for (let y = 0; y < canvasH; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const t = state.time * 0.3;
  for (let i = 0; i < 5; i++) {
    const px = canvasW * 0.5 + Math.cos(t + i * 1.3) * canvasW * 0.3;
    const py = canvasH * 0.35 + Math.sin(t * 0.7 + i * 0.9) * canvasH * 0.15;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 150);
    grad.addColorStop(0, 'rgba(0, 200, 255, 0.03)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  ctx.restore();
}

function drawFrequencyWave(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { canvasW, canvasH, resonator, time } = state;
  const waveY = canvasH * 0.62;
  const waveH = 30;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 220, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (let x = 0; x < canvasW; x += 2) {
    const freqFactor = resonator.frequency / 1000;
    const y =
      waveY +
      Math.sin(x * 0.02 * (1 + freqFactor * 3) + time * 3) * waveH * freqFactor;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(218, 165, 32, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < canvasW; x += 2) {
    const freqFactor = resonator.frequency / 1000;
    const y =
      waveY +
      Math.sin(x * 0.015 * (1 + freqFactor * 2) + time * 2 + 1) *
        waveH *
        freqFactor *
        0.6;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { canvasW, canvasH, doorOpenAnim } = state;
  const cx = canvasW / 2;
  const cy = canvasH * 0.38;
  const doorW = 120;
  const doorH = 180;

  ctx.save();
  ctx.globalAlpha = 1 - doorOpenAnim;

  const doorGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, doorH);
  doorGrad.addColorStop(0, 'rgba(218, 165, 32, 0.6)');
  doorGrad.addColorStop(0.5, 'rgba(218, 165, 32, 0.3)');
  doorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = doorGrad;
  ctx.fillRect(cx - doorH, cy - doorH, doorH * 2, doorH * 2);

  const halfW = (doorW / 2) * (1 - doorOpenAnim * 0.8);
  ctx.fillStyle = 'rgba(30, 25, 15, 0.9)';
  ctx.fillRect(cx - doorW, cy - doorH / 2, doorW - halfW, doorH);
  ctx.fillRect(cx + halfW, cy - doorH / 2, doorW - halfW, doorH);

  ctx.strokeStyle = 'rgba(218, 165, 32, 0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - doorW, cy - doorH / 2, doorW - halfW, doorH);
  ctx.strokeRect(cx + halfW, cy - doorH / 2, doorW - halfW, doorH);

  if (doorOpenAnim > 0.3) {
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, doorH * 0.6);
    innerGrad.addColorStop(0, `rgba(255, 230, 150, ${doorOpenAnim * 0.8})`);
    innerGrad.addColorStop(0.5, `rgba(218, 165, 32, ${doorOpenAnim * 0.4})`);
    innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(cx - doorH, cy - doorH, doorH * 2, doorH * 2);
  }

  ctx.restore();
}
