export interface HUDState {
  score: number;
  combo: number;
  maxCombo: number;
  bpm: number;
  scrollSpeed: number;
  baseScrollSpeed: number;
  comboMilestoneReached: boolean;
  comboLightbandTime: number;
  comboLightbandBroken: boolean;
}

export class HUD {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private hudFlashTimer: number = 0;
  private readonly hudFlashDuration: number = 200;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  triggerComboFlash(): void {
    this.hudFlashTimer = this.hudFlashDuration;
  }

  render(state: HUDState, dt: number): void {
    const ctx = this.ctx;
    const scale = this.width / 320;
    const padding = Math.max(8, 12 * scale);

    if (this.hudFlashTimer > 0) {
      this.hudFlashTimer -= dt * 1000;
      const flashProgress = this.hudFlashTimer / this.hudFlashDuration;
      const glowAlpha = flashProgress * 0.5;
      ctx.save();
      ctx.globalAlpha = glowAlpha;
      const gradient = ctx.createRadialGradient(
        this.width / 2, 0, 0,
        this.width / 2, 0, this.width * 0.6
      );
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      ctx.globalAlpha = 1.0;
    }

    this.renderLightband(state);

    ctx.globalAlpha = 1.0;
    ctx.font = `bold ${Math.max(12, 16 * scale)}px "Courier New", monospace`;
    ctx.textBaseline = 'top';

    const scoreLabel = 'SCORE';
    const scoreValue = state.score.toString().padStart(6, '0');
    const labelColor = '#0f3460';
    const valueColor = '#e94560';

    ctx.fillStyle = labelColor;
    ctx.fillText(scoreLabel, padding, padding);
    ctx.fillStyle = valueColor;
    ctx.fillText(scoreValue, padding, padding + Math.max(14, 18 * scale));

    const bpmText = `BPM ${state.bpm}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = labelColor;
    ctx.fillText(bpmText, this.width / 2, padding);
    ctx.textAlign = 'left';

    ctx.textAlign = 'right';
    const comboLabel = 'COMBO';
    const comboValue = `x${state.combo}`;
    ctx.fillStyle = labelColor;
    ctx.fillText(comboLabel, this.width - padding, padding);

    if (state.combo >= 10) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    } else if (state.combo >= 5) {
      ctx.fillStyle = '#e94560';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.font = `bold ${Math.max(16, 22 * scale)}px "Courier New", monospace`;
    ctx.fillText(comboValue, this.width - padding, padding + Math.max(14, 18 * scale));
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1.0;

    this.renderSpeedBar(state, scale, padding);
    ctx.globalAlpha = 1.0;
  }

  private renderLightband(state: HUDState): void {
    const ctx = this.ctx;
    if (state.comboLightbandTime <= 0) return;
    const duration = 300;
    const progress = Math.max(0, state.comboLightbandTime / duration);

    if (state.comboLightbandBroken) {
      const shatterProgress = 1 - progress;
      const pieces = 8;
      for (let i = 0; i < pieces; i++) {
        const offset = (i / pieces) * this.width;
        const x = (shatterProgress > 0.5 ? 1 : -1) * offset * shatterProgress * 2;
        const y = 30 * Math.sin(i + shatterProgress * 10);
        ctx.globalAlpha = progress * 0.8;
        ctx.fillStyle = this.hueColor(i * 30 + shatterProgress * 360);
        ctx.fillRect(
          this.width / 2 - (this.width / pieces / 2) + x,
          4 + y,
          this.width / pieces - 4,
          4
        );
      }
    } else {
      const bandWidth = this.width * progress;
      const colors = ['#ff3b6b', '#ff8c42', '#ffd23f', '#06d6a0', '#118ab2', '#9d4edd'];
      const segmentWidth = bandWidth / colors.length;
      for (let i = 0; i < colors.length; i++) {
        const leftT = i / colors.length;
        const expandLeft = (this.width / 2 - bandWidth / 2) + leftT * bandWidth;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = colors[i];
        ctx.fillRect(expandLeft, 0, segmentWidth + 1, 6);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  private hueColor(hue: number): string {
    const h = ((hue % 360) + 360) % 360;
    return `hsl(${h}, 90%, 60%)`;
  }

  private renderSpeedBar(state: HUDState, scale: number, padding: number): void {
    const ctx = this.ctx;
    const barWidth = Math.max(80, 120 * scale);
    const barHeight = Math.max(6, 8 * scale);
    const x = padding;
    const y = this.height - padding - barHeight;

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'rgba(15, 52, 96, 0.6)';
    ctx.fillRect(x, y, barWidth, barHeight);

    const speedRatio = Math.min(2.0, state.scrollSpeed / state.baseScrollSpeed);
    const fillWidth = Math.min(barWidth, barWidth * (speedRatio / 2));
    const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
    gradient.addColorStop(0, '#e94560');
    gradient.addColorStop(0.5, '#ffb400');
    gradient.addColorStop(1, '#06d6a0');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, fillWidth, barHeight);

    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.globalAlpha = 1.0;
  }

  renderMenuSnowflakes(ctx: CanvasRenderingContext2D, particles: Array<{ x: number; y: number; vy: number; vx: number; alpha: number }>, width: number, height: number): void {
    const size = 16;
    ctx.globalAlpha = 1.0;
    for (const p of particles) {
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.fillStyle = '#ffffff';
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      ctx.fillRect(px + 4, py, 8, 2);
      ctx.fillRect(px + 2, py + 2, 12, 2);
      ctx.fillRect(px, py + 4, 16, 2);
      ctx.fillRect(px + 2, py + 6, 12, 2);
      ctx.fillRect(px + 4, py + 8, 8, 2);
      ctx.fillRect(px + 6, py + 10, 4, 2);
    }
    ctx.globalAlpha = 1.0;

    for (const p of particles) {
      p.y += p.vy;
      p.x += p.vx;
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      if (p.x > width + 20) p.x = -20;
      if (p.x < -20) p.x = width + 20;
    }
  }
}
