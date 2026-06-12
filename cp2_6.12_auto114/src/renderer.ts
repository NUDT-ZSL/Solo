import { EmotionType, Plant } from './plant';
import { Particle, ParticleSystem } from './particles';

export interface EmotionButton {
  x: number;
  y: number;
  radius: number;
  emotion: EmotionType;
  scale: number;
  hover: boolean;
}

export interface GameState {
  canvasWidth: number;
  canvasHeight: number;
  gardenX: number;
  gardenY: number;
  gardenWidth: number;
  gardenHeight: number;
  currentEmotion: EmotionType;
  emotionValues: Record<EmotionType, number>;
  emotionColors: Record<EmotionType, { start: string; end: string }>;
  backgroundTransitionProgress: number;
  previousEmotion: EmotionType;
  haloProgress: number;
  haloActive: boolean;
  pointerProgress: number;
  pointerTargetIndex: number;
  waterBubbles: { x: number; y: number; text: string; age: number; lifespan: number }[];
  fps: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 230, g: 255, b: 179 };
}

function rgbStr(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function interpolateGradient(
  c1Start: string,
  c1End: string,
  c2Start: string,
  c2End: string,
  t: number
): { start: string; end: string } {
  const s1 = hexToRgb(c1Start);
  const e1 = hexToRgb(c1End);
  const s2 = hexToRgb(c2Start);
  const e2 = hexToRgb(c2End);

  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    start: rgbStr(lerp(s1.r, s2.r), lerp(s1.g, s2.g), lerp(s1.b, s2.b)),
    end: rgbStr(lerp(e1.r, e2.r), lerp(e1.g, e2.g), lerp(e1.b, e2.b)),
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private buttons: EmotionButton[] = [];
  private pointerY = 0;
  private buttonContainerY = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  layoutButtons(canvasWidth: number, canvasHeight: number) {
    const buttonDiameter = 60;
    const buttonRadius = buttonDiameter / 2;
    const spacing = 80;
    this.buttonContainerY = canvasHeight - 200;

    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    const totalHeight = (emotions.length - 1) * spacing;
    const startY = this.buttonContainerY - totalHeight / 2;

    this.buttons = emotions.map((emotion, i) => ({
      x: 80,
      y: startY + i * spacing,
      radius: buttonRadius,
      emotion,
      scale: 1,
      hover: false,
    }));

    this.pointerY = this.buttons[0].y;
  }

  getButtons(): EmotionButton[] {
    return this.buttons;
  }

  setButtonScale(index: number, scale: number) {
    if (this.buttons[index]) {
      this.buttons[index].scale = scale;
    }
  }

  setButtonHover(index: number, hover: boolean) {
    if (this.buttons[index]) {
      this.buttons[index].hover = hover;
    }
  }

  render(
    state: GameState,
    plants: Plant[],
    particleSystem: ParticleSystem,
    deltaTime: number
  ) {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = state;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    this.updatePointer(state, deltaTime);

    this.drawBackground(state);
    this.drawGardenGrid(state);
    this.drawPlants(plants);
    this.drawParticles(particleSystem.getParticles(), state);
    this.drawHalo(state);
    this.drawProgressBar(state);
    this.drawButtons(state);
    this.drawPointer(state);
    this.drawWaterBubbles(state, deltaTime);
  }

  private updatePointer(state: GameState, deltaTime: number) {
    if (!this.buttons[state.pointerTargetIndex]) return;

    const targetY = this.buttons[state.pointerTargetIndex].y;
    const moveSpeed = 0.4 * 1000;
    const diff = targetY - this.pointerY;
    const maxMove = (deltaTime / moveSpeed) * Math.abs(diff) * 2.5;

    if (Math.abs(diff) <= maxMove) {
      this.pointerY = targetY;
    } else {
      this.pointerY += Math.sign(diff) * maxMove;
    }
  }

  private drawBackground(state: GameState) {
    const ctx = this.ctx;
    const { gardenX, gardenY, gardenWidth, gardenHeight, emotionColors } = state;

    const prevColors = emotionColors[state.previousEmotion];
    const currColors = emotionColors[state.currentEmotion];
    const t = easeOutCubic(state.backgroundTransitionProgress);

    const gradient = interpolateGradient(
      prevColors.start,
      prevColors.end,
      currColors.start,
      currColors.end,
      t
    );

    const bgGradient = ctx.createLinearGradient(gardenX, gardenY, gardenX, gardenY + gardenHeight);
    bgGradient.addColorStop(0, gradient.start);
    bgGradient.addColorStop(1, gradient.end);

    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.roundRect(gardenX, gardenY, gardenWidth, gardenHeight, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(gardenX, gardenY, gardenWidth, gardenHeight, 16);
    ctx.stroke();
  }

  private drawGardenGrid(state: GameState) {
    const ctx = this.ctx;
    const { gardenX, gardenY, gardenWidth, gardenHeight } = state;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(gardenX, gardenY, gardenWidth, gardenHeight, 16);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    const gridSize = 40;
    for (let x = gardenX; x <= gardenX + gardenWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, gardenY);
      ctx.lineTo(x, gardenY + gardenHeight);
      ctx.stroke();
    }
    for (let y = gardenY; y <= gardenY + gardenHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gardenX, y);
      ctx.lineTo(gardenX + gardenWidth, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawHalo(state: GameState) {
    if (!state.haloActive) return;

    const ctx = this.ctx;
    const { gardenX, gardenY, gardenWidth, gardenHeight } = state;
    const cx = gardenX + gardenWidth / 2;
    const cy = gardenY + gardenHeight / 2;

    const t = state.haloProgress;
    const maxRadius = Math.max(gardenWidth, gardenHeight) * 0.6;
    const radius = easeOutCubic(t) * maxRadius;
    const opacity = Math.sin(t * Math.PI) * 0.4;

    const colors: Record<EmotionType, string> = {
      happy: 'rgba(255, 255, 200, ',
      sad: 'rgba(150, 150, 255, ',
      angry: 'rgba(255, 100, 100, ',
      calm: 'rgba(180, 240, 255, ',
    };

    const haloColor = colors[state.currentEmotion];

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, haloColor + opacity + ')');
    gradient.addColorStop(0.5, haloColor + opacity * 0.5 + ')');
    gradient.addColorStop(1, haloColor + '0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlants(plants: Plant[]) {
    const sorted = [...plants].sort((a, b) => a.y - b.y);
    for (const plant of sorted) {
      this.drawPlant(plant);
    }
  }

  private drawPlant(plant: Plant) {
    const ctx = this.ctx;
    const render = plant.getRenderState();
    const { state, opacity, scaleY, colorOverride, waterFlash, shakeOffset } = render;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(plant.x + shakeOffset, plant.y);
    ctx.scale(1, scaleY);

    const stemTop = -state.stemHeight;
    ctx.fillStyle = '#2d8a3e';
    ctx.fillRect(-state.stemWidth / 2, stemTop, state.stemWidth, state.stemHeight);

    const leaf1Y = stemTop + state.stemHeight * 0.35;
    const leaf2Y = stemTop + state.stemHeight * 0.65;
    this.drawLeaf(state, -1, leaf1Y);
    this.drawLeaf(state, 1, leaf2Y);

    ctx.save();
    ctx.translate(0, stemTop);
    ctx.rotate((state.flowerTiltAngle * Math.PI) / 180);
    this.drawFlower(state, colorOverride);
    ctx.restore();

    if (waterFlash > 0) {
      const flashColor = `rgba(100, 255, 150, ${waterFlash * 0.6})`;
      ctx.fillStyle = flashColor;
      ctx.beginPath();
      ctx.ellipse(0, stemTop / 2, state.leafSize + 20, state.stemHeight / 2 + 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawLeaf(state: any, side: number, y: number) {
    const ctx = this.ctx;
    const size = state.leafSize;
    const roundness = state.leafRoundness;
    const serrations = Math.round(state.leafSerrations);
    const bendAngle = (state.leafBendAngle * Math.PI) / 180;

    ctx.save();
    ctx.translate(side * 6, y);
    ctx.rotate(side * bendAngle);

    const width = size;
    const height = size * 0.55;

    ctx.fillStyle = '#3da851';
    ctx.beginPath();

    if (serrations > 0) {
      this.drawSerratedLeaf(ctx, width, height, serrations);
    } else {
      this.drawRoundedLeaf(ctx, width, height, roundness);
    }

    ctx.fill();

    ctx.strokeStyle = 'rgba(30, 100, 40, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * width * 0.85, 0);
    ctx.stroke();

    ctx.restore();
  }

  private drawRoundedLeaf(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
    const rx = (w / 2) * r;
    const ry = (h / 2) * r;
    const cw = w / 2 - rx;
    const ch = h / 2 - ry;

    ctx.moveTo(w / 2, 0);
    ctx.bezierCurveTo(w / 2 - cw, -h / 2 + ry, rx, -h / 2, 0, -h / 2);
    ctx.bezierCurveTo(-rx, -h / 2, -w / 2 + cw, -h / 2 + ry, -w / 2, 0);
    ctx.bezierCurveTo(-w / 2 + cw, h / 2 - ry, -rx, h / 2, 0, h / 2);
    ctx.bezierCurveTo(rx, h / 2, w / 2 - cw, h / 2 - ry, w / 2, 0);
    ctx.closePath();
  }

  private drawSerratedLeaf(ctx: CanvasRenderingContext2D, w: number, h: number, serrations: number) {
    const points = serrations * 2;
    const step = (Math.PI * 2) / points;
    const baseW = w / 2;
    const baseH = h / 2;

    for (let i = 0; i <= points; i++) {
      const angle = i * step - Math.PI / 2;
      const isSpike = i % 2 === 1;
      const scale = isSpike ? 1.0 : 0.8;
      const x = Math.cos(angle) * baseW * scale;
      const y = Math.sin(angle) * baseH * scale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  private drawFlower(state: any, colorOverride: string | null) {
    const ctx = this.ctx;
    const radius = state.flowerRadius;
    const color = colorOverride || state.flowerColor;
    const openness = state.flowerOpenness;
    const spikiness = state.flowerSpikiness;

    const petalCount = 6;
    const petalLength = radius * (0.8 + 0.6 * openness);
    const petalWidth = radius * (0.5 + 0.2 * openness);

    const flowerColor = color;
    const petalColor = this.lightenColor(flowerColor, 20);

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;

      ctx.save();
      ctx.rotate(angle);

      ctx.fillStyle = petalColor;
      ctx.beginPath();

      if (spikiness > 0.5) {
        const spikeDepth = 3 + 4 * spikiness;
        ctx.moveTo(0, -petalWidth / 2);
        ctx.lineTo(petalLength * 0.3, -petalWidth / 2 - spikeDepth);
        ctx.lineTo(petalLength * 0.6, -petalWidth / 3);
        ctx.lineTo(petalLength * 0.85, 0 - spikeDepth * 0.7);
        ctx.lineTo(petalLength, 0);
        ctx.lineTo(petalLength * 0.85, 0 + spikeDepth * 0.7);
        ctx.lineTo(petalLength * 0.6, petalWidth / 3);
        ctx.lineTo(petalLength * 0.3, petalWidth / 2 + spikeDepth);
        ctx.lineTo(0, petalWidth / 2);
        ctx.closePath();
      } else {
        ctx.ellipse(petalLength / 2, 0, petalLength / 2, petalWidth / 2, 0, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();
    }

    const centerR = radius * 0.35;
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, centerR);
    centerGradient.addColorStop(0, '#fff8a0');
    centerGradient.addColorStop(1, this.darkenColor(flowerColor, 10));

    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();
  }

  private lightenColor(hex: string, percent: number): string {
    const c = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    return rgbStr(
      Math.min(255, c.r + amt),
      Math.min(255, c.g + amt),
      Math.min(255, c.b + amt)
    );
  }

  private darkenColor(hex: string, percent: number): string {
    const c = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    return rgbStr(
      Math.max(0, c.r - amt),
      Math.max(0, c.g - amt),
      Math.max(0, c.b - amt)
    );
  }

  private drawParticles(particles: Particle[], state: GameState) {
    const ctx = this.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(state.gardenX, state.gardenY, state.gardenWidth, state.gardenHeight, 16);
    ctx.clip();

    for (const p of particles) {
      switch (p.type) {
        case 'butterfly':
          this.drawButterfly(p);
          break;
        case 'raindrop':
          this.drawRaindrop(p);
          break;
        case 'fire':
          this.drawFire(p);
          break;
        case 'glow':
          this.drawGlow(p);
          break;
      }
    }

    ctx.restore();
  }

  private drawButterfly(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;

    const wingScale = 0.5 + 0.5 * Math.abs(Math.sin(p.custom.wingPhase));
    const wingW = p.size * wingScale;
    const wingH = p.size * 0.7;

    const goldColor = '#ffd700';
    const darkerGold = '#daa520';

    ctx.fillStyle = goldColor;
    ctx.beginPath();
    ctx.ellipse(-wingW / 2, -wingH / 3, wingW / 2, wingH / 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-wingW / 2.5, wingH / 3, wingW / 3, wingH / 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(wingW / 2, -wingH / 3, wingW / 2, wingH / 2, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(wingW / 2.5, wingH / 3, wingW / 3, wingH / 3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = darkerGold;
    ctx.fillRect(-1, -p.size * 0.4, 2, p.size * 0.8);

    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.beginPath();
    ctx.arc(-wingW / 2, -wingH / 3, 2, 0, Math.PI * 2);
    ctx.arc(wingW / 2, -wingH / 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRaindrop(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.opacity;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, 'rgba(180, 200, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(120, 150, 220, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(150, 180, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 6);
    ctx.stroke();

    ctx.restore();
  }

  private drawFire(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.opacity;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.9)');
    gradient.addColorStop(0.6, 'rgba(255, 80, 30, 0.7)');
    gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();

    const flicker = Math.sin(p.age * 0.03) * 0.15;
    const s = p.size * (1 + flicker);
    ctx.moveTo(p.x, p.y - s * 1.5);
    ctx.quadraticCurveTo(p.x + s, p.y - s * 0.3, p.x + s * 0.5, p.y + s * 0.3);
    ctx.quadraticCurveTo(p.x, p.y + s * 0.5, p.x - s * 0.5, p.y + s * 0.3);
    ctx.quadraticCurveTo(p.x - s, p.y - s * 0.3, p.x, p.y - s * 1.5);
    ctx.fill();

    ctx.restore();
  }

  private drawGlow(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.opacity;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
    gradient.addColorStop(0, 'rgba(200, 240, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(150, 210, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawProgressBar(state: GameState) {
    const ctx = this.ctx;
    const barX = 20;
    const barY = 20;
    const barW = 200;
    const barH = 8;
    const iconSize = 20;

    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    const maxEmotion = emotions.reduce((a, b) => (state.emotionValues[a] > state.emotionValues[b] ? a : b));
    const maxValue = state.emotionValues[maxEmotion];

    const progressColors: Record<EmotionType, string> = {
      happy: '#ffcc00',
      sad: '#6699ff',
      angry: '#ff4444',
      calm: '#66ccff',
    };

    const bgColor = '#e0e0e0';
    ctx.fillStyle = bgColor;
    this.roundRect(ctx, barX + iconSize + 10, barY, barW, barH, 4);
    ctx.fill();

    const progressW = (maxValue / 100) * barW;
    const progressColor = progressColors[maxEmotion];
    const pulseScale = 1 + 0.05 * Math.sin(Date.now() / 200);
    const animatedW = progressW * (state.pointerProgress > 0 ? easeOutBack(Math.min(1, state.pointerProgress)) : 1);
    const finalW = animatedW * pulseScale;

    const gradient = ctx.createLinearGradient(barX + iconSize + 10, 0, barX + iconSize + 10 + barW, 0);
    gradient.addColorStop(0, this.lightenColor(progressColor, 20));
    gradient.addColorStop(1, progressColor);

    ctx.fillStyle = gradient;
    this.roundRect(ctx, barX + iconSize + 10, barY, finalW, barH, 4);
    ctx.fill();

    this.drawEmotionIcon(ctx, barX + iconSize / 2 + 5, barY + barH / 2, iconSize / 2, maxEmotion, 1);

    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(barX + iconSize + 10 + barW + iconSize / 2 + 5, barY + barH / 2, iconSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(barX + iconSize + 10 + barW + iconSize / 2 + 5, barY + barH / 2, iconSize / 2 - 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#666';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(maxValue)}%`, barX + iconSize + 15, barY + barH + 14);
  }

  private drawButtons(state: GameState) {
    const ctx = this.ctx;
    const emotionColors: Record<EmotionType, string> = {
      happy: '#ffcc00',
      sad: '#6699ff',
      angry: '#ff4444',
      calm: '#66cc99',
    };

    for (const btn of this.buttons) {
      const baseScale = btn.scale;
      const hoverScale = btn.hover ? 1.1 : 1;
      const totalScale = baseScale * hoverScale;

      ctx.save();
      ctx.translate(btn.x, btn.y);
      ctx.scale(totalScale, totalScale);

      const shadowGradient = ctx.createRadialGradient(0, 5, 0, 0, 5, btn.radius * 1.3);
      shadowGradient.addColorStop(0, 'rgba(0,0,0,0.3)');
      shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.arc(0, 5, btn.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      const btnColor = emotionColors[btn.emotion];
      const gradient = ctx.createRadialGradient(-btn.radius * 0.3, -btn.radius * 0.3, 0, 0, 0, btn.radius);
      gradient.addColorStop(0, this.lightenColor(btnColor, 30));
      gradient.addColorStop(1, this.darkenColor(btnColor, 15));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, btn.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, btn.radius, 0, Math.PI * 2);
      ctx.stroke();

      this.drawEmotionIcon(ctx, 0, 0, btn.radius * 0.6, btn.emotion, 1);

      ctx.restore();
    }
  }

  private drawEmotionIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    emotion: EmotionType,
    alpha: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;

    switch (emotion) {
      case 'happy':
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.arc(r * 0.35, -r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, r * 0.1, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        break;

      case 'sad':
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.2, r * 0.13, 0, Math.PI * 2);
        ctx.arc(r * 0.35, -r * 0.2, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.15, r * 0.08, 0, Math.PI * 2);
        ctx.arc(r * 0.35, -r * 0.15, r * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, r * 0.35, r * 0.45, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
        break;

      case 'angry':
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2.5, r * 0.14);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, -r * 0.35);
        ctx.lineTo(-r * 0.15, -r * 0.15);
        ctx.moveTo(r * 0.55, -r * 0.35);
        ctx.lineTo(r * 0.15, -r * 0.15);
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.05, r * 0.13, 0, Math.PI * 2);
        ctx.arc(r * 0.3, -r * 0.05, r * 0.13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.beginPath();
        ctx.arc(0, r * 0.4, r * 0.4, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
        break;

      case 'calm':
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(1.5, r * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.6);
        ctx.quadraticCurveTo(-r * 0.3, -r * 0.8, -r * 0.15, -r * 0.6);
        ctx.moveTo(r * 0.15, -r * 0.6);
        ctx.quadraticCurveTo(r * 0.3, -r * 0.8, r * 0.5, -r * 0.6);
        ctx.stroke();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.15);
        ctx.lineTo(-r * 0.2, -r * 0.15);
        ctx.moveTo(r * 0.2, -r * 0.15);
        ctx.lineTo(r * 0.35, -r * 0.15);
        ctx.stroke();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(1.5, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.7);
        ctx.quadraticCurveTo(0, r * 0.5, r * 0.3, r * 0.5);
        ctx.quadraticCurveTo(r * 0.55, r * 0.5, r * 0.55, r * 0.25);
        ctx.quadraticCurveTo(r * 0.55, 0, r * 0.3, -r * 0.05);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  private drawPointer(state: GameState) {
    const ctx = this.ctx;
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    const emotionColors: Record<EmotionType, string> = {
      happy: '#ffcc00',
      sad: '#6699ff',
      angry: '#ff4444',
      calm: '#66cc99',
    };

    const px = this.buttons[0] ? this.buttons[0].x : 80;
    const py = this.pointerY - 50;
    const color = emotionColors[emotions[state.pointerTargetIndex] || 'happy'];

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, 18);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawWaterBubbles(state: GameState, deltaTime: number) {
    const ctx = this.ctx;
    const toRemove: number[] = [];

    for (let i = 0; i < state.waterBubbles.length; i++) {
      const b = state.waterBubbles[i];
      b.age += deltaTime;
      if (b.age >= b.lifespan) {
        toRemove.push(i);
        continue;
      }

      const t = b.age / b.lifespan;
      const yOffset = -t * 40;
      const opacity = Math.sin(t * Math.PI);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(b.x, b.y + yOffset);

      const bubbleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      bubbleGradient.addColorStop(0, 'rgba(200, 255, 220, 0.9)');
      bubbleGradient.addColorStop(1, 'rgba(150, 220, 180, 0)');

      ctx.fillStyle = bubbleGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2d8a3e';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, 0, 0);

      ctx.restore();
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      state.waterBubbles.splice(toRemove[i], 1);
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
