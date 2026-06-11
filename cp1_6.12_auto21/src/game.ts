import { Bubble, NORMAL_COLORS } from './bubble.js';
import { Emitter } from './emitter.js';
import { ParticleSystem } from './particles.js';

const GRID_ROWS = 10;
const GRID_COLS = 8;
const CLEANUP_THRESHOLD = 10;
const SCORE_PER_POP = 10;
const SCORE_PER_FALL = 15;
const SHAKE_DURATION = 200;
const SHAKE_INTENSITY = 8;
const ENCOURAGEMENTS = [
  '太棒了！再来一局挑战更高分吧！',
  '你的操作很厉害！再接再厉！',
  '真厉害！泡泡被你全部消灭了！',
  '哇，你是泡泡龙大师！',
  '干得漂亮！继续保持这个状态！',
  '出色的表现！你的目标一定是满分！',
  '太精彩了！我看到了你的无限潜力！',
  '完美通关！期待你更精彩的表现！'
];

export interface GameState {
  status: 'playing' | 'gameover' | 'win' | 'transitioning';
  score: number;
  displayScore: number;
  scoreAnimStart: number;
  scoreAnimTarget: number;
  scoreAnimElapsed: number;
  scoreAnimDuration: number;
  bubbleCount: number;
  cleanupMode: boolean;
  shakeTime: number;
  shakeX: number;
  shakeY: number;
  rowsAdded: number;
  transitionProgress: number;
  endMessage: string;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  playAreaLeft: number;
  playAreaRight: number;
  playAreaTop: number;
  playAreaBottom: number;
  gridOriginX: number;
  gridOriginY: number;
  bubbleRadius: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  grid: (Bubble | null)[][];
  emitter: Emitter;
  particles: ParticleSystem;
  state: GameState;
  pendingPopBubbles: Bubble[];
  pendingFallBubbles: Bubble[];
  processingMatches: boolean;
  time: number;
  rowsAdded: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.playAreaLeft = 40;
    this.playAreaRight = this.width - 40;
    this.playAreaTop = 80;
    this.playAreaBottom = this.height - 160;
    this.bubbleRadius = Math.min(
      (this.playAreaRight - this.playAreaLeft) / (GRID_COLS * Math.sqrt(3) + 1),
      28
    );
    this.horizontalSpacing = this.bubbleRadius * Math.sqrt(3);
    this.verticalSpacing = this.bubbleRadius * 1.5;
    this.gridOriginX = this.playAreaLeft + this.bubbleRadius + (this.playAreaRight - this.playAreaLeft - (GRID_COLS - 1) * this.horizontalSpacing - this.bubbleRadius * 2) / 2;
    this.gridOriginY = this.playAreaTop + this.bubbleRadius;

    this.grid = [];
    this.pendingPopBubbles = [];
    this.pendingFallBubbles = [];
    this.processingMatches = false;
    this.time = 0;
    this.rowsAdded = 0;

    this.particles = new ParticleSystem();
    this.emitter = new Emitter(
      this.width / 2,
      this.height - 100,
      this.bubbleRadius * 1.1,
      this.width,
      this.height
    );

    this.state = {
      status: 'playing',
      score: 0,
      displayScore: 0,
      scoreAnimStart: 0,
      scoreAnimTarget: 0,
      scoreAnimElapsed: 0,
      scoreAnimDuration: 600,
      bubbleCount: 0,
      cleanupMode: false,
      shakeTime: 0,
      shakeX: 0,
      shakeY: 0,
      rowsAdded: 0,
      transitionProgress: 0,
      endMessage: ''
    };

