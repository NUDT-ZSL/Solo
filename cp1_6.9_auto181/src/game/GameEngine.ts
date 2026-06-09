import type {
  GameState,
  Direction,
  Firefly,
  MirrorFirefly,
  AbilityState,
  GameStatus,
  CellType,
  PistilType,
} from './types';
import { MazeGenerator } from './MazeGenerator';
import { ParticleSystem, COLORS } from '../effects/ParticleSystem';

const INITIAL_LIGHT_ENERGY = 10;
const LOW_LIGHT_GRACE_SECONDS = 5;
const CELL_SIZE = 80;
const GRID_OFFSET_X = 0;
const GRID_OFFSET_Y = 0;
const BASE_MOVE_COOLDOWN = 0.18;
const SPEED_BOOST_COOLDOWN = 0.09;
const SPEED_BOOST_DURATION = 5;
const MIRROR_DURATION = 3;

export interface RenderData {
  maze: GameState['maze'];
  firefly: GameState['firefly'];
  mirror: GameState['mirror'];
  status: GameStatus;
  globalTime: number;
  edgeFlashColor: string | null;
  edgeFlashAlpha: number;
  seedActivated: boolean;
  seedBurstProgress: number;
}

export class GameEngine {
  private state: GameState;
  private mazeGenerator: MazeGenerator;
  private particleSystem: ParticleSystem;
  private onGameOverCallback: ((won: boolean, reason?: string) => void) | null = null;

  constructor(particleSystem: ParticleSystem) {
    this.mazeGenerator = new MazeGenerator(10, 10);
    this.particleSystem = particleSystem;
    const maze = this.mazeGenerator.generate();
    const startX = maze.startPos.x;
    const startY = maze.startPos.y;
    const abilityState: AbilityState = {
      speedBoost: false,
      speedBoostTime: 0,
      wallPierce: false,
      hasMirror: false,
      mirrorTime: 0,
    };
    const firefly: Firefly = {
      gridX: startX,
      gridY: startY,
      lightEnergy: INITIAL_LIGHT_ENERGY,
      visualX: GRID_OFFSET_X + startX * CELL_SIZE + CELL_SIZE / 2,
      visualY: GRID_OFFSET_Y + startY * CELL_SIZE + CELL_SIZE / 2,
      lowLight: false,
      lowLightTimer: 0,
      abilities: abilityState,
    };
    this.state = {
      status: 'PLAYING' as GameStatus,
      loseReason: null,
      maze,
      firefly,
      mirror: null,
      globalTime: 0,
      lastMoveDirection: null,
      moveCooldown: 0,
      edgeFlashColor: null,
      edgeFlashAlpha: 0,
      seedActivated: false,
      seedBurstProgress: 0,
    };
  }

  public setOnGameOver(cb: (won: boolean, reason?: string) => void): void {
    this.onGameOverCallback = cb;
  }

  public getState(): GameState {
    return this.state;
  }

  public getRenderData(): RenderData {
    return {
      maze: this.state.maze,
      firefly: this.state.firefly,
      mirror: this.state.mirror,
      status: this.state.status,
      globalTime: this.state.globalTime,
      edgeFlashColor: this.state.edgeFlashColor,
      edgeFlashAlpha: this.state.edgeFlashAlpha,
      seedActivated: this.state.seedActivated,
      seedBurstProgress: this.state.seedBurstProgress,
    };
  }

