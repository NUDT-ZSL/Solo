import { InkDrop } from './inkdrop';
import { Painter } from './painter';
import { AchievementCard } from './card';
import './style.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const TARGET_CHARS = ['永', '龍', '鳳', '墨', '福', '壽', '龍', '虎', '梅', '竹'];

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inkDrops: InkDrop[] = [];
  private painter: Painter;
  private card: AchievementCard;

  private isDragging: boolean = false;
  private currentDragStart: InkDrop | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerInterval: number | null = null;
  private animationFrameId: number = 0;

  private gameCompleted: boolean = false;
  private targetChar: string = '';

  private resultDisplay: HTMLElement;
  private timerDisplay: HTMLElement;
  private progressDisplay: HTMLElement;
  private resetBtn: HTMLElement;
  private achievementModal: HTMLElement;
  private modalOverlay: HTMLElement;

  constructor() {
    const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const cardCanvas = document.getElementById('cardCanvas') as HTMLCanvasElement;

    if (!canvasEl || !cardCanvas) {
      throw new Error('Canvas elements not found');
    }

    this.canvas = canvasEl;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;

    this.painter = new Painter(0);
    this.card = new AchievementCard(cardCanvas);

    this.resultDisplay = document.getElementById('resultDisplay') as HTMLElement;
    this.timerDisplay = document.getElementById('timer') as HTMLElement;
    this.progressDisplay = document.getElementById('progress') as HTMLElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLElement;
    this.achievementModal = document.getElementById('achievementModal') as HTMLElement;
    this.modalOverlay = document.getElementById('modalOverlay') as HTMLElement;

    this.bindEvents();
    this.init();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.resetBtn.addEventListener('click', this.reset.bind(this));
    this.modalOverlay.addEventListener('click', this.hideAchievement.bind(this));
  }

  private init(): void {
    this.gameCompleted = false;
    this.resultDisplay.textContent = '';
    this.hideAchievement();
    this.stopTimer();
    this.elapsedTime = 0;
    this.updateTimerDisplay();

    this.targetChar = TARGET_CHARS[Math.floor(Math.random() * TARGET_CHARS.length)];

    const dropCount = 10 + Math.floor(Math.random() * 6);
    this.inkDrops = this.generateInkDrops(dropCount);
    this.inkDrops[0].markConnected();

    this.painter.reset(dropCount);

    this.updateProgressDisplay();
    this.startGameLoop();
    this.startTimer();
  }

  private generateInkDrops(count: number): InkDrop[] {
    const drops: InkDrop[] = [];
    const padding = 60;
    const minDistance = 80;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let x: number, y: number, radius: number;

      do {
        x = padding + Math.random() * (CANVAS_WIDTH - padding * 2);
        y = padding + Math.random() * (CANVAS_HEIGHT - padding * 2);
        radius = 8 + Math.random() * 8;
        attempts++;
      } while (
        attempts < 100 &&
        drops.some(d => {
          const dx = d.x - x;
          const dy = d.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        })
      );

      drops.push(new InkDrop(x, y, radius, i + 1));
    }

    return drops;
  }

  private startGameLoop(): void {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.painter.drawBackground(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.painter.drawStrokes(this.ctx);

    for (const drop of this.inkDrops) {
      drop.draw(this.ctx);
    }

    if (this.isDragging && this.currentDragStart) {
      this.painter.drawPreviewLine(this.ctx, this.currentDragStart, this.mouseX, this.mouseY);
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.gameCompleted) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const expectedIndex = this.painter.getExpectedNextIndex();
    const drop = this.inkDrops.find(d => d.index === expectedIndex);

    if (drop && drop.containsPoint(x, y)) {
      this.isDragging = true;
      this.currentDragStart = drop;
      this.mouseX = x;
      this.mouseY = y;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isDragging || !this.currentDragStart || this.gameCompleted) {
      this.isDragging = false;
      this.currentDragStart = null;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const targetDrop = this.inkDrops.find(drop =>
      drop.index > this.currentDragStart!.index && drop.containsPoint(x, y)
    );

    if (targetDrop) {
      const result = this.painter.tryConnect(this.currentDragStart, targetDrop);
      this.updateProgressDisplay();

      if (result.completed) {
        this.onGameComplete();
      }
    }

    this.isDragging = false;
    this.currentDragStart = null;
  }

  private onGameComplete(): void {
    this.gameCompleted = true;
    this.stopTimer();
    this.resultDisplay.textContent = this.targetChar;

    setTimeout(() => {
      this.showAchievement();
    }, 800);
  }

  private startTimer(): void {
    this.startTime = Date.now();
    this.timerInterval = window.setInterval(() => {
      this.elapsedTime = (Date.now() - this.startTime) / 1000;
      this.updateTimerDisplay();
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(): void {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    this.timerDisplay.textContent = `用时: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private updateProgressDisplay(): void {
    const connected = this.painter.getConnectedCount();
    const total = this.inkDrops.length - 1;
    this.progressDisplay.textContent = `进度: ${connected}/${total}`;
  }

  private showAchievement(): void {
    const nickname = '墨客雅士';
    const seed = `${this.targetChar}${Date.now()}`;

    this.card.render({
      nickname,
      avatarSeed: seed,
      timeSeconds: this.elapsedTime,
      accuracy: this.painter.getAccuracy(),
      targetChar: this.targetChar
    });

    this.achievementModal.style.display = 'flex';
  }

  private hideAchievement(): void {
    this.achievementModal.style.display = 'none';
  }

  reset(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.init();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new Game();
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});
