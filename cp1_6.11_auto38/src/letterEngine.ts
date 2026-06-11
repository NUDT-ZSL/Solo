import { SeasonName, SeasonTheme, seasonThemes, lerpColor, getRandomProverb } from './seasonThemes';

interface Particle {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  colorT: number;
  vx: number;
  vy: number;
  phase: number;
  life: number;
  maxLife: number;
  resetTime?: number;
}

interface CharacterState {
  char: string;
  x: number;
  y: number;
  opacity: number;
  targetOpacity: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  appearProgress: number;
  shakePhase: number;
}

interface FoldState {
  active: boolean;
  corner: 'tl' | 'tr' | 'bl' | 'br' | null;
  foldX: number;
  foldY: number;
  targetFoldX: number;
  targetFoldY: number;
  velocityX: number;
  velocityY: number;
  isFlipped: boolean;
}

export class LetterEngine {
  private particleCanvas: HTMLCanvasElement;
  private particleCtx: CanvasRenderingContext2D;
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;
  private letterCard: HTMLElement;
  private letterEdge: HTMLElement;
  private backIcon: HTMLElement;
  private backProverb: HTMLElement;

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private currentSeason: SeasonName;
  private theme: SeasonTheme;
  private particles: Particle[] = [];
  private characters: CharacterState[] = [];

  private textContent: string = '';
  private isWriting: boolean = false;
  private writeTimer: number = 0;
  private currentCharIndex: number = 0;
  private readonly CHAR_APPEAR_MS = 300;
  private readonly CHAR_INTERVAL_MIN = 200;
  private readonly CHAR_INTERVAL_MAX = 300;
  private nextCharDelay: number = 0;

  private fold: FoldState = {
    active: false,
    corner: null,
    foldX: 0,
    foldY: 0,
    targetFoldX: 0,
    targetFoldY: 0,
    velocityX: 0,
    velocityY: 0,
    isFlipped: false
  };

  private animFrameId: number = 0;
  private lastTime: number = 0;
  private readonly MAX_FOLD_ANGLE = 150;

  constructor(
    particleCanvas: HTMLCanvasElement,
    textCanvas: HTMLCanvasElement,
    letterCard: HTMLElement,
    letterEdge: HTMLElement,
    backIcon: HTMLElement,
    backProverb: HTMLElement
  ) {
    this.particleCanvas = particleCanvas;
    this.particleCtx = particleCanvas.getContext('2d')!;
    this.textCanvas = textCanvas;
    this.textCtx = textCanvas.getContext('2d')!;
    this.letterCard = letterCard;
    this.letterEdge = letterEdge;
    this.backIcon = backIcon;
    this.backProverb = backProverb;
    this.currentSeason = 'spring';
    this.theme = seasonThemes.spring;
    this.initCanvas();
    this.initParticles();
    this.applyEdgeEffect();
    this.updateBackContent();
  }

  private initCanvas(): void {
    const rect = this.particleCanvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;

    [this.particleCanvas, this.textCanvas].forEach(canvas => {
      canvas.width = this.width * this.dpr;
      canvas.height = this.height * this.dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(this.dpr, this.dpr);
    });
  }

  resize(): void {
    this.initCanvas();
  }

  private initParticles(): void {
    const cfg = this.theme.particle;
    const count = Math.floor(cfg.minCount + Math.random() * (cfg.maxCount - cfg.minCount));
    this.particles = [];

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): Particle {
    const cfg = this.theme.particle;
    const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
    const behavior = cfg.behavior;
    let x: number, y: number, vx: number, vy: number, phase: number;

    switch (behavior) {
      case 'petal':
        x = Math.random() * this.width;
        y = randomY ? Math.random() * this.height : -size * 2;
        vx = 0;
        vy = 0.3 + Math.random() * 0.3;
        phase = Math.random() * Math.PI * 2;
        break;
      case 'wave':
        x = -size * 2;
        y = size + Math.random() * (this.height - size * 2);
        vx = (this.width / 90) * (0.7 + Math.random() * 0.6);
        vy = 0;
        phase = Math.random() * Math.PI * 2;
        break;
      case 'leaf':
        x = Math.random() * this.width;
        y = randomY ? Math.random() * this.height : -size * 3;
        vx = 0;
        vy = 0.4 + Math.random() * 0.3;
        phase = Math.random() * Math.PI * 2;
        break;
      case 'snow':
      default:
        x = Math.random() * this.width;
        y = randomY ? Math.random() * this.height : -size * 2;
        vx = (Math.random() - 0.5) * 0.3;
        vy = 0.2 + Math.random() * 0.3;
        phase = Math.random() * Math.PI * 2;
        break;
    }

    return {
      x, y, size,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * (behavior === 'snow' ? 0.035 : 0.06),
      opacity: 0.5 + Math.random() * 0.5,
      colorT: Math.random(),
      vx, vy, phase,
      life: 0,
      maxLife: 0
    };
  }

