import type { AnalysisResult, EmotionType } from './analyzer';
import { emotionColors } from './analyzer';

interface InkDot {
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  color: string;
  alpha: number;
  emotion: EmotionType;
  sentenceIndex: number;
  ripplePhase: number;
  rippleActive: boolean;
  seed: number;
}

interface BrushStroke {
  startX: number;
  startY: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  endX: number;
  endY: number;
  baseLength: number;
  color: string;
  alpha: number;
  width: number;
  emotion: EmotionType;
  stretchFactor: number;
  targetStretch: number;
  angle: number;
}

interface Ripple {
  x: number;
  y: number;
  baseRadius: number;
  maxRadius: number;
  color: string;
  startTime: number;
  duration: number;
}

interface ColorLayer {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export class InkRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number = 0;
  private height: number = 0;

  private dots: InkDot[] = [];
  private strokes: BrushStroke[] = [];
  private ripples: Ripple[] = [];
  private colorLayers: ColorLayer[] = [];

  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  private animationId: number | null = null;
  private lastTime: number = 0;

  private analysisResult: AnalysisResult | null = null;

  private paperTexturePattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.createPaperTexture();
    this.bindEvents();
    this.startAnimation();
  }

  private createPaperTexture(): void {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 128;
    texCanvas.height = 128;
    const texCtx = texCanvas.getContext('2d');
    if (!texCtx) return;

    texCtx.fillStyle = '#F9F5EE';
    texCtx.fillRect(0, 0, 128, 128);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const size = Math.random() * 1.5;
      const alpha = Math.random() * 0.05;
      texCtx.fillStyle = `rgba(139, 123, 107, ${alpha})`;
      texCtx.beginPath();
      texCtx.arc(x, y, size, 0, Math.PI * 2);
      texCtx.fill();
    }

    this.paperTexturePattern = this.ctx.createPattern(texCanvas, 'repeat');
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    if (width <= 0 || height <= 0) {
      const parent = this.canvas.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        width = width <= 0 ? parentRect.width : width;
        height = height <= 0 ? parentRect.height : height;
      }
    }

    this.width = width;
    this.height = height;
    this.canvas.width = Math.max(1, width * this.dpr);
    this.canvas.height = Math.max(1, height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.createPaperTexture();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    this.triggerNearbyRipples();
    this.stretchNearbyStrokes();
  }

  private triggerNearbyRipples(): void {
    const triggerRadius = 120;
    const now = performance.now();

    for (const dot of this.dots) {
      const dist = Math.hypot(this.mouseX - dot.x, this.mouseY - dot.y);
      if (dist < triggerRadius && !dot.rippleActive) {
        dot.rippleActive = true;
        dot.ripplePhase = 0;
        this.ripples.push({
          x: dot.x,
          y: dot.y,
          baseRadius: dot.baseRadius,
          maxRadius: dot.baseRadius * 1.5,
          color: dot.color,
          startTime: now,
          duration: 800
        });
      }
    }
  }

  private stretchNearbyStrokes(): void {
    const stretchRadius = 150;
    const dx = this.mouseX - this.prevMouseX;
    const dy = this.mouseY - this.prevMouseY;
    const moveDist = Math.hypot(dx, dy);

    if (moveDist < 0.5) return;

    for (const stroke of this.strokes) {
      const midX = (stroke.startX + stroke.endX) / 2;
      const midY = (stroke.startY + stroke.endY) / 2;
      const dist = Math.hypot(this.mouseX - midX, this.mouseY - midY);

      if (dist < stretchRadius) {
        const influence = 1 - dist / stretchRadius;
        const stretchAmount = Math.min(0.2, influence * 0.2 * Math.min(1, moveDist / 10));
        stroke.targetStretch = Math.max(0, Math.min(0.2, stretchAmount));
      }
    }
  }

  setAnalysis(result: AnalysisResult): void {
    this.analysisResult = result;
    this.resize();
    this.generateElements();
  }

  private generateElements(): void {
    if (!this.analysisResult) return;

    this.dots = [];
    this.strokes = [];
    this.colorLayers = [];
    this.ripples = [];

    const { sentences, overallEmotions } = this.analysisResult;
    const totalSentences = sentences.length;

    if (totalSentences === 0) return;

    const padding = 60;
    const usableWidth = this.width - padding * 2;
    const usableHeight = this.height - padding * 2;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence.primaryEmotion) continue;

      const progress = totalSentences > 1 ? i / (totalSentences - 1) : 0.5;

      const baseX = padding + (0.2 + progress * 0.6) * usableWidth + (Math.random() - 0.5) * 60;
      const baseY = padding + (0.3 + (sentence.anchorIndex / 500) * 0.4) * usableHeight + (Math.random() - 0.5) * 40;

      const dotCount = Math.max(1, Math.min(5, sentence.keywords.length));
      const baseRadius = 10 + (sentence.intensity / 5) * 40;

      for (let j = 0; j < dotCount; j++) {
        const angle = (j / dotCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = baseRadius * 0.3 * Math.random();
        const dotX = baseX + Math.cos(angle) * distance;
        const dotY = baseY + Math.sin(angle) * distance;
        const radius = baseRadius * (0.6 + Math.random() * 0.6);

        const keyword = sentence.keywords[j % sentence.keywords.length];
        const color = emotionColors[keyword.emotion];

        this.dots.push({
          x: dotX,
          y: dotY,
          baseRadius: radius,
          currentRadius: radius,
          targetRadius: radius,
          color,
          alpha: 0.5 + Math.random() * 0.3,
          emotion: keyword.emotion,
          sentenceIndex: i,
          ripplePhase: 0,
          rippleActive: false,
          seed: Math.random() * 1000
        });
      }

      const strokeCount = Math.floor(2 + sentence.intensity * 1.5);
      for (let j = 0; j < strokeCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const length = 30 + Math.random() * 60;

        const sx = baseX + (Math.random() - 0.5) * baseRadius;
        const sy = baseY + (Math.random() - 0.5) * baseRadius;
        const ex = sx + Math.cos(angle) * length;
        const ey = sy + Math.sin(angle) * length;

        const midDist = length * (0.3 + Math.random() * 0.4);
        const perpAngle = angle + Math.PI / 2;
        const cp1Offset = (Math.random() - 0.5) * length * 0.4;
        const cp2Offset = (Math.random() - 0.5) * length * 0.4;

        const cp1x = sx + Math.cos(angle) * midDist + Math.cos(perpAngle) * cp1Offset;
        const cp1y = sy + Math.sin(angle) * midDist + Math.sin(perpAngle) * cp1Offset;
        const cp2x = sx + Math.cos(angle) * (length - midDist) + Math.cos(perpAngle) * cp2Offset;
        const cp2y = sy + Math.sin(angle) * (length - midDist) + Math.sin(perpAngle) * cp2Offset;

        const keyword = sentence.keywords[j % sentence.keywords.length];

        this.strokes.push({
          startX: sx,
          startY: sy,
          cp1x,
          cp1y,
          cp2x,
          cp2y,
          endX: ex,
          endY: ey,
          baseLength: length,
          color: emotionColors[keyword.emotion],
          alpha: 0.3 + Math.random() * 0.3,
          width: 3 + Math.random() * 5,
          emotion: keyword.emotion,
          stretchFactor: 0,
          targetStretch: 0,
          angle
        });
      }
    }

    const emotions = Object.keys(overallEmotions) as EmotionType[];
    let totalScore = 0;
    for (const emotion of emotions) {
      totalScore += overallEmotions[emotion];
    }

    if (totalScore > 0) {
      const sortedEmotions = emotions
        .filter(e => overallEmotions[e] > 0)
        .sort((a, b) => overallEmotions[b] - overallEmotions[a]);

      const positions = [
        { x: 0.35, y: 0.35 },
        { x: 0.65, y: 0.40 },
        { x: 0.50, y: 0.65 },
        { x: 0.30, y: 0.60 },
        { x: 0.70, y: 0.65 }
      ];

      const rawRatios = sortedEmotions.map(e => overallEmotions[e] / totalScore);
      const sumRaw = rawRatios.reduce((s, r) => s + r, 0);
      const normalizedRatios = rawRatios.map(r => r / sumRaw);

      sortedEmotions.forEach((emotion, idx) => {
        const ratio = normalizedRatios[idx];
        const pos = positions[idx % positions.length];
        const jitterX = (Math.random() - 0.5) * 0.15;
        const jitterY = (Math.random() - 0.5) * 0.15;
        const layerX = this.width * (pos.x + jitterX);
        const layerY = this.height * (pos.y + jitterY);
        const baseRadius = Math.max(this.width, this.height) * 0.45;
        const layerRadius = baseRadius * (0.6 + ratio * 0.6);

        this.colorLayers.push({
          x: layerX,
          y: layerY,
          radius: layerRadius,
          color: emotionColors[emotion],
          alpha: 0.08 + ratio * 0.18
        });
      });
    }
  }

  private startAnimation(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(deltaTime: number): void {
    const now = performance.now();
    const dt = deltaTime / 16.67;

    for (const dot of this.dots) {
      const driftX = Math.sin((now + dot.seed) / 2000) * 0.3;
      const driftY = Math.cos((now + dot.seed) / 2500) * 0.3;
      dot.x += driftX * dt;
      dot.y += driftY * dt;

      if (dot.rippleActive) {
        dot.ripplePhase += deltaTime / 800;
        if (dot.ripplePhase >= 1) {
          dot.rippleActive = false;
          dot.ripplePhase = 0;
          dot.targetRadius = dot.baseRadius;
        } else {
          const phase = dot.ripplePhase;
          if (phase < 0.5) {
            dot.targetRadius = dot.baseRadius * (1 + phase * 2);
          } else {
            dot.targetRadius = dot.baseRadius * (2 - phase * 2);
          }
        }
      }

      dot.currentRadius += (dot.targetRadius - dot.currentRadius) * 0.15 * dt;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const elapsed = now - ripple.startTime;
      if (elapsed >= ripple.duration) {
        this.ripples.splice(i, 1);
      }
    }

    for (const stroke of this.strokes) {
      stroke.stretchFactor += (stroke.targetStretch - stroke.stretchFactor) * 0.1 * dt;
      stroke.stretchFactor = Math.max(0, Math.min(0.2, stroke.stretchFactor));
      stroke.targetStretch *= 0.98;
      stroke.targetStretch = Math.max(0, Math.min(0.2, stroke.targetStretch));
    }
  }

  private render(): void {
    const ctx = this.ctx;

    for (const stroke of this.strokes) {
      stroke.stretchFactor = Math.max(0, Math.min(0.2, stroke.stretchFactor));
    }

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawPaperBackground();
    this.drawInkContent(ctx);
  }

  private drawInkContent(ctx: CanvasRenderingContext2D): void {
    this.drawColorLayersTo(ctx);
    this.drawStrokesTo(ctx);
    this.drawRipplesTo(ctx);
    this.drawDotsTo(ctx);
  }

  private drawColorLayersTo(ctx: CanvasRenderingContext2D): void {
    for (const layer of this.colorLayers) {
      const gradient = ctx.createRadialGradient(
        layer.x, layer.y, 0,
        layer.x, layer.y, layer.radius
      );

      const c1 = this.hexToRgba(layer.color, layer.alpha);
      const c2 = this.hexToRgba(layer.color, layer.alpha * 0.6);
      const c3 = this.hexToRgba(layer.color, layer.alpha * 0.25);
      const c4 = this.hexToRgba(layer.color, 0);

      gradient.addColorStop(0, c1);
      gradient.addColorStop(0.35, c2);
      gradient.addColorStop(0.7, c3);
      gradient.addColorStop(1, c4);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(layer.x, layer.y, layer.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStrokesTo(ctx: CanvasRenderingContext2D): void {
    for (const stroke of this.strokes) {
      const clampedStretch = Math.max(0, Math.min(0.2, stroke.stretchFactor));
      const stretch = 1 + clampedStretch;

      const midX = (stroke.startX + stroke.endX) / 2;
      const midY = (stroke.startY + stroke.endY) / 2;

      const dx = stroke.endX - stroke.startX;
      const dy = stroke.endY - stroke.startY;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) continue;
      const nx = dx / len;
      const ny = dy / len;

      const sX = midX - nx * (len * stretch / 2);
      const sY = midY - ny * (len * stretch / 2);
      const eX = midX + nx * (len * stretch / 2);
      const eY = midY + ny * (len * stretch / 2);

      const perpX = -ny;
      const perpY = nx;

      const cp1Offset = (stroke.cp1x - stroke.startX) * perpX + (stroke.cp1y - stroke.startY) * perpY;
      const cp2Offset = (stroke.cp2x - stroke.startX) * perpX + (stroke.cp2y - stroke.startY) * perpY;

      const cp1Along = 0.3 * len * stretch;
      const cp2Along = 0.7 * len * stretch;

      const cp1x = sX + nx * cp1Along + perpX * cp1Offset;
      const cp1y = sY + ny * cp1Along + perpY * cp1Offset;
      const cp2x = sX + nx * cp2Along + perpX * cp2Offset;
      const cp2y = sY + ny * cp2Along + perpY * cp2Offset;

      ctx.save();
      ctx.globalAlpha = stroke.alpha;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(sX, sY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, eX, eY);
      ctx.stroke();

      ctx.globalAlpha = stroke.alpha * 0.5;
      ctx.lineWidth = stroke.width * 0.4;
      ctx.beginPath();
      ctx.moveTo(sX, sY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, eX, eY);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawRipplesTo(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();

    for (const ripple of this.ripples) {
      const elapsed = now - ripple.startTime;
      const t = Math.min(1, elapsed / ripple.duration);

      const radius: number = t < 0.5
        ? ripple.baseRadius + (ripple.maxRadius - ripple.baseRadius) * (t * 2)
        : ripple.maxRadius - (ripple.maxRadius - ripple.baseRadius) * ((t - 0.5) * 2);

      const alpha: number = t < 0.5
        ? 0.4
        : 0.4 * (1 - (t - 0.5) * 2);

      ctx.save();
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, Math.max(0, radius), 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = Math.max(0, alpha * 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, Math.max(0, radius * 0.9), 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawDotsTo(ctx: CanvasRenderingContext2D): void {
    for (const dot of this.dots) {
      const gradient = ctx.createRadialGradient(
        dot.x - dot.currentRadius * 0.2,
        dot.y - dot.currentRadius * 0.2,
        0,
        dot.x,
        dot.y,
        dot.currentRadius
      );

      const rgba = this.hexToRgba(dot.color, dot.alpha);
      const rgbaEdge = this.hexToRgba(dot.color, dot.alpha * 0.1);

      gradient.addColorStop(0, rgba);
      gradient.addColorStop(0.6, this.hexToRgba(dot.color, dot.alpha * 0.7));
      gradient.addColorStop(1, rgbaEdge);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = dot.alpha * 0.3;
      ctx.fillStyle = '#3B3228';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + dot.seed;
        const dist = dot.currentRadius * (0.7 + ((Math.sin(dot.seed + i) + 1) / 2) * 0.5);
        const sx = dot.x + Math.cos(angle) * dist;
        const sy = dot.y + Math.sin(angle) * dist;
        const size = dot.currentRadius * 0.05 + ((Math.cos(dot.seed + i * 2) + 1) / 2) * 2;

        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPaperBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#F9F5EE';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.paperTexturePattern) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = this.paperTexturePattern;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  exportPNG(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { alpha: true });
    if (!tempCtx) return '';

    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.scale(this.dpr, this.dpr);
    this.drawInkContent(tempCtx);

    return tempCanvas.toDataURL('image/png');
  }

  clear(): void {
    this.dots = [];
    this.strokes = [];
    this.ripples = [];
    this.colorLayers = [];
    this.analysisResult = null;
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
