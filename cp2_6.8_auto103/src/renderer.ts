import { Car, Obstacle, Coin, Particle } from './entities';

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

const COLORS = {
  background: '#1A202C',
  road: '#2D3748',
  shoulderRed: '#E53E3E',
  shoulderWhite: '#FFFFFF',
  obstacle: '#E53E3E',
  coin: '#FFD700',
  carBody: '#3182CE',
  carDark: '#2B6CB0',
  carLight: '#63B3ED',
  carWindow: '#E2E8F0',
  carTire: '#1A202C',
  headlight: '#F7FAFC',
  tailLight: '#E53E3E',
  gameOver: '#ECC94B',
  gameOverBg: '#E53E3E'
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private roadOffset: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  public clear(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  public drawRoad(speed: number): void {
    this.roadOffset = (this.roadOffset + speed) % 20;

    const roadX = 50;
    const roadWidth = 300;

    this.ctx.fillStyle = COLORS.road;
    this.ctx.fillRect(roadX, 0, roadWidth, CANVAS_HEIGHT);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(roadX, 0, 8, CANVAS_HEIGHT);
    this.ctx.fillRect(roadX + roadWidth - 8, 0, 8, CANVAS_HEIGHT);

    this.drawShoulders(roadX, roadWidth);
    this.drawLaneLines(roadX, roadWidth);
  }

  private drawShoulders(roadX: number, roadWidth: number): void {
    const stripeSize = 10;

    for (let y = -stripeSize + this.roadOffset; y < CANVAS_HEIGHT; y += stripeSize * 2) {
      this.ctx.fillStyle = COLORS.shoulderRed;
      this.ctx.fillRect(roadX - stripeSize, y, stripeSize, stripeSize);
      this.ctx.fillRect(roadX + roadWidth, y, stripeSize, stripeSize);

      this.ctx.fillStyle = COLORS.shoulderWhite;
      this.ctx.fillRect(roadX - stripeSize, y + stripeSize, stripeSize, stripeSize);
      this.ctx.fillRect(roadX + roadWidth, y + stripeSize, stripeSize, stripeSize);
    }
  }

  private drawLaneLines(roadX: number, roadWidth: number): void {
    const centerX = roadX + roadWidth / 2;
    const lineWidth = 4;
    const lineHeight = 20;
    const gap = 20;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let y = -lineHeight + (this.roadOffset * 2) % (lineHeight + gap); y < CANVAS_HEIGHT; y += lineHeight + gap) {
      this.ctx.fillRect(centerX - lineWidth / 2, y, lineWidth, lineHeight);
    }

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    const lane1X = roadX + roadWidth / 4;
    const lane2X = roadX + (roadWidth * 3) / 4;
    for (let y = -lineHeight + (this.roadOffset * 2) % (lineHeight + gap); y < CANVAS_HEIGHT; y += lineHeight + gap) {
      this.ctx.fillRect(lane1X - 2, y, 2, lineHeight);
      this.ctx.fillRect(lane2X - 2, y, 2, lineHeight);
    }
  }

  public drawCar(car: Car): void {
    const x = Math.floor(car.x);
    const y = Math.floor(car.y);
    const w = car.width;
    const h = car.height;

    this.ctx.fillStyle = COLORS.carTire;
    this.ctx.fillRect(x - 2, y + 4, 4, 10);
    this.ctx.fillRect(x + w - 2, y + 4, 4, 10);
    this.ctx.fillRect(x - 2, y + h - 14, 4, 10);
    this.ctx.fillRect(x + w - 2, y + h - 14, 4, 10);

    this.ctx.fillStyle = COLORS.carBody;
    this.ctx.fillRect(x, y + 2, w, h - 4);

    this.ctx.fillStyle = COLORS.carDark;
    this.ctx.fillRect(x, y + 2, 3, h - 4);
    this.ctx.fillRect(x + w - 3, y + 2, 3, h - 4);

    this.ctx.fillStyle = COLORS.carLight;
    this.ctx.fillRect(x + 3, y + 2, 2, h - 4);

    this.ctx.fillStyle = COLORS.carWindow;
    this.ctx.fillRect(x + 6, y + 6, w - 12, 10);
    this.ctx.fillStyle = '#A0AEC0';
    this.ctx.fillRect(x + 6, y + 6, w - 12, 2);

    this.ctx.fillStyle = COLORS.carWindow;
    this.ctx.fillRect(x + 6, y + 22, w - 12, 12);
    this.ctx.fillStyle = '#A0AEC0';
    this.ctx.fillRect(x + 6, y + 22, w - 12, 2);

    this.ctx.fillStyle = COLORS.carBody;
    this.ctx.fillRect(x + 4, y, w - 8, 4);
    this.ctx.fillRect(x + 4, y + h - 6, w - 8, 6);

    this.ctx.fillStyle = COLORS.headlight;
    this.ctx.fillRect(x + 4, y, 6, 3);
    this.ctx.fillRect(x + w - 10, y, 6, 3);

    this.ctx.fillStyle = COLORS.tailLight;
    this.ctx.fillRect(x + 4, y + h - 4, 6, 3);
    this.ctx.fillRect(x + w - 10, y + h - 4, 6, 3);

    this.ctx.fillStyle = COLORS.carDark;
    this.ctx.fillRect(x + w / 2 - 1, y + 8, 2, h - 16);
  }

  public drawObstacle(obstacle: Obstacle): void {
    const x = Math.floor(obstacle.x);
    const y = Math.floor(obstacle.y);

    this.ctx.fillStyle = COLORS.obstacle;
    this.ctx.fillRect(x, y, obstacle.width, obstacle.height);

    this.ctx.fillStyle = '#C53030';
    this.ctx.fillRect(x, y, obstacle.width, 4);
    this.ctx.fillRect(x, y + obstacle.height - 4, obstacle.width, 4);

    this.ctx.fillStyle = '#FC8181';
    this.ctx.fillRect(x + 2, y + 2, obstacle.width - 4, 2);

    this.ctx.fillStyle = '#FEB2B2';
    this.ctx.fillRect(x + 4, y + 8, 6, 4);
    this.ctx.fillRect(x + obstacle.width - 10, y + 8, 6, 4);

    this.ctx.fillStyle = '#742A2A';
    this.ctx.fillRect(x, y, 2, obstacle.height);
    this.ctx.fillRect(x + obstacle.width - 2, y, 2, obstacle.height);
  }

  public drawCoin(coin: Coin): void {
    if (!coin.active) return;

    const x = Math.floor(coin.x);
    const y = Math.floor(coin.y);
    const r = coin.radius;

    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = COLORS.coin;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#B7791F';
    this.ctx.beginPath();
    this.ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#FEEBC8';
    this.ctx.fillRect(x - 4, y - 2, 2, 4);
    this.ctx.fillRect(x - 2, y - 4, 4, 2);
  }

  public drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      const size = Math.max(1, Math.floor(p.size * alpha));
      this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), size, size);
    }
    this.ctx.globalAlpha = 1;
  }

  public drawGameOverFlash(alpha: number): void {
    this.ctx.fillStyle = `rgba(229, 62, 62, ${alpha})`;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  public drawGameOver(score: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.fillStyle = COLORS.gameOver;
    this.ctx.font = 'bold 40px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = '#000000';
    this.ctx.fillText('GAME OVER', CANVAS_WIDTH / 2 + 3, CANVAS_HEIGHT / 2 - 30 + 3);
    this.ctx.fillStyle = COLORS.gameOver;
    this.ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 20px "Courier New", monospace';
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(`SCORE: ${score}`, CANVAS_WIDTH / 2 + 2, CANVAS_HEIGHT / 2 + 20 + 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`SCORE: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

    this.ctx.fillStyle = '#718096';
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.fillText('PRESS SPACE TO RESTART', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
  }
}
