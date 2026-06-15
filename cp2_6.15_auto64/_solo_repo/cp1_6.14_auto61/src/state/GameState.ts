import { eventBus, GameEvent } from '../engine/EventBus';
import { PlantType, GameState as IGameState } from '../types/gameTypes';
import { PLANT_CONFIGS } from '../types/gameTypes';

class GameStateManager {
  private state: IGameState = {
    score: 0,
    health: 5,
    sunlight: 50,
    wave: 0,
    isGameOver: false,
    isPaused: false,
    selectedPlant: null,
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.ENEMY_DEATH, (data) => {
      const { score } = data as { score: number };
      this.addScore(score);
    });

    eventBus.on(GameEvent.ENEMY_REACHED_END, () => {
      this.takeDamage(1);
    });

    eventBus.on(GameEvent.SUN_GENERATED, (data) => {
      const { amount } = data as { amount: number };
      this.addSunlight(amount);
    });

    eventBus.on(GameEvent.PLANT_PLACED, (data) => {
      const { cost } = data as { cost: number };
      this.spendSunlight(cost);
    });

    eventBus.on(GameEvent.WAVE_START, (data) => {
      const { waveNumber } = data as { waveNumber: number };
      this.setWave(waveNumber);
    });

    eventBus.on(GameEvent.UI_SELECT_PLANT, (data) => {
      const plantType = data as PlantType | null;
      this.setSelectedPlant(plantType);
    });

    eventBus.on(GameEvent.GAME_RESTART, () => {
      this.reset();
    });
  }

  getState(): IGameState {
    return { ...this.state };
  }

  getScore(): number {
    return this.state.score;
  }

  getHealth(): number {
    return this.state.health;
  }

  getSunlight(): number {
    return this.state.sunlight;
  }

  getWave(): number {
    return this.state.wave;
  }

  getSelectedPlant(): PlantType | null {
    return this.state.selectedPlant;
  }

  getIsGameOver(): boolean {
    return this.state.isGameOver;
  }

  private addScore(amount: number): void {
    this.state.score += amount;
    eventBus.emit(GameEvent.SCORE_UPDATE, this.state.score);
  }

  private takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
    eventBus.emit(GameEvent.HEALTH_UPDATE, this.state.health);

    if (this.state.health <= 0) {
      this.state.isGameOver = true;
      eventBus.emit(GameEvent.GAME_OVER, { score: this.state.score });
    }
  }

  private addSunlight(amount: number): void {
    this.state.sunlight += amount;
    eventBus.emit(GameEvent.SUNLIGHT_UPDATE, this.state.sunlight);
  }

  private spendSunlight(amount: number): boolean {
    if (this.state.sunlight >= amount) {
      this.state.sunlight -= amount;
      eventBus.emit(GameEvent.SUNLIGHT_UPDATE, this.state.sunlight);
      return true;
    }
    return false;
  }

  private setWave(wave: number): void {
    this.state.wave = wave;
  }

  setSelectedPlant(plant: PlantType | null): void {
    this.state.selectedPlant = plant;
  }

  canAfford(plantType: PlantType): boolean {
    const config = PLANT_CONFIGS[plantType];
    return this.state.sunlight >= config.cost;
  }

  reset(): void {
    this.state = {
      score: 0,
      health: 5,
      sunlight: 50,
      wave: 0,
      isGameOver: false,
      isPaused: false,
      selectedPlant: null,
    };
    eventBus.emit(GameEvent.SCORE_UPDATE, 0);
    eventBus.emit(GameEvent.HEALTH_UPDATE, 5);
    eventBus.emit(GameEvent.SUNLIGHT_UPDATE, 50);
  }
}

export const gameState = new GameStateManager();
export default gameState;
