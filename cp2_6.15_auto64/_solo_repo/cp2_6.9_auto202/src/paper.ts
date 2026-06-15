import { Point, OrigamiTemplate, FoldStep, TEMPLATES, PAPER_COLORS, CENTER, PAPER_SIZE, HALF, TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT } from './templates';

export interface FoldState {
  stepIndex: number;
  completedSteps: boolean[];
  cornerPositions: Point[];
  isAnimating: boolean;
  foldProgress: number;
  animationStartCornerIndex: number;
  animationStartPos: Point | null;
  animationEndPos: Point | null;
  animationStartTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

type EventCallback = (data: unknown) => void;

export class Paper {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private listeners: Map<string, EventCallback[]> = new Map();

  public template: OrigamiTemplate;
  public color: string;
  public corners: Point[] = [];
  public originalCorners: Point[] = [];

  public currentStepIndex: number = 0;
  public completedSteps: boolean[] = [];

  private draggingIndex: number = -1;
  public hoveredIndex: number = -1;
  private animating: boolean = false;
  private animationStartTime: number = 0;
  private animationCornerIndex: number = -1;
  private animationStartPos: Point = { x: 0, y: 0 };
  private animationEndPos: Point = { x: 0, y: 0 };

  public vibrateIndex: number = -1;
  private vibrateStartTime: number = 0;
  private vibrateAmplitude: number = 2;
  private vibrateFrequency: number = 0.2;

  public particles: Particle[] = [];
  private readonly MAX_PARTICLES: number = 100;

  public gridSize: number = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取2D上下文');
    this.ctx = ctx;

    this.template = TEMPLATES[0];
    this.color = PAPER_COLORS[Math.floor(Math.random() * PAPER_COLORS.length)];

    this.resetCorners();
    this.completedSteps = new Array(this.template.steps.length).fill(false);
    this.bindEvents();
    this.startAnimationLoop();
  }

  private resetCorners(): void {
    this.originalCorners = [
      { ...TOP_LEFT },
      { ...TOP_RIGHT },
      { ...BOTTOM_LEFT },
      { ...BOTTOM_RIGHT }
    ];
    this.corners = this.originalCorners.map(p => ({ ...p }));
  }

