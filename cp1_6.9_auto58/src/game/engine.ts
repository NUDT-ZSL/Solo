import {
  GameState,
  Seed,
  CellType,
  Direction,
  GameCallbacks,
  VineGrowth,
} from '../types';
import { Renderer } from './renderer';
import { ParticleSystem } from './particles';
import { AudioManager } from './audio';
import {
  generateMaze,
  findFarthestEmpty,
  findNearestTrap,
  GeneratedMaze,
} from './mazeGenerator';

const MOVE_DURATION = 0.08;
const VINE_GROW_DURATION = 0.8;
const TRANSITION_DURATION = 0.6;
const BANNER_DURATION = 2.0;
const GAMEOVER_WAIT = 0.5;
const VICTORY_WAIT = 3.0;
const TOTAL_LEVELS = 5;

export class GameEngine {
  state: GameState;
  private renderer: Renderer;
  private particles: ParticleSystem;
  private audio: AudioManager;
  private callbacks: GameCallbacks;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private trapPositions: { x: number; y: number }[] = [];
  private keyQueue: Direction[] = [];
  private onKeyDownHandler: (e: KeyboardEvent) => void;
  private onResizeHandler: () => void;
  private container: HTMLElement;
  private victoryFired = false;
  private gameOverFired = false;

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    callbacks: GameCallbacks,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.renderer = new Renderer(canvas);
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();

    this.state = this.createInitialState();
    this.onKeyDownHandler = this.onKeyDown.bind(this);
    this.onResizeHandler = this.onResize.bind(this);

