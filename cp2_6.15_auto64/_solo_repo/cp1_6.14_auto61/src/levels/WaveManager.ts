import { eventBus, GameEvent } from '../engine/EventBus';
import { EnemyType, HEX_CONFIG } from '../types/gameTypes';
import unitManager from '../units/UnitManager';

interface WaveEnemy {
  type: EnemyType;
  delay: number;
  row: number;
}

interface Wave {
  waveNumber: number;
  enemies: WaveEnemy[];
  startTime: number;
  started: boolean;
  completed: boolean;
}

export class WaveManager {
  private currentWave: number = 0;
  private waves: Wave[] = [];
  private gameTime: number = 0;
  private firstWaveDelay: number = 15;
  private waveInterval: number = 20;
  private isRunning: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.TICK, (deltaTime) => this.update(deltaTime as number));
    eventBus.on(GameEvent.GAME_START, () => this.start());
    eventBus.on(GameEvent.GAME_RESTART, () => this.reset());
  }

  start(): void {
    this.isRunning = true;
    this.gameTime = 0;
    this.currentWave = 0;
    this.waves = [];
    this.generateNextWave();
  }

  reset(): void {
    this.isRunning = false;
    this.gameTime = 0;
    this.currentWave = 0;
    this.waves = [];
  }

  private update(deltaTime: number): void {
    if (!this.isRunning) return;

    this.gameTime += deltaTime;

    this.waves.forEach((wave) => {
      if (!wave.started && this.gameTime >= wave.startTime) {
        this.startWave(wave);
      }

      if (wave.started && !wave.completed) {
        this.updateWave(wave, deltaTime);
      }
    });

    const lastWave = this.waves[this.waves.length - 1];
    if (!lastWave || lastWave.completed) {
      this.generateNextWave();
    }

    eventBus.emit('wave_update', { currentWave: this.currentWave, gameTime: this.gameTime });
  }

  private generateNextWave(): void {
    this.currentWave++;
    const waveNumber = this.currentWave;

    const startTime = waveNumber === 1
      ? this.firstWaveDelay
      : this.firstWaveDelay + (waveNumber - 1) * this.waveInterval;

    const enemies = this.generateWaveEnemies(waveNumber);

    const wave: Wave = {
      waveNumber,
      enemies,
      startTime,
      started: false,
      completed: false,
    };

    this.waves.push(wave);
  }

  private generateWaveEnemies(waveNumber: number): WaveEnemy[] {
    const enemies: WaveEnemy[] = [];
    const baseCount = 3 + Math.floor(waveNumber * 1.5);
    const types: EnemyType[] = ['bee', 'butterfly'];

    if (waveNumber >= 2) {
      types.push('beetle');
    }

    for (let i = 0; i < baseCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const row = Math.floor(Math.random() * HEX_CONFIG.rows);
      const delay = i * (1 + Math.random() * 1.5);

      enemies.push({ type, delay, row });
    }

    return enemies;
  }

  private startWave(wave: Wave): void {
    wave.started = true;
    eventBus.emit(GameEvent.WAVE_START, { waveNumber: wave.waveNumber });
  }

  private updateWave(wave: Wave, _deltaTime: number): void {
    let allSpawned = true;

    wave.enemies.forEach((enemyConfig) => {
      const spawnTime = wave.startTime + enemyConfig.delay;
      if (this.gameTime >= spawnTime && !(enemyConfig as WaveEnemy & { spawned?: boolean }).spawned) {
        (enemyConfig as WaveEnemy & { spawned?: boolean }).spawned = true;
        eventBus.emit(GameEvent.SPAWN_ENEMY, {
          type: enemyConfig.type,
          row: enemyConfig.row,
        });
      }

      if (!(enemyConfig as WaveEnemy & { spawned?: boolean }).spawned) {
        allSpawned = false;
      }
    });

    if (allSpawned) {
      const enemies = unitManager.getEnemies();
      if (enemies.length === 0) {
        wave.completed = true;
        eventBus.emit(GameEvent.WAVE_COMPLETE, { waveNumber: wave.waveNumber });
      }
    }
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getTimeToNextWave(): number {
    const nextWave = this.waves.find((w) => !w.started);
    if (nextWave) {
      return Math.max(0, nextWave.startTime - this.gameTime);
    }
    return 0;
  }
}

export const waveManager = new WaveManager();
export default waveManager;
