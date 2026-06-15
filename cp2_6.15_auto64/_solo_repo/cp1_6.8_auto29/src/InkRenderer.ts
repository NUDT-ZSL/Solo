export interface InkParticle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  radius: number;
  opacity: number;
  maxOpacity: number;
  color: string;
  progress: number;
  delay: number;
  speed: number;
  charIndex: number;
  lineIndex: number;
  char: string;
  phase: 'scatter' | 'flow' | 'converge' | 'settle' | 'dissolve';
  diffusionRadius: number;
  maxDiffusionRadius: number;
  wobbleAngle: number;
  wobbleSpeed: number;
  trail: { x: number; y: number; opacity: number }[];
}

export interface CharPosition {
  x: number;
  y: number;
  char: string;
  lineIndex: number;
  charIndex: number;
}

type AnimationCallback = () => void;

export class InkRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: InkParticle[] = [];
  private settledChars: {
    char: string;
    x: number;
    y: number;
    opacity: number;
    diffusion: number;
    fontSize: number;
  }[] = [];
  private animationId: number | null = null;
  private lastTime: number = 0;
  private targetFps: number = 60;
  private frameInterval: number = 1000 / 60;
  private backgroundCanvas: HTMLCanvasElement | null = null;
  private animationCompleteCallbacks: AnimationCallback[] = [];
  private charClickHandlers: Map<string, (lineIndex: number, charIndex: number) => void> = new Map();
  private charPositions: CharPosition[] = [];
  private fontSize: number = 48;
  private isVertical: boolean = false;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const isMobile = rect.width < 768;
    this.isVertical = isMobile;
    this.fontSize = isMobile ? Math.min(32, rect.width / 10) : Math.min(56, rect.width / 14);
  }

  getIsVertical(): boolean {
    return this.isVertical;
  }

  getFontSize(): number {
    return this.fontSize;
  }

  calculateCharPositions(lines: string[][]): CharPosition[] {
    const positions: CharPosition[] = [];
    const lineHeight = this.fontSize * 1.8;
    const charSpacing = this.fontSize * 1.2;

    if (this.isVertical) {
      const colSpacing = this.fontSize * 1.8;
      const totalWidth = (lines.length - 1) * colSpacing;
      const startX = this.canvasWidth / 2 + totalWidth / 2;

      lines.forEach((line, lineIndex) => {
        const totalHeight = (line.length - 1) * charSpacing;
        const startY = (this.canvasHeight - totalHeight) / 2 - lineHeight * 0.5;
        const x = startX - lineIndex * colSpacing;

        line.forEach((char, charIndex) => {
          const y = startY + charIndex * charSpacing;
          positions.push({ x, y, char, lineIndex, charIndex });
        });
      });
    } else {
      const totalHeight = (lines.length - 1) * lineHeight;
      const startY = this.canvasHeight / 2 - totalHeight / 2;

      lines.forEach((line, lineIndex) => {
        const totalWidth = (line.length - 1) * charSpacing;
        const startX = (this.canvasWidth - totalWidth) / 2;
        const y = startY + lineIndex * lineHeight;

        line.forEach((char, charIndex) => {
          const x = startX + charIndex * charSpacing;
          positions.push({ x, y, char, lineIndex, charIndex });
        });
      });
    }

    this.charPositions = positions;
    return positions;
  }

  private createParticlesForChar(
    pos: CharPosition,
    globalDelay: number
  ): InkParticle[] {
    const particlesPerChar = 12;
    const particles: InkParticle[] = [];

    for (let i = 0; i < particlesPerChar; i++) {
      const angle = (Math.PI * 2 * i) / particlesPerChar + Math.random() * 0.5;
      const distance = 80 + Math.random() * 200;
      const startX = pos.x + Math.cos(angle) * distance;
      const startY = pos.y + Math.sin(angle) * distance;

      const hue = Math.random() > 0.85 ? 0 : 0;
      const saturation = hue === 0 ? 0 : 60;
      const lightness = 5 + Math.random() * 15;

      particles.push({
        x: startX,
        y: startY,
        startX,
        startY,
        targetX: pos.x + (Math.random() - 0.5) * 4,
        targetY: pos.y + (Math.random() - 0.5) * 4,
        radius: 1.5 + Math.random() * 3,
        opacity: 0,
        maxOpacity: 0.3 + Math.random() * 0.5,
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        progress: 0,
        delay: globalDelay + Math.random() * 300,
        speed: 0.6 + Math.random() * 0.8,
        charIndex: pos.charIndex,
        lineIndex: pos.lineIndex,
        char: pos.char,
        phase: 'scatter',
        diffusionRadius: 0,
        maxDiffusionRadius: this.fontSize * 0.4 + Math.random() * 10,
        wobbleAngle: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        trail: [],
      });
    }

    const accentParticles = 3;
    for (let i = 0; i < accentParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 250;
      particles.push({
        x: pos.x + Math.cos(angle) * distance,
        y: pos.y + Math.sin(angle) * distance,
        startX: pos.x + Math.cos(angle) * distance,
        startY: pos.y + Math.sin(angle) * distance,
        targetX: pos.x + (Math.random() - 0.5) * 2,
        targetY: pos.y + (Math.random() - 0.5) * 2,
        radius: 1 + Math.random() * 2,
        opacity: 0,
        maxOpacity: 0.15 + Math.random() * 0.2,
        color: `hsl(8, 75%, ${35 + Math.random() * 15}%)`,
        progress: 0,
        delay: globalDelay + 100 + Math.random() * 400,
        speed: 0.4 + Math.random() * 0.6,
        charIndex: pos.charIndex,
        lineIndex: pos.lineIndex,
        char: pos.char,
        phase: 'scatter',
        diffusionRadius: 0,
        maxDiffusionRadius: this.fontSize * 0.3 + Math.random() * 8,
        wobbleAngle: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.025,
        trail: [],
      });
    }

    return particles;
  }

  spawnPoem(lines: string[][], onComplete?: AnimationCallback) {
    this.stop();
    this.particles = [];
    this.settledChars = [];

    const positions = this.calculateCharPositions(lines);

    positions.forEach((pos, idx) => {
      const lineDelay = pos.lineIndex * 200;
      const charDelay = pos.charIndex * 80;
      const globalDelay = lineDelay + charDelay;
      const charParticles = this.createParticlesForChar(pos, globalDelay);
      this.particles.push(...charParticles);
    });

    if (onComplete) {
      this.animationCompleteCallbacks.push(onComplete);
    }

    this.lastTime = performance.now();
    this.animate();
  }

  replaceChar(lineIndex: number, charIndex: number, newChar: string, onComplete?: AnimationCallback) {
    const targetPos = this.charPositions.find(
      (p) => p.lineIndex === lineIndex && p.charIndex === charIndex
    );
    if (!targetPos) return;

    this.settledChars = this.settledChars.filter(
      (c) => !(c.x === targetPos.x && c.y === targetPos.y)
    );

    const dissolveParticles: InkParticle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      dissolveParticles.push({
        x: targetPos.x,
        y: targetPos.y,
        startX: targetPos.x,
        startY: targetPos.y,
        targetX: targetPos.x + Math.cos(angle) * (60 + Math.random() * 80),
        targetY: targetPos.y + Math.sin(angle) * (60 + Math.random() * 80),
        radius: 2 + Math.random() * 3,
        opacity: 0.8,
        maxOpacity: 0.8,
        color: `hsl(0, 0%, ${10 + Math.random() * 10}%)`,
        progress: 0,
        delay: 0,
        speed: 1.2,
        charIndex,
        lineIndex,
        char: targetPos.char,
        phase: 'dissolve',
        diffusionRadius: 5,
        maxDiffusionRadius: 20,
        wobbleAngle: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03,
        trail: [],
      });
    }
    this.particles.push(...dissolveParticles);

    const newPos: CharPosition = { ...targetPos, char: newChar };
    const spawnDelay = 300;
    const newParticles = this.createParticlesForChar(newPos, spawnDelay);
    this.particles.push(...newParticles);

    const posRef = this.charPositions.find(
      (p) => p.lineIndex === lineIndex && p.charIndex === charIndex
    );
    if (posRef) posRef.char = newChar;

    if (onComplete) {
      this.animationCompleteCallbacks.push(onComplete);
    }
  }

  dissolveAll(onComplete?: AnimationCallback) {
    this.settledChars = [];
    this.particles = [];

    this.charPositions.forEach((pos) => {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 50 + Math.random() * 120;
        this.particles.push({
          x: pos.x,
          y: pos.y,
          startX: pos.x,
          startY: pos.y,
          targetX: pos.x + Math.cos(angle) * dist,
          targetY: pos.y + Math.sin(angle) * dist,
          radius: 2 + Math.random() * 4,
          opacity: 0.9,
          maxOpacity: 0.9,
          color: `hsl(0, 0%, ${8 + Math.random() * 12}%)`,
          progress: 0,
          delay: Math.random() * 200,
          speed: 1.5,
          charIndex: pos.charIndex,
          lineIndex: pos.lineIndex,
          char: pos.char,
          phase: 'dissolve',
          diffusionRadius: 3,
          maxDiffusionRadius: 25,
          wobbleAngle: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.04,
          trail: [],
        });
      }
    });

    if (onComplete) {
      this.animationCompleteCallbacks.push(onComplete);
    }
  }

  private animate = () => {
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= this.frameInterval) {
      this.lastTime = now - (elapsed % this.frameInterval);
      this.update(now);
      this.render();
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(now: number) {
    let allSettled = true;
    const toRemove: number[] = [];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (now < p.delay + performance.timing.navigationStart && p.phase !== 'dissolve') {
        allSettled = false;
        continue;
      }

      const elapsed = now - p.delay;
      if (elapsed < 0) {
        allSettled = false;
        continue;
      }

      if (p.phase === 'dissolve') {
        p.progress += 0.02 * p.speed;
        p.opacity = p.maxOpacity * (1 - p.progress);
        p.diffusionRadius = p.maxDiffusionRadius * p.progress;
        p.x = p.startX + (p.targetX - p.startX) * this.easeOutCubic(p.progress);
        p.y = p.startY + (p.targetY - p.startY) * this.easeOutCubic(p.progress);

        if (p.progress >= 1) {
          toRemove.push(i);
        }
        continue;
      }

      p.progress += 0.008 * p.speed;
      p.wobbleAngle += p.wobbleSpeed;

      if (p.progress < 0.3) {
        p.phase = 'scatter';
        p.opacity = p.maxOpacity * (p.progress / 0.3) * 0.6;
        p.diffusionRadius = p.maxDiffusionRadius * 0.3;
      } else if (p.progress < 0.7) {
        p.phase = 'flow';
        const flowProgress = (p.progress - 0.3) / 0.4;
        const easedProgress = this.easeInOutCubic(flowProgress);
        p.x = p.startX + (p.targetX - p.startX) * easedProgress;
        p.y = p.startY + (p.targetY - p.startY) * easedProgress;
        p.opacity = p.maxOpacity * (0.6 + flowProgress * 0.3);
        p.diffusionRadius = p.maxDiffusionRadius * (0.3 - flowProgress * 0.2);

        const wobbleX = Math.sin(p.wobbleAngle) * 3 * (1 - flowProgress);
        const wobbleY = Math.cos(p.wobbleAngle) * 3 * (1 - flowProgress);
        p.x += wobbleX;
        p.y += wobbleY;

        if (p.trail.length < 5) {
          p.trail.push({ x: p.x, y: p.y, opacity: p.opacity * 0.3 });
        }
      } else if (p.progress < 0.9) {
        p.phase = 'converge';
        const convergeProgress = (p.progress - 0.7) / 0.2;
        p.x = p.targetX + Math.sin(p.wobbleAngle) * 1 * (1 - convergeProgress);
        p.y = p.targetY + Math.cos(p.wobbleAngle) * 1 * (1 - convergeProgress);
        p.opacity = p.maxOpacity * (0.9 + convergeProgress * 0.1);
        p.diffusionRadius = p.maxDiffusionRadius * (0.1 - convergeProgress * 0.05);
        p.radius = Math.max(0.5, p.radius * (1 - convergeProgress * 0.3));
      } else {
        p.phase = 'settle';
        p.x = p.targetX;
        p.y = p.targetY;
        p.opacity = p.maxOpacity;
        p.diffusionRadius = 0;

        const existingSettled = this.settledChars.find(
          (c) => c.x === p.targetX && c.y === p.targetY
        );
        if (!existingSettled) {
          this.settledChars.push({
            char: p.char,
            x: p.targetX,
            y: p.targetY,
            opacity: 0,
            diffusion: p.maxDiffusionRadius,
            fontSize: this.fontSize,
          });
        }
        toRemove.push(i);
        continue;
      }

      allSettled = false;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }

    for (const settled of this.settledChars) {
      if (settled.opacity < 1) {
        settled.opacity = Math.min(1, settled.opacity + 0.05);
        settled.diffusion = Math.max(0, settled.diffusion - 0.5);
      }
    }

    if (allSettled && this.particles.length === 0) {
      const callbacks = [...this.animationCompleteCallbacks];
      this.animationCompleteCallbacks = [];
      callbacks.forEach((cb) => cb());
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.renderBackground(ctx);

    for (const p of this.particles) {
      this.renderParticle(ctx, p);
    }

    for (const settled of this.settledChars) {
      this.renderSettledChar(ctx, settled);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const noiseCount = 30;
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * this.canvasWidth;
      const y = Math.random() * this.canvasHeight;
      const r = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 170, 150, ${0.03 + Math.random() * 0.05})`;
      ctx.fill();
    }
  }

  private renderParticle(ctx: CanvasRenderingContext2D, p: InkParticle) {
    ctx.save();

    if (p.trail.length > 1) {
      for (let i = 0; i < p.trail.length - 1; i++) {
        const t = p.trail[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 25, 20, ${t.opacity * 0.3})`;
        ctx.fill();
      }
    }

    if (p.diffusionRadius > 0) {
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.diffusionRadius
      );
      gradient.addColorStop(0, `rgba(30, 25, 20, ${p.opacity * 0.3})`);
      gradient.addColorStop(0.5, `rgba(30, 25, 20, ${p.opacity * 0.1})`);
      gradient.addColorStop(1, `rgba(30, 25, 20, 0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.diffusionRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color.replace(')', `, ${p.opacity})`).replace('hsl(', 'hsla(');
    ctx.fill();

    ctx.restore();
  }

  private renderSettledChar(
    ctx: CanvasRenderingContext2D,
    settled: { char: string; x: number; y: number; opacity: number; diffusion: number; fontSize: number }
  ) {
    ctx.save();

    if (settled.diffusion > 0) {
      const gradient = ctx.createRadialGradient(
        settled.x, settled.y, 0,
        settled.x, settled.y, settled.diffusion + settled.fontSize * 0.3
      );
      gradient.addColorStop(0, `rgba(30, 25, 20, ${settled.opacity * 0.15})`);
      gradient.addColorStop(0.6, `rgba(30, 25, 20, ${settled.opacity * 0.05})`);
      gradient.addColorStop(1, `rgba(30, 25, 20, 0)`);
      ctx.beginPath();
      ctx.arc(settled.x, settled.y, settled.diffusion + settled.fontSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.font = `${settled.fontSize}px "Noto Serif SC", "SimSun", "STSong", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(30, 25, 20, 0.3)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = `rgba(30, 25, 20, ${settled.opacity})`;
    ctx.fillText(settled.char, settled.x, settled.y);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  getCharAtPosition(clientX: number, clientY: number): CharPosition | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const hitRadius = this.fontSize * 0.6;

    for (const pos of this.charPositions) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        return pos;
      }
    }
    return null;
  }

  onCharClick(
    callback: (lineIndex: number, charIndex: number, char: string) => void
  ) {
    this.canvas.addEventListener('click', (e) => {
      const pos = this.getCharAtPosition(e.clientX, e.clientY);
      if (pos) {
        callback(pos.lineIndex, pos.charIndex, pos.char);
      }
    });
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.particles = [];
  }

  destroy() {
    this.stop();
    this.settledChars = [];
    this.charPositions = [];
    this.animationCompleteCallbacks = [];
  }

  getCharPositions(): CharPosition[] {
    return this.charPositions;
  }
}
