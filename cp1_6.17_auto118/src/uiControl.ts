import { GrowthParams } from './rootGrowth';

export interface UIStats {
  mainLength: number;
  sideCount: number;
  totalNodes: number;
  fps: number;
}

export type ParamChangeHandler = (params: Partial<GrowthParams>) => void;

export class UIControl {
  private panel!: HTMLElement;
  private panelToggle!: HTMLElement;
  private panelContent!: HTMLElement;
  private isCollapsed: boolean = false;

  private sliderGrowth!: HTMLInputElement;
  private sliderMaxLen!: HTMLInputElement;
  private sliderBranch!: HTMLInputElement;
  private sliderWater!: HTMLInputElement;

  private valGrowth!: HTMLElement;
  private valMaxLen!: HTMLElement;
  private valBranch!: HTMLElement;
  private valWater!: HTMLElement;

  private statMainLen!: HTMLElement;
  private statSides!: HTMLElement;
  private statNodes!: HTMLElement;
  private statFps!: HTMLElement;

  private paramHandler: ParamChangeHandler | null = null;

  public init(): void {
    this.cacheElements();
    this.bindEvents();
  }

  private cacheElements(): void {
    this.panel = document.getElementById('control-panel') as HTMLElement;
    this.panelToggle = document.getElementById('panel-toggle') as HTMLElement;
    this.panelContent = document.getElementById('panel-content') as HTMLElement;

    this.sliderGrowth = document.getElementById('slider-growth') as HTMLInputElement;
    this.sliderMaxLen = document.getElementById('slider-maxlen') as HTMLInputElement;
    this.sliderBranch = document.getElementById('slider-branch') as HTMLInputElement;
    this.sliderWater = document.getElementById('slider-water') as HTMLInputElement;

    this.valGrowth = document.getElementById('val-growth') as HTMLElement;
    this.valMaxLen = document.getElementById('val-maxlen') as HTMLElement;
    this.valBranch = document.getElementById('val-branch') as HTMLElement;
    this.valWater = document.getElementById('val-water') as HTMLElement;

    this.statMainLen = document.getElementById('stat-mainlen') as HTMLElement;
    this.statSides = document.getElementById('stat-sides') as HTMLElement;
    this.statNodes = document.getElementById('stat-nodes') as HTMLElement;
    this.statFps = document.getElementById('stat-fps') as HTMLElement;
  }

  private bindEvents(): void {
    this.panelToggle.addEventListener('click', () => this.togglePanel());

    this.sliderGrowth.addEventListener('input', () => {
      const v = parseFloat(this.sliderGrowth.value);
      this.valGrowth.textContent = v.toFixed(2);
      this.notifyChange({ growthRate: v });
    });

    this.sliderMaxLen.addEventListener('input', () => {
      const v = parseFloat(this.sliderMaxLen.value);
      this.valMaxLen.textContent = v.toFixed(1);
      this.notifyChange({ maxRootLength: v });
    });

    this.sliderBranch.addEventListener('input', () => {
      const v = parseFloat(this.sliderBranch.value);
      this.valBranch.textContent = v.toFixed(2);
      this.notifyChange({ branchProbability: v });
    });

    this.sliderWater.addEventListener('input', () => {
      const v = parseFloat(this.sliderWater.value);
      this.valWater.textContent = v.toFixed(2);
      this.notifyChange({ waterAttractionStrength: v });
    });
  }

  private togglePanel(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.panel.classList.add('collapsed');
      this.panelToggle.textContent = '❯';
      this.panelContent.style.display = 'none';
    } else {
      this.panel.classList.remove('collapsed');
      this.panelToggle.textContent = '❮';
      this.panelContent.style.display = 'block';
    }
  }

  private notifyChange(params: Partial<GrowthParams>): void {
    if (this.paramHandler) {
      const t0 = performance.now();
      this.paramHandler(params);
      const elapsed = performance.now() - t0;
      if (elapsed > 100) {
        console.warn(`参数更新耗时 ${elapsed.toFixed(1)}ms，超过 100ms 阈值`);
      }
    }
  }

  public onParamChange(handler: ParamChangeHandler): void {
    this.paramHandler = handler;
  }

  public updateStats(stats: UIStats): void {
    this.statMainLen.textContent = stats.mainLength.toFixed(2);
    this.statSides.textContent = stats.sideCount.toString();
    this.statNodes.textContent = stats.totalNodes.toString();
    this.statFps.textContent = Math.round(stats.fps).toString();

    if (stats.fps >= 60) {
      this.statFps.style.color = '#4CAF50';
    } else if (stats.fps >= 30) {
      this.statFps.style.color = '#FFC107';
    } else {
      this.statFps.style.color = '#F44336';
    }
  }

  public getParams(): GrowthParams {
    return {
      growthRate: parseFloat(this.sliderGrowth.value),
      maxRootLength: parseFloat(this.sliderMaxLen.value),
      branchProbability: parseFloat(this.sliderBranch.value),
      waterAttractionStrength: parseFloat(this.sliderWater.value)
    };
  }
}