    window.addEventListener('keydown', this.onKeyDownHandler);
    window.addEventListener('resize', this.onResizeHandler);
  }

  private createInitialState(): GameState {
    return {
      level: 0,
      elapsed: 0,
      grid: [],
      gridSize: 0,
      cellSize: 40,
      seed: this.createSeed(0, 0),
      crystals: [],
      vineGrowths: [],
      exitActive: false,
      exitPos: null,
      phase: 'levelBanner',
      transitionProgress: 0,
      bannerTimer: 0,
      gameOverTimer: 0,
      victoryTimer: 0,
    };
  }

  private createSeed(x: number, y: number): Seed {
    return {
      gridX: x,
      gridY: y,
      renderX: x,
      renderY: y,
      moving: false,
      moveProgress: 0,
      moveDuration: MOVE_DURATION,
      fromX: x,
      fromY: y,
      toX: x,
      toY: y,
    };
  }

  start(): void {
    this.onResize();
    this.loadLevel(1);
    this.state.phase = 'levelBanner';
    this.state.bannerTimer = 0;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDownHandler);
    window.removeEventListener('resize', this.onResizeHandler);
  }

  restart(): void {
    this.particles.reset();
    this.victoryFired = false;
    this.gameOverFired = false;
    this.state.elapsed = 0;
    this.loadLevel(1);
    this.state.phase = 'levelBanner';
    this.state.bannerTimer = 0;
  }

  resumeAudio(): void {
    this.audio.resumeOnUserGesture();
  }

  private loadLevel(level: number): void {
    this.state.level = level;
    const gen: GeneratedMaze = generateMaze(level);
    this.state.grid = gen.grid;
    this.state.gridSize = gen.grid.length;
    this.state.crystals = gen.crystals;
    this.trapPositions = gen.trapPositions;
    this.state.exitActive = false;
    this.state.exitPos = null;
    this.state.vineGrowths = [];

    this.state.seed = this.createSeed(gen.startX, gen.startY);
    this.state.grid[gen.startY][gen.startX] = CellType.VINE;
    this.renderer.lastGridKey = '';

    this.onResize();
    this.emitUI();
  }

  private onResize(): void {
    const isMobile = window.innerWidth <= 768;
    const rect = this.container.getBoundingClientRect();
    let W: number, H: number;
    if (isMobile) {
      W = window.innerWidth;
      H = window.innerHeight;
    } else {
      W = Math.max(480, Math.min(rect.width, 900));
      H = Math.max(560, Math.min(window.innerHeight - 40, 860));
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxCell = Math.floor(Math.min(W, H) / (this.state.gridSize || 12)) - 4;
    this.state.cellSize = Math.max(28, Math.min(maxCell, 56));
    this.renderer.resize(W, H, dpr);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.resumeAudio();
    let dir: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right';
        break;
      case 'r':
      case 'R':
        if (this.state.phase === 'gameover' || this.state.phase === 'victory') {
          this.restart();
        }
        return;
    }
    if (dir) {
      e.preventDefault();
      if (this.state.phase === 'playing' && !this.state.seed.moving) {
        this.tryMove(dir);
      } else if (this.state.phase === 'playing' && this.state.seed.moving) {
        this.keyQueue.push(dir);
        if (this.keyQueue.length > 2) this.keyQueue.shift();
      }
    }
  }

  private tryMove(dir: Direction): void {
    const { seed } = this.state;
    let tx = seed.gridX;
    let ty = seed.gridY;
    if (dir === 'up') ty--;
    else if (dir === 'down') ty++;
    else if (dir === 'left') tx--;
    else if (dir === 'right') tx++;
    if (tx < 0 || tx >= this.state.gridSize || ty < 0 || ty >= this.state.gridSize) return;
    const target = this.state.grid[ty][tx];
    const isExit = this.state.exitActive && this.state.exitPos?.x === tx && this.state.exitPos?.y === ty;

    if (target === CellType.VINE || target === CellType.START || isExit ||
        target === CellType.CRYSTAL || target === CellType.EXIT) {
      seed.fromX = seed.gridX;
      seed.fromY = seed.gridY;
      seed.toX = tx;
      seed.toY = ty;
      seed.moving = true;
      seed.moveProgress = 0;
      this.audio.playMove();
    } else {
      this.triggerGameOver(tx, ty);
    }
  }

  private triggerGameOver(gx: number, gy: number): void {
    const px = gx * this.state.cellSize + this.state.cellSize / 2;
    const py = gy * this.state.cellSize + this.state.cellSize / 2;
    this.particles.emitGameOver(px, py);
    this.audio.playGameOver();
    this.state.phase = 'gameover';
    this.state.gameOverTimer = 0;
    this.gameOverFired = true;
    this.emitUI();
  }

  private onMoveComplete(): void {
    const { seed } = this.state;
    seed.gridX = seed.toX;
    seed.gridY = seed.toY;
    seed.renderX = seed.toX;
    seed.renderY = seed.toY;
    seed.moving = false;
    const cell = this.state.grid[seed.gridY][seed.gridX];
    const isExit = this.state.exitActive &&
      this.state.exitPos?.x === seed.gridX &&
      this.state.exitPos?.y === seed.gridY;

    if (cell !== CellType.VINE && cell !== CellType.START) {
      if (cell === CellType.CRYSTAL) {
        this.activateCrystal(seed.gridX, seed.gridY);
      } else if (isExit || cell === CellType.EXIT) {
        this.onEnterExit();
        return;
      }
      this.growVine(seed.gridX, seed.gridY);
    }

    if (this.keyQueue.length > 0) {
      const next = this.keyQueue.shift()!;
      setTimeout(() => {
        if (this.state.phase === 'playing' && !this.state.seed.moving) {
          this.tryMove(next);
        }
      }, 0);
    }
  }

  private growVine(x: number, y: number): void {
    if (this.state.grid[y][x] !== CellType.VINE &&
        this.state.grid[y][x] !== CellType.START &&
        this.state.grid[y][x] !== CellType.CRYSTAL) {
      this.state.grid[y][x] = CellType.VINE;
    } else if (this.state.grid[y][x] === CellType.CRYSTAL) {
      this.state.grid[y][x] = CellType.VINE;
    }
    this.state.vineGrowths.push({ x, y, progress: 0 });
    const px = x * this.state.cellSize + this.state.cellSize / 2;
    const py = y * this.state.cellSize + this.state.cellSize / 2;
    this.particles.emitVineGlow(px, py);
  }

  private activateCrystal(cx: number, cy: number): void {
    const crystal = this.state.crystals.find((c) => c.x === cx && c.y === cy);
    if (!crystal || crystal.activated) return;
    crystal.activated = true;
    const px = cx * this.state.cellSize + this.state.cellSize / 2;
    const py = cy * this.state.cellSize + this.state.cellSize / 2;
    this.particles.emitCrystalBurst(px, py);
    this.audio.playCrystal();

    const nearest = findNearestTrap(this.state.grid, cx, cy, this.trapPositions);
    if (nearest) {
      this.state.grid[nearest.y][nearest.x] = CellType.EMPTY;
      this.audio.playTrapClear();
    }
    this.renderer.lastGridKey = '';

    if (this.state.crystals.every((c) => c.activated)) {
      this.spawnExit();
    }
    this.emitUI();
  }

  private spawnExit(): void {
    const pos = findFarthestEmpty(this.state.grid, this.state.seed.gridX, this.state.seed.gridY);
    if (!pos) return;
    this.state.exitActive = true;
    this.state.exitPos = { x: pos.x, y: pos.y };
    this.audio.playLevelUp();
  }

  private onEnterExit(): void {
    if (this.state.level >= TOTAL_LEVELS) {
      this.state.phase = 'victory';
      this.state.victoryTimer = 0;
      this.victoryFired = true;
      const W = this.state.gridSize * this.state.cellSize;
      const H = W;
      this.particles.emitVictoryRain(W / 2, H / 2, W, H);
      this.audio.playVictory();
      this.emitUI();
    } else {
      this.state.phase = 'transition';
      this.state.transitionProgress = 0;
      this.audio.playLevelUp();
    }
  }

  private update(dt: number): void {
    if (this.state.phase === 'playing' ||
        this.state.phase === 'levelBanner' ||
        this.state.phase === 'transition') {
      this.state.elapsed += dt;
    }

    if (this.state.phase === 'levelBanner') {
      this.state.bannerTimer += dt;
      if (this.state.bannerTimer >= BANNER_DURATION) {
        this.state.phase = 'playing';
      }
    }

    if (this.state.phase === 'playing' || this.state.phase === 'transition' ||
        this.state.phase === 'gameover' || this.state.phase === 'victory') {
      const { seed } = this.state;
      if (seed.moving) {
        seed.moveProgress += dt / MOVE_DURATION;
        if (seed.moveProgress >= 1) {
          seed.moveProgress = 1;
          seed.renderX = seed.toX;
          seed.renderY = seed.toY;
          this.onMoveComplete();
        } else {
          const t = easeOutQuad(seed.moveProgress);
          seed.renderX = seed.fromX + (seed.toX - seed.fromX) * t;
          seed.renderY = seed.fromY + (seed.toY - seed.fromY) * t;
        }
      }

      for (const v of this.state.vineGrowths) {
        v.progress += dt / VINE_GROW_DURATION;
        if (v.progress >= 1) v.progress = 1;
      }
      this.state.vineGrowths = this.state.vineGrowths.filter((v) => v.progress < 1);

      const seedPxX = seed.renderX * this.state.cellSize + this.state.cellSize / 2;
      const seedPxY = seed.renderY * this.state.cellSize + this.state.cellSize / 2;
      this.particles.updateTrail(seedPxX, seedPxY, dt);
      this.particles.updateEffects(dt);
    }

    if (this.state.phase === 'transition') {
      this.state.transitionProgress += dt / TRANSITION_DURATION;
      if (this.state.transitionProgress >= 0.5 && !this.state.exitActive) {
        this.loadLevel(this.state.level + 1);
        this.state.phase = 'levelBanner';
        this.state.bannerTimer = 0;
        this.state.transitionProgress = 0;
      } else if (this.state.transitionProgress >= 1) {
        this.state.transitionProgress = 1;
      }
    }

    if (this.state.phase === 'gameover') {
      this.state.gameOverTimer += dt;
      this.particles.updateEffects(dt);
      if (this.state.gameOverTimer > GAMEOVER_WAIT) {
        this.emitUI();
      }
    }

    if (this.state.phase === 'victory') {
      this.state.victoryTimer += dt;
      this.particles.updateEffects(dt);
      if (this.state.victoryTimer > VICTORY_WAIT) {
        this.emitUI();
      }
    }

    if (this.state.phase === 'playing' || this.state.phase === 'levelBanner') {
      this.emitUI();
    }
  }

  private emitUI(): void {
    const activated = this.state.crystals.filter((c) => c.activated).length;
    this.callbacks.onUIUpdate({
      level: this.state.level,
      elapsed: this.state.elapsed,
      crystalsTotal: this.state.crystals.length,
      crystalsActivated: activated,
      phase: this.state.phase,
      finalLevel: this.state.level,
      totalTime: this.state.elapsed,
    });
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.renderer.render(this.state, this.particles, dt);
    this.rafId = requestAnimationFrame(this.loop);
  };
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}
