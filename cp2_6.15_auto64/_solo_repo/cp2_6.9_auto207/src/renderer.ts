import { SandParticle, HourglassConfig } from './sandSim';
import { SandWorm, GameStatus } from './gameManager';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private stars: StarParticle[] = [];
  private time: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number) {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.initStars(width, height);
  }

  private initStars(width: number, height: number) {
    this.stars = [];
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
      const leftSide = i < starCount / 2;
      const margin = 60;
      const minX = leftSide ? margin : width / 2 + 140;
      const maxX = leftSide ? width / 2 - 140 : width - margin;
      this.stars.push({
        x: minX + Math.random() * (maxX - minX),
        y: margin + Math.random() * (height - 2 * margin),
        size: 0.5 + Math.random() * 1.5,
        baseAlpha: 0.3 + Math.random() * 0.7,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.03
      });
    }
  }

  render(
    dt: number,
    particles: SandParticle[],
    worms: SandWorm[],
    hourglass: HourglassConfig,
    status: GameStatus,
    flashTime: number,
    mouseX: number,
    mouseY: number
  ) {
    this.time += dt;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.ctx.clearRect(0, 0, w, h);

    this.drawBackground(w, h);
    this.drawStars();
    this.drawHourglass(hourglass);
    this.drawParticles(particles);
    this.drawWorms(worms);

    if (flashTime > 0) {
      this.drawEatFlash(hourglass, flashTime);
    }

    this.drawHUD(status);
    this.drawPauseButton(status, mouseX, mouseY);

    if (status.state === 'paused') {
      this.drawPauseOverlay(w, h);
    } else if (status.state === 'lost') {
      this.drawGameOver(w, h, status, mouseX, mouseY);
    } else if (status.state === 'flipping') {
      this.drawLevelUpNotice(w, h, status);
    }
  }

  private drawBackground(w: number, h: number) {
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1A1A2E');
    grad.addColorStop(1, '#16213E');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawStars() {
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed;
      const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(star.twinklePhase));
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(201, 209, 217, ${alpha})`;
      this.ctx.fill();
    }
  }

  private drawHourglass(hg: HourglassConfig) {
    this.ctx.save();
    this.ctx.translate(hg.centerX, hg.centerY);
    this.ctx.rotate(hg.rotation);

    const hw = hg.width / 2;
    const hh = hg.height / 2;
    const nw = hg.neckWidth / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(-hw, -hh);
    this.ctx.lineTo(-nw, 0);
    this.ctx.lineTo(-hw, hh);
    this.ctx.lineTo(hw, hh);
    this.ctx.lineTo(nw, 0);
    this.ctx.lineTo(hw, -hh);
    this.ctx.closePath();

    const glassGrad = this.ctx.createLinearGradient(0, -hh, 0, hh);
    glassGrad.addColorStop(0, 'rgba(224, 224, 224, 0.25)');
    glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    glassGrad.addColorStop(1, 'rgba(224, 224, 224, 0.25)');
    this.ctx.fillStyle = glassGrad;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(200, 200, 220, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    const neckPulse = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(this.time * Math.PI * 2));
    this.ctx.beginPath();
    this.ctx.moveTo(-nw, -8);
    this.ctx.lineTo(nw, -8);
    this.ctx.lineTo(nw, 8);
    this.ctx.lineTo(-nw, 8);
    this.ctx.closePath();
    const neckGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, nw + 4);
    neckGrad.addColorStop(0, `rgba(255, 255, 200, ${neckPulse * 0.8})`);
    neckGrad.addColorStop(1, `rgba(255, 255, 200, 0)`);
    this.ctx.fillStyle = neckGrad;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(180, 180, 200, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(-hw - 5, -hh - 5);
    this.ctx.lineTo(hw + 5, -hh - 5);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(-hw - 5, hh + 5);
    this.ctx.lineTo(hw + 5, hh + 5);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawParticles(particles: SandParticle[]) {
    for (const p of particles) {
      for (const t of p.trail) {
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, p.radius * 0.8, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(212, 160, 23, ${t.alpha})`;
        this.ctx.fill();
      }
    }

    this.ctx.fillStyle = '#D4A017';
    for (const p of particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawWorms(worms: SandWorm[]) {
    for (const worm of worms) {
      for (let i = worm.segments.length - 1; i >= 0; i--) {
        const seg = worm.segments[i];
        const size = 4 + (worm.segments.length - i) * 1.5;
        const alpha = 1 - i * 0.15;

        this.ctx.beginPath();
        this.ctx.arc(seg.x, seg.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(80, 40, 10, ${alpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }

      if (worm.segments.length > 0) {
        const head = worm.segments[0];
        this.ctx.beginPath();
        this.ctx.arc(head.x - 2, head.y - 2, 1.5, 0, Math.PI * 2);
        this.ctx.arc(head.x + 2, head.y - 2, 1.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fill();
      }
    }
  }

  private drawEatFlash(hg: HourglassConfig, flashTime: number) {
    const intensity = flashTime / 0.15;
    const neck = { x: hg.centerX, y: hg.centerY };
    const radius = 30 * intensity;

    this.ctx.beginPath();
    this.ctx.arc(neck.x, neck.y, radius, 0, Math.PI * 2);
    const flashGrad = this.ctx.createRadialGradient(neck.x, neck.y, 0, neck.x, neck.y, radius);
    flashGrad.addColorStop(0, `rgba(0, 255, 0, ${0.6 * intensity})`);
    flashGrad.addColorStop(1, `rgba(0, 255, 0, 0)`);
    this.ctx.fillStyle = flashGrad;
    this.ctx.fill();
  }

  private drawHUD(status: GameStatus) {
    const padding = 16;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(padding, padding, 200, 110, 8);
    this.ctx.fill();

    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.fillStyle = '#EAEAEA';
    this.ctx.textAlign = 'left';

    let timeText = `⏱ ${status.timeLeft.toFixed(1)}s`;
    if (status.isLastTenSeconds) {
      const shake = Math.sin(this.time * 50) * 2;
      this.ctx.fillStyle = '#FF4444';
      this.ctx.fillText(timeText, padding + 12 + shake, padding + 28);
    } else {
      this.ctx.fillStyle = '#EAEAEA';
      this.ctx.fillText(timeText, padding + 12, padding + 28);
    }

    this.ctx.fillStyle = '#EAEAEA';
    this.ctx.fillText(`🎯 关卡 ${status.level}`, padding + 12, padding + 52);

    const percent = (status.sandRatio * 100).toFixed(1);
    this.ctx.fillText(`⏳ 沙量 ${percent}%`, padding + 12, padding + 76);

    this.ctx.fillStyle = status.totalSand < 3500 ? '#FF8844' : '#EAEAEA';
    this.ctx.fillText(`颗粒: ${status.totalSand}`, padding + 12, padding + 100);

    this.ctx.fillStyle = '#EAEAEA';
    this.ctx.textAlign = 'right';
    const w = this.canvas.width / this.dpr;
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.fillText(`被吞噬: ${status.wormsEaten}`, w - padding - 10, padding + 20);
  }

  private drawPauseButton(status: GameStatus, mx: number, my: number) {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const btnX = w - 40;
    const btnY = h - 40;

    const isHover = (mx - btnX) ** 2 + (my - btnY) ** 2 < 400;

    this.ctx.beginPath();
    this.ctx.arc(btnX, btnY, 20, 0, Math.PI * 2);
    this.ctx.fillStyle = isHover ? '#888888' : '#555555';
    this.ctx.fill();
    this.ctx.strokeStyle = '#AAAAAA';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    if (status.state === 'paused') {
      this.ctx.beginPath();
      this.ctx.moveTo(btnX - 5, btnY - 8);
      this.ctx.lineTo(btnX + 8, btnY);
      this.ctx.lineTo(btnX - 5, btnY + 8);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      this.ctx.fillRect(btnX - 6, btnY - 7, 4, 14);
      this.ctx.fillRect(btnX + 2, btnY - 7, 4, 14);
    }
  }

  private drawPauseOverlay(w: number, h: number) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#EAEAEA';
    this.ctx.font = 'bold 48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⏸ 暂停', w / 2, h / 2 - 10);

    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.fillText('点击继续按钮或按空格键继续', w / 2, h / 2 + 30);
  }

  private drawGameOver(w: number, h: number, status: GameStatus, mx: number, my: number) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, w, h);

    const panelW = 340;
    const panelH = 280;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - panelH / 2;

    this.ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
    this.roundRect(px, py, panelW, panelH, 12);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(100, 100, 140, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.font = 'bold 32px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('💀 游戏结束', w / 2, py + 50);

    this.ctx.fillStyle = '#EAEAEA';
    this.ctx.font = '18px "Courier New", monospace';
    this.ctx.fillText(`到达关卡: ${status.level}`, w / 2, py + 90);
    this.ctx.fillText(`总用时: ${status.totalTime.toFixed(1)} 秒`, w / 2, py + 120);
    this.ctx.fillText(`沙虫吞噬: ${status.wormsEaten} 颗`, w / 2, py + 150);

    const btnX = w / 2;
    const btnY = py + 210;
    const btnW = 120;
    const btnH = 40;
    const isHover = mx >= btnX - btnW / 2 && mx <= btnX + btnW / 2 &&
                    my >= btnY - btnH / 2 && my <= btnY + btnH / 2;

    this.ctx.fillStyle = isHover ? '#6BBF59' : '#5A9F49';
    this.roundRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 18px "Courier New", monospace';
    this.ctx.fillText('🔄 重来', btnX, btnY + 6);
  }

  private drawLevelUpNotice(w: number, h: number, status: GameStatus) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 42px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`✨ 第 ${status.level} 关 ✨`, w / 2, h / 2);

    this.ctx.fillStyle = '#EAEAEA';
    this.ctx.font = '18px "Courier New", monospace';
    this.ctx.fillText('沙漏翻转中...', w / 2, h / 2 + 40);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
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
