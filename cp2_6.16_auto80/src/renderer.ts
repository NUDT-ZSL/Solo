// ===== 渲染模块：飞船、子弹、特效、脉冲边框 =====
import type { Player, PlayerStats, Bullet, EngineParticle } from './player';

const CANVAS_W = 800;
const CANVAS_H = 600;

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number = CANVAS_W;
  height: number = CANVAS_H;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ===== 绘制三角形飞船 + 尾焰 =====
  drawPlayer(player: Player): void {
    const ctx = this.ctx;
    const stats = player.getStats();

    // 先画引擎尾焰粒子（在飞船下方）
    this.drawEngineParticles(player.engineParticles);

    // 减速力场（如果激活）
    if (stats.slowField.active) {
      const alpha = Math.max(0, stats.slowField.duration / stats.slowField.maxDuration);
      // 半透明蓝圆 #00bfff40
      ctx.save();
      ctx.fillStyle = `rgba(0, 191, 255, ${(0.25 * alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(stats.slowField.x, stats.slowField.y, stats.slowField.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(0, 191, 255, ${(0.7 * alpha).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 飞船三角形（边长 40px）
    ctx.save();
    ctx.translate(stats.x, stats.y);
    ctx.rotate(stats.angle);

    // 外发光
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(0, 212, 255, 0.85)';

    // 三角形（尖端朝右 angle=0），边长 40 -> 外接圆半径约 23.09
    const R = 23.09;
    ctx.beginPath();
    ctx.moveTo(R, 0);                                  // 尖端
    ctx.lineTo(-R * 0.5, R * Math.sqrt(3) / 2);        // 左下
    ctx.lineTo(-R * 0.5, -R * Math.sqrt(3) / 2);       // 右下
    ctx.closePath();
    // 主体 #00d4ff
    ctx.fillStyle = '#00d4ff';
    ctx.fill();
    ctx.shadowBlur = 0;
    // 深色内描边
    ctx.strokeStyle = '#0089b0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 驾驶舱高光
    ctx.beginPath();
    ctx.arc(R * 0.15, 0, R * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    // 机翼深色
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, R * Math.sqrt(3) / 2);
    ctx.lineTo(-R * 0.85, R * 0.25);
    ctx.lineTo(-R * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 120, 160, 0.85)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, -R * Math.sqrt(3) / 2);
    ctx.lineTo(-R * 0.85, -R * 0.25);
    ctx.lineTo(-R * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ===== 引擎尾焰粒子 =====
  drawEngineParticles(particles: EngineParticle[]): void {
    const ctx = this.ctx;
    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];
      if (!p.active) continue;
      const a = Math.max(0, p.life / p.maxLife);
      // 从白黄 -> 橙 -> 透明
      let color: string;
      if (a > 0.6) color = `rgba(255, 240, 180, ${a})`;
      else if (a > 0.3) color = `rgba(255, 180, 80, ${a})`;
      else color = `rgba(255, 100, 50, ${a})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ===== 子弹（等离子弹：直径6px 黄色 #ffdd57） =====
  drawBullets(bullets: Bullet[]): void {
    const ctx = this.ctx;
    for (let i = 0, len = bullets.length; i < len; i++) {
      const b = bullets[i];
      if (!b.active) continue;
      // 发光拖尾
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffdd57';
      ctx.fillStyle = '#ffdd57';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 亮心
      ctx.fillStyle = '#fff9c8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ===== 升级：全屏闪光 + LEVEL UP 文字 =====
  drawLevelUpEffect(stats: PlayerStats): void {
    if (!stats.levelUp.active) return;
    const ctx = this.ctx;
    const lu = stats.levelUp;
    // 闪光：0.5 -> 0 透明度，持续 flashMax
    if (lu.flashTimer > 0) {
      const alpha = 0.5 * (lu.flashTimer / lu.flashMax);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    // LEVEL UP! 文字从下往上
    if (lu.textTimer > 0) {
      const alpha = Math.min(1, lu.textTimer / 0.3) * Math.min(1, (lu.textMax - lu.textTimer) / 0.4);
      ctx.save();
      ctx.font = 'bold 32px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 221, 87, 0.9)';
      ctx.fillStyle = `rgba(255, 221, 87, ${alpha.toFixed(3)})`;
      ctx.fillText('LEVEL UP!', CANVAS_W / 2, lu.textY);
      ctx.restore();
    }
  }

  // ===== 低护盾脉冲边框 =====
  drawLowShieldPulse(player: Player): void {
    if (player.shield >= 30) return;
    const ctx = this.ctx;
    // 0.5秒周期，透明度在 0.3..0.6 循环
    const t = player.lowShieldPulse / 0.5;
    const pulse = 0.3 + (Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * 0.3;
    const borderW = 14;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 71, 87, ${pulse.toFixed(3)})`;
    ctx.lineWidth = borderW;
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(255, 71, 87, 0.7)';
    ctx.strokeRect(borderW / 2, borderW / 2, CANVAS_W - borderW, CANVAS_H - borderW);
    ctx.restore();
  }
}
