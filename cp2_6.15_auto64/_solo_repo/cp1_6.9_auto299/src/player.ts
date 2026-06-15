import { NOTE_CONFIG } from './fragment';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface PurgePulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

export class Player {
  x: number = 0;
  y: number = 0;
  currentTrack: number = 3;
  baseSpeed: number = 150;
  speedMultiplier: number = 1;
  speedRecoveryTimer: number = 0;

  hitFlashTime: number = 0;
  radius: number = 14;

  collectedNotes: Set<number> = new Set();
  score: number = 0;
  scoreAccumulator: number = 0;

  isDragging: boolean = false;
  dragStartY: number = 0;
  lastDragY: number = 0;
  accumulatedDeltaY: number = 0;

  canvasWidth: number;
  canvasHeight: number;
  isMobile: boolean;

  particles: Particle[] = [];
  maxParticles: number = 200;
  trailCounter: number = 0;

  purgePulse: PurgePulse | null = null;

  onRequestSwitch: ((fromTrack: number, deltaY: number) => void) | null = null;
  onPurgePulse: ((x: number, y: number, radius: number) => number) | null = null;

  constructor(canvasWidth: number, canvasHeight: number, isMobile: boolean) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isMobile = isMobile;
    if (isMobile) {
      this.baseSpeed = 75;
      this.radius = 10;
    }
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  startDrag(clientY: number): void {
    this.isDragging = true;
    this.dragStartY = clientY;
    this.lastDragY = clientY;
    this.accumulatedDeltaY = 0;
  }

  updateDrag(clientY: number): void {
    if (!this.isDragging) return;
    const deltaY = clientY - this.lastDragY;
    this.lastDragY = clientY;
    this.accumulatedDeltaY += deltaY;

    if (this.onRequestSwitch) {
      this.onRequestSwitch(this.currentTrack, this.accumulatedDeltaY);
    }
  }

  endDrag(): void {
    this.isDragging = false;
    this.accumulatedDeltaY = 0;
  }

  resetAccumulatedDelta(): void {
    this.accumulatedDeltaY = 0;
  }

  setTrack(trackIndex: number): void {
    this.currentTrack = trackIndex;
  }

  emitSwitchParticles(fromY: number, toY: number): void {
    const count = this.isMobile ? 10 : 15;
    const midX = this.x;
    const colors = ['#64C8FF', '#00FFFF', '#A0E8FF', '#FFFFFF'];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const px = midX + (Math.random() - 0.5) * 20;
      const py = fromY + (toY - fromY) * t + (Math.random() - 0.5) * 10;
      this.addParticle({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  emitCollectParticles(x: number, y: number, color: string): void {
    const count = this.isMobile ? 12 : 20;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: 3 + Math.random() * 4,
        color
      });
    }
  }

