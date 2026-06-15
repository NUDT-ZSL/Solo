import type { GameRecord, PlayerStats, DifficultyConfig, SeedResponse } from './types';

const BASE_CONFIG: DifficultyConfig = {
  monsterDensityMultiplier: 1.0,
  trapDensityMultiplier: 1.0,
  treasureDropRate: 1.0,
  monsterAIStrength: 1.0,
};

export async function submitGameRecord(record: GameRecord): Promise<PlayerStats> {
  const response = await fetch('/api/record', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    throw new Error('Failed to submit record');
  }
  return response.json();
}

export async function fetchPlayerStats(): Promise<PlayerStats> {
  const response = await fetch('/api/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}

export function analyzeDifficulty(records: GameRecord[]): {
  levelAdjust: number;
  configAdjust: Partial<DifficultyConfig>;
  hint: string;
} {
  if (records.length < 2) {
    return { levelAdjust: 0, configAdjust: {}, hint: '' };
  }

  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  const recent = sorted.slice(0, 5);

  const consecutiveClears: GameRecord[] = [];
  for (const r of recent) {
    if (r.cleared) {
      consecutiveClears.push(r);
    } else {
      break;
    }
  }

  const consecutiveFails: GameRecord[] = [];
  for (const r of recent) {
    if (!r.cleared) {
      consecutiveFails.push(r);
    } else {
      break;
    }
  }

  if (consecutiveClears.length >= 3) {
    const avgHpRatio =
      consecutiveClears.reduce((sum, r) => sum + r.remainingHp / r.maxHp, 0) /
      consecutiveClears.length;
    if (avgHpRatio > 0.8) {
      return {
        levelAdjust: 1,
        configAdjust: {
          monsterAIStrength: 1.2,
        },
        hint: '表现出色！难度自动提升',
      };
    }
  }

  if (consecutiveFails.length >= 2) {
    return {
      levelAdjust: 0,
      configAdjust: {
        monsterDensityMultiplier: 0.7,
      },
      hint: '难度降低：怪物密度减少30%',
    };
  }

  return { levelAdjust: 0, configAdjust: {}, hint: '' };
}

export function applyDifficultyAdjustment(
  baseConfig: DifficultyConfig,
  adjustment: Partial<DifficultyConfig>,
): DifficultyConfig {
  return {
    monsterDensityMultiplier:
      adjustment.monsterDensityMultiplier ?? baseConfig.monsterDensityMultiplier,
    trapDensityMultiplier:
      adjustment.trapDensityMultiplier ?? baseConfig.trapDensityMultiplier,
    treasureDropRate: adjustment.treasureDropRate ?? baseConfig.treasureDropRate,
    monsterAIStrength: adjustment.monsterAIStrength ?? baseConfig.monsterAIStrength,
  };
}

export function calculateAdjustedConfig(
  seedResponse: SeedResponse,
  levelAdjust: number,
  configAdjust: Partial<DifficultyConfig>,
): { threatLevel: number; config: DifficultyConfig } {
  const adjustedLevel = Math.max(1, Math.min(10, seedResponse.config && levelAdjust ? 1 : 1));
  const config = applyDifficultyAdjustment(
    seedResponse.config ?? BASE_CONFIG,
    configAdjust,
  );
  return { threatLevel: adjustedLevel, config };
}
