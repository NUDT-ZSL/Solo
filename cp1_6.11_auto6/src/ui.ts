import { 
  AtmosphereType, 
  PathMemory,
  DEFAULT_PARTICLE_DENSITY,
  DEFAULT_PLAYBACK_SPEED
} from './path';

export type AppMode = 'draw' | 'playback';

export interface UIState {
  mode: AppMode;
  particleDensity: number;
  playbackSpeed: number;
  pathName: string;
  author: string;
  canAddAtmosphere: boolean;
}

export interface UIHandlers {
  onModeChange: (mode: AppMode) => void;
  onParticleDensityChange: (value: number) => void;
  onPlaybackSpeedChange: (value: number) => void;
  onAddAtmosphere: (type: AtmosphereType) => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onAuthorChange: (author: string) => void;
  onPathNameChange: (name: string) => void;
}

export class UIController {
  private state: UIState;
  private handlers: UIHandlers;
  
  private modeDrawBtn!: HTMLButtonElement;
  private modePlaybackBtn!: HTMLButtonElement;
  private particleDensitySlider!: HTMLInputElement;
  private particleDensityValue!: HTMLSpanElement;
  private playbackSpeedSlider!: HTMLInputElement;
  private playbackSpeedValue!: HTMLSpanElement;
  private saveBtn!: HTMLButtonElement;
  private loadBtn!: HTMLButtonElement;
  private loadInput!: HTMLInputElement;
  private addAtmosphereBtn!: HTMLButtonElement;
  private atmospherePicker!: HTMLDivElement;
  private atmosphereCards!: NodeListOf<HTMLDivElement>;
  private pathNameEl!: HTMLInputElement;
  private authorInput!: HTMLInputElement;
  private rightPanel!: HTMLElement;
  private leftPanel!: HTMLElement;
  private mobileToolbarToggle!: HTMLButtonElement;

  constructor(handlers: UIHandlers) {
    this.handlers = handlers;
    this.state = {
      mode: 'draw',
      particleDensity: DEFAULT_PARTICLE_DENSITY,
      playbackSpeed: DEFAULT_PLAYBACK_SPEED,
      pathName: '',
      author: '',
      canAddAtmosphere: false
    };
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.modeDrawBtn = document.getElementById('mode-draw') as HTMLButtonElement;
    this.modePlaybackBtn = document.getElementById('mode-playback') as HTMLButtonElement;
    this.particleDensitySlider = document.getElementById('particle-density') as HTMLInputElement;
    this.particleDensityValue = document.getElementById('particle-density-value') as HTMLSpanElement;
    this.playbackSpeedSlider = document.getElementById('playback-speed') as HTMLInputElement;
    this.playbackSpeedValue = document.getElementById('playback-speed-value') as HTMLSpanElement;
    this.saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    this.loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
    this.loadInput = document.getElementById('load-input') as HTMLInputElement;
    this.addAtmosphereBtn = document.getElementById('add-atmosphere-btn') as HTMLButtonElement;
    this.atmospherePicker = document.getElementById('atmosphere-picker') as HTMLDivElement;
    this.atmosphereCards = document.querySelectorAll('.atmosphere-card') as NodeListOf<HTMLDivElement>;
    this.pathNameEl = document.getElementById('path-name') as HTMLInputElement;
    this.authorInput = document.getElementById('author-input') as HTMLInputElement;
    this.rightPanel = document.getElementById('right-panel') as HTMLElement;
    this.leftPanel = document.getElementById('left-panel') as HTMLElement;
    this.mobileToolbarToggle = document.getElementById('mobile-toolbar-toggle') as HTMLButtonElement;
  }

