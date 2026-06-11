import type { AnalysisResult, EmotionType } from './analyzer';
import { getEmotionColor } from './analyzer';

interface InkDot {
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  color: string;
  opacity: number;
  emotion: EmotionType;
  ripplePhase: number;
  rippleActive: boolean;
  anchorX: number;
  anchorY: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  gridX: number;
  gridY: number;
}

interface BrushStroke {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  color: string;
  opacity: number;
  baseLength: number;
  baseAngle: number;
  stretchFactor: number;
  targetStretch: number;
  flowOffset: number;
  flowSpeed: number;
  width: number;
}

interface ColorLayer {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  targetOpacity: number;
}

interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  active: boolean;
  startTime: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private animationStartTime: number = 0;

  private inkDots: InkDot[] = [];
  private brushStrokes: BrushStroke[] = [];
  private colorLayers: ColorLayer[] = [];
  private rippleEffects: RippleEffect[] = [];

  private spatialGrid: Map<string, InkDot[]> = new Map();
  private gridCellSize: number = 80;

  private offscreenBackground: HTMLCanvasElement | null = null;
  private offscreenBgCtx: CanvasRenderingContext2D | null = null;
  private backgroundDirty: boolean = true;

  private analysisResult: AnalysisResult | null = null;

  private lastRippleTrigger: number = 0;

  private readonly RIPPLE_DURATION = 800;
  private readonly MAX_RIPPLES = 5;
  private readonly RIPPLE_INFLUENCE_RADIUS = 150;
  private readonly RIPPLE_THROTTLE = 80;
  private readonly MAX_DOTS = 25;
  private readonly MAX_STROKES = 15;

  private resizeHandler: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);

    this.resize();
    this.animationStartTime = performance.now();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.offscreenBackground = document.createElement('canvas');
    this.offscreenBackground.width = Math.floor(this.width * this.dpr);
    this.offscreenBackground.height = Math.floor(this.height * this.dpr);
    this.offscreenBgCtx = this.offscreenBackground.getContext('2d');
    if (this.offscreenBgCtx) {
      this.offscreenBgCtx.scale(this.dpr, this.dpr);
    }

    this.backgroundDirty = true;
    this.gridCellSize = Math.max(60, Math.min(this.width, this.height) / 8);

    if (this.analysisResult) {
      this.generateFromAnalysis(this.analysisResult);
    }
  }

  updateAnalysis(result: AnalysisResult): void {
    this.analysisResult = result;
    this.generateFromAnalysis(result);
    this.backgroundDirty = true;
  }

  private generateFromAnalysis(result: AnalysisResult): void {
    this.inkDots = [];
    this.brushStrokes = [];
    this.colorLayers = [];
    this.rippleEffects = [];
    this.spatialGrid.clear();

    if (result.sentences.length === 0) return;

    this.generateColorLayers(result);
    this.generateInkDots(result);
    this.generateBrushStrokes(result);
    this.buildSpatialGrid();
  }

  private generateColorLayers(result: AnalysisResult): void {
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm', 'anxious'];
    const totalIntensity = emotions.reduce((sum, e) => sum + result.overallEmotions[e], 0);

    if (totalIntensity === 0) {
      this.colorLayers.push({
        x: this.width / 2,
        y: this.height / 2,
        radius: Math.max(this.width, this.height) * 0.7,
        color: '#D4C9B8',
        opacity: 0,
        targetOpacity: 0.08
      });
      return;
    }

    const positions = [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.25, y: 0.75 },
      { x: 0.75, y: 0.75 }
    ];

    let posIndex = 0;
    for (const emotion of emotions) {
      const intensity = result.overallEmotions[emotion];
      if (intensity > 0) {
        const ratio = intensity / totalIntensity;
        const pos = positions[posIndex % positions.length];
        this.colorLayers.push({
          x: this.width * pos.x + (Math.random() - 0.5) * this.width * 0.08,
          y: this.height * pos.y + (Math.random() - 0.5) * this.height * 0.08,
          radius: Math.max(this.width, this.height) * (0.35 + ratio * 0.3),
          color: getEmotionColor(emotion),
          opacity: 0,
          targetOpacity: 0.12 + ratio * 0.18
        });
        posIndex++;
      }
    }
  }

  private generateInkDots(result: AnalysisResult): void {
    const padX = this.width * 0.12;
    const padY = this.height * 0.12;
    const usableWidth = this.width - padX * 2;
    const usableHeight = this.height - padY * 2;

    const emotionXOffset: Record<EmotionType, number> = {
      happy: -0.18,
      sad: 0.18,
      angry: -0.1,
      calm: 0.1,
      anxious: 0
    };

    let dotCount = 0;

    for (let sIdx = 0; sIdx < result.sentences.length && dotCount < this.MAX_DOTS; sIdx++) {
      const sentence = result.sentences[sIdx];

      const baseX = padX + sentence.charIndex * usableWidth;
      const baseY = padY + usableHeight * 0.5;

      const dotsForSentence = Math.min(sentence.keywords.length + 1, 3);

      for (let i = 0; i < dotsForSentence && dotCount < this.MAX_DOTS; i++) {
        const emotion = i === 0
          ? sentence.dominantEmotion
          : (sentence.keywords[i - 1]?.emotion || sentence.dominantEmotion);
        const intensity = i === 0
          ? sentence.intensity
          : (sentence.keywords[i - 1]?.intensity || sentence.intensity);

        const emotionOffset = emotionXOffset[emotion] * usableWidth * 0.3;
        const jitterX = (Math.random() - 0.5) * 50;
        const jitterY = (Math.random() - 0.5) * (usableHeight * 0.6);

        const x = Math.max(padX + 20, Math.min(this.width - padX - 20, baseX + emotionOffset + jitterX));
        const y = Math.max(padY + 20, Math.min(this.height - padY - 20, baseY + jitterY));

        const baseRadius = 10 + intensity * 7;

        this.inkDots.push({
          x,
          y,
          baseRadius,
          currentRadius: baseRadius * 0.3,
          targetRadius: baseRadius,
          color: getEmotionColor(emotion),
          opacity: 0.55 + Math.random() * 0.2,
          emotion,
          ripplePhase: 0,
          rippleActive: false,
          anchorX: x,
          anchorY: y,
          wobbleOffset: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.4 + Math.random() * 0.4,
          gridX: 0,
          gridY: 0
        });

        dotCount++;
      }
    }
  }

  private generateBrushStrokes(result: AnalysisResult): void {
    const padX = this.width * 0.12;
    const padY = this.height * 0.12;
    const usableWidth = this.width - padX * 2;
    const usableHeight = this.height - padY * 2;

    let strokeCount = 0;

    for (let sIdx = 0; sIdx < result.sentences.length && strokeCount < this.MAX_STROKES; sIdx++) {
      const sentence = result.sentences[sIdx];
      if (sentence.keywords.length === 0) continue;

      for (let i = 0; i < Math.min(sentence.keywords.length, 2) && strokeCount < this.MAX_STROKES; i++) {
        const keyword = sentence.keywords[i];

        const keywordRatio = result.totalChars > 0 ? keyword.position / result.totalChars : 0.5;
        const baseX = padX + keywordRatio * usableWidth;
        const baseY = padY + usableHeight * 0.5 + (Math.random() - 0.5) * usableHeight * 0.5;

        const angle = (keyword.position * 37) % (Math.PI * 2) + (Math.random() - 0.5) * 1.2;
        const length = 25 + sentence.intensity * 12 + Math.random() * 15;

        const endX = baseX + Math.cos(angle) * length;
        const endY = baseY + Math.sin(angle) * length;
        const controlX = (baseX + endX) / 2 + (Math.random() - 0.5) * length * 0.6;
        const controlY = (baseY + endY) / 2 + (Math.random() - 0.5) * length * 0.6;

        this.brushStrokes.push({
          startX: baseX,
          startY: baseY,
          controlX,
          controlY,
          endX,
          endY,
          color: getEmotionColor(keyword.emotion),
          opacity: 0.28 + Math.random() * 0.25,
          baseLength: length,
          baseAngle: angle,
          stretchFactor: 1,
          targetStretch: 1,
          flowOffset: Math.random() * Math.PI * 2,
          flowSpeed: 0.25 + Math.random() * 0.35,
          width: 1.5 + keyword.intensity * 1.2
        });

        strokeCount++;
      }
    }
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    for (const dot of this.inkDots) {
      dot.gridX = Math.floor(dot.x / this.gridCellSize);
      dot.gridY = Math.floor(dot.y / this.gridCellSize);
      const key = `${dot.gridX},${dot.gridY}`;
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key)!.push(dot);
    }
  }

  private findNearestDotSpatially(x: number, y: number): InkDot | null {
    const cellX = Math.floor(x / this.gridCellSize);
    const cellY = Math.floor(y / this.gridCellSize);
    let nearest: InkDot | null = null;
    let nearestDist = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.spatialGrid.get(key);
        if (!cell) continue;

        for (const dot of cell) {
          const dist = Math.hypot(dot.x - x, dot.y - y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = dot;
          }
        }
      }
    }

    return nearest && nearestDist < this.RIPPLE_INFLUENCE_RADIUS ? nearest : null;
  }

  handleMouseMove(x: number, y: number): void {
    const now = performance.now();

    if (now - this.lastRippleTrigger > this.RIPPLE_THROTTLE) {
      const nearest = this.findNearestDotSpatially(x, y);
      if (nearest && !nearest.rippleActive) {
        const activeRipples = this.rippleEffects.filter(r => r.active).length;
        if (activeRipples < this.MAX_RIPPLES) {
          nearest.rippleActive = true;
          nearest.ripplePhase = 0;

          this.rippleEffects.push({
            x: nearest.x,
            y: nearest.y,
            radius: nearest.baseRadius,
            maxRadius: nearest.baseRadius * 2.5,
            opacity: 0.55,
            color: nearest.color,
            active: true,
            startTime: now
          });

          this.lastRippleTrigger = now;
        }
      }
    }

    this.updateStrokeStretch(x, y);
  }

  private updateStrokeStretch(mouseX: number, mouseY: number): void {
    const radiusSq = this.RIPPLE_INFLUENCE_RADIUS * this.RIPPLE_INFLUENCE_RADIUS;

    for (const stroke of this.brushStrokes) {
      const midX = (stroke.startX + stroke.endX) * 0.5;
      const midY = (stroke.startY + stroke.endY) * 0.5;
      const dx = midX - mouseX;
      const dy = midY - mouseY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const influence = 1 - dist / this.RIPPLE_INFLUENCE_RADIUS;
        const mouseAngle = Math.atan2(mouseY - midY, mouseX - midX);
        let angleDiff = Math.abs(mouseAngle - stroke.baseAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff < Math.PI * 0.6) {
          stroke.targetStretch = 1 + influence * 0.2;
        } else {
          stroke.targetStretch = Math.max(1, 1 + influence * 0.05);
        }
      } else {
        stroke.targetStretch = 1;
      }
    }
  }

  render(timestamp: number): void {
    const deltaTime = this.lastFrameTime ? Math.min((timestamp - this.lastFrameTime) / 1000, 0.05) : 0;
    this.lastFrameTime = timestamp;
    const elapsed = timestamp - this.animationStartTime;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.renderBackgroundLayers(deltaTime);
    if (this.offscreenBackground && this.offscreenBgCtx) {
      this.ctx.drawImage(this.offscreenBackground, 0, 0, this.width, this.height);
    }

    this.updateAndRenderBrushStrokes(deltaTime);
    this.updateAndRenderInkDots(deltaTime, elapsed);
    this.updateAndRenderRipples(timestamp);
  }

  private renderBackgroundLayers(deltaTime: number): void {
    if (!this.offscreenBgCtx || !this.backgroundDirty) return;

    const bgCtx = this.offscreenBgCtx;
    bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    bgCtx.clearRect(0, 0, this.width, this.height);

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'multiply';

    let allStable = true;
    for (const layer of this.colorLayers) {
      const prevOpacity = layer.opacity;
      layer.opacity += (layer.targetOpacity - layer.opacity) * deltaTime * 1.5;
      if (Math.abs(layer.opacity - prevOpacity) > 0.001) allStable = false;

      const gradient = bgCtx.createRadialGradient(
        layer.x, layer.y, 0,
        layer.x, layer.y, layer.radius
      );

      const alphaHex = (v: number) => Math.floor(v * 255).toString(16).padStart(2, '0');
      gradient.addColorStop(0, layer.color + alphaHex(layer.opacity));
      gradient.addColorStop(0.45, layer.color + alphaHex(layer.opacity * 0.55));
      gradient.addColorStop(1, layer.color + '00');

      bgCtx.fillStyle = gradient;
      bgCtx.beginPath();
      bgCtx.arc(layer.x, layer.y, layer.radius, 0, Math.PI * 2);
      bgCtx.fill();
    }

    bgCtx.restore();
    this.backgroundDirty = !allStable;
  }

  private updateAndRenderBrushStrokes(deltaTime: number): void {
    for (const stroke of this.brushStrokes) {
      stroke.stretchFactor += (stroke.targetStretch - stroke.stretchFactor) * deltaTime * 6;
      stroke.flowOffset += deltaTime * stroke.flowSpeed;

      const flowWave = Math.sin(stroke.flowOffset) * 4;
      const stretch = stroke.stretchFactor;

      const midX = (stroke.startX + stroke.endX) * 0.5;
      const midY = (stroke.startY + stroke.endY) * 0.5;

      const startX = midX + (stroke.startX - midX) * stretch + flowWave * 0.3;
      const startY = midY + (stroke.startY - midY) * stretch;
      const endX = midX + (stroke.endX - midX) * stretch - flowWave * 0.3;
      const endY = midY + (stroke.endY - midY) * stretch;
      const controlX = stroke.controlX + flowWave;
      const controlY = stroke.controlY + flowWave * 0.5;

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'multiply';
      this.ctx.globalAlpha = stroke.opacity;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);

      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(startX + 1.5, startY + 1);
      this.ctx.quadraticCurveTo(controlX + 2.5, controlY + 1.5, endX + 1.5, endY + 1);
      this.ctx.globalAlpha = stroke.opacity * 0.25;
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.lineWidth = stroke.width * 0.45;
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private updateAndRenderInkDots(deltaTime: number, elapsed: number): void {
    const t = elapsed / 1000;

    for (const dot of this.inkDots) {
      dot.currentRadius += (dot.targetRadius - dot.currentRadius) * deltaTime * 3;

      if (dot.rippleActive) {
        dot.ripplePhase += deltaTime * 1000 / this.RIPPLE_DURATION;
        if (dot.ripplePhase >= 1) {
          dot.ripplePhase = 0;
          dot.rippleActive = false;
        }
      }

      const wobble = Math.sin(t * dot.wobbleSpeed + dot.wobbleOffset) * 1.5;
      const rippleScale = dot.rippleActive ? 1 + Math.sin(dot.ripplePhase * Math.PI) * 0.5 : 1;
      const renderRadius = dot.currentRadius * rippleScale + wobble;

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'multiply';

      const gradient = this.ctx.createRadialGradient(
        dot.x - renderRadius * 0.18, dot.y - renderRadius * 0.18, 0,
        dot.x, dot.y, renderRadius
      );

      const a0 = Math.floor(dot.opacity * 200).toString(16).padStart(2, '0');
      const a1 = Math.floor(dot.opacity * 255).toString(16).padStart(2, '0');
      const a2 = Math.floor(dot.opacity * 90).toString(16).padStart(2, '0');
      gradient.addColorStop(0, dot.color + a0);
      gradient.addColorStop(0.6, dot.color + a1);
      gradient.addColorStop(0.85, dot.color + a2);
      gradient.addColorStop(1, dot.color + '00');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, renderRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = dot.opacity * 0.25;

      for (let i = 0; i < 2; i++) {
        const splashAngle = (t * 0.5 + i * 2.3) % (Math.PI * 2);
        const splashDist = renderRadius * (0.75 + Math.sin(t * 2 + i * 1.7) * 0.18);
        const splashX = dot.x + Math.cos(splashAngle) * splashDist;
        const splashY = dot.y + Math.sin(splashAngle) * splashDist;
        const splashRadius = renderRadius * (0.12 + ((i * 0.07) % 0.1));

        const sg = this.ctx.createRadialGradient(splashX, splashY, 0, splashX, splashY, splashRadius);
        sg.addColorStop(0, dot.color + '66');
        sg.addColorStop(1, dot.color + '00');

        this.ctx.fillStyle = sg;
        this.ctx.beginPath();
        this.ctx.arc(splashX, splashY, splashRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private updateAndRenderRipples(now: number): void {
    for (const ripple of this.rippleEffects) {
      if (!ripple.active) continue;

      const elapsed = now - ripple.startTime;
      const progress = Math.min(elapsed / this.RIPPLE_DURATION, 1);

      ripple.radius = ripple.radius + (ripple.maxRadius - ripple.radius) * 0.15;
      ripple.opacity = 0.55 * (1 - progress);

      if (progress >= 1 || ripple.opacity <= 0.01) {
        ripple.active = false;
        continue;
      }

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = ripple.opacity;

      const gradient = this.ctx.createRadialGradient(
        ripple.x, ripple.y, ripple.radius * 0.75,
        ripple.x, ripple.y, ripple.radius
      );
      const midAlpha = Math.floor(ripple.opacity * 140).toString(16).padStart(2, '0');
      gradient.addColorStop(0, ripple.color + '00');
      gradient.addColorStop(0.5, ripple.color + midAlpha);
      gradient.addColorStop(1, ripple.color + '00');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    if (this.rippleEffects.length > this.MAX_RIPPLES * 2) {
      this.rippleEffects = this.rippleEffects.filter(r => r.active);
    }
  }

  exportPNG(): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.floor(this.width * this.dpr);
    exportCanvas.height = Math.floor(this.height * this.dpr);
    const exportCtx = exportCanvas.getContext('2d');

    if (!exportCtx) throw new Error('Failed to create export context');

    exportCtx.scale(this.dpr, this.dpr);
    exportCtx.clearRect(0, 0, this.width, this.height);

    exportCtx.save();
    exportCtx.globalCompositeOperation = 'multiply';
    for (const layer of this.colorLayers) {
      const gradient = exportCtx.createRadialGradient(
        layer.x, layer.y, 0,
        layer.x, layer.y, layer.radius
      );
      const alphaHex = (v: number) => Math.floor(v * 255).toString(16).padStart(2, '0');
      gradient.addColorStop(0, layer.color + alphaHex(layer.targetOpacity));
      gradient.addColorStop(0.45, layer.color + alphaHex(layer.targetOpacity * 0.55));
      gradient.addColorStop(1, layer.color + '00');
      exportCtx.fillStyle = gradient;
      exportCtx.beginPath();
      exportCtx.arc(layer.x, layer.y, layer.radius, 0, Math.PI * 2);
      exportCtx.fill();
    }
    exportCtx.restore();

    exportCtx.save();
    exportCtx.globalCompositeOperation = 'multiply';
    for (const stroke of this.brushStrokes) {
      exportCtx.globalAlpha = stroke.opacity;
      exportCtx.beginPath();
      exportCtx.moveTo(stroke.startX, stroke.startY);
      exportCtx.quadraticCurveTo(stroke.controlX, stroke.controlY, stroke.endX, stroke.endY);
      exportCtx.strokeStyle = stroke.color;
      exportCtx.lineWidth = stroke.width;
      exportCtx.lineCap = 'round';
      exportCtx.stroke();
    }
    exportCtx.restore();

    exportCtx.save();
    exportCtx.globalCompositeOperation = 'multiply';
    for (const dot of this.inkDots) {
      const gradient = exportCtx.createRadialGradient(
        dot.x - dot.targetRadius * 0.18, dot.y - dot.targetRadius * 0.18, 0,
        dot.x, dot.y, dot.targetRadius
      );
      const a0 = Math.floor(dot.opacity * 200).toString(16).padStart(2, '0');
      const a1 = Math.floor(dot.opacity * 255).toString(16).padStart(2, '0');
      const a2 = Math.floor(dot.opacity * 90).toString(16).padStart(2, '0');
      gradient.addColorStop(0, dot.color + a0);
      gradient.addColorStop(0.6, dot.color + a1);
      gradient.addColorStop(0.85, dot.color + a2);
      gradient.addColorStop(1, dot.color + '00');
      exportCtx.fillStyle = gradient;
      exportCtx.beginPath();
      exportCtx.arc(dot.x, dot.y, dot.targetRadius, 0, Math.PI * 2);
      exportCtx.fill();
    }
    exportCtx.restore();

    return exportCanvas.toDataURL('image/png');
  }

  reset(): void {
    this.inkDots = [];
    this.brushStrokes = [];
    this.colorLayers = [];
    this.rippleEffects = [];
    this.analysisResult = null;
    this.spatialGrid.clear();
    this.backgroundDirty = true;

    if (this.offscreenBgCtx) {
      this.offscreenBgCtx.clearRect(0, 0, this.width, this.height);
    }
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  startAnimationLoop(): void {
    const loop = (timestamp: number) => {
      this.render(timestamp);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  hasContent(): boolean {
    return this.inkDots.length > 0 || this.brushStrokes.length > 0;
  }
}
