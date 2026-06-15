import { MirrorSystem } from './MirrorSystem';
import { PuzzleManager, LevelConfig } from './PuzzleManager';
import { BossAI } from './BossAI';

export enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  DimensionTransition = 'dimension_transition',
  BossFight = 'boss_fight',
  LevelTransition = 'level_transition',
  GameOver = 'game_over',
  Victory = 'victory',
}

export enum Dimension {
  Reality = 'reality',
  Mirror = 'mirror',
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  facing: 1 | -1;
  isMoving: boolean;
  isOnGround: boolean;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  attackCooldown: number;
  isCastingDecoy: boolean;
  decoyCooldown: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  type: 'dust' | 'fragment_glow' | 'ink_splash' | 'boss_shatter';
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  interactive: boolean;
  solid: boolean;
  realityForm: { color: string; label: string; state: string };
  mirrorForm: { color: string; label: string; state: string };
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  dimension: Dimension | 'both';
  type: 'ground' | 'bridge' | 'floating';
}

export interface GameSnapshot {
  gameState: GameState;
  currentDimension: Dimension;
  currentLevel: number;
  timeRemaining: number;
  fragmentsCollected: number;
  totalFragments: number;
  playerHealth: number;
  maxHealth: number;
  bossHealth: number;
  bossMaxHealth: number;
  isMobile: boolean;
  transitionProgress: number;
  levelName: string;
  isPortalActive: boolean;
  bossWeakPointExposed: boolean;
}

