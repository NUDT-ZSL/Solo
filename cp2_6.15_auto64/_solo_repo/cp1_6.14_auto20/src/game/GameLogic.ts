import {
  PlantState,
  PlantStage,
  SoundType,
  createInitialPlant,
  updatePlant,
  waterPlant,
  MOOD_COLORS,
} from './PlantState';

export { type PlantState, type PlantStage, type SoundType, MOOD_COLORS };

export interface GameState {
  plant: PlantState;
  activeSound: SoundType;
  isMeditating: boolean;
  meditationRemaining: number;
  canWater: boolean;
  waterCooldownMs: number;
  meditationElapsedMs: number;
}

export interface GameLogicConfig {
  waterCooldownMs: number;
  meditationDurationMs: number;
}

const DEFAULT_CONFIG: GameLogicConfig = {
  waterCooldownMs: 5000,
  meditationDurationMs: 60000,
};

const BREATH_PERIOD_MS = 4000;

export class GameLogic {
  private state: GameState;
  private config: GameLogicConfig;
  private lastWaterTimestamp: number = 0;
  private breathPhase: number = 0;
  private stageChangePending: PlantStage | null = null;

  constructor(config: Partial<GameLogicConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      plant: createInitialPlant(),
      activeSound: 'none',
      isMeditating: false,
      meditationRemaining: Math.ceil(this.config.meditationDurationMs / 1000),
      canWater: true,
      waterCooldownMs: 0,
      meditationElapsedMs: 0,
    };
  }

  getState(): GameState {
    return {
      ...this.state,
      plant: { ...this.state.plant, leafUnfurl: [...this.state.plant.leafUnfurl] },
    };
  }

  getPlant(): PlantState {
    return this.state.plant;
  }

  update(dtMs: number, currentTimeMs: number): PlantStage | null {
    const stageChanged = updatePlant(this.state.plant, dtMs);

    if (this.lastWaterTimestamp > 0) {
      const elapsed = currentTimeMs - this.lastWaterTimestamp;
      const remaining = Math.max(0, this.config.waterCooldownMs - elapsed);
      this.state.waterCooldownMs = remaining;
      this.state.canWater = remaining <= 0;
    }

    if (this.state.isMeditating) {
      this.state.meditationElapsedMs += dtMs;
      this.breathPhase += (Math.PI * 2 / BREATH_PERIOD_MS) * dtMs;
      this.state.meditationRemaining = Math.max(0, Math.ceil(
        (this.config.meditationDurationMs - this.state.meditationElapsedMs) / 1000
      ));

      if (this.state.meditationElapsedMs >= this.config.meditationDurationMs) {
        this.exitMeditation();
      }
    }

    this.stageChangePending = stageChanged;
    return stageChanged;
  }

  consumeStageChange(): PlantStage | null {
    const change = this.stageChangePending;
    this.stageChangePending = null;
    return change;
  }

  water(currentTimeMs: number): boolean {
    if (!this.state.canWater) return false;
    this.lastWaterTimestamp = currentTimeMs;
    this.state.canWater = false;
    this.state.waterCooldownMs = this.config.waterCooldownMs;
    waterPlant(this.state.plant);
    return true;
  }

  setLight(level: number): void {
    this.state.plant.lightLevel = Math.max(0, Math.min(100, level));
  }

  setSound(sound: SoundType): void {
    this.state.activeSound = sound;
  }

  enterMeditation(): void {
    if (this.state.isMeditating) return;
    this.state.isMeditating = true;
    this.state.meditationElapsedMs = 0;
    this.state.meditationRemaining = Math.ceil(this.config.meditationDurationMs / 1000);
    this.breathPhase = 0;
  }

  exitMeditation(): void {
    this.state.isMeditating = false;
    this.state.meditationElapsedMs = 0;
    this.state.meditationRemaining = 0;
  }

  getBreathPhase(): number {
    return this.breathPhase;
  }

  isMeditating(): boolean {
    return this.state.isMeditating;
  }

  getActiveSound(): SoundType {
    return this.state.activeSound;
  }

  getMoodColor(): string {
    return MOOD_COLORS[this.state.plant.stage];
  }

  reset(): void {
    this.state.plant = createInitialPlant();
    this.state.activeSound = 'none';
    this.state.isMeditating = false;
    this.state.meditationRemaining = Math.ceil(this.config.meditationDurationMs / 1000);
    this.state.canWater = true;
    this.state.waterCooldownMs = 0;
    this.state.meditationElapsedMs = 0;
    this.lastWaterTimestamp = 0;
    this.breathPhase = 0;
    this.stageChangePending = null;
  }
}
