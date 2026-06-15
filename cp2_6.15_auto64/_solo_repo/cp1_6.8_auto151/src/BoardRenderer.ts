import { BOARD_SIZE, Piece, Player, GravityEvent, DestroyEvent } from './GameEngine';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  angle: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface AnimatingPiece {
  pieceId: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  progress: number;
  duration: number;
  scale: number;
  targetScale: number;
}

interface PlacingAnimation {
  pieceId: number;
  row: number;
  col: number;
  progress: number;
  duration: number;
}

export class BoardRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private starParticles: StarParticle[] = [];
  private trailParticles: TrailParticle[] = [];
  private explosionParticles: ExplosionParticle[] = [];
  private animatingPieces: Map<number, AnimatingPiece> = new Map();
  private placingAnimations: Map<number, PlacingAnimation> = new Map();
  private turnFlashAlpha: number = 0;
  private turnFlashColor: string = '';

  private piecePositions: Map<number, { x: number; y: number }> = new Map();

  private onPieceClick: ((row: number, col: number) => void) | null = null;
  private hoveredCell: { row: number; col: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.initStarParticles();
    this.bindEvents();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    const boardPixels = Math.min(this.width, this.height) * 0.7;
    this.cellSize = boardPixels / BOARD_SIZE;
    this.offsetX = (this.width - boardPixels) / 2;
    this.offsetY = (this.height - boardPixels) / 2;
  }

  private initStarParticles() {
    this.starParticles = [];
    for (let i = 0; i < 120; i++) {
      this.starParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.15 + 0.05,
        angle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2 + 1,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  setOnPieceClick(cb: (row: number, col: number) => void) {
    this.onPieceClick = cb;
  }

  private bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const col = Math.floor((mx - this.offsetX) / this.cellSize);
      const row = Math.floor((my - this.offsetY) / this.cellSize);
      if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        this.hoveredCell = { row, col };
      } else {
        this.hoveredCell = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredCell = null;
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.onPieceClick) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const col = Math.floor((mx - this.offsetX) / this.cellSize);
      const row = Math.floor((my - this.offsetY) / this.cellSize);
      if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        this.onPieceClick(row, col);
      }
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.initStarParticles();
    });
  }

  triggerTurnFlash(player: Player) {
    this.turnFlashAlpha = 0.4;
    this.turnFlashColor = player === 'blue' ? 'rgba(100,140,255,' : 'rgba(255,140,60,';
  }

  addGravityAnimations(events: GravityEvent[]) {
    for (const ev of events) {
      this.animatingPieces.set(ev.pieceId, {
        pieceId: ev.pieceId,
        fromRow: ev.fromRow,
        fromCol: ev.fromCol,
        toRow: ev.toRow,
        toCol: ev.toCol,
        progress: 0,
        duration: 0.5,
        scale: ev.isAttract ? 1.2 : 0.85,
        targetScale: 1,
      });

      const fromX = this.offsetX + ev.fromCol * this.cellSize + this.cellSize / 2;
      const fromY = this.offsetY + ev.fromRow * this.cellSize + this.cellSize / 2;
      const toX = this.offsetX + ev.toCol * this.cellSize + this.cellSize / 2;
      const toY = this.offsetY + ev.toRow * this.cellSize + this.cellSize / 2;

      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        this.trailParticles.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 0.8,
          maxLife: 0.8,
          size: Math.random() * 3 + 1,
          color: ev.isAttract ? '#ff9944' : '#88aaff',
        });
      }
    }
  }

  addExplosion(row: number, col: number, player: Player) {
    const cx = this.offsetX + col * this.cellSize + this.cellSize / 2;
    const cy = this.offsetY + row * this.cellSize + this.cellSize / 2;
    const baseColor = player === 'blue' ? [100, 140, 255] : [255, 140, 60];

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.explosionParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * 4 + 2,
        color: `rgb(${baseColor[0] + Math.random() * 60},${baseColor[1] + Math.random() * 60},${baseColor[2] + Math.random() * 60})`,
      });
    }
  }

  addPlaceAnimation(pieceId: number, row: number, col: number) {
    this.placingAnimations.set(pieceId, {
      pieceId,
      row,
      col,
      progress: 0,
      duration: 0.3,
    });
  }

  getHoveredCell(): { row: number; col: number } | null {
    return this.hoveredCell;
  }

  render(pieces: Piece[], dt: number, selectedPieceId: number | null) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(dt);
    this.drawNebula();
    this.drawStarParticles(dt);
    this.drawGrid();
    this.drawHoverHighlight();

    for (const piece of pieces) {
      const anim = this.animatingPieces.get(piece.id);
      if (anim && anim.progress < 1) {
        continue;
      }
      this.drawPiece(piece, 1, selectedPieceId === piece.id);
    }

    this.drawAnimatingPieces(pieces, dt, selectedPieceId);
    this.drawTrailParticles(dt);
    this.drawExplosionParticles(dt);
    this.drawTurnFlash(dt);
    this.drawPlacingAnimations(pieces, dt, selectedPieceId);
  }

  private drawBackground(dt: number) {
    const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, '#080818');
    grad.addColorStop(0.5, '#0d0d2b');
    grad.addColorStop(1, '#15082a');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawNebula() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = Math.min(this.width, this.height) * 0.45;

    const nebula1 = this.ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.2, 0, cx, cy, r);
    nebula1.addColorStop(0, 'rgba(60, 20, 120, 0.12)');
    nebula1.addColorStop(0.5, 'rgba(30, 10, 80, 0.06)');
    nebula1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = nebula1;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const nebula2 = this.ctx.createRadialGradient(cx + r * 0.4, cy + r * 0.3, 0, cx, cy, r);
    nebula2.addColorStop(0, 'rgba(20, 40, 120, 0.10)');
    nebula2.addColorStop(0.5, 'rgba(10, 20, 60, 0.05)');
    nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = nebula2;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStarParticles(dt: number) {
    const time = performance.now() / 1000;
    for (const star of this.starParticles) {
      star.x += Math.cos(star.angle) * star.speed;
      star.y += Math.sin(star.angle) * star.speed;

      if (star.x < 0) star.x = this.width;
      if (star.x > this.width) star.x = 0;
      if (star.y < 0) star.y = this.height;
      if (star.y > this.height) star.y = 0;

      const twinkle = (Math.sin(time * star.twinkleSpeed + star.twinklePhase) + 1) / 2;
      const alpha = star.alpha * (0.5 + twinkle * 0.5);

      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
      this.ctx.fill();
    }
  }

  private drawGrid() {
    this.ctx.strokeStyle = 'rgba(80, 140, 255, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.shadowColor = 'rgba(80, 140, 255, 0.4)';
    this.ctx.shadowBlur = 6;

    for (let i = 0; i <= BOARD_SIZE; i++) {
      const x = this.offsetX + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.offsetY);
      this.ctx.lineTo(x, this.offsetY + BOARD_SIZE * this.cellSize);
      this.ctx.stroke();

      const y = this.offsetY + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, y);
      this.ctx.lineTo(this.offsetX + BOARD_SIZE * this.cellSize, y);
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;

    const boardW = BOARD_SIZE * this.cellSize;
    const boardH = BOARD_SIZE * this.cellSize;

    this.ctx.strokeStyle = 'rgba(80, 140, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = 'rgba(80, 140, 255, 0.6)';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeRect(this.offsetX, this.offsetY, boardW, boardH);
    this.ctx.shadowBlur = 0;
  }

  private drawHoverHighlight() {
    if (!this.hoveredCell) return;
    const { row, col } = this.hoveredCell;
    const x = this.offsetX + col * this.cellSize;
    const y = this.offsetY + row * this.cellSize;

    this.ctx.fillStyle = 'rgba(80, 140, 255, 0.08)';
    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

    this.ctx.strokeStyle = 'rgba(80, 140, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
  }

  private drawPiece(piece: Piece, scale: number, isSelected: boolean) {
    const cx = this.offsetX + piece.col * this.cellSize + this.cellSize / 2;
    const cy = this.offsetY + piece.row * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.32 * scale;

    this.piecePositions.set(piece.id, { x: cx, y: cy });

    this.ctx.save();

    const isBlue = piece.player === 'blue';
    const baseR = isBlue ? 80 : 255;
    const baseG = isBlue ? 120 : 120;
    const baseB = isBlue ? 255 : 50;

    const glowGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.5);
    glowGrad.addColorStop(0, `rgba(${baseR}, ${baseG}, ${baseB}, 0.25)`);
    glowGrad.addColorStop(1, `rgba(${baseR}, ${baseG}, ${baseB}, 0)`);
    this.ctx.fillStyle = glowGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    const bodyGrad = this.ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
    bodyGrad.addColorStop(0, `rgba(${Math.min(255, baseR + 80)}, ${Math.min(255, baseG + 60)}, ${Math.min(255, baseB + 40)}, 0.95)`);
    bodyGrad.addColorStop(0.7, `rgba(${baseR}, ${baseG}, ${baseB}, 0.9)`);
    bodyGrad.addColorStop(1, `rgba(${Math.floor(baseR * 0.6)}, ${Math.floor(baseG * 0.6)}, ${Math.floor(baseB * 0.6)}, 0.85)`);

    this.ctx.fillStyle = bodyGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();

    if (isSelected) {
      this.ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = `rgba(${baseR}, ${baseG}, ${baseB}, 0.8)`;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    this.drawGravityRings(cx, cy, radius, piece.gravity);
    this.drawHpDots(cx, cy, radius, piece.hp, piece.maxHp);

    this.ctx.restore();
  }

  private drawGravityRings(cx: number, cy: number, radius: number, gravity: number) {
    this.ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < gravity; i++) {
      const ringR = radius + 5 + i * 4;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawHpDots(cx: number, cy: number, radius: number, hp: number, maxHp: number) {
    const dotRadius = 2.5;
    const totalW = maxHp * (dotRadius * 2 + 3) - 3;
    const startX = cx - totalW / 2 + dotRadius;
    const dotY = cy + radius + 10;

    for (let i = 0; i < maxHp; i++) {
      const dotX = startX + i * (dotRadius * 2 + 3);
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      if (i < hp) {
        this.ctx.fillStyle = 'rgba(100, 255, 150, 0.9)';
      } else {
        this.ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      }
      this.ctx.fill();
    }
  }

  private drawAnimatingPieces(pieces: Piece[], dt: number, selectedPieceId: number | null) {
    const toRemove: number[] = [];

    this.animatingPieces.forEach((anim) => {
      anim.progress += dt / anim.duration;
      if (anim.progress >= 1) {
        anim.progress = 1;
        toRemove.push(anim.pieceId);
      }

      const t = this.easeInOutCubic(anim.progress);

      const fromX = this.offsetX + anim.fromCol * this.cellSize + this.cellSize / 2;
      const fromY = this.offsetY + anim.fromRow * this.cellSize + this.cellSize / 2;
      const toX = this.offsetX + anim.toCol * this.cellSize + this.cellSize / 2;
      const toY = this.offsetY + anim.toRow * this.cellSize + this.cellSize / 2;

      const cx = fromX + (toX - fromX) * t;
      const cy = fromY + (toY - fromY) * t;

      const scaleT = anim.progress < 0.5
        ? anim.scale + (1 - anim.scale) * (anim.progress * 2)
        : 1;

      const piece = pieces.find(p => p.id === anim.pieceId);
      if (!piece) {
        const fakePiece: Piece = {
          id: anim.pieceId,
          player: 'blue',
          row: anim.toRow,
          col: anim.toCol,
          gravity: 1,
          hp: 1,
          maxHp: 1,
        };

        this.ctx.save();
        this.ctx.globalAlpha = 1 - anim.progress;
        const isBlue = true;
        const radius = this.cellSize * 0.32 * scaleT;
        const glowGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
        glowGrad.addColorStop(0, 'rgba(80, 120, 255, 0.2)');
        glowGrad.addColorStop(1, 'rgba(80, 120, 255, 0)');
        this.ctx.fillStyle = glowGrad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        this.ctx.restore();
        return;
      }

      this.ctx.save();
      const isBlue = piece.player === 'blue';
      const baseR = isBlue ? 80 : 255;
      const baseG = isBlue ? 120 : 120;
      const baseB = isBlue ? 255 : 50;
      const radius = this.cellSize * 0.32 * scaleT;

      const glowGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.5);
      glowGrad.addColorStop(0, `rgba(${baseR}, ${baseG}, ${baseB}, 0.25)`);
      glowGrad.addColorStop(1, `rgba(${baseR}, ${baseG}, ${baseB}, 0)`);
      this.ctx.fillStyle = glowGrad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      const bodyGrad = this.ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
      bodyGrad.addColorStop(0, `rgba(${Math.min(255, baseR + 80)}, ${Math.min(255, baseG + 60)}, ${Math.min(255, baseB + 40)}, 0.95)`);
      bodyGrad.addColorStop(0.7, `rgba(${baseR}, ${baseG}, ${baseB}, 0.9)`);
      bodyGrad.addColorStop(1, `rgba(${Math.floor(baseR * 0.6)}, ${Math.floor(baseG * 0.6)}, ${Math.floor(baseB * 0.6)}, 0.85)`);
      this.ctx.fillStyle = bodyGrad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (selectedPieceId === piece.id) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = `rgba(${baseR}, ${baseG}, ${baseB}, 0.8)`;
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
      }

      this.drawGravityRings(cx, cy, radius, piece.gravity);
      this.drawHpDots(cx, cy, radius, piece.hp, piece.maxHp);

      this.ctx.restore();
    });

    for (const id of toRemove) {
      this.animatingPieces.delete(id);
    }
  }

  private drawPlacingAnimations(pieces: Piece[], dt: number, selectedPieceId: number | null) {
    const toRemove: number[] = [];

    this.placingAnimations.forEach((anim) => {
      anim.progress += dt / anim.duration;
      if (anim.progress >= 1) {
        toRemove.push(anim.pieceId);
        return;
      }

      const t = this.easeOutBack(anim.progress);
      const piece = pieces.find(p => p.id === anim.pieceId);
      if (piece) {
        this.drawPiece(piece, t, selectedPieceId === piece.id);
      }
    });

    for (const id of toRemove) {
      this.placingAnimations.delete(id);
    }
  }

  private drawTrailParticles(dt: number) {
    const toRemove: number[] = [];

    for (let i = 0; i < this.trailParticles.length; i++) {
      const p = this.trailParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        toRemove.push(i);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;

      const alpha = p.life / p.maxLife;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha * 0.7;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.trailParticles.splice(toRemove[i], 1);
    }
  }

  private drawExplosionParticles(dt: number) {
    const toRemove: number[] = [];

    for (let i = 0; i < this.explosionParticles.length; i++) {
      const p = this.explosionParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        toRemove.push(i);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;

      const alpha = p.life / p.maxLife;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.explosionParticles.splice(toRemove[i], 1);
    }
  }

  private drawTurnFlash(dt: number) {
    if (this.turnFlashAlpha <= 0) return;

    this.ctx.fillStyle = this.turnFlashColor + this.turnFlashAlpha + ')';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.turnFlashAlpha -= dt * 0.8;
    if (this.turnFlashAlpha < 0) this.turnFlashAlpha = 0;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', () => {});
    this.canvas.removeEventListener('click', () => {});
  }
}
