import { Grid } from './Grid';
import { Pendulum } from './Pendulum';
import { EffectManager } from './EffectManager';
import {
  GameSaveState, ReplayFrame, EnergyBall, HexCell, ReplayBallState,
  FIBONACCI, COMBO_WINDOW, AUTO_SAVE_INTERVAL, LOCKS_PER_LEVEL,
  COLORS, BALL_MEET_WINDOW, ACTIVATION_DECAY_TIME,
} from './types';

export type GameState = 'playing' | 'victory' | 'replay';

interface ReplaySnapshot {
  time: number;
  balls: ReplayBallState[];
  activated: { q: number; r: number }[];
  paths: { fromQ: number; fromR: number; toQ: number; toR: number }[];
  score: number;
  combo: number;
}

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

  private replaySnapshots: ReplaySnapshot[] = [];
  private replayIndex: number = 0;
  private replayTime: number = 0;
  private isReplaying: boolean = false;
  private replayBalls: ReplayBallState[] = [];
  private replayInterpFactor: number = 0;

  private draggingPath: { path: any; startX: number; startY: number } | null = null;
  private isDragging: boolean = false;
  private dragCurrentX: number = 0;
  private dragCurrentY: number = 0;

  private pulseEffects: { x: number; y: number; startTime: number; duration: number; maxRadius: number; isDual: boolean }[] = [];
  private activatedCellsThisFrame: HexCell[] = [];
  private triggeredMeetCells: Set<string> = new Set();
  private lastSnapshotTime: number = 0;

  private mousePos: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.grid = new Grid();
    this.effectManager = new EffectManager();
    this.pendulum = new Pendulum(this.grid, this.effectManager);
  }

  initialize(canvasWidth: number, canvasHeight: number) {
    this.loadGame();
    this.grid.initialize(canvasWidth, canvasHeight, this.level);
    this.pendulum = new Pendulum(this.grid, this.effectManager);
    this.effectManager.clear();
    this.pulseEffects = [];
    this.triggeredMeetCells.clear();
    this.replaySnapshots = [];
    this.lastSnapshotTime = 0;
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
    this.activatedCellsThisFrame = [];
    this.triggeredMeetCells.clear();
    this.replaySnapshots = [];
    this.lastSnapshotTime = 0;
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
    this.pendulum.update(
      dt,
      this.currentTime,
      (ball, cell) => this.onBallArrive(ball, cell),
      (ball, cell, timestamp) => this.onBallVisitCell(ball, cell, timestamp)
    );

    if (this.currentTime - this.lastSnapshotTime > 0.05) {
      this.captureReplaySnapshot();
      this.lastSnapshotTime = this.currentTime;
    }

    for (const pulse of this.pulseEffects) {
      const elapsed = this.currentTime - pulse.startTime;
      if (elapsed < pulse.duration) {
        const progress = elapsed / pulse.duration;
        const radius = pulse.maxRadius * progress;

        for (const cell of this.grid.cells) {
          const dx = cell.x - pulse.x;
          const dy = cell.y - pulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius && cell.isPassable && !this.activatedCellsThisFrame.includes(cell)) {
            if (cell.targetColorLevel < 1 || pulse.isDual) {
              this.grid.activateCell(cell, this.currentTime);
              this.activatedCellsThisFrame.push(cell);
              this.score += 1;
            }
          }
        }
      }
    }

    this.pulseEffects = this.pulseEffects.filter(
      p => this.currentTime - p.startTime < p.duration
    );

    this.effectManager.update(dt);

    if (this.currentTime - this.lastAutoSave > AUTO_SAVE_INTERVAL) {
      const saveStart = performance.now();
      this.saveGame();
      const saveDuration = performance.now() - saveStart;
      if (saveDuration > 5) {
        console.warn(`Save took ${saveDuration.toFixed(2)}ms, exceeds 5ms limit`);
      }
      this.lastAutoSave = this.currentTime;
    }

    if (this.grid.unlockedCount >= LOCKS_PER_LEVEL && this.state === 'playing') {
      this.state = 'victory';
      this.victoryAnimTime = 0;
      this.saveGame();
    }
  }

  private onBallArrive(ball: EnergyBall, cell: HexCell) {
    if (cell.isLocked) {
      this.grid.unlockCell(cell);
      this.effectManager.addUnlockParticles(cell.x, cell.y);
    } else {
      this.grid.activateCell(cell, this.currentTime);
    }

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

    if (!this.activatedCellsThisFrame.includes(cell)) {
      this.activatedCellsThisFrame.push(cell);
    }
  }

  private onBallVisitCell(ball: EnergyBall, cell: HexCell, timestamp: number) {
    if (cell.isLocked) return;

    const existingVisit = cell.ballVisits.find(v => v.ballId === ball.id);
    if (!existingVisit) {
      cell.ballVisits.push({ ballId: ball.id, time: timestamp });
    } else {
      existingVisit.time = timestamp;
    }

    const cellKey = `${cell.q},${cell.r}`;
    if (this.triggeredMeetCells.has(cellKey)) return;

    const now = timestamp;
    const recentVisits = cell.ballVisits.filter(v => now - v.time <= BALL_MEET_WINDOW);
    const uniqueBallIds = new Set(recentVisits.map(v => v.ballId));

    if (uniqueBallIds.size >= 2) {
      this.triggeredMeetCells.add(cellKey);
      this.triggerDualPulse(cell);
    }
  }

  private triggerDualPulse(cell: HexCell) {
    this.pulseEffects.push({
      x: cell.x, y: cell.y,
      startTime: this.currentTime,
      duration: 1.2,
      maxRadius: 80,
      isDual: true,
    });

    this.effectManager.addPulseEffect(cell.x, cell.y);
    this.score += 5;
  }

  private captureReplaySnapshot() {
    const snapshot: ReplaySnapshot = {
      time: this.currentTime,
      balls: this.pendulum.balls
        .filter(b => b.active || b.trail.length > 0)
        .map(b => ({
          id: b.id,
          x: b.x,
          y: b.y,
          color: b.color,
          trail: b.trail.map(t => ({ ...t })),
          active: b.active,
        })),
      activated: this.activatedCellsThisFrame.map(c => ({ q: c.q, r: c.r })),
      paths: this.grid.paths.map(p => ({
        fromQ: p.fromCell.q, fromR: p.fromCell.r,
        toQ: p.toCell.q, toR: p.toCell.r,
      })),
      score: this.score,
      combo: this.combo,
    };
    this.replaySnapshots.push(snapshot);
  }

  handleClick(px: number, py: number, canvasWidth: number = 0): boolean {
    if (this.state !== 'playing') return false;

    const replayBtn = this.getReplayButtonBounds(canvasWidth);
    if (
      px >= replayBtn.x && px <= replayBtn.x + replayBtn.w &&
      py >= replayBtn.y && py <= replayBtn.y + replayBtn.h
    ) {
      this.startReplay();
      return true;
    }

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
    this.effectManager.addFlowParticles(
      (this.grid.selectedStart.x + cell.x) / 2,
      (this.grid.selectedStart.y + cell.y) / 2,
      COLORS.pathColor, 5
    );

    const activeBalls = this.pendulum.getActiveBallCount();
    if (activeBalls < 2) {
      const isMain = activeBalls === 0;
      this.pendulum.createBall(this.grid.selectedStart, cell, path, isMain);
    } else if (cell.targetColorLevel > 0) {
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
    if (!cell || !cell.isPassable || cell.targetColorLevel <= 0) return;

    if (this.pendulum.getActiveBallCount() >= 2) return;

    this.grid.selectedStart = cell;
    cell.pulseTime = 0.2;
  }

  handleMouseMove(px: number, py: number) {
    this.mousePos = { x: px, y: py };
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
    if (this.replaySnapshots.length < 2) return;

    this.state = 'replay';
    this.isReplaying = true;
    this.replayIndex = 0;
    this.replayTime = 0;
    this.replayBalls = [];
    this.grid.paths = [];
    this.grid.intersections = [];

    for (const cell of this.grid.cells) {
      cell.activationCount = 0;
      cell.targetColorLevel = 0;
      cell.displayColorLevel = 0;
      cell.lastActivatedTime = -Infinity;
      cell.displayColorTransitionStart = -Infinity;
      cell.ballVisits = [];
    }

    this.effectManager.clear();
    this.pulseEffects = [];
  }

  private updateReplay(dt: number) {
    const replaySpeed = 2;
    this.replayTime += dt * replaySpeed;

    while (this.replayIndex + 1 < this.replaySnapshots.length &&
           this.replaySnapshots[this.replayIndex + 1].time <= this.replayTime) {
      this.replayIndex++;
    }

    if (this.replayIndex + 1 >= this.replaySnapshots.length) {
      this.endReplay();
      return;
    }

    const prev = this.replaySnapshots[this.replayIndex];
    const next = this.replaySnapshots[this.replayIndex + 1];
    const timeSpan = next.time - prev.time;
    this.replayInterpFactor = timeSpan > 0 ? (this.replayTime - prev.time) / timeSpan : 0;
    this.replayInterpFactor = Math.max(0, Math.min(1, this.replayInterpFactor));

    for (const pathData of next.paths) {
      const from = this.grid.getCellAt(pathData.fromQ, pathData.fromR);
      const to = this.grid.getCellAt(pathData.toQ, pathData.toR);
      if (from && to) {
        const exists = this.grid.paths.some(p =>
          p.fromCell.q === from.q && p.fromCell.r === from.r &&
          p.toCell.q === to.q && p.toCell.r === to.r
        );
        if (!exists) {
          this.grid.addPath(from, to);
        }
      }
    }

    this.replayBalls = [];
    const maxLen = Math.max(prev.balls.length, next.balls.length);
    for (let i = 0; i < maxLen; i++) {
      const pb = prev.balls[i];
      const nb = next.balls[i];
      if (pb && nb) {
        const interpBall: ReplayBallState = {
          id: pb.id,
          x: pb.x + (nb.x - pb.x) * this.replayInterpFactor,
          y: pb.y + (nb.y - pb.y) * this.replayInterpFactor,
          color: nb.color,
          trail: nb.trail.map((t, idx) => {
            const pt = pb.trail[idx] || t;
            return {
              x: pt.x + (t.x - pt.x) * this.replayInterpFactor,
              y: pt.y + (t.y - pt.y) * this.replayInterpFactor,
              alpha: t.alpha,
            };
          }),
          active: nb.active,
        };
        this.replayBalls.push(interpBall);
      } else if (nb) {
        this.replayBalls.push({ ...nb });
      } else if (pb) {
        this.replayBalls.push({ ...pb, active: false });
      }
    }

    for (const act of next.activated) {
      const cell = this.grid.getCellAt(act.q, act.r);
      if (cell && cell.targetColorLevel < 1) {
        this.grid.activateCell(cell, this.currentTime);
        this.effectManager.addGlowParticles(cell.x, cell.y, COLORS.runePulseEnd, 3);
      }
    }

    this.grid.update(dt, this.currentTime);
  }

  endReplay() {
    this.state = 'playing';
    this.isReplaying = false;
    this.replayIndex = 0;
    this.replayBalls = [];
    this.grid.paths = [];
    this.grid.intersections = [];

    for (const cell of this.grid.cells) {
      cell.activationCount = 0;
      cell.targetColorLevel = 0;
      cell.displayColorLevel = 0;
      cell.lastActivatedTime = -Infinity;
      cell.displayColorTransitionStart = -Infinity;
      cell.ballVisits = [];
      cell.pulseTime = 0;
    }

    this.effectManager.clear();
    this.pulseEffects = [];
    this.triggeredMeetCells.clear();
    this.grid.selectedStart = null;
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
      const start = performance.now();
      const data = localStorage.getItem('rune_pendulum_save');
      if (!data) return false;
      const state: GameSaveState = JSON.parse(data);
      this.score = state.score;
      this.level = state.level;
      this.combo = state.combo;
      this.comboTimer = state.comboTimer;
      const duration = performance.now() - start;
      if (duration > 50) {
        console.warn(`Load took ${duration.toFixed(2)}ms, exceeds 50ms limit`);
      }
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

    if (this.grid.selectedStart && !this.isDragging && this.state === 'playing') {
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
      const elapsed = this.state === 'replay'
        ? this.replayTime - pulse.startTime
        : this.currentTime - pulse.startTime;
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

    if (this.state === 'replay' && this.replayBalls.length > 0) {
      this.drawReplayBalls(ctx);
    } else {
      this.pendulum.draw(ctx, this.isReplaying);
    }

    this.effectManager.draw(ctx);

    this.drawUI(ctx, canvasWidth, canvasHeight);

    if (this.state === 'victory') {
      this.drawVictory(ctx, canvasWidth, canvasHeight);
    }

    if (this.state === 'replay') {
      this.drawReplayOverlay(ctx, canvasWidth, canvasHeight);
    }
  }

  private drawReplayBalls(ctx: CanvasRenderingContext2D) {
    const replaySpeed = 2;
    const trailAlphaMul = 0.4 / replaySpeed;

    for (const ball of this.replayBalls) {
      if (ball.trail.length > 0) {
        for (let i = 0; i < ball.trail.length - 1; i++) {
          const t = ball.trail[i];
          ctx.beginPath();
          ctx.arc(t.x, t.y, 3 * t.alpha, 0, Math.PI * 2);
          ctx.fillStyle = ball.color;
          ctx.globalAlpha = Math.max(0, t.alpha * trailAlphaMul);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (ball.active) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 12);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, ball.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.6;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();

        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
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
    const displayScore = this.state === 'replay'
      ? (this.replaySnapshots[this.replayIndex]?.score ?? this.score)
      : this.score;
    ctx.fillText(`分数: ${displayScore}`, canvasWidth / 2 - 60, barH / 2);

    const displayCombo = this.state === 'replay'
      ? (this.replaySnapshots[this.replayIndex]?.combo ?? this.combo)
      : this.combo;
    if (displayCombo > 1) {
      ctx.fillStyle = COLORS.comboBadge;
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText(`x${displayCombo}`, canvasWidth / 2 + 20, barH / 2);
    }

    const remaining = Math.max(0, LOCKS_PER_LEVEL - this.grid.unlockedCount);
    ctx.fillStyle = '#B0B0C0';
    ctx.textAlign = 'right';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText(`⚷ ${remaining}`, canvasWidth - 80, barH / 2);

    const replayBtn = this.getReplayButtonBounds(canvasWidth);
    const hovered = this.mousePos.x >= replayBtn.x && this.mousePos.x <= replayBtn.x + replayBtn.w &&
                    this.mousePos.y >= replayBtn.y && this.mousePos.y <= replayBtn.y + replayBtn.h;
    ctx.fillStyle = hovered ? COLORS.energyBallSub : '#9A8AB0';
    ctx.textAlign = 'right';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('⟳ 回放', canvasWidth - 15, barH / 2);
  }

  private drawVictory(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    const progress = Math.min(1, this.victoryAnimTime / 0.8);
    const bounceScale = this.getBounceScale(progress);
    const alpha = Math.min(1, progress * 2);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(bounceScale, bounceScale);
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.unlockGold;
    ctx.shadowColor = COLORS.unlockGold;
    ctx.shadowBlur = 25;
    ctx.fillText('通关！', 0, 0);
    ctx.shadowBlur = 0;

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#E0E0FF';
    ctx.fillText('即将进入下一关...', 0, 60);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private getBounceScale(progress: number): number {
    const overshoot = 1.70158;
    const t = progress;
    const s = t * t * ((overshoot + 1) * t - overshoot);
    return 0.4 + s * 0.6;
  }

  private drawReplayOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(26, 17, 36, 0.3)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('回放中 (2倍速)... 点击任意处退出', w / 2, h - 30);
  }

  getReplayButtonBounds(canvasWidth: number): { x: number; y: number; w: number; h: number } {
    return { x: canvasWidth - 70, y: 10, w: 55, h: 30 };
  }
}
