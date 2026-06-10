import {
  GameState,
  RingLayer,
  Star,
  Particle,
  COLORS,
  COLOR_NAMES,
  POLE_RADIUS,
  LAYER_SPACING,
  GRIP_RADIUS,
  calcGripScreenPos,
} from './GameManager';

const POLE_WIDTH = POLE_RADIUS * 2;
const LAYER_HEIGHT = 70;

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private hoverRestart = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  draw(state: GameState, time: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground(w, h);
    this.drawStars(state.stars, time);
    this.drawTotemPole(state);

    if (!state.isGameOver) {
      this.drawParticles(state.particles, state.cameraOffset);
      this.drawPlayer(state, time);
    }

    this.drawUI(state, w, h);

    if (state.player.comboGlowTimer > 0 && !state.isGameOver) {
      this.drawComboGlow(state, w, h);
    }

    if (state.isGameOver) {
      this.drawGameOver(state, w, h);
    }
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0b2d1e');
    grad.addColorStop(1, '#0a1a30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawStars(stars: Star[], time: number): void {
    const ctx = this.ctx;
    for (const star of stars) {
      const alpha = star.alpha * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawTotemPole(state: GameState): void {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const effectiveWidth = POLE_WIDTH * state.scale;

    const visibleLayers = this.getVisibleLayers(state);
    if (visibleLayers.length === 0) return;

    const topY = visibleLayers[visibleLayers.length - 1].y + state.cameraOffset - LAYER_HEIGHT / 2;
    const bottomY = visibleLayers[0].y + state.cameraOffset + LAYER_HEIGHT / 2;

    const poleGrad = ctx.createLinearGradient(centerX - effectiveWidth / 2, 0, centerX + effectiveWidth / 2, 0);
    poleGrad.addColorStop(0, '#5a4a3f');
    poleGrad.addColorStop(0.3, '#7b6b5f');
    poleGrad.addColorStop(0.5, '#8b7b6f');
    poleGrad.addColorStop(0.7, '#7b6b5f');
    poleGrad.addColorStop(1, '#5a4a3f');

    ctx.fillStyle = poleGrad;
    ctx.fillRect(centerX - effectiveWidth / 2, topY, effectiveWidth, bottomY - topY);

    ctx.strokeStyle = 'rgba(200, 168, 89, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - effectiveWidth / 2, topY, effectiveWidth, bottomY - topY);

    for (let i = 0; i < visibleLayers.length; i++) {
      const layer = visibleLayers[i];
      const layerY = layer.y + state.cameraOffset;

      const bandGrad = ctx.createLinearGradient(0, layerY - LAYER_HEIGHT / 2, 0, layerY + LAYER_HEIGHT / 2);
      const baseColor = layer.color;
      bandGrad.addColorStop(0, this.adjustAlpha(baseColor, 0.15));
      bandGrad.addColorStop(0.5, this.adjustAlpha(baseColor, 0.25));
      bandGrad.addColorStop(1, this.adjustAlpha(baseColor, 0.15));
      ctx.fillStyle = bandGrad;
      ctx.fillRect(centerX - effectiveWidth / 2, layerY - LAYER_HEIGHT / 2, effectiveWidth, LAYER_HEIGHT);

      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(centerX - effectiveWidth / 2 - 4, layerY - LAYER_HEIGHT / 2);
        ctx.lineTo(centerX + effectiveWidth / 2 + 4, layerY - LAYER_HEIGHT / 2);
        ctx.strokeStyle = '#c8a859';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (i === visibleLayers.length - 1) {
        ctx.beginPath();
        ctx.moveTo(centerX - effectiveWidth / 2 - 4, layerY + LAYER_HEIGHT / 2);
        ctx.lineTo(centerX + effectiveWidth / 2 + 4, layerY + LAYER_HEIGHT / 2);
        ctx.strokeStyle = '#c8a859';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      this.drawGripPoints(layer, state);
    }
  }

  private getVisibleLayers(state: GameState): RingLayer[] {
    const h = this.canvas.height;
    return state.layers.filter(layer => {
      const screenY = layer.y + state.cameraOffset;
      return screenY > -LAYER_HEIGHT && screenY < h + LAYER_HEIGHT;
    });
  }

  private drawGripPoints(layer: RingLayer, state: GameState): void {
    const ctx = this.ctx;

    const sortedPoints = [...layer.gripPoints].sort((a, b) => {
      const posA = calcGripScreenPos(this.canvas.width, state.cameraOffset, state.rotation, state.scale, layer.y, a.angle);
      const posB = calcGripScreenPos(this.canvas.width, state.cameraOffset, state.rotation, state.scale, layer.y, b.angle);
      return posA.depth - posB.depth;
    });

    for (const gp of sortedPoints) {
      const pos = calcGripScreenPos(this.canvas.width, state.cameraOffset, state.rotation, state.scale, layer.y, gp.angle);
      if (!pos.visible) continue;

      const depthScale = 0.7 + 0.3 * pos.depth;
      const drawRadius = gp.radius * gp.scaleAnim * state.scale * depthScale;
      const glowR = gp.glowRadius * gp.scaleAnim * state.scale * depthScale;

      const glowGrad = ctx.createRadialGradient(pos.x, pos.y, drawRadius * 0.5, pos.x, pos.y, glowR);
      glowGrad.addColorStop(0, this.adjustAlpha(gp.color, 0.4 * pos.depth));
      glowGrad.addColorStop(1, this.adjustAlpha(gp.color, 0));
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = gp.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, drawRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const highlightGrad = ctx.createRadialGradient(
        pos.x - drawRadius * 0.3, pos.y - drawRadius * 0.3, 0,
        pos.x, pos.y, drawRadius
      );
      highlightGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
      highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = highlightGrad;
      ctx.fill();

      if (gp.color === state.targetColor) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, drawRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = this.adjustAlpha(gp.color, 0.5 + 0.3 * Math.sin(Date.now() / 200));
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  private drawPlayer(state: GameState, time: number): void {
    const ctx = this.ctx;
    const player = state.player;
    let drawX = player.x;
    let drawY = player.y + state.cameraOffset;

    if (player.shakeTimer > 0) {
      const shakeProgress = player.shakeTimer / 0.2;
      const shakePhase = shakeProgress * 4 * Math.PI;
      drawY += Math.sin(shakePhase) * 5;
    }

    if (player.pulseTimer > 0) {
      const pulseProgress = player.pulseTimer / 0.5;
      const pulseRadius = player.radius + 20 * (1 - pulseProgress);
      const pulseAlpha = pulseProgress * 0.6;
      ctx.beginPath();
      ctx.arc(drawX, drawY, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      const pulseGlow = ctx.createRadialGradient(drawX, drawY, pulseRadius * 0.5, drawX, drawY, pulseRadius);
      pulseGlow.addColorStop(0, `rgba(255, 215, 0, ${pulseAlpha * 0.3})`);
      pulseGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.beginPath();
      ctx.arc(drawX, drawY, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = pulseGlow;
      ctx.fill();
    }

    const glowColor = player.isFalling ? '#ff3333' : '#4488ff';
    const bodyColor = player.isFalling ? '#ff3333' : '#ffffff';
    const glowAlpha = player.isFalling ? 0.6 : 0.4;

    const glowGrad = ctx.createRadialGradient(drawX, drawY, player.radius * 0.5, drawX, drawY, player.radius * 3);
    glowGrad.addColorStop(0, this.adjustAlpha(glowColor, glowAlpha));
    glowGrad.addColorStop(1, this.adjustAlpha(glowColor, 0));
    ctx.beginPath();
    ctx.arc(drawX, drawY, player.radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(drawX, drawY, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, player.radius);
    innerGlow.addColorStop(0, 'rgba(255,255,255,0.8)');
    innerGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(drawX, drawY, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
  }

  private drawParticles(particles: Particle[], cameraOffset: number): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const screenY = p.y + cameraOffset;
      const alpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.radius * alpha, 0, Math.PI * 2);
      ctx.fillStyle = this.adjustAlpha(p.color, alpha * 0.8);
      ctx.fill();

      const trailGrad = ctx.createRadialGradient(p.x, screenY, 0, p.x, screenY, p.radius * 2 * alpha);
      trailGrad.addColorStop(0, this.adjustAlpha(p.color, alpha * 0.3));
      trailGrad.addColorStop(1, this.adjustAlpha(p.color, 0));
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.radius * 2 * alpha, 0, Math.PI * 2);
      ctx.fillStyle = trailGrad;
      ctx.fill();
    }
  }

  private drawComboGlow(state: GameState, w: number, h: number): void {
    const ctx = this.ctx;
    const progress = state.player.comboGlowTimer / 0.8;
    const spread = w * 0.6 * (1 - progress * 0.3);
    const alpha = progress * 0.4;

    const glowGrad = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, spread);
    glowGrad.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    glowGrad.addColorStop(0.5, `rgba(255, 180, 0, ${alpha * 0.5})`);
    glowGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.beginPath();
    ctx.arc(w / 2, h, spread, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
  }

  private drawUI(state: GameState, w: number, h: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, 50);

    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`\u5F97\u5206: ${state.score}`, 20, 25);

    ctx.textAlign = 'center';
    ctx.fillText(`\u7B2C ${Math.max(0, state.layerIndex + 1)} \u5C42`, w / 2, 25);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('\u76EE\u6807:', w - 55, 25);

    const colorBlockX = w - 45;
    const colorBlockY = 10;
    const blockSize = 30;
    this.drawRoundRect(ctx, colorBlockX, colorBlockY, blockSize, blockSize, 4);
    ctx.fillStyle = state.targetColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const targetName = COLOR_NAMES[COLORS.indexOf(state.targetColor)] || '';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(targetName, colorBlockX + blockSize / 2, colorBlockY + blockSize / 2 + 1);

    if (state.player.isCombo && !state.isGameOver) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ffcc00';
      ctx.textAlign = 'left';
      ctx.fillText(`\u8FDE\u51FB! x${state.player.comboCount}`, 20, 46);
    }
  }

  private drawGameOver(state: GameState, w: number, h: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Game Over', w / 2, h / 2 - 60);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#ffcc00';
    const scoreGlowGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 120);
    scoreGlowGrad.addColorStop(0, 'rgba(255, 204, 0, 0.15)');
    scoreGlowGrad.addColorStop(1, 'rgba(255, 204, 0, 0)');
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
    ctx.fillStyle = scoreGlowGrad;
    ctx.fill();

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`\u6700\u7EC8\u5F97\u5206: ${state.score}`, w / 2, h / 2);

    const btnW = 200;
    const btnH = 50;
    const btnX = w / 2 - btnW / 2;
    const btnY = h / 2 + 50;
    const btnColor = this.hoverRestart ? '#4a8b45' : '#3a6b35';

    this.drawRoundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fillStyle = btnColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('\u91CD\u65B0\u5F00\u59CB', w / 2, btnY + btnH / 2);

    state.restartBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  private adjustAlpha(hexColor: string, alpha: number): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  setHoverRestart(value: boolean): void {
    this.hoverRestart = value;
  }
}
