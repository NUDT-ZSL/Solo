import { GameState, getCurrentTransform, getTargetPrimaryColor, getMazeTotalSize } from './game';

export interface Layout {
  sidebarWidth: number;
  isMobile: boolean;
  mazeScreenX: number;
  mazeScreenY: number;
  mazeScale: number;
  compassX: number;
  compassY: number;
  compassRadius: number;
  counterX: number;
  counterY: number;
  timeX: number;
  timeY: number;
}

export function calculateLayout(
  canvasWidth: number,
  canvasHeight: number,
  mazeGameWidth: number,
  mazeGameHeight: number
): Layout {
  const isMobile = canvasWidth < 768;
  const sidebarWidth = isMobile ? 0 : 120;

  let availableWidth: number;
  let availableHeight: number;

  if (isMobile) {
    availableWidth = canvasWidth - 20;
    availableHeight = canvasHeight - 150;
  } else {
    availableWidth = Math.max(500, canvasWidth * 0.6);
    availableHeight = canvasHeight - 40;
  }

  const scaleX = availableWidth / mazeGameWidth;
  const scaleY = availableHeight / mazeGameHeight;
  const mazeScale = Math.min(scaleX, scaleY, 1.5);

  const finalMazeWidth = mazeGameWidth * mazeScale;
  const finalMazeHeight = mazeGameHeight * mazeScale;

  let mazeScreenX: number, mazeScreenY: number;

  if (isMobile) {
    mazeScreenX = (canvasWidth - finalMazeWidth) / 2;
    mazeScreenY = 140 + (availableHeight - finalMazeHeight) / 2;
  } else {
    const totalMazeAreaX = sidebarWidth + 20;
    const mazeAreaWidth = canvasWidth - totalMazeAreaX - 20;
    mazeScreenX = totalMazeAreaX + (mazeAreaWidth - finalMazeWidth) / 2;
    mazeScreenY = (canvasHeight - finalMazeHeight) / 2;
  }

  let compassX: number, compassY: number, counterX: number, counterY: number, timeX: number, timeY: number;
  const compassRadius = 40;

  if (isMobile) {
    compassX = 60;
    compassY = 70;
    counterX = canvasWidth / 2;
    counterY = 60;
    timeX = canvasWidth - 70;
    timeY = 70;
  } else {
    compassX = sidebarWidth / 2;
    compassY = canvasHeight / 2 - 60;
    counterX = sidebarWidth / 2;
    counterY = canvasHeight / 2 + 40;
    timeX = sidebarWidth / 2;
    timeY = canvasHeight / 2 + 90;
  }

  return {
    sidebarWidth,
    isMobile,
    mazeScreenX,
    mazeScreenY,
    mazeScale,
    compassX,
    compassY,
    compassRadius,
    counterX,
    counterY,
    timeX,
    timeY
  };
}

function gameToScreen(gx: number, gy: number, layout: Layout): { x: number; y: number } {
  return {
    x: layout.mazeScreenX + gx * layout.mazeScale,
    y: layout.mazeScreenY + gy * layout.mazeScale
  };
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function render(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  layout: Layout,
  canvasWidth: number,
  canvasHeight: number,
  now: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const transform = getCurrentTransform(game, now);
  const mazeSize = getMazeTotalSize(game);
  const mazeCenterGame = { x: mazeSize.width / 2, y: mazeSize.height / 2 };
  const mazeCenterScreen = gameToScreen(mazeCenterGame.x, mazeCenterGame.y, layout);

  drawSidebar(ctx, game, layout);

  ctx.save();
  ctx.translate(mazeCenterScreen.x, mazeCenterScreen.y);
  ctx.rotate(transform.rotation);
  if (transform.mirrorX) ctx.scale(-1, 1);
  if (transform.mirrorY) ctx.scale(1, -1);
  ctx.scale(layout.mazeScale, layout.mazeScale);
  ctx.translate(-mazeCenterGame.x, -mazeCenterGame.y);

  drawMaze(ctx, game);
  drawTargets(ctx, game);
  drawBallTrail(ctx, game);
  drawCollisionFlashes(ctx, game);
  drawBall(ctx, game);

  ctx.restore();

  drawParticles(ctx, game, layout);
}

function drawMaze(ctx: CanvasRenderingContext2D, game: GameState): void {
  const cs = game.cellSize;
  const gap = game.gap;

  for (let y = 0; y < game.rows; y++) {
    for (let x = 0; x < game.cols; x++) {
      const cell = game.maze[y][x];
      const px = game.mazeOriginX + x * (cs + gap);
      const py = game.mazeOriginY + y * (cs + gap);

      const gradient = ctx.createLinearGradient(px, py, px + cs, py + cs);
      gradient.addColorStop(0, cell.color);
      gradient.addColorStop(1, shadeColor(cell.color, -25));

      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillRect(px, py, cs, cs);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, gap);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (cell.walls.top) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + cs, py);
        ctx.stroke();
      }
      if (cell.walls.right) {
        ctx.beginPath();
        ctx.moveTo(px + cs, py);
        ctx.lineTo(px + cs, py + cs);
        ctx.stroke();
      }
      if (cell.walls.bottom) {
        ctx.beginPath();
        ctx.moveTo(px, py + cs);
        ctx.lineTo(px + cs, py + cs);
        ctx.stroke();
      }
      if (cell.walls.left) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + cs);
        ctx.stroke();
      }
    }
  }
}