  setSeason(season: SeasonName): void {
    this.currentSeason = season;
    this.theme = seasonThemes[season];
    this.initParticles();
    this.applyEdgeEffect();
    this.updateBackContent();
    this.clearText();
  }

  private applyEdgeEffect(): void {
    const effect = this.theme.edgeEffect;
    if (effect === 'burn') {
      this.letterEdge.style.background = `
        radial-gradient(ellipse at 20% 0%, rgba(139,69,19,0.15) 0%, transparent 40%),
        radial-gradient(ellipse at 80% 0%, rgba(139,69,19,0.12) 0%, transparent 35%),
        radial-gradient(ellipse at 0% 80%, rgba(139,69,19,0.1) 0%, transparent 30%),
        radial-gradient(ellipse at 100% 20%, rgba(139,69,19,0.13) 0%, transparent 35%),
        radial-gradient(ellipse at 50% 100%, rgba(139,69,19,0.1) 0%, transparent 30%),
        inset 0 0 60px rgba(139,69,19,0.08)
      `;
      this.letterEdge.style.boxShadow = 'inset 0 0 40px rgba(120, 60, 20, 0.12)';
    } else {
      const inkColor = this.theme.particle.colorStart;
      this.letterEdge.style.background = `
        radial-gradient(ellipse at 15% 10%, ${inkColor}15 0%, transparent 45%),
        radial-gradient(ellipse at 85% 15%, ${inkColor}12 0%, transparent 40%),
        radial-gradient(ellipse at 10% 90%, ${inkColor}10 0%, transparent 35%),
        radial-gradient(ellipse at 90% 85%, ${inkColor}13 0%, transparent 40%),
        inset 0 0 80px ${inkColor}08
      `;
      this.letterEdge.style.boxShadow = `inset 0 0 50px ${inkColor}10`;
    }
  }

  private updateBackContent(): void {
    this.backIcon.innerHTML = this.theme.iconSVG;
    this.backProverb.textContent = getRandomProverb(this.currentSeason);
  }

  generateText(text: string): void {
    if (text.length < 20 || text.length > 100) return;
    this.textContent = text;
    this.isWriting = true;
    this.writeTimer = 0;
    this.currentCharIndex = 0;
    this.nextCharDelay = 0;
    this.characters = [];
    this.layoutCharacters(text);
  }

