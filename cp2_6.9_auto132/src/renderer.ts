import { Entity, MovingPlatform, Missile, TimeGate, GhostFrame } from './entities';
import { TimeStatus, TimeMode } from './timeline';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  frameCount: number = 0;
  lastFpsTime: number = 0;
  fps: number = 60;

  borderGlowAlpha: number = 0;
  borderGlowColor: string = '#FFFFFF';
  borderGlowDecay: number = 0;

  gameState: 'playing' | 'win' | 'lose' = 'playing';
  winTimer: number = 0;
  loseTimer: number = 0;
  particles: Particle[] = [];
  lastMode: TimeMode = 'normal';

  shakeAmplitude: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  triggerBorderGlow(mode: TimeMode): void {
    this.borderGlowDecay = 30;
    this.borderGlowAlpha = 1;
    switch (mode) {
      case 'paused':
        this.borderGlowColor = '#555555';
        break;
      case 'rewind':
        this.borderGlowColor = '#FF8C00';
        break;
      case 'fastforward':
        this.borderGlowColor = '#00FF88';
        break;
      default:
        this.borderGlowAlpha = 0;
    }
  }

  triggerWin(): void {
    this.gameState = 'win';
    this.winTimer = 180;
    this.spawnParticles(100);
  }

  triggerLose(): void {
    this.gameState = 'lose';
    this.loseTimer = 120;
    this.shakeAmplitude = 5;
  }

  resetState(): void {
    this.gameState = 'playing';
    this.winTimer = 0;
    this.loseTimer = 0;
    this.particles = [];
    this.shakeAmplitude = 0;
  }

  private spawnParticles(count: number): void {
    const colors = ['#FFD700', '#FF6B6B', '#00FF88', '#4A90D9', '#FFFFFF'];
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 180,
        maxLife: 180,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
      });
    }
  }

  render(entities: Entity[], timeStatus: TimeStatus): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    if (timeStatus.mode !== this.lastMode) {
      if (timeStatus.mode !== 'normal') {
        this.triggerBorderGlow(timeStatus.mode);
      }
      this.lastMode = timeStatus.mode;
    }

    this.ctx.save();

    if (this.shakeAmplitude > 0) {
      const sx = (Math.random() - 0.5) * this.shakeAmplitude;
      const sy = (Math.random() - 0.5) * this.shakeAmplitude;
      this.ctx.translate(sx, sy);
      this.shakeAmplitude *= 0.9;
      if (this.shakeAmplitude < 0.1) this.shakeAmplitude = 0;
    }

    this.drawBackground();

    if (timeStatus.mode === 'fastforward') {
      this.ctx.save();
      this.ctx.globalAlpha = 0.2;
      this.drawEntities(entities, timeStatus, true);
      this.ctx.restore();
    }

    if (timeStatus.mode === 'rewind' || timeStatus.mode === 'fastforward') {
      this.drawGhostTrails(entities, timeStatus);
    }

    this.drawEntities(entities, timeStatus, false);
    this.drawHUD(timeStatus);
    this.drawControlTips();
    this.drawBorderGlow();
    this.drawParticles();
    this.drawGameOverlays();

    this.ctx.restore();

    if (this.gameState === 'win') {
      this.winTimer--;
    }
    if (this.gameState === 'lose') {
      this.loseTimer--;
    }
  }

  private drawBackground(): void {
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % this.width;
      const y = (i * 89) % this.height;
      const r = 0.5 + (i % 3) * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawEntities(entities: Entity[], timeStatus: TimeStatus, isBlur: boolean): void {
    entities.forEach((entity) => {
      switch (entity.type) {
        case 'platform':
          this.drawPlatform(entity as MovingPlatform, timeStatus, isBlur);
          break;
        case 'missile':
          this.drawMissile(entity as Missile, timeStatus, isBlur);
          break;
        case 'gate':
          this.drawGate(entity as TimeGate, timeStatus, isBlur);
          break;
      }
    });
  }

  private drawPlatform(
    platform: MovingPlatform,
    timeStatus: TimeStatus,
    isBlur: boolean
  ): void {
    const ctx = this.ctx;
    let x = platform.state.x;
    let y = platform.state.y;

    if (timeStatus.mode === 'paused' && !isBlur) {
      x += Math.sin(this.frameCount * 0.628) * 1;
      y += Math.cos(this.frameCount * 0.628) * 1;
    }

    ctx.save();
    if (isBlur) {
      ctx.globalAlpha = 0.2;
    }

    const color = timeStatus.mode === 'paused' ? '#555555' : '#4A90D9';
    ctx.fillStyle = color;

    const radius = 5;
    this.roundRect(ctx, x, y, platform.width, platform.height, radius);
    ctx.fill();

    if (platform.abnormalTimeFlow && timeStatus.mode !== 'paused' && !isBlur) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
      this.roundRect(ctx, x, y, platform.width, platform.height, radius);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawMissile(
    missile: Missile,
    timeStatus: TimeStatus,
    isBlur: boolean
  ): void {
    const ctx = this.ctx;
    const x = missile.state.x;
    const y = missile.state.y;

    ctx.save();
    if (isBlur) {
      ctx.globalAlpha = 0.2;
    }

    if (timeStatus.mode !== 'paused' && !isBlur) {
      this.drawMissileTrail(missile);
    }

    let color = timeStatus.mode === 'paused' ? '#555555' : '#FF6B6B';
    ctx.fillStyle = color;

    if (timeStatus.mode === 'paused' && !isBlur) {
      const jx = x + Math.sin(this.frameCount * 0.628) * 1;
      const jy = y + Math.cos(this.frameCount * 0.628) * 1;
      ctx.beginPath();
      ctx.arc(jx, jy, missile.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, missile.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (missile.abnormalTimeFlow && timeStatus.mode !== 'paused' && !isBlur) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, missile.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawMissileTrail(missile: Missile): void {
    const ctx = this.ctx;
    const trailLength = 20;
    const ghosts = missile.ghostFrames;

    if (ghosts.length < 2) return;

    const start = Math.max(0, ghosts.length - trailLength);
    for (let i = start; i < ghosts.length - 1; i++) {
      const t = (i - start) / trailLength;
      const alpha = t * 0.8;
      const g1 = ghosts[i].state;
      const g2 = ghosts[i + 1].state;

      const gradient = ctx.createLinearGradient(g1.x, g1.y, g2.x, g2.y);
      gradient.addColorStop(0, `rgba(255, 107, 107, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(255, 107, 107, ${alpha})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4 * t;
      ctx.beginPath();
      ctx.moveTo(g1.x, g1.y);
      ctx.lineTo(g2.x, g2.y);
      ctx.stroke();
    }
  }

  private drawGate(gate: TimeGate, timeStatus: TimeStatus, isBlur: boolean): void {
    const ctx = this.ctx;
    const x = gate.state.x;
    const y = gate.state.y;

    ctx.save();
    if (isBlur) {
      ctx.globalAlpha = 0.2;
    }

    const openColor = '#00FF88';
    const closedColor = '#FF3333';
    const progress = gate.openProgress;

    const r = Math.floor(
      parseInt(closedColor.slice(1, 3), 16) * (1 - progress) +
        parseInt(openColor.slice(1, 3), 16) * progress
    );
    const g = Math.floor(
      parseInt(closedColor.slice(3, 5), 16) * (1 - progress) +
        parseInt(openColor.slice(3, 5), 16) * progress
    );
    const b = Math.floor(
      parseInt(closedColor.slice(5, 7), 16) * (1 - progress) +
        parseInt(openColor.slice(5, 7), 16) * progress
    );

    let fillColor = `rgb(${r}, ${g}, ${b})`;
    if (timeStatus.mode === 'paused') fillColor = '#555555';

    ctx.fillStyle = fillColor;

    if (timeStatus.mode === 'paused' && !isBlur) {
      const jx = x + Math.sin(this.frameCount * 0.628) * 1;
      const jy = y + Math.cos(this.frameCount * 0.628) * 1;
      ctx.fillRect(jx, jy, gate.width, gate.height);
    } else {
      ctx.fillRect(x, y, gate.width, gate.height);
    }

    if (gate.abnormalTimeFlow && timeStatus.mode !== 'paused' && !isBlur) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
      ctx.strokeRect(x, y, gate.width, gate.height);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawGhostTrails(entities: Entity[], timeStatus: TimeStatus): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    entities.forEach((entity) => {
      const ghosts = entity.ghostFrames;
      if (ghosts.length < 2) return;

      const step = Math.max(1, Math.floor(ghosts.length / 30));
      const visibleGhosts: GhostFrame[] = [];
      for (let i = 0; i < ghosts.length; i += step) {
        visibleGhosts.push(ghosts[i]);
      }
      if (visibleGhosts[visibleGhosts.length - 1] !== ghosts[ghosts.length - 1]) {
        visibleGhosts.push(ghosts[ghosts.length - 1]);
      }

      let blinkAlpha = 0.3;
      if (timeStatus.mode === 'rewind') {
        blinkAlpha = 0.2 + Math.abs(Math.sin(this.frameCount * 0.2)) * 0.2;
      }

      for (let i = 0; i < visibleGhosts.length; i++) {
        const ghost = visibleGhosts[i];
        const alpha = (i / visibleGhosts.length) * blinkAlpha;

        ctx.save();
        ctx.globalAlpha = alpha;

        switch (entity.type) {
          case 'platform': {
            const p = entity as MovingPlatform;
            ctx.fillStyle = '#4A90D9';
            this.roundRect(ctx, ghost.state.x, ghost.state.y, p.width, p.height, 5);
            ctx.fill();
            break;
          }
          case 'missile': {
            const m = entity as Missile;
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(ghost.state.x, ghost.state.y, m.radius, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'gate': {
            const g = entity as TimeGate;
            ctx.fillStyle = ghost.state.extra?.isOpen ? '#00FF88' : '#FF3333';
            ctx.fillRect(ghost.state.x, ghost.state.y, g.width, g.height);
            break;
          }
        }

        ctx.restore();
      }
    });

    ctx.restore();
  }

  private drawHUD(timeStatus: TimeStatus): void {
    const ctx = this.ctx;
    const padding = 15;
    const startX = padding;
    const startY = padding;
    const barWidth = 200;
    const barHeight = 12;

    ctx.save();
    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    this.roundRect(ctx, startX - 5, startY - 5, 240, 90, 8);
    ctx.fill();

    this.drawShadowText(ctx, `时间流速: ${timeStatus.timeScale.toFixed(1)}x`, startX, startY);

    const barY = startY + 25;
    ctx.fillStyle = '#0A0A1A';
    this.roundRect(ctx, startX, barY, barWidth, barHeight, 3);
    ctx.fill();

    let barColor = '#FFFFFF';
    let progress = 0;
    if (timeStatus.mode === 'paused') {
      barColor = '#888888';
      progress = 1;
    } else if (timeStatus.mode === 'rewind') {
      barColor = '#FF8C00';
      progress = timeStatus.rewindRemaining / timeStatus.rewindTotal;
    } else if (timeStatus.mode === 'fastforward') {
      barColor = '#00FF88';
      progress = timeStatus.fastForwardRemaining / timeStatus.fastForwardTotal;
    } else {
      barColor = '#4A90D9';
      progress = 1 - timeStatus.totalGameTime / timeStatus.timeLimit;
    }

    if (progress > 0) {
      ctx.fillStyle = barColor;
      this.roundRect(ctx, startX, barY, barWidth * Math.max(0, Math.min(1, progress)), barHeight, 3);
      ctx.fill();
    }

    const ghostCount = timeStatus.snapshotCount;
    this.drawShadowText(ctx, `残影数量: ${ghostCount}`, startX, barY + barHeight + 8);
    this.drawShadowText(ctx, `FPS: ${this.fps}`, startX, barY + barHeight + 28);

    if (timeStatus.mode === 'rewind') {
      const seconds = Math.ceil(timeStatus.rewindRemaining / 60);
      this.drawShadowText(ctx, `倒退剩余: ${seconds}s`, startX, barY + barHeight + 48, '#FF8C00');
    }

    if (timeStatus.mode === 'fastforward') {
      const iconX = startX + 155;
      const iconY = barY + barHeight + 48;
      const pulse = 0.5 + Math.abs(Math.sin(this.frameCount * 0.15)) * 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 136, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(iconX, iconY + 7);
      ctx.lineTo(iconX + 12, iconY + 7);
      ctx.lineTo(iconX + 6, iconY);
      ctx.moveTo(iconX + 8, iconY + 7);
      ctx.lineTo(iconX + 20, iconY + 7);
      ctx.lineTo(iconX + 14, iconY);
      ctx.fill();
      ctx.restore();
      this.drawShadowText(ctx, `加速中`, iconX + 28, iconY, '#00FF88');
    }

    ctx.restore();
  }

  private drawControlTips(): void {
    const ctx = this.ctx;
    const tips = [
      ['空格', '暂停时间'],
      ['Z键', '倒退5秒'],
      ['X键', '2倍加速'],
    ];

    ctx.save();
    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';

    const padding = 10;
    const lineHeight = 22;
    const boxWidth = 160;
    const boxHeight = tips.length * lineHeight + padding * 2 - 4;
    const boxX = this.width - boxWidth - 15;
    const boxY = 15;

    ctx.fillStyle = 'rgba(34, 34, 68, 0.8)';
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();

    tips.forEach((tip, i) => {
      const y = boxY + padding + i * lineHeight;
      this.drawShadowText(ctx, `[${tip[0]}]`, boxX + padding, y, '#FFD700');
      this.drawShadowText(ctx, tip[1], boxX + padding + 55, y);
    });

    ctx.restore();
  }

  private drawBorderGlow(): void {
    if (this.borderGlowAlpha <= 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.borderGlowAlpha;
    ctx.strokeStyle = this.borderGlowColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.borderGlowColor;
    ctx.shadowBlur = 15;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
    ctx.restore();

    if (this.borderGlowDecay > 0) {
      this.borderGlowDecay--;
      if (this.borderGlowDecay <= 0) {
        this.borderGlowAlpha = Math.max(0, this.borderGlowAlpha - 0.03);
      }
    } else {
      this.borderGlowAlpha = Math.max(0, this.borderGlowAlpha - 0.02);
    }
  }

  private drawParticles(): void {
    if (this.particles.length === 0) return;

    const ctx = this.ctx;
    const toRemove: number[] = [];

    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;

      if (p.life <= 0) {
        toRemove.push(i);
        return;
      }

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  private drawGameOverlays(): void {
    if (this.gameState === 'playing') return;

    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameState === 'win') {
      const progress = 1 - this.winTimer / 180;
      const scale = Math.min(1.5, 0.3 + progress * 1.5);
      const rotation = progress * Math.PI * 4;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillText('TIME CAPTURED', 0, 0);
      ctx.restore();
    } else if (this.gameState === 'lose') {
      const shake = Math.sin(this.frameCount * 0.5) * 3;
      ctx.save();
      ctx.translate(centerX + shake, centerY);
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FF3333';
      ctx.shadowColor = '#FF3333';
      ctx.shadowBlur = 20;
      ctx.fillText('TIME OUT', 0, 0);

      ctx.font = '18px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 0;
      ctx.fillText('按 R 键重新开始', 0, 50);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawShadowText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string = '#FFFFFF'
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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
}
