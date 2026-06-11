export type TrajectoryType = 'linear' | 's_curve' | 'spiral';
export type NoteState = 'active' | 'hit' | 'missed' | 'pooled';
export type ParticleState = 'active' | 'pooled';

export interface NoteData {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  speed: number;
  color: string;
  state: NoteState;
  size: number;
  hitTime: number;
  trajectory: TrajectoryType;
}

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  state: ParticleState;
  angle: number;
}

const NOTE_COLORS = ['#00FFFF', '#FF00FF', '#8B5CF6', '#3B82F6', '#10B981'];
const NOTE_SPEEDS = [2000, 4000, 6000];
const MAX_NOTES = 60;
const MAX_PARTICLES = 200;
const PARTICLE_PER_HIT = 30;
const TARGET_OUTER_RADIUS = 60;

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function cubicBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

function generateTrajectory(
  type: TrajectoryType,
  centerX: number,
  centerY: number,
  canvasSize: number
): {
  startX: number;
  startY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  endX: number;
  endY: number;
} {
  const edge = Math.floor(Math.random() * 4);
  let startX: number, startY: number;
  
  switch (edge) {
    case 0:
      startX = Math.random() * canvasSize;
      startY = -30;
      break;
    case 1:
      startX = canvasSize + 30;
      startY = Math.random() * canvasSize;
      break;
    case 2:
      startX = Math.random() * canvasSize;
      startY = canvasSize + 30;
      break;
    default:
      startX = -30;
      startY = Math.random() * canvasSize;
  }
  
  const endX = centerX;
  const endY = centerY;
  
  let controlX1: number, controlY1: number, controlX2: number, controlY2: number;
  
  switch (type) {
    case 'linear':
      controlX1 = startX + (endX - startX) * 0.33;
      controlY1 = startY + (endY - startY) * 0.33;
      controlX2 = startX + (endX - startX) * 0.66;
      controlY2 = startY + (endY - startY) * 0.66;
      break;
      
    case 's_curve': {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const perpX = -(endY - startY) * 0.3;
      const perpY = (endX - startX) * 0.3;
      controlX1 = midX - perpX;
      controlY1 = midY - perpY;
      controlX2 = midX + perpX;
      controlY2 = midY + perpY;
      break;
    }
      
    case 'spiral': {
      const angle = Math.atan2(endY - startY, endX - startX);
      const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      controlX1 = startX + Math.cos(angle + Math.PI / 3) * dist * 0.5;
      controlY1 = startY + Math.sin(angle + Math.PI / 3) * dist * 0.5;
      controlX2 = startX + Math.cos(angle - Math.PI / 3) * dist * 0.5;
      controlY2 = startY + Math.sin(angle - Math.PI / 3) * dist * 0.5;
      break;
    }
  }
  
  return { startX, startY, controlX1, controlY1, controlX2, controlY2, endX, endY };
}

class ObjectPool<T extends { state: string }> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize: number) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }
  
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
  
  get size(): number {
    return this.pool.length;
  }
}

export class Note implements NoteData {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  speed: number;
  color: string;
  state: NoteState;
  size: number;
  hitTime: number;
  trajectory: TrajectoryType;
  
  constructor() {
    this.id = 0;
    this.x = 0;
    this.y = 0;
    this.startX = 0;
    this.startY = 0;
    this.controlX1 = 0;
    this.controlY1 = 0;
    this.controlX2 = 0;
    this.controlY2 = 0;
    this.endX = 0;
    this.endY = 0;
    this.progress = 0;
    this.duration = 4000;
    this.speed = 1;
    this.color = '#00FFFF';
    this.state = 'pooled';
    this.size = 20;
    this.hitTime = 0;
    this.trajectory = 'linear';
  }
  
  init(
    id: number,
    trajectory: TrajectoryType,
    centerX: number,
    centerY: number,
    canvasSize: number,
    speedMultiplier: number = 1
  ): void {
    const traj = generateTrajectory(trajectory, centerX, centerY, canvasSize);
    this.id = id;
    this.startX = traj.startX;
    this.startY = traj.startY;
    this.controlX1 = traj.controlX1;
    this.controlY1 = traj.controlY1;
    this.controlX2 = traj.controlX2;
    this.controlY2 = traj.controlY2;
    this.endX = traj.endX;
    this.endY = traj.endY;
    this.progress = 0;
    this.duration = NOTE_SPEEDS[Math.floor(Math.random() * NOTE_SPEEDS.length)] / speedMultiplier;
    this.speed = speedMultiplier;
    this.color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    this.state = 'active';
    this.size = 20;
    this.hitTime = 0;
    this.trajectory = trajectory;
    this.x = this.startX;
    this.y = this.startY;
  }
  
