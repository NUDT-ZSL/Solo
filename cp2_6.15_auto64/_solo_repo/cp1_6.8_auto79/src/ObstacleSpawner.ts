export type ObstacleType = 'mountain' | 'cloud' | 'bird';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  speed: number;
  vy: number;
  phase: number;
  passed: boolean;
}

const BASE_SPEED = 200;
const SPEED_INCREMENT = 8;
const BASE_SPAWN_INTERVAL = 1.2;
const MIN_SPAWN_INTERVAL = 0.35;

export class ObstacleSpawner {
  obstacles: Obstacle[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private spawnTimer: number = 0;
  private difficulty: number = 0;
  private score: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.difficulty = 0;
    this.score = 0;
  }

  resize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  update(dt: number, score: number): void {
    this.score = score;
    this.difficulty = Math.floor(score / 100);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      const interval = Math.max(
        MIN_SPAWN_INTERVAL,
        BASE_SPAWN_INTERVAL - this.difficulty * 0.05
      );
      this.spawnTimer = interval + Math.random() * interval * 0.5;
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= o.speed * dt;
      o.phase += dt * 2;
      o.y += Math.sin(o.phase) * o.vy * dt;

      if (o.x + o.width < -50) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private spawn(): void {
    const speedMult = 1 + this.difficulty * 0.1;
    const types: ObstacleType[] = ['mountain', 'cloud', 'bird'];
    const weights = [0.35, 0.35, 0.3 + this.difficulty * 0.02];
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let type: ObstacleType = 'cloud';
    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        type = types[i];
        break;
      }
    }

    const baseSpeed = (BASE_SPEED + this.difficulty * SPEED_INCREMENT) * speedMult;

    switch (type) {
      case 'mountain':
        this.obstacles.push({
          x: this.canvasWidth + 50,
          y: this.canvasHeight - 80 - Math.random() * 120,
          width: 80 + Math.random() * 60,
          height: 100 + Math.random() * 80,
          type: 'mountain',
          speed: baseSpeed * 0.7,
          vy: 0,
          phase: Math.random() * Math.PI * 2,
          passed: false,
        });
        break;
      case 'cloud':
        this.obstacles.push({
          x: this.canvasWidth + 50,
          y: 60 + Math.random() * (this.canvasHeight - 200),
          width: 90 + Math.random() * 50,
          height: 40 + Math.random() * 25,
          type: 'cloud',
          speed: baseSpeed * 0.9,
          vy: 8,
          phase: Math.random() * Math.PI * 2,
          passed: false,
        });
        break;
      case 'bird':
        this.obstacles.push({
          x: this.canvasWidth + 50,
          y: 80 + Math.random() * (this.canvasHeight - 200),
          width: 40,
          height: 30,
          type: 'bird',
          speed: baseSpeed * 1.2,
          vy: 15,
          phase: Math.random() * Math.PI * 2,
          passed: false,
        });
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const o of this.obstacles) {
      ctx.save();
      switch (o.type) {
        case 'mountain':
          this.drawMountain(ctx, o);
          break;
        case 'cloud':
          this.drawCloud(ctx, o);
          break;
        case 'bird':
          this.drawBird(ctx, o);
          break;
      }
      ctx.restore();
    }
  }

  private drawMountain(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + o.height);
    ctx.lineTo(o.x + o.width * 0.5, o.y);
    ctx.lineTo(o.x + o.width, o.y + o.height);
    ctx.closePath();

    const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.height);
    grad.addColorStop(0, '#3d5c3a');
    grad.addColorStop(0.6, '#2c3e2a');
    grad.addColorStop(1, '#1a2818');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(o.x + o.width * 0.35, o.y + o.height * 0.3);
    ctx.lineTo(o.x + o.width * 0.5, o.y);
    ctx.lineTo(o.x + o.width * 0.65, o.y + o.height * 0.25);
    ctx.fillStyle = '#d4c9a8';
    ctx.fill();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    ctx.globalAlpha = 0.7;
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, o.width / 2, o.height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e8e0d0';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx - o.width * 0.2, cy - o.height * 0.15, o.width * 0.25, o.height * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ece5d5';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + o.width * 0.15, cy - o.height * 0.1, o.width * 0.2, o.height * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e5ddc8';
    ctx.fill();
  }

  private drawBird(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    const wingPhase = Math.sin(o.phase * 3) * 0.4;

    ctx.beginPath();
    ctx.moveTo(cx + o.width * 0.5, cy);
    ctx.quadraticCurveTo(cx + o.width * 0.2, cy - o.height * 0.5 * (1 + wingPhase), cx, cy);
    ctx.quadraticCurveTo(cx - o.width * 0.2, cy - o.height * 0.3 * (1 + wingPhase), cx - o.width * 0.5, cy);
    ctx.quadraticCurveTo(cx - o.width * 0.2, cy + o.height * 0.2, cx, cy + o.height * 0.1);
    ctx.quadraticCurveTo(cx + o.width * 0.2, cy + o.height * 0.15, cx + o.width * 0.5, cy);
    ctx.closePath();

    ctx.fillStyle = '#2c2c2c';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  getHitboxes(): Array<{ x: number; y: number; w: number; h: number; type: ObstacleType }> {
    return this.obstacles.map((o) => {
      if (o.type === 'mountain') {
        return {
          x: o.x + o.width * 0.2,
          y: o.y + o.height * 0.15,
          w: o.width * 0.6,
          h: o.height * 0.85,
          type: o.type,
        };
      }
      if (o.type === 'cloud') {
        return {
          x: o.x + o.width * 0.1,
          y: o.y + o.height * 0.1,
          w: o.width * 0.8,
          h: o.height * 0.8,
          type: o.type,
        };
      }
      return {
        x: o.x + o.width * 0.15,
        y: o.y + o.height * 0.15,
        w: o.width * 0.7,
        h: o.height * 0.7,
        type: o.type,
      };
    });
  }
}
