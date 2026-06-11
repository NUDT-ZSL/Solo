export type ObstacleType = 'box' | 'rail' | 'pit' | 'flying';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  color: string;
  glowColor: string;
  passed: boolean;
}

export interface ObstacleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private groundY: number;
  private spawnTimer: number = 0;
  private spawnInterval: number = 1800;
  private minSpawnInterval: number = 700;
  private difficultyScore: number = 0;

  constructor(canvasWidth: number, canvasHeight: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = groundY;
  }

  resize(canvasWidth: number, canvasHeight: number, groundY: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = groundY;
  }

  reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1800;
    this.difficultyScore = 0;
  }

  update(
    scrollSpeed: number,
    deltaTime: number,
    score: number,
    playerBounds: ObstacleBounds
  ): boolean {
    this.difficultyScore = score;
    this.spawnInterval = Math.max(
      this.minSpawnInterval,
      1800 - Math.min(score * 0.3, 1100)
    );

    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    const moveAmount = scrollSpeed * deltaTime * 0.001;
    for (const obs of this.obstacles) {
      obs.x -= moveAmount;
    }

    this.obstacles = this.obstacles.filter((obs) => obs.x + obs.width > -50);

    return this.checkCollision(playerBounds);
  }

  private spawnObstacle(): void {
    const types: ObstacleType[] = ['box', 'rail'];
    if (this.difficultyScore > 300) types.push('pit');
    if (this.difficultyScore > 600) types.push('flying');
    if (this.difficultyScore > 1000) {
      types.push('flying', 'pit');
    }

    const type = types[Math.floor(Math.random() * types.length)];
    let obstacle: Obstacle;

    switch (type) {
      case 'box':
        obstacle = this.createBox();
        break;
      case 'rail':
        obstacle = this.createRail();
        break;
      case 'pit':
        obstacle = this.createPit();
        break;
      case 'flying':
        obstacle = this.createFlying();
        break;
      default:
        obstacle = this.createBox();
    }

    this.obstacles.push(obstacle);
  }

  private createBox(): Obstacle {
    const size = 36 + Math.random() * 20;
    return {
      x: this.canvasWidth + 50,
      y: this.groundY - size,
      width: size,
      height: size,
      type: 'box',
      color: '#ff00ff',
      glowColor: '#ff00ff',
      passed: false,
    };
  }

  private createRail(): Obstacle {
    const width = 60 + Math.random() * 40;
    const height = 20;
    return {
      x: this.canvasWidth + 50,
      y: this.groundY - height,
      width,
      height,
      type: 'rail',
      color: '#00fff7',
      glowColor: '#00fff7',
      passed: false,
    };
  }

  private createPit(): Obstacle {
    const width = 80 + Math.random() * 60;
    return {
      x: this.canvasWidth + 50,
      y: this.groundY,
      width,
      height: this.canvasHeight - this.groundY,
      type: 'pit',
      color: '#000000',
      glowColor: '#ff0040',
      passed: false,
    };
  }

  private createFlying(): Obstacle {
    const width = 40;
    const height = 24;
    const flyHeight = 60 + Math.random() * 50;
    return {
      x: this.canvasWidth + 50,
      y: this.groundY - flyHeight - height,
      width,
      height,
      type: 'flying',
      color: '#ffaa00',
      glowColor: '#ffff00',
      passed: false,
    };
  }

  checkCollision(player: ObstacleBounds): boolean {
    for (const obs of this.obstacles) {
      if (obs.type === 'pit') {
        if (
          player.x + player.width > obs.x + 10 &&
          player.x < obs.x + obs.width - 10 &&
          player.y + player.height >= this.groundY - 2
        ) {
          return true;
        }
      } else {
        if (
          player.x < obs.x + obs.width - 6 &&
          player.x + player.width > obs.x + 6 &&
          player.y < obs.y + obs.height - 6 &&
          player.y + player.height > obs.y + 6
        ) {
          return true;
        }
      }
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const obs of this.obstacles) {
      ctx.save();

      switch (obs.type) {
        case 'box':
          this.renderBox(ctx, obs);
          break;
        case 'rail':
          this.renderRail(ctx, obs);
          break;
        case 'pit':
          this.renderPit(ctx, obs);
          break;
        case 'flying':
          this.renderFlying(ctx, obs);
          break;
      }

      ctx.restore();
    }
  }

  private renderBox(ctx: CanvasRenderingContext2D, obs: Obstacle): void {
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    ctx.strokeStyle = obs.color;
    ctx.shadowColor = obs.glowColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

    ctx.strokeStyle = obs.color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
    ctx.moveTo(obs.x + obs.width, obs.y);
    ctx.lineTo(obs.x, obs.y + obs.height);
    ctx.stroke();
  }

  private renderRail(ctx: CanvasRenderingContext2D, obs: Obstacle): void {
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    ctx.strokeStyle = obs.color;
    ctx.shadowColor = obs.glowColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

    const barCount = Math.floor(obs.width / 15);
    for (let i = 1; i < barCount; i++) {
      const bx = obs.x + i * 15;
      ctx.fillStyle = obs.color;
      ctx.shadowBlur = 5;
      ctx.fillRect(bx - 1, obs.y + 2, 2, obs.height - 4);
    }
  }

  private renderPit(ctx: CanvasRenderingContext2D, obs: Obstacle): void {
    const pitGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + 100);
    pitGrad.addColorStop(0, '#000000');
    pitGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = pitGrad;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    ctx.strokeStyle = obs.glowColor;
    ctx.shadowColor = obs.glowColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(obs.x - 5, obs.y);
    ctx.lineTo(obs.x, obs.y + 10);
    ctx.lineTo(obs.x + 10, obs.y);
    ctx.lineTo(obs.x + 20, obs.y + 10);
    ctx.lineTo(obs.x + 30, obs.y);
    ctx.lineTo(obs.x + obs.width - 30, obs.y);
    ctx.lineTo(obs.x + obs.width - 20, obs.y + 10);
    ctx.lineTo(obs.x + obs.width - 10, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y + 10);
    ctx.lineTo(obs.x + obs.width + 5, obs.y);
    ctx.stroke();

    ctx.fillStyle = obs.glowColor + '30';
    ctx.fillRect(obs.x, obs.y, obs.width, 5);
  }

  private renderFlying(ctx: CanvasRenderingContext2D, obs: Obstacle): void {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const time = Date.now() * 0.005;

    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8);

    ctx.strokeStyle = obs.color;
    ctx.shadowColor = obs.glowColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.strokeRect(obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8);

    const wingFlap = Math.sin(time) * 8;
    ctx.fillStyle = obs.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(obs.x + 4, cy);
    ctx.lineTo(obs.x - 14, cy - 10 + wingFlap);
    ctx.lineTo(obs.x - 14, cy + 10 - wingFlap);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(obs.x + obs.width - 4, cy);
    ctx.lineTo(obs.x + obs.width + 14, cy - 10 + wingFlap);
    ctx.lineTo(obs.x + obs.width + 14, cy + 10 - wingFlap);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - 4, cy - 3, 3, 3);
    ctx.fillRect(cx + 1, cy - 3, 3, 3);
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }
}
