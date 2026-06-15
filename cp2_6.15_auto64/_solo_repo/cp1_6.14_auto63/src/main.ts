import { RendererModule } from './renderer/Renderer';
import { CameraController } from './interaction/CameraController';
import { InputHandler } from './interaction/InputHandler';
import { ParticleSystem } from './core/ParticleSystem';
import { UIControlPanel } from './ui/UIControlPanel';
import { eventBus, AppEvents } from './events/EventBus';

class AquaFlowApp {
  private container: HTMLElement;
  private rendererModule: RendererModule;
  private cameraController: CameraController;
  private inputHandler: InputHandler;
  private particleSystem: ParticleSystem;
  private uiControlPanel: UIControlPanel;

  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    this.container = container;

    this.rendererModule = new RendererModule(this.container);
    this.cameraController = new CameraController(this.rendererModule.camera);
    this.inputHandler = new InputHandler(this.container, this.cameraController);
    this.particleSystem = new ParticleSystem(this.rendererModule);
    this.uiControlPanel = new UIControlPanel(this.container);

    this.setupGlobalEventListeners();
    this.logInitialization();
  }

  private setupGlobalEventListeners(): void {
    eventBus.on('camera:reset', () => {
      this.cameraController.reset();
    });

    eventBus.on('simulation:reset', () => {
      this.particleSystem.reset();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (this.isRunning) {
        this.lastTime = performance.now();
        this.start();
      }
    });
  }

  private logInitialization(): void {
    console.log(
      '%c AquaFlow ',
      'background: linear-gradient(90deg, #1a237e, #64b5f6); color: white; font-size: 16px; font-weight: bold; padding: 4px 12px; border-radius: 4px;'
    );
    console.log(
      '%c 3D流体粒子模拟系统已初始化',
      'color: #64b5f6; font-weight: bold;'
    );
    console.log('  ├─ 控制方式:');
    console.log('  │   • 左键拖拽: 对流体施加力场');
    console.log('  │   • 右键拖拽: 旋转视角');
    console.log('  │   • 中键/Shift+拖拽: 平移视角');
    console.log('  │   • 滚轮: 缩放视角');
    console.log('  │   • 数字键 1/2/3: 切换水/烟雾/火焰');
    console.log('  │   • R键: 重置视角');
    console.log('  │   • G键: 展开/折叠控制面板');
    console.log('  └─ Enjoy! 🚀');
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.tick(deltaTime);
  }

  private tick(deltaTime: number): void {
    const simStartTime = performance.now();

    this.cameraController.update(deltaTime);
    this.particleSystem.update(deltaTime);
    this.rendererModule.update(deltaTime);
    this.rendererModule.render();
    this.uiControlPanel.updateFPS();

    const simTime = performance.now() - simStartTime;
    if (simTime > 16) {
      console.warn(`[Performance] Frame simulation time: ${simTime.toFixed(1)}ms (target < 16ms)`);
    }
  }

  public dispose(): void {
    this.stop();
    this.inputHandler.dispose();
    this.particleSystem.dispose();
    this.uiControlPanel.dispose();
    this.rendererModule.dispose();
    eventBus.clear();
  }

  public getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }

  public getRendererModule(): RendererModule {
    return this.rendererModule;
  }

  public getCameraController(): CameraController {
    return this.cameraController;
  }
}

let app: AquaFlowApp | null = null;

const initApp = () => {
  try {
    app = new AquaFlowApp('app');
    app.start();
    (window as any).aquaFlow = app;
  } catch (error) {
    console.error('Failed to initialize AquaFlow:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: #ff7043;
      padding: 30px 40px;
      border-radius: 12px;
      font-family: sans-serif;
      z-index: 9999;
      text-align: center;
      max-width: 500px;
    `;
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 15px; color: #ef5350;">初始化失败</h3>
      <p style="margin: 0 0 10px; font-size: 14px;">${error instanceof Error ? error.message : '未知错误'}</p>
      <p style="margin: 0; font-size: 12px; color: #999;">请检查浏览器是否支持WebGL</p>
    `;
    document.body.appendChild(errorDiv);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export default AquaFlowApp;
