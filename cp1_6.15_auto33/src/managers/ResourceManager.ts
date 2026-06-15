import Phaser from 'phaser';

export interface ResourceChangeCallback {
  (gold: number, lives: number, score: number, wave: number): void;
}

export class ResourceManager {
  private static _instance: ResourceManager | null = null;

  private _gold: number = 200;
  private _lives: number = 20;
  private _score: number = 0;
  private _wave: number = 0;
  private _gameOver: boolean = false;

  private _scene: Phaser.Scene | null = null;
  private _listeners: Set<ResourceChangeCallback> = new Set();

  private constructor() {}

  public static getInstance(): ResourceManager {
    if (!ResourceManager._instance) {
      ResourceManager._instance = new ResourceManager();
    }
    return ResourceManager._instance;
  }

  public setScene(scene: Phaser.Scene): void {
    this._scene = scene;
  }

  public reset(): void {
    this._gold = 200;
    this._lives = 20;
    this._score = 0;
    this._wave = 0;
    this._gameOver = false;
    this._notifyListeners();
  }

  public get gold(): number {
    return this._gold;
  }

  public get lives(): number {
    return this._lives;
  }

  public get score(): number {
    return this._score;
  }

  public get wave(): number {
    return this._wave;
  }

  public get gameOver(): boolean {
    return this._gameOver;
  }

  public addGold(amount: number): void {
    if (this._gameOver) return;
    this._gold += amount;
    this._notifyListeners();
  }

  public spendGold(amount: number): boolean {
    if (this._gameOver) return false;
    if (this._gold >= amount) {
      this._gold -= amount;
      this._notifyListeners();
      return true;
    }
    return false;
  }

  public canAfford(amount: number): boolean {
    return this._gold >= amount;
  }

  public loseLives(amount: number): void {
    if (this._gameOver) return;
    this._lives = Math.max(0, this._lives - amount);
    this._notifyListeners();
    if (this._lives <= 0) {
      this._gameOver = true;
    }
  }

  public addScore(amount: number): void {
    if (this._gameOver) return;
    this._score += amount;
    this._notifyListeners();
  }

  public incrementWave(): void {
    if (this._gameOver) return;
    this._wave++;
    this._notifyListeners();
  }

  public onChange(callback: ResourceChangeCallback): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  private _notifyListeners(): void {
    this._listeners.forEach((cb) => {
      cb(this._gold, this._lives, this._score, this._wave);
    });
  }

  public static destroy(): void {
    ResourceManager._instance = null;
  }
}
