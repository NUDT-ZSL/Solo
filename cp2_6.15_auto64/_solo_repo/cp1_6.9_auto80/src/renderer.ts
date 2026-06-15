import {
  LightCocoon, Worm, Ray, Particle, SilkThread, Vortex,
  COCOON_COLORS, WORM_COLORS, CRYSTAL_COLOR,
  GRID_COLS, GRID_ROWS, CELL_SIZE, LOGICAL_W, LOGICAL_H,
  CRYSTAL_RADIUS
} from './entities';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  time: number;
  scale: number;
  hoverCell: { col: number; row: number } | null;
  selectedCocoonId: number | null;
}

export function clearAndDrawBackground(rc: RenderContext) {
  const { ctx } = rc;
  const cx = LOGICAL_W / 2;
  const cy = LOGICAL_H / 2;
  const maxR = Math.hypot(LOGICAL_W, LOGICAL_H) * 0.7;
  const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
  gradient.addColorStop(0, '#0A1A0A');
  gradient.addColorStop(0.55, '#081218');
  gradient.addColorStop(1, '#0A0A1A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  const noiseAlpha = 0.025;
  ctx.save();
  ctx.globalAlpha = noiseAlpha;
  for (let i = 0; i < 60; i++) {
    const x = ((i * 73) % LOGICAL_W);
    const y = ((i * 131) % LOGICAL_H);
    const r = 1 + ((i * 17) % 3);
    ctx.fillStyle = i % 2 === 0 ? '#33FF66' : '#6666FF';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawGrid(rc: RenderContext) {
  const { ctx, hoverCell, time } = rc;
  ctx.save();
  ctx.strokeStyle = 'rgba(100, 200, 150, 0.08)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= GRID_COLS; c++) {
    const x = c * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, LOGICAL_H);
    ctx.stroke();
  }
  for (let r = 0; r <= GRID_ROWS; r++) {
    const y = r * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_W, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(150, 255, 180, 0.25)';
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      const x = c * CELL_SIZE + CELL_SIZE / 2;
      const y = r * CELL_SIZE + CELL_SIZE / 2;
      const dot = 1.2 + 0.4 * Math.sin(time * 1.5 + c * 0.6 + r * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (hoverCell) {
    const x = hoverCell.col * CELL_SIZE;
    const y = hoverCell.row * CELL_SIZE;
    ctx.strokeStyle = 'rgba(180, 255, 200, 0.55)';
    ctx.lineWidth = 2;
    const pulse = 1 + 0.05 * Math.sin(time * 5);
    ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#88FFAA';
    ctx.fillRect(x + 4, y + 4, (CELL_SIZE - 8) * pulse, (CELL_SIZE - 8) * pulse);
  }

  drawEntrances(rc);
  ctx.restore();
}

function drawEntrances(rc: RenderContext) {
  const { ctx, time } = rc;
  const positions = [
    { x: LOGICAL_W / 2, y: 0, label: 'TOP' },
    { x: LOGICAL_W / 2, y: LOGICAL_H, label: 'BOT' },
    { x: 0, y: LOGICAL_H / 2, label: 'LFT' },
    { x: LOGICAL_W, y: LOGICAL_H / 2, label: 'RGT' }
  ];
  for (const p of positions) {
    const pulse = 0.4 + 0.3 * Math.abs(Math.sin(time * 1.8));
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FF4466';
    ctx.fillStyle = `rgba(255, 80, 120, ${pulse})`;
    const r = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawCrystal(rc: RenderContext) {
  const { ctx, time } = rc;
  const cx = LOGICAL_W / 2;
  const cy = LOGICAL_H / 2;
  const rotation = (time / 4) * Math.PI * 2;
  const pulse = 1 + 0.08 * Math.sin(time * 2.2);
  const r = CRYSTAL_RADIUS * pulse;

  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = '#AAEEFF';
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 1.4);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.45, 'rgba(200, 240, 255, 0.55)');
  grad.addColorStop(1, 'rgba(100, 200, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.shadowBlur = 18;
  ctx.shadowColor = CRYSTAL_COLOR;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = '#CCEEFF';
  ctx.lineWidth = 1.2;
  const sides = 6;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const px = Math.cos(a) * r * 0.75;
    const py = Math.sin(a) * r * 0.75;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawCocoon(rc: RenderContext, cocoon: LightCocoon) {
  const { ctx, time, selectedCocoonId } = rc;
  const { position, color, level, stats, rotation, fadeInAlpha, pulsePhase } = cocoon;
  const baseColor = COCOON_COLORS[color];

  ctx.save();
  ctx.globalAlpha = fadeInAlpha;

  const haloR = stats.haloRadius + 4 * Math.sin(pulsePhase);
  const haloGrad = ctx.createRadialGradient(position.x, position.y, stats.haloRadius * 0.5, position.x, position.y, haloR + 6);
  haloGrad.addColorStop(0, hexToRGBA(baseColor, 0.35));
  haloGrad.addColorStop(1, hexToRGBA(baseColor, 0));
  ctx.shadowBlur = 18;
  ctx.shadowColor = baseColor;
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(position.x, position.y, haloR + 6, 0, Math.PI * 2);
  ctx.fill();

  if (selectedCocoonId === cocoon.id) {
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#FFFFFF';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -time * 20;
    ctx.beginPath();
    ctx.arc(position.x, position.y, haloR + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);
  ctx.shadowBlur = 16;
  ctx.shadowColor = baseColor;
  ctx.fillStyle = hexToRGBA(baseColor, 0.95);
  drawCocoonShape(ctx, 10);

  ctx.fillStyle = hexToRGBA(darken(baseColor, 0.4), 0.9);
  drawCocoonShape(ctx, 5.5);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fadeInAlpha;
  ctx.font = 'bold 7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 4;
  ctx.shadowColor = '#000000';
  ctx.fillText(`L${level}`, position.x, position.y + 14);
  ctx.restore();
}

function drawCocoonShape(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const rr = r * (0.85 + 0.15 * Math.sin(i * 2));
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawWorm(rc: RenderContext, worm: Worm) {
  const { ctx } = rc;
  const { position, color, hp, maxHp, hitFlashTimer, isElite } = worm;
  const baseColor = WORM_COLORS[color];
  const flashBoost = hitFlashTimer > 0 ? (0.6 * (hitFlashTimer / 0.2)) : 0;

  const size = isElite ? 9 : 6;

  ctx.save();
  const dx = worm.pathTarget.x - position.x;
  const dy = worm.pathTarget.y - position.y;
  const angle = Math.atan2(dy, dx);
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);

  ctx.shadowBlur = 10 + flashBoost * 15;
  ctx.shadowColor = baseColor;
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hexToRGBA(darken(baseColor, 0.45), 1);
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(-i * size * 0.7, 0, size * (0.65 - i * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 4;
  ctx.shadowColor = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(size * 0.4, -size * 0.25, 1.1, 0, Math.PI * 2);
  ctx.arc(size * 0.4, size * 0.25, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(size * 0.45, -size * 0.25, 0.55, 0, Math.PI * 2);
  ctx.arc(size * 0.45, size * 0.25, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (hp < maxHp) {
    ctx.save();
    const bw = isElite ? 16 : 12;
    const bh = 2;
    const bx = position.x - bw / 2;
    const by = position.y - size - 5;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = hp / maxHp > 0.5 ? '#66FF66' : hp / maxHp > 0.25 ? '#FFCC44' : '#FF4444';
    ctx.fillRect(bx, by, bw * (hp / maxHp), bh);
    ctx.restore();
  }
}

export function drawRay(rc: RenderContext, ray: Ray) {
  const { ctx } = rc;
  const baseColor = COCOON_COLORS[ray.color];
  const alpha = Math.min(1, ray.lifetime / 0.12);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 12;
  ctx.shadowColor = baseColor;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ray.start.x, ray.start.y);
  ctx.lineTo(ray.end.x, ray.end.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(ray.start.x, ray.start.y);
  ctx.lineTo(ray.end.x, ray.end.y);
  ctx.stroke();
  ctx.restore();
}

export function drawParticle(rc: RenderContext, particle: Particle) {
  const { ctx } = rc;
  const alpha = particle.alpha;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (particle.trail.length > 1) {
    ctx.shadowBlur = 5;
    ctx.shadowColor = particle.color;
    ctx.strokeStyle = hexToRGBA(particle.color, alpha * 0.5);
    ctx.lineWidth = particle.radius * 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < particle.trail.length; i++) {
      const t = particle.trail[i];
      const trailAlpha = i / particle.trail.length;
      ctx.globalAlpha = alpha * trailAlpha * 0.6;
      if (i === 0) ctx.moveTo(t.x, t.y);
      else ctx.lineTo(t.x, t.y);
    }
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  ctx.shadowBlur = 8;
  ctx.shadowColor = particle.color;
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSilk(rc: RenderContext, silk: SilkThread) {
  const { ctx } = rc;
  const pulseOpacity = silk.getPulseOpacity();

  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#88FFAA';
  ctx.strokeStyle = hexToRGBA('#AAFFCC', pulseOpacity);
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const mx = (silk.from.x + silk.to.x) / 2;
  const my = (silk.from.y + silk.to.y) / 2;
  const sag = 3 + 2 * Math.sin(silk.pulsePhase * 0.8);
  ctx.moveTo(silk.from.x, silk.from.y);
  ctx.quadraticCurveTo(mx, my + sag, silk.to.x, silk.to.y);
  ctx.stroke();
  ctx.restore();
}

export function drawVortex(rc: RenderContext, vortex: Vortex) {
  if (vortex.cocoonCount < 5) return;
  const { ctx } = rc;
  ctx.save();
  ctx.translate(vortex.position.x, vortex.position.y);
  ctx.rotate(vortex.rotation);
  for (let ring = 0; ring < 3; ring++) {
    const r = vortex.radius * (0.55 + ring * 0.25);
    const rot = vortex.rotation * (1 + ring * 0.4);
    ctx.save();
    ctx.rotate(rot);
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#AAFFEE';
    ctx.strokeStyle = `rgba(160, 255, 220, ${0.15 + ring * 0.06})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const petals = 6;
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const rw = r * (0.9 + 0.1 * Math.sin(a * petals));
      const px = Math.cos(a) * rw;
      const py = Math.sin(a) * rw;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function hexToRGBA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.floor(parseInt(h.substring(0, 2), 16) * (1 - factor));
  const g = Math.floor(parseInt(h.substring(2, 4), 16) * (1 - factor));
  const b = Math.floor(parseInt(h.substring(4, 6), 16) * (1 - factor));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