  public getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }

  public static getGridMetrics(): { cellSize: number; offsetX: number; offsetY: number } {
    return { cellSize: CELL_SIZE, offsetX: GRID_OFFSET_X, offsetY: GRID_OFFSET_Y };
  }

  public start(): void {
    this.reset();
  }

  public reset(): void {
    this.particleSystem.reset();
    const maze = this.mazeGenerator.generate();
    const startX = maze.startPos.x;
    const startY = maze.startPos.y;
    this.state = {
      status: 'PLAYING' as GameStatus,
      loseReason: null,
      maze,
      firefly: {
        gridX: startX,
        gridY: startY,
        lightEnergy: INITIAL_LIGHT_ENERGY,
        visualX: GRID_OFFSET_X + startX * CELL_SIZE + CELL_SIZE / 2,
        visualY: GRID_OFFSET_Y + startY * CELL_SIZE + CELL_SIZE / 2,
        lowLight: false,
        lowLightTimer: 0,
        abilities: {
          speedBoost: false,
          speedBoostTime: 0,
          wallPierce: false,
          hasMirror: false,
          mirrorTime: 0,
        },
      },
      mirror: null,
      globalTime: 0,
      lastMoveDirection: null,
      moveCooldown: 0,
      edgeFlashColor: null,
      edgeFlashAlpha: 0,
      seedActivated: false,
      seedBurstProgress: 0,
    };
  }

  public update(dt: number): void {
    if (this.state.status === 'WON') {
      this.state.globalTime += dt;
      if (this.state.seedBurstProgress < 1) {
        this.state.seedBurstProgress = Math.min(1, this.state.seedBurstProgress + dt / 2.0);
      }
      this.updateVisualInterpolation(dt);
      return;
    }
    if (this.state.status === 'LOST') {
      this.state.globalTime += dt;
      return;
    }
    this.state.globalTime += dt;

    this.state.moveCooldown = Math.max(0, this.state.moveCooldown - dt);

    this.updateAbilities(dt);
    this.updateLowLightGrace(dt);
    this.updateEdgeFlash(dt);
    this.updateVisualInterpolation(dt);

    this.particleSystem.update(dt);
    this.particleSystem.spawnFireflyTrail(this.state.firefly.visualX, this.state.firefly.visualY);
    if (this.state.mirror) {
      this.state.mirror.remainTime -= dt;
      if (this.state.mirror.remainTime <= 0) {
        this.state.mirror = null;
      } else {
        const lerpT = Math.min(1, dt * 12);
        const tx = GRID_OFFSET_X + this.state.mirror.gridX * CELL_SIZE + CELL_SIZE / 2;
        const ty = GRID_OFFSET_Y + this.state.mirror.gridY * CELL_SIZE + CELL_SIZE / 2;
        this.state.mirror.visualX += (tx - this.state.mirror.visualX) * lerpT;
        this.state.mirror.visualY += (ty - this.state.mirror.visualY) * lerpT;
        this.particleSystem.spawnMirrorTrail(this.state.mirror.visualX, this.state.mirror.visualY);
      }
    }
  }

  private updateAbilities(dt: number): void {
    const ab = this.state.firefly.abilities;
    if (ab.speedBoost) {
      ab.speedBoostTime -= dt;
      if (ab.speedBoostTime <= 0) {
        ab.speedBoost = false;
        ab.speedBoostTime = 0;
      }
    }
    if (ab.hasMirror) {
      ab.mirrorTime -= dt;
      if (ab.mirrorTime <= 0) {
        ab.hasMirror = false;
        ab.mirrorTime = 0;
      }
    }
  }

  private updateLowLightGrace(dt: number): void {
    const ff = this.state.firefly;
    if (ff.lightEnergy <= 0) {
      ff.lowLight = true;
      ff.lowLightTimer += dt;
      if (ff.lowLightTimer >= LOW_LIGHT_GRACE_SECONDS) {
        this.failGame('光能耗尽，灵光熄灭');
      }
    } else {
      ff.lowLight = false;
      ff.lowLightTimer = 0;
    }
  }

  private updateEdgeFlash(dt: number): void {
    if (this.state.edgeFlashColor && this.state.edgeFlashAlpha > 0) {
      this.state.edgeFlashAlpha = Math.max(0, this.state.edgeFlashAlpha - dt * 2.5);
      if (this.state.edgeFlashAlpha <= 0) {
        this.state.edgeFlashColor = null;
      }
    }
  }

  private updateVisualInterpolation(dt: number): void {
    const ff = this.state.firefly;
    const lerpT = Math.min(1, dt * 14);
    const tx = GRID_OFFSET_X + ff.gridX * CELL_SIZE + CELL_SIZE / 2;
    const ty = GRID_OFFSET_Y + ff.gridY * CELL_SIZE + CELL_SIZE / 2;
    ff.visualX += (tx - ff.visualX) * lerpT;
    ff.visualY += (ty - ff.visualY) * lerpT;
  }

  public move(direction: Direction): void {
    if (this.state.status !== 'PLAYING') return;
    if (this.state.moveCooldown > 0) return;

    const delta = this.getDirectionDelta(direction);
    const ff = this.state.firefly;
    const nx = ff.gridX + delta.dx;
    const ny = ff.gridY + delta.dy;

    if (nx < 0 || nx >= this.state.maze.width || ny < 0 || ny >= this.state.maze.height) {
      if (!ff.abilities.wallPierce) {
        this.failGame('萤火撞向边界，碎入暗夜');
        return;
      }
    } else {
      const nextCell = this.state.maze.cells[ny][nx];
      if (nextCell.type === ('WALL' as CellType) && !ff.abilities.wallPierce) {
        this.failGame('萤火陷入叶片，未能脱困');
        return;
      }
    }

    const oldX = ff.gridX;
    const oldY = ff.gridY;
    this.particleSystem.spawnAfterImage(
      GRID_OFFSET_X + oldX * CELL_SIZE + CELL_SIZE / 2,
      GRID_OFFSET_Y + oldY * CELL_SIZE + CELL_SIZE / 2,
      COLORS.firefly
    );
    ff.gridX = Math.max(0, Math.min(this.state.maze.width - 1, nx));
    ff.gridY = Math.max(0, Math.min(this.state.maze.height - 1, ny));
    if (ff.abilities.wallPierce && nx >= 0 && nx < this.state.maze.width && ny >= 0 && ny < this.state.maze.height) {
      if (this.state.maze.cells[ny][nx].type === ('WALL' as CellType)) {
        ff.abilities.wallPierce = false;
      }
    }

    const energyCost = ff.abilities.speedBoost ? 0.5 : 1;
    ff.lightEnergy = Math.max(0, ff.lightEnergy - energyCost);
    this.state.lastMoveDirection = direction;

    const cd = ff.abilities.speedBoost ? SPEED_BOOST_COOLDOWN : BASE_MOVE_COOLDOWN;
    this.state.moveCooldown = cd;

    this.handleMirrorMove(direction);
    this.handleCellInteractions();
  }

  private handleMirrorMove(direction: Direction): void {
    if (!this.state.mirror) return;
    const mirrorDelta = this.getMirrorDelta(direction);
    const m = this.state.mirror;
    const nx = m.gridX + mirrorDelta.dx;
    const ny = m.gridY + mirrorDelta.dy;
    if (
      nx >= 0 && nx < this.state.maze.width &&
      ny >= 0 && ny < this.state.maze.height &&
      this.state.maze.cells[ny][nx].type === ('PATH' as CellType)
    ) {
      m.gridX = nx;
      m.gridY = ny;
    }
  }

  private getDirectionDelta(d: Direction): { dx: number; dy: number } {
    switch (d) {
      case 'UP': return { dx: 0, dy: -1 };
      case 'DOWN': return { dx: 0, dy: 1 };
      case 'LEFT': return { dx: -1, dy: 0 };
      case 'RIGHT': return { dx: 1, dy: 0 };
    }
  }

  private getMirrorDelta(d: Direction): { dx: number; dy: number } {
    switch (d) {
      case 'UP': return { dx: 0, dy: 1 };
      case 'DOWN': return { dx: 0, dy: -1 };
      case 'LEFT': return { dx: 1, dy: 0 };
      case 'RIGHT': return { dx: -1, dy: 0 };
    }
  }

  private handleCellInteractions(): void {
    const ff = this.state.firefly;
    const cell = this.state.maze.cells[ff.gridY][ff.gridX];
    const cx = GRID_OFFSET_X + ff.gridX * CELL_SIZE + CELL_SIZE / 2;
    const cy = GRID_OFFSET_Y + ff.gridY * CELL_SIZE + CELL_SIZE / 2;

    if (cell.hasLightPoint) {
      cell.hasLightPoint = false;
      ff.lightEnergy = Math.min(INITIAL_LIGHT_ENERGY + 5, ff.lightEnergy + 1);
      ff.lowLightTimer = 0;
      this.particleSystem.spawnLightPointPulse(cx, cy);
      this.flashEdge(COLORS.lightPoint);
    }

    if (cell.pistilType) {
      this.applyPistilAbility(cell.pistilType, cx, cy);
      cell.pistilType = null;
    }

    if (cell.isEnd) {
      this.winGame();
    }
  }

  private applyPistilAbility(type: PistilType, cx: number, cy: number): void {
    const ab = this.state.firefly.abilities;
    switch (type) {
      case 'RED_SPEED':
        ab.speedBoost = true;
        ab.speedBoostTime = SPEED_BOOST_DURATION;
        this.particleSystem.spawnPistilPulse(cx, cy, COLORS.redPistil);
        this.flashEdge(COLORS.redPistil);
        break;
      case 'GREEN_PIERCE':
        ab.wallPierce = true;
        this.particleSystem.spawnPistilPulse(cx, cy, COLORS.greenPistil);
        this.flashEdge(COLORS.greenPistil);
        break;
      case 'BLUE_MIRROR':
        ab.hasMirror = true;
        ab.mirrorTime = MIRROR_DURATION;
        this.spawnMirror();
        this.particleSystem.spawnPistilPulse(cx, cy, COLORS.bluePistil);
        this.flashEdge(COLORS.bluePistil);
        break;
    }
  }

  private spawnMirror(): void {
    const ff = this.state.firefly;
    const mirrorX = this.state.maze.width - 1 - ff.gridX;
    const mirrorY = this.state.maze.height - 1 - ff.gridY;
    let mx = mirrorX;
    let my = mirrorY;
    if (this.state.maze.cells[my]?.[mx]?.type !== ('PATH' as CellType)) {
      mx = ff.gridX;
      my = ff.gridY;
    }
    const mirror: MirrorFirefly = {
      gridX: mx,
      gridY: my,
      visualX: GRID_OFFSET_X + mx * CELL_SIZE + CELL_SIZE / 2,
      visualY: GRID_OFFSET_Y + my * CELL_SIZE + CELL_SIZE / 2,
      remainTime: MIRROR_DURATION,
    };
    this.state.mirror = mirror;
  }

  private flashEdge(color: string): void {
    this.state.edgeFlashColor = color;
    this.state.edgeFlashAlpha = 0.7;
  }

  private winGame(): void {
    if (this.state.status !== 'PLAYING') return;
    this.state.status = 'WON' as GameStatus;
    this.state.seedActivated = true;
    const cx = GRID_OFFSET_X + this.state.maze.endPos.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = GRID_OFFSET_Y + this.state.maze.endPos.y * CELL_SIZE + CELL_SIZE / 2;
    this.particleSystem.spawnSeedBurst(cx, cy);
    setTimeout(() => {
      this.particleSystem.spawnFirework(cx, cy);
    }, 400);
    this.flashEdge('#FFFFFF');
    if (this.onGameOverCallback) {
      this.onGameOverCallback(true);
    }
  }

  private failGame(reason: string): void {
    if (this.state.status !== 'PLAYING') return;
    this.state.status = 'LOST' as GameStatus;
    this.state.loseReason = reason;
    const cx = this.state.firefly.visualX;
    const cy = this.state.firefly.visualY;
    this.particleSystem.spawnDeathBurst(cx, cy);
    this.flashEdge('#550000');
    if (this.onGameOverCallback) {
      this.onGameOverCallback(false, reason);
    }
  }
}
