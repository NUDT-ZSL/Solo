import { Note, ParticlePool, TrajectoryType, SpeedTier } from './note';
import { Player } from './player';
import { UIRenderer } from './ui';

type GameState = 'start' | 'playing' | 'ended';

const TOTAL_GAME_TIME = 90000;
const STAGE_DURATION = 30000;
const MAX_NOTES = 60;

const TRAJECTORY_TYPES: TrajectoryType[] = ['straight', 's_curve', 'spiral'];

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private state: GameState = 'start';
  private startTime: number = 0;
  private gameTime: number = 0;
  private lastFrame: number = 0;

  private notes: Note[] = [];
  private particles: ParticlePool;
  private player: Player;
  private ui: UIRenderer;

  private currentTrajectory: TrajectoryType = 'straight';
  private trajectorySwitchTime: number = 0;
  private spawnInterval: number = 800;
  private lastSpawnTime: number = 0;
  private stage: number = 1;
  private hitWindowMs: number = 300;
  private stageTransitionAnim: number = 0;
  private stagePulse: number = 0;
  private targetFlash: number = 0;
  private resetAnim: number = 0;

  private centerX: number = 0;
  private centerY: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    this.ctx = ctx;

    this.particles = new ParticlePool(200);
    this.player = new Player();
    this.ui = new UIRenderer();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        this.handleClick(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    requestAnimationFrame((t) => this.loop(t));
  }

  private resize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  }

  private onPointerDown(e: PointerEvent) {
    e.preventDefault();
    this.handleClick(e.clientX, e.clientY);
  }

  private handleClick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const now = performance.now();

    if (this.state === 'start') {
      this.startGame(now);
      return;
    }

    if (this.state === 'ended') {
      const btn = (this.ctx as any)._restartBtn;
      if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.resetAnim = 1;
        setTimeout(() => {
          this.resetAnim = 0;
          this.startGame(performance.now());
        }, 300);
      }
      return;
    }

    if (this.state !== 'playing') return;

    const dcx = x - this.centerX;
    const dcy = y - this.centerY;
    const distToTarget = Math.sqrt(dcx * dcx + dcy * dcy);
    const TARGET_RADIUS = 60;

    if (this.player.isEnergyFull() && distToTarget <= TARGET_RADIUS) {
      this.triggerUltimate(now);
      return;
    }

    if (distToTarget <= TARGET_RADIUS && !this.player.isEnergyFull()) {
      return;
    }

    const clickRadius = 44;
    let hitNote: Note | null = null;
    let closestDist = Infinity;

    for (const note of this.notes) {
      if (!note.active) continue;
      const dx = x - note.x;
      const dy = y - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= Math.max(clickRadius, note.radius * 2) && dist < closestDist) {
        if (note.isInHitWindow(this.centerX, this.centerY, this.hitWindowMs, now, this.player.getSpeedMultiplier())) {
          closestDist = dist;
          hitNote = note;
        }
      }
    }

    if (hitNote) {
      this.onNoteHit(hitNote, now);
    } else {
      const distCenter = distToTarget;
      if (distCenter <= 80) {
        this.onMiss(x, y, now);
      }
    }
  }

  private onNoteHit(note: Note, now: number) {
    note.active = false;
    this.player.hit(now);
    this.particles.emit(note.x, note.y, note.color, 30);
  }

  private onMiss(_x: number, _y: number, now: number) {
    this.player.miss(now);
    this.targetFlash = 1;
    this.ui.spawnMiss(this.centerX, this.centerY - 20, now);
  }

  private triggerUltimate(_now: number) {
    let count = 0;
    for (const note of this.notes) {
      if (!note.active) continue;
      note.active = false;
      this.particles.emit(note.x, note.y, '#FFD700', 40, true);
      count++;
    }
    this.player.ultimateClear(count);
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60;
      const r = 100 + Math.random() * 150;
      this.particles.emit(
        this.centerX + Math.cos(angle) * r,
        this.centerY + Math.sin(angle) * r,
        '#FFD700',
        3,
        true
      );
    }
  }

  private startGame(now: number) {
    this.state = 'playing';
    this.startTime = now;
    this.gameTime = 0;
    this.lastSpawnTime = now;
    this.trajectorySwitchTime = now;
    this.notes = [];
    this.player.reset();
    this.currentTrajectory = TRAJECTORY_TYPES[0];
    this.spawnInterval = 800;
    this.stage = 1;
    this.hitWindowMs = 300;
    this.stageTransitionAnim = 0;
    this.stagePulse = 0;
    this.targetFlash = 0;
  }

  private spawnNote(now: number) {
    if (this.notes.filter(n => n.active).length >= MAX_NOTES) return;

    const speedRoll = Math.random();
    let tier: SpeedTier;
    if (speedRoll < 0.2) tier = 2;
    else if (speedRoll < 0.6) tier = 1;
    else tier = 0;

    const note = new Note(
      this.width,
      this.height,
      this.currentTrajectory,
      tier,
      this.centerX,
      this.centerY,
      now
    );
    this.notes.push(note);
  }

  private updateStage(_now: number, elapsed: number) {
    const expectedStage = Math.min(3, Math.floor(elapsed / STAGE_DURATION) + 1);
    if (expectedStage !== this.stage) {
      this.stage = expectedStage;
      this.hitWindowMs = this.stage === 1 ? 300 : (this.stage === 2 ? 250 : 200);
      this.spawnInterval = 800 * Math.pow(0.8, this.stage - 1);
      this.currentTrajectory = TRAJECTORY_TYPES[Math.floor(Math.random() * TRAJECTORY_TYPES.length)];
      this.stageTransitionAnim = 1;
      this.stagePulse = 1;
    }

    if (this.stageTransitionAnim > 0) {
      this.stageTransitionAnim = Math.max(0, this.stageTransitionAnim - 0.015);
    }
    if (this.stagePulse > 0) {
      this.stagePulse = Math.max(0, this.stagePulse - 0.008);
    }
    if (this.targetFlash > 0) {
      this.targetFlash = Math.max(0, this.targetFlash - 0.05);
    }
  }

  private loop(timestamp: number) {
    const dt = Math.min(50, timestamp - this.lastFrame);
    this.lastFrame = timestamp;
    const now = timestamp;

    if (this.state === 'playing') {
      this.gameTime = now - this.startTime;
      const elapsed = this.gameTime;

      if (elapsed >= TOTAL_GAME_TIME) {
        this.state = 'ended';
      } else {
        this.updateStage(now, elapsed);

        if (now - this.trajectorySwitchTime >= 5000) {
          this.trajectorySwitchTime = now;
          const currentIdx = TRAJECTORY_TYPES.indexOf(this.currentTrajectory);
          const nextIdx = (currentIdx + 1) % TRAJECTORY_TYPES.length;
          this.currentTrajectory = TRAJECTORY_TYPES[nextIdx];
        }

        if (now - this.lastSpawnTime >= this.spawnInterval) {
          this.lastSpawnTime = now;
          this.spawnNote(now);
          if (this.stage >= 2 && Math.random() < 0.3) {
            this.spawnNote(now);
          }
        }

        const speedMult = this.player.getSpeedMultiplier();
        for (const note of this.notes) {
          if (!note.active) continue;
          const wasActive = note.active;
          note.update(now, speedMult);
          if (wasActive && !note.active) {
            this.player.miss(now);
            this.targetFlash = 1;
            this.ui.spawnMiss(this.centerX, this.centerY - 20, now);
          }
        }

        this.notes = this.notes.filter(n => n.active || n.progress > 0.98 ? n.active : true);
        if (this.notes.length > MAX_NOTES * 2) {
          this.notes = this.notes.filter(n => n.active);
        }

        this.player.update(now);
      }
    }

    this.particles.update(dt);
    this.ui.update(now);
    this.render(now);

    requestAnimationFrame((t) => this.loop(t));
  }

  private render(now: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    this.ui.drawBackground(ctx, w, h, this.stagePulse);

    if (this.state === 'start') {
      this.ui.drawStartScreen(ctx, w, h, now);
      return;
    }

    for (const note of this.notes) {
      if (note.active) {
        note.drawTrajectory(ctx);
      }
    }

    this.ui.drawTarget(ctx, this.centerX, this.centerY, this.player.isEnergyFull(), this.targetFlash, now);

    for (const note of this.notes) {
      if (note.active) {
        note.draw(ctx);
      }
    }

    this.particles.draw(ctx);

    this.ui.drawMissTexts(ctx, now);

    if (this.state === 'playing') {
      this.ui.drawHUD(ctx, this.player, now, this.gameTime, TOTAL_GAME_TIME, this.stage, this.stageTransitionAnim);
    }

    if (this.state === 'ended') {
      this.ui.drawEndScreen(ctx, w, h, this.player.score, this.player.maxCombo, now, this.resetAnim);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
