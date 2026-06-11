import { Player } from './player';

export interface MissText {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  active: boolean;
}

export class UIRenderer {
  private missTexts: MissText[] = [];
  private maxMissTexts = 20;

  constructor() {
    for (let i = 0; i < this.maxMissTexts; i++) {
      this.missTexts.push({ x: 0, y: 0, startTime: 0, duration: 0, active: false });
    }
  }

  spawnMiss(x: number, y: number, now: number) {
    for (const m of this.missTexts) {
      if (m.active) continue;
      m.x = x;
      m.y = y;
      m.startTime = now;
      m.duration = 1000;
      m.active = true;
      return;
    }
  }

  update(now: number) {
    for (const m of this.missTexts) {
      if (!m.active) continue;
      if (now - m.startTime >= m.duration) {
        m.active = false;
      }
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, stagePulse: number) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
    grad.addColorStop(0, '#1A0033');
    grad.addColorStop(1, '#000011');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (stagePulse > 0) {
      const alpha = stagePulse * 0.5;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 60, 60, ${alpha})`;
      ctx.lineWidth = 8;
      ctx.shadowColor = '#FF3333';
      ctx.shadowBlur = 30 * stagePulse;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.restore();
    }
  }

  drawTarget(ctx: CanvasRenderingContext2D, cx: number, cy: number, isEnergyFull: boolean, targetFlash: number, now: number) {
    ctx.save();

    const pulse = isEnergyFull ? 1 + Math.sin(now * 0.006) * 0.08 : 1;
    const outerR = 60 * pulse;
    const innerR = 30 * pulse;

    if (isEnergyFull) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 30;
    }

    const ringColor = targetFlash > 0 ? `rgba(255, 80, 80, ${targetFlash})` : (isEnergyFull ? '#FFD700' : 'rgba(180, 180, 180, 0.6)');
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.shadowBlur = isEnergyFull ? 30 : 4;
    ctx.shadowColor = isEnergyFull ? '#FFD700' : 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = isEnergyFull ? 'rgba(255, 215, 0, 0.4)' : 'rgba(180, 180, 180, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.stroke();

    if (isEnergyFull) {
      ctx.fillStyle = `rgba(255, 215, 0, ${0.2 + Math.sin(now * 0.01) * 0.1})`;
      ctx.beginPath();
      ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawHUD(
    ctx: CanvasRenderingContext2D,
    player: Player,
    now: number,
    gameTime: number,
    totalTime: number,
    stage: number,
    stageTransitionAnim: number
  ) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();
    ctx.textAlign = 'left';

    let comboScale = 1;
    if (player.comboAnimTime > 0) {
      const t = 1 - player.comboAnimTime / 300;
      comboScale = 1 + Math.sin(t * Math.PI) * 0.4;
    }

    const comboIsRed = player.isShowingMissFlash();
    const comboAlpha = comboIsRed ? (0.5 + Math.sin(now * 0.05) * 0.5) : 1;
    const comboColor = comboIsRed ? '#FF4444' : '#FFFFFF';

    const displayCombo = player.getDisplayCombo();
    ctx.font = `bold ${Math.floor(42 * comboScale)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = comboColor;
    ctx.shadowColor = comboIsRed ? '#FF4444' : '#00E5FF';
    ctx.shadowBlur = 4;
    ctx.globalAlpha = comboAlpha;
    ctx.fillText(`${displayCombo}`, 30, 60);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.shadowBlur = 2;
    ctx.globalAlpha = 1;
    ctx.fillText('COMBO', 30, 85);

    ctx.textAlign = 'right';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 4;
    ctx.fillText(`${player.score}`, w - 30, 60);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.shadowBlur = 2;
    ctx.fillText('SCORE', w - 30, 85);

    const barW = Math.min(300, w * 0.4);
    const barH = 14;
    const barX = (w - barW) / 2;
    const barY = h - 50;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
    ctx.strokeStyle = 'rgba(150, 150, 200, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, barX, barY, barW, barH, 7);
    ctx.fill();
    ctx.stroke();

    const energyRatio = player.energy / 100;
    if (energyRatio > 0) {
      const isFull = player.isEnergyFull();
      const fillColor = isFull ? '#FFD700' : '#00E5FF';
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW * energyRatio, barY);
      fillGrad.addColorStop(0, fillColor + 'CC');
      fillGrad.addColorStop(1, fillColor);
      ctx.fillStyle = fillGrad;
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = isFull ? 12 : 4;
      roundRect(ctx, barX + 2, barY + 2, (barW - 4) * energyRatio, barH - 4, 5);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('ENERGY', w / 2, barY - 8);

    const timeLeft = Math.max(0, Math.ceil((totalTime - gameTime) / 1000));
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = timeLeft <= 10 ? '#FF6666' : '#FFFFFF';
    ctx.shadowColor = timeLeft <= 10 ? '#FF4444' : '#FFFFFF';
    ctx.shadowBlur = 4;
    ctx.fillText(`${timeLeft}`, w / 2, 50);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.shadowBlur = 0;
    ctx.fillText(`STAGE ${stage}`, w / 2, 70);

    if (stageTransitionAnim > 0) {
      ctx.globalAlpha = stageTransitionAnim;
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#FF4444';
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 16;
      ctx.fillText(`STAGE ${stage}`, w / 2, h / 2 - 40);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#FFAAAA';
      ctx.shadowBlur = 8;
      ctx.fillText('难度提升！', w / 2, h / 2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawMissTexts(ctx: CanvasRenderingContext2D, now: number) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px sans-serif';
    for (const m of this.missTexts) {
      if (!m.active) continue;
      const t = (now - m.startTime) / m.duration;
      const alpha = 1 - easeOutCubic(t);
      const yOffset = easeOutCubic(t) * 50;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FF4444';
      ctx.shadowBlur = 8;
      ctx.fillText('Miss', m.x, m.y - yOffset);
    }
    ctx.restore();
  }

  drawStartScreen(ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
    ctx.fillRect(0, 0, w, h);

    const titlePulse = 1 + Math.sin(now * 0.003) * 0.05;
    ctx.font = `bold ${Math.floor(56 * titlePulse)}px sans-serif`;
    ctx.fillStyle = '#FF6EC7';
    ctx.shadowColor = '#FF6EC7';
    ctx.shadowBlur = 20;
    ctx.fillText('弦音裂空', w / 2, h / 2 - 100);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 4;
    ctx.fillText('点击或触摸屏幕开始游戏', w / 2, h / 2);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.shadowBlur = 0;
    ctx.fillText('在光球到达中心靶点时点击，能量满时点击中心释放大招', w / 2, h / 2 + 60);
    ctx.fillText('共90秒，每30秒难度提升', w / 2, h / 2 + 85);

    ctx.restore();
  }

  drawEndScreen(ctx: CanvasRenderingContext2D, w: number, h: number, score: number, maxCombo: number, now: number, resetAnim: number) {
    ctx.save();

    if (resetAnim > 0) {
      ctx.globalAlpha = resetAnim;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0, 0, 20, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';

    ctx.font = 'bold 42px sans-serif';
    ctx.fillStyle = '#00E5FF';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 16;
    ctx.fillText('游戏结束', w / 2, h / 2 - 140);

    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillText(`${score}`, w / 2, h / 2 - 40);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.shadowBlur = 2;
    ctx.fillText('总得分', w / 2, h / 2 - 10);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#FF6EC7';
    ctx.shadowColor = '#FF6EC7';
    ctx.shadowBlur = 8;
    ctx.fillText(`${maxCombo}`, w / 2, h / 2 + 50);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.shadowBlur = 2;
    ctx.fillText('最高连击', w / 2, h / 2 + 75);

    const btnW = 200;
    const btnH = 56;
    const btnX = (w - btnW) / 2;
    const btnY = h / 2 + 130;
    const btnPulse = 1 + Math.sin(now * 0.005) * 0.04;

    ctx.save();
    ctx.translate(w / 2, btnY + btnH / 2);
    ctx.scale(btnPulse, btnPulse);
    ctx.translate(-w / 2, -(btnY + btnH / 2));

    ctx.fillStyle = '#2A0A4A';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12;
    roundRect(ctx, btnX, btnY, btnW, btnH, 28);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 6;
    ctx.fillText('再来一次', w / 2, btnY + btnH / 2 + 7);

    (ctx as any)._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
