import { Environment } from './environment';
import { Genome } from './blob';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private environment: Environment;
  private fitnessChartCanvas: HTMLCanvasElement;
  private fitnessChartCtx: CanvasRenderingContext2D;
  
  private paused: boolean = false;
  private speedMultiplier: number = 1;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  private generationEl: HTMLElement;
  private timeLeftEl: HTMLElement;
  private aliveCountEl: HTMLElement;
  private avgFitnessEl: HTMLElement;
  private bestFitnessEl: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private speedBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;

  private springLenSlider: HTMLInputElement;
  private particleDistSlider: HTMLInputElement;
  private moveSpeedSlider: HTMLInputElement;
  private sensitivitySlider: HTMLInputElement;

  private springLenVal: HTMLElement;
  private particleDistVal: HTMLElement;
  private moveSpeedVal: HTMLElement;
  private sensitivityVal: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.fitnessChartCanvas = document.getElementById('fitnessChart') as HTMLCanvasElement;
    this.fitnessChartCtx = this.fitnessChartCanvas.getContext('2d')!;

    this.generationEl = document.getElementById('generation')!;
    this.timeLeftEl = document.getElementById('time-left')!;
    this.aliveCountEl = document.getElementById('alive-count')!;
    this.avgFitnessEl = document.getElementById('avg-fitness')!;
    this.bestFitnessEl = document.getElementById('best-fitness')!;
    this.pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    this.speedBtn = document.getElementById('speedBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    this.springLenSlider = document.getElementById('springLen') as HTMLInputElement;
    this.particleDistSlider = document.getElementById('particleDist') as HTMLInputElement;
    this.moveSpeedSlider = document.getElementById('moveSpeed') as HTMLInputElement;
    this.sensitivitySlider = document.getElementById('sensitivity') as HTMLInputElement;

    this.springLenVal = document.getElementById('springLenVal')!;
    this.particleDistVal = document.getElementById('particleDistVal')!;
    this.moveSpeedVal = document.getElementById('moveSpeedVal')!;
    this.sensitivityVal = document.getElementById('sensitivityVal')!;

    this.setupCanvas();
    const rect = this.canvas.getBoundingClientRect();
    this.environment = new Environment({
      w: rect.width,
      h: rect.height
    });

    this.bindEvents();
    this.start();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      const rect = this.canvas.getBoundingClientRect();
      this.environment.resize(rect.width, rect.height);
    });

    this.pauseBtn.addEventListener('click', () => {
      this.paused = !this.paused;
      this.pauseBtn.textContent = this.paused ? '▶ 继续' : '⏸ 暂停';
    });

    this.speedBtn.addEventListener('click', () => {
      const speeds = [1, 2, 3, 4];
      const currentIndex = speeds.indexOf(this.speedMultiplier);
      this.speedMultiplier = speeds[(currentIndex + 1) % speeds.length];
      this.speedBtn.textContent = `⏩ ${this.speedMultiplier}x`;
    });

    this.resetBtn.addEventListener('click', () => {
      this.environment.reset();
      this.clearFitnessChart();
    });

    this.springLenSlider.addEventListener('input', () => {
      const val = parseFloat(this.springLenSlider.value);
      this.springLenVal.textContent = val.toFixed(1);
      this.updateGenomeParams();
    });

    this.particleDistSlider.addEventListener('input', () => {
      const val = parseFloat(this.particleDistSlider.value);
      this.particleDistVal.textContent = val.toFixed(2);
      this.updateGenomeParams();
    });

    this.moveSpeedSlider.addEventListener('input', () => {
      const val = parseFloat(this.moveSpeedSlider.value);
      this.moveSpeedVal.textContent = val.toFixed(1);
      this.updateGenomeParams();
    });

    this.sensitivitySlider.addEventListener('input', () => {
      const val = parseFloat(this.sensitivitySlider.value);
      this.sensitivityVal.textContent = val.toFixed(2);
      this.updateGenomeParams();
    });
  }

  private updateGenomeParams(): void {
    const params: Partial<Genome> = {
      springLength: parseFloat(this.springLenSlider.value),
      particleDistance: parseFloat(this.particleDistSlider.value),
      moveSpeed: parseFloat(this.moveSpeedSlider.value),
      sensitivity: parseFloat(this.sensitivitySlider.value)
    };
    this.environment.setGenomeParams(params);
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (timestamp: number): void => {
    this.animationId = requestAnimationFrame(this.loop);

    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.frameCount++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (!this.paused) {
      const dt = Math.min(rawDt, 0.05) * this.speedMultiplier;
      const aliveBlobs = this.environment.blobs.filter(b => b.alive);
      const particleCount = aliveBlobs.reduce((sum, b) => sum + b.particles.length, 0);
      const targetFPS = particleCount > 200 ? 30 : 60;
      const subSteps = Math.max(1, Math.floor(targetFPS / 60 * this.speedMultiplier));
      const subDt = dt / subSteps;

      for (let i = 0; i < subSteps; i++) {
        this.environment.update(subDt);
      }
    }

    this.render();
    this.updateUI();
    this.renderFitnessChart();
  };

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    const gradient = this.ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#0B0D17');
    gradient.addColorStop(1, '#1A1F35');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % rect.width;
      const y = (i * 89.3) % rect.height;
      const size = (i % 3) + 1;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fill();
    }
    this.ctx.restore();

    this.environment.render(this.ctx);

    this.ctx.fillStyle = 'rgba(0, 255, 204, 0.5)';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }

  private updateUI(): void {
    this.generationEl.textContent = this.environment.generation.toString();
    this.timeLeftEl.textContent = `${Math.ceil(this.environment.getTimeLeft())}s`;
    this.aliveCountEl.textContent = this.environment.getAliveCount().toString();
    this.avgFitnessEl.textContent = Math.round(this.environment.getAvgFitness()).toString();
    this.bestFitnessEl.textContent = Math.round(this.environment.getBestFitness()).toString();
  }

  private renderFitnessChart(): void {
    const ctx = this.fitnessChartCtx;
    const w = this.fitnessChartCanvas.width;
    const h = this.fitnessChartCanvas.height;
    const padding = 30;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (h - 2 * padding)) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(224, 230, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.fillText('适应度', 5, 12);
    ctx.fillText('代数', w - 30, h - 5);

    const stats = this.environment.stats;
    if (stats.length < 2) {
      ctx.fillStyle = 'rgba(224, 230, 255, 0.5)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数据...', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    const maxGen = Math.max(...stats.map(s => s.generation));
    const maxFitness = Math.max(...stats.map(s => Math.max(s.avgFitness, s.bestFitness)), 100);

    const chartW = w - 2 * padding;
    const chartH = h - 2 * padding;

    ctx.beginPath();
    ctx.strokeStyle = '#00FFCC';
    ctx.lineWidth = 2;
    for (let i = 0; i < stats.length; i++) {
      const x = padding + (stats[i].generation / maxGen) * chartW;
      const y = h - padding - (stats[i].avgFitness / maxFitness) * chartH;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 2;
    for (let i = 0; i < stats.length; i++) {
      const x = padding + (stats[i].generation / maxGen) * chartW;
      const y = h - padding - (stats[i].bestFitness / maxFitness) * chartH;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    for (let i = 0; i < stats.length; i++) {
      const x = padding + (stats[i].generation / maxGen) * chartW;
      const avgY = h - padding - (stats[i].avgFitness / maxFitness) * chartH;
      const bestY = h - padding - (stats[i].bestFitness / maxFitness) * chartH;

      ctx.beginPath();
      ctx.arc(x, avgY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00FFCC';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, bestY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FF6600';
      ctx.fill();
    }

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#00FFCC';
    ctx.fillText('━ 平均', w - 70, 15);
    ctx.fillStyle = '#FF6600';
    ctx.fillText('━ 最佳', w - 70, 28);
  }

  private clearFitnessChart(): void {
    this.fitnessChartCtx.clearRect(
      0, 0,
      this.fitnessChartCanvas.width,
      this.fitnessChartCanvas.height
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
