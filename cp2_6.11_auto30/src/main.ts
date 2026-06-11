import { recognizeRune, getElementName, getElementColor, getCombinedElement, ElementType, Point } from './runeRecognizer';
import { ParticleEngine, Starfield } from './particleEngine';
import { UIManager, HistoryItem } from './uiManager';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleEngine: ParticleEngine;
  private starfield: Starfield;
  private uiManager: UIManager;

  private isDrawing: boolean = false;
  private currentPoints: Point[] = [];
  private lastTime: number = 0;
  private animationId: number = 0;

  private currentRuneSequence: ElementType[] = [];
  private comboCooldown: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.particleEngine = new ParticleEngine({ maxParticles: 500 });
    this.starfield = new Starfield(180);

    this.uiManager = new UIManager({
      onClear: () => this.clearCanvas(),
      onHistorySelect: (item) => this.handleHistorySelect(item)
    });

    this.initCanvas();
    this.initEventListeners();
    this.startGameLoop();

    this.hideLoading();
  }

  private initCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.scale(dpr, dpr);
    this.starfield.resize(rect.width, rect.height);
  }

  private initEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp({} as MouseEvent);
    });
  }

  private getCanvasPoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    this.currentPoints = [this.getCanvasPoint(e)];
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;

    const point = this.getCanvasPoint(e);
    const lastPoint = this.currentPoints[this.currentPoints.length - 1];

    const dist = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
    if (dist > 2) {
      this.currentPoints.push(point);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPoints.length < 5) {
      this.currentPoints = [];
      return;
    }

    this.recognizeAndSummon();
  }

  private recognizeAndSummon(): void {
    const result = recognizeRune(this.currentPoints);

    if (result.element) {
      this.currentRuneSequence.push(result.element);

      const centerX = this.canvas.width / (window.devicePixelRatio || 1) / 2;
      const centerY = this.canvas.height / (window.devicePixelRatio || 1) / 2;

      if (this.currentRuneSequence.length >= 2) {
        const combo = getCombinedElement(this.currentRuneSequence);
        if (combo) {
          for (const element of this.currentRuneSequence) {
            this.particleEngine.spawnElementParticles(element, centerX, centerY, 60, true);
          }
          this.uiManager.showFloatingText(`${combo.name} 召唤成功！`, this.currentRuneSequence[0]);
          this.uiManager.addToHistory([...this.currentRuneSequence], combo.name);
          this.currentRuneSequence = [];
        } else {
          this.particleEngine.spawnElementParticles(result.element, centerX, centerY, 80, false);
          this.uiManager.showFloatingText(`${getElementName(result.element)}元素识别成功`, result.element);
          this.uiManager.addToHistory([result.element]);
          this.currentRuneSequence = [result.element];
        }
      } else {
        this.particleEngine.spawnElementParticles(result.element, centerX, centerY, 80, false);
        this.uiManager.showFloatingText(`${getElementName(result.element)}元素识别成功`, result.element);
        this.uiManager.addToHistory([result.element]);
      }

      this.comboCooldown = 3;
      this.uiManager.triggerFlash();
      this.uiManager.triggerShake();
    } else {
      this.uiManager.showFloatingText('符文识别失败...');
      this.currentRuneSequence = [];
    }

    setTimeout(() => {
      this.currentPoints = [];
    }, 100);
  }

  private handleHistorySelect(item: HistoryItem): void {
    const centerX = this.canvas.width / (window.devicePixelRatio || 1) / 2;
    const centerY = this.canvas.height / (window.devicePixelRatio || 1) / 2;

    const isCombo = item.elements.length > 1;
    for (const element of item.elements) {
      this.particleEngine.spawnElementParticles(element, centerX, centerY, 60, isCombo);
    }

    this.uiManager.triggerFlash();
    this.uiManager.triggerShake();
    this.uiManager.toggleHistoryPanel();

    if (item.comboName) {
      this.uiManager.showFloatingText(`${item.comboName} 再次召唤！`, item.elements[0]);
    } else {
      this.uiManager.showFloatingText(`${getElementName(item.elements[0])}元素 再次召唤！`, item.elements[0]);
    }
  }

  private clearCanvas(): void {
    this.currentPoints = [];
    this.currentRuneSequence = [];
    this.particleEngine.clear();
    this.uiManager.clearHistory();

    const dpr = window.devicePixelRatio || 1;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.uiManager.clearCanvasWithAnimation(
      this.canvas,
      this.ctx
    ).then(() => {
      this.ctx.restore();
      this.ctx.scale(dpr, dpr);
    });

    this.uiManager.showFloatingText('画布已清除');
  }

  private drawBackground(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0B0014');
    gradient.addColorStop(1, '#1A0033');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    this.starfield.render(this.ctx);
  }

  private drawCurrentRune(): void {
    if (this.currentPoints.length < 2) return;

    const currentElement = this.uiManager.getCurrentElement();
    const colors = getElementColor(currentElement);

    this.ctx.save();
    this.ctx.strokeStyle = colors.end;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = colors.end;
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    this.ctx.moveTo(this.currentPoints[0].x, this.currentPoints[0].y);

    for (let i = 1; i < this.currentPoints.length; i++) {
      this.ctx.lineTo(this.currentPoints[i].x, this.currentPoints[i].y);
    }

    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = colors.start;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.starfield.update(dt);
    this.particleEngine.update(dt);

    if (this.comboCooldown > 0) {
      this.comboCooldown -= dt;
      if (this.comboCooldown <= 0) {
        this.currentRuneSequence = [];
      }
    }
  }

  private render(): void {
    this.drawBackground();
    this.particleEngine.render(this.ctx);
    this.drawCurrentRune();
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => {
          loading.style.display = 'none';
        }, 800);
      }, 500);
    }
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
