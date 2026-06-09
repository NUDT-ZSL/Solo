import { Pixel, getColorBySpeed, PALETTE_COLD, PALETTE_WARM } from './pixel';
import { AudioAnalyzer } from './audio';
import { UIManager } from './ui';

const MAX_PIXELS = 500;
const PEAK_THRESHOLD = 0.7;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixels: Pixel[] = [];
  private audio: AudioAnalyzer;
  private ui: UIManager;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMouseTime: number = 0;
  private animationId: number = 0;
  private width: number = 0;
  private height: number = 0;

  constructor() {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Canvas 元素未找到');
    this.canvas = canvas as HTMLCanvasElement;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;

    this.audio = new AudioAnalyzer();
    this.ui = new UIManager({
      onColorSelect: () => {},
      onAudioToggle: () => this.toggleAudio(),
      onClear: () => this.clearPixels()
    });

    this.audio.onStatusChange = (active) => {
      this.ui.setAudioState(active);
    };

    this.setupCanvas();
    this.bindMouseEvents();
    this.bindResizeEvent();
    this.start();
  }

  private setupCanvas(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(dpr, dpr);
  }

  private bindResizeEvent(): void {
    window.addEventListener('resize', () => {
      this.setupCanvas();
    });
  }

  private bindMouseEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.lastMouseTime = performance.now();
      this.spawnPixel(e.clientX, e.clientY, 0);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const now = performance.now();
      const dt = Math.max(1, now - this.lastMouseTime);
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy) / (dt / 16);

      const spawnCount = Math.min(5, Math.ceil(speed / 2));
      for (let i = 0; i < spawnCount; i++) {
        const t = i / spawnCount;
        const x = this.lastMouseX + dx * t;
        const y = this.lastMouseY + dy * t;
        this.spawnPixel(x, y, speed);
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.lastMouseTime = now;
    });

    const stopDrag = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mouseup', stopDrag);
    this.canvas.addEventListener('mouseleave', stopDrag);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.isDragging = true;
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.lastMouseTime = performance.now();
      this.spawnPixel(touch.clientX, touch.clientY, 0);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.isDragging) return;
      const touch = e.touches[0];
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMouseTime);
      const dx = touch.clientX - this.lastMouseX;
      const dy = touch.clientY - this.lastMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy) / (dt / 16);

      this.spawnPixel(touch.clientX, touch.clientY, speed);
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.lastMouseTime = now;
    }, { passive: false });

    this.canvas.addEventListener('touchend', stopDrag);
  }

  private spawnPixel(x: number, y: number, speed: number): void {
    if (this.pixels.length >= MAX_PIXELS) {
      return;
    }

    const manualColor = this.ui.getSelectedColor();
    let color: string;

    if (manualColor) {
      color = manualColor;
    } else {
      const palette = speed < 5 ? PALETTE_COLD : PALETTE_WARM;
      color = getColorBySpeed(speed, palette);
    }

    const radius = 2 + Math.random() * 2;
    const pixel = new Pixel(x, y, color, radius);
    this.pixels.push(pixel);
  }

  private clearPixels(): void {
    this.pixels = [];
  }

  private async toggleAudio(): Promise<void> {
    await this.audio.toggle();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) / 1.2
    );
    gradient.addColorStop(0, '#0a0a23');
    gradient.addColorStop(1, '#1a1a3e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private checkColorMixing(): void {
    for (let i = 0; i < this.pixels.length; i++) {
      for (let j = i + 1; j < this.pixels.length; j++) {
        const p1 = this.pixels[i];
        const p2 = this.pixels[j];
        if (!p1.active || !p2.active) continue;

        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);

        if (dx < 5 && dy < 10) {
          p1.mixWith(p2);
          p2.mixWith(p1);
        }
      }
    }
  }

  private update(): void {
    let speedMultiplier = 1;
    let brightnessBoost = 0;
    let widthOffset = 0;
    let peakEnergy = 0;

    if (this.audio.isActive) {
      const lowEnergy = this.audio.getLowEnergy();
      const midEnergy = this.audio.getMidEnergy();
      const highEnergy = this.audio.getHighEnergy();
      peakEnergy = this.audio.getPeakEnergy();

      speedMultiplier = 0.5 + lowEnergy * 2.5;
      brightnessBoost = midEnergy * 0.4;
      widthOffset = 20 + highEnergy * 60;

      const spectrum = this.audio.getFullSpectrum();
      this.ui.updateSpectrum(spectrum);

      if (peakEnergy > PEAK_THRESHOLD) {
        this.ui.triggerFlash();
      }
    }

    for (const pixel of this.pixels) {
      pixel.applyBrightness(brightnessBoost);
      pixel.update(speedMultiplier, this.width, this.height, widthOffset);
    }

    this.checkColorMixing();
  }

  private render(): void {
    this.drawBackground();

    for (const pixel of this.pixels) {
      pixel.draw(this.ctx);
    }
  }

  private loop = (): void => {
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    this.loop();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.audio.stop();
  }
}

new App();
