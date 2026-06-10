import { GameManager, TrackBlock, Particle, Slot } from './GameManager';

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hovered: boolean;
  pressed: boolean;
  type: 'primary' | 'secondary';
}

const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 40;

export class LevelRenderer {
  private ctx: CanvasRenderingContext2D;
  private gameManager: GameManager;
  private canvas: HTMLCanvasElement;

  private menuButtons: Button[] = [];
  private winButton: Button | null = null;
  private guideOpen: boolean = false;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement, gameManager: GameManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.gameManager = gameManager;
    this.initMenuButtons();
  }

  private initMenuButtons(): void {
    this.menuButtons = [
      { x: 0, y: 0, width: 200, height: 50, label: '开始游戏', hovered: false, pressed: false, type: 'primary' },
      { x: 0, y: 0, width: 200, height: 50, label: '音轨指南', hovered: false, pressed: false, type: 'secondary' }
    ];
    this.layoutMenuButtons();
  }

  private layoutMenuButtons(): void {
    const centerX = this.gameManager.canvasWidth / 2;
    const centerY = this.gameManager.canvasHeight / 2;
    this.menuButtons[0].x = centerX - 100;
    this.menuButtons[0].y = centerY + 40;
    this.menuButtons[1].x = centerX - 100;
    this.menuButtons[1].y = centerY + 110;

    this.winButton = {
      x: centerX - 100,
      y: centerY + 80,
      width: 200,
      height: 50,
      label: '重新开始',
      hovered: false,
      pressed: false,
      type: 'primary'
    };
  }

  public resize(): void {
    this.layoutMenuButtons();
  }

  public handleMouseMove(x: number, y: number): void {
    this.menuButtons.forEach(btn => {
      btn.hovered = x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
    });
    if (this.winButton) {
      this.winButton.hovered = x >= this.winButton.x && x <= this.winButton.x + this.winButton.width &&
        y >= this.winButton.y && y <= this.winButton.y + this.winButton.height;
    }
  }

  public handleMouseDown(x: number, y: number): void {
    this.menuButtons.forEach(btn => {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        btn.pressed = true;
      }
    });
    if (this.winButton) {
      if (x >= this.winButton.x && x <= this.winButton.x + this.winButton.width &&
        y >= this.winButton.y && y <= this.winButton.y + this.winButton.height) {
        this.winButton.pressed = true;
      }
    }
  }

  public handleMouseUp(x: number, y: number): string | null {
    let clicked: string | null = null;

    if (this.gameManager.state === 'menu') {
      this.menuButtons.forEach(btn => {
        if (btn.pressed && x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
          clicked = btn.label;
          if (btn.label === '音轨指南') {
            this.guideOpen = !this.guideOpen;
          }
        }
        btn.pressed = false;
      });
    } else if (this.gameManager.state === 'win' && this.winButton) {
      if (this.winButton.pressed && x >= this.winButton.x && x <= this.winButton.x + this.winButton.width &&
        y >= this.winButton.y && y <= this.winButton.y + this.winButton.height) {
        clicked = '重新开始';
      }
      this.winButton.pressed = false;
    }

    return clicked;
  }

  public render(deltaTime: number): void {
    this.time += deltaTime;
    const ctx = this.ctx;
    const gm = this.gameManager;

    ctx.save();

    const shakeOffset = gm.getShakeOffset();
    if (shakeOffset !== 0) {
      ctx.translate(0, shakeOffset);
    }

    this.drawBackground();

    if (gm.state === 'menu') {
      this.drawNebula();
      this.drawMenuTitle();
      this.drawMenuButtons();
      if (this.guideOpen) {
        this.drawGuide();
      }
    } else if (gm.state === 'playing') {
      this.drawHUD();
      this.drawSlots();
      this.drawTracks();
      this.drawParticles();
    } else if (gm.state === 'win') {
      this.drawWinScreen();
    }

    this.drawFlash();
    this.drawFPS();

    ctx.restore();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.gameManager.canvasWidth;
    const h = this.gameManager.canvasHeight;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0F0A1A');
    gradient.addColorStop(1, '#1F1530');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawNebula(): void {
    const ctx = this.ctx;
    const centerX = this.gameManager.canvasWidth / 2;
    const centerY = this.gameManager.canvasHeight / 2;
    const rotation = (this.time / 1000) * (Math.PI * 2 / 8);

    this.gameManager.nebulaParticles.forEach((p) => {
      const angle = Math.atan2(p.vy, p.vx) + rotation;
      const radius = p.life * 0.5;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  private drawMenuTitle(): void {
    const ctx = this.ctx;
    const centerX = this.gameManager.canvasWidth / 2;
    const centerY = this.gameManager.canvasHeight / 2;

    ctx.save();
    ctx.font = 'bold 36px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#9370DB';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#E6E6FA';
    ctx.fillText('音轨重构者', centerX, centerY - 50);
    ctx.restore();
  }

  private drawMenuButtons(): void {
    this.menuButtons.forEach(btn => this.drawButton(btn));
  }

  private drawButton(btn: Button): void {
    const ctx = this.ctx;

    ctx.save();

    let scale = 1;
    let bgColor: string;
    let textColor: string;

    if (btn.type === 'primary') {
      bgColor = btn.hovered ? '#6959CD' : '#483D8B';
      textColor = '#E6E6FA';
      if (btn.pressed) {
        scale = 0.95;
        bgColor = '#372E6E';
      } else if (btn.hovered) {
        scale = 1.1;
      }
    } else {
      bgColor = 'rgba(147, 112, 219, 0.2)';
      textColor = '#B0A0D0';
      if (btn.pressed) {
        scale = 0.95;
        bgColor = 'rgba(147, 112, 219, 0.3)';
      } else if (btn.hovered) {
        scale = 1.1;
        bgColor = 'rgba(147, 112, 219, 0.4)';
      }
    }

    const cx = btn.x + btn.width / 2;
    const cy = btn.y + btn.height / 2;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.beginPath();
    const radius = 8;
    ctx.moveTo(btn.x + radius, btn.y);
    ctx.lineTo(btn.x + btn.width - radius, btn.y);
    ctx.quadraticCurveTo(btn.x + btn.width, btn.y, btn.x + btn.width, btn.y + radius);
    ctx.lineTo(btn.x + btn.width, btn.y + btn.height - radius);
    ctx.quadraticCurveTo(btn.x + btn.width, btn.y + btn.height, btn.x + btn.width - radius, btn.y + btn.height);
    ctx.lineTo(btn.x + radius, btn.y + btn.height);
    ctx.quadraticCurveTo(btn.x, btn.y + btn.height, btn.x, btn.y + btn.height - radius);
    ctx.lineTo(btn.x, btn.y + radius);
    ctx.quadraticCurveTo(btn.x, btn.y, btn.x + radius, btn.y);
    ctx.closePath();

    ctx.fillStyle = bgColor;
    if (btn.hovered && btn.type === 'primary') {
      ctx.shadowColor = '#9370DB';
      ctx.shadowBlur = 15;
    }
    ctx.fill();

    ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.shadowBlur = 0;
    ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);

    ctx.restore();
  }

  private drawGuide(): void {
    const ctx = this.ctx;
    const w = this.gameManager.canvasWidth;
    const h = this.gameManager.canvasHeight;

    const panelW = 500;
    const panelH = 350;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(15, 10, 26, 0.95)';
    ctx.strokeStyle = '#9370DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E6E6FA';
    ctx.font = 'bold 24px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('音轨指南', w / 2, py + 40);

    ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#D8BFD8';
    ctx.textAlign = 'left';
    const lines = [
      '• 用鼠标拖拽彩色音轨块到下方的槽位中',
      '• 每个音轨块对应不同的音高和音色',
      '• 将所有槽位填满后会自动播放拼合的旋律',
      '• 正确拼出目标旋律可获得100分并进入下一关',
      '• 拼合错误则得分清零并重新开始当前关卡',
      '• 关卡递增：音轨数量从4块增加到8块',
      '• 目标旋律复杂度也会随关卡提升',
      '• 通过全部8关即可通关！'
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, px + 30, py + 90 + i * 30);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#B0A0D0';
    ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText('再次点击"音轨指南"关闭', w / 2, py + panelH - 30);
  }

  private drawHUD(): void {
    const ctx = this.ctx;
    const gm = this.gameManager;

    ctx.save();

    ctx.font = '24px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#D8BFD8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#9370DB';
    ctx.shadowBlur = 10;
    ctx.fillText(`Level ${gm.level}`, 20, 20);

    ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#C0C0C0';
    ctx.shadowBlur = 0;
    ctx.fillText(`Score: ${gm.score}`, 20, 55);

    if (gm.playingMelody) {
      ctx.textAlign = 'center';
      ctx.font = '20px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.fillText('♪ 正在播放旋律... ♪', gm.canvasWidth / 2, 30);
    }

    ctx.restore();
  }

  private drawFPS(): void {
    const ctx = this.ctx;
    const gm = this.gameManager;

    ctx.save();
    ctx.font = '12px "Consolas", monospace';
    ctx.fillStyle = gm.currentFPS >= 55 ? 'rgba(100, 255, 150, 0.7)' : 'rgba(255, 150, 100, 0.7)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${gm.currentFPS} | Particles: ${gm.particles.length}`, gm.canvasWidth - 20, 20);
    ctx.restore();
  }

  private drawSlots(): void {
    const ctx = this.ctx;
    const gm = this.gameManager;

    gm.slots.forEach((slot: Slot) => {
      ctx.save();

      ctx.strokeStyle = '#9370DB';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      if (slot.filled) {
        ctx.fillStyle = 'rgba(147, 112, 219, 0.15)';
      } else {
        ctx.fillStyle = 'rgba(147, 112, 219, 0.05)';
      }

      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 6);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }

  private drawTracks(): void {
    const ctx = this.ctx;
    const gm = this.gameManager;

    gm.tracks.forEach((track: TrackBlock) => {
      const isDragging = gm.draggingTrack === track;

      if (isDragging) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        this.drawTrackBlock(track.originalX, track.originalY, track, 1);
        ctx.restore();
      }

      ctx.save();

      if (track.flying) {
        ctx.globalAlpha = Math.max(0, 1 - track.flyProgress);
        const cx = track.x + BLOCK_WIDTH / 2;
        const cy = track.y + BLOCK_HEIGHT / 2;
        ctx.translate(cx, cy);
        const rotation = track.flyRotation * track.flyProgress;
        ctx.rotate(rotation);
        ctx.translate(-cx, -cy);

        if (track.flyColor === '#FF4444') {
          const shake = Math.sin(track.flyProgress * 50) * 2;
          ctx.translate(shake, 0);
        }
      }

      if (isDragging) {
        ctx.shadowColor = track.color;
        ctx.shadowBlur = 20;
      }

      const displayColor = track.flying ? track.flyColor : track.color;
      this.drawTrackBlock(track.x, track.y, track, track.flying ? Math.max(0.2, 1 - track.flyProgress) : 1, displayColor);

      ctx.restore();
    });
  }

  private drawTrackBlock(x: number, y: number, track: TrackBlock, alpha: number = 1, overrideColor?: string): void {
    const ctx = this.ctx;
    const w = BLOCK_WIDTH;
    const h = BLOCK_HEIGHT;
    const color = overrideColor || track.color;

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px "Segoe UI Symbol", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(track.noteSymbol, x + w / 2, y + h / 2);
    ctx.globalAlpha = 1;
  }

  private drawParticles(): void {
    const ctx = this.ctx;

    this.gameManager.particles.forEach((p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawFlash(): void {
    const ctx = this.ctx;
    const gm = this.gameManager;

    if (gm.flashColor !== null && gm.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = gm.flashAlpha;
      ctx.fillStyle = gm.flashColor;
      ctx.fillRect(0, 0, gm.canvasWidth, gm.canvasHeight);
      ctx.restore();
    }
  }

  private drawWinScreen(): void {
    const ctx = this.ctx;
    const gm = this.gameManager;
    const centerX = gm.canvasWidth / 2;
    const centerY = gm.canvasHeight / 2;

    this.drawNebula();

    this.gameManager.particles.forEach((p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    const animT = (gm.winAnimationTime / 1000) % 2;
    let scale = 1;
    let rotation = 0;
    if (animT < 1) {
      scale = 1 + animT * 0.2;
      rotation = animT * Math.PI * 0.2;
    } else {
      scale = 1.2 - (animT - 1) * 0.2;
      rotation = Math.PI * 0.2 - (animT - 1) * Math.PI * 0.2;
    }

    ctx.translate(centerX, centerY - 50);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    ctx.font = 'bold 48px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30;
    ctx.fillText('You Win!', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.font = '20px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#D8BFD8';
    ctx.textAlign = 'center';
    ctx.fillText(`最终得分: ${gm.score}`, centerX, centerY + 20);
    ctx.restore();

    if (this.winButton) {
      this.drawButton(this.winButton);
    }
  }
}
