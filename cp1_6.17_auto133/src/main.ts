import EventBus from './EventBus';
import { SceneSetup } from './scene-module/sceneSetup';
import { Environment } from './scene-module/environment';
import { LightController } from './scene-module/lightController';
import { UIManager } from './ui-control/uiManager';
import { PerformanceMonitor } from './ui-control/performanceMonitor';

class App {
  private eventBus: EventBus;
  private sceneSetup: SceneSetup;
  private environment: Environment;
  private lightController: LightController;
  private uiManager: UIManager;
  private performanceMonitor: PerformanceMonitor;
  private animationId: number = 0;
  private lastTime: number = performance.now();

  constructor() {
    this.eventBus = new EventBus();
    this.sceneSetup = new SceneSetup('canvas-container', this.eventBus);
    this.environment = new Environment(this.sceneSetup.scene, this.eventBus);
    this.lightController = new LightController(this.sceneSetup.scene, this.eventBus);
    this.uiManager = new UIManager(this.eventBus);
    this.performanceMonitor = new PerformanceMonitor(this.eventBus);

    this.performanceMonitor.setLightCountGetter(() => this.sceneSetup.getLightCount());
    this.performanceMonitor.setTriangleCountGetter(() => this.sceneSetup.getTriangleCount());

    this.start();
  }

  private start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.lightController.update();
      this.environment.update(delta);
      this.sceneSetup.render();
      this.performanceMonitor.update();
    };

    animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.sceneSetup.dispose();
    this.uiManager.dispose();
    this.performanceMonitor.dispose();
  }
}

const app = new App();

(window as any).app = app;
