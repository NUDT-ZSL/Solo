import { GUI } from 'dat.gui';
import { eventBus, AppEvents, FluidType, FluidParams } from '../events/EventBus';

export class UIControlPanel {
  private gui: GUI;
  private container: HTMLElement;

  private params: FluidParams & { fluidType: FluidType } = {
    particleCount: 3000,
    particleSize: 1.0,
    gravity: -9.8,
    windX: 0,
    windY: 0,
    windZ: 0,
    windStrength: 0,
    vortexRadius: 5,
    vortexStrength: 0,
    fluidType: 'water',
  };

  private fluidButtons: NodeListOf<HTMLElement>;
  private fpsElement: HTMLElement | null;
  private particleCountElement: HTMLElement | null;
  private fluidTypeElement: HTMLElement | null;
  private perfWarningElement: HTMLElement | null;
  private guiToggleBtn: HTMLElement | null;

  private fpsFrames: number = 0;
  private fpsLastTime: number = performance.now();
  private fpsSmoothed: number = 60;
  private lowFpsFrames: number = 0;
  private hasReducedParticles: boolean = false;

  private particleFolder: GUI | null = null;
  private physicsFolder: GUI | null = null;
  private windFolder: GUI | null = null;
  private vortexFolder: GUI | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.gui = new GUI({ autoPlace: true, closed: true, width: 320 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '120px';
    this.gui.domElement.style.right = '16px';

    this.fluidButtons = this.container.querySelectorAll('.fluid-btn');
    this.fpsElement = this.container.querySelector('.fps-counter');
    this.particleCountElement = this.container.querySelector('#particleCount');
    this.fluidTypeElement = this.container.querySelector('#fluidType');
    this.perfWarningElement = this.container.querySelector('#perfWarning');
    this.guiToggleBtn = this.container.querySelector('#guiToggle');

    this.setupFluidButtons();
    this.setupGuiToggle();
    this.buildGui();
    this.setupEventListeners();
    this.updateFluidButtonState();
  }

  private setupFluidButtons(): void {
    this.fluidButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const fluidType = btn.dataset.fluid as FluidType;
        if (fluidType && fluidType !== this.params.fluidType) {
          this.params.fluidType = fluidType;
          eventBus.emit(AppEvents.FLUID_TYPE_CHANGED, fluidType);
          this.updateFluidButtonState();
        }
      });
    });
  }

  private setupGuiToggle(): void {
    if (this.guiToggleBtn) {
      this.guiToggleBtn.addEventListener('click', () => {
        const dgMain = document.querySelector('.dg.ac') as HTMLElement;
        if (dgMain) {
          const closeBtn = dgMain.querySelector('.close-button') as HTMLElement;
          if (closeBtn) {
            closeBtn.click();
          }
        }
      });
    }
  }

  private buildGui(): void {
    this.particleFolder = this.gui.addFolder('粒子参数');
    this.particleFolder
      .add(this.params, 'particleCount', 100, 5000, 100)
      .name('粒子数量')
      .onChange((value: number) => {
        eventBus.emit(AppEvents.SIMULATION_PARAMS_CHANGED, { particleCount: value });
        this.updateParticleCountDisplay(value);
      });

    this.particleFolder
      .add(this.params, 'particleSize', 0.1, 2.0, 0.01)
      .name('粒子大小')
      .onChange((value: number) => {
        eventBus.emit(AppEvents.PARTICLE_PARAMS_CHANGED, { particleSize: value });
      });

    this.physicsFolder = this.gui.addFolder('物理参数');
    this.physicsFolder
      .add(this.params, 'gravity', -10, 10, 0.1)
      .name('重力强度')
      .onChange((value: number) => {
        eventBus.emit(AppEvents.SIMULATION_PARAMS_CHANGED, { gravity: value });
      });

    this.windFolder = this.physicsFolder.addFolder('风力');
    this.windFolder
      .add(this.params, 'windX', -1, 1, 0.01)
      .name('X方向')
      .onChange(this.emitWindParams.bind(this));
    this.windFolder
      .add(this.params, 'windY', -1, 1, 0.01)
      .name('Y方向')
      .onChange(this.emitWindParams.bind(this));
    this.windFolder
      .add(this.params, 'windZ', -1, 1, 0.01)
      .name('Z方向')
      .onChange(this.emitWindParams.bind(this));
    this.windFolder
      .add(this.params, 'windStrength', 0, 20, 0.1)
      .name('强度')
      .onChange(this.emitWindParams.bind(this));

    this.vortexFolder = this.physicsFolder.addFolder('涡流');
    this.vortexFolder
      .add(this.params, 'vortexRadius', 0, 20, 0.5)
      .name('半径')
      .onChange(this.emitVortexParams.bind(this));
    this.vortexFolder
      .add(this.params, 'vortexStrength', 0, 30, 0.5)
      .name('强度')
      .onChange(this.emitVortexParams.bind(this));

    const typeFolder = this.gui.addFolder('流体类型');
    typeFolder
      .add(this.params, 'fluidType', ['water', 'smoke', 'fire'])
      .name('类型')
      .onChange((value: FluidType) => {
        this.params.fluidType = value;
        eventBus.emit(AppEvents.FLUID_TYPE_CHANGED, value);
        this.updateFluidButtonState();
      });

    const resetObj = {
      '重置视角': () => eventBus.emit('camera:reset'),
      '重置模拟': () => eventBus.emit('simulation:reset'),
    };
    const resetFolder = this.gui.addFolder('操作');
    resetFolder.add(resetObj, '重置视角');
    resetFolder.add(resetObj, '重置模拟');

    this.particleFolder.open();
    this.physicsFolder.open();
  }

  private emitWindParams(): void {
    eventBus.emit(AppEvents.SIMULATION_PARAMS_CHANGED, {
      windX: this.params.windX,
      windY: this.params.windY,
      windZ: this.params.windZ,
      windStrength: this.params.windStrength,
    });
  }

  private emitVortexParams(): void {
    eventBus.emit(AppEvents.SIMULATION_PARAMS_CHANGED, {
      vortexRadius: this.params.vortexRadius,
      vortexStrength: this.params.vortexStrength,
    });
  }

  private setupEventListeners(): void {
    eventBus.on(AppEvents.FLUID_TYPE_CHANGED, (type: FluidType) => {
      this.params.fluidType = type;
      this.updateFluidButtonState();
      this.updateFluidTypeDisplay(type);
    });

    eventBus.on(AppEvents.PARTICLE_COUNT_CHANGED, (count: number) => {
      this.updateParticleCountDisplay(count);
    });

    eventBus.on('camera:reset', () => {
      eventBus.emit(AppEvents.CAMERA_ORBIT, 0, 0);
    });

    eventBus.on('simulation:reset', () => {
      eventBus.emit(AppEvents.SIMULATION_PARAMS_CHANGED, { particleCount: this.params.particleCount });
    });
  }

  private updateFluidButtonState(): void {
    this.fluidButtons.forEach((btn) => {
      const type = btn.dataset.fluid;
      btn.classList.remove('active-water', 'active-smoke', 'active-fire');
      if (type === this.params.fluidType) {
        btn.classList.add(`active-${type}`);
      }
    });
  }

  private updateParticleCountDisplay(count: number): void {
    if (this.particleCountElement) {
      this.particleCountElement.textContent = String(count);
    }
  }

  private updateFluidTypeDisplay(type: FluidType): void {
    if (this.fluidTypeElement) {
      const typeMap: Record<FluidType, string> = {
        water: '水',
        smoke: '烟雾',
        fire: '火焰',
      };
      this.fluidTypeElement.textContent = typeMap[type];
    }
  }

  public updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    const elapsed = now - this.fpsLastTime;

    if (elapsed >= 500) {
      const fps = (this.fpsFrames * 1000) / elapsed;
      this.fpsSmoothed = this.fpsSmoothed * 0.7 + fps * 0.3;

      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${this.fpsSmoothed.toFixed(0)}`;
        if (this.fpsSmoothed < 50) {
          this.fpsElement.style.color = '#ff7043';
        } else if (this.fpsSmoothed < 55) {
          this.fpsElement.style.color = '#ffca28';
        } else {
          this.fpsElement.style.color = '#ffffff';
        }
      }

      this.checkPerformance(this.fpsSmoothed);

      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  private checkPerformance(fps: number): void {
    if (fps < 50 && !this.hasReducedParticles) {
      this.lowFpsFrames++;
      if (this.lowFpsFrames >= 3) {
        this.reduceParticlesForPerformance();
      }
    } else {
      this.lowFpsFrames = Math.max(0, this.lowFpsFrames - 1);
    }
  }

  private reduceParticlesForPerformance(): void {
    if (this.hasReducedParticles) return;
    this.hasReducedParticles = true;

    if (this.params.particleCount > 1500) {
      this.params.particleCount = 1500;
      eventBus.emit(AppEvents.SIMULATION_PARAMS_CHANGED, { particleCount: 1500 });
      this.updateParticleCountDisplay(1500);
      eventBus.emit(AppEvents.PERFORMANCE_WARNING, true);
      this.showPerformanceWarning();
    }
  }

  private showPerformanceWarning(): void {
    if (this.perfWarningElement) {
      this.perfWarningElement.classList.add('show');
      setTimeout(() => {
        this.perfWarningElement?.classList.remove('show');
      }, 5000);
    }
  }

  public getCurrentFluidType(): FluidType {
    return this.params.fluidType;
  }

  public getParams(): FluidParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.gui.destroy();
    this.fluidButtons.forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true));
    });
  }
}
