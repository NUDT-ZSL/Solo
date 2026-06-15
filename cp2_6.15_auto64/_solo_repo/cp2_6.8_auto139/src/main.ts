import { ParticleSystem } from './ParticleSystem';
import { BrushManager } from './BrushManager';
import './style.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const BG_TOP = '#3E2723';
const BG_BOTTOM = '#8D6E63';

interface Config {
  particleCount: number;
  particleSpeed: number;
  particleSize: number;
  brushSize: number;
  brushOpacity: number;
}

const DEFAULT_CONFIG: Config = {
  particleCount: 1500,
  particleSpeed: 80,
  particleSize: 4,
  brushSize: 30,
  brushOpacity: 0.6
};

class SandstormApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private brushManager: BrushManager;

  private lastTime: number = 0;
  private animationId: number | null = null;

  private config: Config = { ...DEFAULT_CONFIG };

  private elements: {
    windBtn: HTMLButtonElement;
    resetBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    controlPanel: HTMLElement;
    controlToggle: HTMLElement;
    panelClose: HTMLButtonElement;
    particleCountInput: HTMLInputElement;
    particleSpeedInput: HTMLInputElement;
    particleSizeInput: HTMLInputElement;
    brushSizeInput: HTMLInputElement;
    brushOpacityInput: HTMLInputElement;
    particleCountValue: HTMLElement;
    particleSpeedValue: HTMLElement;
    particleSizeValue: HTMLElement;
    brushSizeValue: HTMLElement;
    brushOpacityValue: HTMLElement;
    particleTotal: HTMLElement;
    brushDiameter: HTMLElement;
  };

  constructor() {
    this.canvas = document.getElementById('sandCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.particleSystem = new ParticleSystem(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.brushManager = new BrushManager(this.canvas);

    this.elements = this.queryElements();
    this.bindEvents();
    this.applyConfig();

    this.lastTime = performance.now();
    this.startAnimationLoop();
  }

  private queryElements() {
    const get = <T extends HTMLElement>(id: string): T =>
      document.getElementById(id) as T;

    return {
      windBtn: get<HTMLButtonElement>('windBtn'),
      resetBtn: get<HTMLButtonElement>('resetBtn'),
      exportBtn: get<HTMLButtonElement>('exportBtn'),
      controlPanel: get('controlPanel'),
      controlToggle: get('controlToggle'),
      panelClose: get<HTMLButtonElement>('panelClose'),
      particleCountInput: get<HTMLInputElement>('particleCount'),
      particleSpeedInput: get<HTMLInputElement>('particleSpeed'),
      particleSizeInput: get<HTMLInputElement>('particleSize'),
      brushSizeInput: get<HTMLInputElement>('brushSize'),
      brushOpacityInput: get<HTMLInputElement>('brushOpacity'),
      particleCountValue: get('particleCountValue'),
      particleSpeedValue: get('particleSpeedValue'),
      particleSizeValue: get('particleSizeValue'),
      brushSizeValue: get('brushSizeValue'),
      brushOpacityValue: get('brushOpacityValue'),
      particleTotal: get('particleTotal'),
      brushDiameter: get('brushDiameter')
    };
  }

  private bindEvents(): void {
    this.elements.windBtn.addEventListener('click', () => {
      this.particleSystem.triggerWindup();
    });

    this.elements.resetBtn.addEventListener('click', () => {
      this.resetConfig();
    });

    this.elements.exportBtn.addEventListener('click', () => {
      this.exportScreenshot();
    });

    this.elements.particleCountInput.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.config.particleCount = value;
      this.particleSystem.setTargetCount(value);
      this.elements.particleCountValue.textContent = String(value);
    });

    this.elements.particleSpeedInput.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.config.particleSpeed = value;
      this.particleSystem.setBaseSpeed(value);
      this.elements.particleSpeedValue.textContent = String(value);
    });

    this.elements.particleSizeInput.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.config.particleSize = value;
      this.particleSystem.setBaseSize(value);
      this.elements.particleSizeValue.textContent = String(value);
    });

    this.elements.brushSizeInput.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.config.brushSize = value;
      this.brushManager.setBrushSize(value);
      this.elements.brushSizeValue.textContent = String(value);
      this.elements.brushDiameter.textContent = String(value);
    });

    this.elements.brushOpacityInput.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.brushOpacity = value;
      this.brushManager.setBrushOpacity(value);
      this.elements.brushOpacityValue.textContent = value.toFixed(2);
    });

    this.elements.controlToggle.addEventListener('click', () => {
      this.elements.controlPanel.classList.add('open');
    });

    this.elements.panelClose.addEventListener('click', () => {
      this.elements.controlPanel.classList.remove('open');
    });
  }

  private applyConfig(): void {
    this.particleSystem.setTargetCount(this.config.particleCount);
    this.particleSystem.setBaseSpeed(this.config.particleSpeed);
    this.particleSystem.setBaseSize(this.config.particleSize);
    this.brushManager.setBrushSize(this.config.brushSize);
    this.brushManager.setBrushOpacity(this.config.brushOpacity);
  }

  private resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };

    this.elements.particleCountInput.value = String(DEFAULT_CONFIG.particleCount);
    this.elements.particleSpeedInput.value = String(DEFAULT_CONFIG.particleSpeed);
    this.elements.particleSizeInput.value = String(DEFAULT_CONFIG.particleSize);
    this.elements.brushSizeInput.value = String(DEFAULT_CONFIG.brushSize);
    this.elements.brushOpacityInput.value = String(DEFAULT_CONFIG.brushOpacity);

    this.elements.particleCountValue.textContent = String(DEFAULT_CONFIG.particleCount);
    this.elements.particleSpeedValue.textContent = String(DEFAULT_CONFIG.particleSpeed);
    this.elements.particleSizeValue.textContent = String(DEFAULT_CONFIG.particleSize);
    this.elements.brushSizeValue.textContent = String(DEFAULT_CONFIG.brushSize);
    this.elements.brushOpacityValue.textContent = DEFAULT_CONFIG.brushOpacity.toFixed(2);
    this.elements.brushDiameter.textContent = String(DEFAULT_CONFIG.brushSize);

    this.applyConfig();
    this.brushManager.clear();
  }

  private exportScreenshot(): void {
    const link = document.createElement('a');
    link.download = `sandstorm-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, BG_TOP);
    gradient.addColorStop(1, BG_BOTTOM);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private updateStatus(): void {
    this.elements.particleTotal.textContent = String(this.particleSystem.getParticleCount());
  }

  private animate = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.particleSystem.update(deltaTime);

    this.drawBackground();
    this.particleSystem.render(this.ctx);
    this.brushManager.render(this.ctx);

    this.updateStatus();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private startAnimationLoop(): void {
    if (this.animationId !== null) return;
    this.animationId = requestAnimationFrame(this.animate);
  }

  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SandstormApp();
});
