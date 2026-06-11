import { clamp, lerp } from './gameObjects';

const FEEDBACK_CONFIG = {
  MIN_DAMAGE: 1,
  MAX_DAMAGE: 50,
  MIN_SHAKE: 1,
  MAX_SHAKE: 25,
  MIN_FLASH: 0.05,
  MAX_FLASH: 0.7,
  LOW_HP_THRESHOLD: 0.3,
  LOW_HP_MULTIPLIER: 1.8
} as const;

export class UIManager {
  private width: number;
  private height: number;
  private shakeIntensity: number;
  private shakeDecay: number;
  private redFlashAlpha: number;
  private redFlashDecay: number;
  private pulseTime: number;
  private currentHpPercent: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.shakeIntensity = 0;
    this.shakeDecay = 0.92;
    this.redFlashAlpha = 0;
    this.redFlashDecay = 0.95;
    this.pulseTime = 0;
    this.currentHpPercent = 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setHpPercent(hpPercent: number): void {
    this.currentHpPercent = clamp(hpPercent, 0, 1);
  }

  update(deltaTime: number): void {
    this.pulseTime += deltaTime;
    this.shakeIntensity *= this.shakeDecay;
    if (this.shakeIntensity < 0.05) this.shakeIntensity = 0;
    this.redFlashAlpha *= this.redFlashDecay;
    if (this.redFlashAlpha < 0.005) this.redFlashAlpha = 0;
  }

  triggerShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  triggerRedFlash(alpha: number): void {
    this.redFlashAlpha = Math.max(this.redFlashAlpha, alpha);
  }

  triggerDamageFeedback(damage: number): void {
    const { MIN_DAMAGE, MAX_DAMAGE, MIN_SHAKE, MAX_SHAKE, MIN_FLASH, MAX_FLASH, LOW_HP_THRESHOLD, LOW_HP_MULTIPLIER } = FEEDBACK_CONFIG;

    const clampedDamage = clamp(damage, MIN_DAMAGE, MAX_DAMAGE);
    const t = (clampedDamage - MIN_DAMAGE) / (MAX_DAMAGE - MIN_DAMAGE);

    let baseShake = lerp(MIN_SHAKE, MAX_SHAKE, t);
    let baseFlash = lerp(MIN_FLASH, MAX_FLASH, t);

    if (this.currentHpPercent < LOW_HP_THRESHOLD) {
      const hpFactor = 1 + (LOW_HP_MULTIPLIER - 1) * (1 - this.currentHpPercent / LOW_HP_THRESHOLD);
      baseShake *= hpFactor;
      baseFlash *= hpFactor;
    }

    this.triggerShake(baseShake);
    this.triggerRedFlash(baseFlash);
  }

  applyScreenShake(ctx: CanvasRenderingContext2D): void {
    if (this.shakeIntensity > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(offsetX, offsetY);
    }
  }

