import { DrawCanvas } from './drawCanvas';
import { ParticleCloud } from './particleCloud';
import type { Stroke } from './drawCanvas';

class Application {
  private drawCanvas: DrawCanvas;
  private particleCloud: ParticleCloud;
  private resetButton: HTMLElement;
  private modeButtons: NodeListOf<HTMLElement>;
  private loadingScreen: HTMLElement;
  
  private currentMode: 'draw' | 'view' = 'draw';
  private lastTime = 0;
  private animationFrameId: number | null = null;

  constructor() {
    this.loadingScreen = document.getElementById('loading')!;
    this.resetButton = document.getElementById('resetBtn')!;
    this.modeButtons = document.querySelectorAll('.mode-btn');

    this.particleCloud = new ParticleCloud({
      canvasId: 'threeCanvas',
      tooltipId: 'tooltip',
      particleCountId: 'particleCount',
      maxParticles: 3000,
      onParticleCountChange: this.handleParticleCountChange.bind(this)
    });

    this.drawCanvas = new DrawCanvas({
      canvasId: 'drawCanvas',
      colorPaletteId: 'colorPalette',
      brushWidthId: 'brushWidth',
      brushWidthValueId: 'brushWidthValue',
      customCursorId: 'customCursor',
      colorPreviewId: 'colorPreview',
      onSamplingComplete: this.handleSamplingComplete.bind(this)
    });

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.setMode('draw');
    this.hideLoading();
    this.startAnimationLoop();
  }

  private setupEventListeners(): void {
    this.resetButton.addEventListener('click', this.handleReset.bind(this));

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as 'draw' | 'view';
        if (mode && mode !== this.currentMode) {
          this.setMode(mode);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'v' || e.key === 'V') {
        this.setMode('view');
      } else if (e.key === 'd' || e.key === 'D') {
        this.setMode('draw');
      } else if (e.key === 'r' || e.key === 'R') {
        this.handleReset();
      }
    });
  }

  private setMode(mode: 'draw' | 'view'): void {
    this.currentMode = mode;

    this.modeButtons.forEach(btn => {
      const btnMode = btn.dataset.mode;
      btn.classList.toggle('active', btnMode === mode);
    });

    const drawCanvas = document.getElementById('drawCanvas')!;
    const threeCanvas = document.getElementById('threeCanvas')!;

    if (mode === 'draw') {
      drawCanvas.style.pointerEvents = 'auto';
      threeCanvas.style.pointerEvents = 'none';
      this.particleCloud.setInteractive(false);
    } else {
      drawCanvas.style.pointerEvents = 'none';
      threeCanvas.style.pointerEvents = 'auto';
      this.particleCloud.setInteractive(true);
    }
  }

  private handleSamplingComplete(strokes: Stroke[]): void {
    this.particleCloud.generateFromStrokes(strokes);
  }

  private handleParticleCountChange(count: number): void {
    const countEl = document.getElementById('particleCount');
    if (countEl) {
      if (count >= 2500) {
        countEl.style.color = '#FF9933';
      } else if (count >= 2800) {
        countEl.style.color = '#FF3366';
      } else {
        countEl.style.color = '#33CC66';
      }
    }
  }

  private handleReset(): void {
    if (confirm('确定要重置画布吗？所有绘制内容和粒子云将被清除。')) {
      this.drawCanvas.clear();
      this.particleCloud.clear();
    }
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.loadingScreen.style.opacity = '0';
      this.loadingScreen.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 500);
    }, 800);
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.particleCloud.update(deltaTime);

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.drawCanvas.destroy();
    this.particleCloud.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).app = new Application();
});

window.addEventListener('beforeunload', () => {
  if ((window as any).app) {
    (window as any).app.destroy();
  }
});