  update(deltaTime: number): void {
    if (this.state !== 'active') return;
    
    this.progress += deltaTime / this.duration;
    
    if (this.progress >= 1) {
      this.progress = 1;
      this.state = 'missed';
      return;
    }
    
    const pos = cubicBezier(
      this.progress,
      { x: this.startX, y: this.startY },
      { x: this.controlX1, y: this.controlY1 },
      { x: this.controlX2, y: this.controlY2 },
      { x: this.endX, y: this.endY }
    );
    
    this.x = pos.x;
    this.y = pos.y;
  }
  
  checkHit(
    clickX: number,
    clickY: number,
    centerX: number,
    centerY: number,
    hitWindow: number
  ): boolean {
    if (this.state !== 'active') return false;
    
    const distToCenter = Math.sqrt((this.x - centerX) ** 2 + (this.y - centerY) ** 2);
    const distToClick = Math.sqrt((clickX - this.x) ** 2 + (clickY - this.y) ** 2);
    const clickRadius = Math.max(22, this.size + 10);
    
    const inClickRange = distToClick <= clickRadius;
    const inTargetRange = distToCenter <= TARGET_OUTER_RADIUS;
    const inTimeWindow = this.progress >= (1 - hitWindow / this.duration) && this.progress <= 1;
    
    return inClickRange && inTargetRange && inTimeWindow;
  }
  
  checkMiss(centerX: number, centerY: number): boolean {
    if (this.state !== 'active') return false;
    
    const distToCenter = Math.sqrt((this.x - centerX) ** 2 + (this.y - centerY) ** 2);
    return distToCenter < 5 && this.progress >= 0.98;
  }
  
  drawTrajectory(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'active') return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.bezierCurveTo(
      this.controlX1, this.controlY1,
      this.controlX2, this.controlY2,
      this.endX, this.endY
    );
    ctx.stroke();
    ctx.restore();
  }
  
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'active') return;
    
    const glowIntensity = 1 - this.progress * 0.5;
    
    ctx.save();
    
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 2
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.5, this.color + '80');
    gradient.addColorStop(1, 'transparent');
    
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15 * glowIntensity;
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 10 * glowIntensity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

export class Particle implements ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  state: ParticleState;
  angle: number;
  
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = '#FFFFFF';
    this.life = 0;
    this.maxLife = 500;
    this.size = 3;
    this.state = 'pooled';
    this.angle = 0;
  }
  
  init(x: number, y: number, color: string, angle: number, speed: number, maxLife: number = 500): void {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.life = maxLife;
    this.maxLife = maxLife;
    this.size = 3 + Math.random() * 3;
    this.state = 'active';
    this.angle = angle;
  }
  
  update(deltaTime: number): void {
    if (this.state !== 'active') return;
    
    this.life -= deltaTime;
    
    if (this.life <= 0) {
      this.state = 'pooled';
      return;
    }
    
    const t = 1 - this.life / this.maxLife;
    const easedT = easeOutQuad(t);
    
    this.x += this.vx * deltaTime * 0.1;
    this.y += this.vy * deltaTime * 0.1;
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    this.size = (3 + Math.random() * 3) * (1 - easedT * 0.7);
  }
  
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'active') return;
    
    const alpha = this.life / this.maxLife;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class MissText {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  active: boolean;
  
  constructor() {
    this.x = 0;
    this.y = 0;
    this.life = 0;
    this.maxLife = 1000;
    this.active = false;
  }
  
  init(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.life = this.maxLife;
    this.active = true;
  }
  
  update(deltaTime: number): void {
    if (!this.active) return;
    
    this.life -= deltaTime;
    
    if (this.life <= 0) {
      this.active = false;
    }
  }
  
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    
    const t = 1 - this.life / this.maxLife;
    const easedT = easeOutCubic(t);
    const alpha = 1 - t;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 24px Orbitron, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FF3333';
    ctx.shadowBlur = 4;
    
    const offsetY = easedT * 60;
    ctx.fillText('Miss', this.x, this.y - offsetY);
    ctx.restore();
  }
}

export class NoteManager {
  private notes: Note[] = [];
  private particles: Particle[] = [];
  private missTexts: MissText[] = [];
  private notePool: ObjectPool<Note>;
  private particlePool: ObjectPool<Particle>;
  private noteIdCounter: number = 0;
  private centerX: number;
  private centerY: number;
  private canvasSize: number;
  
  constructor(centerX: number, centerY: number, canvasSize: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.canvasSize = canvasSize;
    
    this.notePool = new ObjectPool<Note>(
      () => new Note(),
      (note) => { note.state = 'pooled'; },
      MAX_NOTES
    );
    
    this.particlePool = new ObjectPool<Particle>(
      () => new Particle(),
      (particle) => { particle.state = 'pooled'; },
      MAX_PARTICLES
    );
    
    for (let i = 0; i < 5; i++) {
      this.missTexts.push(new MissText());
    }
  }
  
