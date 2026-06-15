import Phaser from 'phaser';
import { ResourceManager } from './ResourceManager';

export enum EnemyType {
  NORMAL = 'normal',
  HEAVY = 'heavy',
  FAST = 'fast'
}

export interface WaveConfig {
  enemyCount: number;
  enemyTypes: EnemyType[];
  spawnInterval: number;
}

export type WaveState = 'idle' | 'countdown' | 'spawning' | 'in_progress' | 'completed';

export class WaveManager {
  private _scene: Phaser.Scene;
  private _resourceManager: ResourceManager;
  private _currentWave: number = 0;
  private _state: WaveState = 'idle';
  private _autoMode: boolean = false;
  private _countdownTimer: Phaser.Time.TimerEvent | null = null;
  private _spawnTimer: Phaser.Time.TimerEvent | null = null;
  private _enemiesSpawned: number = 0;
  private _enemiesAlive: number = 0;
  private _currentWaveConfig: WaveConfig | null = null;

  private _onCountdown: ((count: number) => void) | null = null;
  private _onCountdownComplete: (() => void) | null = null;
  private _onSpawnEnemy: ((type: EnemyType) => void) | null = null;
  private _onWaveComplete: ((wave: number) => void) | null = null;
  private _onStateChange: ((state: WaveState) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this._scene = scene;
    this._resourceManager = ResourceManager.getInstance();
  }

  public get state(): WaveState {
    return this._state;
  }

  public get currentWave(): number {
    return this._currentWave;
  }

  public get autoMode(): boolean {
    return this._autoMode;
  }

  public setAutoMode(enabled: boolean): void {
    this._autoMode = enabled;
  }

  public toggleAutoMode(): boolean {
    this._autoMode = !this._autoMode;
    return this._autoMode;
  }

  public onCountdown(callback: (count: number) => void): void {
    this._onCountdown = callback;
  }

  public onCountdownComplete(callback: () => void): void {
    this._onCountdownComplete = callback;
  }

  public onSpawnEnemy(callback: (type: EnemyType) => void): void {
    this._onSpawnEnemy = callback;
  }

  public onWaveComplete(callback: (wave: number) => void): void {
    this._onWaveComplete = callback;
  }

  public onStateChange(callback: (state: WaveState) => void): void {
    this._onStateChange = callback;
  }

  private _setState(state: WaveState): void {
    this._state = state;
    if (this._onStateChange) {
      this._onStateChange(state);
    }
  }

  public startNextWave(): void {
    if (this._state !== 'idle' && this._state !== 'completed') return;
    this._startCountdown();
  }

  private _startCountdown(): void {
    this._setState('countdown');
    let count = 3;

    if (this._onCountdown) {
      this._onCountdown(count);
    }

    this._countdownTimer = this._scene.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        count--;
        if (count > 0 && this._onCountdown) {
          this._onCountdown(count);
        }
      },
      callbackScope: this
    });

    this._scene.time.delayedCall(3000, () => {
      if (this._onCountdownComplete) {
        this._onCountdownComplete();
      }
      this._beginSpawning();
    }, [], this);
  }

  private _generateWaveConfig(wave: number): WaveConfig {
    const baseCount = 10;
    const bonusCount = Math.floor(wave / 2);
    const enemyCount = Math.min(15, baseCount + bonusCount);

    const types: EnemyType[] = [];
    types.push(EnemyType.NORMAL);

    if (wave >= 2) types.push(EnemyType.FAST);
    if (wave >= 3) types.push(EnemyType.HEAVY);

    return {
      enemyCount,
      enemyTypes: types,
      spawnInterval: Math.max(400, 900 - wave * 40)
    };
  }

  private _beginSpawning(): void {
    this._currentWave++;
    this._resourceManager.incrementWave();
    this._currentWaveConfig = this._generateWaveConfig(this._currentWave);
    this._enemiesSpawned = 0;
    this._enemiesAlive = this._currentWaveConfig.enemyCount;
    this._setState('spawning');

    this._spawnTimer = this._scene.time.addEvent({
      delay: this._currentWaveConfig.spawnInterval,
      repeat: this._currentWaveConfig.enemyCount - 1,
      callback: () => {
        this._spawnSingleEnemy();
      },
      callbackScope: this
    });

    this._spawnSingleEnemy();
  }

  private _spawnSingleEnemy(): void {
    if (!this._currentWaveConfig) return;

    const types = this._currentWaveConfig.enemyTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    this._enemiesSpawned++;

    if (this._onSpawnEnemy) {
      this._onSpawnEnemy(type);
    }

    if (this._enemiesSpawned >= this._currentWaveConfig.enemyCount) {
      this._setState('in_progress');
    }
  }

  public enemyDied(): void {
    this._enemiesAlive--;
    this._checkWaveComplete();
  }

  public enemyReachedEnd(): void {
    this._enemiesAlive--;
    this._checkWaveComplete();
  }

  private _checkWaveComplete(): void {
    if (this._enemiesAlive <= 0 && (this._state === 'in_progress' || this._state === 'spawning')) {
      this._setState('completed');
      if (this._onWaveComplete) {
        this._onWaveComplete(this._currentWave);
      }

      if (this._autoMode) {
        this._scene.time.delayedCall(2000, () => {
          if (!this._resourceManager.gameOver) {
            this.startNextWave();
          }
        }, [], this);
      }
    }
  }

  public destroy(): void {
    if (this._countdownTimer) {
      this._countdownTimer.remove(false);
      this._countdownTimer = null;
    }
    if (this._spawnTimer) {
      this._spawnTimer.remove(false);
      this._spawnTimer = null;
    }
  }
}
