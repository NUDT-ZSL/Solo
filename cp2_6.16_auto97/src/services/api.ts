export interface MicrobeConfig {
  initialCount: number;
  minRadius: number;
  maxRadius: number;
  minSpeed: number;
  maxSpeed: number;
  minTurnFrequency: number;
  maxTurnFrequency: number;
  energyDecayRate: number;
}

export interface ChemicalConfig {
  maxAttractors: number;
  maxRepellents: number;
  radius: number;
  duration: number;
  highConcentrationThreshold: number;
  speedBoost: number;
  speedBoostDuration: number;
}

export interface CollisionConfig {
  bounceSpeedFactor: number;
  flashDuration: number;
  flashRadiusMultiplier: number;
  fusionEnergyThreshold: number;
  fusionEnergyFactor: number;
  fusionRadiusBonus: number;
}

export interface GameConfig {
  microbe: MicrobeConfig;
  chemical: ChemicalConfig;
  collision: CollisionConfig;
}

export interface SaveScoreRequest {
  playerName: string;
  maxMicrobeCount: number;
  avgEnergy: number;
  duration: number;
  timestamp: number;
}

export interface SaveScoreResponse {
  success: boolean;
  id: string;
  rank: number;
}

export async function getConfig(): Promise<GameConfig> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to fetch config');
    return (await res.json()) as GameConfig;
  } catch {
    return {
      microbe: {
        initialCount: 50,
        minRadius: 6,
        maxRadius: 12,
        minSpeed: 40,
        maxSpeed: 80,
        minTurnFrequency: 1,
        maxTurnFrequency: 3,
        energyDecayRate: 0.5,
      },
      chemical: {
        maxAttractors: 5,
        maxRepellents: 5,
        radius: 80,
        duration: 8000,
        highConcentrationThreshold: 70,
        speedBoost: 1.5,
        speedBoostDuration: 2000,
      },
      collision: {
        bounceSpeedFactor: 0.6,
        flashDuration: 300,
        flashRadiusMultiplier: 1.5,
        fusionEnergyThreshold: 20,
        fusionEnergyFactor: 0.7,
        fusionRadiusBonus: 2,
      },
    };
  }
}

export async function saveScore(data: SaveScoreRequest): Promise<SaveScoreResponse> {
  try {
    const res = await fetch('/api/save-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save score');
    return (await res.json()) as SaveScoreResponse;
  } catch {
    return { success: false, id: '', rank: -1 };
  }
}
