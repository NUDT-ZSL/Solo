import { eventBus, GameEvent } from '../engine/EventBus';
import unitManager from '../units/UnitManager';
import {
  HexCell,
  PlantUnit,
  EnemyUnit,
  Bullet,
  Particle,
  PLANT_CONFIGS,
  ENEMY_CONFIGS,
  HEX_CONFIG,
  PlantType,
  Position,
} from '../types/gameTypes';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;
  private scale: number = 1;
  private mousePos: Position = { x: 0, y: 0 };
  private selectedPlant: PlantType | null = null;
  private hoveredCell: HexCell | null = null;

  constructor() {
    this.setupEventListeners();
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize(): void {
    if (!this.canvas) return;

    const container = this.canvas.parentElement;
    if (container) {
      this.width = container.clientWidth;
      this.height = container.clientHeight;
    }

    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;

    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    if (this.width < 768) {
      this.scale = 0.6;
    } else {
      this.scale = 1;
    }

    unitManager.setCanvasSize(this.width, this.height);
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.RENDER, () => this.render());
    eventBus.on(GameEvent.CANVAS_MOUSE_MOVE, (data) => {
      const pos = data as Position;
      this.mousePos = pos;
      this.hoveredCell = unitManager.getCellAtPosition(pos.x, pos.y);
    });
    eventBus.on(GameEvent.UI_SELECT_PLANT, (data) => {
      this.selectedPlant = data as PlantType | null;
    });
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawHexGrid();
    this.drawPlants();
    this.drawEnemies();
    this.drawBullets();
    this.drawParticles();
    this.drawPlacementIndicator();

    this.ctx.restore();
  }

  private drawBackground(): void {
    if (!this.ctx) return;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d1b0e');
    gradient.addColorStop(1, '#1a2f1c');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawHexGrid(): void {
    if (!this.ctx) return;

    const grid = unitManager.getHexGrid();

    grid.forEach((row) => {
      row.forEach((cell) => {
        this.drawHexagon(cell.x, cell.y, HEX_CONFIG.size * this.scale, cell);
      });
    });
  }

  private drawHexagon(x: number, y: number, size: number, _cell: HexCell): void {
    if (!this.ctx) return;

    this.ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);

      if (i === 0) {
        this.ctx.moveTo(hx, hy);
      } else {
        this.ctx.lineTo(hx, hy);
      }
    }

    this.ctx.closePath();

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, '#4caf50');
    gradient.addColorStop(1, '#2d5a27');

    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawPlants(): void {
    const plants = unitManager.getPlants();
    plants.sort((a, b) => a.y - b.y);

    plants.forEach((plant) => {
      this.drawPlant(plant);
    });
  }

  private drawPlant(plant: PlantUnit): void {
    if (!this.ctx) return;

    const config = PLANT_CONFIGS[plant.type];
    const size = config.size * this.scale * plant.scale;
    const x = plant.x;
    const y = plant.y;

    this.ctx.save();

    if (plant.type === 'sunflower') {
      this.drawSunflower(x, y, size);
    } else if (plant.type === 'peashooter') {
      this.drawPeashooter(x, y, size);
    } else if (plant.type === 'wallnut') {
      this.drawWallnut(x, y, size);
    }

    this.ctx.restore();

    this.drawHealthBar(x, y - size - 8, 40 * this.scale, 4, plant.health / plant.maxHealth);
  }

  private drawSunflower(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    const petalCount = 12;
    const petalLength = size * 0.8;
    const petalWidth = size * 0.3;

    for (let i = 0; i < petalCount; i++) {
      const angle = (Math.PI * 2 * i) / petalCount;
      const petalX = x + Math.cos(angle) * size * 0.4;
      const petalY = y + Math.sin(angle) * size * 0.4;

      this.ctx.save();
      this.ctx.translate(petalX, petalY);
      this.ctx.rotate(angle);

      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, petalLength, petalWidth, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fill();

    this.ctx.fillStyle = '#3E2723';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.15, y - size * 0.1, size * 0.08, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.15, y - size * 0.1, size * 0.08, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x, y + size * 0.1, size * 0.12, 0, Math.PI);
    this.ctx.strokeStyle = '#3E2723';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawPeashooter(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#2E7D32';
    this.ctx.fillRect(x - size * 0.15, y, size * 0.3, size * 0.6);

    this.ctx.beginPath();
    this.ctx.arc(x, y - size * 0.1, size * 0.5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.25, 0, Math.PI * 2);
    this.ctx.fillStyle = '#81C784';
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.1, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.05, y - size * 0.2, size * 0.08, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#388E3C';
    this.ctx.beginPath();
    this.ctx.ellipse(x - size * 0.4, y + size * 0.2, size * 0.25, size * 0.12, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawWallnut(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size * 0.7, size * 0.85, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fill();

    this.ctx.strokeStyle = '#5D4037';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const curveY = y - size * 0.4 + i * size * 0.3;
      this.ctx.beginPath();
      this.ctx.moveTo(x - size * 0.5, curveY);
      this.ctx.quadraticCurveTo(x, curveY + size * 0.1, x + size * 0.5, curveY);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.2, y - size * 0.15, size * 0.12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.2, y - size * 0.15, size * 0.12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.2, y - size * 0.15, size * 0.06, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.2, y - size * 0.15, size * 0.06, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawEnemies(): void {
    const enemies = unitManager.getEnemies();
    enemies.sort((a, b) => a.y - b.y);

    enemies.forEach((enemy) => {
      this.drawEnemy(enemy);
    });
  }

  private drawEnemy(enemy: EnemyUnit): void {
    if (!this.ctx) return;

    const config = ENEMY_CONFIGS[enemy.type];
    const size = config.size * this.scale;
    const x = enemy.x;
    const y = enemy.y;

    if (enemy.type === 'bee') {
      this.drawBee(x, y, size);
    } else if (enemy.type === 'beetle') {
      this.drawBeetle(x, y, size);
    } else if (enemy.type === 'butterfly') {
      this.drawButterfly(x, y, size);
    }

    this.drawHealthBar(x, y - size - 6, 30 * this.scale, 3, enemy.health / enemy.maxHealth);
  }

  private drawBee(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size, size * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFEB3B';
    this.ctx.fill();

    this.ctx.fillStyle = '#212121';
    this.ctx.fillRect(x - size * 0.6, y - size * 0.15, size * 0.2, size * 0.3);
    this.ctx.fillRect(x + size * 0.2, y - size * 0.15, size * 0.2, size * 0.3);

    this.ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.ellipse(x - size * 0.3, y - size * 0.6, size * 0.5, size * 0.3, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(x + size * 0.3, y - size * 0.6, size * 0.5, size * 0.3, 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.25, y - size * 0.1, size * 0.12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.25, y - size * 0.1, size * 0.12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#212121';
    this.ctx.beginPath();
    this.ctx.moveTo(x - size * 0.8, y);
    this.ctx.lineTo(x - size, y - size * 0.2);
    this.ctx.lineTo(x - size, y + size * 0.2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawBeetle(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size * 0.9, size * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = '#5D4037';
    this.ctx.fill();

    this.ctx.strokeStyle = '#3E2723';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size * 0.7);
    this.ctx.lineTo(x, y + size * 0.7);
    this.ctx.stroke();

    this.ctx.fillStyle = '#3E2723';
    this.ctx.beginPath();
    this.ctx.arc(x, y + size * 0.6, size * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#3E2723';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - size * 0.2, y + size * 0.8);
    this.ctx.lineTo(x - size * 0.4, y + size * 1.1);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(x + size * 0.2, y + size * 0.8);
    this.ctx.lineTo(x + size * 0.4, y + size * 1.1);
    this.ctx.stroke();

    this.ctx.fillStyle = '#F44336';
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.25, y + size * 0.55, size * 0.08, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.25, y + size * 0.55, size * 0.08, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawButterfly(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    const time = performance.now() / 100;
    const wingFlap = Math.sin(time) * 0.3;

    this.ctx.save();
    this.ctx.translate(x - size * 0.3, y);
    this.ctx.rotate(-0.5 + wingFlap);
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = '#E91E63';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(-size * 0.2, -size * 0.1, size * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(x + size * 0.3, y);
    this.ctx.rotate(0.5 - wingFlap);
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = '#E91E63';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(size * 0.2, -size * 0.1, size * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = '#212121';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size * 0.15, size * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#212121';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x - size * 0.1, y - size * 0.4);
    this.ctx.quadraticCurveTo(x - size * 0.25, y - size * 0.7, x - size * 0.3, y - size * 0.6);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(x + size * 0.1, y - size * 0.4);
    this.ctx.quadraticCurveTo(x + size * 0.25, y - size * 0.7, x + size * 0.3, y - size * 0.6);
    this.ctx.stroke();
  }

  private drawHealthBar(x: number, y: number, width: number, height: number, healthPercent: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x - width / 2, y, width, height);

    const healthColor = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x - width / 2, y, width * Math.max(0, healthPercent), height);

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width / 2, y, width, height);
  }

  private drawBullets(): void {
    const bullets = unitManager.getBullets();

    bullets.forEach((bullet) => {
      this.drawBullet(bullet);
    });
  }

  private drawBullet(bullet: Bullet): void {
    if (!this.ctx) return;

    bullet.trail.forEach((trail) => {
      this.ctx!.beginPath();
      this.ctx!.arc(trail.x, trail.y, trail.radius * this.scale, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(255, 255, 255, ${trail.alpha * 0.6})`;
      this.ctx!.fill();
    });

    this.ctx.beginPath();
    this.ctx.arc(bullet.x, bullet.y, 6 * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = bullet.color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(bullet.x - 1, bullet.y - 1, 3 * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fill();
  }

  private drawParticles(): void {
    const particles = unitManager.getParticles();

    particles.forEach((particle) => {
      this.drawParticle(particle);
    });
  }

  private drawParticle(particle: Particle): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = particle.color;
    this.ctx.globalAlpha = particle.alpha;
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  private drawPlacementIndicator(): void {
    if (!this.ctx || !this.selectedPlant) return;

    const x = this.mousePos.x;
    const y = this.mousePos.y;
    const indicatorRadius = 25 * this.scale;

    let canPlace = false;
    let cellX = x;
    let cellY = y;

    if (this.hoveredCell && !this.hoveredCell.occupied) {
      canPlace = true;
      cellX = this.hoveredCell.x;
      cellY = this.hoveredCell.y;
    }

    this.ctx.beginPath();
    this.ctx.arc(cellX, cellY, indicatorRadius, 0, Math.PI * 2);

    if (canPlace) {
      this.ctx.strokeStyle = '#4caf50';
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
    } else {
      this.ctx.strokeStyle = '#ef5350';
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = 'rgba(239, 83, 80, 0.2)';
    }

    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

export const canvasRenderer = new CanvasRenderer();
export default canvasRenderer;
