import { GameState, Player, Core, Cover, Bullet, Particle } from './entities';

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, arena: { x: number; y: number; w: number; h: number }): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
  grad.addColorStop(0, '#1A1C23');
  grad.addColorStop(1, '#0D0E12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.shadowColor = '#00D4FF';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
  ctx.restore();

  ctx.fillStyle = '#2A2D3A';
  ctx.fillRect(arena.x, arena.y, arena.w, arena.h);

  ctx.save();
  ctx.shadowColor = '#00D4FF';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#00D4FF';
  ctx.lineWidth = 2;
  ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
  ctx.restore();
}

export function drawCover(ctx: CanvasRenderingContext2D, cover: Cover): void {
  const { x, y } = cover.pos;
  const s = cover.size;
  ctx.save();
  ctx.fillStyle = '#1F3A4B';
  ctx.beginPath();
  switch (cover.corner) {
    case 'tl':
      ctx.moveTo(x, y + s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s, y + s);
      break;
    case 'tr':
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x, y + s);
      break;
    case 'bl':
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      break;
    case 'br':
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s, y + s);
      break;
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  if (player.resetting && player.flashCount % 2 === 0) return;

  ctx.save();
  ctx.translate(player.pos.x, player.pos.y);
  ctx.rotate(player.angle);

  const s = player.size;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  if (player.id === 1) {
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(-s / 2, -s / 2);
    ctx.lineTo(-s / 2, s / 2);
  } else {
    ctx.moveTo(-s / 2, 0);
    ctx.lineTo(s / 2, s / 2);
    ctx.lineTo(s / 2, -s / 2);
  }
  ctx.closePath();
  ctx.fill();

  if (player.invincible > 0 && Math.floor(player.invincible / 100) % 2 === 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.restore();
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  if (bullet.trail.length > 1) {
    ctx.save();
    for (let i = 0; i < bullet.trail.length - 1; i++) {
      const t = i / bullet.trail.length;
      ctx.globalAlpha = t * 0.4;
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.trail[i].x, bullet.trail[i].y, bullet.radius * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = bullet.color;
  ctx.shadowBlur = 15;
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(bullet.pos.x, bullet.pos.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCore(ctx: CanvasRenderingContext2D, core: Core, time: number): void {
  const r = core.radius;
  const pulse = Math.sin(time / 200) * 2;

  ctx.save();
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 25;

  const grad = ctx.createRadialGradient(core.pos.x, core.pos.y, 0, core.pos.x, core.pos.y, r + pulse);
  grad.addColorStop(0, '#FFD700');
  grad.addColorStop(1, '#FFAA00');
  ctx.fillStyle = grad;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = core.pos.x + Math.cos(angle) * (r + pulse);
    const py = core.pos.y + Math.sin(angle) * (r + pulse);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (core.progress > 0 || core.owner !== 0) {
    const barW = 60;
    const barH = 6;
    const bx = core.pos.x - barW / 2;
    const by = core.pos.y + r + 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(bx, by, barW, barH);

    const prog = core.progress / 100;
    const rC = Math.floor(255 * (1 - prog) + 0 * prog);
    const gC = Math.floor(48 * (1 - prog) + 255 * prog);
    const bC = Math.floor(48 * (1 - prog) + 138 * prog);
    ctx.fillStyle = `rgb(${rC}, ${gC}, ${bC})`;
    ctx.fillRect(bx, by, barW * prog, barH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
  }
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const w = ctx.canvas.width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, 40);

  drawHpBar(ctx, 20, 14, state.players[0]);
  drawAmmoDots(ctx, 160, 20, state.players[0], time);
  drawScoreBadge(ctx, w / 2 - 80, 8, state.players[0]);

  const mins = Math.floor(state.roundTime / 60000);
  const secs = Math.floor((state.roundTime % 60000) / 1000);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`, w / 2, 20);

  drawHpBar(ctx, w - 140, 14, state.players[1]);
  drawAmmoDots(ctx, w - 30, 20, state.players[1], time);
  drawScoreBadge(ctx, w / 2 + 60, 8, state.players[1]);

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, ctx.canvas.height);
    const winner = state.players[state.winner - 1];
    ctx.save();
    ctx.shadowColor = winner.color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = winner.color;
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`玩家 ${state.winner} 获胜!`, w / 2, ctx.canvas.height / 2);
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('按 R 键重新开始', w / 2, ctx.canvas.height / 2 + 60);
  }
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player): void {
  const w = 120, h = 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y, w, h);
  const ratio = player.hp / player.maxHp;
  const rC = Math.floor(0 * (1 - ratio) + 255 * ratio);
  const gC = Math.floor(255 * (1 - ratio) + 48 * (1 - ratio));
  const r2 = Math.floor(0 * (1 - ratio) + 255 * ratio);
  const g2 = Math.floor(255 * (1 - ratio) + 48 * (1 - ratio));
  const rr = Math.floor(255 * (1 - ratio));
  const gg = Math.floor(48 + (255 - 48) * ratio);
  const bb = Math.floor(48 + (138 - 48) * ratio);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, `rgb(0, 255, 138)`);
  grad.addColorStop(1, `rgb(255, 48, 48)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w * Math.max(0, ratio), h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawAmmoDots(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player, time: number): void {
  for (let i = 0; i < player.maxAmmo; i++) {
    const idx = player.id === 1 ? i : (player.maxAmmo - 1 - i);
    const cx = x + (player.id === 1 ? idx * 14 : -idx * 14);
    const available = i < player.ammo;
    const recharging = !available && player.ammoCooldown[i] > 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, y, 5, 0, Math.PI * 2);
    if (available) {
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 10;
      const blink = Math.sin(time / 100) * 0.3 + 0.7;
      ctx.fillStyle = player.color;
      ctx.globalAlpha = blink;
    } else if (recharging) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    } else {
      ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
    }
    ctx.fill();
    ctx.restore();
  }
}

function drawScoreBadge(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player): void {
  const w = 50, h = 24;
  ctx.save();
  ctx.fillStyle = '#1A1C23';
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = player.color;
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${player.score}`, x + w / 2, y + h / 2);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  drawBackground(ctx, w, h, state.arena);
  for (const cover of state.covers) drawCover(ctx, cover);
  drawCore(ctx, state.core, time);
  for (const p of state.particles) drawParticle(ctx, p);
  for (const b of state.bullets) drawBullet(ctx, b);
  for (const player of state.players) drawPlayer(ctx, player);
  drawHUD(ctx, state, time);
}
