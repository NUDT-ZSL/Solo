import type {
  BoatEntity,
  IslandEntity,
  VortexEntity,
  StardustEntity,
  BossEntity,
  ProjectileEntity,
  Particle,
  ShockwaveEffect,
  GameState
} from '../types/gameTypes';
import type { EntityManager } from './entityManager';

export interface Renderer {
  render: (
    ctx: CanvasRenderingContext2D,
    state: GameState,
    em: EntityManager,
    w: number,
    h: number,
    time: number
  ) => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
}

let bgStars: Star[] = [];

function initBgStars(w: number, h: number) {
  bgStars = [];
  for (let i = 0; i < 120; i++) {
    bgStars.push({
      x: Math.random() * w,
      y: Math.random() * h * 3,
      size: Math.random() * 1.8 + 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }
}

export function createRenderer(): Renderer {
  function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cameraY: number, time: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0B0B2B');
    sky.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    for (const s of bgStars) {
      const sy = (s.y - cameraY * 0.3) % (h * 3);
      const y = sy < 0 ? sy + h * 3 : sy;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const river = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7);
    river.addColorStop(0, 'rgba(74,144,217,0.55)');
    river.addColorStop(1, 'rgba(26,26,62,0)');
    ctx.fillStyle = river;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#7EC8E3';
    ctx.lineWidth = 1;
    const offset = (cameraY * 0.5) % 80;
    for (let row = -1; row < h / 80 + 2; row++) {
      const y = row * 80 + offset;
      ctx.beginPath();
      for (let x = 0; x < w; x += 10) {
        const yy = y + Math.sin(x * 0.02 + time * 1.5) * 5;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function worldToScreen(y: number, cameraY: number, h: number): number {
    return y - cameraY + h * 0.1;
  }

  function drawBoat(ctx: CanvasRenderingContext2D, boat: BoatEntity, cameraY: number, h: number) {
    const sy = worldToScreen(boat.y, cameraY, h);
    const blink = 0.5 + 0.5 * Math.sin(boat.blinkPhase * (Math.PI * 2 / 0.6));
    const glowExtra = boat.glowIntensity;
    const glowAlpha = 0.4 + 0.3 * blink + glowExtra * 0.6;
    const size = 20;

    ctx.save();
    ctx.translate(boat.x, sy);

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12 + 8 * blink + glowExtra * 15;
    ctx.fillStyle = `rgba(255,255,255,${0.85 + 0.15 * blink})`;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = glowAlpha;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawIsland(ctx: CanvasRenderingContext2D, isl: IslandEntity, cameraY: number, h: number) {
    const sy = worldToScreen(isl.y, cameraY, h);
    if (sy < -isl.height || sy > h + isl.height) return;
    ctx.save();
    ctx.translate(isl.x, sy);
    ctx.rotate(isl.rotation);

    ctx.shadowColor = '#00E5CC';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.5;
    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, Math.max(isl.width, isl.height) / 2);
    grad.addColorStop(0, '#4ADE80');
    grad.addColorStop(0.6, '#10B981');
    grad.addColorStop(1, '#00E5CC');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, isl.width / 2, isl.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawVortex(ctx: CanvasRenderingContext2D, v: VortexEntity, cameraY: number, h: number) {
    const sy = worldToScreen(v.y, cameraY, h);
    if (sy < -v.radius * 2 || sy > h + v.radius * 2) return;
    ctx.save();
    ctx.translate(v.x, sy);

    ctx.fillStyle = 'rgba(10,5,30,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, v.radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(v.rotation);
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00D9FF';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const startAng = (i * Math.PI * 2) / 3;
      for (let t = 0; t <= 1; t += 0.05) {
        const ang = startAng + t * Math.PI * 2;
        const r = t * v.radius;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStardust(ctx: CanvasRenderingContext2D, s: StardustEntity, cameraY: number, h: number) {
    const sy = worldToScreen(s.y, cameraY, h);
    if (sy < -50 || sy > h + 50) return;
    const blink = 0.5 + 0.5 * Math.sin(s.blinkPhase);
    ctx.save();
    ctx.translate(s.x, sy);
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10 + 6 * blink;
    ctx.globalAlpha = 0.7 + 0.3 * blink;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#FFFCE0';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoss(ctx: CanvasRenderingContext2D, boss: BossEntity, cameraY: number, h: number) {
    const sy = worldToScreen(boss.y, cameraY, h);
    ctx.save();
    ctx.translate(boss.x, sy);

    ctx.shadowColor = '#8B0000';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#2A0A40';
    ctx.strokeStyle = '#7B1F3D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < boss.vertices; i++) {
      const ang = (i / boss.vertices) * Math.PI * 2;
      const r = boss.radius * (0.85 + 0.15 * Math.sin(ang * 3 + performance.now() * 0.002));
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF3355';
    const eyeR = boss.radius * 0.1;
    const eyeOffset = boss.radius * 0.35;
    ctx.beginPath(); ctx.arc(-eyeOffset, -boss.radius * 0.1, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffset, -boss.radius * 0.1, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-eyeOffset, -boss.radius * 0.1, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffset, -boss.radius * 0.1, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    const barW = 300;
    const barX = (ctx.canvas.width - barW) / 2;
    const barY = 20;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, 14);
    const pct = Math.max(0, boss.health / boss.maxHealth);
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#FF4D6D');
    grad.addColorStop(1, '#8B0000');
    ctx.fillStyle = grad;
    ctx.fillRect(barX + 2, barY + 2, (barW - 4) * pct, 10);
    ctx.strokeStyle = '#7B1F3D';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, 14);
    ctx.restore();
  }

  function drawProjectile(ctx: CanvasRenderingContext2D, p: ProjectileEntity, cameraY: number, h: number) {
    const sy = worldToScreen(p.y, cameraY, h);
    if (sy < -50 || sy > h + 50) return;
    ctx.save();
    ctx.translate(p.x, sy);
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, p.radius);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.5, '#FFE066');
    grad.addColorStop(1, '#FFD700');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cameraY: number, h: number) {
    for (const p of particles) {
      if (p.life <= 0) continue;
      const t = p.life / p.maxLife;
      const sy = worldToScreen(p.y, cameraY, h);
      ctx.save();
      ctx.globalAlpha = t;
      if (p.type === 'shockwave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        const r = p.size * (1 - t * 0.5);
        ctx.arc(p.x, sy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'trail') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, sy, p.size * t, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ripple') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = t * 0.6;
        ctx.beginPath();
        ctx.ellipse(p.x, sy, p.size * (1 - t) * 1.2, p.size * (1 - t) * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawShockwaves(ctx: CanvasRenderingContext2D, effects: ShockwaveEffect[], cameraY: number, h: number) {
    for (const e of effects) {
      if (e.life <= 0) continue;
      const t = e.life / e.maxLife;
      const sy = worldToScreen(e.y, cameraY, h);
      const r = e.maxRadius * (1 - t);
      ctx.save();
      ctx.globalAlpha = 0.6 * t;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(e.x, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGameOverText(ctx: CanvasRenderingContext2D, timer: number, w: number, h: number) {
    const t = Math.min(1, timer / 3);
    const fadeIn = Math.min(1, timer / 1.5);
    ctx.save();
    const grad = ctx.createLinearGradient(0, h / 2 - 40, 0, h / 2 + 40);
    const r1 = Math.floor(255 * (1 - t) + 26 * t);
    const g1 = Math.floor(255 * (1 - t) + 26 * t);
    const b1 = Math.floor(255 * (1 - t) + 100 * t);
    const r2 = Math.floor(160 * (1 - t) + 10 * t);
    const g2 = Math.floor(160 * (1 - t) + 10 * t);
    const b2 = Math.floor(255 * (1 - t) + 60 * t);
    grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
    ctx.globalAlpha = fadeIn;
    ctx.fillStyle = grad;
    ctx.font = 'bold 64px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000080';
    ctx.shadowBlur = 20;
    ctx.fillText('星夜黯淡', w / 2, h / 2);
    if (timer > 3) {
      ctx.globalAlpha = Math.min(1, (timer - 3) / 0.5) * 0.8;
      ctx.font = '24px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#B0C4DE';
      ctx.shadowBlur = 10;
      ctx.fillText('点击屏幕重新开始', w / 2, h / 2 + 80);
    }
    ctx.restore();
  }

  function render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    em: EntityManager,
    w: number,
    h: number,
    time: number
  ) {
    if (bgStars.length === 0) initBgStars(w, h);

    drawBackground(ctx, w, h, state.cameraY, time);

    for (const isl of em.getIslands()) drawIsland(ctx, isl, state.cameraY, h);
    for (const v of em.getVortexes()) drawVortex(ctx, v, state.cameraY, h);
    for (const s of em.getStardusts()) drawStardust(ctx, s, state.cameraY, h);
    for (const p of em.getProjectiles()) drawProjectile(ctx, p, state.cameraY, h);

    drawParticles(ctx, state.particles, state.cameraY, h);
    drawShockwaves(ctx, state.shockwaves, state.cameraY, h);

    drawBoat(ctx, em.getBoat(), state.cameraY, h);

    const boss = em.getBoss();
    if (boss) drawBoss(ctx, boss, state.cameraY, h);

    if (state.phase === 'boss') {
      ctx.save();
      const leftPct = Math.max(0, state.bossTimer / 30);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(w / 2 - 80, 50, 160, 10);
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      ctx.fillRect(w / 2 - 78, 52, 156 * leftPct, 6);
      ctx.restore();
    }

    if (state.phase === 'gameover') {
      drawGameOverText(ctx, state.gameOverTimer, w, h);
    }
  }

  return { render };
}
