import { 
  GameState, 
  InputState, 
  GameMap, 
  Role, 
  GameStats, 
  HunterStats, 
  StalkerStats,
  Rect,
  Vector2
} from '../types';
import { PlayerManager } from './PlayerManager';
import { SonarSystem } from './SonarSystem';
import { MapGenerator } from './MapGenerator';

export class GameEngine {
  private state: GameState;
  private playerManager: PlayerManager;
  private sonarSystem: SonarSystem;
  private mapGenerator: MapGenerator;
  
  private lastTime: number = 0;
  private lastSonarTime: number = 0;
  private lastFrameTime: number = 0;
  private fpsSamples: number[] = [];
  private currentFPS: number = 60;
  
  private shadowCloneTimer: number = 0;
  private onStateChange: ((state: GameState) => void) | null = null;
  
  private readonly MAP_WIDTH = 800;
  private readonly MAP_HEIGHT = 600;
  private readonly GAME_DURATION = 60000;
  private readonly SONAR_INTERVAL = 2000;

  constructor() {
    this.playerManager = new PlayerManager();
    this.sonarSystem = new SonarSystem();
    this.mapGenerator = new MapGenerator();
    
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const map = this.mapGenerator.generate(this.MAP_WIDTH, this.MAP_HEIGHT);
    
    return {
      timeRemaining: this.GAME_DURATION,
      totalTime: this.GAME_DURATION,
      stats: {
        hunter: {
          captureTime: 0,
          sonarCount: 0,
          detectionCount: 0
        },
        stalker: {
          surviveTime: 0,
          moveDistance: 0,
          shadowCloneCount: 0
        },
        winner: null,
        gameOver: false
      },
      hunter: this.playerManager.getHunter(),
      stalker: this.playerManager.getStalker(),
      map,
      sonarWaves: [],
      sonarFeedback: [],
      isRunning: false,
      hitFlash: 0,
      shadowEffect: {
        active: false,
        startTime: 0,
        duration: 0
      }
    };
  }

  setStateChangeCallback(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  getState(): GameState {
    return {
      ...this.state,
      hunter: { ...this.state.hunter },
      stalker: { ...this.state.stalker },
      stats: {
        hunter: { ...this.state.stats.hunter },
        stalker: { ...this.state.stats.stalker },
        winner: this.state.stats.winner,
        gameOver: this.state.stats.gameOver
      },
      sonarWaves: this.sonarSystem.getWaves(),
      sonarFeedback: this.sonarSystem.getFeedback()
    };
  }

  getFPS(): number {
    return this.currentFPS;
  }

  start(): void {
    this.state = this.createInitialState();
    this.playerManager.resetPositions(this.state.map);
    this.sonarSystem.clear();
    
    this.state.hunter = this.playerManager.getHunter();
    this.state.stalker = this.playerManager.getStalker();
    this.state.isRunning = true;
    this.lastTime = performance.now();
    this.lastSonarTime = performance.now();
    this.shadowCloneTimer = 0;
    this.lastFrameTime = performance.now();
    this.fpsSamples = [];
    
    this.notifyStateChange();
  }

  stop(): void {
    this.state.isRunning = false;
    this.notifyStateChange();
  }

  reset(): void {
    this.start();
  }

  update(input: InputState, hunterTarget: Vector2): void {
    if (!this.state.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.updateFPS(now);
    this.updateTimer(deltaTime);

    const obstacles: Rect[] = [...this.state.map.walls, ...this.state.map.furniture];

    this.playerManager.updateStalker(
      input,
      obstacles,
      this.MAP_WIDTH,
      this.MAP_HEIGHT,
      deltaTime
    );

    this.playerManager.updateHunter(
      hunterTarget,
      obstacles,
      this.MAP_WIDTH,
      this.MAP_HEIGHT
    );

    this.state.hunter = this.playerManager.getHunter();
    this.state.stalker = this.playerManager.getStalker();

    if (input.skill && this.playerManager.useShadowClone()) {
      this.sonarSystem.emitSonarWave(this.state.stalker.position, true);
      this.state.stats.stalker.shadowCloneCount++;
      this.state.shadowEffect = {
        active: true,
        startTime: now,
        duration: 2000
      };
      this.shadowCloneTimer = 2000;
    }

    if (this.shadowCloneTimer > 0) {
      this.shadowCloneTimer -= deltaTime;
      if (this.shadowCloneTimer <= 0) {
        this.playerManager.deactivateShadowClone();
        this.state.shadowEffect.active = false;
      }
    }

    if (now - this.lastSonarTime >= this.SONAR_INTERVAL) {
      this.sonarSystem.emitSonarWave(this.state.hunter.position, false);
      this.state.stats.hunter.sonarCount++;
      this.lastSonarTime = now;
    }

    const stalkerCrouching = this.playerManager.isStalkerCrouching();
    const sonarStart = performance.now();
    const { detectionCount, hunterHits } = this.sonarSystem.update(
      obstacles,
      this.state.stalker,
      stalkerCrouching
    );
    const sonarTime = performance.now() - sonarStart;
    
    if (sonarTime > 2) {
      console.warn(`Sonar processing took ${sonarTime}ms, exceeding 2ms limit`);
    }

    this.state.stats.hunter.detectionCount += detectionCount;
    
    if (hunterHits.length > 0) {
      this.state.hitFlash = 100;
    } else if (this.state.hitFlash > 0) {
      this.state.hitFlash = Math.max(0, this.state.hitFlash - deltaTime);
    }

    this.state.sonarWaves = this.sonarSystem.getWaves();
    this.state.sonarFeedback = this.sonarSystem.getFeedback();

    if (this.playerManager.checkCollisionBetweenPlayers()) {
      this.endGame(Role.HUNTER);
    }

    this.state.stats.stalker.moveDistance = this.playerManager.getTotalMoveDistance();

    if (this.currentFPS < 55) {
      console.warn(`FPS dropped below 55: ${this.currentFPS}`);
    }

    this.notifyStateChange();
  }

  private updateFPS(now: number): void {
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.fpsSamples.push(1000 / Math.max(frameTime, 1));
    if (this.fpsSamples.length > 30) {
      this.fpsSamples.shift();
    }
    
    this.currentFPS = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
  }

  private updateTimer(deltaTime: number): void {
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - deltaTime);
    this.state.stats.stalker.surviveTime = this.state.totalTime - this.state.timeRemaining;
    
    if (this.state.timeRemaining <= 0) {
      this.endGame(Role.STALKER);
    }
  }

  private endGame(winner: Role): void {
    this.state.stats.winner = winner;
    this.state.stats.gameOver = true;
    this.state.isRunning = false;
    
    if (winner === Role.HUNTER) {
      this.state.stats.hunter.captureTime = this.state.stats.stalker.surviveTime;
    }
    
    this.notifyStateChange();
  }

  getObstacles(): Rect[] {
    return [...this.state.map.walls, ...this.state.map.furniture];
  }

  getMapSize(): { width: number; height: number } {
    return { width: this.MAP_WIDTH, height: this.MAP_HEIGHT };
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  getSonarWaveCount(): number {
    return this.sonarSystem.getWaveCount();
  }

  getShadowCloneCooldownPercent(): number {
    return this.playerManager.getShadowCloneCooldownPercent();
  }

  canUseShadowClone(): boolean {
    return this.playerManager.canUseShadowClone();
  }
}