    this.initGrid();
    this.updateBubbleCount();
  }

  initGrid(): void {
    this.grid = [];
    for (let row = 0; row < GRID_ROWS * 3; row++) {
      this.grid[row] = [];
      const colsInRow = row % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let col = 0; col < colsInRow; col++) {
        if (row < GRID_ROWS) {
          const color = NORMAL_COLORS[Math.floor(Math.random() * NORMAL_COLORS.length)];
          this.grid[row][col] = new Bubble(row, col, color, this.bubbleRadius, this.gridOriginX, this.gridOriginY);
        } else {
          this.grid[row][col] = null;
        }
      }
    }
  }

  private getColsInRow(row: number): number {
    return row % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
  }

  private getBubbleAt(row: number, col: number): Bubble | null | undefined {
    if (row < 0 || row >= this.grid.length) return undefined;
    if (col < 0 || col >= this.getColsInRow(row)) return undefined;
    return this.grid[row][col];
  }

  updateBubbleCount(): void {
    let count = 0;
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.getColsInRow(row); col++) {
        const b = this.grid[row][col];
        if (b && !b.popping && !b.falling) count++;
      }
    }
    this.state.bubbleCount = count;
    this.state.cleanupMode = count > 0 && count < CLEANUP_THRESHOLD;
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (this.state.status !== 'playing') return;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      this.emitter.setKeyLeft(true);
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      this.emitter.setKeyRight(true);
    }
    if (e.code === 'Space') {
      e.preventDefault();
      this.tryShoot();
    }
  }

  handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      this.emitter.setKeyLeft(false);
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      this.emitter.setKeyRight(false);
    }
  }

  handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.width / rect.width);
    const y = (e.clientY - rect.top) * (this.height / rect.height);
    this.emitter.setMousePosition(x, y);
  }

  handleMouseDown(e: MouseEvent): void {
    if (this.state.status === 'playing') {
      this.tryShoot();
    } else if (this.state.status === 'gameover' || this.state.status === 'win') {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.width / rect.width);
      const y = (e.clientY - rect.top) * (this.height / rect.height);
      if (this.isRestartButtonClicked(x, y)) {
        this.restart();
      }
    }
  }

  private isRestartButtonClicked(x: number, y: number): boolean {
    const btnX = this.width / 2 - 100;
    const btnY = this.height / 2 + 80;
    const btnW = 200;
    const btnH = 60;
    return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
  }

  private tryShoot(): void {
    if (this.processingMatches) return;
    const shot = this.emitter.shoot();
    if (shot) {
      // sound-like vibration could be added here
    }
  }

  restart(): void {
    this.state.status = 'transitioning';
    this.state.transitionProgress = 0;
  }

  private hardRestart(): void {
    this.particles.clear();
    this.rowsAdded = 0;
    this.state = {
      status: 'playing',
      score: 0,
      displayScore: 0,
      scoreAnimStart: 0,
      scoreAnimTarget: 0,
      scoreAnimElapsed: 0,
      scoreAnimDuration: 600,
      bubbleCount: 0,
      cleanupMode: false,
      shakeTime: 0,
      shakeX: 0,
      shakeY: 0,
      rowsAdded: 0,
      transitionProgress: 0,
      endMessage: ''
    };
    this.initGrid();
    this.updateBubbleCount();
    this.emitter.prepareNext(false);
    this.pendingPopBubbles = [];
    this.pendingFallBubbles = [];
    this.processingMatches = false;
  }

  private triggerShake(): void {
    this.state.shakeTime = SHAKE_DURATION;
  }

  private addScore(amount: number): void {
    const s = this.state;
    s.scoreAnimStart = s.displayScore;
    s.score += amount;
    s.scoreAnimTarget = s.score;
    s.scoreAnimElapsed = 0;
    const diff = s.scoreAnimTarget - s.scoreAnimStart;
    s.scoreAnimDuration = Math.min(1200, Math.max(300, Math.abs(diff) * 8));
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    if (this.state.status === 'transitioning') {
      this.state.transitionProgress += deltaTime / 500;
      if (this.state.transitionProgress >= 1) {
        this.hardRestart();
      }
      return;
    }

    if (this.state.status !== 'playing') {
      this.particles.update(deltaTime);
      return;
    }

    this.emitter.update(deltaTime, this.playAreaLeft, this.playAreaRight);

    if (this.emitter.shotBubble && this.emitter.shotBubble.active) {
      this.checkShotBubbleCollision();
    }

    this.updatePoppingBubbles(deltaTime);
    this.updateFallingBubbles(deltaTime);
    this.processMatchesIfReady();

    this.particles.update(deltaTime);

    if (this.state.shakeTime > 0) {
      this.state.shakeTime -= deltaTime;
      const intensity = SHAKE_INTENSITY * (this.state.shakeTime / SHAKE_DURATION);
      this.state.shakeX = (Math.random() - 0.5) * intensity * 2;
      this.state.shakeY = (Math.random() - 0.5) * intensity * 2;
    } else {
      this.state.shakeX = 0;
      this.state.shakeY = 0;
    }

    if (this.state.scoreAnimElapsed < this.state.scoreAnimDuration) {
      this.state.scoreAnimElapsed += deltaTime;
      const t = Math.min(1, this.state.scoreAnimElapsed / this.state.scoreAnimDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.state.displayScore = this.state.scoreAnimStart +
        (this.state.scoreAnimTarget - this.state.scoreAnimStart) * eased;
      if (t >= 1) {
        this.state.displayScore = this.state.scoreAnimTarget;
      }
    }

    this.checkGameOver();
  }

  private checkShotBubbleCollision(): void {
    const shot = this.emitter.shotBubble!;
    if (shot.y - shot.radius <= this.playAreaTop) {
      this.stickShotBubble();
      return;
    }

    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.getColsInRow(row); col++) {
        const bubble = this.grid[row][col];
        if (!bubble || bubble.popping || bubble.falling) continue;
        const dist = bubble.distanceTo(shot.x, shot.y);
        if (dist < shot.radius + bubble.radius - 2) {
          this.stickShotBubble();
          return;
        }
      }
    }
  }

  private stickShotBubble(): void {
    const shot = this.emitter.shotBubble!;
    let bestRow = -1;
    let bestCol = -1;
    let bestDist = Infinity;

    for (let row = 0; row < this.grid.length; row++) {
      const colsInRow = this.getColsInRow(row);
      for (let col = 0; col < colsInRow; col++) {
        const existing = this.grid[row][col];
        if (existing && !existing.popping && !existing.falling) continue;
        const tmpBubble = new Bubble(row, col, 'red', this.bubbleRadius, this.gridOriginX, this.gridOriginY);
        const dist = tmpBubble.distanceTo(shot.x, shot.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestRow = row;
          bestCol = col;
        }
      }
    }

    if (bestRow >= 0 && bestCol >= 0) {
      while (bestRow >= this.grid.length || bestCol >= this.getColsInRow(bestRow)) {
        const newRow = this.grid.length;
        this.grid[newRow] = [];
        const cols = this.getColsInRow(newRow);
        for (let c = 0; c < cols; c++) {
          this.grid[newRow][c] = null;
        }
      }

      const newBubble = new Bubble(bestRow, bestCol, shot.color, this.bubbleRadius, this.gridOriginX, this.gridOriginY);
      this.grid[bestRow][bestCol] = newBubble;

      this.emitter.clearShot();
      this.processMatches(newBubble);
    } else {
      this.emitter.clearShot();
      this.emitter.prepareNext(this.state.cleanupMode);
    }
  }

  private processMatches(startBubble: Bubble): void {
    this.processingMatches = true;

    const matched = this.findConnectedMatches(startBubble);
    if (matched.length >= 3) {
      for (const b of matched) {
        b.popping = true;
        b.popProgress = 0;
        this.pendingPopBubbles.push(b);
        this.particles.createExplosion(b.x, b.y, b.color);
      }
      this.addScore(matched.length * SCORE_PER_POP);
      this.triggerShake();
    }
  }

  private findConnectedMatches(start: Bubble): Bubble[] {
    const visited = new Set<string>();
    const matched: Bubble[] = [];
    const stack: Bubble[] = [start];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = `${current.row},${current.col}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (!current.matchesColor(start)) continue;

      matched.push(current);

      for (const neighbor of current.getNeighbors()) {
        const n = this.getBubbleAt(neighbor.row, neighbor.col);
        if (n && !n.popping && !n.falling) {
          const nKey = `${n.row},${n.col}`;
          if (!visited.has(nKey) && n.matchesColor(start)) {
            stack.push(n);
          }
        }
      }
    }

    return matched;
  }

  private updatePoppingBubbles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.pendingPopBubbles.length - 1; i >= 0; i--) {
      const b = this.pendingPopBubbles[i];
      b.popProgress += dt * 3;
      if (b.popProgress >= 1) {
        this.grid[b.row][b.col] = null;
        this.pendingPopBubbles.splice(i, 1);
      }
    }
  }

  private updateFallingBubbles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.pendingFallBubbles.length - 1; i >= 0; i--) {
      const b = this.pendingFallBubbles[i];
      b.fallVy += 800 * dt;
      b.x += b.fallVx;
      b.y += b.fallVy;
      b.fallVx *= 0.99;

      if (b.y - b.radius > this.height + 50) {
        this.pendingFallBubbles.splice(i, 1);
      }
    }
  }

  private processMatchesIfReady(): void {
    if (!this.processingMatches) return;
    if (this.pendingPopBubbles.length > 0) return;

    this.findFallingBubbles();

    if (this.pendingFallBubbles.length === 0) {
      this.afterMatchProcessing();
    }
  }

  private findFallingBubbles(): void {
    const visited = new Set<string>();
    const connectedToTop = new Set<string>();

    for (let col = 0; col < this.getColsInRow(0); col++) {
      const b = this.grid[0][col];
      if (b && !b.popping && !b.falling) {
        this.bfsFromTop(b, visited, connectedToTop);
      }
    }

    const falling: Bubble[] = [];
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.getColsInRow(row); col++) {
        const b = this.grid[row][col];
        if (!b || b.popping || b.falling) continue;
        const key = `${row},${col}`;
        if (!connectedToTop.has(key)) {
          falling.push(b);
        }
      }
    }

    if (falling.length > 0) {
      for (const b of falling) {
        b.falling = true;
        b.fallVy = -1.5;
        b.fallVx = (Math.random() - 0.5) * 3;
        this.pendingFallBubbles.push(b);
        this.grid[b.row][b.col] = null;
        this.particles.createFallDust(b.x, b.y, b.color);
      }
      this.addScore(falling.length * SCORE_PER_FALL);
    }
  }

  private bfsFromTop(start: Bubble, visited: Set<string>, connected: Set<string>): void {
    const queue: Bubble[] = [start];
    const startKey = `${start.row},${start.col}`;
    visited.add(startKey);
    connected.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of current.getNeighbors()) {
        const n = this.getBubbleAt(neighbor.row, neighbor.col);
        if (!n || n.popping || n.falling) continue;
        const key = `${n.row},${n.col}`;
        if (!visited.has(key)) {
          visited.add(key);
          connected.add(key);
          queue.push(n);
        }
      }
    }
  }

  private afterMatchProcessing(): void {
    this.updateBubbleCount();
    this.addGridRowIfNeeded();
    this.processingMatches = false;

    if (this.state.bubbleCount === 0) {
      this.state.status = 'win';
      this.state.endMessage = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    } else {
      this.emitter.prepareNext(this.state.cleanupMode);
    }
  }

  private addGridRowIfNeeded(): void {
    this.rowsAdded++;
    this.state.rowsAdded = this.rowsAdded;

    for (let row = this.grid.length - 1; row >= 0; row--) {
      for (let col = 0; col < this.getColsInRow(row); col++) {
        const b = this.grid[row][col];
        if (b && !b.popping && !b.falling) {
          b.row = row + 1;
          b.col = col;
          b.updatePosition(this.gridOriginX, this.gridOriginY);
          this.grid[row + 1][col] = b;
          this.grid[row][col] = null;
        }
      }
    }

    const newRow = 0;
    const colsInNewRow = this.getColsInRow(newRow);
    for (let col = 0; col < colsInNewRow; col++) {
      const color = NORMAL_COLORS[Math.floor(Math.random() * NORMAL_COLORS.length)];
      this.grid[newRow][col] = new Bubble(newRow, col, color, this.bubbleRadius, this.gridOriginX, this.gridOriginY);
    }

    this.updateBubbleCount();
  }

  private checkGameOver(): void {
    const dangerY = this.emitter.y - this.emitter.radius - this.bubbleRadius;
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.getColsInRow(row); col++) {
        const b = this.grid[row][col];
        if (b && !b.popping && !b.falling && b.y + b.radius >= dangerY) {
          this.state.status = 'gameover';
          this.state.endMessage = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
          return;
        }
      }
    }
  }

  draw(): void {
    const ctx = this.ctx;

    const alpha = this.state.status === 'transitioning'
      ? this.state.transitionProgress < 0.5
        ? 1 - this.state.transitionProgress * 2
        : (this.state.transitionProgress - 0.5) * 2
      : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawBackground(ctx);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.state.shakeX, this.state.shakeY);
    this.drawPlayArea(ctx);
    this.drawBubbles(ctx);
    this.emitter.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawHUD(ctx);
    ctx.restore();

    if (this.state.status === 'gameover' || this.state.status === 'win') {
      this.drawEndScreen(ctx);
    }

    if (this.state.status === 'transitioning') {
      ctx.fillStyle = 'rgba(26, 35, 126, ' + (1 - alpha) + ')';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(0.5, '#283593');
    gradient.addColorStop(1, '#1a237e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const time = this.time / 1000;
    for (let i = 0; i < 40; i++) {
      const x = (i * 137.5) % this.width;
      const baseY = (i * 89.3) % this.height;
      const y = (baseY + time * (10 + (i % 7) * 3)) % this.height;
      const r = 0.8 + (i % 4) * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.1 + (i % 3) * 0.08})`;
      ctx.fill();
    }
  }

  private drawPlayArea(ctx: CanvasRenderingContext2D): void {
    const topGlow = ctx.createLinearGradient(0, this.playAreaTop - 20, 0, this.playAreaTop + 200);
    topGlow.addColorStop(0, 'rgba(159, 168, 218, 0.25)');
    topGlow.addColorStop(0.5, 'rgba(121, 134, 203, 0.1)');
    topGlow.addColorStop(1, 'rgba(121, 134, 203, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(this.playAreaLeft - 20, this.playAreaTop - 40, this.playAreaRight - this.playAreaLeft + 40, 250);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.playAreaLeft, this.playAreaTop, this.playAreaRight - this.playAreaLeft, this.playAreaBottom - this.playAreaTop);

    const topBarGradient = ctx.createLinearGradient(0, this.playAreaTop - 10, 0, this.playAreaTop + 10);
    topBarGradient.addColorStop(0, 'rgba(255, 213, 79, 0.4)');
    topBarGradient.addColorStop(0.5, 'rgba(255, 167, 38, 0.6)');
    topBarGradient.addColorStop(1, 'rgba(255, 213, 79, 0.4)');
    ctx.fillStyle = topBarGradient;
    ctx.fillRect(this.playAreaLeft - 5, this.playAreaTop - 8, this.playAreaRight - this.playAreaLeft + 10, 16);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    const dangerY = this.emitter.y - this.emitter.radius - this.bubbleRadius;
    ctx.moveTo(this.playAreaLeft, dangerY);
    ctx.lineTo(this.playAreaRight, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawBubbles(ctx: CanvasRenderingContext2D): void {
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.getColsInRow(row); col++) {
        const b = this.grid[row][col];
        if (b) b.draw(ctx);
      }
    }
    for (const b of this.pendingFallBubbles) {
      b.draw(ctx);
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    const hudY = this.height - 45;
    const leftX = 60;
    const centerX = this.width / 2;
    const rightX = this.width - 60;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, leftX - 20, hudY - 28, this.width - 80, 50, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('分数', leftX, hudY - 15);
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(Math.floor(this.state.displayScore).toString(), leftX, hudY + 8);

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('剩余泡泡', centerX, hudY - 15);
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    const countColor = this.state.cleanupMode ? '#69f0ae' : '#80d8ff';
    ctx.fillStyle = countColor;
    ctx.fillText(this.state.bubbleCount.toString(), centerX, hudY + 8);

    if (this.state.cleanupMode) {
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e040fb';
      ctx.fillText('★ 清理模式 ★', centerX, hudY + 28);
    }

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('下一轮下压', rightX, hudY - 15);
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff8a80';
    ctx.fillText(this.state.rowsAdded.toString(), rightX, hudY + 8);
  }

  private drawEndScreen(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    const panelX = this.width / 2 - 200;
    const panelY = this.height / 2 - 180;
    const panelW = 400;
    const panelH = 360;

    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, '#3949ab');
    panelGradient.addColorStop(1, '#1a237e');
    ctx.fillStyle = panelGradient;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 20);
    ctx.fill();
    ctx.stroke();

    const isWin = this.state.status === 'win';
    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWin ? '#69f0ae' : '#ff5252';
    ctx.shadowBlur = 20;
    ctx.shadowColor = isWin ? '#69f0ae' : '#ff5252';
    ctx.fillText(isWin ? '🎉 胜利啦！' : '💥 游戏结束', this.width / 2, panelY + 60);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('最终得分', this.width / 2, panelY + 110);
    ctx.font = 'bold 52px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffd54f';
    ctx.fillText(Math.floor(this.state.displayScore).toString(), this.width / 2, panelY + 155);
    ctx.shadowBlur = 0;

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.wrapText(ctx, this.state.endMessage, this.width / 2, panelY + 215, 340, 24);

    const btnX = this.width / 2 - 100;
    const btnY = panelY + 270;
    const btnW = 200;
    const btnH = 60;

    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGradient.addColorStop(0, '#66bb6a');
    btnGradient.addColorStop(1, '#2e7d32');
    ctx.fillStyle = btnGradient;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🔄 重新开始', this.width / 2, btnY + btnH / 2);

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split('');
    let line = '';
    let lines: string[] = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
  }
}
