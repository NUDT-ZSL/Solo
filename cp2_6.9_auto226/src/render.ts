import { GRID_SIZE, CELL_SIZE, LevelData } from './level';

export interface RenderState {
  gridOffsetX: number;
  gridOffsetY: number;
  time: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  }

  clear(): void {
    this.ctx.fillStyle = '#E0F7FA';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  getGridCenter(): { x: number; y: number } {
    return {
      x: window.innerWidth / 2 - 120,
      y: window.innerHeight / 2 - 50
    };
  }

  getPuzzleArea(): { x: number; y: number; width: number; height: number } {
    return { x: 40, y: 80, width: 220, height: 600 };
  }

  getBlockLibraryArea(): { x: number; y: number; width: number; height: number } {
    return { x: window.innerWidth - 220, y: 80, width: 200, height: 500 };
  }

  getRunButtonRect(): { x: number; y: number; width: number; height: number } {
    return { x: window.innerWidth - 200, y: 600, width: 160, height: 50 };
  }

  getResetButtonRect(): { x: number; y: number; width: number; height: number } {
    return { x: window.innerWidth - 200, y: 660, width: 160, height: 50 };
  }

  drawGrid(level: LevelData, state: RenderState): void {
    const center = this.getGridCenter();
    const totalWidth = GRID_SIZE * CELL_SIZE;
    const totalHeight = GRID_SIZE * CELL_SIZE;
    const startX = center.x - totalWidth / 2;
    const startY = center.y - totalHeight / 2;
    state.gridOffsetX = startX;
    state.gridOffsetY = startY;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = level.grid[y][x];
        const px = startX + x * CELL_SIZE;
        const py = startY + y * CELL_SIZE;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

        const breath = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(state.time * 2 * Math.PI / 1.5));

        if (cell === 'start') {
          this.ctx.globalAlpha = breath;
          this.ctx.fillStyle = '#4CAF50';
          this.ctx.beginPath();
          this.ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.globalAlpha = 1;
          this.ctx.strokeStyle = '#2E7D32';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        } else if (cell === 'end') {
          this.ctx.globalAlpha = breath;
          this.ctx.fillStyle = '#F44336';
          this.ctx.fillRect(px + CELL_SIZE / 2 - 2, py + 8, 4, CELL_SIZE - 16);
          this.ctx.beginPath();
          this.ctx.moveTo(px + CELL_SIZE / 2 + 2, py + 8);
          this.ctx.lineTo(px + CELL_SIZE - 10, py + 18);
          this.ctx.lineTo(px + CELL_SIZE / 2 + 2, py + 28);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.globalAlpha = 1;
        } else if (cell === 'obstacle') {
          this.ctx.fillStyle = '#9E9E9E';
          this.ctx.fillRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);
          this.ctx.strokeStyle = '#616161';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        }
      }
    }
  }

  drawPuzzleArea(): void {
    const area = this.getPuzzleArea();
    this.ctx.setLineDash([8, 6]);
    this.ctx.strokeStyle = '#BDBDBD';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(area.x, area.y, area.width, area.height);
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = '#757575';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🧩 拼图区', area.x, area.y - 10);
  }

  drawBlockLibrary(): void {
    const area = this.getBlockLibraryArea();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 2;
    this.roundRect(area.x, area.y, area.width, area.height, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#424242';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🎨 积木库', area.x + 15, area.y + 28);
  }

  drawRunButton(hovered: boolean): void {
    const rect = this.getRunButtonRect();
    this.ctx.fillStyle = hovered ? '#66BB6A' : '#4CAF50';
    this.roundRect(rect.x, rect.y, rect.width, rect.height, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('▶ 运行', rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  drawResetButton(hovered: boolean): void {
    const rect = this.getResetButtonRect();
    this.ctx.fillStyle = hovered ? '#FF7043' : '#F4511E';
    this.roundRect(rect.x, rect.y, rect.width, rect.height, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('↻ 重置', rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  drawProgressBar(current: number, total: number, completed: boolean[]): void {
    const barY = window.innerHeight - 50;
    const barWidth = 500;
    const barX = window.innerWidth / 2 - barWidth / 2;

    this.ctx.fillStyle = '#424242';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('关卡进度', window.innerWidth / 2, barY - 12);

    const spacing = barWidth / total;
    for (let i = 0; i < total; i++) {
      const cx = barX + spacing / 2 + i * spacing;
      const cy = barY + 10;
      const isCompleted = completed[i];
      const isCurrent = i === current;

      this.ctx.beginPath();
      const spikes = 5;
      const outerRadius = 14;
      const innerRadius = 6;
      for (let s = 0; s < spikes * 2; s++) {
        const radius = s % 2 === 0 ? outerRadius : innerRadius;
        const angle = (s * Math.PI / spikes) - Math.PI / 2;
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius;
        if (s === 0) this.ctx.moveTo(sx, sy);
        else this.ctx.lineTo(sx, sy);
      }
      this.ctx.closePath();

      if (isCompleted) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 8;
      } else {
        this.ctx.fillStyle = '#BDBDBD';
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (isCurrent) {
        this.ctx.strokeStyle = '#2196F3';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(String(i + 1), cx, cy + 1);
    }
  }

  drawBlock(
    type: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      dragged?: boolean;
      hovered?: boolean;
      highlighted?: boolean;
      loopCount?: number;
    } = {}
  ): void {
    this.ctx.save();

    if (options.hovered) {
      this.ctx.translate(x + width / 2, y + height / 2);
      this.ctx.scale(1.1, 1.1);
      this.ctx.translate(-(x + width / 2), -(y + height / 2));
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetY = 2;
    }

    if (options.dragged) {
      this.ctx.globalAlpha = 0.6;
    }

    if (options.highlighted) {
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 10;
    }

    this.ctx.lineWidth = options.highlighted ? 3 : 2;
    this.ctx.strokeStyle = options.highlighted ? '#FFD700' : 'rgba(0, 0, 0, 0.2)';

    switch (type) {
      case 'forward':
        this.ctx.fillStyle = '#2196F3';
        this.roundRect(x, y, width, height, 6);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('→ 前进', x + width / 2, y + height / 2);
        break;

      case 'left':
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.beginPath();
        this.ctx.moveTo(x + width, y);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x, y + height / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = '#424242';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('↺', x + width * 0.6, y + height / 2);
        break;

      case 'right':
        this.ctx.fillStyle = '#FF9800';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x + width, y + height / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('↻', x + width * 0.4, y + height / 2);
        break;

      case 'loop':
        this.ctx.fillStyle = '#9C27B0';
        this.roundRect(x, y, width, height, 16);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🔄 循环', x + width / 2, y + height / 2 - 8);
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.fillText(String(options.loopCount ?? 2), x + width / 2, y + height / 2 + 14);
        break;
    }

    this.ctx.restore();
  }

  drawPlayer(
    x: number,
    y: number,
    direction: number,
    state: { glowing: boolean; flashing: boolean; flashOn: boolean; trail: { x: number; y: number }[] }
  ): void {
    this.ctx.save();

    if (state.trail.length > 1) {
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(state.trail[0].x, state.trail[0].y);
      for (let i = 1; i < state.trail.length; i++) {
        this.ctx.lineTo(state.trail[i].x, state.trail[i].y);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    if (state.glowing) {
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 20);
      gradient.addColorStop(0, 'rgba(129, 212, 250, 0.3)');
      gradient.addColorStop(1, 'rgba(129, 212, 250, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (state.flashing && state.flashOn) {
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 25);
      gradient.addColorStop(0, 'rgba(244, 67, 54, 0.5)');
      gradient.addColorStop(1, 'rgba(244, 67, 54, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 25, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.translate(x, y);
    this.ctx.rotate(direction * Math.PI / 2);

    const w = 30, h = 30;
    const color = state.flashing && state.flashOn ? '#EF5350' : '#4FC3F7';
    this.ctx.fillStyle = color;
    this.roundRect(-w / 2, -h / 2, w, h, 8);
    this.ctx.fill();
    this.ctx.strokeStyle = '#0288D1';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(-6, -4, 3, 0, Math.PI * 2);
    this.ctx.arc(6, -4, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#424242';
    this.ctx.beginPath();
    this.ctx.arc(-5, -4, 1.5, 0, Math.PI * 2);
    this.ctx.arc(7, -4, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 6, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawParticles(particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]): void {
    for (const p of particles) {
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  drawBalloons(balloons: { x: number; y: number; color: string; speed: number; wobble: number; wobbleSpeed: number }[], time: number): void {
    for (const b of balloons) {
      const wx = b.x + Math.sin(time * b.wobbleSpeed + b.wobble) * 15;
      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      this.ctx.ellipse(wx, b.y, 18, 24, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(wx, b.y + 24);
      this.ctx.lineTo(wx - 5, b.y + 32);
      this.ctx.lineTo(wx + 5, b.y + 32);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = '#757575';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(wx, b.y + 32);
      this.ctx.quadraticCurveTo(wx + 5, b.y + 45, wx, b.y + 55);
      this.ctx.stroke();
    }
  }

  drawCelebration(time: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.font = 'bold 52px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const bounce = Math.sin(time * 4) * 10;
    this.ctx.fillText('🎉 恭喜通关！🎉', window.innerWidth / 2, window.innerHeight / 2 - 50 + bounce);

    this.ctx.fillStyle = '#424242';
    this.ctx.font = '22px sans-serif';
    this.ctx.fillText('你是最棒的编程小天才！', window.innerWidth / 2, window.innerHeight / 2 + 20);
  }

  drawLevelTitle(name: string): void {
    this.ctx.fillStyle = '#37474F';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, window.innerWidth / 2, 45);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
