import { ParticleSystem } from './ParticleSystem';
import { AudioManager } from './AudioManager';

const WARM_COLORS = ['#FF6B6B', '#FFB347', '#FFD93D'];
const COLD_COLORS = ['#6BCB77', '#4D96FF', '#9B59B6'];
const ALL_COLORS = [...WARM_COLORS, ...COLD_COLORS];

export interface PuzzlePiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  angularVelocity: number;
  floatOffset: number;
  floatSpeed: number;
  floatPhase: number;
  isDragging: boolean;
  isPlaced: boolean;
  slotId: number | null;
  alpha: number;
  resonanceProgress: number;
  errorFlash: number;
  falling: boolean;
}

export interface Slot {
  id: number;
  angle: number;
  distance: number;
  color: string;
  pieceId: number | null;
  scalePulse: number;
}

export interface GameState {
  score: number;
  level: number;
  timeLeft: number;
  placedCount: number;
  totalSlots: number;
  isPaused: boolean;
  isGameOver: boolean;
  showFullscreenFlash: boolean;
  flashProgress: number;
}

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onLevelUp: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private audio: AudioManager;
  private callbacks: GameEngineCallbacks;

  private pieces: PuzzlePiece[] = [];
  private slots: Slot[] = [];
  private state: GameState;

  private width: number = 0;
  private height: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;
  private scale: number = 1;

  private riftRotation: number = 0;
  private riftAngularVelocity: number = 0.02;
  private lastTrailTime: number = 0;

  private piecesPlacedInLevel: number = 0;
  private newPieceTimer: number = 0;
  private nextPieceId: number = 0;
  private nextSlotId: number = 0;
  private dropInterval: number = 3;
  private dropSpeed: number = 50;
  private floatAmplitude: number = 5;

  constructor(
    canvas: HTMLCanvasElement,
    particleSystem: ParticleSystem,
    audioManager: AudioManager,
    callbacks: GameEngineCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particles = particleSystem;
    this.audio = audioManager;
    this.callbacks = callbacks;
    this.state = {
      score: 0,
      level: 1,
      timeLeft: 60,
      placedCount: 0,
      totalSlots: 6,
      isPaused: false,
      isGameOver: false,
      showFullscreenFlash: false,
      flashProgress: 0
    };
    this.resize();
    this.initLevel();
    this.emitState();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.scale = this.width < 1200 ? 0.8 : 1;
  }

  private initLevel(): void {
    this.pieces = [];
    this.slots = [];
    this.piecesPlacedInLevel = 0;
    this.nextPieceId = 0;
    this.nextSlotId = 0;
    this.particles.clear();

    this.floatAmplitude = this.state.level === 1 ? 5 : 8;
    this.riftAngularVelocity = this.state.level === 1 ? 0.02 : 0.03;
    this.dropInterval = this.state.level === 1 ? 3 : 3;

    const initialCount = 6;
    const shuffled = [...ALL_COLORS].sort(() => Math.random() - 0.5).slice(0, initialCount);

    for (let i = 0; i < initialCount; i++) {
      const angle = (i / initialCount) * Math.PI * 2;
      const dist = 150 * this.scale;
      const color = shuffled[i];
      this.slots.push({
        id: this.nextSlotId++,
        angle,
        distance: dist,
        color,
        pieceId: null,
        scalePulse: 0
      });
    }

    for (let i = 0; i < initialCount; i++) {
      this.spawnEdgePiece(shuffled[i]);
    }

    this.state.totalSlots = this.slots.length;
    this.state.placedCount = 0;
  }

  private spawnEdgePiece(color: string): void {
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const margin = 80;
    switch (edge) {
      case 0: x = margin + Math.random() * (this.width - margin * 2); y = margin; break;
      case 1: x = this.width - margin; y = margin + Math.random() * (this.height - margin * 2); break;
      case 2: x = margin + Math.random() * (this.width - margin * 2); y = this.height - margin; break;
      default: x = margin; y = margin + Math.random() * (this.height - margin * 2);
    }
    this.pieces.push({
      id: this.nextPieceId++,
      x, y,
      vx: 0, vy: 0,
      color,
      size: (45 + Math.random() * 15) * this.scale,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.8,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: (2 + Math.random()) * Math.PI / 2,
      floatPhase: Math.random() * Math.PI * 2,
      isDragging: false,
      isPlaced: false,
      slotId: null,
      alpha: 0.85,
      resonanceProgress: 0,
      errorFlash: 0,
      falling: false
    });
  }

  private spawnFallingPiece(color: string): void {
    const x = 100 + Math.random() * (this.width - 200);
    this.pieces.push({
      id: this.nextPieceId++,
      x, y: -60,
      vx: (Math.random() - 0.5) * this.dropSpeed,
      vy: 60,
      color,
      size: (45 + Math.random() * 15) * this.scale,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 1.2,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: (2 + Math.random()) * Math.PI / 2,
      floatPhase: Math.random() * Math.PI * 2,
      isDragging: false,
      isPlaced: false,
      slotId: null,
      alpha: 0.85,
      resonanceProgress: 0,
      errorFlash: 0,
      falling: true
    });
  }

  private addSlots(count: number): void {
    const totalSlots = this.slots.length + count;
    const baseDist = 150 * this.scale;
    const outerDist = 230 * this.scale;
    for (let i = 0; i < count; i++) {
      const angle = (this.slots.length / totalSlots) * Math.PI * 2 + Math.random() * 0.3;
      const dist = this.slots.length % 2 === 0 ? baseDist : outerDist;
      const color = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
      this.slots.push({
        id: this.nextSlotId++,
        angle,
        distance: dist,
        color,
        pieceId: null,
        scalePulse: 0
      });
      this.spawnFallingPiece(color);
    }
    this.state.totalSlots = this.slots.length;
  }

  handlePointerDown(x: number, y: number): boolean {
    if (this.state.isPaused || this.state.isGameOver) return false;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (p.isPlaced) continue;
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy <= (p.size * 1.2) * (p.size * 1.2)) {
        p.isDragging = true;
        p.vx = 0; p.vy = 0;
        p.falling = false;
        this.pieces.splice(i, 1);
        this.pieces.push(p);
        return true;
      }
    }
    return false;
  }

  handlePointerMove(x: number, y: number): void {
    const dragging = this.pieces.find(p => p.isDragging);
    if (!dragging) return;
    const prevX = dragging.x, prevY = dragging.y;
    dragging.x = x;
    dragging.y = y;
    dragging.vx = x - prevX;
    dragging.vy = y - prevY;
    const now = performance.now();
    if (now - this.lastTrailTime > 30) {
      this.particles.addTrail(dragging.x, dragging.y, dragging.color);
      this.lastTrailTime = now;
    }
  }

  handlePointerUp(): void {
    const dragging = this.pieces.find(p => p.isDragging);
    if (!dragging) return;
    dragging.isDragging = false;
    this.checkMatch(dragging);
  }

  private checkMatch(piece: PuzzlePiece): void {
    let bestSlot: Slot | null = null;
    let bestDist = Infinity;
    for (const slot of this.slots) {
      if (slot.pieceId !== null) continue;
      const sx = this.centerX + Math.cos(slot.angle + this.riftRotation) * slot.distance;
      const sy = this.centerY + Math.sin(slot.angle + this.riftRotation) * slot.distance;
      const dx = piece.x - sx, dy = piece.y - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; bestSlot = slot; }
    }

    if (bestSlot && bestSlot.color === piece.color && bestDist < 30 * this.scale) {
      const slot = bestSlot;
      piece.isPlaced = true;
      piece.slotId = slot.id;
      slot.pieceId = piece.id;
      piece.resonanceProgress = 0.5;
      slot.scalePulse = 1;
      const sx = this.centerX + Math.cos(slot.angle + this.riftRotation) * slot.distance;
      const sy = this.centerY + Math.sin(slot.angle + this.riftRotation) * slot.distance;
      this.particles.addWave(sx, sy, piece.color);
      this.audio.playSuccess();

      this.piecesPlacedInLevel++;
      this.state.placedCount++;
      this.state.score += 10;

      if (this.piecesPlacedInLevel > 0 && this.piecesPlacedInLevel % 3 === 0) {
        this.addSlots(2);
        for (const s of this.slots) {
          if (s.pieceId !== null) {
            const ex = this.centerX + Math.cos(s.angle + this.riftRotation) * s.distance;
            const ey = this.centerY + Math.sin(s.angle + this.riftRotation) * s.distance;
            this.particles.addBurst(ex, ey, 12);
          }
        }
      }

      const completionRate = this.state.placedCount / this.state.totalSlots;
      if (completionRate >= 0.8) {
        this.triggerLevelUp();
      }
      this.emitState();
    } else {
      const speed = Math.sqrt(piece.vx * piece.vx + piece.vy * piece.vy);
      const angle = Math.atan2(piece.vy, piece.vx) + (Math.random() - 0.5) * 0.5;
      const pushSpeed = Math.max(speed * 2, 150);
      piece.vx = Math.cos(angle) * pushSpeed;
      piece.vy = Math.sin(angle) * pushSpeed;
      piece.errorFlash = 0.2;
      piece.alpha = 0.5;
      setTimeout(() => { piece.alpha = 0.85; }, 300);
      this.audio.playFail();
    }
  }

  private triggerLevelUp(): void {
    this.state.showFullscreenFlash = true;
    this.state.flashProgress = 1;
    this.state.level++;
    this.state.timeLeft += 30;
    this.callbacks.onLevelUp(this.state.level);
    setTimeout(() => { this.initLevel(); this.emitState(); }, 500);
  }

  private emitState(): void {
    this.callbacks.onStateChange({ ...this.state });
  }

  togglePause(): void {
    if (this.state.isGameOver) return;
    this.state.isPaused = !this.state.isPaused;
    this.emitState();
  }

  reset(): void {
    this.state = {
      score: 0, level: 1, timeLeft: 60,
      placedCount: 0, totalSlots: 6,
      isPaused: false, isGameOver: false,
      showFullscreenFlash: false, flashProgress: 0
    };
    this.riftRotation = 0;
    this.newPieceTimer = 0;
    this.initLevel();
    this.emitState();
  }

  update(dt: number, time: number): void {
    if (this.state.isPaused || this.state.isGameOver) {
      this.particles.update(dt);
      return;
    }

    this.state.timeLeft -= dt;
    if (this.state.timeLeft <= 0) {
      this.state.timeLeft = 0;
      this.state.isGameOver = true;
      const finalScore = this.state.score + Math.floor(this.state.timeLeft);
      this.callbacks.onGameOver(finalScore);
      this.emitState();
      return;
    }

    this.riftRotation += this.riftAngularVelocity * dt * 60;

    if (this.state.level > 1) {
      this.newPieceTimer += dt;
      if (this.newPieceTimer >= this.dropInterval) {
        this.newPieceTimer = 0;
        const unusedColors = ALL_COLORS.filter(c =>
          this.slots.some(s => s.pieceId === null && s.color === c)
        );
        if (unusedColors.length > 0 && this.pieces.filter(p => !p.isPlaced).length < 12) {
          this.spawnFallingPiece(unusedColors[Math.floor(Math.random() * unusedColors.length)]);
        }
      }
    }

    for (const piece of this.pieces) {
      if (piece.isPlaced) {
        if (piece.slotId !== null) {
          const slot = this.slots.find(s => s.id === piece.slotId)!;
          piece.x = this.centerX + Math.cos(slot.angle + this.riftRotation) * slot.distance;
          piece.y = this.centerY + Math.sin(slot.angle + this.riftRotation) * slot.distance;
          piece.rotation += this.riftAngularVelocity * dt * 60;
          if (piece.resonanceProgress > 0) {
            piece.resonanceProgress = Math.max(0, piece.resonanceProgress - dt * 2);
          }
        }
        continue;
      }
      if (piece.isDragging) continue;

      const floatY = Math.sin(time * piece.floatSpeed + piece.floatPhase) * this.floatAmplitude;
      if (!piece.falling) {
        piece.y += floatY * dt;
      }

      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.rotation += piece.angularVelocity * dt;

      if (!piece.falling) {
        piece.vx *= 0.94;
        piece.vy *= 0.94;
      } else {
        if (piece.y > this.height * 0.7) {
          piece.vy *= 0.95;
          if (piece.y > this.height - 80) piece.falling = false;
        }
      }

      piece.x = Math.max(40, Math.min(this.width - 40, piece.x));
      piece.y = Math.max(40, Math.min(this.height - 40, piece.y));

      if (piece.errorFlash > 0) piece.errorFlash = Math.max(0, piece.errorFlash - dt);
    }

    for (const slot of this.slots) {
      if (slot.scalePulse > 0) slot.scalePulse = Math.max(0, slot.scalePulse - dt * 3);
    }

    if (this.state.showFullscreenFlash) {
      this.state.flashProgress = Math.max(0, this.state.flashProgress - dt);
      if (this.state.flashProgress <= 0) {
        this.state.showFullscreenFlash = false;
      }
    }

    this.particles.update(dt);
    this.emitState();
  }

  render(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawRift(time);
    this.drawSlots(time);

    const sortedPieces = [...this.pieces].sort((a, b) => {
      if (a.isPlaced && !b.isPlaced) return -1;
      if (!a.isPlaced && b.isPlaced) return 1;
      return a.id - b.id;
    });

    for (const piece of sortedPieces) {
      this.drawPiece(piece, time);
    }

    this.particles.render(ctx);

    if (this.state.showFullscreenFlash) {
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.globalAlpha = this.state.flashProgress * 0.3;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    if (this.state.isPaused) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'white';
      ctx.fillText('暂停', this.centerX, this.centerY - 20);
      ctx.font = '20px sans-serif';
      ctx.shadowBlur = 8;
      ctx.fillText('按 ESC 继续', this.centerX, this.centerY + 30);
      ctx.restore();
    }
  }

  private drawRift(_time: number): void {
    const ctx = this.ctx;
    const cx = this.centerX, cy = this.centerY;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.riftRotation * 0.2);
    ctx.strokeStyle = '#00FFCC';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00FFCC';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    const r = 80 * this.scale;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = r + Math.sin(i * 2.3) * 20 * this.scale;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#00FFCC';
    ctx.fill();
    ctx.restore();
  }

  private drawSlots(_time: number): void {
    const ctx = this.ctx;
    for (const slot of this.slots) {
      const a = slot.angle + this.riftRotation;
      const x = this.centerX + Math.cos(a) * slot.distance;
      const y = this.centerY + Math.sin(a) * slot.distance;
      const pulse = 1 + slot.scalePulse * 0.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const size = 45 * this.scale * pulse;
      ctx.strokeStyle = slot.pieceId !== null ? slot.color : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = slot.pieceId !== null ? 15 : 5;
      ctx.shadowColor = slot.color;
      this.drawHexagon(ctx, size, false);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      this.drawHexagon(ctx, size * 0.95, true);
      ctx.restore();
    }
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, size: number, fill: boolean): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * size;
      const y = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) ctx.fill(); else ctx.stroke();
  }

  private drawPiece(piece: PuzzlePiece, time: number): void {
    const ctx = this.ctx;
    const floatY = piece.isDragging || piece.isPlaced ? 0 :
      Math.sin(time * piece.floatSpeed + piece.floatPhase) * 2;

    ctx.save();
    ctx.translate(piece.x, piece.y + floatY);
    ctx.rotate(piece.rotation);
    const size = piece.size * (1 + piece.resonanceProgress * 0.15);

    ctx.save();
    ctx.globalAlpha = 0.2 * piece.alpha;
    ctx.translate(0, 5 * this.scale);
    ctx.scale(1, -0.7);
    ctx.shadowBlur = 10;
    ctx.shadowColor = piece.color;
    this.renderHexagonPiece(ctx, size, piece, true);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.3 * piece.alpha;
    ctx.strokeStyle = piece.color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 25;
    ctx.shadowColor = piece.color;
    this.drawHexagon(ctx, size + 4, false);
    ctx.restore();

    this.renderHexagonPiece(ctx, size, piece, false);

    if (piece.errorFlash > 0) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'red';
      ctx.globalAlpha = piece.errorFlash / 0.2;
      this.drawHexagon(ctx, size + 2, false);
    }

    ctx.restore();
  }

  private renderHexagonPiece(ctx: CanvasRenderingContext2D, size: number, piece: PuzzlePiece, reflection: boolean): void {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * size;
      const y = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (reflection) {
      ctx.fillStyle = piece.color;
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      grad.addColorStop(0, this.hexToRgba(piece.color, 0.95 * piece.alpha));
      grad.addColorStop(1, this.hexToRgba(piece.color, 0.6 * piece.alpha));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = piece.color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = piece.color;
      ctx.stroke();
      ctx.globalAlpha = 0.4 * piece.alpha;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.2);
      ctx.lineTo(-size * 0.2, -size * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  getState(): GameState {
    return { ...this.state };
  }
}
