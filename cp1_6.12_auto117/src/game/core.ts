import { GameGrid, Fragment, FragmentType, RuneActivateEvent } from './modules/Grid';
import { MonsterManager, Monster } from './modules/Monster';
import { Animator } from './modules/Animator';
import { Renderer } from '../ui/renderer';

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  defense: number;
  maxDefense: number;
  wave: number;
  currentFragment: Fragment | null;
  nextFragments: FragmentType[];
}

export class GameEngine {
  readonly targetFPS = 60;
  readonly frameTime = 1000 / this.targetFPS;

  grid: GameGrid;
  monsterManager: MonsterManager;
  animator: Animator;
  renderer: Renderer;

  state: GameState;
  private lastTime = 0;
  private accumulator = 0;
  private animationFrameId: number | null = null;
  private fragmentFallTimer = 0;
  private readonly fragmentFallInterval = 0.8;
  private fastMonsterTrailTimer = 0;
  private burnParticleTimer = 0;
  private keys: Set<string> = new Set();
  private lastInputTime = 0;
  private readonly inputCooldown = 100;

  constructor(container: HTMLElement) {
    this.grid = new GameGrid();
    this.monsterManager = new MonsterManager();
    this.animator = new Animator();
    this.renderer = new Renderer(container, this);

    this.state = {
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      score: 0,
      defense: 100,
      maxDefense: 100,
      wave: 1,
      currentFragment: null,
      nextFragments: []
    };

    this.setupEventListeners();
    this.setupModuleListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private setupModuleListeners(): void {
    this.grid.onRuneActivate((event) => this.handleRuneActivate(event));
    this.monsterManager.onDamage((event) => this.animator.handleMonsterDamage(event));
    this.monsterManager.onWaveStart((wave) => {
      this.state.wave = wave;
      this.animator.handleWaveStart();
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const now = performance.now();
    if (now - this.lastInputTime < this.inputCooldown) return;

    this.keys.add(e.code);

    if (this.state.isGameOver) {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.restart();
      }
      return;
    }

    if (e.code === 'KeyP') {
      this.togglePause();
      return;
    }

    if (this.state.isPaused || !this.state.isRunning) return;

    switch (e.code) {
      case 'ArrowLeft':
        this.grid.moveFragment(-1, 0);
        this.lastInputTime = now;
        break;
      case 'ArrowRight':
        this.grid.moveFragment(1, 0);
        this.lastInputTime = now;
        break;
      case 'ArrowDown':
        if (this.grid.moveFragment(0, 1)) {
          this.state.score += 1;
        }
        this.lastInputTime = now;
        break;
      case 'Space':
        this.grid.rotateFragment();
        this.lastInputTime = now;
        break;
      case 'ArrowUp':
        this.hardDrop();
        this.lastInputTime = now;
        break;
    }

    e.preventDefault();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private hardDrop(): void {
    if (!this.grid.currentFragment) return;
    let dropDistance = 0;
    while (this.grid.moveFragment(0, 1)) {
      dropDistance++;
    }
    this.state.score += dropDistance * 2;
    this.lockCurrentFragment();
  }

  private lockCurrentFragment(): void {
    const pos = this.grid.lockFragment();
    if (pos) {
      this.animator.triggerLandingBounce(pos.x, pos.y, this.grid.cells[pos.y][pos.x].fragment!.type);

      let matches: RuneActivateEvent[];
      do {
        matches = this.grid.checkAndClearMatches();
        for (const match of matches) {
          this.applyRuneEffect(match);
          this.state.score += 100;
        }
      } while (matches.length > 0);

      const cleared = this.grid.clearFullLines();
      if (cleared > 0) {
        this.state.score += cleared * 200;
      }
    }

    this.spawnNewFragment();
  }

  private spawnNewFragment(): void {
    const fragment = this.grid.spawnFragment();
    this.state.currentFragment = this.grid.currentFragment;
    this.state.nextFragments = [...this.grid.nextFragments];

    if (!fragment || this.grid.isGameOver()) {
      this.gameOver();
    }
  }

  private handleRuneActivate(event: RuneActivateEvent): void {
    this.animator.handleRuneActivate(event);
  }

  private applyRuneEffect(event: RuneActivateEvent): void {
    switch (event.type) {
      case 'ice':
        this.monsterManager.applyIceEffect();
        break;
      case 'fire':
        const sourceX = event.cells.length > 0 ? event.cells[0].x : undefined;
        this.monsterManager.applyFireEffect(sourceX);
        break;
      case 'life':
        const healing = this.monsterManager.applyLifeEffect();
        this.state.defense = Math.min(this.state.maxDefense, this.state.defense + healing);
        break;
    }
  }

  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.spawnNewFragment();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.state.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  togglePause(): void {
    this.state.isPaused = !this.state.isPaused;
  }

  restart(): void {
    this.grid = new GameGrid();
    this.monsterManager = new MonsterManager();
    this.animator = new Animator();
    this.renderer.setEngine(this);

    this.state = {
      isRunning: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      defense: 100,
      maxDefense: 100,
      wave: 1,
      currentFragment: null,
      nextFragments: []
    };

    this.setupModuleListeners();
    this.spawnNewFragment();
    this.lastTime = performance.now();
  }

  private gameOver(): void {
    this.state.isGameOver = true;
    this.state.isRunning = false;
  }

  private gameLoop = (): void => {
    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;

    if (deltaTime > 0.25) {
      deltaTime = 0.25;
    }

    this.lastTime = now;

    if (!this.state.isPaused && !this.state.isGameOver) {
      this.accumulator += deltaTime;

      while (this.accumulator >= this.frameTime / 1000) {
        const dt = this.frameTime / 1000;
        this.update(dt);
        this.accumulator -= dt;
      }

      this.animator.update(deltaTime);
    }

    this.renderer.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.fragmentFallTimer += deltaTime;
    if (this.fragmentFallTimer >= this.fragmentFallInterval) {
      this.fragmentFallTimer = 0;
      if (this.grid.currentFragment) {
        if (!this.grid.moveFragment(0, 1)) {
          this.lockCurrentFragment();
        }
      }
    }

    this.monsterManager.update(deltaTime);

    if (this.monsterManager.checkGameOver()) {
      this.state.defense -= deltaTime * 10;
      if (this.state.defense <= 0) {
        this.state.defense = 0;
        this.gameOver();
      }
    }

    this.fastMonsterTrailTimer += deltaTime;
    if (this.fastMonsterTrailTimer >= 0.1) {
      this.fastMonsterTrailTimer = 0;
      for (const monster of this.monsterManager.monsters) {
        if (monster.type === 'fast' && monster.y < 20 && monster.y >= 0) {
          this.animator.spawnFastMonsterTrail(monster.x, monster.y);
        }
      }
    }

    this.burnParticleTimer += deltaTime;
    if (this.burnParticleTimer >= 0.15) {
      this.burnParticleTimer = 0;
      for (const monster of this.monsterManager.monsters) {
        if (monster.burning && monster.y < 20 && monster.y >= 0) {
          this.animator.spawnBurningParticle(monster.x, monster.y);
        }
      }
    }

    this.state.currentFragment = this.grid.currentFragment;
    this.state.nextFragments = [...this.grid.nextFragments];
  }

  getState(): Readonly<GameState> {
    return this.state;
  }
}

const container = document.getElementById('game-container');
if (container) {
  const game = new GameEngine(container);
  game.start();
}
