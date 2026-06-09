import { GameData, getGameData } from './gameEngine';
import { Creature, ColorBlob } from './types';
import { hslToCss } from './utils';

export const renderGame = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const data = getGameData();
  if (!data) return;

  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height);
  drawArena(ctx, data);
  drawBlobs(ctx, data);
  drawTrails(ctx, data);
  drawCreatures(ctx, data);
  drawSplashParticles(ctx, data);
  drawUI(ctx, data, width, height);

  if (data.gameState.status === 'start') {
    drawStartScreen(ctx, width, height, data);
  }

  if (data.gameState.status === 'ended' || data.gameState.transitionTarget === 'ended') {
    drawEndScreen(ctx, width, height, data);
  }

  drawTransition(ctx, width, height, data);
};

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
};

const drawArena = (ctx: CanvasRenderingContext2D, data: GameData): void => {
  const arena = data.arena;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(arena.left, arena.top, arena.width, arena.height);
};

const drawBlobs = (ctx: CanvasRenderingContext2D, data: GameData): void => {
  for (const blob of data.blobs) {
    drawBlob(ctx, blob);
  }
};

const drawBlob = (ctx: CanvasRenderingContext2D, blob: ColorBlob): void => {
  const { x, y } = blob.position;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.radius);
  gradient.addColorStop(0, hslToCss(blob.hue, blob.saturation, Math.min(blob.lightness + 20, 80)));
  gradient.addColorStop(0.7, hslToCss(blob.hue, blob.saturation, blob.lightness));
  gradient.addColorStop(1, hslToCss(blob.hue, blob.saturation - 20, blob.lightness - 10));

  ctx.beginPath();
  ctx.arc(x, y, blob.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (blob.isFusion && blob.lifetime > 0) {
    const pulse = Math.sin(performance.now() / 100) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * pulse * (blob.lifetime / blob.maxLifetime)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const drawTrails = (ctx: CanvasRenderingContext2D, data: GameData): void => {
  drawTrail(ctx, data.creatures.warm);
  drawTrail(ctx, data.creatures.cool);
};

const drawTrail = (ctx: CanvasRenderingContext2D, creature: Creature): void => {
  for (const t of creature.trail) {
    if (t.alpha <= 0 || t.radius <= 0) continue;
    ctx.beginPath();
    ctx.arc(t.position.x, t.position.y, t.radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${t.hue}, 80%, 55%, ${t.alpha})`;
    ctx.fill();
  }
};

const drawCreatures = (ctx: CanvasRenderingContext2D, data: GameData): void => {
  drawCreature(ctx, data.creatures.warm);
  drawCreature(ctx, data.creatures.cool);
};

const drawCreature = (ctx: CanvasRenderingContext2D, creature: Creature): void => {
  const { x, y } = creature.position;

  for (const p of creature.particles) {
    const px = x + p.offset.x;
    const py = y + p.offset.y;

    const hueShift = (p.angle + creature.particleRotation) * 10;
    const particleHue = (creature.currentHue + hueShift) % 360;

    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = hslToCss(particleHue, creature.currentSaturation, creature.currentLightness);
    ctx.fill();
  }

  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, creature.radius);
  coreGradient.addColorStop(
    0,
    hslToCss(creature.currentHue, creature.currentSaturation, Math.min(creature.currentLightness + 30, 90))
  );
  coreGradient.addColorStop(
    0.6,
    hslToCss(creature.currentHue, creature.currentSaturation, creature.currentLightness)
  );
  coreGradient.addColorStop(
    1,
    hslToCss(creature.currentHue, creature.currentSaturation - 10, creature.currentLightness - 15)
  );

  ctx.beginPath();
  ctx.arc(x, y, creature.radius, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();

  ctx.strokeStyle = `hsla(${creature.currentHue}, 90%, 75%, 0.6)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (creature.pulseAlpha > 0 && creature.pulseColor) {
    const pulseRadius = creature.radius + 15 * (1 - creature.pulseAlpha);
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${creature.pulseColor.hue}, ${creature.pulseColor.saturation}%, ${creature.pulseColor.lightness}%, ${creature.pulseAlpha})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
};

const drawSplashParticles = (ctx: CanvasRenderingContext2D, data: GameData): void => {
  const particles = data.splashParticles.getAll();
  for (const p of particles) {
    if (!p.active) continue;

    const alpha = Math.max(0, p.lifetime / p.maxLifetime);
    ctx.beginPath();
    ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`;
    ctx.fill();
  }
};

const drawUI = (ctx: CanvasRenderingContext2D, data: GameData, width: number, height: number): void => {
  drawPlayerInfo(ctx, data.creatures.warm, 20, 20, true);
  drawPlayerInfo(ctx, data.creatures.cool, width - 220, 20, false);
  drawProgressBar(ctx, data, width, height);
};

const drawPlayerInfo = (
  ctx: CanvasRenderingContext2D,
  creature: Creature,
  x: number,
  y: number,
  isLeft: boolean
): void => {
  ctx.font = "bold 14px 'Courier New'";
  ctx.fillStyle = '#ffffff';
  const label = isLeft ? 'P1 - 暖色 (WASD)' : 'P2 - 冷色 (方向键)';
  ctx.fillText(label, x, y + 14);

  const iconY = y + 30;
  ctx.beginPath();
  ctx.arc(x + 15, iconY + 10, 10, 0, Math.PI * 2);
  ctx.fillStyle = hslToCss(creature.currentHue, creature.currentSaturation, creature.currentLightness);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + 55, iconY + 10, 12, 0, Math.PI * 2);
  ctx.fillStyle = hslToCss(creature.currentHue, creature.currentSaturation, creature.currentLightness);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "16px 'Courier New'";
  ctx.fillStyle = '#ffffff';
  const countLabel = `吞噬: ${creature.eatenCount}`;
  ctx.fillText(countLabel, x + 85, iconY + 16);

  ctx.font = "12px 'Courier New'";
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const sizeLabel = `体型: ${Math.round(creature.radius)}px`;
  ctx.fillText(sizeLabel, x, iconY + 42);
};

const drawProgressBar = (ctx: CanvasRenderingContext2D, data: GameData, width: number, height: number): void => {
  const barWidth = 600;
  const barHeight = 20;
  const barX = (width - barWidth) / 2;
  const barY = height - 50;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

  const warmHue = data.creatures.warm.currentHue;
  const coolHue = data.creatures.cool.currentHue;
  const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  gradient.addColorStop(0, hslToCss(warmHue, 85, 55));
  gradient.addColorStop(1, hslToCss(coolHue, 85, 55));
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const total = data.gameState.totalBlobs;
  const warmRatio = total > 0 ? data.gameState.warmEaten / total : 0;
  const coolRatio = total > 0 ? data.gameState.coolEaten / total : 0;
  const threshold = 0.7;

  const warmFill = warmRatio * barWidth;
  const coolFill = coolRatio * barWidth;
  const thresholdX = barWidth * threshold;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(barX, barY, barWidth - coolFill, barHeight);

  ctx.fillStyle = hslToCss(warmHue, 100, 65);
  ctx.fillRect(barX, barY, warmFill, barHeight);

  ctx.fillStyle = hslToCss(coolHue, 100, 65);
  ctx.fillRect(barX + barWidth - coolFill, barY, coolFill, barHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX + thresholdX, barY);
  ctx.lineTo(barX + thresholdX, barY + barHeight);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(barX - 5, barY + barHeight / 2, 8, 0, Math.PI * 2);
  ctx.fillStyle = hslToCss(warmHue, 85, 55);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(barX + barWidth + 5, barY + barHeight / 2, 8, 0, Math.PI * 2);
  ctx.fillStyle = hslToCss(coolHue, 85, 55);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 12px 'Courier New'";
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const pctText = `${Math.round(warmRatio * 100)}% : ${Math.round(coolRatio * 100)}%`;
  ctx.fillText(pctText, barX + barWidth / 2, barY + barHeight + 18);
  ctx.textAlign = 'left';
};

const drawStartScreen = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: GameData
): void => {
  const alpha = 1 - data.gameState.transitionAlpha;

  ctx.fillStyle = `rgba(26, 26, 46, ${0.85 * alpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';

  ctx.font = "bold 64px 'Courier New'";
  const titleGradient = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
  titleGradient.addColorStop(0, '#FF3333');
  titleGradient.addColorStop(0.5, '#FFFF33');
  titleGradient.addColorStop(1, '#3333FF');
  ctx.fillStyle = titleGradient;
  ctx.fillText('混沌调色盘', width / 2, height / 2 - 120);

  ctx.font = "24px 'Courier New'";
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillText('CHAOS PALETTE', width / 2, height / 2 - 70);

  ctx.font = "18px 'Courier New'";
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
  ctx.fillText('让你的生物吞噬同色系色块，率先吞噬 70% 色块获胜！', width / 2, height / 2 - 10);
  ctx.fillText('先达 70% 获得胜利！', width / 2, height / 2 + 20);

  ctx.font = "16px 'Courier New'";
  ctx.fillStyle = `rgba(255, 100, 100, ${0.9 * alpha})`;
  ctx.fillText('P1 - WASD 控制暖色生物', width / 2, height / 2 + 70);
  ctx.fillStyle = `rgba(100, 150, 255, ${0.9 * alpha})`;
  ctx.fillText('P2 - 方向键 控制冷色生物', width / 2, height / 2 + 100);

  const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
  ctx.font = "bold 28px 'Courier New'";
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse * alpha})`;
  ctx.fillText('[ 按 空格键 开始游戏 ]', width / 2, height / 2 + 170);

  ctx.textAlign = 'left';
};

const drawEndScreen = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: GameData
): void => {
  const alpha = Math.min(data.gameState.transitionAlpha, 1);
  if (alpha <= 0) return;

  ctx.fillStyle = `rgba(26, 26, 46, ${0.85 * alpha})`;
  ctx.fillRect(0, 0, width, height);

  const winner = data.gameState.winner === 'warm' ? data.creatures.warm : data.creatures.cool;
  const winnerLabel = data.gameState.winner === 'warm' ? '玩家 1 (暖色)' : '玩家 2 (冷色)';
  const rotation = data.gameState.winRotation;

  ctx.textAlign = 'center';

  const centerX = width / 2;
  const centerY = height / 2 - 50;

  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2 + rotation;
    const hue = (winner.currentHue + i * 10) % 360;
    const outerR = 120;
    const innerR = 90;
    const x1 = centerX + Math.cos(angle) * outerR;
    const y1 = centerY + Math.sin(angle) * outerR;
    const x2 = centerX + Math.cos(angle) * innerR;
    const y2 = centerY + Math.sin(angle) * innerR;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${0.9 * alpha})`;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const creatureSize = 60;
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, creatureSize);
  coreGradient.addColorStop(0, hslToCss(winner.currentHue, 90, 85));
  coreGradient.addColorStop(0.6, hslToCss(winner.currentHue, 85, 60));
  coreGradient.addColorStop(1, hslToCss(winner.currentHue, 80, 40));

  ctx.beginPath();
  ctx.arc(centerX, centerY, creatureSize, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = "bold 48px 'Courier New'";
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillText(`${winnerLabel} 胜利!`, width / 2, height / 2 + 140);

  ctx.font = "20px 'Courier New'";
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
  const winCount = winner.eatenCount;
  ctx.fillText(`吞噬了 ${winCount} 个色块`, width / 2, height / 2 + 180);

  const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
  ctx.font = "bold 24px 'Courier New'";
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse * alpha})`;
  ctx.fillText('[ 按 空格键 重新开始 ]', width / 2, height / 2 + 240);

  ctx.textAlign = 'left';
};

const drawTransition = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: GameData
): void => {
  const gs = data.gameState;
  if (gs.transitionAlpha > 0 && gs.transitionTarget === 'playing' && gs.status === 'playing') {
    ctx.fillStyle = `rgba(26, 26, 46, ${gs.transitionAlpha})`;
    ctx.fillRect(0, 0, width, height);
  }
};
