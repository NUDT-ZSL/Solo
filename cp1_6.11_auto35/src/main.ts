import { wordToPixelGrid, PixelGrid } from './templates';
import { Animator, MoodType, moodColors } from './animator';

const MOOD_LABELS: Record<MoodType, string> = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  calm: 'Calm',
};

class PixelIconApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: HTMLInputElement;
  private generateBtn: HTMLButtonElement;
  private moodButtons: NodeListOf<HTMLButtonElement>;
  private infoText: HTMLElement;
  private canvasContainer: HTMLElement;

  private animator: Animator;
  private pixelGrid: PixelGrid | null = null;
  private pixelSize: number = 10;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private animationId: number = 0;
  private currentWord: string = '';
  private currentMood: MoodType = 'happy';
  private hoveredPixelKey: string | null = null;

  constructor() {
    this.canvas = document.getElementById('pixelCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.input = document.getElementById('wordInput') as HTMLInputElement;
    this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    this.moodButtons = document.querySelectorAll('.mood-btn');
    this.infoText = document.getElementById('infoText') as HTMLElement;
    this.canvasContainer = document.querySelector('.canvas-container') as HTMLElement;

    this.animator = new Animator();

    this.setupCanvas();
    this.bindEvents();
    this.generateInitial();
    this.startAnimationLoop();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    this.generateBtn.addEventListener('click', () => this.generate());

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.generate();
      }
    });

    this.moodButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood as MoodType;
        if (mood) {
          this.setMood(mood);
        }
      });
    });

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

    window.addEventListener('resize', () => this.handleResize());
  }

  private generate(): void {
    const word = this.input.value.trim();
    this.currentWord = word;

    if (word.length === 0) {
      this.pixelGrid = null;
      this.updateInfoText();
      return;
    }

    this.pixelGrid = wordToPixelGrid(word);
    this.calculateLayout();
    this.animator.setGridSize(this.pixelGrid.width, this.pixelGrid.height, this.pixelSize);
    this.updateInfoText();
  }

  private generateInitial(): void {
    this.input.value = 'HELLO';
    this.generate();
  }

  private calculateLayout(): void {
    if (!this.pixelGrid) return;

    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    const padding = 30;

    const availableWidth = canvasWidth - padding * 2;
    const availableHeight = canvasHeight - padding * 2;

    const gridWidth = this.pixelGrid.width;
    const gridHeight = this.pixelGrid.height;

    const pixelSizeByWidth = (availableWidth - (gridWidth - 1)) / gridWidth;
    const pixelSizeByHeight = (availableHeight - (gridHeight - 1)) / gridHeight;

    this.pixelSize = Math.floor(Math.min(pixelSizeByWidth, pixelSizeByHeight));
    if (this.pixelSize < 2) this.pixelSize = 2;

    const totalWidth = gridWidth * this.pixelSize + (gridWidth - 1) * 1;
    const totalHeight = gridHeight * this.pixelSize + (gridHeight - 1) * 1;

    this.offsetX = (canvasWidth - totalWidth) / 2;
    this.offsetY = (canvasHeight - totalHeight) / 2;
  }

  private setMood(mood: MoodType): void {
    this.currentMood = mood;
    this.animator.setMood(mood);

    this.moodButtons.forEach((btn) => {
      if (btn.dataset.mood === mood) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    this.updateInfoText();
    this.updateCanvasGlow();
  }

  private updateCanvasGlow(): void {
    const color = moodColors[this.currentMood];
    this.canvas.style.filter = `drop-shadow(0 0 15px ${color}20)`;
  }

  private updateInfoText(): void {
    const charCount = this.currentWord.length;
    const moodLabel = MOOD_LABELS[this.currentMood];
    this.infoText.textContent = `${charCount} characters · ${moodLabel}`;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.pixelGrid) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const pixelKey = this.getPixelAtPosition(mouseX, mouseY);

    if (pixelKey && pixelKey !== this.hoveredPixelKey) {
      this.hoveredPixelKey = pixelKey;
      const [gx, gy] = pixelKey.split(',').map(Number);
      this.animator.triggerRipple(gx, gy);
    }
  }

  private handleMouseLeave(): void {
    this.hoveredPixelKey = null;
    this.animator.clearRipple();
  }

  private getPixelAtPosition(mouseX: number, mouseY: number): string | null {
    if (!this.pixelGrid) return null;

    const step = this.pixelSize + 1;
    const gridX = Math.floor((mouseX - this.offsetX + 0.5) / step);
    const gridY = Math.floor((mouseY - this.offsetY + 0.5) / step);

    if (gridX < 0 || gridX >= this.pixelGrid.width || gridY < 0 || gridY >= this.pixelGrid.height) {
      return null;
    }

    const pixelIndex = gridY * this.pixelGrid.width + gridX;
    const pixel = this.pixelGrid.pixels[pixelIndex];

    if (pixel && pixel.filled) {
      return `${gridX},${gridY}`;
    }

    return null;
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    if (this.pixelGrid) {
      this.calculateLayout();
      this.animator.setGridSize(this.pixelGrid.width, this.pixelGrid.height, this.pixelSize);
    }
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      this.render(time);
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private render(time: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!this.pixelGrid || this.pixelSize <= 0) return;

    const step = this.pixelSize + 1;

    for (const pixel of this.pixelGrid.pixels) {
      if (!pixel.filled) continue;

      const anim = this.animator.getPixelAnimation(pixel.x, pixel.y, time);
      const baseColor = this.animator.getPixelColor(pixel.charCode, time);
      const finalColor = this.animator.applyBrightness(baseColor, anim.brightness);

      const centerX = this.offsetX + pixel.x * step + this.pixelSize / 2;
      const centerY = this.offsetY + pixel.y * step + this.pixelSize / 2 + anim.offsetY;

      const size = this.pixelSize * anim.scale;
      const drawX = centerX - size / 2;
      const drawY = centerY - size / 2;

      ctx.globalAlpha = anim.alpha;
      ctx.fillStyle = finalColor;
      ctx.fillRect(drawX, drawY, size, size);
    }

    ctx.globalAlpha = 1;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PixelIconApp();
});
