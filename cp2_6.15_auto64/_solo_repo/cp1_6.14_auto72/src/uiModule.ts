import GUI from 'lil-gui';
import EventBus from './eventBus';

export interface UIParams {
  heatSourceIntensity: number;
  vortexDensity: number;
  displayMode: string;
}

export class UIModule {
  private eventBus: EventBus;
  private gui: GUI | null = null;

  public params: UIParams = {
    heatSourceIntensity: 50,
    vortexDensity: 150,
    displayMode: 'both',
  };

  private defaultParams: UIParams = {
    heatSourceIntensity: 50,
    vortexDensity: 150,
    displayMode: 'both',
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public initialize(): void {
    const container = document.getElementById('gui-container');
    if (!container) return;

    this.gui = new GUI({
      container,
      autoPlace: false,
      width: 248 as any,
    });

    this.createControls();
    this.setupResetButton();
    this.setupMobileToggle();
    this.applyResponsiveState();
  }

  private applyResponsiveState(): void {
    const uiPanel = document.getElementById('ui-panel');
    const toggleBtn = document.getElementById('mobile-toggle');
    if (!uiPanel || !toggleBtn) return;

    if (window.innerWidth < 768) {
      uiPanel.classList.remove('expanded');
      toggleBtn.textContent = '展开面板';
    } else {
      uiPanel.classList.remove('expanded');
      toggleBtn.textContent = '展开面板';
    }
  }

  private createControls(): void {
    if (!this.gui) return;

    this.gui
      .add(this.params, 'heatSourceIntensity', 0, 100, 1)
      .name('热源强度')
      .onChange(() => {
        this.emitParamsChanged();
      });

    this.gui
      .add(this.params, 'vortexDensity', 50, 300, 5)
      .name('涡流密度')
      .onChange(() => {
        this.emitParamsChanged();
      });

    this.gui
      .add(this.params, 'displayMode', {
        热力图: 'heatmap',
        流线场: 'streamlines',
        叠加: 'both',
      })
      .name('显示模式')
      .onChange(() => {
        this.emitParamsChanged();
      });
  }

  private setupResetButton(): void {
    const resetBtn = document.getElementById('reset-btn');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
    });
  }

  private setupMobileToggle(): void {
    const toggleBtn = document.getElementById('mobile-toggle');
    const uiPanel = document.getElementById('ui-panel');
    if (!toggleBtn || !uiPanel) return;

    toggleBtn.addEventListener('click', () => {
      uiPanel.classList.toggle('expanded');
      if (uiPanel.classList.contains('expanded')) {
        toggleBtn.textContent = '收起面板';
      } else {
        toggleBtn.textContent = '展开面板';
      }
    });
  }

  private emitParamsChanged(): void {
    const params = {
      heatSourceIntensity: this.params.heatSourceIntensity,
      vortexDensity: this.params.vortexDensity,
      displayMode: this.params.displayMode as 'heatmap' | 'streamlines' | 'both',
    };
    this.eventBus.emit('params:changed', params);
  }

  public resetToDefaults(): void {
    this.params = { ...this.defaultParams };

    if (this.gui) {
      this.gui.controllers.forEach((controller) => {
        controller.updateDisplay();
      });
    }

    this.emitParamsChanged();
    this.eventBus.emit('reset:camera');
  }

  public getParams(): UIParams {
    return { ...this.params };
  }

  public dispose(): void {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }

  public handleResize(): void {
    const uiPanel = document.getElementById('ui-panel');
    const toggleBtn = document.getElementById('mobile-toggle');
    if (!uiPanel || !toggleBtn) return;

    if (window.innerWidth < 768) {
      uiPanel.classList.remove('expanded');
      toggleBtn.textContent = '展开面板';
    }
  }
}

export default UIModule;
