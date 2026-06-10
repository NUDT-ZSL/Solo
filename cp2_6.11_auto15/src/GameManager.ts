import { Grid } from './Grid';
import { Pendulum } from './Pendulum';
import { EffectManager } from './EffectManager';
import {
  GameSaveState, ReplayFrame, EnergyBall, HexCell,
  FIBONACCI, COMBO_WINDOW, AUTO_SAVE_INTERVAL, LOCKS_PER_LEVEL,
  COLORS,
} from './types';

export type GameState = 'playing' | 'victory' | 'replay';

export class GameManager {
  grid: Grid;
  pendulum: Pendulum;
  effectManager: EffectManager;

  score: number = 0;
  combo: number = 0;
  comboTimer: number = 0;
  level: number = 1;
  state: GameState = 'playing';

  private lastAutoSave: number = 0;
  private currentTime: number = 0;
  private victoryAnimTime: number = 0;

  private replayFrames: ReplayFrame[] = [];
  private replayIndex: number = 0;
  private replayTime: number = 0;
  private isReplaying: boolean = false;

  private draggingPath: { path: any; startX: number; startY: number } | null = null;
  private isDragging: boolean = false;
  private dragCurrentX: number = 0;
  private dragCurrentY: number = 0;

  private pulseEffects: { x: number; y: number; startTime: number; duration: number; maxRadius: number }[] = [];

  private activatedCellsThisFrame: HexCell[] = [];

  constructor() {
    this.grid = new Grid();
    this.pendulum = new Pendulum(this.grid, this.effectManager = new EffectManager());
  }

  initialize(canvasWidth: number, canvasHeight: number) {
    this.loadGame();
    this.grid.initialize(canvasWidth, canvasHeight, this.level);
    this.pendulum = new Pendulum(this.grid, this.effectManager);
    this.effectManager.clear();
    this.pulseEffects = [];
  }

  resetLevel(canvasWidth: number, canvasHeight: number) {
    this.grid.initialize(canvasWidth, canvasHeight, this.level);
    this.pendulum.clear();
    this.effectManager.clear();
    this.pulseEffects = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.state = 'playing';
    this.victoryAnimTime = 0;
    this.replayFrames = [];
    this.activatedCellsThisFrame = [];
  }

  update(dt: number, canvasWidth: number, canvasHeight: number) {
    this.currentTime += dt;

    if (this.state === 'replay') {
      this.updateReplay(dt);
      this.effectManager.update(dt);
      this.grid.update(dt, this.currentTime);
      return;
    }

    if (this.state === 'victory') {
      this.victoryAnimTime += dt;
      this.effectManager.update(dt);
      if (this.victoryAnimTime > 2.5) {
        this.level++;
        this.resetLevel(canvasWidth, canvasHeight);
      }
      return;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    this.grid.update(dt, this.currentTime);

    this.activatedCellsThisFrame = [];
    this.pendulum.update(dt, this.currentTime, (ball, cell) => {
      this.onBallArrive(ball, cell);
    });

    const collision = this.pendulum.checkBallCollision();
    if (collision) {
      this.onBallCollision(collision.ball1, collision.ball2);
    }

    for (const pulse of this.pulseEffects) {
      const elapsed = this.currentTime - pulse.startTime;
      if (elapsed < pulse.duration) {
        const progress = elapsed / pulse.duration;
        const radius = pulse.maxRadius * progress;
        const alpha = 1 - progress;

        for (const cell of this.grid.cells) {
          const dx = cell.x - pulse.x;
          const dy = cell.y - pulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius && cell.isPassable && cell.activationCount === 0) {
            cell.activationCount = 1;
            cell.lastActivatedTime = this.currentTime;
            cell.pulseTime = 0.2;
            this.activatedCellsThisFrame.push(cell);
            this.score += 1;
          }
        }
      }
    }

    this.pulseEffects = this.pulseEffects.filter(
      p => this.currentTime - p.startTime < p.duration
    );

    this.effectManager.update(dt);

    if (this.currentTime - this.lastAutoSave > AUTO_SAVE_INTERVAL) {
      this.saveGame();
      this.lastAutoSave = this.currentTime;
    }

    if (this.grid.unlockedCount >= LOCKS_PER_LEVEL && this.state === 'playing') {
      this.state = 'victory';
      this.victoryAnimTime = 0;
    }
  }

