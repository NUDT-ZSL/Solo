import type { CharacterConfig, Keyframe, Particle, AnimationState } from './types';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const MAX_PARTICLES = 50;
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

export class AnimationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private characterConfig: CharacterConfig;
  private animationSequence: { duration: number; keyframes: Keyframe[] } | null = null;
  private particles: Particle[] = [];
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private speedMultiplier: number = 1;
  private backgroundColor: string = '#12121e';
  private currentEmotion: string | null = null;
  private onFrameUpdate: ((state: AnimationState) => void) | null = null;
  private frameCount: number = 0;
  private particleAccumulator: number = 0;
  private elapsedTime: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.characterConfig = {
      name: '默认角色',
      skinColor: '#ffdbac',
      clothingColor: '#3498db',
      hairstyle: 0,
      eyeStyle: 0
    };
  }

  setCharacterConfig(config: CharacterConfig): void {
    this.characterConfig = config;
    if (!this.isRunning) {
      this.renderStatic();
    }
  }

  setSpeed(speed: number): void {
    if (this.speedMultiplier === speed) return;
    this.speedMultiplier = speed;
    if (this.isRunning && this.animationSequence && this.currentEmotion) {
      const currentSequence = { ...this.animationSequence };
      const currentEmotion = this.currentEmotion;
      this.stopAnimation();
      this.animationSequence = currentSequence;
      this.currentEmotion = currentEmotion;
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
      this.particleAccumulator = 0;
      this.frameCount = 0;
      this.elapsedTime = 0;
      this.particles = [];
      this.isRunning = true;
      this.animate();
    }
  }

  setOnFrameUpdate(callback: (state: AnimationState) => void): void {
    this.onFrameUpdate = callback;
  }

  startAnimation(emotion: string, sequence: { duration: number; keyframes: Keyframe[] }): void {
    this.stopAnimation();
    this.animationSequence = sequence;
    this.currentEmotion = emotion;
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.particleAccumulator = 0;
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.particles = [];
    this.isRunning = true;
    this.animate();
  }

  stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isRunning = false;
    this.animationSequence = null;
    this.currentEmotion = null;
    this.particles = [];
    this.backgroundColor = '#12121e';
    this.elapsedTime = 0;
    this.frameCount = 0;
  }

  private animate = (): void => {
    if (!this.isRunning || !this.animationSequence) return;

    const now = performance.now();
    let frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (frameTime > 100) frameTime = 100;

    this.accumulator += frameTime * this.speedMultiplier;

    const particleInterval = 50;
    this.particleAccumulator += frameTime * this.speedMultiplier;
    while (this.particleAccumulator >= particleInterval && this.particles.length < MAX_PARTICLES) {
      this.emitParticle(this.currentEmotion!);
      this.particleAccumulator -= particleInterval;
    }

    while (this.accumulator >= FRAME_DURATION) {
      this.updateParticles(FRAME_DURATION / 1000);
      this.accumulator -= FRAME_DURATION;
      this.elapsedTime += FRAME_DURATION;
      this.frameCount++;
    }

    const duration = this.animationSequence.duration;
    let progress = Math.min(this.elapsedTime / duration, 1);

    if (progress >= 1) {
      this.elapsedTime = 0;
      progress = 0;
      this.frameCount = 0;
    }

    const keyframes = this.animationSequence.keyframes;
    const currentFrameData = this.interpolateKeyframes(keyframes, progress);
    this.backgroundColor = currentFrameData.backgroundColor;

    const totalFrames = Math.floor(duration / FRAME_DURATION);

    this.render(currentFrameData);

    const state: AnimationState = {
      isPlaying: true,
      currentEmotion: this.currentEmotion,
      currentFrame: this.frameCount % totalFrames,
      totalFrames,
      progress
    };
    this.onFrameUpdate?.(state);

    this.animationId = requestAnimationFrame(this.animate);
  };

  private interpolateKeyframes(keyframes: Keyframe[], progress: number): Keyframe {
    if (keyframes.length === 1) return keyframes[0];

    let lowerIndex = 0;
    let upperIndex = keyframes.length - 1;

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
        lowerIndex = i;
        upperIndex = i + 1;
        break;
      }
    }

    const lower = keyframes[lowerIndex];
    const upper = keyframes[upperIndex];
    const range = upper.time - lower.time;
    const t = range === 0 ? 0 : (progress - lower.time) / range;

    return {
      time: progress,
      headY: this.lerp(lower.headY, upper.headY, t),
      eyeScale: this.lerp(lower.eyeScale, upper.eyeScale, t),
      bodyRotate: this.lerp(lower.bodyRotate, upper.bodyRotate, t),
      backgroundColor: this.lerpColor(lower.backgroundColor, upper.backgroundColor, t)
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(this.lerp(r1, r2, t));
    const g = Math.round(this.lerp(g1, g2, t));
    const b = Math.round(this.lerp(b1, b2, t));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private emitParticle(emotion: string): void {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2 - 60;

    if (this.particles.length >= MAX_PARTICLES) return;

    const particle: Particle = {
      x: centerX + (Math.random() - 0.5) * 40,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 3 + Math.random() * 3,
      color: '#ffffff',
      alpha: 1,
      life: 0,
      maxLife: 1.5 + Math.random() * 1
    };

    switch (emotion) {
      case 'happy':
        particle.vy = -60 - Math.random() * 60;
        particle.vx = (Math.random() - 0.5) * 40;
        particle.color = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3'][Math.floor(Math.random() * 5)];
        particle.radius = 3 + Math.random() * 3;
        particle.maxLife = 1.5 + Math.random() * 1;
        break;
      case 'sad':
        particle.y = centerY - 80;
        particle.x = centerX + (Math.random() - 0.5) * 100;
        particle.vy = 80 + Math.random() * 60;
        particle.vx = (Math.random() - 0.5) * 10;
        particle.color = '#4dabf7';
        particle.radius = 2 + Math.random() * 2;
        particle.maxLife = 2 + Math.random() * 1;
        break;
      case 'angry':
        particle.vy = -100 - Math.random() * 80;
        particle.vx = (Math.random() - 0.5) * 60;
        particle.color = ['#fa5252', '#fd7e14', '#ff922b'][Math.floor(Math.random() * 3)];
        particle.radius = 4 + Math.random() * 4;
        particle.maxLife = 1 + Math.random() * 0.8;
        break;
      case 'surprised':
        particle.vy = -80 - Math.random() * 60;
        particle.vx = (Math.random() - 0.5) * 100;
        particle.color = ['#9775fa', '#b197fc', '#e599f7'][Math.floor(Math.random() * 3)];
        particle.radius = 3 + Math.random() * 4;
        particle.maxLife = 1.2 + Math.random() * 0.8;
        break;
      case 'scared':
        particle.vy = -30 - Math.random() * 40;
        particle.vx = (Math.random() - 0.5) * 20;
        particle.color = '#20c997';
        particle.radius = 2 + Math.random() * 2;
        particle.maxLife = 2 + Math.random() * 1;
        break;
      case 'bored':
        particle.vy = -15;
        particle.vx = 15 + Math.random() * 10;
        particle.color = '#868e96';
        particle.radius = 3 + Math.random() * 2;
        particle.maxLife = 3 + Math.random() * 2;
        break;
    }

    this.particles.push(particle);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life += deltaTime;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (this.currentEmotion === 'sad') {
        p.vy += 200 * deltaTime;
      } else if (this.currentEmotion === 'happy') {
        p.vx += (Math.random() - 0.5) * 20 * deltaTime * 60;
        p.vy -= 5 * deltaTime * 60;
      } else if (this.currentEmotion === 'angry') {
        p.vy -= 30 * deltaTime * 60;
        p.radius *= 0.995;
      }

      if (p.life >= p.maxLife || p.alpha <= 0 || p.radius <= 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  renderStatic(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawCharacter({ headY: 0, eyeScale: 1, bodyRotate: 0 });
  }

  private render(frameData: Omit<Keyframe, 'time' | 'backgroundColor'>): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawParticles();
    this.drawCharacter(frameData);
  }

  private drawParticles(): void {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      this.ctx.fillStyle = p.color;

      if (this.currentEmotion === 'happy') {
        this.drawStar(p.x, p.y, 5, p.radius, p.radius * 0.5);
      } else if (this.currentEmotion === 'sad') {
        this.drawDrop(p.x, p.y, p.radius);
      } else if (this.currentEmotion === 'angry') {
        this.drawFlame(p.x, p.y, p.radius);
      } else if (this.currentEmotion === 'surprised') {
        this.drawSparkle(p.x, p.y, p.radius);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawDrop(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - r * 1.8);
    this.ctx.quadraticCurveTo(x + r, y, x, y + r * 0.8);
    this.ctx.quadraticCurveTo(x - r, y, x, y - r * 1.8);
    this.ctx.fill();
  }

  private drawFlame(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - r * 2);
    this.ctx.quadraticCurveTo(x + r, y - r, x + r * 0.8, y);
    this.ctx.quadraticCurveTo(x, y + r * 0.5, x - r * 0.8, y);
    this.ctx.quadraticCurveTo(x - r, y - r, x, y - r * 2);
    this.ctx.fill();
  }

  private drawSparkle(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - r * 1.5);
    this.ctx.lineTo(x, y + r * 1.5);
    this.ctx.moveTo(x - r * 1.5, y);
    this.ctx.lineTo(x + r * 1.5, y);
    this.ctx.lineWidth = Math.max(1, r * 0.4);
    this.ctx.strokeStyle = this.ctx.fillStyle;
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawCharacter(frameData: { headY: number; eyeScale: number; bodyRotate: number }): void {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const { skinColor, clothingColor, hairstyle, eyeStyle } = this.characterConfig;
    const { headY, eyeScale, bodyRotate } = frameData;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((bodyRotate * Math.PI) / 180);

    this.ctx.fillStyle = clothingColor;
    this.ctx.fillRect(-30, 20, 60, 60);

    this.ctx.fillStyle = clothingColor;
    this.ctx.fillRect(-35, 20, 8, 45);
    this.ctx.fillRect(27, 20, 8, 45);

    this.ctx.fillStyle = '#2d3436';
    this.ctx.fillRect(-25, 75, 20, 25);
    this.ctx.fillRect(5, 75, 20, 25);

    this.ctx.save();
    this.ctx.translate(0, headY);

    this.ctx.fillStyle = skinColor;
    this.ctx.fillRect(-32, -50, 64, 64);

    this.drawHairstyle(hairstyle, skinColor);
    this.drawEyes(eyeStyle, eyeScale);
    this.drawMouth(eyeStyle);

    this.ctx.restore();
    this.ctx.restore();
  }

  private drawHairstyle(style: number, skinColor: string): void {
    const hairColors = ['#2d3436', '#636e72', '#b2bec3', '#d63031'];
    const hairColor = hairColors[style % hairColors.length];
    this.ctx.fillStyle = hairColor;

    switch (style) {
      case 0:
        this.ctx.fillRect(-32, -58, 64, 16);
        this.ctx.fillRect(-32, -58, 8, 24);
        this.ctx.fillRect(24, -58, 8, 24);
        break;
      case 1:
        this.ctx.fillRect(-36, -58, 72, 20);
        this.ctx.fillRect(-36, -58, 12, 60);
        this.ctx.fillRect(24, -58, 12, 60);
        break;
      case 2:
        for (let i = 0; i < 8; i++) {
          const cx = -28 + i * 8;
          this.ctx.beginPath();
          this.ctx.arc(cx, -50, 6, Math.PI, 0);
          this.ctx.fill();
        }
        this.ctx.fillRect(-32, -58, 64, 12);
        break;
      case 3:
        this.ctx.fillRect(-8, -70, 16, 28);
        this.ctx.fillRect(-32, -50, 64, 8);
        this.ctx.fillStyle = skinColor;
        this.ctx.fillRect(-28, -42, 56, 8);
        this.ctx.fillStyle = hairColor;
        this.ctx.fillRect(-28, -48, 8, 16);
        this.ctx.fillRect(20, -48, 8, 16);
        break;
    }
  }

  private drawEyes(style: number, scale: number): void {
    const baseY = -25;
    const eyeSize = 8 * scale;
    const eyeSpacing = 14;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-eyeSpacing - eyeSize / 2, baseY - eyeSize / 2, eyeSize, eyeSize);
    this.ctx.fillRect(eyeSpacing - eyeSize / 2, baseY - eyeSize / 2, eyeSize, eyeSize);

    this.ctx.fillStyle = '#2d3436';
    const pupilSize = eyeSize * 0.6;

    switch (style) {
      case 0:
        this.ctx.fillRect(-eyeSpacing - pupilSize / 2, baseY, pupilSize, pupilSize / 2);
        this.ctx.fillRect(eyeSpacing - pupilSize / 2, baseY, pupilSize, pupilSize / 2);
        break;
      case 1:
        this.ctx.fillRect(-eyeSpacing - pupilSize / 2, baseY - pupilSize / 2, pupilSize, pupilSize);
        this.ctx.fillRect(eyeSpacing - pupilSize / 2, baseY - pupilSize / 2, pupilSize, pupilSize);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(-eyeSpacing - eyeSize / 2 - 2, baseY - eyeSize / 2 - 4, eyeSize + 4, 2);
        this.ctx.fillRect(eyeSpacing - eyeSize / 2 - 2, baseY - eyeSize / 2 - 4, eyeSize + 4, 2);
        break;
      case 2:
        this.ctx.fillRect(-eyeSpacing - pupilSize / 2, baseY - pupilSize / 2 + 2, pupilSize, pupilSize - 2);
        this.ctx.fillRect(eyeSpacing - pupilSize / 2, baseY - pupilSize / 2 + 2, pupilSize, pupilSize - 2);
        break;
      case 3:
        this.ctx.beginPath();
        this.ctx.arc(-eyeSpacing, baseY, pupilSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(eyeSpacing, baseY, pupilSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
  }

  private drawMouth(style: number): void {
    this.ctx.fillStyle = '#2d3436';

    switch (style) {
      case 0:
        this.ctx.fillRect(-8, -8, 16, 2);
        this.ctx.fillRect(-6, -6, 12, 2);
        this.ctx.fillRect(-4, -4, 8, 2);
        break;
      case 1:
        this.ctx.fillRect(-10, -6, 20, 2);
        this.ctx.fillRect(-8, -4, 4, 2);
        this.ctx.fillRect(4, -4, 4, 2);
        break;
      case 2:
        this.ctx.fillRect(-6, -4, 12, 2);
        this.ctx.fillRect(-8, -6, 4, 2);
        this.ctx.fillRect(4, -6, 4, 2);
        break;
      case 3:
        this.ctx.beginPath();
        this.ctx.arc(0, -6, 6, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
  }

  destroy(): void {
    this.stopAnimation();
  }
}
