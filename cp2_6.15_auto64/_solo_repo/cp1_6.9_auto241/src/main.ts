import { Renderer } from './Renderer';
import { InteractionManager } from './InteractionManager';

class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private interaction: InteractionManager;
  private autoSaveTimer: number;
  private prevViewportWidth: number;
  private prevViewportHeight: number;

  constructor() {
    const canvas = document.getElementById('mindCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.canvas = canvas;
    this.prevViewportWidth = 0;
    this.prevViewportHeight = 0;
    this.autoSaveTimer = 0;

    this.renderer = new Renderer(this.canvas);
    this.interaction = new InteractionManager(this.canvas, this.renderer);

    this.bindEvents();
    this.restoreState();
    this.startAutoSave();
  }

  private bindEvents(): void {
    const handleMouseMove = (e: MouseEvent) => {
      this.interaction.handleMouseMove(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      this.interaction.handleMouseDown(e.clientX, e.clientY, e.button);
    };

    const handleMouseUp = (e: MouseEvent) => {
      this.interaction.handleMouseUp(e.clientX, e.clientY, e.button);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      this.interaction.handleKeyDown(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.interaction.handleKeyUp(e);
    };

    const handleResize = () => {
      const prevW = this.prevViewportWidth || this.canvas.clientWidth;
      const prevH = this.prevViewportHeight || this.canvas.clientHeight;
      this.renderer.resize();
      this.interaction.resize(prevW, prevH, this.canvas.clientWidth, this.canvas.clientHeight);
      this.prevViewportWidth = this.canvas.clientWidth;
      this.prevViewportHeight = this.canvas.clientHeight;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.interaction.handleMouseDown(t.clientX, t.clientY, 0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.interaction.handleMouseMove(t.clientX, t.clientY);
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        this.interaction.handleMouseUp(t.clientX, t.clientY, 0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    this.canvas.addEventListener('contextmenu', handleContextMenu);

    this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', handleTouchEnd);
  }

  private restoreState(): void {
    if (!this.interaction.load()) {
      this.createDemoCards();
    }
    this.prevViewportWidth = this.canvas.clientWidth;
    this.prevViewportHeight = this.canvas.clientHeight;
  }

  private createDemoCards(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const cx = w / 2;
    const cy = h / 2;

    const positions = [
      { x: cx, y: cy - 140 },
      { x: cx - 180, y: cy },
      { x: cx + 180, y: cy },
      { x: cx - 90, y: cy + 140 },
      { x: cx + 90, y: cy + 140 }
    ];

    const cards: any[] = [];
    for (let i = 0; i < positions.length; i++) {
      (this.interaction as any).createCard(positions[i].x, positions[i].y);
    }

    setTimeout(() => {
      const cardList = Array.from(this.interaction.getCards().keys());
      if (cardList.length >= 5) {
        (this.interaction as any).createLink(cardList[0], cardList[1]);
        (this.interaction as any).createLink(cardList[0], cardList[2]);
        (this.interaction as any).createLink(cardList[1], cardList[3]);
        (this.interaction as any).createLink(cardList[2], cardList[4]);
        (this.interaction as any).createLink(cardList[3], cardList[4]);
      }
    }, 600);
  }

  private startAutoSave(): void {
    const save = () => {
      this.interaction.save();
      this.autoSaveTimer = window.setTimeout(save, 30000);
    };
    this.autoSaveTimer = window.setTimeout(save, 30000);

    window.addEventListener('beforeunload', () => {
      this.interaction.save();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.interaction.save();
      }
    });
  }

  public start(): void {
    this.renderer.start();
  }

  public stop(): void {
    this.renderer.stop();
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }
}

let app: App | null = null;

function bootstrap(): void {
  try {
    app = new App();
    app.start();
    console.log('[思流漫游] 启动成功');
  } catch (err) {
    console.error('[思流漫游] 启动失败:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

export default App;
