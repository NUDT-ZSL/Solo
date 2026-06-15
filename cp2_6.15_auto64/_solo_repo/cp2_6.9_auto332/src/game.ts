import { RhythmEngine, BeatEvent } from './rhythm';
import { generateMaze, Maze, isWalkable, GRID_SIZE, CELL_PIXEL } from './maze';
import { Enemy, createEnemy, updateEnemyTimers, moveEnemyTowards, enemyStartAttack, isAdjacent, tryCounter } from './enemy';
import { Renderer, Particle, spawnPickupParticles, updateParticles, PlayerRenderState } from './render';

type GamePhase = 'ready' | 'preparing' | 'playing' | 'victory' | 'defeat';
type ChestEffect = 'heal' | 'shield' | 'speed';

const MOVE_ANIM_DURATION = 0.15;
const PLAYER_MAX_HP = 5;
const TOTAL_PREPARE_BEATS = 8;
const PARTICLE_COUNT = 50;
const CANVAS_SIZE = GRID_SIZE * CELL_PIXEL;

interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: boolean;
  speedBoost: number;
  moveTarget: { x: number; y: number } | null;
  moveAnim: { progress: number; fromX: number; fromY: number; toX: number; toY: number } | null;
}

class Game {
  private phase: GamePhase = 'ready';
  private prepareBeats: number = 0;
  private maze: Maze | null = null;
  private player: Player;
  private enemies: Enemy[] = [];
  private chestsCollected: number = 0;
  private particles: Particle[] = [];
  private rhythm: RhythmEngine;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private lastTime: number = 0;
  private beatPulse: number = 0;
  private exitBlink: number = 0;
  private pendingDirection: { dx: number; dy: number } | null = null;
  private resetTimer: number = 0;
  private hudHp: HTMLElement;
  private hudChest: HTMLElement;
  private hudBpm: HTMLElement;
  private hudBeatBar: HTMLElement;
  private startHint: HTMLElement;
  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlaySub: HTMLElement;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    this.renderer = new Renderer(canvas);
    this.rhythm = new RhythmEngine(120);
    this.rhythm.onBeat(e => this.onBeat(e));
    this.player = this.createPlayer();
    this.hudHp = document.getElementById('hp-display')!;
    this.hudChest = document.getElementById('chest-display')!;
    this.hudBpm = document.getElementById('bpm-display')!;
    this.hudBeatBar = document.getElementById('beat-bar')!;
    this.startHint = document.getElementById('start-hint')!;
    this.overlay = document.getElementById('overlay')!;
    this.overlayTitle = document.getElementById('overlay-title')!;
    this.overlaySub = document.getElementById('overlay-sub')!;
    window.addEventListener('keydown', e => this.onKeyDown(e));
    this.updateHUD();
    this.hideOverlay();
  }

  private createPlayer(): Player {
    return {
      x: 0, y: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      shield: false,
      speedBoost: 0,
      moveTarget: null,
      moveAnim: null
    };
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.phase === 'ready') {
        this.startGame();
      } else if (this.phase === 'playing') {
        this.tryCounterAttack();
      }
      return;
    }
    if (this.phase !== 'playing') return;
    if (this.player.moveTarget || this.player.moveAnim) return;
    let dx = 0, dy = 0;
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': dy = -1; break;
      case 'ArrowDown': case 'KeyS': dy = 1; break;
      case 'ArrowLeft': case 'KeyA': dx = -1; break;
      case 'ArrowRight': case 'KeyD': dx = 1; break;
      default: return;
    }
    e.preventDefault();
    this.pendingDirection = { dx, dy };
  }

  private async startGame() {
    this.startHint.classList.add('hidden');
    this.phase = 'preparing';
    this.prepareBeats = 0;
    await this.rhythm.start();
  }

  private onBeat(_event: BeatEvent) {
    this.beatPulse = 1;
    if (this.phase === 'preparing') {
      this.prepareBeats++;
      if (this.prepareBeats >= TOTAL_PREPARE_BEATS) {
        this.beginPlayPhase();
      }
    } else if (this.phase === 'playing') {
      this.executeBeatAction();
    }
  }

  private beginPlayPhase() {
    const maze = generateMaze(120, 1);
    this.maze = maze;
    this.player = this.createPlayer();
    this.player.x = maze.entrance.x;
    this.player.y = maze.entrance.y;
    this.enemies = maze.enemySpawns.map(s => createEnemy(s.x, s.y));
    this.chestsCollected = 0;
    this.particles = [];
    this.pendingDirection = null;
    this.phase = 'playing';
    this.hideOverlay();
    this.updateHUD();
  }

  private executeBeatAction() {
    if (!this.maze) return;
    if (this.player.moveTarget) {
      this.performPlayerMove();
    } else if (this.pendingDirection) {
      const dir = this.pendingDirection;
      this.pendingDirection = null;
      const tx = this.player.x + dir.dx;
      const ty = this.player.y + dir.dy;
      if (isWalkable(this.maze, tx, ty) && !this.enemyAt(tx, ty)) {
        this.player.moveTarget = { x: tx, y: ty };
        this.performPlayerMove();
      }
    }
    this.moveEnemies();
    this.checkEnemyAttacks();
  }

  private enemyAt(x: number, y: number): Enemy | null {
    return this.enemies.find(e => e.state !== 'dead' && e.x === x && e.y === y) || null;
  }

  private performPlayerMove() {
    if (!this.maze || !this.player.moveTarget) return;
    const target = this.player.moveTarget;
    this.player.moveAnim = {
      progress: 0,
      fromX: this.player.x,
      fromY: this.player.y,
      toX: target.x,
      toY: target.y
    };
    this.player.x = target.x;
    this.player.y = target.y;
    this.player.moveTarget = null;
    if (this.player.speedBoost > 0) {
      this.player.speedBoost--;
    }
    this.checkChestPickup();
    this.checkExit();
  }

  private checkChestPickup() {
    if (!this.maze) return;
    for (const chest of this.maze.chests) {
      if (!chest.collected && chest.x === this.player.x && chest.y === this.player.y) {
        chest.collected = true;
        this.chestsCollected++;
        this.maze.grid[chest.y][chest.x].type = 'room';
        this.particles.push(...spawnPickupParticles(chest.x, chest.y, PARTICLE_COUNT));
        this.applyChestEffect();
        this.updateHUD();
        break;
      }
    }
  }

  private applyChestEffect() {
    const effects: ChestEffect[] = ['heal', 'shield', 'speed'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    switch (effect) {
      case 'heal':
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
        break;
      case 'shield':
        this.player.shield = true;
        break;
      case 'speed':
        this.player.speedBoost = 5;
        break;
    }
    this.updateHUD();
  }

  private checkExit() {
    if (!this.maze) return;
    if (this.player.x === this.maze.exit.x && this.player.y === this.maze.exit.y) {
      this.triggerVictory();
    }
  }

  private moveEnemies() {
    if (!this.maze) return;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (e.state === 'attack' || e.attackTimer > 0 || e.canCounter) continue;
      if (isAdjacent(e, this.player.x, this.player.y)) continue;
      moveEnemyTowards(e, this.player.x, this.player.y, this.maze, this.enemies);
    }
  }

  private checkEnemyAttacks() {
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (isAdjacent(e, this.player.x, this.player.y) && e.state !== 'attack' && !e.canCounter) {
        enemyStartAttack(e);
        this.applyDamage(1);
      }
    }
  }

  private tryCounterAttack() {
    for (const e of this.enemies) {
      if (tryCounter(e)) {
        return;
      }
    }
  }

  private applyDamage(amount: number) {
    if (this.player.shield) {
      this.player.shield = false;
      this.updateHUD();
      return;
    }
    this.player.hp -= amount;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.triggerDefeat();
    }
    this.updateHUD();
  }

  private triggerVictory() {
    this.phase = 'victory';
    this.resetTimer = 1.5;
    this.showOverlay('victory', '节奏共鸣', '即将返回准备阶段...');
    this.rhythm.playVictorySound();
  }

  private triggerDefeat() {
    this.phase = 'defeat';
    this.resetTimer = 1.5;
    this.showOverlay('defeat', '节奏断裂', '即将重新开始...');
  }

  private showOverlay(type: 'victory' | 'defeat', title: string, sub: string) {
    this.overlay.classList.remove('hidden');
    this.overlayTitle.className = 'overlay-title ' + type;
    this.overlayTitle.textContent = title;
    this.overlaySub.textContent = sub;
  }

  private hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  private updateHUD() {
    this.hudHp.textContent = `❤ ${this.player.hp}`;
    const total = this.maze ? this.maze.chests.length : 2;
    this.hudChest.textContent = `★ ${this.chestsCollected}/${total}`;
    this.hudBpm.textContent = String(this.rhythm.getBPM());
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  private loop(timestamp: number) {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.update(dt);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  private update(dt: number) {
    this.beatPulse = Math.max(0, this.beatPulse - dt * 4);
    this.exitBlink += dt;
    const progress = this.rhythm.getBeatProgress();
    this.hudBeatBar.style.width = `${Math.floor(progress * 100)}%`;

    if (this.player.moveAnim) {
      this.player.moveAnim.progress += dt / MOVE_ANIM_DURATION;
      if (this.player.moveAnim.progress >= 1) {
        this.player.moveAnim = null;
      }
    }

    // Track canCounter transitions to detect missed counters
    for (const e of this.enemies) {
      const was = e.canCounter;
      updateEnemyTimers(e, dt);
      // If canCounter just went from true to false and enemy not dead = missed counter
      if (was && !e.canCounter && e.state !== 'dead') {
        this.applyDamage(1);
      }
    }

    this.particles = updateParticles(this.particles, dt);

    if ((this.phase === 'victory' || this.phase === 'defeat') && this.resetTimer > 0) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.resetToReady();
      }
    }
  }

  private resetToReady() {
    this.rhythm.reset();
    this.phase = 'ready';
    this.maze = null;
    this.player = this.createPlayer();
    this.enemies = [];
    this.chestsCollected = 0;
    this.particles = [];
    this.pendingDirection = null;
    this.hideOverlay();
    this.startHint.classList.remove('hidden');
    this.updateHUD();
  }

  private render() {
    if (this.phase === 'ready') {
      this.renderer.drawReadyScreen(this.beatPulse);
      return;
    }
    if (!this.maze) return;
    const playerRender: PlayerRenderState = {
      x: this.player.x,
      y: this.player.y,
      animProgress: this.player.moveAnim ? this.player.moveAnim.progress : -1,
      animFromX: this.player.moveAnim ? this.player.moveAnim.fromX : this.player.x,
      animFromY: this.player.moveAnim ? this.player.moveAnim.fromY : this.player.y,
      animToX: this.player.moveAnim ? this.player.moveAnim.toX : this.player.x,
      animToY: this.player.moveAnim ? this.player.moveAnim.toY : this.player.y,
      shield: this.player.shield
    };
    this.renderer.draw({
      maze: this.maze,
      player: playerRender,
      enemies: this.enemies,
      particles: this.particles,
      beatPulse: this.beatPulse,
      exitBlink: this.exitBlink
    });
  }
}

const game = new Game();
game.start();