  spawnNote(trajectory: TrajectoryType, speedMultiplier: number = 1): boolean {
    if (this.notes.filter(n => n.state === 'active').length >= MAX_NOTES) {
      return false;
    }
    
    const note = this.notePool.acquire();
    note.init(
      this.noteIdCounter++,
      trajectory,
      this.centerX,
      this.centerY,
      this.canvasSize,
      speedMultiplier
    );
    this.notes.push(note);
    return true;
  }
  
  spawnParticles(x: number, y: number, color: string, count: number = PARTICLE_PER_HIT, isUltimate: boolean = false): void {
    const activeParticles = this.particles.filter(p => p.state === 'active').length;
    const availableSlots = MAX_PARTICLES - activeParticles;
    const actualCount = Math.min(count, availableSlots);
    
    for (let i = 0; i < actualCount; i++) {
      const particle = this.particlePool.acquire();
      const angle = (Math.PI * 2 * i) / actualCount + Math.random() * 0.3;
      const speed = isUltimate ? 8 + Math.random() * 8 : 3 + Math.random() * 4;
      const life = isUltimate ? 800 : 500;
      particle.init(x, y, isUltimate ? '#FFD700' : color, angle, speed, life);
      this.particles.push(particle);
    }
  }
  
  spawnMissText(x: number, y: number): void {
    const missText = this.missTexts.find(m => !m.active);
    if (missText) {
      missText.init(x, y);
    }
  }
  
  update(deltaTime: number): { missedCount: number; hitCount: number } {
    let missedCount = 0;
    let hitCount = 0;
    
    for (const note of this.notes) {
      const prevState = note.state;
      note.update(deltaTime);
      
      if (prevState === 'active' && note.state === 'missed') {
        missedCount++;
        this.spawnMissText(this.centerX, this.centerY - 40);
      }
      
      if (prevState === 'active' && note.state === 'hit') {
        hitCount++;
      }
    }
    
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }
    
    for (const missText of this.missTexts) {
      missText.update(deltaTime);
    }
    
    this.notes = this.notes.filter(note => {
      if (note.state === 'hit' || note.state === 'missed') {
        if (note.hitTime === 0) {
          note.hitTime = performance.now();
        }
        if (performance.now() - note.hitTime > 300) {
          this.notePool.release(note);
          return false;
        }
      }
      return note.state !== 'pooled';
    });
    
    this.particles = this.particles.filter(particle => {
      if (particle.state === 'pooled') {
        this.particlePool.release(particle);
        return false;
      }
      return true;
    });
    
    return { missedCount, hitCount };
  }
  
  handleClick(
    clickX: number,
    clickY: number,
    hitWindow: number
  ): { hit: boolean; note: Note | null; missed: boolean } {
    let hitNote: Note | null = null;
    let missed = false;
    
    for (const note of this.notes) {
      if (note.state === 'active' && note.checkHit(clickX, clickY, this.centerX, this.centerY, hitWindow)) {
        note.state = 'hit';
        hitNote = note;
        this.spawnParticles(note.x, note.y, note.color);
        break;
      }
    }
    
    if (!hitNote) {
      const distToCenter = Math.sqrt((clickX - this.centerX) ** 2 + (clickY - this.centerY) ** 2);
      if (distToCenter <= TARGET_OUTER_RADIUS) {
        for (const note of this.notes) {
          if (note.state === 'active' && note.checkMiss(this.centerX, this.centerY)) {
            note.state = 'missed';
            missed = true;
            this.spawnMissText(this.centerX, this.centerY - 40);
            break;
          }
        }
      }
    }
    
    return { hit: hitNote !== null, note: hitNote, missed };
  }
  
  clearAllNotes(): number {
    let clearedCount = 0;
    
    for (const note of this.notes) {
      if (note.state === 'active') {
        note.state = 'hit';
        this.spawnParticles(note.x, note.y, '#FFD700', 50, true);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }
  
  getActiveNotes(): Note[] {
    return this.notes.filter(n => n.state === 'active');
  }
  
  drawTrajectories(ctx: CanvasRenderingContext2D): void {
    for (const note of this.notes) {
      note.drawTrajectory(ctx);
    }
  }
  
  drawNotes(ctx: CanvasRenderingContext2D): void {
    for (const note of this.notes) {
      note.draw(ctx);
    }
  }
  
  drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }
  
  drawMissTexts(ctx: CanvasRenderingContext2D): void {
    for (const missText of this.missTexts) {
      missText.draw(ctx);
    }
  }
  
  reset(): void {
    for (const note of this.notes) {
      this.notePool.release(note);
    }
    this.notes = [];
    
    for (const particle of this.particles) {
      this.particlePool.release(particle);
    }
    this.particles = [];
    
    this.noteIdCounter = 0;
  }
}