  private bindEvents(): void {
    this.modeDrawBtn.addEventListener('click', () => {
      this.setMode('draw');
      this.handlers.onModeChange('draw');
    });

    this.modePlaybackBtn.addEventListener('click', () => {
      this.setMode('playback');
      this.handlers.onModeChange('playback');
    });

    this.particleDensitySlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.setParticleDensity(value);
      this.handlers.onParticleDensityChange(value);
    });

    this.playbackSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.setPlaybackSpeed(value);
      this.handlers.onPlaybackSpeedChange(value);
    });

    this.saveBtn.addEventListener('click', () => {
      this.saveBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.saveBtn.style.transform = '';
      }, 200);
      this.handlers.onSave();
    });

    this.loadBtn.addEventListener('click', () => {
      this.loadInput.click();
    });

    this.loadInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handlers.onLoad(files[0]);
      }
      this.loadInput.value = '';
    });

    this.addAtmosphereBtn.addEventListener('click', () => {
      this.toggleAtmospherePicker();
    });

    this.atmosphereCards.forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.dataset.type as AtmosphereType;
        if (type) {
          this.handlers.onAddAtmosphere(type);
          this.hideAtmospherePicker();
        }
      });
    });

    this.authorInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.state.author = value;
      this.handlers.onAuthorChange(value);
    });

    this.pathNameEl.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.state.pathName = value;
      this.handlers.onPathNameChange(value);
    });

    this.mobileToolbarToggle.addEventListener('click', () => {
      this.toggleMobilePanels();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!this.rightPanel.contains(target) && !this.atmospherePicker.classList.contains('hidden')) {
        if (!target.closest('#add-atmosphere-btn')) {
          this.hideAtmospherePicker();
        }
      }
    });
  }

  public setMode(mode: AppMode): void {
    this.state.mode = mode;
    
    if (mode === 'draw') {
      this.modeDrawBtn.classList.add('active');
      this.modePlaybackBtn.classList.remove('active');
      this.rightPanel.classList.remove('hidden');
      this.rightPanel.classList.remove('mobile-open');
    } else {
      this.modePlaybackBtn.classList.add('active');
      this.modeDrawBtn.classList.remove('active');
      this.rightPanel.classList.add('hidden');
      this.rightPanel.classList.remove('mobile-open');
    }
    
    this.leftPanel.classList.remove('mobile-open');
  }

  public setParticleDensity(value: number): void {
    this.state.particleDensity = value;
    this.particleDensityValue.textContent = value.toString();
  }

  public setPlaybackSpeed(value: number): void {
    this.state.playbackSpeed = value;
    this.playbackSpeedValue.textContent = value.toFixed(1) + 'x';
  }

  public setPathName(name: string): void {
    this.state.pathName = name;
    this.pathNameEl.value = name || '未命名路径';
  }

  public setAuthor(author: string): void {
    this.state.author = author;
    this.authorInput.value = author;
  }

  public setCanAddAtmosphere(can: boolean): void {
    this.state.canAddAtmosphere = can;
    this.addAtmosphereBtn.disabled = !can;
    if (can) {
      this.addAtmosphereBtn.classList.remove('disabled');
    } else {
      this.addAtmosphereBtn.classList.add('disabled');
      this.hideAtmospherePicker();
    }
  }

  private toggleAtmospherePicker(): void {
    if (!this.state.canAddAtmosphere) return;
    
    if (this.atmospherePicker.classList.contains('hidden')) {
      this.showAtmospherePicker();
    } else {
      this.hideAtmospherePicker();
    }
  }

  private showAtmospherePicker(): void {
    this.atmospherePicker.classList.remove('hidden');
    this.atmospherePicker.style.animation = 'slideInRight 0.3s ease-out';
  }

  private hideAtmospherePicker(): void {
    this.atmospherePicker.classList.add('hidden');
  }

  private toggleMobilePanels(): void {
    const isOpen = this.leftPanel.classList.contains('mobile-open');
    if (isOpen) {
      this.leftPanel.classList.remove('mobile-open');
      if (this.state.mode === 'draw') {
        this.rightPanel.classList.remove('mobile-open');
      }
    } else {
      this.leftPanel.classList.add('mobile-open');
      if (this.state.mode === 'draw') {
        this.rightPanel.classList.add('mobile-open');
      }
    }
  }

  public showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.animation = 'toastIn 0.3s ease-out';
    });

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease-in';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2500);
  }

  public downloadFile(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public updateFromMemory(memory: PathMemory): void {
    this.setParticleDensity(memory.particleDensity);
    this.setPlaybackSpeed(memory.playbackSpeed);
    this.setPathName(memory.name);
    this.setAuthor(memory.author);
    this.particleDensitySlider.value = memory.particleDensity.toString();
    this.playbackSpeedSlider.value = memory.playbackSpeed.toString();
  }
}
