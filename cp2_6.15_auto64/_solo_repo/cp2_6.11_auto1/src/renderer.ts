import { GameState, FlashEffect, BurstParticle } from './physics';

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.clearRect(0, 0, 800, 600);

  drawBackground(ctx);
  drawStarParticles(ctx, state);
  drawStarOrbits(ctx, state);
  drawBlackHole(ctx, state);
  drawPlanets(ctx, state);
  drawBall(ctx, state);
  drawBurstParticles(ctx, state);
  drawFlashes(ctx, state);
  drawHUD(ctx, state);
  drawLaunchIndicator(ctx, state);

  if (state.gameOver) {
    drawGameOverPanel(ctx, state);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createRadialGradient(400, 300, 0, 400, 300, 500);
  grad.addColorStop(0, '#0B1026');
  grad.addColorStop(1, '#1A0E30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);
}

function drawStarParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.starParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStarOrbits(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const orbit of state.starOrbits) {
    ctx.save();
    ctx.translate(orbit.cx, orbit.cy);
    ctx.rotate(orbit.rotationAngle);

    ctx.strokeStyle = orbit.color;
    ctx.lineWidth = orbit.thickness;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.ellipse(0, 0, orbit.radius, orbit.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = orbit.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, orbit.radius, orbit.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (orbit.boostActive) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#9B30FF';
      ctx.lineWidth = orbit.thickness + 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, orbit.radius, orbit.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    drawOrbitKnots(ctx, orbit);
  }
}

function drawOrbitKnots(ctx: CanvasRenderingContext2D, orbit: { cx: number; cy: number; radius: number; rotationAngle: number; color: string; radiusY?: number }): void {
  const ry = orbit.radius * 0.4;
  const numKnots = 6;
  for (let i = 0; i < numKnots; i++) {
    const angle = orbit.rotationAngle + (Math.PI * 2 * i) / numKnots;
    const kx = orbit.cx + Math.cos(angle) * orbit.radius;
    const ky = orbit.cy + Math.sin(angle) * ry;
    ctx.fillStyle = orbit.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(kx, ky, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawBlackHole(ctx: CanvasRenderingContext2D, state: GameState): void {
  const hole = state.blackHole;

  const outerGrad = ctx.createRadialGradient(
    hole.pos.x, hole.pos.y, hole.radius,
    hole.pos.x, hole.pos.y, hole.radius * 3
  );
  outerGrad.addColorStop(0, '#4A0E4E');
  outerGrad.addColorStop(0.5, 'rgba(74,14,78,0.3)');
  outerGrad.addColorStop(1, 'rgba(74,14,78,0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(hole.pos.x, hole.pos.y, hole.radius * 3, 0, Math.PI * 2);
  ctx.fill();

  const innerGrad = ctx.createRadialGradient(
    hole.pos.x, hole.pos.y, 0,
    hole.pos.x, hole.pos.y, hole.radius
  );
  innerGrad.addColorStop(0, '#000000');
  innerGrad.addColorStop(0.7, '#000000');
  innerGrad.addColorStop(1, '#1A0030');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4A0E4E';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(hole.pos.x, hole.pos.y, hole.radius + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(hole.pos.x, hole.pos.y, hole.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(hole.pos.x, hole.pos.y, hole.radius + 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPlanets(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const planet of state.planets) {
    let scale = 1;
    if (planet.pulseActive) {
      const progress = planet.pulseTimer / 0.3;
      if (progress > 0.5) {
        scale = 1 + 0.2 * ((1 - progress) * 2);
      } else {
        scale = 1 + 0.2 * (progress * 2);
      }
    }
    const r = planet.radius * scale;

    ctx.save();
    ctx.shadowColor = planet.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = planet.color;
    ctx.beginPath();
    ctx.arc(planet.pos.x, planet.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    const highlight = ctx.createRadialGradient(
      planet.pos.x - r * 0.3, planet.pos.y - r * 0.3, 0,
      planet.pos.x, planet.pos.y, r
    );
    highlight.addColorStop(0, 'rgba(255,255,255,0.3)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(planet.pos.x, planet.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, state: GameState): void {
  const ball = state.ball;

  ctx.save();
  const ballColor = ball.goldenTimer > 0 ? '#FFD700' : ball.color;

  ctx.shadowColor = ballColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = ballColor;
  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  const glowGrad = ctx.createRadialGradient(
    ball.pos.x, ball.pos.y, ball.radius,
    ball.pos.x, ball.pos.y, ball.radius * 2.5
  );
  glowGrad.addColorStop(0, ball.goldenTimer > 0 ? 'rgba(255,215,0,0.4)' : 'rgba(0,255,255,0.4)');
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, ball.radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();

  if (!ball.active && !state.gameOver && state.launchesLeft > 0) {
    ctx.fillStyle = '#00FFFF';
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 300);
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawBurstParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.burstParticles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFlashEffect(ctx: CanvasRenderingContext2D, flash: FlashEffect): void {
  if (flash.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = flash.alpha;
  ctx.strokeStyle = flash.color;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 792, 592);
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 780, 580);
  ctx.restore();
}

function drawFlashes(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawFlashEffect(ctx, state.purpleFlash);
  drawFlashEffect(ctx, state.goldFlash);
  drawFlashEffect(ctx, state.silverFlash);
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.font = '24px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(`得分: ${state.score}`, 20, 35);

  ctx.textAlign = 'right';
  ctx.fillText(`剩余: ${state.launchesLeft}`, 780, 580);
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawLaunchIndicator(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.isLaunching || state.ball.active) return;

  const mx = state.launchPos.x;
  const my = state.launchPos.y;
  const mousePos = (state as any)._mousePos as { x: number; y: number } | undefined;
  if (!mousePos) return;

  const dx = mousePos.x - mx;
  const dy = mousePos.y - my;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = 150;
  const power = Math.min(dist / maxDist, 1) * 10;
  const angle = Math.atan2(-dy, -dx);

  const lineLen = power * 15;
  const endX = mx + Math.cos(angle) * lineLen;
  const endY = my + Math.sin(angle) * lineLen;

  ctx.save();
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  const arrowSize = 8;
  const arrowAngle = Math.atan2(endY - my, endX - mx);
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowSize * Math.cos(arrowAngle - 0.4),
    endY - arrowSize * Math.sin(arrowAngle - 0.4)
  );
  ctx.lineTo(
    endX - arrowSize * Math.cos(arrowAngle + 0.4),
    endY - arrowSize * Math.sin(arrowAngle + 0.4)
  );
  ctx.closePath();
  ctx.fill();

  ctx.font = '14px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.9;
  const angleDeg = ((angle * 180) / Math.PI + 360) % 360;
  ctx.fillText(`角度: ${angleDeg.toFixed(0)}°`, mx + 20, my - 20);
  ctx.fillText(`力度: ${power.toFixed(1)}`, mx + 20, my - 5);

  const barX = mx - 40;
  const barY = my + 25;
  const barW = 80;
  const barH = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(barX, barY, barW, barH);
  const powerRatio = power / 10;
  const r = Math.floor(255 * powerRatio);
  const g = Math.floor(255 * (1 - powerRatio));
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.fillRect(barX, barY, barW * powerRatio, barH);

  ctx.restore();
}

function drawGameOverPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 800, 600);

  const panelW = 320;
  const panelH = 200;
  const panelX = (800 - panelW) / 2;
  const panelY = (600 - panelH) / 2;

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', 400, panelY + 55);

  ctx.font = '20px monospace';
  ctx.fillText(`最终得分: ${state.score}`, 400, panelY + 95);

  const btnW = 160;
  const btnH = 40;
  const btnX = (800 - btnW) / 2;
  const btnY = panelY + 125;

  ctx.fillStyle = '#4D96FF';
  roundRect(ctx, btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px monospace';
  ctx.fillText('重新开始', 400, btnY + 26);

  (state as any)._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

  ctx.textAlign = 'left';
  ctx.restore();
}

function roundRect(
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