const GRAVITY = 0.6;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -12;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const ATTACK_DURATION = 300;
const ATTACK_COOLDOWN = 800;
const DECOY_COOLDOWN = 2000;
const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private bgCanvas: HTMLCanvasElement | null = null;
  private bgCtx: CanvasRenderingContext2D | null = null;
  private mirrorSystem: MirrorSystem;
  private puzzleManager: PuzzleManager;
  private bossAI: BossAI | null = null;
  private gameState: GameState = GameState.Menu;
  private currentLevel: number = 0;
  private player: PlayerState;
  private particles: Particle[] = [];
  private keys: Set<string> = new Set();
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDeltaTime: number = 1000 / 60;
  private animationFrameId: number = 0;
  private timeRemaining: number = 0;
  private levelConfig: LevelConfig | null = null;
  private transitionProgress: number = 0;
  private transitionStartTime: number = 0;
  private levelTransitionProgress: number = 0;
  private levelTransitionAlpha: number = 0;
  private onStateChange: ((snapshot: GameSnapshot) => void) | null = null;
  private isMobile: boolean = false;
  private touchJoystick: { active: boolean; startX: number; startY: number; dx: number; dy: number } = {
    active: false, startX: 0, startY: 0, dx: 0, dy: 0,
  };
  private touchSwitch: boolean = false;
  private touchAttack: boolean = false;
  private touchDecoy: boolean = false;
  private scaleX: number = 1;
  private scaleY: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private audioCtx: AudioContext | null = null;
  private walkFrame: number = 0;
  private walkTimer: number = 0;
  private cameraX: number = 0;
  private levelWidth: number = VIRTUAL_WIDTH;
  private bossIntroTimer: number = 0;
  private bossDefeatTimer: number = 0;
  private slowMotionFactor: number = 1;
  private decoyPosition: Vector2 | null = null;
  private decoyTimer: number = 0;

  constructor() {
    this.player = this.createDefaultPlayer();
    this.mirrorSystem = new MirrorSystem();
    this.puzzleManager = new PuzzleManager();
  }

  private createDefaultPlayer(): PlayerState {
    return {
      position: { x: 100, y: 500 },
      velocity: { x: 0, y: 0 },
      facing: 1,
      isMoving: false,
      isOnGround: false,
      health: 5,
      maxHealth: 5,
      isAttacking: false,
      attackCooldown: 0,
      isCastingDecoy: false,
      decoyCooldown: 0,
    };
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d')!;
    this.detectMobile();
    this.resize();
    this.generatePaperTexture();
    this.setupInput();
    window.addEventListener('resize', () => this.resize());
  }

  private detectMobile() {
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const targetRatio = 16 / 9;
    let w: number, h: number;
    if (pw / ph > targetRatio) {
      h = ph;
      w = ph * targetRatio;
    } else {
      w = pw;
      h = pw / targetRatio;
    }
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.scaleX = w / VIRTUAL_WIDTH;
    this.scaleY = h / VIRTUAL_HEIGHT;
    this.offsetX = (pw - w) / 2;
    this.offsetY = (ph - h) / 2;
    this.canvas.style.marginLeft = this.offsetX + 'px';
    this.canvas.style.marginTop = this.offsetY + 'px';
    if (this.bgCanvas) {
      this.bgCanvas.width = VIRTUAL_WIDTH;
      this.bgCanvas.height = VIRTUAL_HEIGHT;
      this.generatePaperTexture();
    }
  }

  private generatePaperTexture() {
    if (!this.bgCtx) return;
    const ctx = this.bgCtx!;
    const w = VIRTUAL_WIDTH;
    const h = VIRTUAL_HEIGHT;
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = Math.random() * 3 + 1;
      ctx.fillStyle = `rgba(180, 170, 150, ${Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.requestDimensionSwitch();
      }
      if (e.code === 'KeyE' || e.code === 'KeyJ') {
        this.requestAttack();
      }
      if (e.code === 'KeyQ' || e.code === 'KeyK') {
        this.requestDecoy();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  setOnStateChange(cb: (snapshot: GameSnapshot) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (!this.onStateChange) return;
    const snapshot: GameSnapshot = {
      gameState: this.gameState,
      currentDimension: this.mirrorSystem.getCurrentDimension(),
      currentLevel: this.currentLevel,
      timeRemaining: this.timeRemaining,
      fragmentsCollected: this.puzzleManager.getCollectedCount(),
      totalFragments: this.puzzleManager.getTotalCount(),
      playerHealth: this.player.health,
      maxHealth: this.player.maxHealth,
      bossHealth: this.bossAI?.getHealth() ?? 0,
      bossMaxHealth: this.bossAI?.getMaxHealth() ?? 0,
      isMobile: this.isMobile,
      transitionProgress: this.transitionProgress,
      levelName: this.levelConfig?.name ?? '',
      isPortalActive: this.puzzleManager.isPortalActive(),
      bossWeakPointExposed: this.bossAI?.isWeakPointExposed() ?? false,
    };
    this.onStateChange(snapshot);
  }

  startGame() {
    this.currentLevel = 1;
    this.loadLevel(1);
    this.gameState = GameState.Playing;
    this.emitState();
  }

  restartLevel() {
    this.loadLevel(this.currentLevel);
    this.gameState = GameState.Playing;
    this.emitState();
  }

  private loadLevel(levelNum: number) {
    this.levelConfig = this.puzzleManager.getLevelConfig(levelNum);
    if (!this.levelConfig) return;
    this.player = this.createDefaultPlayer();
    this.player.position = { ...this.levelConfig.playerStart };
    this.timeRemaining = this.levelConfig.timeLimit * 1000;
    this.particles = [];
    this.cameraX = 0;
    this.levelWidth = this.levelConfig.levelWidth ?? VIRTUAL_WIDTH;
    this.mirrorSystem.reset();
    this.puzzleManager.initLevel(levelNum);
    this.bossAI = null;
    this.bossIntroTimer = 0;
    this.bossDefeatTimer = 0;
    this.slowMotionFactor = 1;
    this.decoyPosition = null;
    this.decoyTimer = 0;
    if (this.levelConfig.isBossLevel) {
      this.bossAI = new BossAI(this.levelConfig.bossConfig!);
    }
  }

  requestDimensionSwitch() {
    if (this.gameState === GameState.Playing || this.gameState === GameState.BossFight) {
      this.gameState = GameState.DimensionTransition;
      this.transitionProgress = 0;
      this.transitionStartTime = performance.now();
      this.playSound('dimension_switch');
    }
  }

  requestAttack() {
    if (this.gameState !== GameState.BossFight) return;
    if (this.player.attackCooldown > 0) return;
    this.player.isAttacking = true;
    this.player.attackCooldown = ATTACK_COOLDOWN;
    setTimeout(() => { this.player.isAttacking = false; }, ATTACK_DURATION);
    this.playSound('attack');
    if (this.bossAI) {
      const attackPos = {
        x: this.player.position.x + this.player.facing * 40,
        y: this.player.position.y,
      };
      const hit = this.bossAI.receiveAttack(attackPos, this.player.facing);
      if (hit) {
        this.playSound('boss_hit');
        this.spawnParticles(this.bossAI.getWeakPointPosition(), 15, 'ink_splash');
      }
    }
  }

  requestDecoy() {
    if (this.gameState !== GameState.BossFight) return;
    if (this.player.decoyCooldown > 0) return;
    this.player.isCastingDecoy = true;
    this.player.decoyCooldown = DECOY_COOLDOWN;
    this.decoyPosition = { ...this.player.position };
    this.decoyTimer = 1500;
    setTimeout(() => { this.player.isCastingDecoy = false; }, 300);
    this.playSound('decoy');
    this.spawnParticles(this.player.position, 8, 'fragment_glow');
  }

  setTouchJoystick(dx: number, dy: number) {
    this.touchJoystick.dx = dx;
    this.touchJoystick.dy = dy;
  }

  setTouchSwitch(v: boolean) {
    this.touchSwitch = v;
    if (v) this.requestDimensionSwitch();
  }

  setTouchAttack(v: boolean) {
    this.touchAttack = v;
    if (v) this.requestAttack();
  }

  setTouchDecoy(v: boolean) {
    this.touchDecoy = v;
    if (v) this.requestDecoy();
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private loop = (now: number) => {
    const rawDt = now - this.lastTime;
    this.lastTime = now;
    const dt = rawDt * this.slowMotionFactor;
    this.accumulator += dt;
    while (this.accumulator >= this.fixedDeltaTime) {
      this.update(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }
    this.render();
    this.emitState();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    switch (this.gameState) {
      case GameState.Playing:
        this.updatePlaying(dt);
        break;
      case GameState.DimensionTransition:
        this.updateDimensionTransition(dt);
        break;
      case GameState.BossFight:
        this.updateBossFight(dt);
        break;
      case GameState.LevelTransition:
        this.updateLevelTransition(dt);
        break;
      default:
        break;
    }
    this.updateParticles(dt);
  }

  private updatePlaying(dt: number) {
    this.updatePlayerMovement(dt);
    this.updatePlayerPhysics(dt);
    this.updateCamera();
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.gameState = GameState.GameOver;
      this.playSound('game_over');
      return;
    }
    this.checkFragmentCollection();
    if (this.puzzleManager.isPortalActive()) {
      this.checkPortalEntry();
    }
  }

  private updateDimensionTransition(dt: number) {
    const elapsed = performance.now() - this.transitionStartTime;
    this.transitionProgress = Math.min(1, elapsed / 500);
    if (this.transitionProgress < 0.5) {
      // expanding ink circle
    } else if (this.transitionProgress >= 0.5 && this.mirrorSystem.getCurrentDimension() === Dimension.Reality) {
      this.mirrorSystem.switchDimension();
      this.puzzleManager.onDimensionSwitch(this.mirrorSystem.getCurrentDimension());
    }
    if (this.transitionProgress >= 1) {
      this.gameState = this.bossAI ? GameState.BossFight : GameState.Playing;
      this.transitionProgress = 0;
    }
  }

  private updateBossFight(dt: number) {
    this.updatePlayerMovement(dt);
    this.updatePlayerPhysics(dt);
    if (this.player.attackCooldown > 0) this.player.attackCooldown -= dt;
    if (this.player.decoyCooldown > 0) this.player.decoyCooldown -= dt;
    if (this.decoyTimer > 0) {
      this.decoyTimer -= dt;
      if (this.decoyTimer <= 0) this.decoyPosition = null;
    }
    if (this.bossAI) {
      this.bossAI.update(dt, this.player, this.decoyPosition);
      if (this.bossAI.isDefeated()) {
        this.bossDefeatTimer += dt;
        this.slowMotionFactor = Math.max(0.2, 1 - this.bossDefeatTimer / 2000);
        if (this.bossDefeatTimer > 2000) {
          this.gameState = GameState.Victory;
          this.slowMotionFactor = 1;
        }
      }
      if (this.bossAI.isAttacking()) {
        const bossAtk = this.bossAI.getAttackInfo();
        if (bossAtk && this.checkBossAttackHit(bossAtk)) {
          this.player.health--;
          this.playSound('player_hit');
          this.spawnParticles(this.player.position, 10, 'ink_splash');
          if (this.player.health <= 0) {
            this.gameState = GameState.GameOver;
          }
        }
      }
    }
  }

  private updateLevelTransition(dt: number) {
    this.levelTransitionAlpha += dt / 1000;
    if (this.levelTransitionAlpha >= 2) {
      this.currentLevel++;
      if (this.currentLevel > this.puzzleManager.getTotalLevels()) {
        this.gameState = GameState.Victory;
      } else {
        this.loadLevel(this.currentLevel);
        this.gameState = GameState.Playing;
      }
      this.levelTransitionAlpha = 0;
    }
  }

  private updatePlayerMovement(dt: number) {
    let moveX = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) moveX -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) moveX += 1;
    if (this.touchJoystick.dx !== 0) moveX = this.touchJoystick.dx > 0.3 ? 1 : this.touchJoystick.dx < -0.3 ? -1 : 0;
    this.player.velocity.x = moveX * PLAYER_SPEED;
    this.player.isMoving = moveX !== 0;
    if (moveX !== 0) this.player.facing = moveX > 0 ? 1 : -1;
    if ((this.keys.has('ArrowUp') || this.keys.has('KeyW')) && this.player.isOnGround) {
      this.player.velocity.y = JUMP_FORCE;
      this.player.isOnGround = false;
      this.spawnParticles(this.player.position, 5, 'dust');
    }
    if (this.player.isMoving && this.player.isOnGround) {
      this.walkTimer += dt;
      if (this.walkTimer > 120) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
        if (this.walkFrame % 2 === 0) {
          this.spawnParticles(
            { x: this.player.position.x, y: this.player.position.y + PLAYER_HEIGHT / 2 },
            1, 'dust'
          );
        }
      }
    }
  }

  private updatePlayerPhysics(dt: number) {
    this.player.velocity.y += GRAVITY;
    this.player.position.x += this.player.velocity.x;
    this.player.position.y += this.player.velocity.y;
    this.player.isOnGround = false;
    const platforms = this.getPlatformsForDimension();
    for (const plat of platforms) {
      if (this.checkPlatformCollision(plat)) {
        this.resolvePlatformCollision(plat);
      }
    }
    if (this.player.position.y > VIRTUAL_HEIGHT + 100) {
      this.player.health = 0;
      this.gameState = GameState.GameOver;
    }
    const bounds = this.levelWidth;
    this.player.position.x = Math.max(PLAYER_WIDTH / 2, Math.min(bounds - PLAYER_WIDTH / 2, this.player.position.x));
  }

  private getPlatformsForDimension(): Platform[] {
    if (!this.levelConfig) return [];
    const dim = this.mirrorSystem.getCurrentDimension();
    return this.levelConfig.platforms.filter(p => p.dimension === 'both' || p.dimension === dim);
  }

  private checkPlatformCollision(plat: Platform): boolean {
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pw = PLAYER_WIDTH / 2;
    const ph = PLAYER_HEIGHT / 2;
    return (
      px + pw > plat.x &&
      px - pw < plat.x + plat.width &&
      py + ph > plat.y &&
      py + ph < plat.y + plat.height + 10 &&
      this.player.velocity.y >= 0
    );
  }

  private resolvePlatformCollision(plat: Platform) {
    this.player.position.y = plat.y - PLAYER_HEIGHT / 2;
    this.player.velocity.y = 0;
    this.player.isOnGround = true;
  }

  private updateCamera() {
    const targetX = this.player.position.x - VIRTUAL_WIDTH / 2;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - VIRTUAL_WIDTH, this.cameraX));
  }

  private checkFragmentCollection() {
    if (!this.levelConfig) return;
    const dim = this.mirrorSystem.getCurrentDimension();
    const fragments = this.puzzleManager.getFragments();
    for (const frag of fragments) {
      if (frag.collected) continue;
      if (frag.dimension !== dim && frag.dimension !== 'both') continue;
      const dx = this.player.position.x - frag.x;
      const dy = this.player.position.y - frag.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        this.puzzleManager.collectFragment(frag.id);
        this.playSound('fragment_collect');
        this.spawnParticles({ x: frag.x, y: frag.y }, 12, 'fragment_glow');
      }
    }
  }

  private checkPortalEntry() {
    if (!this.levelConfig) return;
    const portal = this.levelConfig.portal;
    const dx = this.player.position.x - portal.x;
    const dy = this.player.position.y - portal.y;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
      this.gameState = GameState.LevelTransition;
      this.levelTransitionAlpha = 0;
      this.playSound('portal_enter');
    }
  }

  private checkBossAttackHit(atk: { x: number; y: number; width: number; height: number }): boolean {
    const px = this.player.position.x;
    const py = this.player.position.y;
    return (
      px + PLAYER_WIDTH / 2 > atk.x &&
      px - PLAYER_WIDTH / 2 < atk.x + atk.width &&
      py + PLAYER_HEIGHT / 2 > atk.y &&
      py - PLAYER_HEIGHT / 2 < atk.y + atk.height
    );
  }

  private spawnParticles(pos: Vector2, count: number, type: Particle['type']) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'dust' ? 1 : 0),
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        size: type === 'dust' ? 2 + Math.random() * 2 : 3 + Math.random() * 4,
        color: type === 'fragment_glow' ? '#ffd700' : type === 'ink_splash' ? '#1a1a1a' : '#888',
        opacity: 1,
        type,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'dust') p.vy -= 0.02;
      else p.vy += 0.05;
      p.life -= dt;
      p.opacity = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scaleX, this.scaleY);
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    switch (this.gameState) {
      case GameState.Menu:
        this.renderMenu(ctx);
        break;
      case GameState.Playing:
      case GameState.DimensionTransition:
        this.renderGame(ctx);
        this.renderDimensionTransition(ctx);
        break;
      case GameState.BossFight:
        this.renderGame(ctx);
        this.renderBossFight(ctx);
        break;
      case GameState.LevelTransition:
        this.renderGame(ctx);
        this.renderLevelTransition(ctx);
        break;
      case GameState.GameOver:
        this.renderGame(ctx);
        this.renderGameOver(ctx);
        break;
      case GameState.Victory:
        this.renderGame(ctx);
        this.renderVictory(ctx);
        break;
    }
    ctx.restore();
  }

  private renderMenu(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.bgCanvas!, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.drawInkText(ctx, '镜灵奇谭', VIRTUAL_WIDTH / 2, 200, 72, '#f5f0e8');
    this.drawInkText(ctx, 'Mirror Spirit Tales', VIRTUAL_WIDTH / 2, 280, 24, '#c0b8a8');
    this.drawInkText(ctx, '按任意键开始  Press any key to start', VIRTUAL_WIDTH / 2, 420, 20, '#a09888');
    this.drawFoxSpirit(ctx, VIRTUAL_WIDTH / 2, 360, 1, 0, false);
    this.drawInkText(ctx, '← → 移动  ↑ 跳跃  空格 切换维度', VIRTUAL_WIDTH / 2, 520, 16, '#a09888');
    this.drawInkText(ctx, 'E/J 攻击  Q/K 误导光球(Boss战)', VIRTUAL_WIDTH / 2, 550, 16, '#a09888');
  }

  private renderGame(ctx: CanvasRenderingContext2D) {
    this.renderBackground(ctx);
    ctx.save();
    ctx.translate(-this.cameraX, 0);
    this.renderPlatforms(ctx);
    this.renderObjects(ctx);
    this.renderFragments(ctx);
    this.renderPortal(ctx);
    this.renderPlayer(ctx);
    this.renderParticles(ctx);
    if (this.decoyPosition) {
      this.renderDecoy(ctx);
    }
    ctx.restore();
    if (this.mirrorSystem.getCurrentDimension() === Dimension.Mirror) {
      this.applyMirrorOverlay(ctx);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.bgCanvas!, 0, 0);
    const dim = this.mirrorSystem.getCurrentDimension();
    if (dim === Dimension.Mirror) {
      this.drawMistyBackground(ctx);
    } else {
      this.drawMountainSilhouette(ctx);
    }
  }

  private drawMountainSilhouette(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(0, VIRTUAL_HEIGHT);
    ctx.moveTo(0, 500);
    ctx.bezierCurveTo(150, 380, 300, 420, 450, 350);
    ctx.bezierCurveTo(600, 280, 750, 340, 900, 300);
    ctx.bezierCurveTo(1050, 260, 1200, 320, 1280, 380);
    ctx.lineTo(1280, VIRTUAL_HEIGHT);
    ctx.lineTo(0, VIRTUAL_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(0, 560);
    ctx.bezierCurveTo(200, 480, 400, 520, 600, 460);
    ctx.bezierCurveTo(800, 400, 1000, 480, 1280, 440);
    ctx.lineTo(1280, VIRTUAL_HEIGHT);
    ctx.lineTo(0, VIRTUAL_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawMistyBackground(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
      const y = 200 + i * 80;
      ctx.fillStyle = `rgba(120, 140, 180, ${0.03 + i * 0.01})`;
      ctx.beginPath();
      ctx.ellipse(VIRTUAL_WIDTH / 2, y, 500 - i * 60, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    if (!this.levelConfig) return;
    const dim = this.mirrorSystem.getCurrentDimension();
    for (const plat of this.levelConfig.platforms) {
      if (plat.dimension !== 'both' && plat.dimension !== dim) continue;
      this.drawInkPlatform(ctx, plat, dim);
    }
  }

  private drawInkPlatform(ctx: CanvasRenderingContext2D, plat: Platform, dim: Dimension) {
    ctx.save();
    const isMirror = dim === Dimension.Mirror;
    if (plat.type === 'ground') {
      ctx.fillStyle = isMirror ? '#2a3040' : '#5a5040';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = isMirror ? '#4a5a70' : '#3a3020';
      ctx.lineWidth = 2;
      this.drawBrushStroke(ctx, plat.x, plat.y, plat.x + plat.width, plat.y);
    } else if (plat.type === 'bridge') {
      const color = isMirror ? '#5a6a80' : '#8a7050';
      ctx.fillStyle = color;
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = isMirror ? '#7a8aa0' : '#6a5030';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < plat.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(plat.x + i, plat.y);
        ctx.lineTo(plat.x + i, plat.y + plat.height);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = isMirror ? '#3a4a5a' : '#6a6050';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = isMirror ? '#5a7a9a' : '#8a7050';
      ctx.lineWidth = 1;
      ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
    }
    ctx.restore();
  }

  private drawBrushStroke(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const segments = 8;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private renderObjects(ctx: CanvasRenderingContext2D) {
    if (!this.levelConfig) return;
    const dim = this.mirrorSystem.getCurrentDimension();
    for (const obj of this.levelConfig.objects) {
      const form = dim === Dimension.Mirror ? obj.mirrorForm : obj.realityForm;
      this.drawGameObject(ctx, obj, form, dim);
    }
  }

  private drawGameObject(ctx: CanvasRenderingContext2D, obj: GameObject, form: { color: string; label: string; state: string }, dim: Dimension) {
    ctx.save();
    const isMirror = dim === Dimension.Mirror;
    if (obj.type === 'chest') {
      const isOpen = form.state === 'open';
      ctx.fillStyle = form.color;
      ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
      ctx.strokeStyle = isMirror ? '#8a9ab0' : '#5a4a30';
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
      if (isOpen) {
        ctx.fillStyle = '#ffd700';
        ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 300) * 0.2;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y - obj.height / 2 - 5, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obj.x - obj.width / 2, obj.y);
      ctx.lineTo(obj.x + obj.width / 2, obj.y);
      ctx.stroke();
    } else if (obj.type === 'lantern') {
      ctx.fillStyle = isMirror ? '#4a5a8a' : '#cc3333';
      ctx.beginPath();
      ctx.ellipse(obj.x, obj.y, 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (!isMirror) {
        ctx.fillStyle = `rgba(255, 100, 50, ${0.3 + Math.sin(performance.now() / 500) * 0.15})`;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = form.color;
      ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
      ctx.strokeStyle = isMirror ? '#6a7a90' : '#4a3a20';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
    }
    if (obj.interactive) {
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 400) * 0.3;
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(form.label, obj.x, obj.y - obj.height / 2 - 10);
    }
    ctx.restore();
  }

  private renderFragments(ctx: CanvasRenderingContext2D) {
    const dim = this.mirrorSystem.getCurrentDimension();
    const fragments = this.puzzleManager.getFragments();
    for (const frag of fragments) {
      if (frag.collected) continue;
      if (frag.dimension !== dim && frag.dimension !== 'both') continue;
      ctx.save();
      const pulse = Math.sin(performance.now() / 300 + frag.x) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      const gradient = ctx.createRadialGradient(frag.x, frag.y, 0, frag.x, frag.y, 14);
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.5, '#ffaa00');
      gradient.addColorStop(1, 'rgba(255,170,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 1;
      this.drawDiamondShape(ctx, frag.x, frag.y, 8);
      ctx.restore();
    }
  }

  private drawDiamondShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.7, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.7, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderPortal(ctx: CanvasRenderingContext2D) {
    if (!this.levelConfig || !this.puzzleManager.isPortalActive()) return;
    const portal = this.levelConfig.portal;
    ctx.save();
    const t = performance.now() / 1000;
    ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.2;
    for (let i = 3; i >= 0; i--) {
      const radius = 25 + i * 8;
      const angle = t * (i % 2 === 0 ? 1 : -1);
      ctx.save();
      ctx.translate(portal.x, portal.y);
      ctx.rotate(angle);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, 'rgba(100,150,255,0.8)');
      gradient.addColorStop(0.5, 'rgba(80,120,200,0.4)');
      gradient.addColorStop(1, 'rgba(60,90,180,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    this.drawFoxSpirit(ctx, p.position.x, p.position.y, p.facing, this.walkFrame, p.isMoving);
    if (p.isAttacking) {
      ctx.save();
      ctx.strokeStyle = '#e0d8c8';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      const atkX = p.position.x + p.facing * 35;
      ctx.beginPath();
      ctx.arc(atkX, p.position.y, 20, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFoxSpirit(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, frame: number, moving: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    const isMirror = this.mirrorSystem.getCurrentDimension() === Dimension.Mirror;
    const bodyColor = isMirror ? '#8aa0c0' : '#e8dcc8';
    const outlineColor = isMirror ? '#4a5a7a' : '#3a3020';
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 5, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(4, -14, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isMirror ? '#5a7090' : '#c8b8a0';
    ctx.beginPath();
    ctx.moveTo(4, -24);
    ctx.quadraticCurveTo(-2, -30, -6, -20);
    ctx.quadraticCurveTo(0, -22, 4, -24);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -24);
    ctx.quadraticCurveTo(10, -32, 14, -20);
    ctx.quadraticCurveTo(8, -22, 4, -24);
    ctx.fill();
    ctx.fillStyle = '#e83030';
    ctx.beginPath();
    ctx.arc(6, -16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -16, 1.2, 0, Math.PI * 2);
    ctx.fill();
    if (moving) {
      const legOffset = Math.sin(frame * Math.PI / 2) * 4;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 20);
      ctx.lineTo(-6 + legOffset, 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(6 - legOffset, 28);
      ctx.stroke();
    } else {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 20);
      ctx.lineTo(-6, 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(6, 28);
      ctx.stroke();
    }
    ctx.fillStyle = isMirror ? '#6a80a0' : '#cc9944';
    ctx.beginPath();
    ctx.ellipse(4, 8, 8, 12, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderDecoy(ctx: CanvasRenderingContext2D) {
    if (!this.decoyPosition) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.decoyTimer / 1500) * 0.6;
    const gradient = ctx.createRadialGradient(
      this.decoyPosition.x, this.decoyPosition.y, 0,
      this.decoyPosition.x, this.decoyPosition.y, 40
    );
    gradient.addColorStop(0, 'rgba(255,200,100,0.8)');
    gradient.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.decoyPosition.x, this.decoyPosition.y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      if (p.type === 'fragment_glow') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.opacity, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private applyMirrorOverlay(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'rgba(200, 210, 230, 0.12)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#4060a0';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.restore();
  }

  private renderDimensionTransition(ctx: CanvasRenderingContext2D) {
    if (this.transitionProgress <= 0) return;
    ctx.save();
    const cx = VIRTUAL_WIDTH / 2;
    const cy = VIRTUAL_HEIGHT / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    let radius: number;
    let alpha: number;
    if (this.transitionProgress < 0.5) {
      const t = this.transitionProgress / 0.5;
      radius = maxRadius * t;
      alpha = t * 0.9;
    } else {
      const t = (this.transitionProgress - 0.5) / 0.5;
      radius = maxRadius * (1 - t);
      alpha = (1 - t) * 0.9;
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 8;
    for (let i = 0; i < 6; i++) {
      const angle = (performance.now() / 500 + i * Math.PI / 3);
      const r = radius * 0.8;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r * 0.3, cy + Math.sin(angle) * r * 0.3, r * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderBossFight(ctx: CanvasRenderingContext2D) {
    if (!this.bossAI) return;
    const boss = this.bossAI;
    const pos = boss.getPosition();
    const size = boss.getSize();
    ctx.save();
    ctx.translate(-this.cameraX, 0);
    const isMirror = this.mirrorSystem.getCurrentDimension() === Dimension.Mirror;
    ctx.fillStyle = isMirror ? '#3a4a6a' : '#c8c0b0';
    ctx.strokeStyle = isMirror ? '#5a7aaa' : '#4a3a20';
    ctx.lineWidth = 3;
    ctx.fillRect(pos.x, pos.y, size.width, size.height);
    ctx.strokeRect(pos.x, pos.y, size.width, size.height);
    ctx.fillStyle = isMirror ? 'rgba(100,150,220,0.15)' : 'rgba(200,200,200,0.15)';
    ctx.fillRect(pos.x + 5, pos.y + 5, size.width - 10, size.height - 10);
    const reflectionPos = boss.getReflectionPosition();
    if (reflectionPos) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      this.drawFoxSpirit(ctx, reflectionPos.x, reflectionPos.y, -this.player.facing, this.walkFrame, this.player.isMoving);
      ctx.restore();
    }
    if (boss.isWeakPointExposed()) {
      const wp = boss.getWeakPointPosition();
      const pulse = Math.sin(performance.now() / 150) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#cc2222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wp.x - 12, wp.y - 8);
      ctx.lineTo(wp.x, wp.y + 8);
      ctx.lineTo(wp.x + 12, wp.y - 8);
      ctx.stroke();
      const glow = ctx.createRadialGradient(wp.x, wp.y, 0, wp.x, wp.y, 20);
      glow.addColorStop(0, 'rgba(255,50,50,0.6)');
      glow.addColorStop(1, 'rgba(255,50,50,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (boss.isDefeated()) {
      ctx.save();
      const t = this.bossDefeatTimer / 2000;
      ctx.globalAlpha = 1 - t;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t * 2;
        const dist = t * 150;
        const shardX = pos.x + size.width / 2 + Math.cos(angle) * dist;
        const shardY = pos.y + size.height / 2 + Math.sin(angle) * dist;
        ctx.fillStyle = '#a0b0c8';
        ctx.beginPath();
        ctx.moveTo(shardX, shardY - 10);
        ctx.lineTo(shardX + 6, shardY);
        ctx.lineTo(shardX, shardY + 10);
        ctx.lineTo(shardX - 6, shardY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private renderLevelTransition(ctx: CanvasRenderingContext2D) {
    const alpha = this.levelTransitionAlpha < 1 ? this.levelTransitionAlpha : 2 - this.levelTransitionAlpha;
    ctx.save();
    ctx.fillStyle = '#1a1a1a';
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    if (alpha > 0.5) {
      ctx.globalAlpha = alpha - 0.5;
      this.drawInkText(ctx, `第 ${this.currentLevel + 1} 关`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, 36, '#f5f0e8');
    }
    ctx.restore();
  }

  private renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.drawInkText(ctx, '灵归虚无', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 40, 48, '#cc3333');
    this.drawInkText(ctx, '点击或按任意键重新开始', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 30, 20, '#a09888');
    ctx.restore();
  }

  private renderVictory(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    const t = performance.now() / 1000;
    for (let i = 0; i < 20; i++) {
      const angle = t + i * Math.PI * 2 / 20;
      const x = VIRTUAL_WIDTH / 2 + Math.cos(angle) * 200;
      const y = VIRTUAL_HEIGHT / 2 + Math.sin(angle) * 100;
      ctx.globalAlpha = 0.4 + Math.sin(t * 2 + i) * 0.3;
      ctx.fillStyle = '#ffd700';
      this.drawDiamondShape(ctx, x, y, 5 + Math.sin(t + i) * 2);
    }
    ctx.globalAlpha = 1;
    this.drawInkText(ctx, '镜碎灵归', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 40, 48, '#ffd700');
    this.drawInkText(ctx, '你击败了镜中之影，世界重归安宁', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 20, 20, '#e8dcc8');
    this.drawInkText(ctx, '点击或按任意键重新开始', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 60, 18, '#a09888');
    ctx.restore();
  }

  private drawInkText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.font = `${size}px "KaiTi", "STKaiti", "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private playSound(type: string) {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch (type) {
        case 'fragment_collect':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.linearRampToValueAtTime(1320, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        case 'dimension_switch':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(660, now + 0.2);
          osc.frequency.linearRampToValueAtTime(440, now + 0.4);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        case 'attack':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(150, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        case 'boss_hit':
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.linearRampToValueAtTime(80, now + 0.3);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        case 'player_hit':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'decoy':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.linearRampToValueAtTime(900, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'portal_enter':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(880, now + 0.3);
          osc.frequency.linearRampToValueAtTime(1760, now + 0.6);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.8);
          osc.start(now);
          osc.stop(now + 0.8);
          break;
        case 'game_over':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(220, now + 0.5);
          osc.frequency.linearRampToValueAtTime(110, now + 1);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0, now + 1.2);
          osc.start(now);
          osc.stop(now + 1.2);
          break;
        default:
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      }
    } catch {
      // audio not available
    }
  }

  handleCanvasClick(x: number, y: number) {
    if (this.gameState === GameState.Menu) {
      this.startGame();
    } else if (this.gameState === GameState.GameOver || this.gameState === GameState.Victory) {
      this.currentLevel = 1;
      this.loadLevel(1);
      this.gameState = GameState.Playing;
    }
  }

  handleKeyPress() {
    if (this.gameState === GameState.Menu) {
      this.startGame();
    } else if (this.gameState === GameState.GameOver || this.gameState === GameState.Victory) {
      this.currentLevel = 1;
      this.loadLevel(1);
      this.gameState = GameState.Playing;
    }
  }

  getSnapshot(): GameSnapshot {
    return {
      gameState: this.gameState,
      currentDimension: this.mirrorSystem.getCurrentDimension(),
      currentLevel: this.currentLevel,
      timeRemaining: this.timeRemaining,
      fragmentsCollected: this.puzzleManager.getCollectedCount(),
      totalFragments: this.puzzleManager.getTotalCount(),
      playerHealth: this.player.health,
      maxHealth: this.player.maxHealth,
      bossHealth: this.bossAI?.getHealth() ?? 0,
      bossMaxHealth: this.bossAI?.getMaxHealth() ?? 0,
      isMobile: this.isMobile,
      transitionProgress: this.transitionProgress,
      levelName: this.levelConfig?.name ?? '',
      isPortalActive: this.puzzleManager.isPortalActive(),
      bossWeakPointExposed: this.bossAI?.isWeakPointExposed() ?? false,
    };
  }
}