  public setTemplate(templateIndex: number): void {
    if (templateIndex < 0 || templateIndex >= TEMPLATES.length) return;
    this.template = TEMPLATES[templateIndex];
    this.color = PAPER_COLORS[Math.floor(Math.random() * PAPER_COLORS.length)];
    this.currentStepIndex = 0;
    this.completedSteps = new Array(this.template.steps.length).fill(false);
    this.resetCorners();
    this.animating = false;
    this.draggingIndex = -1;
    this.emit('templateChange', { templateIndex, template: this.template });
    this.emit('stepUpdate', { currentStep: this.currentStepIndex, completedSteps: [...this.completedSteps] });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private getMousePos(e: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getMousePos(e.touches[0]);
      this.handlePointerDown(pos);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getMousePos(e.touches[0]);
      this.handlePointerMove(pos);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.handlePointerUp();
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.handlePointerDown(pos);
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.handlePointerMove(pos);
  }

  private onMouseUp(): void {
    this.handlePointerUp();
  }

  private handlePointerDown(pos: Point): void {
    if (this.animating) return;
    for (let i = 0; i < this.corners.length; i++) {
      if (!this.completedSteps.some((completed, idx) => completed && this.template.steps[idx]?.cornerIndex === i)) {
        const dist = Math.hypot(pos.x - this.corners[i].x, pos.y - this.corners[i].y);
        if (dist <= 16) {
          this.draggingIndex = i;
          break;
        }
      }
    }
  }

  private handlePointerMove(pos: Point): void {
    this.hoveredIndex = -1;

    if (this.draggingIndex >= 0 && !this.animating) {
      this.corners[this.draggingIndex] = { ...pos };
      this.emit('foldUpdate', {
        corners: this.corners.map(c => ({ ...c })),
        stepIndex: this.currentStepIndex
      });
    } else {
      for (let i = 0; i < this.corners.length; i++) {
        const dist = Math.hypot(pos.x - this.corners[i].x, pos.y - this.corners[i].y);
        if (dist <= 16) {
          this.hoveredIndex = i;
          break;
        }
      }
    }
  }

  private handlePointerUp(): void {
    if (this.draggingIndex >= 0 && !this.animating) {
      this.checkSnap(this.draggingIndex);
    }
    this.draggingIndex = -1;
  }

  private checkSnap(cornerIndex: number): void {
    if (this.currentStepIndex >= this.template.steps.length) return;

    const currentStep = this.template.steps[this.currentStepIndex];
    if (currentStep.cornerIndex !== cornerIndex) return;

    const targetPos = currentStep.targetPoint;
    const cornerPos = this.corners[cornerIndex];
    const dist = Math.hypot(cornerPos.x - targetPos.x, cornerPos.y - targetPos.y);

    if (dist <= 40) {
      this.startFoldAnimation(cornerIndex, targetPos);
    }
  }

  private startFoldAnimation(cornerIndex: number, targetPos: Point): void {
    this.animating = true;
    this.animationStartTime = performance.now();
    this.animationCornerIndex = cornerIndex;
    this.animationStartPos = { ...this.corners[cornerIndex] };
    this.animationEndPos = { ...targetPos };
    this.emit('foldStart', { cornerIndex, targetPos });
  }

  private easeOutElastic(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private updateAnimation(now: number): void {
    if (!this.animating) return;

    const duration = 600;
    const elapsed = now - this.animationStartTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = this.easeOutElastic(t);

    const newPos = {
      x: this.animationStartPos.x + (this.animationEndPos.x - this.animationStartPos.x) * eased,
      y: this.animationStartPos.y + (this.animationEndPos.y - this.animationStartPos.y) * eased
    };
    this.corners[this.animationCornerIndex] = newPos;

    this.emit('foldUpdate', {
      corners: this.corners.map(c => ({ ...c })),
      stepIndex: this.currentStepIndex,
      progress: t
    });

    if (t >= 1) {
      this.animating = false;
      this.completedSteps[this.currentStepIndex] = true;
      this.currentStepIndex++;

      this.vibrateIndex = this.animationCornerIndex;
      this.vibrateStartTime = now;

      this.spawnParticles(this.animationEndPos);
      this.emit('foldComplete', { stepIndex: this.currentStepIndex - 1, cornerIndex: this.animationCornerIndex });
      this.emit('stepUpdate', { currentStep: this.currentStepIndex, completedSteps: [...this.completedSteps] });

      if (this.currentStepIndex >= this.template.steps.length) {
        this.emit('allComplete', { template: this.template });
      }
    }
  }

  private spawnParticles(center: Point): void {
    const count = 8;
    for (let i = 0; i < count && this.particles.length < this.MAX_PARTICLES; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 50;
      const life = 300;
      const t = i / count;
      const color = this.lerpColor('#FFD700', '#F39C12', t);
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        color: color,
        radius: 1 + Math.random() * 2
      });
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy += 100 * dt / 1000;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private getVibrateOffset(now: number, index: number): Point {
    if (this.vibrateIndex !== index) return { x: 0, y: 0 };
    const elapsed = now - this.vibrateStartTime;
    if (elapsed > 500) {
      this.vibrateIndex = -1;
      return { x: 0, y: 0 };
    }
    const phase = (elapsed / 1000) * (Math.PI * 2 / this.vibrateFrequency);
    const t = elapsed / 500;
    const amp = this.vibrateAmplitude * (1 - t);
    return {
      x: Math.sin(phase) * amp,
      y: Math.cos(phase) * amp
    };
  }

  private lastFrameTime: number = performance.now();

  private startAnimationLoop(): void {
    const loop = (now: number) => {
      const dt = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.updateAnimation(now);
      this.updateParticles(dt);
      this.render(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private render(now: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid();
    this.drawTemplateGuide();
    this.drawPaper(now);
    this.drawParticles();
    this.drawCorners(now);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private drawTemplateGuide(): void {
    if (this.currentStepIndex >= this.template.steps.length) return;

    const ctx = this.ctx;
    const step = this.template.steps[this.currentStepIndex];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(step.foldLine[0].x, step.foldLine[0].y);
    ctx.lineTo(step.foldLine[1].x, step.foldLine[1].y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(step.targetPoint.x, step.targetPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(step.targetPoint.x, step.targetPoint.y, 12 + Math.sin(performance.now() / 200) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawPaper(now: number): void {
    const ctx = this.ctx;
    const cornerPositions = this.corners.map((c, i) => {
      const offset = this.getVibrateOffset(now, i);
      return { x: c.x + offset.x, y: c.y + offset.y };
    });

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cornerPositions[0].x, cornerPositions[0].y);
    ctx.lineTo(cornerPositions[1].x, cornerPositions[1].y);
    ctx.lineTo(cornerPositions[3].x, cornerPositions[3].y);
    ctx.lineTo(cornerPositions[2].x, cornerPositions[2].y);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(
      (cornerPositions[0].x + cornerPositions[3].x) / 2,
      (cornerPositions[0].y + cornerPositions[3].y) / 2,
      (cornerPositions[1].x + cornerPositions[2].x) / 2,
      (cornerPositions[1].y + cornerPositions[2].y) / 2
    );
    gradient.addColorStop(0, this.lightenColor(this.color, 20));
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.darkenColor(this.color, 20));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawCompletedFolds();
    ctx.restore();
  }

  private drawCompletedFolds(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i < this.currentStepIndex; i++) {
      const step = this.template.steps[i];
      ctx.beginPath();
      ctx.moveTo(step.foldLine[0].x, step.foldLine[0].y);
      ctx.lineTo(step.foldLine[1].x, step.foldLine[1].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCorners(now: number): void {
    const ctx = this.ctx;

    for (let i = 0; i < this.corners.length; i++) {
      const offset = this.getVibrateOffset(now, i);
      const x = this.corners[i].x + offset.x;
      const y = this.corners[i].y + offset.y;

      const isDragging = this.draggingIndex === i;
      const isHovered = this.hoveredIndex === i;
      const isActiveStep = this.currentStepIndex < this.template.steps.length &&
        this.template.steps[this.currentStepIndex].cornerIndex === i;

      const radius = isDragging ? 10 : 8;

      if (isHovered || isDragging || isActiveStep) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = isHovered || isDragging || isActiveStep ? '#FFD700' : 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.slice(1), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
    return `rgb(${r}, ${g}, ${b})`;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx >= 0) cbs.splice(idx, 1);
  }

  private emit(event: string, data: unknown): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    for (const cb of cbs) {
      try {
        cb(data);
      } catch (e) {
        console.error('Event listener error:', e);
      }
    }
  }

  public getState() {
    return {
      template: this.template,
      corners: [...this.corners],
      currentStep: this.currentStepIndex,
      completedSteps: [...this.completedSteps],
      color: this.color
    };
  }
}
