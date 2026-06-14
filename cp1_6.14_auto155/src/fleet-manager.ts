import { ParticleSystem } from './particle-system';
import { AsteroidManager, Asteroid } from './asteroid-manager';

export enum ShipType {
  FRIGATE = 'frigate',
  DESTROYER = 'destroyer',
  CARRIER = 'carrier',
}

export enum Formation {
  TRIANGLE = 'triangle',
  SQUARE = 'square',
  LINE = 'line',
}

export const SHIP_COLORS: Record<ShipType, string> = {
  [ShipType.FRIGATE]: '#4a9eff',
  [ShipType.DESTROYER]: '#ff8c42',
  [ShipType.CARRIER]: '#a855f7',
};

export const SHIP_THRUST_COLORS: Record<ShipType, string> = {
  [ShipType.FRIGATE]: '#88ccff',
  [ShipType.DESTROYER]: '#ffcc88',
  [ShipType.CARRIER]: '#cc99ff',
};

export interface Ship {
  id: number;
  type: ShipType;
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  hasTarget: boolean;
  maxSpeed: number;
  shield: number;
  maxShield: number;
  selected: boolean;
  formationOffsetX: number;
  formationOffsetY: number;
  fireCooldown: number;
  fireRate: number;
  damage: number;
  attackRange: number;
  size: number;
  isMoving: boolean;
}

interface Bullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  ownerId: number;
  life: number;
  age: number;
}

const MAX_SHIPS = 50;
const MAX_BULLETS = 300;
const SHIP_LENGTH = 24;
const BULLET_RADIUS = 1.5;

export class FleetManager {
  private ships: Ship[] = [];
  private bullets: Bullet[] = [];
  private nextShipId = 1;
  private particles: ParticleSystem;
  private asteroids: AsteroidManager;
  private canvasWidth = 0;
  private canvasHeight = 0;

  public formation: Formation = Formation.TRIANGLE;
  public onSelectChange?: () => void;
  public onFormationChange?: () => void;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragCurrentX = 0;
  private dragCurrentY = 0;
  private dragMoved = false;

