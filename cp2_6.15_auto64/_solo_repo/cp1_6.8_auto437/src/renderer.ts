import { Wall, SlotData, ExitData, COLOR_MAP, GLOW_COLOR_MAP, SLOT_GLOW_COLOR_MAP, BallColor } from './scene';
import { Pendulum, Particle } from './pendulum';
import { RuneBall, Slot } from './ball';

const RUNE_CHARS = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛗᛚᛝᛟᛞ';

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a0a2e');
  grad.addColorStop(0.5, '#0d0618');
  grad.addColorStop(1, '#050210');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 30; i++) {
    const rx = (Math.sin(i * 7.3 + Date.now() * 0.0002) * 0.5 + 0.5) * w;
    const ry = (Math.cos(i * 4.7 + Date.now() * 0.00015) * 0.5 + 0.5) * h;
    const rr = 60 + Math.sin(i * 3.1) * 30;
    const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
    rg.addColorStop(0, '#6b3fa0');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
  }
  ctx.restore();
}

export function drawWall(ctx: CanvasRenderingContext2D, wall: Wall, time: number): void {
  ctx.save();

  const grad = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
  grad.addColorStop(0, '#2a1f3d');
  grad.addColorStop(1, '#1a1028');
  ctx.fillStyle = grad;
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

  ctx.strokeStyle = '#3d2a5c';
  ctx.lineWidth = 1;
  ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

  ctx.globalAlpha = 0.15;
  ctx.font = '10px serif';
  ctx.fillStyle = '#8b6fb0';
  const step = 20;
  for (let px = wall.x + 8; px < wall.x + wall.w - 4; px += step) {
    for (let py = wall.y + 14; py < wall.y + wall.h - 4; py += step) {
      const charIdx = Math.floor((px * 3 + py * 7 + time * 0.001) % RUNE_CHARS.length);
      ctx.fillText(RUNE_CHARS[charIdx], px, py);
    }
  }

  ctx.restore();
}

export function drawExit(ctx: CanvasRenderingContext2D, exit: ExitData, open: boolean, time: number): void {
  ctx.save();
  if (open) {
    const pulse = Math.sin(time * 0.005) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#3bff6f';
    ctx.shadowColor = '#3bff6f';
    ctx.shadowBlur = 20;
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.5 * pulse;
    ctx.strokeStyle = '#3bff6f';
    ctx.lineWidth = 2;
    ctx.strokeRect(exit.x - 4, exit.y - 4, exit.w + 8, exit.h + 8);
  } else {
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = '#3d2a5c';
    ctx.lineWidth = 1;
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);

    ctx.globalAlpha = 0.3;
    ctx.font = '12px serif';
    ctx.fillStyle = '#ff3b4a';
    ctx.fillText('⬆', exit.x + 4, exit.y + exit.h / 2 + 4);
  }
  ctx.restore();
}

export function drawSlot(ctx: CanvasRenderingContext2D, slot: Slot, time: number): void {
  ctx.save();

  const glowColor = SLOT_GLOW_COLOR_MAP[slot.color];
  const mainColor = COLOR_MAP[slot.color];

  ctx.beginPath();
  ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,6,18,0.8)';
  ctx.fill();

  const glowRadius = slot.radius + 8 + Math.sin(time * 0.004) * 4;
  const grad = ctx.createRadialGradient(slot.x, slot.y, slot.radius * 0.5, slot.x, slot.y, glowRadius);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = slot.isFilled ? mainColor : `${mainColor}88`;
  ctx.lineWidth = slot.isFilled ? 3 : 2;
  ctx.stroke();

  if (slot.runeFlash > 0) {
    ctx.globalAlpha = slot.runeFlash;
    ctx.font = `${slot.radius}px serif`;
    ctx.fillStyle = mainColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 20;
    const charIdx = Math.floor((slot.x + slot.y) % RUNE_CHARS.length);
    ctx.fillText(RUNE_CHARS[charIdx], slot.x, slot.y);
    ctx.shadowBlur = 0;
  }

  if (slot.isFilled) {
    ctx.globalAlpha = 0.5 + slot.glowPulse * 0.5;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, slot.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export function drawRuneBall(ctx: CanvasRenderingContext2D, ball: RuneBall, time: number): void {
  ctx.save();

  const mainColor = COLOR_MAP[ball.color];
  const glowColor = GLOW_COLOR_MAP[ball.color];

  const grad = ctx.createRadialGradient(
    ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.1,
    ball.x, ball.y, ball.radius
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, mainColor);
  grad.addColorStop(1, darkenColor(mainColor, 0.5));

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = mainColor;
  ctx.shadowBlur = 12 * ball.glowIntensity;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 0.6 + Math.sin(ball.runePhase) * 0.2;
  ctx.font = `${ball.radius * 0.9}px serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const charIdx = Math.floor((ball.x * 2 + ball.y * 3) % RUNE_CHARS.length);
  ctx.fillText(RUNE_CHARS[charIdx], ball.x, ball.y);

  ctx.restore();
}

export function drawPendulum(ctx: CanvasRenderingContext2D, p: Pendulum, time: number): void {
  ctx.save();

  ctx.strokeStyle = '#6b5a8a';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(p.anchorX, p.anchorY);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const anchorGrad = ctx.createRadialGradient(p.anchorX, p.anchorY, 0, p.anchorX, p.anchorY, 8);
  anchorGrad.addColorStop(0, '#8b7ab0');
  anchorGrad.addColorStop(1, '#3d2a5c');
  ctx.beginPath();
  ctx.arc(p.anchorX, p.anchorY, 6, 0, Math.PI * 2);
  ctx.fillStyle = anchorGrad;
  ctx.fill();

  const glowRadius = 22 + Math.sin(time * 0.003) * 3;
  const outerGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius * 2.5);
  outerGlow.addColorStop(0, `rgba(255,240,210,${0.3 * p.glowIntensity})`);
  outerGlow.addColorStop(0.5, `rgba(255,220,180,${0.1 * p.glowIntensity})`);
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(p.x - glowRadius * 3, p.y - glowRadius * 3, glowRadius * 6, glowRadius * 6);

  const ballGrad = ctx.createRadialGradient(
    p.x - 6, p.y - 6, 2,
    p.x, p.y, 22
  );
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(0.4, '#ffe8c0');
  ballGrad.addColorStop(1, '#c8a060');

  ctx.beginPath();
  ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.shadowColor = '#ffe8c0';
  ctx.shadowBlur = 20 * p.glowIntensity;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (p.isDragging) {
    ctx.strokeStyle = 'rgba(255,240,210,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}