  private layoutCharacters(text: string): void {
    const padding = this.width * 0.12;
    const contentWidth = this.width - padding * 2;
    const centerY = this.height * 0.5;
    const fontSize = Math.min(this.width * 0.035, 26);
    const lineHeight = fontSize * 1.8;
    const charsPerLine = Math.floor(contentWidth / (fontSize * 1.05));
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.slice(i, i + charsPerLine));
    }
    const totalLines = lines.length;
    const startY = centerY - ((totalLines - 1) * lineHeight) / 2;

    lines.forEach((line, lineIdx) => {
      const lineWidth = line.length * fontSize * 1.05;
      const startX = (this.width - lineWidth) / 2 + fontSize * 0.5;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        this.characters.push({
          char,
          x: startX + i * fontSize * 1.05,
          y: startY + lineIdx * lineHeight,
          opacity: 0,
          targetOpacity: 1,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          appearProgress: 0,
          shakePhase: Math.random() * Math.PI * 2
        });
      }
    });
  }

  clearText(): void {
    this.characters = [];
    this.textContent = '';
    this.isWriting = false;
    this.currentCharIndex = 0;
  }

  startFold(corner: 'tl' | 'tr' | 'bl' | 'br', clientX: number, clientY: number): void {
    this.fold.active = true;
    this.fold.corner = corner;
    this.fold.targetFoldX = 0;
    this.fold.targetFoldY = 0;
  }

  updateFold(clientX: number, clientY: number): void {
    if (!this.fold.active || !this.fold.corner) return;

    const rect = this.letterCard.getBoundingClientRect();
    let foldX = 0, foldY = 0;
    const diag = Math.sqrt(rect.width * rect.width + rect.height * rect.height);

    switch (this.fold.corner) {
      case 'tl':
        foldX = ((clientX - rect.left) / rect.width) * this.MAX_FOLD_ANGLE;
        foldY = ((clientY - rect.top) / rect.height) * this.MAX_FOLD_ANGLE;
        break;
      case 'tr':
        foldX = ((rect.right - clientX) / rect.width) * this.MAX_FOLD_ANGLE;
        foldY = ((clientY - rect.top) / rect.height) * this.MAX_FOLD_ANGLE;
        break;
      case 'bl':
        foldX = ((clientX - rect.left) / rect.width) * this.MAX_FOLD_ANGLE;
        foldY = ((rect.bottom - clientY) / rect.height) * this.MAX_FOLD_ANGLE;
        break;
      case 'br':
        foldX = ((rect.right - clientX) / rect.width) * this.MAX_FOLD_ANGLE;
        foldY = ((rect.bottom - clientY) / rect.height) * this.MAX_FOLD_ANGLE;
        break;
    }

    foldX = Math.max(0, Math.min(this.MAX_FOLD_ANGLE, foldX));
    foldY = Math.max(0, Math.min(this.MAX_FOLD_ANGLE, foldY));

    const dist = Math.sqrt(foldX * foldX + foldY * foldY);
    if (dist > this.MAX_FOLD_ANGLE * 0.5) {
      this.fold.isFlipped = true;
    }

    this.fold.targetFoldX = foldX;
    this.fold.targetFoldY = foldY;
  }

  endFold(): void {
    if (!this.fold.active) return;
    this.fold.active = false;

    const dist = Math.sqrt(this.fold.targetFoldX ** 2 + this.fold.targetFoldY ** 2);
    if (dist > this.MAX_FOLD_ANGLE * 0.55 && !this.fold.isFlipped) {
      this.fold.isFlipped = true;
      this.fold.targetFoldX = 180;
      this.fold.targetFoldY = 0;
    } else if (this.fold.isFlipped && dist > this.MAX_FOLD_ANGLE * 0.3) {
      return;
    } else {
      this.fold.isFlipped = false;
      this.fold.targetFoldX = 0;
      this.fold.targetFoldY = 0;
    }
  }

  resetFold(): void {
    this.fold.isFlipped = false;
    this.fold.targetFoldX = 0;
    this.fold.targetFoldY = 0;
  }

  getPrimaryColor(): string {
    return this.theme.particle.primaryColor;
  }

  getSeason(): SeasonName {
    return this.currentSeason;
  }

  downloadPNG(): Promise<void> {
    return new Promise((resolve) => {
      const prevFoldX = this.fold.foldX;
      const prevFoldY = this.fold.foldY;
      const prevFlipped = this.fold.isFlipped;
      this.fold.foldX = 0;
      this.fold.foldY = 0;
      this.fold.isFlipped = false;
      this.applyFoldTransform();

      requestAnimationFrame(() => {
        const outCanvas = document.createElement('canvas');
        outCanvas.width = this.width * this.dpr;
        outCanvas.height = this.height * this.dpr;
        const outCtx = outCanvas.getContext('2d')!;
        outCtx.scale(this.dpr, this.dpr);

        const bgGrad = outCtx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#FFFEF7');
        bgGrad.addColorStop(1, '#FFF9E8');
        outCtx.fillStyle = bgGrad;
        outCtx.fillRect(0, 0, this.width, this.height);

        outCtx.drawImage(this.particleCanvas, 0, 0, this.width, this.height);
        outCtx.drawImage(this.textCanvas, 0, 0, this.width, this.height);

        const edgeCanvas = document.createElement('canvas');
        edgeCanvas.width = this.width * this.dpr;
        edgeCanvas.height = this.height * this.dpr;
        const eCtx = edgeCanvas.getContext('2d')!;
        eCtx.scale(this.dpr, this.dpr);
        if (this.theme.edgeEffect === 'burn') {
          const g1 = eCtx.createRadialGradient(this.width * 0.2, 0, 0, this.width * 0.2, 0, this.width * 0.4);
          g1.addColorStop(0, 'rgba(139,69,19,0.15)');
          g1.addColorStop(1, 'transparent');
          eCtx.fillStyle = g1; eCtx.fillRect(0, 0, this.width, this.height);
          const g2 = eCtx.createRadialGradient(this.width * 0.8, 0, 0, this.width * 0.8, 0, this.width * 0.35);
          g2.addColorStop(0, 'rgba(139,69,19,0.12)');
          g2.addColorStop(1, 'transparent');
          eCtx.fillStyle = g2; eCtx.fillRect(0, 0, this.width, this.height);
        }
        outCtx.drawImage(edgeCanvas, 0, 0, this.width, this.height);

        const link = document.createElement('a');
        link.download = `季风信笺-${this.theme.displayName}-${Date.now()}.png`;
        link.href = outCanvas.toDataURL('image/png');
        link.click();

        this.fold.foldX = prevFoldX;
        this.fold.foldY = prevFoldY;
        this.fold.isFlipped = prevFlipped;
        resolve();
      });
    });
  }

  start(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(time - this.lastTime, 33);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private update(dt: number): void {
    this.updateParticles(dt);
    this.updateWriting(dt);
    this.updateFoldAnim(dt);
  }

  private updateParticles(dt: number): void {
    const cfg = this.theme.particle;
    const behavior = cfg.behavior;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.phase += 0.02;
      p.life += dt;

      switch (behavior) {
        case 'petal': {
          const sway = Math.sin(p.phase) * 20;
          p.x += Math.cos(p.phase * 0.5) * 0.4;
          p.y += p.vy;
          p.x += sway * 0.008;
          p.rotation += p.rotationSpeed;
          if (p.y > this.height + p.size * 2 || p.x < -p.size * 2 || p.x > this.width + p.size * 2) {
            this.particles[i] = this.createParticle(false);
            this.particles[i].x = Math.random() * this.width;
          }
          break;
        }
        case 'wave': {
          p.x += p.vx;
          p.y += Math.sin(p.phase * 1.5) * 0.4;
          const speedFactor = Math.min(1, p.vx / ((this.width / 90) * 1.3));
          p.opacity = 0.3 + speedFactor * 0.6;
          p.rotation += p.rotationSpeed * 0.3;
          if (p.x > this.width + p.size * 2 || p.life > 1500) {
            this.particles[i] = this.createParticle(false);
          }
          break;
        }
        case 'leaf': {
          const spiralT = p.y / this.height;
          const radius = Math.max(0, (1 - spiralT) * 35);
          const angle = p.phase * 1.5;
          const baseX = p.x - Math.cos(p.phase - 0.02) * radius;
          const centerX = baseX + Math.sin(p.y * 0.01) * 10;
          p.x = centerX + Math.cos(angle) * radius * 0.02;
          p.y += p.vy;
          p.rotation += p.rotationSpeed * 1.5;
          if (p.y > this.height + p.size * 3) {
            this.particles[i] = this.createParticle(false);
            this.particles[i].x = Math.random() * this.width;
          }
          break;
        }
        case 'snow':
        default: {
          p.x += p.vx + Math.sin(p.phase) * 0.15;
          p.y += p.vy;
          p.rotation += 0.5 * (Math.PI / 180) + Math.random() * 1.5 * (Math.PI / 180);
          if (p.y > this.height + p.size * 2) {
            this.particles[i] = this.createParticle(false);
            this.particles[i].x = Math.random() * this.width;
          }
          break;
        }
      }
    }
  }

  private updateWriting(dt: number): void {
    if (!this.isWriting) {
      for (const ch of this.characters) {
        ch.shakePhase += dt * 0.003;
        ch.offsetX = Math.sin(ch.shakePhase) * 0.3;
        ch.offsetY = Math.cos(ch.shakePhase * 0.8) * 0.2;
      }
      return;
    }

    this.writeTimer += dt;

    if (this.currentCharIndex < this.characters.length) {
      if (this.writeTimer >= this.nextCharDelay) {
        this.writeTimer = 0;
        this.currentCharIndex++;
        this.nextCharDelay = this.CHAR_INTERVAL_MIN + Math.random() * (this.CHAR_INTERVAL_MAX - this.CHAR_INTERVAL_MIN);
      }
    }

    for (let i = 0; i < this.characters.length; i++) {
      const ch = this.characters[i];
      if (i < this.currentCharIndex) {
        ch.appearProgress = Math.min(1, ch.appearProgress + dt / this.CHAR_APPEAR_MS);
        ch.opacity = ch.appearProgress;
        const ease = 1 - Math.pow(1 - ch.appearProgress, 3);
        ch.rotation = (Math.random() - 0.5) * 4 * (1 - ease) * (Math.PI / 180);
        ch.shakePhase += dt * 0.005;
        if (ch.appearProgress >= 1) {
          ch.offsetX = (Math.random() - 0.5) * 1;
          ch.offsetY = (Math.random() - 0.5) * 1;
          ch.rotation = (Math.random() - 0.5) * 2 * (Math.PI / 180);
        } else {
          ch.offsetX = (Math.random() - 0.5) * 2 * (1 - ease);
          ch.offsetY = (Math.random() - 0.5) * 2 * (1 - ease);
        }
      }
    }

    if (this.currentCharIndex >= this.characters.length) {
      const allDone = this.characters.every(c => c.appearProgress >= 1);
      if (allDone) this.isWriting = false;
    }
  }

  private updateFoldAnim(dt: number): void {
    const smooth = this.fold.active ? 0.35 : 0.12;
    const dx = this.fold.targetFoldX - this.fold.foldX;
    const dy = this.fold.targetFoldY - this.fold.foldY;
    this.fold.foldX += dx * smooth;
    this.fold.foldY += dy * smooth;

    if (!this.fold.active) {
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
        this.fold.foldX = this.fold.targetFoldX;
        this.fold.foldY = this.fold.targetFoldY;
      }
    }

    this.applyFoldTransform();
  }

  private applyFoldTransform(): void {
    let rotateY = 0;
    let rotateX = 0;

    if (this.fold.isFlipped) {
      rotateY = 180;
    } else {
      switch (this.fold.corner) {
        case 'tl':
          rotateY = -this.fold.foldX;
          rotateX = this.fold.foldY;
          break;
        case 'tr':
          rotateY = this.fold.foldX;
          rotateX = this.fold.foldY;
          break;
        case 'bl':
          rotateY = -this.fold.foldX;
          rotateX = -this.fold.foldY;
          break;
        case 'br':
          rotateY = this.fold.foldX;
          rotateX = -this.fold.foldY;
          break;
        default:
          rotateY = this.fold.foldX;
          rotateX = 0;
          break;
      }
    }

    const origin = this.fold.isFlipped ? 'center center' : this.getFoldOrigin();
    this.letterCard.style.transformOrigin = origin;
    this.letterCard.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  }

  private getFoldOrigin(): string {
    switch (this.fold.corner) {
      case 'tl': return '100% 100%';
      case 'tr': return '0% 100%';
      case 'bl': return '100% 0%';
      case 'br': return '0% 0%';
      default: return 'center center';
    }
  }

  private render(): void {
    this.renderParticles();
    this.renderText();
  }

  private renderParticles(): void {
    const ctx = this.particleCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    const cfg = this.theme.particle;

    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;

      const color = lerpColor(cfg.colorStart, cfg.colorEnd, p.colorT);

      switch (cfg.behavior) {
        case 'petal':
          this.drawPetal(ctx, p.size, color);
          break;
        case 'wave':
          this.drawWave(ctx, p.size, color);
          break;
        case 'leaf':
          this.drawLeaf(ctx, p.size, color);
          break;
        case 'snow':
        default:
          this.drawSnow(ctx, p.size, color);
          break;
      }

      ctx.restore();
    }
  }

  private drawPetal(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    grad.addColorStop(0, color);
    grad.addColorStop(1, lerpColor(this.theme.particle.colorEnd, '#FFFFFF', 0.4));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.6, -size * 0.5, size * 0.7, size * 0.5, 0, size);
    ctx.bezierCurveTo(-size * 0.7, size * 0.5, -size * 0.6, -size * 0.5, 0, -size);
    ctx.fill();
  }

  private drawWave(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.8, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 1.2, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    const s = size * 1.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.3, s * 0.5, s * 0.3);
    ctx.quadraticCurveTo(s * 0.2, s * 0.9, 0, s * 0.8);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.9, -s * 0.5, s * 0.3);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.3, 0, -s);
    ctx.fill();
    ctx.strokeStyle = lerpColor(color, '#000000', 0.2);
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, s * 0.6);
    ctx.stroke();
  }

  private drawSnow(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = size * 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.15;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderText(): void {
    const ctx = this.textCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    const fontSize = Math.min(this.width * 0.035, 26);

    ctx.font = `${fontSize}px "Ma Shan Zheng", "KaiTi", "STKaiti", "楷体", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const ch of this.characters) {
      if (ch.opacity <= 0) continue;
      ctx.save();
      const px = ch.x + ch.offsetX;
      const py = ch.y + ch.offsetY;
      ctx.translate(px, py);
      ctx.rotate(ch.rotation);
      ctx.globalAlpha = ch.opacity;

      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;

      const progress = ch.appearProgress;
      if (progress < 1) {
        const grad = ctx.createLinearGradient(0, -fontSize, 0, fontSize);
        grad.addColorStop(0, `rgba(51, 34, 17, ${progress})`);
        grad.addColorStop(1, `rgba(85, 68, 51, ${progress * 0.95})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#2D2416';
      }

      ctx.fillText(ch.char, 0, 0);
      ctx.restore();
    }
  }
}