  private onBallArrive(ball: EnergyBall, cell: HexCell) {
    if (cell.isLocked) {
      this.grid.unlockCell(cell);
      this.effectManager.addUnlockParticles(cell.x, cell.y);
      this.replayFrames.push({
        time: this.currentTime,
        type: 'unlock',
        data: { q: cell.q, r: cell.r },
      });
    }

    cell.activationCount = Math.min(cell.activationCount + 1, 3);
    cell.lastActivatedTime = this.currentTime;
    cell.pulseTime = 0.2;

    this.effectManager.addGlowParticles(cell.x, cell.y, ball.color, 6);

    if (this.comboTimer > 0) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.comboTimer = COMBO_WINDOW;

    const fibIndex = Math.min(this.combo, FIBONACCI.length - 1);
    const points = FIBONACCI[fibIndex];
    this.score += points;

    this.activatedCellsThisFrame.push(cell);

    this.replayFrames.push({
      time: this.currentTime,
      type: 'activate',
      data: { q: cell.q, r: cell.r, isMain: ball.isMain, score: points },
    });
  }

  private onBallCollision(ball1: EnergyBall, ball2: EnergyBall) {
    const midX = (ball1.x + ball2.x) / 2;
    const midY = (ball1.y + ball2.y) / 2;

    this.pulseEffects.push({
      x: midX, y: midY,
      startTime: this.currentTime,
      duration: 1.2,
      maxRadius: 80,
    });

    this.effectManager.addPulseEffect(midX, midY);
    this.score += 5;
  }

  handleClick(px: number, py: number): boolean {
    if (this.state !== 'playing') return false;

    const intersection = this.grid.getIntersectionAt(px, py);
    if (intersection && intersection.chosenDirection === null) {
      const direction = this.grid.getDirectionArrowAt(px, py, intersection);
      if (direction) {
        intersection.chosenDirection = direction;
        for (const ball of this.pendulum.balls) {
          if (ball.waitingAtIntersection) {
            this.pendulum.resolveIntersection(ball, direction);
          }
        }
        return true;
      }
    }

    const cell = this.grid.getCellAtPixel(px, py);
    if (!cell) {
      this.grid.selectedStart = null;
      return false;
    }

    if (!cell.isPassable) {
      cell.shakeTime = 0.15;
      this.effectManager.addClickParticles(cell.x, cell.y, COLORS.invalidFlash);
      return false;
    }

    this.effectManager.addClickParticles(cell.x, cell.y);

    if (!this.grid.selectedStart) {
      this.grid.selectedStart = cell;
      cell.pulseTime = 0.2;
      return true;
    }

    if (this.grid.selectedStart === cell) {
      return false;
    }

    if (!this.grid.isWithinRange(this.grid.selectedStart, cell)) {
      cell.shakeTime = 0.15;
      this.effectManager.addClickParticles(cell.x, cell.y, COLORS.invalidFlash);
      return false;
    }

    const path = this.grid.addPath(this.grid.selectedStart, cell);
    this.replayFrames.push({
      time: this.currentTime,
      type: 'path_create',
      data: {
        fromQ: this.grid.selectedStart.q, fromR: this.grid.selectedStart.r,
        toQ: cell.q, toR: cell.r,
      },
    });

    this.effectManager.addFlowParticles(
      (this.grid.selectedStart.x + cell.x) / 2,
      (this.grid.selectedStart.y + cell.y) / 2,
      COLORS.pathColor, 5
    );

    const activeBalls = this.pendulum.getActiveBallCount();
    if (activeBalls < 2) {
      const isMain = activeBalls === 0;
      this.pendulum.createBall(this.grid.selectedStart, cell, path, isMain);
    } else if (cell.activationCount > 0) {
      const newPath = this.grid.addPath(this.grid.selectedStart, cell);
      this.pendulum.splitBall(this.grid.selectedStart, cell, newPath);
    }

    this.grid.selectedStart = cell;
    cell.pulseTime = 0.2;

    return true;
  }

