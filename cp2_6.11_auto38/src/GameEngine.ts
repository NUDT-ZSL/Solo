import { Tilemap, Position, GRID_SIZE, CollisionResult } from './Tilemap';
import { Renderer, RenderState, TrailPoint, MuralFragment } from './Renderer';

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
}

interface GameState {
  tilemap: Tilemap;
  renderer: Renderer;
  playerPos: Position;
  renderPlayerPos: Position;
  health: number;
  moving: boolean;
  moveProgress: number;
  moveFrom: Position | null;
  moveTo: Position | null;
  trail: TrailPoint[];
  currentRune: number;
  rubbing: boolean;
  portalActive: boolean;
  portalRotation: number;
  portalParticles: { angle: number; distance: number; speed: number; size: number }[];
  screenShake: { offsetX: number; offsetY: number; duration: number };
  inkSpread: { x: number; y: number; radius: number; maxRadius: number; alpha: number } | null;
  muralFragments: MuralFragment[];
  hintText: string;
  victoryProgress: number;
  victory: boolean;
  score: number;
  startTime: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private tilemap: Tilemap;
  private renderer: Renderer;
  private input: InputState;
  private state: GameState;
  private lastTime: number;
  private animationId: number | null;
  private moveCooldown: number;
  private keysPressed: Set<string>;
  private running: boolean;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
    this.canvas = canvas;

    this.tilemap = new Tilemap();
    this.renderer = new Renderer(canvas);
    this.input = { up: false, down: false, left: false, right: false, space: false };
    this.lastTime = 0;
    this.animationId = null;
    this.moveCooldown = 0;
    this.keysPressed = new Set();
    this.running = false;

    const startPos = this.findValidStartPosition();

    this.state = {
      tilemap: this.tilemap,
      renderer: this.renderer,
      playerPos: { ...startPos },
      renderPlayerPos: { ...startPos },
      health: 3,
      moving: false,
      moveProgress: 0,
      moveFrom: null,
      moveTo: null,
      trail: [],
      currentRune: -1,
      rubbing: false,
      portalActive: false,
      portalRotation: 0,
      portalParticles: this.createPortalParticles(),
      screenShake: { offsetX: 0, offsetY: 0, duration: 0 },
      inkSpread: null,
      muralFragments: [],
      hintText: '使用方向键移动，寻找符文',
      victoryProgress: 0,
      victory: false,
      score: 0,
      startTime: performance.now()
    };

