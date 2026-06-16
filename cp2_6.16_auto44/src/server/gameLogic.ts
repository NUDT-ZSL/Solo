import { v4 as uuidv4 } from 'uuid';
import {
  Arrow,
  ArrowDirection,
  Player,
  GAME_CONFIG,
  DIRECTIONS,
} from '../shared/types';

export function generateArrow(
  player: Player,
  _difficulty: number,
  bpm: number = GAME_CONFIG.BASE_BPM
): Arrow {
  const speed = (GAME_CONFIG.BASE_SPEED * bpm) / GAME_CONFIG.BASE_BPM;
  const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

  return {
    id: uuidv4(),
    direction,
    player,
    y: GAME_CONFIG.ARROW_START_Y,
    speed,
    hit: false,
    missed: false,
  };
}

export function judgeHit(
  arrow: Arrow,
  judgeY: number = GAME_CONFIG.JUDGE_LINE_Y
): 'perfect' | 'good' | 'miss' | null {
  if (arrow.hit || arrow.missed) return null;

  const distance = Math.abs(arrow.y - judgeY);

  if (distance <= GAME_CONFIG.PERFECT_WINDOW) {
    return 'perfect';
  } else if (distance <= GAME_CONFIG.GOOD_WINDOW) {
    return 'good';
  } else if (distance <= GAME_CONFIG.MISS_WINDOW) {
    return 'miss';
  }

  return null;
}

export function calculateDamage(
  judgeResult: 'perfect' | 'good' | 'miss',
  isSpecial: boolean = false
): number {
  let baseDamage = 0;

  switch (judgeResult) {
    case 'perfect':
      baseDamage = GAME_CONFIG.HIT_DAMAGE * 1.5;
      break;
    case 'good':
      baseDamage = GAME_CONFIG.HIT_DAMAGE;
      break;
    case 'miss':
      baseDamage = GAME_CONFIG.MISS_DAMAGE;
      break;
  }

  if (isSpecial) {
    baseDamage += GAME_CONFIG.SPECIAL_DAMAGE;
  }

  return Math.floor(baseDamage);
}

export function shouldGenerateArrow(
  lastArrowTime: number,
  difficulty: number,
  currentTime: number
): boolean {
  const interval = GAME_CONFIG.DIFFICULTY_INTERVALS[Math.min(difficulty, 2)];
  return currentTime - lastArrowTime >= interval;
}

export function determineWinner(
  player1Health: number,
  player2Health: number
): Player {
  if (player1Health > player2Health) {
    return 'player1';
  } else if (player2Health > player1Health) {
    return 'player2';
  }
  return Math.random() > 0.5 ? 'player1' : 'player2';
}

export function updateArrowPosition(
  arrow: Arrow,
  deltaTime: number
): Arrow {
  if (arrow.hit || arrow.missed) return arrow;

  const newY = arrow.y - arrow.speed * deltaTime;

  if (newY < GAME_CONFIG.JUDGE_LINE_Y - GAME_CONFIG.MISS_WINDOW && !arrow.hit) {
    return { ...arrow, y: newY, missed: true };
  }

  return { ...arrow, y: newY };
}

export function isArrowOutOfBounds(arrow: Arrow): boolean {
  return arrow.y < -50;
}

export function getDifficultyForTime(timeRemaining: number): number {
  const elapsed = GAME_CONFIG.GAME_DURATION - timeRemaining;
  if (elapsed < 20) return 0;
  if (elapsed < 40) return 1;
  return 2;
}

export function handleKeyPress(
  arrows: Arrow[],
  player: Player,
  direction: ArrowDirection,
  judgeY: number = GAME_CONFIG.JUDGE_LINE_Y
): {
  hitArrows: Arrow[];
  result: 'perfect' | 'good' | 'miss' | null;
  updatedArrows: Arrow[];
} {
  const playerArrows = arrows.filter(
    (a) => a.player === player && !a.hit && !a.missed
  );

  const targetArrow = playerArrows
    .filter((a) => a.direction === direction)
    .sort((a, b) => Math.abs(a.y - judgeY) - Math.abs(b.y - judgeY))[0];

  if (!targetArrow) {
    return { hitArrows: [], result: null, updatedArrows: arrows };
  }

  const result = judgeHit(targetArrow, judgeY);

  if (!result) {
    return { hitArrows: [], result: null, updatedArrows: arrows };
  }

  const hitArrows: Arrow[] = [];
  const updatedArrows = arrows.map((a) => {
    if (a.id === targetArrow.id) {
      const updated = { ...a, hit: true, hitResult: result };
      if (result !== 'miss') {
        hitArrows.push(updated);
      }
      return updated;
    }
    return a;
  });

  return { hitArrows, result, updatedArrows };
}
