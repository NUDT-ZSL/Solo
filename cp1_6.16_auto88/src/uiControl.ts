import type { Mode, PresetTrack } from './types';

export interface UICallbacks {
  onPlayPause: () => void;
  onProgressChange: (ratio: number) => void;
  onVolumeChange: (value: number) => void;
  onModeToggle: (mode: Mode) => void;
  onPresetSelect: (track: PresetTrack) => void;
  onFileUpload: (file: File) => void;
}

const PRESET_TRACKS: PresetTrack[] = [
  { id: '1', name: '动感电音', url: undefined },
  { id: '2', name: '舒缓爵士', url: undefined },
  { id: '3', name: '流行节奏', url: undefined },
  { id: '4', name: '古典交响', url: undefined },
];

const PRESET_BPMS: Record<string, number> = {
  '1': 128,
  '2': 96,
  '3': 110,
  '4': 72,
};

export class UIControl {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private infoPanel!: HTMLDivElement;
  private trackNameEl!: HTMLSpanElement;
  private bpmEl!: HTMLSpanElement;
  private presetsContainer!: HTMLDivElement;
  private presetButtons: HTMLButtonElement[] = [];
  private controlBar!: HTMLDivElement;
  private playPauseBtn!: HTMLButtonElement;
  private progressBar!: HTMLDivElement;
  private progressFill!: HTMLDivElement;
  private progressHandle!: HTMLDivElement;
  private volumeSlider!: HTMLInputElement;
  private modeToggleBtn!: HTMLButtonElement;
  private fileInput!: HTMLInputElement;
  private fileUploadBtn!: HTMLButtonElement;
  private currentMode: Mode = 'geometric';
  private isDragging: boolean = false;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createUI();
    this.bindEvents();
  }

  private createUI(): void {
    this.container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    this.createInfoPanel();
    this.createPresets();
    this.createControlBar();
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      background: #1A1B3ACC;
      border-radius: 12px;
      padding: 16px;
      color: white;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 100;
      min-width: 200px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 12px;
      color: #8890B8;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    title.textContent = '当前曲目';

    this.trackNameEl = document.createElement('span');
    this.trackNameEl.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF;
      display: block;
      margin-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    `;
    this.trackNameEl.textContent = '未选择曲目';

    const bpmLabel = document.createElement('div');
    bpmLabel.style.cssText = `
      font-size: 12px;
      color: #8890B8;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    bpmLabel.textContent = 'BPM';

    this.bpmEl = document.createElement('span');
    this.bpmEl.style.cssText = `
      font-size: 28px;
      font-weight: 700;
      color: #FF6B6B;
      font-variant-numeric: tabular-nums;
    `;
    this.bpmEl.textContent = '--';

    this.infoPanel.appendChild(title);
    this.infoPanel.appendChild(this.trackNameEl);
    this.infoPanel.appendChild(bpmLabel);
    this.infoPanel.appendChild(this.bpmEl);
    this.container.appendChild(this.infoPanel);
  }

  private createPresets(): void {
    this.presetsContainer = document.createElement('div');
    this.presetsContainer.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 10px;
      z-index: 100;
      flex-wrap: wrap;
      max-width: calc(100% - 280px);
      justify-content: flex-end;
    `;

    this.fileUploadBtn = document.createElement('button');
    this.fileUploadBtn.style.cssText = `
      padding: 8px 18px;
      border-radius: 999px;
      background: #2D2D4A;
      color: white;
      border: 2px dashed #667;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    `;
    this.fileUploadBtn.textContent = '+ 上传音乐';
    this.fileUploadBtn.addEventListener('mouseenter', () => {
      this.fileUploadBtn.style.background = '#3D3D5A';
    });
    this.fileUploadBtn.addEventListener('mouseleave', () => {
      this.fileUploadBtn.style.background = '#2D2D4A';
    });

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.mp3,.wav,audio/mpeg,audio/wav';
    this.fileInput.style.display = 'none';

    PRESET_TRACKS.forEach((track, index) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding: 8px 18px;
        border-radius: 999px;
        background: #2D2D4A;
        color: white;
        border: none;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      `;
      btn.textContent = track.name;
      btn.dataset.trackId = track.id;

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.selected !== 'true') {
          btn.style.background = '#3D3D5A';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.selected !== 'true') {
          btn.style.background = '#2D2D4A';
        }
      });

      btn.addEventListener('click', () => {
        this.selectPreset(track);
      });

      this.presetButtons.push(btn);
      this.presetsContainer.appendChild(btn);

      if (index === 1) {
        this.presetsContainer.appendChild(this.fileUploadBtn);
        this.presetsContainer.appendChild(this.fileInput);
      }
    });

    if (!this.presetsContainer.contains(this.fileUploadBtn)) {
      this.presetsContainer.appendChild(this.fileUploadBtn);
      this.presetsContainer.appendChild(this.fileInput);
    }

    this.container.appendChild(this.presetsContainer);
  }

  private createControlBar(): void {
    this.controlBar = document.createElement('div');
    this.controlBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #00000066;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 20px;
      z-index: 100;
    `;

    this.playPauseBtn = document.createElement('button');
    this.playPauseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #FF6B6B;
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.15s ease, background 0.2s ease;
    `;
    this.playPauseBtn.innerHTML = this.getPlayIcon();
    this.playPauseBtn.addEventListener('mouseenter', () => {
      this.playPauseBtn.style.transform = 'scale(1.05)';
    });
    this.playPauseBtn.addEventListener('mouseleave', () => {
      this.playPauseBtn.style.transform = 'scale(1)';
    });

    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      flex: 1;
      height: 6px;
      background: #FFFFFF22;
      border-radius: 3px;
      cursor: pointer;
      position: relative;
      min-width: 100px;
    `;

    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #FF6B6B, #4169E1);
      border-radius: 3px;
      transition: width 0.1s linear;
    `;

    this.progressHandle = document.createElement('div');
    this.progressHandle.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0%;
      transform: translate(-50%, -50%);
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.15s ease;
    `;

    this.progressBar.appendChild(this.progressFill);
    this.progressBar.appendChild(this.progressHandle);

    const volumeContainer = document.createElement('div');
    volumeContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    `;

    const volumeIcon = document.createElement('div');
    volumeIcon.style.cssText = `
      color: #FFFFFFCC;
      font-size: 18px;
      display: flex;
      align-items: center;
    `;
    volumeIcon.innerHTML = '🔊';

    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.value = '70';
    this.volumeSlider.style.cssText = `
      width: 80px;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: #FFFFFF33;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    const volumeStyle = document.createElement('style');
    volumeStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: none;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(volumeStyle);

    volumeContainer.appendChild(volumeIcon);
    volumeContainer.appendChild(this.volumeSlider);

    this.modeToggleBtn = document.createElement('button');
    this.modeToggleBtn.style.cssText = `
      padding: 8px 16px;
      border-radius: 999px;
      background: #2D2D4A;
      color: white;
      border: none;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: inherit;
      flex-shrink: 0;
    `;
    this.modeToggleBtn.textContent = '几何光雕';

    this.controlBar.appendChild(this.playPauseBtn);
    this.controlBar.appendChild(this.progressBar);
    this.controlBar.appendChild(volumeContainer);
    this.controlBar.appendChild(this.modeToggleBtn);
    this.container.appendChild(this.controlBar);
  }

  private getPlayIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <polygon points="8,5 19,12 8,19"/>
    </svg>`;
  }

  private getPauseIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="5" width="4" height="14"/>
      <rect x="14" y="5" width="4" height="14"/>
    </svg>`;
  }

  private bindEvents(): void {
    this.playPauseBtn.addEventListener('click', () => {
      this.callbacks.onPlayPause();
    });

    this.progressBar.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.updateProgressFromMouseEvent(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.updateProgressFromMouseEvent(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
      }
    });

    this.progressBar.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.updateProgressFromTouchEvent(e);
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        this.updateProgressFromTouchEvent(e);
      }
    });

    document.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    this.volumeSlider.addEventListener('input', () => {
      const value = parseInt(this.volumeSlider.value) / 100;
      this.callbacks.onVolumeChange(value);
    });

    this.modeToggleBtn.addEventListener('click', () => {
      this.toggleMode();
    });

    this.fileUploadBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.clearPresetSelection();
        this.callbacks.onFileUpload(file);
      }
    });
  }

  private updateProgressFromMouseEvent(e: MouseEvent): void {
    const rect = this.progressBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.setProgress(ratio * 100);
    this.callbacks.onProgressChange(ratio);
  }

  private updateProgressFromTouchEvent(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = this.progressBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    this.setProgress(ratio * 100);
    this.callbacks.onProgressChange(ratio);
  }

  private selectPreset(track: PresetTrack): void {
    this.clearPresetSelection();
    const btn = this.presetButtons.find(b => b.dataset.trackId === track.id);
    if (btn) {
      btn.dataset.selected = 'true';
      btn.style.background = '#FF6B6B';
    }
    const bpm = PRESET_BPMS[track.id] || 120;
    void bpm;
    this.callbacks.onPresetSelect(track);
  }

  private clearPresetSelection(): void {
    this.presetButtons.forEach(btn => {
      btn.dataset.selected = 'false';
      btn.style.background = '#2D2D4A';
    });
  }

  private toggleMode(): void {
    this.currentMode = this.currentMode === 'geometric' ? 'particle' : 'geometric';
    this.modeToggleBtn.textContent = this.currentMode === 'geometric' ? '几何光雕' : '粒子光雕';
    this.callbacks.onModeToggle(this.currentMode);
  }

  setPlaying(playing: boolean): void {
    this.playPauseBtn.innerHTML = playing ? this.getPauseIcon() : this.getPlayIcon();
  }

  setProgress(percent: number): void {
    if (!this.isDragging) {
      this.progressFill.style.width = `${percent}%`;
      this.progressHandle.style.left = `${percent}%`;
    }
  }

  setVolume(percent: number): void {
    this.volumeSlider.value = String(percent * 100);
  }

  setTrackName(name: string): void {
    this.trackNameEl.textContent = name || '未选择曲目';
  }

  setBPM(bpm: number): void {
    if (bpm > 0) {
      this.bpmEl.textContent = String(bpm);
    } else {
      this.bpmEl.textContent = '--';
    }
  }

  getPresetBPM(trackId: string): number {
    return PRESET_BPMS[trackId] || 120;
  }

  getMode(): Mode {
    return this.currentMode;
  }
}