    this.setupEventListeners();
  }

  private findValidStartPosition(): Position {
    const portalPos = this.tilemap.getPortalPosition();
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const result = this.tilemap.checkCollision({ x, y });
      const isPortal = portalPos && x === portalPos.x && y === portalPos.y;
      if (!result.collided && !result.onRune && !isPortal) {
        return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  private createPortalParticles(): { angle: number; distance: number; speed: number; size: number }[] {
    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        angle: (i / 20) * Math.PI * 2,
        distance: Math.random(),
        speed: 0.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 3
      });
    }
    return particles;
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keysPressed.add(e.code);
    
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = true;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.input.space) {
        this.input.space = true;
        const result = this.tilemap.checkCollision(this.state.playerPos);
        if (result.onRune && result.runeIndex >= 0 && !this.state.rubbing) {
          this.state.rubbing = true;
          this.state.currentRune = result.runeIndex;
          this.tilemap.startRuneRubbing(result.runeIndex, performance.now());
        }
      }
    }
    if (e.code === 'KeyR' && this.state.victory) {
      this.restart();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysPressed.delete(e.code);
    
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = false;
    if (e.code === 'Space') {
      this.input.space = false;
      if (this.state.rubbing) {
        this.state.rubbing = false;
        this.tilemap.resetRuneProgress(this.state.currentRune);
        this.state.currentRune = -1;
      }
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);

    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }, 800);
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render(currentTime);

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.state.victoryProgress > 0) {
      this.state.victoryProgress = Math.min(1, this.state.victoryProgress + deltaTime / 2000);
      return;
    }

    this.updateMovement(deltaTime);
    this.updateScreenShake(deltaTime);
    this.updateInkSpread(deltaTime);
    this.updatePortal(deltaTime);
    this.updateTrail(currentTime);
    this.updateRuneRubbing(currentTime);
    this.updateHintText();
    this.checkVictoryCondition();
  }

  private updateMovement(deltaTime: number): void {
    if (this.state.moving) {
      this.state.moveProgress += deltaTime / 150;
      
      if (this.state.moveProgress >= 1) {
        this.state.moveProgress = 1;
        if (this.state.moveTo) {
          this.state.playerPos = { ...this.state.moveTo };
          this.state.renderPlayerPos = { ...this.state.moveTo };
        }
        this.state.moving = false;
        this.state.moveFrom = null;
        this.state.moveTo = null;
        this.state.moveProgress = 0;
      } else if (this.state.moveFrom && this.state.moveTo) {
        const t = this.easeOutQuad(this.state.moveProgress);
        this.state.renderPlayerPos = {
          x: this.state.moveFrom.x + (this.state.moveTo.x - this.state.moveFrom.x) * t,
          y: this.state.moveFrom.y + (this.state.moveTo.y - this.state.moveFrom.y) * t
        };
      }
      return;
    }

    this.moveCooldown = Math.max(0, this.moveCooldown - deltaTime);
    if (this.moveCooldown > 0) return;

    let dx = 0, dy = 0;
    if (this.input.up) dy = -1;
    else if (this.input.down) dy = 1;
    else if (this.input.left) dx = -1;
    else if (this.input.right) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const newPos = {
        x: this.state.playerPos.x + dx,
        y: this.state.playerPos.y + dy
      };

      const result = this.tilemap.checkCollision(newPos);

      if (result.collided) {
        this.triggerScreenShake();
        this.state.health = Math.max(0, this.state.health - 1);
        this.moveCooldown = 200;
        
        if (this.state.health <= 0) {
          this.state.hintText = '生命值耗尽！按 R 键重新开始';
          setTimeout(() => this.restart(), 1500);
        }
      } else {
        this.startMove(this.state.playerPos, newPos);
        this.addTrailPoint(this.state.playerPos);
        this.moveCooldown = 100;

        if (result.onPortal) {
          this.state.victory = true;
          this.state.score = this.calculateScore();
        }
      }
    }
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private startMove(from: Position, to: Position): void {
    this.state.moving = true;
    this.state.moveProgress = 0;
    this.state.moveFrom = { ...from };
    this.state.moveTo = { ...to };
  }

  private addTrailPoint(pos: Position): void {
    this.state.trail.push({
      x: pos.x,
      y: pos.y,
      timestamp: performance.now()
    });
    
    while (this.state.trail.length > 20) {
      this.state.trail.shift();
    }
  }

  private updateScreenShake(deltaTime: number): void {
    if (this.state.screenShake.duration > 0) {
      this.state.screenShake.duration = Math.max(0, this.state.screenShake.duration - deltaTime);
      const progress = 1 - this.state.screenShake.duration / 150;
      const intensity = Math.sin(progress * Math.PI) * 3;
      this.state.screenShake.offsetX = (Math.random() - 0.5) * 2 * intensity;
      this.state.screenShake.offsetY = (Math.random() - 0.5) * 2 * intensity;
    } else {
      this.state.screenShake.offsetX = 0;
      this.state.screenShake.offsetY = 0;
    }
  }

  private triggerScreenShake(): void {
    this.state.screenShake.duration = 150;
  }

  private updateInkSpread(deltaTime: number): void {
    if (this.state.inkSpread) {
      this.state.inkSpread.radius += deltaTime * 0.08;
      this.state.inkSpread.alpha = Math.max(0, this.state.inkSpread.alpha - deltaTime / 1000);
      
      if (this.state.inkSpread.alpha <= 0 || this.state.inkSpread.radius >= this.state.inkSpread.maxRadius) {
        this.state.inkSpread = null;
      }
    }
  }

  private updatePortal(deltaTime: number): void {
    this.state.portalRotation += deltaTime * 0.003;
    
    if (this.tilemap.allRunesActivated() && !this.state.portalActive) {
      this.state.portalActive = true;
    }
  }

  private updateTrail(currentTime: number): void {
    this.state.trail = this.state.trail.filter(p => currentTime - p.timestamp < 1500);
  }

  private updateRuneRubbing(currentTime: number): void {
    const result = this.tilemap.checkCollision(this.state.playerPos);

    if (this.state.rubbing && this.state.currentRune >= 0) {
      if (!result.onRune || !this.input.space) {
        this.state.rubbing = false;
        this.tilemap.resetRuneProgress(this.state.currentRune);
        this.state.currentRune = -1;
        return;
      }

      const { completed } = this.tilemap.updateRuneProgress(this.state.currentRune, currentTime);
      
      if (this.state.inkSpread === null) {
        this.state.inkSpread = {
          x: this.state.playerPos.x,
          y: this.state.playerPos.y,
          radius: 5,
          maxRadius: 40,
          alpha: 0.8
        };
      }

      if (completed) {
        this.state.rubbing = false;
        this.state.inkSpread = {
          x: this.state.playerPos.x,
          y: this.state.playerPos.y,
          radius: 5,
          maxRadius: 60,
          alpha: 1
        };
        
        const fragment = this.renderer.generateMuralFragment();
        this.state.muralFragments.push(fragment);
        this.state.currentRune = -1;
      }
    }
  }

  private updateHintText(): void {
    if (this.state.health <= 0) {
      return;
    }

    const result = this.tilemap.checkCollision(this.state.playerPos);

    if (this.tilemap.allRunesActivated()) {
      this.state.hintText = '前往迷宫中央的传送门';
    } else if (result.onRune) {
      this.state.hintText = '长按空格键拓印符文';
    } else {
      const remaining = 6 - this.tilemap.getActivatedRuneCount();
      this.state.hintText = '寻找符文 (剩余 ' + remaining + ' 个)';
    }
  }

  private checkVictoryCondition(): void {
    const result = this.tilemap.checkCollision(this.state.playerPos);
    if (result.onPortal && !this.state.victory) {
      this.state.victoryProgress = 0.01;
    }
  }

  private calculateScore(): number {
    const timeBonus = Math.max(0, 30000 - (performance.now() - this.state.startTime));
    const healthBonus = this.state.health * 1000;
    const runeBonus = this.tilemap.getActivatedRuneCount() * 500;
    return Math.floor(timeBonus / 100) + healthBonus + runeBonus;
  }

  private restart(): void {
    this.tilemap.regenerate();
    
    const startPos = this.findValidStartPosition();

    this.state = {
      tilemap: this.tilemap,
      renderer: this.renderer,
      playerPos: { ...startPos },
      renderPlayerPos: { ...startPos },
      health: 3,
      moving: false,
      moveProgress: 0,
      moveFrom: null,
      moveTo: null,
      trail: [],
      currentRune: -1,
      rubbing: false,
      portalActive: false,
      portalRotation: 0,
      portalParticles: this.createPortalParticles(),
      screenShake: { offsetX: 0, offsetY: 0, duration: 0 },
      inkSpread: null,
      muralFragments: [],
      hintText: '使用方向键移动，寻找符文',
      victoryProgress: 0,
      victory: false,
      score: 0,
      startTime: performance.now()
    };

    this.moveCooldown = 0;
  }

  private render(currentTime: number): void {
    const renderState: RenderState = {
      playerPos: this.state.playerPos,
      renderPlayerPos: this.state.renderPlayerPos,
      health: this.state.health,
      runes: this.tilemap.getRunes(),
      activatedCount: this.tilemap.getActivatedRuneCount(),
      trail: this.state.trail,
      portalActive: this.state.portalActive,
      portalRotation: this.state.portalRotation,
      portalParticles: this.state.portalParticles,
      screenShake: this.state.screenShake,
      inkSpread: this.state.inkSpread,
      muralFragments: this.state.muralFragments,
      hintText: this.state.hintText,
      victoryProgress: this.state.victoryProgress,
      victory: this.state.victory,
      score: this.state.score
    };

    this.renderer.render(renderState, this.tilemap, currentTime);
  }
}

const game = new GameEngine('gameCanvas');
game.start();
