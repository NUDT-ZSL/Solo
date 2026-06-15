import { Diary, getTagColor, getTagGlow, DiaryResponse } from './DiaryLogic';

interface StarParticle {
  diary: Diary;
  x: number;
  y: number;
  baseRadius: number;
  rotation: number;
  rotationSpeed: number;
  pulsePhase: number;
  pulseSpeed: number;
  hovered: boolean;
  hoverScale: number;
  targetHoverScale: number;
  opacity: number;
}

interface SubStarParticle {
  response: DiaryResponse;
  parentDiaryId: string;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  radius: number;
  color: string;
}

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export type StarClickHandler = (diary: Diary) => void;
export type StarHoverHandler = (diary: Diary | null) => void;

const MAX_PARTICLES = 500;
const BG_STAR_COUNT = 200;
const HOVER_DETECT_RADIUS = 20;

export class StarshipCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private stars: StarParticle[] = [];
  private subStars: SubStarParticle[] = [];
  private bgStars: BackgroundStar[] = [];
  private animId: number | null = null;
  private lastTime = 0;
  private mouseX = -1000;
  private mouseY = -1000;
  private onStarClick: StarClickHandler | null = null;
  private onStarHover: StarHoverHandler | null = null;
  private hoveredDiary: Diary | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.animate = this.animate.bind(this);
    this.initBackgroundStars();
  }

  start(): void {
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.handleResize();
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  stop(): void {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  setDiaries(diaries: Diary[]): void {
    this.stars = diaries.slice(0, MAX_PARTICLES).map((diary) => {
      const existing = this.stars.find((s) => s.diary.id === diary.id);
      return {
        diary,
        x: diary.x * this.width,
        y: diary.y * this.height,
        baseRadius: 4 + diary.responses.length * 0.5,
        rotation: existing?.rotation ?? Math.random() * Math.PI * 2,
        rotationSpeed: 0.005 + Math.random() * 0.01,
        pulsePhase: existing?.pulsePhase ?? Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        hovered: false,
        hoverScale: existing?.hoverScale ?? 1,
        targetHoverScale: 1,
        opacity: existing?.opacity ?? 0,
      };
    });

    this.subStars = [];
    for (const star of this.stars) {
      for (let i = 0; i < star.diary.responses.length; i++) {
        const resp = star.diary.responses[i];
        const parentColor = getTagColor(star.diary.tag);
        this.subStars.push({
          response: resp,
          parentDiaryId: star.diary.id,
          orbitRadius: 18 + i * 8,
          orbitAngle: (Math.PI * 2 * i) / star.diary.responses.length + Math.random() * 0.5,
          orbitSpeed: 0.01 + Math.random() * 0.005,
          radius: 2,
          color: parentColor,
        });
      }
    }
  }

  setStarClickHandler(handler: StarClickHandler): void {
    this.onStarClick = handler;
  }

  setStarHoverHandler(handler: StarHoverHandler): void {
    this.onStarHover = handler;
  }

  private handleResize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const star of this.stars) {
      star.x = star.diary.x * this.width;
      star.y = star.diary.y * this.height;
    }
    this.initBackgroundStars();
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
      this.checkClick(this.mouseX, this.mouseY);
    }
  }

  private handleClick(_e: MouseEvent): void {
    this.checkClick(this.mouseX, this.mouseY);
  }

  private checkClick(mx: number, my: number): void {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      const dx = mx - star.x;
      const dy = my - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HOVER_DETECT_RADIUS) {
        this.onStarClick?.(star.diary);
        return;
      }
    }
  }

  private initBackgroundStars(): void {
    this.bgStars = [];
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      this.bgStars.push({
        x: Math.random() * (this.width || 1920),
        y: Math.random() * (this.height || 1080),
        radius: 0.3 + Math.random() * 1.2,
        opacity: 0.2 + Math.random() * 0.6,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.005 + Math.random() * 0.02,
      });
    }
  }

  private animate(time: number): void {
    const dt = Math.min(time - this.lastTime, 50);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    this.animId = requestAnimationFrame(this.animate);
  }

  private update(dt: number): void {
    const dtFactor = dt / 16.67;

    for (const bg of this.bgStars) {
      bg.twinklePhase += bg.twinkleSpeed * dtFactor;
    }

    let foundHover = false;
    for (const star of this.stars) {
      star.rotation += star.rotationSpeed * dtFactor;
      star.pulsePhase += star.pulseSpeed * dtFactor;

      if (star.opacity < 1) {
        star.opacity = Math.min(1, star.opacity + 0.02 * dtFactor);
      }

      const dx = this.mouseX - star.x;
      const dy = this.mouseY - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < HOVER_DETECT_RADIUS) {
        star.targetHoverScale = 1.6;
        star.hovered = true;
        if (!foundHover) {
          if (this.hoveredDiary !== star.diary) {
            this.hoveredDiary = star.diary;
            this.onStarHover?.(star.diary);
          }
          foundHover = true;
        }
      } else {
        star.targetHoverScale = 1;
        star.hovered = false;
      }

      star.hoverScale += (star.targetHoverScale - star.hoverScale) * 0.1 * dtFactor;
    }

    if (!foundHover && this.hoveredDiary) {
      this.hoveredDiary = null;
      this.onStarHover?.(null);
    }

    for (const sub of this.subStars) {
      sub.orbitAngle += sub.orbitSpeed * dtFactor;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    for (const bg of this.bgStars) {
      const twinkle = 0.5 + 0.5 * Math.sin(bg.twinklePhase);
      ctx.globalAlpha = bg.opacity * twinkle;
      ctx.fillStyle = '#c0c0e0';
      ctx.beginPath();
      ctx.arc(bg.x, bg.y, bg.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const star of this.stars) {
      this.drawStar(star);
    }

    for (const sub of this.subStars) {
      this.drawSubStar(sub);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#1a0a2e');
    gradient.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStar(star: StarParticle): void {
    const ctx = this.ctx;
    const color = getTagColor(star.diary.tag);
    const glowColor = getTagGlow(star.diary.tag);
    const pulse = 1 + 0.15 * Math.sin(star.pulsePhase);
    const radius = star.baseRadius * pulse * star.hoverScale;

    ctx.save();
    ctx.globalAlpha = star.opacity;
    ctx.translate(star.x, star.y);
    ctx.rotate(star.rotation);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 4);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(0.3, color + '60');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * star.hoverScale;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    if (star.hovered) {
      ctx.font = '12px "Segoe UI", "PingFang SC", sans-serif';
      ctx.fillStyle = '#e0e0ff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      const preview = star.diary.content.slice(0, 12) + (star.diary.content.length > 12 ? '…' : '');
      ctx.fillText(preview, 0, -radius * 2 - 8);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawSubStar(sub: SubStarParticle): void {
    const ctx = this.ctx;
    const parent = this.stars.find((s) => s.diary.id === sub.parentDiaryId);
    if (!parent) return;

    const px = parent.x + Math.cos(sub.orbitAngle) * sub.orbitRadius;
    const py = parent.y + Math.sin(sub.orbitAngle) * sub.orbitRadius;

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = sub.color;
    ctx.shadowColor = sub.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, sub.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export class ConstellationCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private stars: StarParticle[] = [];
  private animId: number | null = null;
  private lastTime = 0;
  private dragStar: StarParticle | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private flowPhase = 0;
  private onPositionChange: ((id: string, x: number, y: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  start(): void {
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd);
    this.handleResize();
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  stop(): void {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  setDiaries(diaries: Diary[]): void {
    this.stars = diaries.map((diary) => {
      const existing = this.stars.find((s) => s.diary.id === diary.id);
      return {
        diary,
        x: diary.x * this.width,
        y: diary.y * this.height,
        baseRadius: 6,
        rotation: existing?.rotation ?? Math.random() * Math.PI * 2,
        rotationSpeed: 0.005 + Math.random() * 0.008,
        pulsePhase: existing?.pulsePhase ?? Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.015,
        hovered: false,
        hoverScale: existing?.hoverScale ?? 1,
        targetHoverScale: 1,
        opacity: 1,
      };
    });
  }

  setPositionChangeHandler(handler: (id: string, x: number, y: number) => void): void {
    this.onPositionChange = handler;
  }

  private handleResize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const star of this.stars) {
      star.x = star.diary.x * this.width;
      star.y = star.diary.y * this.height;
    }
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private findStarAt(x: number, y: number): StarParticle | null {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      const dx = x - s.x;
      const dy = y - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < 24) return s;
    }
    return null;
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    const star = this.findStarAt(pos.x, pos.y);
    if (star) {
      this.dragStar = star;
      this.dragOffsetX = pos.x - star.x;
      this.dragOffsetY = pos.y - star.y;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.dragStar) return;
    const pos = this.getCanvasPos(e);
    this.dragStar.x = pos.x - this.dragOffsetX;
    this.dragStar.y = pos.y - this.dragOffsetY;
    this.dragStar.diary.x = this.dragStar.x / this.width;
    this.dragStar.diary.y = this.dragStar.y / this.height;
  }

  private handleMouseUp(): void {
    if (this.dragStar) {
      this.onPositionChange?.(this.dragStar.diary.id, this.dragStar.diary.x, this.dragStar.diary.y);
      this.dragStar = null;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const pos = this.getCanvasPos(e.touches[0]);
    const star = this.findStarAt(pos.x, pos.y);
    if (star) {
      this.dragStar = star;
      this.dragOffsetX = pos.x - star.x;
      this.dragOffsetY = pos.y - star.y;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.dragStar || e.touches.length !== 1) return;
    e.preventDefault();
    const pos = this.getCanvasPos(e.touches[0]);
    this.dragStar.x = pos.x - this.dragOffsetX;
    this.dragStar.y = pos.y - this.dragOffsetY;
    this.dragStar.diary.x = this.dragStar.x / this.width;
    this.dragStar.diary.y = this.dragStar.y / this.height;
  }

  private handleTouchEnd(): void {
    if (this.dragStar) {
      this.onPositionChange?.(this.dragStar.diary.id, this.dragStar.diary.x, this.dragStar.diary.y);
      this.dragStar = null;
    }
  }

  private animate(time: number): void {
    const dt = Math.min(time - this.lastTime, 50);
    this.lastTime = time;
    const dtFactor = dt / 16.67;

    for (const star of this.stars) {
      star.rotation += star.rotationSpeed * dtFactor;
      star.pulsePhase += star.pulseSpeed * dtFactor;
    }
    this.flowPhase += 0.02 * dtFactor;

    this.drawConstellation();
    this.animId = requestAnimationFrame(this.animate);
  }

  private drawConstellation(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const bg = ctx.createLinearGradient(0, 0, this.width, this.height);
    bg.addColorStop(0, '#0a0e27');
    bg.addColorStop(0.5, '#1a0a2e');
    bg.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const sorted = [...this.stars].sort(
      (a, b) => new Date(a.diary.createdAt).getTime() - new Date(b.diary.createdAt).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      this.drawConstellationLine(from, to);
    }

    for (const star of this.stars) {
      this.drawConstellationStar(star);
    }
  }

  private drawConstellationLine(from: StarParticle, to: StarParticle): void {
    const ctx = this.ctx;
    const fromColor = getTagColor(from.diary.tag);
    const toColor = getTagColor(to.diary.tag);

    ctx.save();
    ctx.globalAlpha = 0.6;
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, fromColor);
    gradient.addColorStop(1, toColor);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -this.flowPhase * 20;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawConstellationStar(star: StarParticle): void {
    const ctx = this.ctx;
    const color = getTagColor(star.diary.tag);
    const glowColor = getTagGlow(star.diary.tag);
    const pulse = 1 + 0.12 * Math.sin(star.pulsePhase);
    const radius = star.baseRadius * pulse;

    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.rotation);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 3);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(0.4, color + '40');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '11px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = '#c0c0e0';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    const label = star.diary.content.slice(0, 8) + (star.diary.content.length > 8 ? '…' : '');
    ctx.fillText(label, 0, radius * 2 + 14);
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
