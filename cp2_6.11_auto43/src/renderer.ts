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
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;
  private animationId: number | null = null;
  private lastTimestamp: number = 0;
  
  private inkDots: InkDot[] = [];
  private brushStrokes: BrushStroke[] = [];
  private colorLayers: ColorLayer[] = [];
  private rippleEffects: RippleEffect[] = [];
  
  private analysisResult: AnalysisResult | null = null;
  
  private readonly RIPPLE_DURATION = 800;
  private readonly MAX_RIPPLES = 5;
  private readonly RIPPLE_INFLUENCE_RADIUS = 150;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    
    if (this.analysisResult) {
      this.generateFromAnalysis(this.analysisResult);
    }
  }

  updateAnalysis(result: AnalysisResult): void {
    this.analysisResult = result;
    this.generateFromAnalysis(result);
  }

  private generateFromAnalysis(result: AnalysisResult): void {
    this.inkDots = [];
    this.brushStrokes = [];
    this.colorLayers = [];
    this.rippleEffects = [];
    
    if (result.sentences.length === 0) return;
    
    this.generateColorLayers(result);
    this.generateInkDots(result);
    this.generateBrushStrokes(result);
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
        targetOpacity: 0.1
      });
      return;
    }
    
    const positions = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.5, y: 0.5 },
      { x: 0.3, y: 0.7 },
      { x: 0.7, y: 0.7 }
    ];
    
    let posIndex = 0;
    for (const emotion of emotions) {
      const intensity = result.overallEmotions[emotion];
      if (intensity > 0) {
        const ratio = intensity / totalIntensity;
        const pos = positions[posIndex % positions.length];
        this.colorLayers.push({
          x: this.width * pos.x + (Math.random() - 0.5) * this.width * 0.1,
          y: this.height * pos.y + (Math.random() - 0.5) * this.height * 0.1,
          radius: Math.max(this.width, this.height) * (0.4 + ratio * 0.3),
          color: getEmotionColor(emotion),
          opacity: 0,
          targetOpacity: 0.15 + ratio * 0.2
        });
        posIndex++;
      }
    }
  }

  private generateInkDots(result: AnalysisResult): void {
    const maxDots = Math.min(result.sentences.length * 3, 30);
    let dotCount = 0;
    
    for (const sentence of result.sentences) {
      if (dotCount >= maxDots) break;
      
      const baseX = this.width * (0.2 + sentence.position * 0.6);
      const baseY = this.height * (0.2 + Math.random() * 0.6);
      
      const dotsForSentence = Math.min(sentence.keywords.length + 1, 4);
      
      for (let i = 0; i < dotsForSentence && dotCount < maxDots; i++) {
        const emotion = i === 0 ? sentence.dominantEmotion : 
          (sentence.keywords[i - 1]?.emotion || sentence.dominantEmotion);
        const intensity = i === 0 ? sentence.intensity : 
          (sentence.keywords[i - 1]?.intensity || sentence.intensity);
        
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        const x = baseX + offsetX;
        const y = baseY + offsetY;
        
        const baseRadius = 10 + intensity * 8;
        
        this.inkDots.push({
          x,
          y,
          baseRadius,
          currentRadius: baseRadius * 0.5,
          targetRadius: baseRadius,
          color: getEmotionColor(emotion),
          opacity: 0.6 + Math.random() * 0.2,
          emotion,
          ripplePhase: 0,
          rippleActive: false,
          anchorX: x,
          anchorY: y,
          wobbleOffset: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.5 + Math.random() * 0.5
        });
        
        dotCount++;
      }
    }
  }

  private generateBrushStrokes(result: AnalysisResult): void {
    const maxStrokes = Math.min(result.sentences.length * 2, 20);
    let strokeCount = 0;
    
    for (const sentence of result.sentences) {
      if (strokeCount >= maxStrokes) break;
      
      if (sentence.keywords.length === 0) continue;
      
      for (let i = 0; i < Math.min(sentence.keywords.length, 2) && strokeCount < maxStrokes; i++) {
        const keyword = sentence.keywords[i];
        const keywordPos = keyword.position / Math.max(1, result.sentences.reduce((sum, s) => sum + s.text.length, 0));
        
        const startX = this.width * (0.15 + keywordPos * 0.7);
        const startY = this.height * (0.15 + Math.random() * 0.7);
        
        const angle = (keyword.position % 360) * Math.PI / 180 + (Math.random() - 0.5) * Math.PI;
        const length = 30 + sentence.intensity * 15 + Math.random() * 20;
        
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * length * 0.5;
        const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * length * 0.5;
        
        this.brushStrokes.push({
          startX,
          startY,
          controlX,
          controlY,
          endX,
          endY,
          color: getEmotionColor(keyword.emotion),
          opacity: 0.3 + Math.random() * 0.3,
          baseLength: length,
          baseAngle: angle,
          stretchFactor: 1,
          targetStretch: 1,
          flowOffset: Math.random() * Math.PI * 2,
          flowSpeed: 0.3 + Math.random() * 0.4,
          width: 2 + keyword.intensity * 1.5
        });
        
        strokeCount++;
      }
    }
  }

  handleMouseMove(x: number, y: number): void {
    this.triggerRippleForNearestDot(x, y);
    this.updateStrokeStretch(x, y);
  }

  private triggerRippleForNearestDot(x: number, y: number): void {
    let nearestDot: InkDot | null = null;
    let nearestDist = Infinity;
    
    for (const dot of this.inkDots) {
      const dist = Math.hypot(dot.x - x, dot.y - y);
      if (dist < nearestDist && dist < this.RIPPLE_INFLUENCE_RADIUS) {
        nearestDist = dist;
        nearestDot = dot;
      }
    }
    
    if (nearestDot && !nearestDot.rippleActive && this.rippleEffects.filter(r => r.active).length < this.MAX_RIPPLES) {
      nearestDot.rippleActive = true;
      nearestDot.ripplePhase = 0;
      
      this.rippleEffects.push({
        x: nearestDot.x,
        y: nearestDot.y,
        radius: nearestDot.baseRadius,
        maxRadius: nearestDot.baseRadius * 2.5,
        opacity: 0.6,
        color: nearestDot.color,
        active: true
      });
    }
  }

  private updateStrokeStretch(mouseX: number, mouseY: number): void {
    for (const stroke of this.brushStrokes) {
      const midX = (stroke.startX + stroke.endX) / 2;
      const midY = (stroke.startY + stroke.endY) / 2;
      const dist = Math.hypot(midX - mouseX, midY - mouseY);
      
      if (dist < this.RIPPLE_INFLUENCE_RADIUS) {
        const influence = 1 - dist / this.RIPPLE_INFLUENCE_RADIUS;
        const dx = mouseX - midX;
        const dy = mouseY - midY;
        const mouseAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(mouseAngle - stroke.baseAngle);
        
        if (angleDiff < Math.PI / 2 || angleDiff > Math.PI * 1.5) {
          stroke.targetStretch = 1 + influence * 0.2;
        } else {
          stroke.targetStretch = 1;
        }
      } else {
        stroke.targetStretch = 1;
      }
    }
  }

  render(timestamp: number): void {
    const deltaTime = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 1000 : 0;
    this.lastTimestamp = timestamp;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.updateAndRenderColorLayers(deltaTime);
    this.updateAndRenderBrushStrokes(deltaTime);
    this.updateAndRenderInkDots(deltaTime, timestamp);
    this.updateAndRenderRipples(deltaTime);
  }

  private updateAndRenderColorLayers(deltaTime: number): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    
    for (const layer of this.colorLayers) {
      layer.opacity += (layer.targetOpacity - layer.opacity) * deltaTime * 2;
      
      const gradient = this.ctx.createRadialGradient(
        layer.x, layer.y, 0,
        layer.x, layer.y, layer.radius
      );
      
      const alpha = Math.floor(layer.opacity * 255).toString(16).padStart(2, '0');
      gradient.addColorStop(0, layer.color + alpha);
      gradient.addColorStop(0.5, layer.color + Math.floor(layer.opacity * 128).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, layer.color + '00');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(layer.x, layer.y, layer.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private updateAndRenderBrushStrokes(deltaTime: number): void {
    for (const stroke of this.brushStrokes) {
      stroke.stretchFactor += (stroke.targetStretch - stroke.stretchFactor) * deltaTime * 5;
      stroke.flowOffset += deltaTime * stroke.flowSpeed;
      
      const flowWave = Math.sin(stroke.flowOffset) * 5;
      const stretch = stroke.stretchFactor;
      
      const midX = (stroke.startX + stroke.endX) / 2;
      const midY = (stroke.startY + stroke.endY) / 2;
      
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
      this.ctx.moveTo(startX + 2, startY + 1);
      this.ctx.quadraticCurveTo(controlX + 3, controlY + 2, endX + 2, endY + 1);
      this.ctx.globalAlpha = stroke.opacity * 0.3;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = stroke.width * 0.5;
      this.ctx.stroke();
      
      this.ctx.restore();
    }
  }

  private updateAndRenderInkDots(deltaTime: number, timestamp: number): void {
    for (const dot of this.inkDots) {
      dot.currentRadius += (dot.targetRadius - dot.currentRadius) * deltaTime * 3;
      
      if (dot.rippleActive) {
        dot.ripplePhase += deltaTime * 1000 / this.RIPPLE_DURATION;
        if (dot.ripplePhase >= 1) {
          dot.ripplePhase = 0;
          dot.rippleActive = false;
        }
      }
      
      const wobble = Math.sin(timestamp / 1000 * dot.wobbleSpeed + dot.wobbleOffset) * 2;
      const rippleScale = dot.rippleActive ? 
        1 + Math.sin(dot.ripplePhase * Math.PI) * 0.5 : 1;
      
      const renderRadius = dot.currentRadius * rippleScale + wobble;
      
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'multiply';
      
      const gradient = this.ctx.createRadialGradient(
        dot.x - renderRadius * 0.2, dot.y - renderRadius * 0.2, 0,
        dot.x, dot.y, renderRadius
      );
      
      const baseAlpha = Math.floor(dot.opacity * 255).toString(16).padStart(2, '0');
      gradient.addColorStop(0, dot.color + Math.floor(dot.opacity * 200).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.6, dot.color + baseAlpha);
      gradient.addColorStop(0.85, dot.color + Math.floor(dot.opacity * 100).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, dot.color + '00');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, renderRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = dot.opacity * 0.3;
      
      for (let i = 0; i < 3; i++) {
        const splashAngle = (timestamp / 2000 + i * 2.1) % (Math.PI * 2);
        const splashDist = renderRadius * (0.8 + Math.sin(timestamp / 500 + i) * 0.2);
        const splashX = dot.x + Math.cos(splashAngle) * splashDist;
        const splashY = dot.y + Math.sin(splashAngle) * splashDist;
        const splashRadius = renderRadius * (0.15 + Math.random() * 0.1);
        
        const splashGradient = this.ctx.createRadialGradient(
          splashX, splashY, 0,
          splashX, splashY, splashRadius
        );
        splashGradient.addColorStop(0, dot.color + '80');
        splashGradient.addColorStop(1, dot.color + '00');
        
        this.ctx.fillStyle = splashGradient;
        this.ctx.beginPath();
        this.ctx.arc(splashX, splashY, splashRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    }
  }

  private updateAndRenderRipples(deltaTime: number): void {
    for (const ripple of this.rippleEffects) {
      if (!ripple.active) continue;
      
      ripple.radius += (ripple.maxRadius - ripple.radius) * deltaTime * 4;
      ripple.opacity -= deltaTime * 1.5;
      
      if (ripple.opacity <= 0) {
        ripple.active = false;
        continue;
      }
      
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = ripple.opacity;
      
      const gradient = this.ctx.createRadialGradient(
        ripple.x, ripple.y, ripple.radius * 0.8,
        ripple.x, ripple.y, ripple.radius
      );
      gradient.addColorStop(0, ripple.color + '00');
      gradient.addColorStop(0.5, ripple.color + Math.floor(ripple.opacity * 128).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, ripple.color + '00');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    }
    
    this.rippleEffects = this.rippleEffects.filter(r => r.active);
  }

  exportPNG(): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (!exportCtx) throw new Error('Failed to create export context');
    
    exportCtx.drawImage(this.canvas, 0, 0);
    
    return exportCanvas.toDataURL('image/png');
  }

  reset(): void {
    this.inkDots = [];
    this.brushStrokes = [];
    this.colorLayers = [];
    this.rippleEffects = [];
    this.analysisResult = null;
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
  }

  hasContent(): boolean {
    return this.inkDots.length > 0 || this.brushStrokes.length > 0;
  }
}
