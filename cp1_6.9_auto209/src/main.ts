import { Vortex } from './vortex';
import { InteractionManager } from './interaction';
import { ControlPanel } from './ui';

class App {
  private canvas: HTMLCanvasElement;
  private appContainer: HTMLElement;
  private vortex!: Vortex;

  constructor() {
    const canvas = document.getElementById('vortex-canvas') as HTMLCanvasElement | null;
    const container = document.getElementById('app');

    if (!canvas || !container) {
      throw new Error('Required DOM elements not found');
    }

    this.canvas = canvas;
    this.appContainer = container;

    this.init();
  }

  private init() {
    this.resizeCanvas();

    this.vortex = new Vortex(this.canvas);
    new InteractionManager(this.canvas, this.vortex);
    new ControlPanel(this.appContainer, this.vortex);

    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onResize = () => {
    this.resizeCanvas();
    this.vortex.resize();
  };

  private resizeCanvas() {
    const rect = this.appContainer.getBoundingClientRect();
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.vortex.stop();
    } else {
      this.vortex.start();
    }
  };

  start() {
    this.vortex.start();
  }
}

function bootstrap() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const app = new App();
      app.start();
    });
  } else {
    const app = new App();
    app.start();
  }
}

bootstrap();
