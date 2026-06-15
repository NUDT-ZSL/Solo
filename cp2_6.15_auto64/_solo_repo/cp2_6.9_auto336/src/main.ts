import { Builder, GRID_SIZE, CELL_SIZE } from './builder';
import { Grower } from './grower';

const CANVAS_W = 560;
const CANVAS_H = 720;

const GLASS_X = 20;
const GLASS_Y = 50;
const GLASS_W = 520;
const GLASS_H = 620;
const GLASS_R = 20;

const STATUS_X = 20;
const STATUS_Y = 10;
const STATUS_W = 520;
const STATUS_H = 30;

const BTN_Y = 678;
const BTN_H = 32;
const BTN_W = 110;

interface ButtonDef {
  id: string;
  label: string;
  x: number;
  color: string;
  hoverColor: string;
}

const BUTTONS: ButtonDef[] = [
  { id: 'grow', label: '培育', x: 120, color: '#4CAF50', hoverColor: '#66BB6A' },
  { id: 'reset', label: '重置', x: 250, color: '#795548', hoverColor: '#8D6E63' },
  { id: 'screenshot', label: '截图', x: 380, color: '#5C6BC0', hoverColor: '#7986CB' }
];

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private builder: Builder;
  private grower: Grower;
  private lastTime: number;
  private hoveredButton: string | null;
  private autoGrowTriggered: boolean;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.builder = new Builder();
    this.grower = new Grower();
    this.grower.plantOffsetX = this.builder.gridOffsetX;
    this.grower.plantOffsetY = this.builder.gridOffsetY;

    this.lastTime = performance.now();
    this.hoveredButton = null;
    this.autoGrowTriggered = false;

    this.bindEvents();
    this.loop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.hoveredButton = this.getButtonAt(mx, my);
      if (this.grower.phase === 'idle') {
        this.builder.handleMouseMove(mx, my);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      const btnId = this.getButtonAt(mx, my);
      if (btnId) {
        this.handleButton(btnId);
        return;
      }

      if (this.grower.phase === 'idle') {
        this.autoGrowTriggered = false;
        if (this.builder.handlePaletteClick(mx, my)) {
          return;
        }
        this.builder.handleMouseDown(mx, my);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.builder.handleMouseUp();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.builder.handleMouseUp();
      this.hoveredButton = null;
    });
  }

  private getButtonAt(mx: number, my: number): string | null {
    for (const b of BUTTONS) {
      if (mx >= b.x && mx <= b.x + BTN_W && my >= BTN_Y && my <= BTN_Y + BTN_H) {
        return b.id;
      }
    }
    return null;
  }

  private handleButton(id: string): void {
    if (id === 'grow') {
      if (this.grower.phase === 'idle' && this.builder.pixelCount > 0) {
        const template = this.builder.getTemplate();
        this.grower.setTemplate(template);
        this.grower.start();
      }
    } else if (id === 'reset') {
      this.builder.reset();
      this.grower.reset();
      this.autoGrowTriggered = false;
    } else if (id === 'screenshot') {
      if (this.grower.phase !== 'idle' || this.builder.pixelCount > 0) {
        this.takeScreenshot();
      }
    }
  }

  private takeScreenshot(): void {
    const size = 480;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    const grad = offCtx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#5C3A21');
    grad.addColorStop(1, '#8B5E3C');
    offCtx.fillStyle = grad;
    offCtx.fillRect(0, 0, size, size);

    const margin = 40;
    const glassW = size - margin * 2;
    const glassH = size - margin * 2;
    this.drawRoundedRect(offCtx, margin, margin, glassW, glassH, 16);
    offCtx.fillStyle = 'rgba(240, 240, 235, 0.2)';
    offCtx.fill();
    offCtx.strokeStyle = 'rgba(200, 200, 180, 0.4)';
    offCtx.lineWidth = 2;
    offCtx.stroke();

    offCtx.save();
    offCtx.beginPath();
    this.drawRoundedRect(offCtx, margin, margin, glassW, glassH, 16);
    offCtx.clip();

    const highlight = offCtx.createRadialGradient(
      margin + glassW * 0.2, margin + glassH * 0.15, 0,
      margin + glassW * 0.2, margin + glassH * 0.15, glassW * 0.5
    );
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    offCtx.fillStyle = highlight;
    offCtx.fillRect(margin, margin, glassW, glassH);

    offCtx.save();
    const plantArea = size - margin * 4;
    offCtx.translate(margin * 2 + (plantArea - GRID_SIZE * CELL_SIZE * (plantArea / (GRID_SIZE * CELL_SIZE))) / 2,
                     margin * 2);
    offCtx.scale(plantArea / (GRID_SIZE * CELL_SIZE), plantArea / (GRID_SIZE * CELL_SIZE));

    if (this.grower.phase !== 'idle') {
      this.grower.drawForScreenshot(offCtx, GRID_SIZE * CELL_SIZE);
    } else {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (this.builder.grid[y][x] !== null) {
            offCtx.fillStyle = this.builder.grid[y][x] as string;
            offCtx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
    offCtx.restore();
    offCtx.restore();

    const url = offCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-bonsai-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  private drawBackground(): void {
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const bgGrad = this.ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    bgGrad.addColorStop(0, '#5C3A21');
    bgGrad.addColorStop(1, '#8B5E3C');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  private drawStatusBar(): void {
    this.drawRoundedRect(this.ctx, STATUS_X, STATUS_Y, STATUS_W, STATUS_H, 8);
    this.ctx.fillStyle = 'rgba(62, 39, 35, 0.6)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(62, 39, 35, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    let modeText = '编辑中';
    if (this.grower.phase === 'growing') modeText = '生长中';
    else if (this.grower.phase === 'complete') modeText = '培育完成';

    const count = this.grower.phase === 'idle' ? this.builder.pixelCount : this.grower.template.length;

    this.ctx.fillStyle = '#D7CCC8';
    this.ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`模式：${modeText}`, STATUS_X + 20, STATUS_Y + STATUS_H / 2);

    const countText = `像素：${count}/256`;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(countText, STATUS_X + STATUS_W - 20, STATUS_Y + STATUS_H / 2);
    this.ctx.textAlign = 'left';
  }

  private drawGlassContainer(): void {
    this.ctx.save();
    this.drawRoundedRect(this.ctx, GLASS_X, GLASS_Y, GLASS_W, GLASS_H, GLASS_R);

    const glassGrad = this.ctx.createLinearGradient(GLASS_X, GLASS_Y, GLASS_X, GLASS_Y + GLASS_H);
    glassGrad.addColorStop(0, 'rgba(245, 245, 240, 0.25)');
    glassGrad.addColorStop(1, 'rgba(230, 230, 220, 0.15)');
    this.ctx.fillStyle = glassGrad;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(200, 200, 180, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.save();
    this.ctx.clip();

    const highlight = this.ctx.createRadialGradient(
      GLASS_X + GLASS_W * 0.2, GLASS_Y + GLASS_H * 0.12, 0,
      GLASS_X + GLASS_W * 0.2, GLASS_Y + GLASS_H * 0.12, GLASS_W * 0.55
    );
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = highlight;
    this.ctx.fillRect(GLASS_X, GLASS_Y, GLASS_W, GLASS_H);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(GLASS_X + 30, GLASS_Y + 10);
    this.ctx.lineTo(GLASS_X + 30, GLASS_Y + GLASS_H * 0.6);
    this.ctx.stroke();

    this.ctx.restore();
    this.ctx.restore();

    this.ctx.save();
    this.drawRoundedRect(this.ctx, GLASS_X, GLASS_Y, GLASS_W, GLASS_H, GLASS_R);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawButtons(): void {
    for (const b of BUTTONS) {
      const isHovered = this.hoveredButton === b.id;
      const isDisabled = this.isButtonDisabled(b.id);
      const color = isHovered && !isDisabled ? b.hoverColor : b.color;

      this.ctx.save();
      this.ctx.globalAlpha = isDisabled ? 0.5 : 1;

      this.drawRoundedRect(this.ctx, b.x, BTN_Y, BTN_W, BTN_H, 8);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(b.x + 2, BTN_Y + 2, BTN_W - 4, 4);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 15px "Segoe UI", "Microsoft YaHei", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(b.label, b.x + BTN_W / 2, BTN_Y + BTN_H / 2);
      this.ctx.textAlign = 'left';

      this.ctx.restore();
    }
  }

  private isButtonDisabled(id: string): boolean {
    if (id === 'grow') {
      return this.grower.phase !== 'idle' || this.builder.pixelCount === 0;
    }
    if (id === 'screenshot') {
      return this.grower.phase === 'idle' && this.builder.pixelCount === 0;
    }
    return false;
  }

  private drawEditorHint(): void {
    if (this.grower.phase !== 'idle') return;
    this.ctx.fillStyle = 'rgba(215, 204, 200, 0.8)';
    this.ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('点击右侧色板选择颜色，在网格上绘制像素植物', CANVAS_W / 2, GLASS_Y + 30);
    if (this.builder.pixelCount > 0 && this.builder.pixelCount < 30) {
      this.ctx.fillStyle = 'rgba(255, 235, 59, 0.8)';
      this.ctx.fillText(`提示：还需 ${30 - this.builder.pixelCount} 个像素可自动培育`, CANVAS_W / 2, GLASS_Y + 54);
    }
    this.ctx.textAlign = 'left';
  }

  private checkAutoGrow(): void {
    if (this.grower.phase === 'idle' && !this.autoGrowTriggered && this.builder.pixelCount >= 30) {
      this.autoGrowTriggered = true;
      const template = this.builder.getTemplate();
      this.grower.setTemplate(template);
      this.grower.start();
    }
  }

  private update(dt: number): void {
    this.grower.update(dt);
    this.checkAutoGrow();
  }

  private draw(): void {
    this.drawBackground();
    this.drawStatusBar();
    this.drawGlassContainer();

    this.ctx.save();
    this.drawRoundedRect(this.ctx, GLASS_X, GLASS_Y, GLASS_W, GLASS_H, GLASS_R);
    this.ctx.clip();

    if (this.grower.phase === 'idle') {
      this.builder.draw(this.ctx);
      this.drawEditorHint();
    } else {
      this.grower.draw(this.ctx);
    }

    this.ctx.restore();

    this.drawButtons();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
