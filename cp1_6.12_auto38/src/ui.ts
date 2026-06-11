export interface TerrainConfig {
  noiseFrequency: number;
  flatness: number;
  treeDensity: number;
  seed: number;
}

export type TerrainUpdateCallback = (config: TerrainConfig) => void;

export interface UIStats {
  fps: number;
  vertexCount: number;
  treeCount: number;
}

export class UIController {
  private freqSlider: HTMLInputElement;
  private flatSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private seedBtn: HTMLButtonElement;
  private seedBtnText: HTMLSpanElement;
  private seedSpinner: HTMLDivElement;
  private freqValue: HTMLSpanElement;
  private flatValue: HTMLSpanElement;
  private densityValue: HTMLSpanElement;
  private fpsValue: HTMLSpanElement;
  private vertexValue: HTMLSpanElement;
  private treeValue: HTMLSpanElement;
  private loadingOverlay: HTMLDivElement;

  private config: TerrainConfig;
  private updateCallback: TerrainUpdateCallback | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isGenerating: boolean = false;

  constructor() {
    this.freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
    this.flatSlider = document.getElementById('flat-slider') as HTMLInputElement;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.seedBtn = document.getElementById('seed-btn') as HTMLButtonElement;
    this.seedBtnText = document.getElementById('seed-btn-text') as HTMLSpanElement;
    this.seedSpinner = document.getElementById('seed-spinner') as HTMLDivElement;
    this.freqValue = document.getElementById('freq-value') as HTMLSpanElement;
    this.flatValue = document.getElementById('flat-value') as HTMLSpanElement;
    this.densityValue = document.getElementById('density-value') as HTMLSpanElement;
    this.fpsValue = document.getElementById('fps-value') as HTMLSpanElement;
    this.vertexValue = document.getElementById('vertex-value') as HTMLSpanElement;
    this.treeValue = document.getElementById('tree-value') as HTMLSpanElement;
    this.loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;

    this.config = {
      noiseFrequency: parseFloat(this.freqSlider.value),
      flatness: parseFloat(this.flatSlider.value),
      treeDensity: parseInt(this.densitySlider.value),
      seed: Math.floor(Math.random() * 100000)
    };

    this.bindEvents();
    this.updateValueDisplays();
  }

  private bindEvents(): void {
    this.freqSlider.addEventListener('input', () => {
      this.config.noiseFrequency = parseFloat(this.freqSlider.value);
      this.updateValueDisplays();
      this.scheduleUpdate();
    });

    this.flatSlider.addEventListener('input', () => {
      this.config.flatness = parseFloat(this.flatSlider.value);
      this.updateValueDisplays();
      this.scheduleUpdate();
    });

    this.densitySlider.addEventListener('input', () => {
      this.config.treeDensity = parseInt(this.densitySlider.value);
      this.updateValueDisplays();
      this.scheduleUpdate();
    });

    this.seedBtn.addEventListener('click', () => {
      if (this.isGenerating) return;
      this.config.seed = Math.floor(Math.random() * 100000);
      this.triggerUpdate();
    });
  }

  private updateValueDisplays(): void {
    this.freqValue.textContent = this.config.noiseFrequency.toFixed(1);
    this.flatValue.textContent = this.config.flatness.toFixed(2);
    this.densityValue.textContent = `${this.config.treeDensity}%`;
  }

  private scheduleUpdate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerUpdate();
    }, 150);
  }

  private triggerUpdate(): void {
    if (this.updateCallback && !this.isGenerating) {
      this.showLoading();
      this.updateCallback({ ...this.config });
    }
  }

  public onUpdate(callback: TerrainUpdateCallback): void {
    this.updateCallback = callback;
  }

  public getConfig(): TerrainConfig {
    return { ...this.config };
  }

  public showLoading(): void {
    this.isGenerating = true;
    this.loadingOverlay.classList.add('active');
    this.seedBtn.disabled = true;
    this.seedBtnText.style.display = 'none';
    this.seedSpinner.style.display = 'block';
  }

  public hideLoading(): void {
    this.isGenerating = false;
    this.loadingOverlay.classList.remove('active');
    this.seedBtn.disabled = false;
    this.seedBtnText.style.display = 'inline';
    this.seedSpinner.style.display = 'none';
  }

  public updateStats(stats: UIStats): void {
    this.fpsValue.textContent = stats.fps.toString();
    this.vertexValue.textContent = stats.vertexCount.toLocaleString();
    this.treeValue.textContent = stats.treeCount.toString();
  }
}