  handleDoubleClick(px: number, py: number) {
    if (this.state !== 'playing') return;
    const cell = this.grid.getCellAtPixel(px, py);
    if (!cell || !cell.isPassable || cell.activationCount <= 0) return;

    if (this.pendulum.getActiveBallCount() >= 2) return;

    this.grid.selectedStart = cell;
    cell.pulseTime = 0.2;
  }

  handleMouseMove(px: number, py: number) {
    if (this.state !== 'playing') return;

    this.grid.hoveredCell = this.grid.getCellAtPixel(px, py);

    if (this.isDragging && this.draggingPath) {
      this.dragCurrentX = px;
      this.dragCurrentY = py;
    }
  }

  handleMouseDown(px: number, py: number) {
    if (this.state !== 'playing') return;

    const path = this.grid.findPathNear(px, py);
    if (path) {
      this.isDragging = true;
      this.draggingPath = { path, startX: px, startY: py };
      this.dragCurrentX = px;
      this.dragCurrentY = py;
    }
  }

  handleMouseUp(px: number, py: number) {
    if (this.isDragging && this.draggingPath) {
      const dx = px - this.draggingPath.startX;
      const dy = py - this.draggingPath.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const midX = (this.draggingPath.path.fromCell.x + this.draggingPath.path.toCell.x) / 2;
        const midY = (this.draggingPath.path.fromCell.y + this.draggingPath.path.toCell.y) / 2;
        this.grid.updatePathControlPoint(
          this.draggingPath.path,
          midX + dx * 0.5,
          midY + dy * 0.5
        );
      }
    }
    this.isDragging = false;
    this.draggingPath = null;
  }

  startReplay() {
    if (this.replayFrames.length === 0) return;
    this.state = 'replay';
    this.isReplaying = true;
    this.replayIndex = 0;
    this.replayTime = 0;
  }

  private updateReplay(dt: number) {
    this.replayTime += dt * 2;

    while (this.replayIndex < this.replayFrames.length) {
      const frame = this.replayFrames[this.replayIndex];
      if (frame.time <= this.replayTime) {
        switch (frame.type) {
          case 'activate': {
            const cell = this.grid.getCellAt(frame.data.q as number, frame.data.r as number);
            if (cell) {
              cell.pulseTime = 0.2;
              this.effectManager.addGlowParticles(cell.x, cell.y, COLORS.runePulseEnd, 4);
            }
            break;
          }
          case 'unlock': {
            const cell = this.grid.getCellAt(frame.data.q as number, frame.data.r as number);
            if (cell) {
              this.effectManager.addUnlockParticles(cell.x, cell.y);
            }
            break;
          }
          case 'path_create': {
            const from = this.grid.getCellAt(frame.data.fromQ as number, frame.data.fromR as number);
            const to = this.grid.getCellAt(frame.data.toQ as number, frame.data.toR as number);
            if (from && to) {
              this.grid.addPath(from, to);
              this.effectManager.addFlowParticles(
                (from.x + to.x) / 2, (from.y + to.y) / 2, COLORS.pathColor, 3
              );
            }
            break;
          }
        }
        this.replayIndex++;
      } else {
        break;
      }
    }

    if (this.replayIndex >= this.replayFrames.length) {
      this.state = 'playing';
      this.isReplaying = false;
      this.grid.paths = [];
      this.grid.intersections = [];
    }
  }

  saveGame() {
    const state: GameSaveState = {
      score: this.score,
      level: this.level,
      combo: this.combo,
      comboTimer: this.comboTimer,
      unlockedCount: this.grid.unlockedCount,
      gridData: this.grid.getSerializationData(),
      paths: this.grid.paths.map(p => ({
        fromQ: p.fromCell.q, fromR: p.fromCell.r,
        toQ: p.toCell.q, toR: p.toCell.r,
        cpX: p.controlPoint?.x ?? 0, cpY: p.controlPoint?.y ?? 0,
      })),
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('rune_pendulum_save', JSON.stringify(state));
    } catch (e) {
      // silently fail
    }
  }

  loadGame(): boolean {
    try {
      const data = localStorage.getItem('rune_pendulum_save');
      if (!data) return false;
      const state: GameSaveState = JSON.parse(data);
      this.score = state.score;
      this.level = state.level;
      this.combo = state.combo;
      this.comboTimer = state.comboTimer;
      return true;
    } catch {
      return false;
    }
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.drawBackground(ctx, canvasWidth, canvasHeight);

    this.grid.draw(ctx, this.currentTime);

    if (this.isDragging && this.draggingPath) {
      this.grid.drawPreviewPath(
        ctx,
        this.draggingPath.path.fromCell,
        this.dragCurrentX,
        this.dragCurrentY,
        { x: this.dragCurrentX, y: this.dragCurrentY }
      );
    }

    if (this.grid.selectedStart && !this.isDragging) {
      const cell = this.grid.selectedStart;
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, this.grid.hexSize * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.runePulseEnd;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const pulse of this.pulseEffects) {
      const elapsed = this.currentTime - pulse.startTime;
      const progress = Math.min(1, elapsed / pulse.duration);
      const radius = pulse.maxRadius * progress;
      const alpha = (1 - progress) * 0.4;

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(74, 140, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 136, 77, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    this.pendulum.draw(ctx);
    this.effectManager.draw(ctx);

    this.drawUI(ctx, canvasWidth, canvasHeight);

    if (this.state === 'victory') {
      this.drawVictory(ctx, canvasWidth, canvasHeight);
    }

    if (this.state === 'replay') {
      this.drawReplayOverlay(ctx, canvasWidth, canvasHeight);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, COLORS.bgStart);
    gradient.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 20; i++) {
      const x = ((this.currentTime * 5 + i * 137) % (w + 100)) - 50;
      const y = ((this.currentTime * 3 + i * 211) % (h + 100)) - 50;
      ctx.beginPath();
      ctx.arc(x, y, 30 + i * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#7B6B9A';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    const barH = 50;
    ctx.fillStyle = 'rgba(26, 17, 36, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, barH);

    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = COLORS.levelText;
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${this.level} 关`, 15, barH / 2);

    ctx.fillStyle = '#E0E0FF';
    ctx.textAlign = 'center';
    ctx.fillText(`分数: ${this.score}`, canvasWidth / 2 - 60, barH / 2);

    if (this.combo > 1) {
      ctx.fillStyle = COLORS.comboBadge;
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText(`x${this.combo}`, canvasWidth / 2 + 20, barH / 2);
    }

    const remaining = LOCKS_PER_LEVEL - this.grid.unlockedCount;
    ctx.fillStyle = '#B0B0C0';
    ctx.textAlign = 'right';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText(`⚷ ${remaining}`, canvasWidth - 80, barH / 2);

    ctx.fillStyle = '#9A8AB0';
    ctx.textAlign = 'right';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('⟳ 回放', canvasWidth - 15, barH / 2);
  }

  private drawVictory(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    const progress = Math.min(1, this.victoryAnimTime / 0.8);
    const scale = 0.5 + progress * 0.5;
    const alpha = progress;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 64px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.unlockGold;
    ctx.shadowColor = COLORS.unlockGold;
    ctx.shadowBlur = 20;
    ctx.fillText('通关！', 0, 0);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawReplayOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(26, 17, 36, 0.3)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(200, 200, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('回放中 (2x)...', w / 2, h - 30);
  }

  getReplayButtonBounds(canvasWidth: number): { x: number; y: number; w: number; h: number } {
    return { x: canvasWidth - 70, y: 10, w: 55, h: 30 };
  }
}
