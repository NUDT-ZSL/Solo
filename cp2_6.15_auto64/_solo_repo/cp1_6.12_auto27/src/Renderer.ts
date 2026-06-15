import {
  SymbolType,
  SYMBOL_COLORS,
  GRID_SIZE,
  MAX_ACTIVE_PARTICLES,
  GamePiece,
  Particle,
  FloatingText,
  GameState
} from './types';

interface PushSweepEffect {
  active: boolean;
  direction: 'left' | 'bottom';
  timer: number;
  duration: number;
}

interface MergeNotification {
  active: boolean;
  text: string;
  timer: number;
  duration: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private logicalSize: number = 600;
  private cellSize: number = 0;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private pieceSize: number = 0;
  private uiScale: number = 1;

  private particlePool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private mergeNotification: MergeNotification = { active: false, text: '', timer: 0, duration: 1.5 };
  private pushSweep: PushSweepEffect = { active: false, direction: 'left', timer: 0, duration: 0.5 };
  private rotationAngle: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < MAX_ACTIVE_PARTICLES; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        color: '#fff', size: 5,
        life: 0, maxLife: 1,
        active: false
      });
    }
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85);
    this.logicalSize = Math.min(maxSize, 600);
    this.uiScale = this.logicalSize / 600;

    const displaySize = this.logicalSize;
    this.canvas.style.width = displaySize + 'px';
    this.canvas.style.height = displaySize + 'px';
    this.canvas.width = displaySize * this.dpr;
    this.canvas.height = displaySize * this.dpr;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const topPadding = 80 * this.uiScale;
    const bottomPadding = 90 * this.uiScale;
    const sidePadding = 40 * this.uiScale;

    const availableWidth = this.logicalSize - sidePadding * 2;
    const availableHeight = this.logicalSize - topPadding - bottomPadding;
    const gridSize = Math.min(availableWidth, availableHeight);

    this.cellSize = gridSize / GRID_SIZE;
    this.pieceSize = this.cellSize * 0.82;
    this.gridOffsetX = (this.logicalSize - gridSize) / 2;
    this.gridOffsetY = topPadding + (availableHeight - gridSize) / 2;
  }

  getLogicalSize(): number {
    return this.logicalSize;
  }

  screenToGrid(screenX: number, screenY: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left - this.gridOffsetX;
    const y = screenY - rect.top - this.gridOffsetY;

    if (x < 0 || y < 0 || x >= this.cellSize * GRID_SIZE || y >= this.cellSize * GRID_SIZE) {
      return null;
    }

    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return { row, col };
  }

  isPointOnSlider(screenX: number, screenY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    const sliderY = this.logicalSize - 50 * this.uiScale;
    return y >= sliderY - 20 * this.uiScale && y <= sliderY + 30 * this.uiScale &&
           x >= 60 * this.uiScale && x <= this.logicalSize - 60 * this.uiScale;
  }

  getSliderValue(screenX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left - 60 * this.uiScale;
    const sliderWidth = this.logicalSize - 120 * this.uiScale;
    const ratio = Math.max(0, Math.min(1, x / sliderWidth));
    return 10 + ratio * 20;
  }

  isPointOnRestart(screenX: number, screenY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    const centerX = this.logicalSize / 2;
    const centerY = this.logicalSize / 2 + 80 * this.uiScale;
    const btnW = 160 * this.uiScale;
    const btnH = 50 * this.uiScale;
    return x >= centerX - btnW / 2 && x <= centerX + btnW / 2 &&
           y >= centerY - btnH / 2 && y <= centerY + btnH / 2;
  }

  update(deltaTime: number): void {
    this.rotationAngle += deltaTime * 2;

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vy += 0.3 * deltaTime * 60;
      p.life -= deltaTime;
      if (p.life <= 0) {
        p.active = false;
        this.activeParticles.splice(i, 1);
        this.particlePool.push(p);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * deltaTime * 60;
      ft.life -= deltaTime;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.mergeNotification.active) {
      this.mergeNotification.timer -= deltaTime;
      if (this.mergeNotification.timer <= 0) {
        this.mergeNotification.active = false;
      }
    }

    if (this.pushSweep.active) {
      this.pushSweep.timer -= deltaTime;
      if (this.pushSweep.timer <= 0) {
        this.pushSweep.active = false;
      }
    }
  }

  render(grid: (GamePiece | null)[][], state: GameState, pushTimer: number, pushInterval: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.logicalSize, this.logicalSize);

    this.drawBackground();
    this.drawGrid();
    this.drawPushSweep();
    this.drawPieces(grid, state.selectedPiece);
    this.drawParticles();
    this.drawFloatingTexts();
    this.drawUI(state, pushTimer, pushInterval);
    this.drawMergeNotification();

    if (state.isGameOver) {
      this.drawGameOver(state);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.logicalSize);
    gradient.addColorStop(0, '#1a1025');
    gradient.addColorStop(1, '#2d1b4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.logicalSize, this.logicalSize);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const gridSize = this.cellSize * GRID_SIZE;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = this.gridOffsetX + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.gridOffsetY);
      ctx.lineTo(x, this.gridOffsetY + gridSize);
      ctx.stroke();

      const y = this.gridOffsetY + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX, y);
      ctx.lineTo(this.gridOffsetX + gridSize, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.gridOffsetX, this.gridOffsetY, gridSize, gridSize);
  }

  private drawPieces(grid: (GamePiece | null)[][], selectedPiece: GamePiece | null): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const piece = grid[row][col];
        if (!piece) continue;

        let drawX = this.gridOffsetX + col * this.cellSize + this.cellSize / 2;
        let drawY = this.gridOffsetY + row * this.cellSize + this.cellSize / 2;

        if (piece.isMoving && piece.moveTimer < 0.15) {
          const t = piece.moveTimer / 0.15;
          const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const fromX = this.gridOffsetX + piece.moveFromCol * this.cellSize + this.cellSize / 2;
          const fromY = this.gridOffsetY + piece.moveFromRow * this.cellSize + this.cellSize / 2;
          drawX = fromX + (drawX - fromX) * easeT;
          drawY = fromY + (drawY - fromY) * easeT;
        }

        const size = this.pieceSize;
        const isSelected = selectedPiece?.id === piece.id;
        this.drawPiece(piece, drawX, drawY, size, isSelected);
      }
    }
  }

  private drawPiece(piece: GamePiece, x: number, y: number, size: number, isSelected: boolean): void {
    const ctx = this.ctx;
    const color = SYMBOL_COLORS[piece.type];

    let scale = 1;
    let opacity = 1;

    if (piece.isNew) {
      const t = 1 - piece.newTimer / 0.5;
      scale = 0.3 + t * 0.7;
      opacity = t;
    }

    if (piece.isMerging) {
      const t = 1 - piece.mergeTimer / 0.3;
      scale = 1 + t * 0.5;
      opacity = 1 - t;
    }

    if (piece.isNew) {
      const pulseScale = 1 + Math.sin(piece.newTimer * 20) * 0.1;
      scale *= pulseScale;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;

    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 * this.uiScale;
    }

    this.drawHexagon(0, 0, size / 2, color, piece.level);

    this.drawSymbolIcon(piece.type, 0, 0, size * 0.45, piece.level);

    ctx.restore();
  }

  private drawHexagon(x: number, y: number, radius: number, color: string, level: number): void {
    const ctx = this.ctx;
    const sides = 6;
    const cornerRadius = radius * 0.1;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const nextAngle = (Math.PI / 3) * (i + 1) - Math.PI / 2;

      const startAngle = angle + (Math.PI / 3) * 0.15;
      const endAngle = nextAngle - (Math.PI / 3) * 0.15;

      const innerR = radius - cornerRadius * 2;

      const x1 = x + innerR * Math.cos(startAngle);
      const y1 = y + innerR * Math.sin(startAngle);
      const x2 = x + innerR * Math.cos(endAngle);
      const y2 = y + innerR * Math.sin(endAngle);

      const cornerAngle = (startAngle + endAngle) / 2;
      const cornerX = x + radius * Math.cos(cornerAngle);
      const cornerY = y + radius * Math.sin(cornerAngle);

      if (i === 0) {
        ctx.moveTo(x1, y1);
      }
      ctx.quadraticCurveTo(cornerX, cornerY, x2, y2);
    }
    ctx.closePath();

    if (level >= 5) {
      const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
      const hueShift = (this.rotationAngle * 30) % 360;
      gradient.addColorStop(0, this.shiftHue(color, hueShift));
      gradient.addColorStop(0.5, this.shiftHue(color, hueShift + 120));
      gradient.addColorStop(1, this.shiftHue(color, hueShift + 240));
      ctx.fillStyle = gradient;
    } else if (level >= 2) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, this.lightenColor(color, 30));
      gradient.addColorStop(0.7, color);
      gradient.addColorStop(1, this.darkenColor(color, 20));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = color;
    }
    ctx.fill();

    if (level >= 3) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * this.uiScale;
      ctx.stroke();
    }

    if (level >= 4) {
      ctx.save();
      ctx.clip();
      const particleCount = 6;
      for (let i = 0; i < particleCount; i++) {
        const angle = this.rotationAngle + (i / particleCount) * Math.PI * 2;
        const dist = radius * 0.6;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 6 * this.uiScale);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 6 * this.uiScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (level >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 * this.uiScale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSymbolIcon(type: SymbolType, x: number, y: number, size: number, level: number): void {
    const ctx = this.ctx;
    const s = size;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, 2.5 * this.uiScale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (level >= 2) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8 * this.uiScale;
    }

    switch (type) {
      case SymbolType.PLANET:
        this.drawPlanetIcon(s);
        break;
      case SymbolType.LIGHTNING:
        this.drawLightningIcon(s);
        break;
      case SymbolType.LEAF:
        this.drawLeafIcon(s);
        break;
      case SymbolType.FIRE:
        this.drawFireIcon(s);
        break;
      case SymbolType.WATER:
        this.drawWaterIcon(s);
        break;
      case SymbolType.STAR:
        this.drawStarIcon(s);
        break;
    }

    ctx.restore();
  }

  private drawPlanetIcon(s: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.7, s * 0.25, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawLightningIcon(s: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(s * 0.15, -s * 0.55);
    ctx.lineTo(-s * 0.15, -s * 0.05);
    ctx.lineTo(s * 0.05, -s * 0.05);
    ctx.lineTo(-s * 0.15, s * 0.55);
    ctx.lineTo(s * 0.1, s * 0.05);
    ctx.lineTo(-s * 0.05, s * 0.05);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private drawLeafIcon(s: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.5, s * 0.3, 0, s * 0.6);
    ctx.bezierCurveTo(-s * 0.5, s * 0.3, -s * 0.5, -s * 0.3, 0, -s * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(0, s * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(s * 0.25, -s * 0.05);
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.25, s * 0.15);
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(-s * 0.25, -s * 0.05);
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.25, s * 0.15);
    ctx.stroke();
  }

  private drawFireIcon(s: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.bezierCurveTo(s * 0.45, s * 0.2, s * 0.3, -s * 0.2, s * 0.1, -s * 0.55);
    ctx.bezierCurveTo(0, -s * 0.35, -s * 0.15, -s * 0.2, -s * 0.15, 0);
    ctx.bezierCurveTo(-s * 0.15, -s * 0.15, -s * 0.3, -s * 0.05, -s * 0.35, s * 0.15);
    ctx.bezierCurveTo(-s * 0.45, s * 0.35, -s * 0.3, s * 0.55, 0, s * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private drawWaterIcon(s: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.bezierCurveTo(s * 0.4, -s * 0.15, s * 0.4, s * 0.35, 0, s * 0.55);
    ctx.bezierCurveTo(-s * 0.4, s * 0.35, -s * 0.4, -s * 0.15, 0, -s * 0.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-s * 0.12, s * 0.05, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private drawStarIcon(s: number): void {
    const ctx = this.ctx;
    const spikes = 5;
    const outerR = s * 0.55;
    const innerR = s * 0.25;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  spawnMergeParticles(gridX: number, gridY: number, color: string): void {
    const x = this.gridOffsetX + gridX * this.cellSize + this.cellSize / 2;
    const y = this.gridOffsetY + gridY * this.cellSize + this.cellSize / 2;

    const count = 30;
    for (let i = 0; i < count && this.activeParticles.length < MAX_ACTIVE_PARTICLES; i++) {
      const p = this.particlePool.pop();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const life = 0.6 + Math.random() * 0.4;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.color = this.lerpColor(color, '#ffffff', Math.random());
      p.size = (3 + Math.random() * 5) * this.uiScale;
      p.life = life;
      p.maxLife = life;
      p.active = true;

      this.activeParticles.push(p);
    }
  }

  addFloatingText(gridX: number, gridY: number, text: string, color: string): void {
    const x = this.gridOffsetX + gridX * this.cellSize + this.cellSize / 2;
    const y = this.gridOffsetY + gridY * this.cellSize;

    this.floatingTexts.push({
      x, y, text, color,
      life: 1.2,
      maxLife: 1.2,
      vy: -1.5
    });
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.activeParticles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloatingTexts(): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = `bold ${20 * this.uiScale}px sans-serif`;

    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4 * this.uiScale;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  showMergeNotification(text: string): void {
    this.mergeNotification.active = true;
    this.mergeNotification.text = text;
    this.mergeNotification.timer = this.mergeNotification.duration;
  }

  private drawMergeNotification(): void {
    if (!this.mergeNotification.active) return;

    const ctx = this.ctx;
    const alpha = Math.min(1, this.mergeNotification.timer / 0.3) * Math.min(1, (this.mergeNotification.duration - this.mergeNotification.timer) / 0.3);

    const y = this.gridOffsetY - 50 * this.uiScale;
    const text = this.mergeNotification.text;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = `bold ${22 * this.uiScale}px sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const padding = 20 * this.uiScale;
    const barW = textWidth + padding * 2;
    const barH = 40 * this.uiScale;

    const centerX = this.logicalSize / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(centerX - barW / 2, y - barH / 2, barW, barH, 8 * this.uiScale);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, centerX, y);

    ctx.restore();
  }

  showPushSweep(direction: 'left' | 'bottom'): void {
    this.pushSweep.active = true;
    this.pushSweep.direction = direction;
    this.pushSweep.timer = this.pushSweep.duration;
  }

  private drawPushSweep(): void {
    if (!this.pushSweep.active) return;

    const ctx = this.ctx;
    const progress = 1 - this.pushSweep.timer / this.pushSweep.duration;
    const alpha = Math.sin(progress * Math.PI);

    const gridSize = this.cellSize * GRID_SIZE;

    ctx.save();
    ctx.globalAlpha = alpha * 0.6;

    if (this.pushSweep.direction === 'left') {
      const g = ctx.createLinearGradient(
        this.gridOffsetX, 0,
        this.gridOffsetX + gridSize * 0.15, 0
      );
      g.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
      g.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = g;
      const x = this.gridOffsetX + progress * gridSize;
      ctx.fillRect(x - 30 * this.uiScale, this.gridOffsetY, 60 * this.uiScale, gridSize);
    } else {
      const g = ctx.createLinearGradient(
        0, this.gridOffsetY + gridSize,
        0, this.gridOffsetY + gridSize * 0.85
      );
      g.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
      g.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = g;
      const y = this.gridOffsetY + gridSize - progress * gridSize;
      ctx.fillRect(this.gridOffsetX, y - 30 * this.uiScale, gridSize, 60 * this.uiScale);
    }

    ctx.restore();
  }

  private drawUI(state: GameState, pushTimer: number, pushInterval: number): void {
    const ctx = this.ctx;
    const topY = 30 * this.uiScale;

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = `bold ${28 * this.uiScale}px sans-serif`;
    ctx.fillText(`${state.score}`, 60 * this.uiScale, topY);

    ctx.font = `${12 * this.uiScale}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('分数', 60 * this.uiScale, topY + 32 * this.uiScale);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${14 * this.uiScale}px sans-serif`;
    ctx.fillText(`最高: ${state.highScore}`, this.logicalSize / 2, topY + 8 * this.uiScale);

    if (state.combo > 1) {
      ctx.textAlign = 'center';
      const comboColor = state.combo >= 10 ? '#ffd700' : '#ff69b4';
      ctx.fillStyle = comboColor;
      ctx.font = `bold ${20 * this.uiScale}px sans-serif`;
      ctx.fillText(`${state.combo}连击!`, this.logicalSize / 2, topY + 30 * this.uiScale);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `${14 * this.uiScale}px sans-serif`;
    ctx.fillText('生命', this.logicalSize - 60 * this.uiScale, topY);

    const heartSize = 16 * this.uiScale;
    const heartGap = 6 * this.uiScale;
    const heartY = topY + 22 * this.uiScale;
    for (let i = 0; i < 5; i++) {
      const hx = this.logicalSize - 60 * this.uiScale - i * (heartSize + heartGap) - heartSize / 2;
      const filled = i < state.lives;
      this.drawHeart(hx, heartY + heartSize / 2, heartSize * 0.5, filled ? '#ff4757' : 'rgba(255, 255, 255, 0.2)');
    }

    this.drawPushTimer(pushTimer, pushInterval);
    this.drawPushIntervalSlider(pushInterval);
  }

  private drawHeart(x: number, y: number, size: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y - size * 0.5, x - size * 0.5, y - size * 1.1, x, y - size * 0.3);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 1.1, x + size, y - size * 0.5, x, y + size * 0.3);
    ctx.fill();
    ctx.restore();
  }

  private drawPushTimer(pushTimer: number, pushInterval: number): void {
    const ctx = this.ctx;
    const barX = this.gridOffsetX;
    const barY = this.gridOffsetY - 18 * this.uiScale;
    const barW = this.cellSize * GRID_SIZE;
    const barH = 4 * this.uiScale;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);

    const progress = Math.max(0, pushTimer / (pushInterval * 1000));
    const timerColor = progress < 0.2 ? '#ff4757' : progress < 0.5 ? '#ffa502' : '#2ed573';
    ctx.fillStyle = timerColor;
    ctx.fillRect(barX, barY, barW * progress, barH);
  }

  private drawPushIntervalSlider(pushInterval: number): void {
    const ctx = this.ctx;
    const sliderY = this.logicalSize - 50 * this.uiScale;
    const sliderX1 = 60 * this.uiScale;
    const sliderX2 = this.logicalSize - 60 * this.uiScale;
    const sliderW = sliderX2 - sliderX1;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `${12 * this.uiScale}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('推入间隔', sliderX1, sliderY - 18 * this.uiScale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(`${pushInterval.toFixed(0)}秒`, sliderX2, sliderY - 18 * this.uiScale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(sliderX1, sliderY, sliderW, 4 * this.uiScale);

    const ratio = (pushInterval - 10) / 20;
    const knobX = sliderX1 + sliderW * ratio;
    const knobR = 10 * this.uiScale;

    ctx.fillStyle = '#00bfff';
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 10 * this.uiScale;
    ctx.beginPath();
    ctx.arc(knobX, sliderY + 2 * this.uiScale, knobR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawGameOver(state: GameState): void {
    const ctx = this.ctx;
    const centerX = this.logicalSize / 2;
    const centerY = this.logicalSize / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, this.logicalSize, this.logicalSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${36 * this.uiScale}px sans-serif`;
    ctx.fillText('游戏结束', centerX, centerY - 120 * this.uiScale);

    const stars = this.getStarRating(state.score);
    const starSize = 32 * this.uiScale;
    const starGap = 15 * this.uiScale;

    for (let i = 0; i < 3; i++) {
      const sx = centerX + (i - 1) * (starSize + starGap);
      const filled = i < stars;
      this.drawStar(sx, centerY - 60 * this.uiScale, starSize * 0.5, filled ? '#ffd700' : 'rgba(255, 255, 255, 0.2)');
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${32 * this.uiScale}px sans-serif`;
    ctx.fillText(`${state.score}`, centerX, centerY + 5 * this.uiScale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `${14 * this.uiScale}px sans-serif`;
    ctx.fillText('最终得分', centerX, centerY + 30 * this.uiScale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${16 * this.uiScale}px sans-serif`;
    ctx.fillText(`最高分: ${state.highScore}`, centerX, centerY + 55 * this.uiScale);

    const btnY = centerY + 80 * this.uiScale;
    const btnW = 160 * this.uiScale;
    const btnH = 50 * this.uiScale;

    ctx.fillStyle = '#00bfff';
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 15 * this.uiScale;
    ctx.beginPath();
    ctx.roundRect(centerX - btnW / 2, btnY - btnH / 2, btnW, btnH, 25 * this.uiScale);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${18 * this.uiScale}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('再来一局', centerX, btnY);
    ctx.textBaseline = 'alphabetic';
  }

  private drawStar(x: number, y: number, size: number, color: string): void {
    const ctx = this.ctx;
    const spikes = 5;
    const outerR = size;
    const innerR = size * 0.45;

    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private getStarRating(score: number): number {
    if (score < 1000) return 1;
    if (score <= 3000) return 2;
    return 3;
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const b = Math.min(255, (num & 0x0000FF) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/\d+/g);
      if (match && match.length >= 3) {
        return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
      }
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }

  private shiftHue(hex: string, degrees: number): string {
    const rgb = this.hexToRgb(hex);
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }

    h = (h + degrees) % 360;
    if (h < 0) h += 360;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0, gp = 0, bp = 0;

    if (h < 60) { rp = c; gp = x; bp = 0; }
    else if (h < 120) { rp = x; gp = c; bp = 0; }
    else if (h < 180) { rp = 0; gp = c; bp = x; }
    else if (h < 240) { rp = 0; gp = x; bp = c; }
    else if (h < 300) { rp = x; gp = 0; bp = c; }
    else { rp = c; gp = 0; bp = x; }

    return `rgb(${Math.round((rp + m) * 255)}, ${Math.round((gp + m) * 255)}, ${Math.round((bp + m) * 255)})`;
  }
}