  applyRedFlash(ctx: CanvasRenderingContext2D): void {
    if (this.redFlashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 0, 0, ${this.redFlashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  drawHealthBar(ctx: CanvasRenderingContext2D, current: number, max: number): void {
    const barWidth = Math.min(400, this.width * 0.6);
    const barHeight = 20;
    const x = (this.width - barWidth) / 2;
    const y = 20;
    const padding = 4;

    const healthPercent = current / max;
    const urgency = 1 - healthPercent;
    const pulseSpeed = 4 + urgency * 8;
    const pulse = Math.sin(this.pulseTime * pulseSpeed) * 0.3 + 0.7;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.strokeStyle = `rgba(255, 69, 0, ${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 8 * pulse;
    ctx.strokeRect(x - padding, y - padding, barWidth + padding * 2, barHeight + padding * 2);

    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(x, y, barWidth, barHeight);

    const fillWidth = healthPercent * barWidth;
    const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
    if (healthPercent > 0.5) {
      gradient.addColorStop(0, '#ff6600');
      gradient.addColorStop(1, '#ff4500');
    } else if (healthPercent > 0.25) {
      gradient.addColorStop(0, '#ff8800');
      gradient.addColorStop(1, '#ff6600');
    } else {
      gradient.addColorStop(0, '#ff2200');
      gradient.addColorStop(1, '#cc0000');
    }
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 6 + urgency * 10;
    ctx.fillRect(x, y, fillWidth, barHeight);

    ctx.fillStyle = `rgba(255, 200, 100, ${0.3 * pulse})`;
    ctx.fillRect(x, y, fillWidth, barHeight / 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 4;
    ctx.fillText(`CORE: ${Math.ceil(current)} / ${max}`, x + barWidth / 2, y + barHeight / 2);

    ctx.restore();
  }

  drawScore(ctx: CanvasRenderingContext2D, score: number): void {
    const x = this.width - 20;
    const y = this.height - 25;
    const pulse = Math.sin(this.pulseTime * 3) * 0.2 + 0.8;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 6 * pulse;
    ctx.fillText(`SCORE: ${score.toString().padStart(8, '0')}`, x, y);
    ctx.restore();
  }

  drawWave(ctx: CanvasRenderingContext2D, wave: number, enemiesLeft: number, isBossWave: boolean): void {
    const x = 20;
    const y = this.height - 25;
    const pulse = Math.sin(this.pulseTime * 3) * 0.2 + 0.8;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const color = isBossWave ? '#ff4500' : '#39ff14';
    ctx.fillStyle = color;
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 * pulse;

    if (isBossWave) {
      ctx.fillText(`⚠ BOSS WAVE ${wave} ⚠`, x, y);
    } else {
      ctx.fillText(`WAVE: ${wave} | ENEMIES: ${enemiesLeft}`, x, y);
    }
    ctx.restore();
  }

  drawBossHealthBar(ctx: CanvasRenderingContext2D, current: number, max: number, shield: number, maxShield: number): void {
    const barWidth = Math.min(300, this.width * 0.4);
    const barHeight = 12;
    const x = (this.width - barWidth) / 2;
    const y = 55;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (maxShield > 0) {
      const shieldPercent = shield / maxShield;
      ctx.fillStyle = '#1a2a3a';
      ctx.fillRect(x, y - 10, barWidth, 6);
      ctx.fillStyle = '#64c8ff';
      ctx.shadowColor = '#64c8ff';
      ctx.shadowBlur = 4 + (1 - shieldPercent) * 6;
      ctx.fillRect(x, y - 10, barWidth * shieldPercent, 6);
    }

    const hpPercent = current / max;
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(x, y, barWidth, barHeight);

    const gradient = ctx.createLinearGradient(x, y, x + barWidth * hpPercent, y);
    gradient.addColorStop(0, '#ff2200');
    gradient.addColorStop(1, '#cc0000');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 6 + (1 - hpPercent) * 8;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.fillStyle = '#ff4500';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 4;
    ctx.fillText(`MOTHERSHIP: ${Math.ceil(current)} / ${max}`, x + barWidth / 2, y - 14);

    ctx.restore();
  }

  drawGameOver(ctx: CanvasRenderingContext2D, score: number, wave: number): void {
    const pulse = Math.sin(this.pulseTime * 2) * 0.3 + 0.7;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#ff4500';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 20 * pulse;
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);

    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.fillText(`FINAL SCORE: ${score}`, this.width / 2, this.height / 2);
    ctx.fillText(`WAVE REACHED: ${wave}`, this.width / 2, this.height / 2 + 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px "Courier New", monospace';
    ctx.shadowBlur = 0;
    ctx.fillText('CLICK TO RESTART', this.width / 2, this.height / 2 + 100);

    ctx.restore();
  }

  drawStartScreen(ctx: CanvasRenderingContext2D): void {
    const pulse = Math.sin(this.pulseTime * 2) * 0.3 + 0.7;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 15 * pulse;
    ctx.fillText('PIXEL PLANET DEFENSE', this.width / 2, this.height / 2 - 80);

    ctx.fillStyle = '#ff4500';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 8;
    ctx.fillText('PROTECT THE CORE FROM INVADERS', this.width / 2, this.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New", monospace';
    ctx.shadowBlur = 0;
    ctx.fillText('MOVE MOUSE TO AIM', this.width / 2, this.height / 2 + 20);
    ctx.fillText('CLICK OR HOLD TO FIRE', this.width / 2, this.height / 2 + 45);
    ctx.fillText('DESTROY ENEMIES TO SCORE POINTS', this.width / 2, this.height / 2 + 70);

    const textPulse = Math.sin(this.pulseTime * 4) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(57, 255, 20, ${textPulse})`;
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.fillText('CLICK TO START', this.width / 2, this.height / 2 + 130);

    ctx.restore();
  }

  drawWaveAnnouncement(ctx: CanvasRenderingContext2D, wave: number, isBoss: boolean, alpha: number): void {
    if (alpha <= 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;

    if (isBoss) {
      const pulse = Math.sin(this.pulseTime * 8) * 0.3 + 0.7;
      ctx.fillStyle = '#ff4500';
      ctx.font = 'bold 42px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20 * pulse;
      ctx.fillText('⚠ WARNING ⚠', this.width / 2, this.height / 2 - 30);
      ctx.fillText('MOTHERSHIP APPROACHING', this.width / 2, this.height / 2 + 30);
    } else {
      ctx.fillStyle = '#39ff14';
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 15;
      ctx.fillText(`WAVE ${wave}`, this.width / 2, this.height / 2);
    }

    ctx.restore();
  }

  drawFPS(ctx: CanvasRenderingContext2D, fps: number, particleCount: number, quality: number): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    let color = '#39ff14';
    if (particleCount > 200) color = '#ffaa00';
    if (quality <= 0) color = '#ff4500';

    ctx.fillStyle = color;
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = color;
    ctx.shadowBlur = 2;

    const qualityLabel = quality >= 2 ? 'HIGH' : quality === 1 ? 'MED' : 'LOW';
    ctx.fillText(`FPS: ${fps} | PARTICLES: ${particleCount} | QUALITY: ${qualityLabel}`, 10, 10);

    ctx.restore();
  }
}