  emitHitParticles(x: number, y: number): void {
    const count = this.isMobile ? 15 : 25;
    const colors = ['#FF4757', '#FF6B81', '#FF2D55', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  emitPurgeParticles(x: number, y: number): void {
    const count = this.isMobile ? 40 : 60;
    const colors = NOTE_CONFIG.map(n => n.color);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 200 + Math.random() * 200;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: 4 + Math.random() * 5,
        color: colors[i % colors.length]
      });
    }
  }

  addParticle(p: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  triggerHit(): { lostNote: number | null } {
    this.hitFlashTime = 0.5;
    this.speedMultiplier = 0.7;
    this.speedRecoveryTimer = 1.5;

    this.emitHitParticles(this.x, this.y);

    let lostNote: number | null = null;
    if (this.collectedNotes.size > 0) {
      const notes = Array.from(this.collectedNotes);
      lostNote = notes[Math.floor(Math.random() * notes.length)];
      this.collectedNotes.delete(lostNote);
    }

    return { lostNote };
  }

  collectNote(noteIndex: number, color: string, x: number, y: number): boolean {
    if (this.collectedNotes.has(noteIndex)) {
      return false;
    }

    this.collectedNotes.add(noteIndex);
    this.score += 50;
    this.emitCollectParticles(x, y, color);

    if (this.collectedNotes.size >= 7) {
      this.triggerPurgePulse();
    }

    return true;
  }

  triggerPurgePulse(): void {
    const maxR = Math.max(this.canvasWidth, this.canvasHeight) * 1.2;
    this.purgePulse = {
      x: this.x,
      y: this.y,
      radius: this.radius,
      maxRadius: maxR,
      progress: 0,
      duration: 0.8,
      elapsed: 0,
      active: true
    };
    this.emitPurgeParticles(this.x, this.y);
    this.collectedNotes.clear();
  }

  update(dt: number, trackY: number): void {
    this.x += this.baseSpeed * this.speedMultiplier * dt;
    this.y = trackY;

    if (this.x > this.canvasWidth + 100) {
      this.x = -80;
    }
    if (this.x < -100) {
      this.x = this.canvasWidth + 80;
    }

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= dt;
    }

    if (this.speedRecoveryTimer > 0) {
      this.speedRecoveryTimer -= dt;
      if (this.speedRecoveryTimer <= 0) {
        this.speedMultiplier = Math.min(1, this.speedMultiplier + dt * 0.5);
        if (this.speedMultiplier >= 1) {
          this.speedMultiplier = 1;
        }
      }
    }

    this.scoreAccumulator += dt;
    while (this.scoreAccumulator >= 1) {
      this.score += 1;
      this.scoreAccumulator -= 1;
    }

    this.trailCounter += dt;
    if (this.trailCounter >= 0.03) {
      this.trailCounter = 0;
      const isFlashing = this.hitFlashTime > 0;
      this.addParticle({
        x: this.x,
        y: this.y,
        vx: -this.baseSpeed * this.speedMultiplier * 0.3,
        vy: (Math.random() - 0.5) * 20,
        life: 0.4,
        maxLife: 0.4,
        size: this.radius * 0.6,
        color: isFlashing ? '#FF4757' : '#64C8FF'
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    if (this.purgePulse && this.purgePulse.active) {
      this.purgePulse.elapsed += dt;
      this.purgePulse.progress = Math.min(1, this.purgePulse.elapsed / this.purgePulse.duration);
      const t = this.purgePulse.progress;
      const eased = 1 - Math.pow(1 - t, 3);
      this.purgePulse.radius = this.purgePulse.maxRadius * eased;

      if (this.onPurgePulse) {
        this.onPurgePulse(this.purgePulse.x, this.purgePulse.y, this.purgePulse.radius);
      }

      if (this.purgePulse.progress >= 1) {
        this.purgePulse.active = false;
        this.purgePulse = null;
      }
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderPurgePulse(ctx: CanvasRenderingContext2D): void {
    if (!this.purgePulse || !this.purgePulse.active) return;

    const t = this.purgePulse.progress;
    const alpha = 1 - t;
    const r = this.purgePulse.radius;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const colors = NOTE_CONFIG.map(n => n.color);
    for (let i = 0; i < 7; i++) {
      const ringR = r * (1 - i * 0.04);
      if (ringR <= 0) continue;
      const ringAlpha = alpha * (1 - i * 0.1);
      const color = colors[i % colors.length];

      ctx.strokeStyle = color;
      ctx.globalAlpha = ringAlpha * 0.8;
      ctx.lineWidth = 8 - i;
      ctx.shadowColor = color;
      ctx.shadowBlur = 30;

      ctx.beginPath();
      ctx.arc(this.purgePulse.x, this.purgePulse.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(
      this.purgePulse.x, this.purgePulse.y, 0,
      this.purgePulse.x, this.purgePulse.y, r
    );
    for (let i = 0; i < 7; i++) {
      const stop = i / 7;
      gradient.addColorStop(stop, colors[i % colors.length] + Math.floor(alpha * 40).toString(16).padStart(2, '0'));
    }
    gradient.addColorStop(1, colors[0] + '00');

    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.purgePulse.x, this.purgePulse.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderParticles(ctx);
    this.renderPurgePulse(ctx);

    const isFlashing = this.hitFlashTime > 0;
    const flashIntensity = isFlashing ? (Math.sin(this.hitFlashTime * 30) * 0.5 + 0.5) : 0;

    ctx.save();

    const outerR = this.radius * 3;
    const outerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, outerR);
    if (isFlashing) {
      outerGradient.addColorStop(0, `rgba(255, 71, 87, ${0.4 + flashIntensity * 0.3})`);
      outerGradient.addColorStop(0.4, `rgba(255, 100, 120, ${0.2 + flashIntensity * 0.15})`);
      outerGradient.addColorStop(1, 'rgba(255, 71, 87, 0)');
    } else {
      outerGradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
      outerGradient.addColorStop(0.4, 'rgba(50, 150, 255, 0.15)');
      outerGradient.addColorStop(1, 'rgba(50, 150, 255, 0)');
    }

    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, outerR, 0, Math.PI * 2);
    ctx.fill();

    const midR = this.radius * 1.8;
    const midGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, midR);
    if (isFlashing) {
      midGradient.addColorStop(0, `rgba(255, 150, 160, ${0.6 + flashIntensity * 0.3})`);
      midGradient.addColorStop(1, `rgba(255, 71, 87, ${0.2 + flashIntensity * 0.2})`);
    } else {
      midGradient.addColorStop(0, 'rgba(200, 235, 255, 0.8)');
      midGradient.addColorStop(1, 'rgba(100, 180, 255, 0.3)');
    }

    ctx.fillStyle = midGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, midR, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = isFlashing ? '#FF4757' : '#00BFFF';
    ctx.shadowBlur = 25;

    const coreGradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius
    );
    if (isFlashing) {
      coreGradient.addColorStop(0, '#FFFFFF');
      coreGradient.addColorStop(0.3, '#FF8088');
      coreGradient.addColorStop(1, '#FF4757');
    } else {
      coreGradient.addColorStop(0, '#FFFFFF');
      coreGradient.addColorStop(0.3, '#E0F4FF');
      coreGradient.addColorStop(1, '#64B8FF');
    }

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = isFlashing ? 0.9 : 0.95;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.35, this.y - this.radius * 0.35, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
