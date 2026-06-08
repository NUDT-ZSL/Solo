import {
  CANVAS_WIDTH, CANVAS_HEIGHT, COLORS,
  Turret, Enemy, Laser, Fragment, Particle, LightningBolt, Star
} from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private shakeTime: number = 0;
  private shakeDuration: number = 0;
  private shakeIntensity: number = 0;
  private flashTime: number = 0;
  private flashDuration: number = 0;
  public gameTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = 0;
  }

  triggerFlash(duration: number): void {
    this.flashDuration = duration;
    this.flashTime = 0;
  }

  update(dt: number): void {
    if (this.shakeTime < this.shakeDuration) this.shakeTime += dt;
    if (this.flashTime < this.flashDuration) this.flashTime += dt;
    this.gameTime += dt;
  }

  clear(stars: Star[]): void {
    const ctx = this.ctx;
    ctx.save();

    let offX = 0, offY = 0;
    if (this.shakeTime < this.shakeDuration) {
      const ratio = 1 - this.shakeTime / this.shakeDuration;
      offX = (Math.random() - 0.5) * this.shakeIntensity * 2 * ratio;
      offY = (Math.random() - 0.5) * this.shakeIntensity * 2 * ratio;
    }
    ctx.translate(offX, offY);

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, COLORS.BG_TOP);
    grad.addColorStop(1, COLORS.BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#FFFFFF';
    for (const star of stars) {
      const alpha = star.getAlpha(this.gameTime);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.flashTime < this.flashDuration) {
      const ratio = 1 - this.flashTime / this.flashDuration;
      ctx.fillStyle = `rgba(255, 255, 255, ${ratio})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();
  }

  drawTurret(turret: Turret): void {
    const ctx = this.ctx;

    ctx.fillStyle = COLORS.TURRET_BASE;
    const halfW = turret.baseWidth / 2;
    const halfH = turret.baseHeight / 2;
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(turret.x - halfW + r, turret.y - halfH);
    ctx.lineTo(turret.x + halfW - r, turret.y - halfH);
    ctx.quadraticCurveTo(turret.x + halfW, turret.y - halfH, turret.x + halfW, turret.y - halfH + r);
    ctx.lineTo(turret.x + halfW, turret.y + halfH - r);
    ctx.quadraticCurveTo(turret.x + halfW, turret.y + halfH, turret.x + halfW - r, turret.y + halfH);
    ctx.lineTo(turret.x - halfW + r, turret.y + halfH);
    ctx.quadraticCurveTo(turret.x - halfW, turret.y + halfH, turret.x - halfW, turret.y + halfH - r);
    ctx.lineTo(turret.x - halfW, turret.y - halfH + r);
    ctx.quadraticCurveTo(turret.x - halfW, turret.y - halfH, turret.x - halfW + r, turret.y - halfH);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(turret.x, turret.y - 5);
    ctx.rotate(turret.angle);

    ctx.fillStyle = '#6C3483';
    ctx.fillRect(-3, -turret.barrelWidth / 2, turret.barrelLength + 3, turret.barrelWidth);

    ctx.fillStyle = COLORS.TURRET_BASE;
    ctx.fillRect(0, -turret.barrelWidth / 2, turret.barrelLength, turret.barrelWidth);

    ctx.fillStyle = '#BB8FCE';
    ctx.fillRect(turret.barrelLength - 3, -turret.barrelWidth / 2, 3, turret.barrelWidth);

    ctx.restore();
  }

  drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;

    for (let i = enemy.trail.length - 1; i >= 0; i--) {
      const t = enemy.trail[i];
      const alpha = (1 - i / enemy.trail.length) * 0.3;
      ctx.globalAlpha = alpha;
      this.drawEnemyShape(t.x, t.y, enemy);
    }
    ctx.globalAlpha = 1;

    if (enemy.hitFlash > 0) {
      ctx.fillStyle = '#FFFFFF';
    } else {
      ctx.fillStyle = enemy.color;
    }
    this.drawEnemyShape(enemy.x, enemy.y, enemy);
  }

  private drawEnemyShape(x: number, y: number, enemy: Enemy): void {
    const ctx = this.ctx;
    if (enemy.type === 'triangle') {
      const s = enemy.size;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.55);
      ctx.lineTo(x - s * 0.5, y + s * 0.4);
      ctx.lineTo(x + s * 0.5, y + s * 0.4);
      ctx.closePath();
      ctx.fill();
    } else {
      const sw = enemy.size;
      const sh = enemy.sizeY;
      ctx.beginPath();
      ctx.moveTo(x, y - sh * 0.5);
      ctx.lineTo(x + sw * 0.5, y);
      ctx.lineTo(x, y + sh * 0.5);
      ctx.lineTo(x - sw * 0.5, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawLaser(laser: Laser): void {
    const ctx = this.ctx;
    const endX = laser.x + Math.cos(laser.angle) * laser.length;
    const endY = laser.y + Math.sin(laser.angle) * laser.length;

    ctx.save();
    ctx.shadowColor = COLORS.LASER;
    ctx.shadowBlur = 4;
    ctx.strokeStyle = COLORS.LASER;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawFragment(frag: Fragment): void {
    const ctx = this.ctx;
    ctx.fillStyle = frag.color;
    ctx.beginPath();
    ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = p.getAlpha();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawLightning(bolt: LightningBolt): void {
    const ctx = this.ctx;
    const alpha = bolt.getAlpha();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS.LIGHTNING;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const branch of bolt.branches) {
      ctx.shadowColor = COLORS.LIGHTNING;
      ctx.shadowBlur = 10;
      ctx.lineWidth = branch.width + 2;
      ctx.beginPath();
      for (let i = 0; i < branch.points.length; i++) {
        const pt = branch.points[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.lineWidth = branch.width * 0.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < branch.points.length; i++) {
        const pt = branch.points[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.strokeStyle = COLORS.LIGHTNING;
    }

    ctx.restore();
  }

  drawHUD(score: number, energy: number, maxEnergy: number): void {
    const ctx = this.ctx;

    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';

    ctx.fillStyle = COLORS.TEXT_SHADOW;
    ctx.fillText(`SCORE: ${Math.floor(score)}`, 11, 11);
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.fillText(`SCORE: ${Math.floor(score)}`, 10, 10);

    const barX = 10;
    const barY = 30;
    const barW = 200;
    const barH = 12;

    ctx.fillStyle = COLORS.HUD_BG;
    ctx.fillRect(barX, barY, barW, barH);

    if (energy > 0) {
      const fillW = (energy / maxEnergy) * barW;
      const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, COLORS.ENERGY_GRAD_START);
      grad.addColorStop(1, COLORS.ENERGY_GRAD_END);
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, fillW, barH);
    }

    ctx.strokeStyle = COLORS.HUD_TEXT;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

    ctx.fillStyle = COLORS.TEXT_SHADOW;
    ctx.fillText('ENERGY', barX + 1, barY + barH + 3);
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.fillText('ENERGY', barX, barY + barH + 2);
  }
}
