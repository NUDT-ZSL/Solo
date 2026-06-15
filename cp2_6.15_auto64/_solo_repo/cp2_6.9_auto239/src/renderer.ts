import {
  Submarine,
  Cruiser,
  SonarWave,
  Torpedo,
  Decoy,
  BubbleParticle,
  FireParticle
} from './entities';

export type GameState = 'playing' | 'victory' | 'defeat';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number = 0;
  height: number = 0;
  waveTime: number = 0;
  victoryScale: number = 0;
  victoryTime: number = 0;
  defeatFade: number = 0;
  defeatTime: number = 0;
  smokeParticles: SmokeParticle[] = [];
  sparkParticles: SparkParticle[] = [];
  redFlashAlpha: number = 0;
  targetProgress: number = 0;
  currentProgress: number = 0;
  progressAnimTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas 2D context');
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground() {
    const gradient = this.ctx.createRadialGradient(
      this.width * 0.65, this.height * 0.6, 0,
      this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height)
    );
    gradient.addColorStop(0, '#002244');
    gradient.addColorStop(1, '#001122');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawWaterWaves(deltaTime: number) {
    this.waveTime += deltaTime;

    const baseY1 = this.height - 30;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    for (let x = 0; x <= this.width; x += 4) {
      const y = baseY1 + Math.sin(x * 0.02 + this.waveTime * 1.5) * 8;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(0, 51, 102, 0.35)';
    this.ctx.fill();

    const baseY2 = this.height - 20;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    for (let x = 0; x <= this.width; x += 4) {
      const y = baseY2 + Math.sin(x * 0.03 + this.waveTime * 1.5 + Math.PI / 2) * 5;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(0, 68, 136, 0.35)';
    this.ctx.fill();

    const bottomY = this.height - 5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    for (let x = 0; x <= this.width; x += 3) {
      const amp = 5 + Math.sin(x * 0.005) * 10;
      const y = bottomY + Math.sin(x * (2 * Math.PI / 300) + this.waveTime * 0.8) * amp;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(0, 80, 150, 0.25)';
    this.ctx.fill();
  }

  drawSubmarine(sub: Submarine) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(sub.x, sub.y);

    for (const bubble of sub.bubbleParticles) {
      this.drawBubble(bubble);
    }

    ctx.save();
    ctx.translate(-sub.width / 2 - 2, 0);
    ctx.save();
    ctx.rotate(sub.propellerAngle);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    ctx.fillStyle = '#224466';
    ctx.strokeStyle = '#446688';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, sub.width / 2, sub.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1A3350';
    ctx.beginPath();
    ctx.moveTo(-sub.width / 2 - 3, -sub.height / 2 + 3);
    ctx.lineTo(-sub.width / 2 - 3, sub.height / 2 - 3);
    ctx.lineTo(-sub.width / 2 + 8, sub.height / 2);
    ctx.lineTo(-sub.width / 2 + 8, -sub.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-sub.width / 2 - 3, -sub.height / 2 + 3);
    ctx.lineTo(-sub.width / 2 - 3, sub.height / 2 - 3);
    ctx.lineTo(-sub.width / 2 + 8, sub.height / 2);
    ctx.lineTo(-sub.width / 2 + 8, -sub.height / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#1A3350';
    ctx.beginPath();
    ctx.moveTo(-sub.width / 2 - 3, -sub.height / 2 + 3);
    ctx.lineTo(-sub.width / 2 - 3, -sub.height / 2 - 6);
    ctx.lineTo(-sub.width / 2 + 8, -sub.height / 2 - 6);
    ctx.lineTo(-sub.width / 2 + 8, -sub.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-sub.width / 2 - 3, sub.height / 2 - 3);
    ctx.lineTo(-sub.width / 2 - 3, sub.height / 2 + 6);
    ctx.lineTo(-sub.width / 2 + 8, sub.height / 2 + 6);
    ctx.lineTo(-sub.width / 2 + 8, sub.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#335577';
    ctx.beginPath();
    ctx.ellipse(5, -sub.height / 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5577AA';
    ctx.stroke();

    const glowColor = 'rgba(0, 255, 153, 0.6)';
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(15, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -sub.height / 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-20, sub.height / 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00FF99';
    ctx.beginPath();
    ctx.arc(15, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawBubble(bubble: BubbleParticle) {
    this.ctx.beginPath();
    this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha})`;
    this.ctx.fill();
  }

  drawCruiser(cruiser: Cruiser) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cruiser.x, cruiser.y);

    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.fillRect(-cruiser.width / 2, -cruiser.height / 2, cruiser.width, cruiser.height);
    ctx.strokeRect(-cruiser.width / 2, -cruiser.height / 2, cruiser.width, cruiser.height);

    ctx.fillStyle = '#222222';
    ctx.fillRect(-cruiser.width / 4, -cruiser.height / 2 - 15, cruiser.width / 2, 15);
    ctx.strokeRect(-cruiser.width / 4, -cruiser.height / 2 - 15, cruiser.width / 2, 15);

    ctx.fillStyle = '#444444';
    for (let i = 0; i < 4; i++) {
      const wx = -cruiser.width / 2 + 15 + i * 28;
      ctx.fillRect(wx, -cruiser.height / 2 + 10, 15, 10);
    }

    ctx.fillStyle = '#FF3300';
    const dir = cruiser.fromLeft ? 1 : -1;
    ctx.beginPath();
    ctx.arc(cruiser.width / 2 * dir, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawSonarWave(wave: SonarWave) {
    this.ctx.beginPath();
    this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(100, 180, 255, ${wave.alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(wave.x, wave.y, wave.radius * 0.85, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(100, 180, 255, ${wave.alpha * 0.4})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  drawTorpedo(torpedo: Torpedo) {
    const ctx = this.ctx;

    for (const p of torpedo.fireParticles) {
      this.drawFireParticle(p);
    }

    ctx.save();
    ctx.translate(torpedo.x, torpedo.y);
    ctx.rotate(torpedo.angle);

    ctx.fillStyle = '#FFCC00';
    ctx.strokeStyle = '#FF9900';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(torpedo.length / 2, 0);
    ctx.lineTo(torpedo.length / 4, -torpedo.width / 2);
    ctx.lineTo(-torpedo.length / 2, -torpedo.width / 2);
    ctx.lineTo(-torpedo.length / 2, torpedo.width / 2);
    ctx.lineTo(torpedo.length / 4, torpedo.width / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF6600';
    ctx.beginPath();
    ctx.moveTo(torpedo.length / 2, 0);
    ctx.lineTo(torpedo.length / 4, -torpedo.width / 2);
    ctx.lineTo(torpedo.length / 4, torpedo.width / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawFireParticle(p: FireParticle) {
    const alpha = p.life / p.maxLife;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
    this.ctx.fillStyle = p.color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  drawDecoy(decoy: Decoy) {
    if (!decoy.visible) return;
    const alpha = 0.4 + 0.4 * Math.sin(decoy.elapsed * 10);
    this.ctx.beginPath();
    this.ctx.arc(decoy.x, decoy.y, decoy.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(decoy.x, decoy.y, decoy.radius * 1.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.3})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  drawUI(health: number, maxHealth: number, wave: number, totalWaves: number, score: number) {
    this.drawHealthIndicator(health, maxHealth);
    this.drawWaveProgress(wave, totalWaves);
    this.drawScore(score);
  }

  drawHealthIndicator(health: number, maxHealth: number) {
    const ctx = this.ctx;
    const x = 20;
    const y = 20;
    const iconSize = 20;
    const gap = 8;
    const panelWidth = maxHealth * iconSize + (maxHealth - 1) * gap + 24;
    const panelHeight = iconSize + 20;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(204, 204, 204, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < maxHealth; i++) {
      const ix = x + 12 + i * (iconSize + gap);
      const iy = y + 10;
      ctx.beginPath();
      ctx.arc(ix + iconSize / 2, iy + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      if (i < health) {
        ctx.fillStyle = '#00FF66';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00FF66';
      } else {
        ctx.fillStyle = '#444444';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  drawWaveProgress(wave: number, totalWaves: number) {
    const ctx = this.ctx;
    const barWidth = 120;
    const barHeight = 12;
    const panelWidth = barWidth + 100;
    const panelHeight = 40;
    const x = this.width - panelWidth - 20;
    const y = 20;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(204, 204, 204, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`波次 ${wave}/${totalWaves}`, x + 12, y + panelHeight / 2);

    const barX = x + 78;
    const barY = y + (panelHeight - barHeight) / 2;

    this.targetProgress = wave / totalWaves;
    if (this.currentProgress < this.targetProgress) {
      this.progressAnimTime += 1 / 60;
      const t = Math.min(this.progressAnimTime / 0.3, 1);
      const eased = this.easeOutElastic(t);
      this.currentProgress = Math.min(this.targetProgress, eased * this.targetProgress);
    }

    ctx.beginPath();
    this.roundRect(barX, barY, barWidth, barHeight, 6);
    ctx.fillStyle = '#333333';
    ctx.fill();

    const fillWidth = Math.max(0, barWidth * this.currentProgress);
    if (fillWidth > 0) {
      ctx.beginPath();
      this.roundRect(barX, barY, fillWidth, barHeight, 6);
      ctx.fillStyle = '#00AABB';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00AABB';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  drawScore(score: number) {
    const ctx = this.ctx;
    const panelWidth = 100;
    const panelHeight = 36;
    const x = 20;
    const y = 55;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(204, 204, 204, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`得分: ${score}`, x + 12, y + panelHeight / 2);
    ctx.restore();
  }

  roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
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

  easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  drawRedFlash(deltaTime: number, exposed: boolean) {
    if (exposed) {
      this.redFlashAlpha = 0.15;
    }
    if (this.redFlashAlpha > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 0, 0, ${this.redFlashAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
      this.redFlashAlpha = Math.max(0, this.redFlashAlpha - deltaTime * 1.5);
    }
  }

  drawVictoryScreen(deltaTime: number) {
    this.victoryTime += deltaTime;

    if (this.victoryScale < 1) {
      const t = Math.min(this.victoryTime / 0.5, 1);
      this.victoryScale = this.easeOutElastic(t);
    }

    if (Math.random() < 0.3) {
      this.sparkParticles.push(new SparkParticle(this.width, this.height));
    }

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 20, 60, 0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const s of this.sparkParticles) {
      s.update(deltaTime);
      this.ctx.beginPath();
      this.ctx.moveTo(s.x1, s.y1);
      this.ctx.lineTo(s.x2, s.y2);
      this.ctx.strokeStyle = `rgba(100, 200, 255, ${s.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    this.sparkParticles = this.sparkParticles.filter(s => s.life > 0);

    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.victoryScale, this.victoryScale);
    this.ctx.font = 'bold 64px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.fillText('任务完成', 0, 0);
    this.ctx.shadowBlur = 0;
    this.ctx.restore();

    this.ctx.font = '18px "Microsoft YaHei", sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('按 R 键重新开始', this.width / 2, this.height / 2 + 60);

    this.ctx.restore();
  }

  drawDefeatScreen(deltaTime: number) {
    this.defeatTime += deltaTime;
    this.defeatFade = Math.min(this.defeatTime / 1, 1);

    if (Math.random() < 0.5) {
      this.smokeParticles.push(new SmokeParticle(this.width / 2, this.height / 2 + 40));
    }

    this.ctx.save();
    this.ctx.fillStyle = `rgba(80, 0, 0, ${0.7 * this.defeatFade})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const s of this.smokeParticles) {
      s.update(deltaTime);
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(120, 120, 120, ${s.alpha})`;
      this.ctx.fill();
    }
    this.smokeParticles = this.smokeParticles.filter(s => s.life > 0);

    this.ctx.font = 'bold 56px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#888888';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#000000';
    this.ctx.fillText('潜艇沉没', this.width / 2, this.height / 2 - 20);
    this.ctx.shadowBlur = 0;

    this.ctx.font = '18px "Microsoft YaHei", sans-serif';
    this.ctx.fillStyle = '#CCCCCC';
    this.ctx.fillText('按 R 键重新开始', this.width / 2, this.height / 2 + 60);

    this.ctx.restore();
  }

  drawRestartButton() {
    const btnWidth = 140;
    const btnHeight = 44;
    const x = this.width / 2 - btnWidth / 2;
    const y = this.height - 70;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.strokeStyle = 'rgba(204, 204, 204, 0.3)';
    this.ctx.lineWidth = 1;
    this.roundRect(x, y, btnWidth, btnHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('重新开始 (R)', this.width / 2, y + btnHeight / 2);
    this.ctx.restore();
  }

  drawInstructions() {
    const panelWidth = 260;
    const panelHeight = 130;
    const x = 20;
    const y = this.height - panelHeight - 20;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.strokeStyle = 'rgba(204, 204, 204, 0.25)';
    this.ctx.lineWidth = 1;
    this.roundRect(x, y, panelWidth, panelHeight, 10);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '13px "Microsoft YaHei", sans-serif';
    this.ctx.textBaseline = 'top';
    const lines = [
      '操作说明:',
      'A/D 或 ←/→ : 左右移动',
      'W/S 或 ↑/↓ : 上浮/下潜',
      '空格键 : 释放声呐诱饵',
      'R 键 : 重新开始游戏'
    ];
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], x + 14, y + 10 + i * 22);
    }
    this.ctx.restore();
  }

  resetAnimations() {
    this.victoryScale = 0;
    this.victoryTime = 0;
    this.defeatFade = 0;
    this.defeatTime = 0;
    this.smokeParticles = [];
    this.sparkParticles = [];
    this.redFlashAlpha = 0;
    this.currentProgress = 0;
    this.progressAnimTime = 0;
  }
}

class SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  alpha: number;

  constructor(x: number, y: number) {
    this.x = x + (Math.random() - 0.5) * 60;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = -0.3 - Math.random() * 0.5;
    this.radius = 8 + Math.random() * 12;
    this.maxLife = 80 + Math.random() * 60;
    this.life = this.maxLife;
    this.alpha = 0.4;
  }

  update(deltaTime: number) {
    this.x += this.vx;
    this.y += this.vy;
    this.vx += (Math.random() - 0.5) * 0.02;
    this.radius += 0.05;
    this.life -= deltaTime * 60;
    this.alpha = (this.life / this.maxLife) * 0.4;
  }
}

class SparkParticle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  alpha: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    const angle = Math.random() * Math.PI * 2;
    const length = 15 + Math.random() * 35;
    this.x1 = canvasWidth / 2 + (Math.random() - 0.5) * 300;
    this.y1 = canvasHeight / 2 + (Math.random() - 0.5) * 150;
    this.x2 = this.x1 + Math.cos(angle) * length;
    this.y2 = this.y1 + Math.sin(angle) * length;
    this.maxLife = 0.15 + Math.random() * 0.2;
    this.life = this.maxLife;
    this.alpha = 0.9;
  }

  update(deltaTime: number) {
    this.life -= deltaTime;
    this.alpha = (this.life / this.maxLife) * 0.9;
  }
}