  constructor(particles: ParticleSystem, asteroids: AsteroidManager) {
    this.particles = particles;
    this.asteroids = asteroids;
    for (let i = 0; i < MAX_SHIPS; i++) {
      this.ships.push(this.createEmptyShip());
    }
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        damage: 0, color: '#fff', ownerId: 0,
        life: 0, age: 0,
      });
    }
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  private createEmptyShip(): Ship {
    return {
      id: 0,
      type: ShipType.FRIGATE,
      x: 0, y: 0, angle: -Math.PI / 2,
      targetX: 0, targetY: 0, hasTarget: false,
      maxSpeed: 120,
      shield: 0, maxShield: 0,
      selected: false,
      formationOffsetX: 0, formationOffsetY: 0,
      fireCooldown: 0, fireRate: 600,
      damage: 1, attackRange: 320,
      size: SHIP_LENGTH,
      isMoving: false,
    };
  }

  spawnInitialFleet(cx: number, cy: number): void {
    const layout: Array<{ type: ShipType; count: number }> = [
      { type: ShipType.FRIGATE, count: 8 },
      { type: ShipType.DESTROYER, count: 4 },
      { type: ShipType.CARRIER, count: 2 },
    ];
    let idx = 0;
    for (const group of layout) {
      for (let i = 0; i < group.count; i++) {
        const s = this.allocShip();
        if (!s) return;
        s.type = group.type;
        const angle = (idx / 14) * Math.PI * 2;
        const dist = 30 + (idx % 3) * 40;
        s.x = cx + Math.cos(angle) * dist;
        s.y = cy + Math.sin(angle) * dist;
        s.angle = -Math.PI / 2;
        s.targetX = s.x;
        s.targetY = s.y;
        if (s.type === ShipType.FRIGATE) {
          s.maxSpeed = 160; s.maxShield = 50; s.shield = 50;
          s.fireRate = 400; s.damage = 1; s.attackRange = 280;
        } else if (s.type === ShipType.DESTROYER) {
          s.maxSpeed = 110; s.maxShield = 120; s.shield = 120;
          s.fireRate = 700; s.damage = 3; s.attackRange = 340;
        } else {
          s.maxSpeed = 80; s.maxShield = 220; s.shield = 220;
          s.fireRate = 1000; s.damage = 5; s.attackRange = 400;
        }
        s.fireCooldown = Math.random() * s.fireRate;
        idx++;
      }
    }
    this.recalcFormationOffsets();
  }

  private allocShip(): Ship | null {
    for (let i = 0; i < this.ships.length; i++) {
      if (this.ships[i].id === 0) {
        this.ships[i].id = this.nextShipId++;
        return this.ships[i];
      }
    }
    return null;
  }

  private allocBullet(): Bullet | null {
    for (let i = 0; i < this.bullets.length; i++) {
      if (!this.bullets[i].active) {
        return this.bullets[i];
      }
    }
    return null;
  }

  public recalcFormationOffsets(): void {
    const selected: Ship[] = [];
    for (let i = 0; i < this.ships.length; i++) {
      if (this.ships[i].id !== 0 && this.ships[i].selected) {
        selected.push(this.ships[i]);
      }
    }
    if (selected.length === 0) return;

    const offsets = this.computeFormationOffsets(selected.length);
    for (let i = 0; i < selected.length; i++) {
      selected[i].formationOffsetX = offsets[i].x;
      selected[i].formationOffsetY = offsets[i].y;
    }
  }

  private computeFormationOffsets(n: number): Array<{ x: number; y: number }> {
    const spacing = 42;
    const result: Array<{ x: number; y: number }> = [];
    if (this.formation === Formation.TRIANGLE) {
      let row = 0;
      let placed = 0;
      while (placed < n) {
        const count = row + 1;
        const rowStart = -((count - 1) * spacing) / 2;
        for (let i = 0; i < count && placed < n; i++) {
          result.push({ x: rowStart + i * spacing, y: row * spacing * 0.85 });
          placed++;
        }
        row++;
      }
    } else if (this.formation === Formation.SQUARE) {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const totalW = (cols - 1) * spacing;
      const totalH = (rows - 1) * spacing;
      for (let i = 0; i < n; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        result.push({
          x: c * spacing - totalW / 2,
          y: r * spacing - totalH / 2,
        });
      }
    } else {
      const totalW = (n - 1) * spacing;
      for (let i = 0; i < n; i++) {
        result.push({ x: i * spacing - totalW / 2, y: 0 });
      }
    }
    return result;
  }

  public getSelectedCentroid(): { x: number; y: number } {
    let sx = 0, sy = 0, c = 0;
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.id !== 0 && s.selected) {
        sx += s.x; sy += s.y; c++;
      }
    }
    if (c === 0) return { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };
    return { x: sx / c, y: sy / c };
  }

  public getFleetCentroid(): { x: number; y: number } {
    let sx = 0, sy = 0, c = 0;
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.id !== 0) {
        sx += s.x; sy += s.y; c++;
      }
    }
    if (c === 0) return { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };
    return { x: sx / c, y: sy / c };
  }

  public moveSelectedTo(targetX: number, targetY: number): void {
    const centroid = this.getSelectedCentroid();
    let anyMoved = false;
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.id !== 0 && s.selected) {
        const dx = s.x - centroid.x;
        const dy = s.y - centroid.y;
        s.targetX = targetX + (s.formationOffsetX || dx * 0.5);
        s.targetY = targetY + (s.formationOffsetY || dy * 0.5);
        s.hasTarget = true;
        anyMoved = true;
      }
    }
    if (anyMoved && this.recalcFormationOffsets, false) {}
  }

  public handleMouseDown(x: number, y: number, button: number, shiftPressed: boolean): boolean {
    if (button === 0) {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragCurrentX = x;
      this.dragCurrentY = y;
      this.dragMoved = false;
      if (!shiftPressed) {
        this.clearSelection();
      }
      return true;
    }
    if (button === 2) {
      this.moveSelectedTo(x, y);
      return true;
    }
    return false;
  }

  public handleMouseMove(x: number, y: number): void {
    if (this.isDragging) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      if (dx * dx + dy * dy > 9) {
        this.dragMoved = true;
      }
      this.dragCurrentX = x;
      this.dragCurrentY = y;
    }
  }

  public handleMouseUp(x: number, y: number, button: number): boolean {
    if (button !== 0 || !this.isDragging) return false;
    this.isDragging = false;
    if (!this.dragMoved) {
      for (let i = 0; i < this.ships.length; i++) {
        const s = this.ships[i];
        if (s.id === 0) continue;
        const dx = s.x - x;
        const dy = s.y - y;
        if (dx * dx + dy * dy < (s.size * 0.8) * (s.size * 0.8)) {
          s.selected = !s.selected;
          break;
        }
      }
    } else {
      const x1 = Math.min(this.dragStartX, this.dragCurrentX);
      const y1 = Math.min(this.dragStartY, this.dragCurrentY);
      const x2 = Math.max(this.dragStartX, this.dragCurrentX);
      const y2 = Math.max(this.dragStartY, this.dragCurrentY);
      for (let i = 0; i < this.ships.length; i++) {
        const s = this.ships[i];
        if (s.id === 0) continue;
        if (s.x >= x1 && s.x <= x2 && s.y >= y1 && s.y <= y2) {
          s.selected = true;
        }
      }
    }
    this.recalcFormationOffsets();
    if (this.onSelectChange) this.onSelectChange();
    return true;
  }

  public clearSelection(): void {
    for (let i = 0; i < this.ships.length; i++) {
      this.ships[i].selected = false;
    }
    if (this.onSelectChange) this.onSelectChange();
  }

  public setFormation(f: Formation): void {
    if (this.formation === f) return;
    this.formation = f;
    this.recalcFormationOffsets();
    if (this.onFormationChange) this.onFormationChange();
    if (this.onSelectChange) this.onSelectChange();
  }

  public getStats(): { selected: number; totalShield: number; maxShield: number; byType: Record<ShipType, number> } {
    const result = {
      selected: 0,
      totalShield: 0,
      maxShield: 0,
      byType: { [ShipType.FRIGATE]: 0, [ShipType.DESTROYER]: 0, [ShipType.CARRIER]: 0 } as Record<ShipType, number>,
    };
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.id === 0) continue;
      result.byType[s.type]++;
      if (s.selected) {
        result.selected++;
        result.totalShield += s.shield;
        result.maxShield += s.maxShield;
      }
    }
    return result;
  }

  private fireBullet(s: Ship, target: Asteroid): void {
    const b = this.allocBullet();
    if (!b) return;
    const dx = target.x - s.x;
    const dy = target.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 520;
    const noseX = s.x + Math.cos(s.angle) * s.size * 0.6;
    const noseY = s.y + Math.sin(s.angle) * s.size * 0.6;
    b.active = true;
    b.x = noseX;
    b.y = noseY;
    b.vx = (dx / dist) * speed;
    b.vy = (dy / dist) * speed;
    b.damage = s.damage;
    b.color = SHIP_COLORS[s.type];
    b.ownerId = s.id;
    b.life = 1500;
    b.age = 0;
  }

  update(dt: number): void {
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.id === 0) continue;

      s.isMoving = false;
      if (s.hasTarget) {
        const dx = s.targetX - s.x;
        const dy = s.targetY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.5) {
          const targetAngle = Math.atan2(dy, dx);
          let da = targetAngle - s.angle;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const maxTurn = 5 * (dt / 1000);
          if (da > maxTurn) da = maxTurn;
          if (da < -maxTurn) da = -maxTurn;
          s.angle += da;

          const step = Math.min(dist, s.maxSpeed * (dt / 1000));
          s.x += Math.cos(targetAngle) * step;
          s.y += Math.sin(targetAngle) * step;
          s.isMoving = true;

          const thrustIntensity = Math.min(1.2, dist / 80);
          const tailX = s.x - Math.cos(s.angle) * s.size * 0.55;
          const tailY = s.y - Math.sin(s.angle) * s.size * 0.55;
          this.particles.emitThrust(tailX, tailY, s.angle, SHIP_THRUST_COLORS[s.type], thrustIntensity);
        } else {
          s.x = s.targetX;
          s.y = s.targetY;
          s.hasTarget = false;
        }
      }

      if (s.fireCooldown > 0) {
        s.fireCooldown -= dt;
      } else {
        const target = this.asteroids.findNearest(s.x, s.y, s.attackRange);
        if (target) {
          this.fireBullet(s, target);
          s.fireCooldown = s.fireRate;
        }
      }
    }

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.life) { b.active = false; continue; }
      b.x += b.vx * (dt / 1000);
      b.y += b.vy * (dt / 1000);
      if (b.x < -20 || b.x > this.canvasWidth + 20 ||
          b.y < -20 || b.y > this.canvasHeight + 20) {
        b.active = false;
        continue;
      }
      const hit = this.asteroids.checkCollision(b.x, b.y, BULLET_RADIUS);
      if (hit) {
        this.asteroids.damage(hit, b.damage);
        this.particles.emitExplosion(b.x, b.y, b.color);
        b.active = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.id === 0) continue;
      if (s.x < -40 || s.x > this.canvasWidth + 40 ||
          s.y < -40 || s.y > this.canvasHeight + 40) {
        continue;
      }

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      const color = SHIP_COLORS[s.type];
      const halfLen = s.size * 0.5;
      const width = s.size * 0.55;

      if (s.selected) {
        const pulse = 0.6 + 0.4 * Math.sin(time / 750);
        ctx.save();
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 10 * pulse;
        ctx.strokeStyle = `rgba(0,255,102,${0.8 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.moveTo(halfLen, 0);
      ctx.lineTo(-halfLen * 0.8, width * 0.5);
      ctx.lineTo(-halfLen * 0.4, 0);
      ctx.lineTo(-halfLen * 0.8, -width * 0.5);
      ctx.closePath();

      const grad = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
      grad.addColorStop(0, this.shade(color, -40));
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, this.shade(color, 40));
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(halfLen * 0.15, 0, s.size * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();

      if (s.type === ShipType.CARRIER) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(-halfLen * 0.3, -width * 0.28, halfLen * 0.7, width * 0.18);
        ctx.fillRect(-halfLen * 0.3, width * 0.1, halfLen * 0.7, width * 0.18);
      }

      ctx.restore();

      if (s.shield < s.maxShield) {
        const barW = s.size * 1.4;
        const barH = 3;
        const bx = s.x - barW / 2;
        const by = s.y - s.size * 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(bx, by, barW * (s.shield / s.maxShield), barH);
      }
    }

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (!b.active) continue;
      const trailLen = 10;
      const invVx = b.vx;
      const invVy = b.vy;
      const vmag = Math.sqrt(invVx * invVx + invVy * invVy) || 1;
      const tx = b.x - (invVx / vmag) * trailLen;
      const ty = b.y - (invVy / vmag) * trailLen;

      const tgrad = ctx.createLinearGradient(b.x, b.y, tx, ty);
      tgrad.addColorStop(0, b.color);
      tgrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = tgrad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.isDragging && this.dragMoved) {
      const x = Math.min(this.dragStartX, this.dragCurrentX);
      const y = Math.min(this.dragStartY, this.dragCurrentY);
      const w = Math.abs(this.dragCurrentX - this.dragStartX);
      const h = Math.abs(this.dragCurrentY - this.dragStartY);
      ctx.save();
      ctx.fillStyle = 'rgba(0,212,255,0.08)';
      ctx.strokeStyle = 'rgba(0,212,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }

  private shade(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  public forEachSelected(cb: (s: Ship) => void): void {
    for (let i = 0; i < this.ships.length; i++) {
      if (this.ships[i].id !== 0 && this.ships[i].selected) {
        cb(this.ships[i]);
      }
    }
  }
}