function drawTargets(ctx: CanvasRenderingContext2D, game: GameState): void {
  for (const target of game.targets) {
    if (target.collected && target.scale <= 0.01) continue;

    const r = target.radius * target.scale;
    const pulse = 1 + Math.sin(target.pulsePhase) * 0.15;

    const glowRadius = r * 2.5 * pulse;
    const glow = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, glowRadius);
    glow.addColorStop(0, hexToRgba(target.color1, 0.6));
    glow.addColorStop(0.4, hexToRgba(target.color2, 0.3));
    glow.addColorStop(1, hexToRgba(target.color2, 0));

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(target.x, target.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(
      target.x - r * 0.3, target.y - r * 0.3, 0,
      target.x, target.y, r
    );
    gradient.addColorStop(0, target.color1);
    gradient.addColorStop(1, target.color2);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(target.x - r * 0.3, target.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBallTrail(ctx: CanvasRenderingContext2D, game: GameState): void {
  const trail = game.ball.trail;
  for (let i = trail.length - 1; i >= 1; i--) {
    const p1 = trail[i];
    const p2 = trail[i - 1];
    if (p1.alpha <= 0.01) continue;

    const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${p1.alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(255, 215, 0, ${p2.alpha * 0.6})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = game.ball.radius * (1 - i / trail.length) * 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, game: GameState): void {
  const ball = game.ball;
  const r = ball.radius;

  const outerGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, r * 3);
  outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
  outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r * 3, 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createRadialGradient(
    ball.x - r * 0.35, ball.y - r * 0.35, 0,
    ball.x, ball.y, r
  );
  gradient.addColorStop(0, '#FFFACD');
  gradient.addColorStop(0.35, '#FFD700');
  gradient.addColorStop(0.8, '#DAA520');
  gradient.addColorStop(1, '#8B6914');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(ball.x - r * 0.35, ball.y - r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(101, 67, 33, 0.4)';
  ctx.beginPath();
  ctx.arc(ball.x + r * 0.25, ball.y + r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawCollisionFlashes(ctx: CanvasRenderingContext2D, game: GameState): void {
  for (const flash of game.collisionFlashes) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${flash.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
    ctx.stroke();

    const innerGlow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius * 0.7);
    innerGlow.addColorStop(0, `rgba(255, 255, 255, ${flash.alpha * 0.5})`);
    innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, flash.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSidebar(ctx: CanvasRenderingContext2D, game: GameState, layout: Layout): void {
  const primaryColor = getTargetPrimaryColor(game);

  if (!layout.isMobile) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(0, 0, layout.sidebarWidth, ctx.canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.sidebarWidth, 0);
    ctx.lineTo(layout.sidebarWidth, ctx.canvas.height);
    ctx.stroke();
  }

  drawCompass(ctx, game, layout);

  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = primaryColor;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10;
  ctx.fillText(`${game.collected}/${game.totalTargets}`, layout.counterX, layout.counterY);
  ctx.shadowBlur = 0;

  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('收集进度', layout.counterX, layout.counterY + 22);

  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(game.elapsedTime.toFixed(1) + 's', layout.timeX, layout.timeY);

  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('经过时间', layout.timeX, layout.timeY + 20);
}

function drawCompass(ctx: CanvasRenderingContext2D, game: GameState, layout: Layout): void {
  const cx = layout.compassX;
  const cy = layout.compassY;
  const r = layout.compassRadius;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const tickLen = 5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (r - tickLen), cy + Math.sin(angle) * (r - tickLen));
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }

  const gLen = Math.sqrt(game.gravityX * game.gravityX + game.gravityY * game.gravityY);
  let angle = -Math.PI / 2;
  let magnitude = 0;

  if (gLen > 5) {
    angle = Math.atan2(game.gravityY, game.gravityX);
    magnitude = Math.min(1, gLen / 400);
  }

  const arrowLen = r * 0.7 * (0.25 + magnitude * 0.75);
  const tipX = cx + Math.cos(angle) * arrowLen;
  const tipY = cy + Math.sin(angle) * arrowLen;
  const baseX = cx - Math.cos(angle) * r * 0.2;
  const baseY = cy - Math.sin(angle) * r * 0.2;

  ctx.save();
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 20;

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const headLen = 14;
  const headAngle = Math.PI / 5.5;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - Math.cos(angle - headAngle) * headLen,
    tipY - Math.sin(angle - headAngle) * headLen
  );
  ctx.lineTo(
    tipX - Math.cos(angle + headAngle) * headLen,
    tipY - Math.sin(angle + headAngle) * headLen
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 5);
  centerGrad.addColorStop(0, '#ffffff');
  centerGrad.addColorStop(1, '#FFD700');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  layout: Layout
): void {
  for (const p of game.particles) {
    const ps = gameToScreen(p.x, p.y, layout);

    for (let i = 0; i < p.trail.length - 1; i++) {
      const t1 = gameToScreen(p.trail[i].x, p.trail[i].y, layout);
      const t2 = gameToScreen(p.trail[i + 1].x, p.trail[i + 1].y, layout);
      const trailAlpha = p.alpha * (1 - i / p.trail.length);
      ctx.strokeStyle = hexToRgba(p.color, trailAlpha);
      ctx.lineWidth = (p.size * layout.mazeScale) * (1 - i / p.trail.length) * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = hexToRgba(p.color, p.alpha);
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, p.size * layout.mazeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
