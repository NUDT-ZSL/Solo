
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export type OreColor = 'red' | 'blue' | 'green';

export const ORE_COLORS: Record<OreColor, string> = {
  red: '#FF6B6B',
  blue: '#4FC3F7',
  green: '#81C784'
};

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  shoot: boolean;
}

export class Ship {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean = true;
  speed: number = 200;
  thrusterAnim: number = 0;
  lastShootTime: number = 0;
  shootCooldown: number = 250;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 30;
  }

  update(deltaTime: number, input: InputState): void {
    const multiplier = input.boost ? 2 : 1;
    const moveSpeed = this.speed * multiplier * deltaTime;

    if (input.up) this.y -= moveSpeed;
    if (input.down) this.y += moveSpeed;
    if (input.left) this.x -= moveSpeed;
    if (input.right) this.x += moveSpeed;

    this.x = Math.max(this.width / 2, Math.min(CANVAS_WIDTH - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, Math.min(CANVAS_HEIGHT - this.height / 2, this.y));

    this.thrusterAnim += deltaTime * 8;
  }

  canShoot(now: number): boolean {
    return now - this.lastShootTime >= this.shootCooldown;
  }

  shoot(now: number): Bullet {
    this.lastShootTime = now;
    return new Bullet(this.x + this.width / 2, this.y);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const flameSize = 8 + Math.sin(this.thrusterAnim) * 4;
    const gradient = ctx.createLinearGradient(0, this.height / 2, 0, this.height / 2 + flameSize);
    gradient.addColorStop(0, '#FF8C00');
    gradient.addColorStop(1, '#FF4500');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-8, this.height / 2 - 2);
    ctx.lineTo(0, this.height / 2 + flameSize);
    ctx.lineTo(8, this.height / 2 - 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00D4FF';
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 2 - 5);
    ctx.lineTo(-this.width / 4, this.height / 2);
    ctx.lineTo(this.width / 4, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2 - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Ore {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean = true;
  color: OreColor;
  rotation: number = 0;
  pulsePhase: number;

  constructor(x: number, y: number, color: OreColor) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.color = color;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number, time: number): void {
    this.rotation += (15 * Math.PI / 180) * deltaTime;
    this.pulsePhase = time * 3;
  }

  get brightness(): number {
    return 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(this.pulsePhase));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const color = ORE_COLORS[this.color];
    const alpha = this.brightness;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 30) * Math.PI / 180;
      const r = this.width / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(-4, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Asteroid {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean = true;
  speed: number = 60;
  vertices: { x: number; y: number }[];
  fragments: AsteroidFragment[] = [];
  breaking: boolean = false;
  breakTime: number = 0;

  constructor(x: number, y: number, size: number) {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;

    this.vertices = [];
    const numVertices = 8;
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const r = (size / 2) * (0.75 + Math.random() * 0.5);
      this.vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
  }

  update(deltaTime: number): void {
    if (this.breaking) {
      this.breakTime += deltaTime;
      this.fragments.forEach(f => f.update(deltaTime));
      if (this.breakTime >= 0.1) {
        this.active = false;
      }
      return;
    }
    this.x -= this.speed * deltaTime;
    if (this.x + this.width < 0) {
      this.active = false;
    }
  }

  break(): void {
    this.breaking = true;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 60;
      this.fragments.push(new AsteroidFragment(
        this.x,
        this.y,
        this.width / 3,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      ));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.breaking) {
      this.fragments.forEach(f => f.draw(ctx));
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = '#6B7280';
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    this.vertices.forEach((v, i) => {
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4B5563';
    ctx.beginPath();
    ctx.arc(-this.width * 0.15, -this.height * 0.1, this.width * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.width * 0.15, this.height * 0.15, this.width * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class AsteroidFragment {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  life: number = 0;
  maxLife: number = 0.1;

  constructor(x: number, y: number, size: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
  }

  update(deltaTime: number): void {
    this.life += deltaTime;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#6B7280';
    ctx.beginPath();
    ctx.rect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.fill();
    ctx.restore();
  }
}

export class Bug {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean = true;
  speed: number = 30;
  sinePhase: number;
  baseY: number;
  direction: number;

  constructor(side: 'left' | 'right') {
    this.width = 50;
    this.height = 60;
    this.direction = side === 'left' ? 1 : -1;
    this.x = side === 'left' ? -this.width : CANVAS_WIDTH + this.width;
    this.baseY = 100 + Math.random() * (CANVAS_HEIGHT - 200);
    this.y = this.baseY;
    this.sinePhase = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number, shipX: number, shipY: number, time: number): void {
    const dx = shipX - this.x;
    const dy = shipY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * deltaTime;
      this.y += (dy / dist) * this.speed * deltaTime;
    }

    this.sinePhase += deltaTime * 4;
    this.y += Math.sin(this.sinePhase) * 10 * deltaTime * 10;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const wobble = Math.sin(time * 12) * 2;

    ctx.shadowColor = '#E53935';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#E53935';
    ctx.strokeStyle = '#FF5252';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, wobble, this.width / 2 - 5, this.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -this.height / 3 + wobble, this.width / 3, this.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = 3;
    const antAngle = Math.sin(time * 8) * 0.2;
    ctx.beginPath();
    ctx.moveTo(-8, -this.height / 3 - 5 + wobble);
    ctx.lineTo(-15 + antAngle * 5, -this.height / 2 - 10 + wobble);
    ctx.moveTo(8, -this.height / 3 - 5 + wobble);
    ctx.lineTo(15 - antAngle * 5, -this.height / 2 - 10 + wobble);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-6, -this.height / 3 + wobble, 4, 0, Math.PI * 2);
    ctx.arc(6, -this.height / 3 + wobble, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-6, -this.height / 3 + wobble, 2, 0, Math.PI * 2);
    ctx.arc(6, -this.height / 3 + wobble, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean = true;
  speed: number = 500;
  radius: number = 3;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 6;
    this.height = 6;
  }

  update(deltaTime: number): void {
    this.y -= this.speed * deltaTime;
    if (this.y < -10) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number = 0;
  maxLife: number;
  active: boolean = true;

  constructor(x: number, y: number, color: string, maxLife: number = 0.2) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.maxLife = maxLife;
    this.size = 2 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(deltaTime: number): void {
    this.life += deltaTime;
    if (this.life >= this.maxLife) {
      this.active = false;
      return;
    }
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vx *= 0.95;
    this.vy *= 0.95;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Star {
  x: number;
  y: number;
  size: number;
  alpha: number;

  constructor() {
    this.x = Math.random() * CANVAS_WIDTH;
    this.y = Math.random() * CANVAS_HEIGHT;
    this.size = Math.random() * 2 + 0.5;
    this.alpha = 0.3 + Math.random() * 0.7;
  }

  update(): void {
    if (Math.random() < 0.05) {
      this.alpha = 0.3 + Math.random() * 0.7;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Nebula {
  x: number;
  y: number;
  radius: number;

  constructor() {
    this.x = Math.random() * CANVAS_WIDTH;
    this.y = Math.random() * CANVAS_HEIGHT;
    this.radius = 100 + Math.random() * 150;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
    gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.1)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
