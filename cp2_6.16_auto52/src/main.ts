import { Environment } from './environment';
import { Plant, Leaf } from './plant';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const CONTROL_BAR_HEIGHT = 50;
const TOTAL_HEIGHT = CANVAS_HEIGHT + CONTROL_BAR_HEIGHT;

class App {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private environment: Environment;
  private lastTime: number = 0;
  private animationId: number = 0;
  private plantCountDisplay: HTMLDivElement;
  private resetButton: HTMLButtonElement;

  constructor() {
    this.container = document.getElementById('app') as HTMLDivElement;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = TOTAL_HEIGHT;
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    this.canvas.style.cursor = 'pointer';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.environment = new Environment(CANVAS_WIDTH, CANVAS_HEIGHT);

    const controlBar = this.createControlBar();
    this.plantCountDisplay = controlBar.querySelector('#plantCount') as HTMLDivElement;
    this.resetButton = controlBar.querySelector('#resetBtn') as HTMLButtonElement;

    this.bindEvents();

    this.container.appendChild(controlBar);
    this.container.appendChild(this.canvas);
  }

  private createControlBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.style.cssText = `
      width: ${CANVAS_WIDTH}px;
      height: ${CONTROL_BAR_HEIGHT}px;
      background: #37474f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-radius: 8px 8px 0 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;

    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    resetBtn.textContent = '重置';
    resetBtn.style.cssText = `
      width: 80px;
      height: 36px;
      border-radius: 8px;
      background: #ff5722;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    `;
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = '#f4511e';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = '#ff5722';
    });

    const countDisplay = document.createElement('div');
    countDisplay.id = 'plantCount';
    countDisplay.style.cssText = `
      color: white;
      font-size: 14px;
      font-weight: 500;
    `;
    countDisplay.textContent = '植物数量: 0';

    bar.appendChild(resetBtn);
    bar.appendChild(countDisplay);

    return bar;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.getCanvasCoords(e);
      if (y >= CONTROL_BAR_HEIGHT) {
        const canvasY = y - CONTROL_BAR_HEIGHT;
        this.environment.handleMouseDown(x, canvasY);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getCanvasCoords(e);
      if (y >= CONTROL_BAR_HEIGHT) {
        const canvasY = y - CONTROL_BAR_HEIGHT;
        this.environment.handleMouseMove(x, canvasY);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.environment.handleMouseUp();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.environment.handleMouseUp();
    });

    this.canvas.addEventListener('click', (e) => {
      const { x, y } = this.getCanvasCoords(e);
      if (y >= CONTROL_BAR_HEIGHT) {
        const canvasY = y - CONTROL_BAR_HEIGHT;
        this.environment.handleCanvasClick(x, canvasY);
      }
    });

    this.resetButton.addEventListener('click', () => {
      this.environment.reset();
      this.updatePlantCount();
    });
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const now = performance.now();
    const deltaTime = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.environment.update(deltaTime);
    this.render();
    this.updatePlantCount();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private updatePlantCount(): void {
    this.plantCountDisplay.textContent = `植物数量: ${this.environment.getPlantCount()}`;
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(0, CONTROL_BAR_HEIGHT);

    this.drawBackground();
    this.drawSoil();
    this.drawLightBeams();
    this.drawPlants();
    this.drawParticles();
    this.drawSelectionCircles();

    this.ctx.restore();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.environment.soilY);
    gradient.addColorStop(0, '#e0f7fa');
    gradient.addColorStop(1, '#c8e6c9');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, this.environment.soilY);
  }

  private drawSoil(): void {
    const soilTop = this.environment.soilY;
    const soilHeight = CANVAS_HEIGHT - soilTop;

    this.ctx.fillStyle = '#8d6e63';
    this.ctx.fillRect(0, soilTop, CANVAS_WIDTH, soilHeight);

    this.ctx.strokeStyle = 'rgba(161, 136, 127, 0.3)';
    this.ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, soilTop);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }

    for (let y = soilTop; y <= CANVAS_HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }

    const topGradient = this.ctx.createLinearGradient(0, soilTop - 10, 0, soilTop + 10);
    topGradient.addColorStop(0, 'rgba(141, 110, 99, 0)');
    topGradient.addColorStop(1, 'rgba(141, 110, 99, 1)');
    this.ctx.fillStyle = topGradient;
    this.ctx.fillRect(0, soilTop - 10, CANVAS_WIDTH, 20);
  }

  private drawLightBeams(): void {
    for (const beam of this.environment.lightBeams) {
      this.ctx.strokeStyle = `rgba(255, 235, 59, ${beam.opacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(beam.x, beam.y);
      this.ctx.lineTo(beam.x, beam.height);
      this.ctx.stroke();

      const glowGradient = this.ctx.createLinearGradient(beam.x - 3, 0, beam.x + 3, 0);
      glowGradient.addColorStop(0, 'rgba(255, 235, 59, 0)');
      glowGradient.addColorStop(0.5, `rgba(255, 235, 59, ${beam.opacity * 0.5})`);
      glowGradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
      this.ctx.fillStyle = glowGradient;
      this.ctx.fillRect(beam.x - 3, 0, 6, beam.height);
    }
  }

  private drawPlants(): void {
    const lowDetail = this.environment.shouldUseLowDetailLeaves();

    for (const plant of this.environment.plants) {
      this.drawBranches(plant);
      this.drawLeaves(plant, lowDetail);
    }
  }

  private drawBranches(plant: Plant): void {
    this.ctx.strokeStyle = '#5d4037';
    this.ctx.lineCap = 'round';

    for (const branch of plant.branches) {
      const end = plant.getBranchEnd(branch);

      this.ctx.lineWidth = branch.thickness;
      this.ctx.beginPath();
      this.ctx.moveTo(branch.x, branch.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();

      if (branch.parentIndex >= 0 && branch.growthProgress < 0.3) {
        const parent = plant.branches[branch.parentIndex];
        const parentEnd = plant.getBranchEnd(parent);
        this.ctx.fillStyle = 'rgba(139, 195, 74, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(parentEnd.x, parentEnd.y, branch.thickness * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.fillStyle = '#5d4037';
    this.ctx.beginPath();
    this.ctx.arc(plant.seedX, plant.seedY, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawLeaves(plant: Plant, lowDetail: boolean): void {
    const leafColor = plant.getLeafColor();
    const hasSufficientLight = plant.hasSufficientLight();

    for (const leaf of plant.leaves) {
      this.drawLeaf(leaf, leafColor, lowDetail, hasSufficientLight);
    }
  }

  private drawLeaf(leaf: Leaf, color: string, lowDetail: boolean, glow: boolean): void {
    this.ctx.save();
    this.ctx.translate(leaf.x, leaf.y);
    this.ctx.rotate(leaf.angle);

    if (glow) {
      this.ctx.shadowColor = '#8bc34a';
      this.ctx.shadowBlur = 6;
    }

    this.ctx.fillStyle = color;

    if (lowDetail) {
      this.ctx.beginPath();
      this.ctx.moveTo(leaf.size, 0);
      this.ctx.lineTo(-leaf.size * 0.5, -leaf.size * 0.4);
      this.ctx.lineTo(-leaf.size * 0.5, leaf.size * 0.4);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = 'rgba(46, 125, 50, 0.3)';
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(leaf.size * 0.7, 0);
      this.ctx.lineTo(-leaf.size * 0.3, 0);
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(leaf.size, 0);
      this.ctx.lineTo(leaf.size * 0.3, -leaf.size * 0.3);
      this.ctx.quadraticCurveTo(0, -leaf.size * 0.8, -leaf.size * 0.5, -leaf.size * 0.6);
      this.ctx.lineTo(-leaf.size * 0.3, 0);
      this.ctx.lineTo(-leaf.size * 0.5, leaf.size * 0.6);
      this.ctx.quadraticCurveTo(0, leaf.size * 0.8, leaf.size * 0.3, leaf.size * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = 'rgba(46, 125, 50, 0.3)';
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(leaf.size * 0.8, 0);
      this.ctx.lineTo(-leaf.size * 0.3, 0);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawParticles(): void {
    for (const p of this.environment.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.fillStyle = `rgba(139, 195, 74, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawSelectionCircles(): void {
    for (const plant of this.environment.plants) {
      if (plant.isSelected) {
        this.ctx.strokeStyle = '#64b5f6';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(plant.seedX, plant.seedY, 40, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(100, 181, 246, 0.15)';
        this.ctx.beginPath();
        this.ctx.arc(plant.seedX, plant.seedY, 40, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
}

const app = new App();
app.start();
