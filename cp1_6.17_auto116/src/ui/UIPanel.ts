import {
  eventBus,
  globalState,
  updateGlobalState,
  type FreqBandData,
  type ColorTheme,
  type ParticleParams
} from '../shared/GlobalState';

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private densitySlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private themeSelect: HTMLSelectElement;
  private uploadButton: HTMLDivElement;
  private fileInput: HTMLInputElement;
  private energyBarLow: HTMLDivElement;
  private energyBarMid: HTMLDivElement;
  private energyBarHigh: HTMLDivElement;
  private fileInfoBar: HTMLDivElement;
  private playerBar: HTMLDivElement;
  private playPauseBtn: HTMLButtonElement;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private playIcon: string = '<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M8 5v14l11-7z"/></svg>';
  private pauseIcon: string = '<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  private isDraggingProgress: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;

    this.panel = this.createPanel();
    this.fileInfoBar = this.createFileInfoBar();
    this.playerBar = this.createPlayerBar();

    const densityControl = this.createSlider(
      '粒子密度',
      500, 2000, 100, globalState.particleParams.density,
      (value) => {
        const params: Partial<ParticleParams> = { density: value };
        updateGlobalState({
          particleParams: { ...globalState.particleParams, density: value }
        });
        eventBus.emit('paramChange', params);
      },
      (value) => `${value}粒`
    );

    const speedControl = this.createSlider(
      '扩散速度',
      0.5, 3.0, 0.1, globalState.particleParams.speed,
      (value) => {
        const params: Partial<ParticleParams> = { speed: value };
        updateGlobalState({
          particleParams: { ...globalState.particleParams, speed: value }
        });
        eventBus.emit('paramChange', params);
      },
      (value) => value.toFixed(1) + 'x'
    );

    const themeControl = this.createThemeSelect();

    const uploadControl = this.createUploadButton();

    const energyControl = this.createEnergyBar();

    this.panel.appendChild(densityControl);
    this.panel.appendChild(speedControl);
    this.panel.appendChild(themeControl);
    this.panel.appendChild(uploadControl);
    this.panel.appendChild(energyControl);

    this.densitySlider = densityControl.querySelector('input') as HTMLInputElement;
    this.speedSlider = speedControl.querySelector('input') as HTMLInputElement;
    this.themeSelect = themeControl.querySelector('select') as HTMLSelectElement;
    this.uploadButton = uploadControl.querySelector('.upload-btn') as HTMLDivElement;
    this.fileInput = uploadControl.querySelector('input[type="file"]') as HTMLInputElement;

    this.energyBarLow = energyControl.querySelector('.energy-low') as HTMLDivElement;
    this.energyBarMid = energyControl.querySelector('.energy-mid') as HTMLDivElement;
    this.energyBarHigh = energyControl.querySelector('.energy-high') as HTMLDivElement;

    this.playPauseBtn = this.playerBar.querySelector('.play-pause-btn') as HTMLButtonElement;
    this.progressBar = this.playerBar.querySelector('.progress-bar') as HTMLDivElement;
    this.progressFill = this.playerBar.querySelector('.progress-fill') as HTMLDivElement;

    this.setupUploadEvents();
    this.setupPlayerEvents();
    this.setupEventBusListeners();

    container.appendChild(this.panel);
    container.appendChild(this.fileInfoBar);
    container.appendChild(this.playerBar);
  }

  private setupEventBusListeners(): void {
    eventBus.on('freqDataUpdate', (data: FreqBandData) => {
      this.updateEnergy(data);
    });

    eventBus.on('stateUpdate', () => {
      this.setPlaying(globalState.isPlaying);
    });

    eventBus.on('audioStateChange', (state: string) => {
      this.setPlaying(state === 'playing');
    });

    eventBus.on('audioLoaded', (data: { fileName: string; duration: number }) => {
      this.showFileInfo(data.fileName, data.duration);
    });

    eventBus.on('audioTimeUpdate', (data: { currentTime: number; duration: number }) => {
      this.updateTime(data.currentTime, data.duration);
    });

    eventBus.on('audioLoadError', (message: string) => {
      this.setUploadError(message);
    });
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 240px;
      background: rgba(20, 20, 30, 0.85);
      border-radius: 10px;
      padding: 20px;
      color: #E0E0E0;
      font-size: 13px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      user-select: none;
    `;
    return panel;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (value: number) => void,
    formatValue: (value: number) => string
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 18px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: #E0E0E0;
      font-weight: 500;
    `;

    const valueEl = document.createElement('span');
    valueEl.textContent = formatValue(value);
    valueEl.style.cssText = `
      color: #3498DB;
      font-weight: 600;
      font-size: 12px;
      transition: color 0.2s ease;
    `;

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    slider.style.cssText = `
      width: 100%;
      height: 4px;
      appearance: none;
      -webkit-appearance: none;
      background: #555;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
      transition: background 0.2s ease;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #7F8C8D;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.2s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #3498DB;
        transform: scale(1.15);
      }
      input[type="range"]::-webkit-slider-thumb:active {
        background: #3498DB;
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #7F8C8D;
        cursor: pointer;
        border: none;
        transition: background 0.2s ease, transform 0.2s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #3498DB;
        transform: scale(1.15);
      }
    `;
    wrapper.appendChild(styleEl);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = formatValue(v);
      onChange(v);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);

    return wrapper;
  }

  private createThemeSelect(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 18px;
    `;

    const label = document.createElement('div');
    label.textContent = '颜色主题';
    label.style.cssText = `
      color: #E0E0E0;
      font-weight: 500;
      margin-bottom: 8px;
    `;

    const select = document.createElement('select');
    select.innerHTML = `
      <option value="neon" ${globalState.particleParams.theme === 'neon' ? 'selected' : ''}>霓虹</option>
      <option value="sunny" ${globalState.particleParams.theme === 'sunny' ? 'selected' : ''}>暖阳</option>
      <option value="aurora" ${globalState.particleParams.theme === 'aurora' ? 'selected' : ''}>极光</option>
    `;
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: #2C2C3E;
      border: 1px solid #444;
      border-radius: 6px;
      color: #E0E0E0;
      font-size: 13px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    `;

    select.addEventListener('mouseenter', () => {
      select.style.borderColor = '#7F8C8D';
    });
    select.addEventListener('mouseleave', () => {
      select.style.borderColor = '#444';
    });
    select.addEventListener('focus', () => {
      select.style.borderColor = '#3498DB';
      select.style.boxShadow = '0 0 0 2px rgba(52, 152, 219, 0.2)';
    });
    select.addEventListener('blur', () => {
      select.style.borderColor = '#444';
      select.style.boxShadow = 'none';
    });

    select.addEventListener('change', () => {
      const theme = select.value as ColorTheme;
      updateGlobalState({
        particleParams: { ...globalState.particleParams, theme }
      });
      eventBus.emit('paramChange', { theme });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    return wrapper;
  }

  private createUploadButton(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 18px;
    `;

    const label = document.createElement('div');
    label.textContent = '音频文件';
    label.style.cssText = `
      color: #E0E0E0;
      font-weight: 500;
      margin-bottom: 8px;
    `;

    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `
      position: relative;
    `;

    const uploadBtn = document.createElement('div');
    uploadBtn.className = 'upload-btn';
    uploadBtn.innerHTML = `
      <div style="text-align: center; padding: 14px 12px;">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#7F8C8D" style="margin-bottom: 6px;">
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
        </svg>
        <div style="font-size: 12px; color: #E0E0E0;">点击或拖拽上传</div>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">MP3 / WAV，≤20MB</div>
      </div>
    `;
    uploadBtn.style.cssText = `
      border: 2px dashed #7F8C8D;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.mp3,.wav,audio/mpeg,audio/wav';
    fileInput.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    `;

    btnWrapper.appendChild(uploadBtn);
    btnWrapper.appendChild(fileInput);

    wrapper.appendChild(label);
    wrapper.appendChild(btnWrapper);

    return wrapper;
  }

  private createEnergyBar(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-top: 8px;
    `;

    const label = document.createElement('div');
    label.textContent = '频谱能量';
    label.style.cssText = `
      color: #E0E0E0;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 12px;
    `;

    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      display: flex;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: #1a1a2a;
    `;

    const low = document.createElement('div');
    low.className = 'energy-low';
    low.style.cssText = `
      width: 33.33%;
      height: 100%;
      background: linear-gradient(90deg, #FF3366, #FF6699);
      transition: opacity 0.1s ease;
      opacity: 0.2;
      position: relative;
    `;
    const lowFill = document.createElement('div');
    lowFill.className = 'energy-low-fill';
    lowFill.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: rgba(255, 255, 255, 0.35);
      transition: width 0.05s linear;
    `;
    low.appendChild(lowFill);

    const mid = document.createElement('div');
    mid.className = 'energy-mid';
    mid.style.cssText = `
      width: 33.33%;
      height: 100%;
      background: linear-gradient(90deg, #3399FF, #66CCFF);
      transition: opacity 0.1s ease;
      opacity: 0.2;
      position: relative;
    `;
    const midFill = document.createElement('div');
    midFill.className = 'energy-mid-fill';
    midFill.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: rgba(255, 255, 255, 0.35);
      transition: width 0.05s linear;
    `;
    mid.appendChild(midFill);

    const high = document.createElement('div');
    high.className = 'energy-high';
    high.style.cssText = `
      width: 33.34%;
      height: 100%;
      background: linear-gradient(90deg, #FFCC00, #FFE066);
      transition: opacity 0.1s ease;
      opacity: 0.2;
      position: relative;
    `;
    const highFill = document.createElement('div');
    highFill.className = 'energy-high-fill';
    highFill.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: rgba(255, 255, 255, 0.35);
      transition: width 0.05s linear;
    `;
    high.appendChild(highFill);

    barContainer.appendChild(low);
    barContainer.appendChild(mid);
    barContainer.appendChild(high);

    wrapper.appendChild(label);
    wrapper.appendChild(barContainer);

    return wrapper;
  }

  private createFileInfoBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(20, 20, 30, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 10px;
      padding: 10px 24px;
      color: #E0E0E0;
      font-size: 13px;
      z-index: 100;
      display: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
    `;

    bar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#3498DB">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <span class="file-name" style="font-weight: 500; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
        <span style="color: #666;">|</span>
        <span class="file-duration" style="color: #888;"></span>
      </div>
    `;

    return bar;
  }

  private createPlayerBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 100;
      transition: opacity 0.3s ease;
      opacity: 0;
      pointer-events: none;
    `;

    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'play-pause-btn';
    playPauseBtn.innerHTML = this.playIcon;
    playPauseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #2C3E50;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, transform 0.2s ease;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    `;

    playPauseBtn.addEventListener('mouseenter', () => {
      playPauseBtn.style.background = '#34495E';
      playPauseBtn.style.transform = 'scale(1.05)';
    });
    playPauseBtn.addEventListener('mouseleave', () => {
      playPauseBtn.style.background = '#2C3E50';
      playPauseBtn.style.transform = 'scale(1)';
    });
    playPauseBtn.addEventListener('mousedown', () => {
      playPauseBtn.style.transform = 'scale(0.95)';
    });
    playPauseBtn.addEventListener('mouseup', () => {
      playPauseBtn.style.transform = 'scale(1.05)';
    });

    const progressWrapper = document.createElement('div');
    progressWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width: 60vw;
      max-width: 600px;
      min-width: 300px;
    `;

    const timeElapsed = document.createElement('span');
    timeElapsed.className = 'time-elapsed';
    timeElapsed.textContent = '00:00';
    timeElapsed.style.cssText = `
      color: #888;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      min-width: 40px;
      text-align: right;
    `;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.cssText = `
      flex: 1;
      height: 4px;
      background: #2C3E50;
      border-radius: 2px;
      cursor: pointer;
      position: relative;
      transition: height 0.2s ease;
    `;

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: #3498DB;
      border-radius: 2px;
      transition: width 0.05s linear;
      position: relative;
    `;

    const progressHandle = document.createElement('div');
    progressHandle.style.cssText = `
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%) scale(0);
      width: 12px;
      height: 12px;
      background: #3498DB;
      border-radius: 50%;
      transition: transform 0.2s ease;
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.5);
    `;
    progressFill.appendChild(progressHandle);
    progressBar.appendChild(progressFill);

    progressBar.addEventListener('mouseenter', () => {
      progressBar.style.height = '6px';
      progressHandle.style.transform = 'translateY(-50%) scale(1)';
    });
    progressBar.addEventListener('mouseleave', () => {
      if (!this.isDraggingProgress) {
        progressBar.style.height = '4px';
        progressHandle.style.transform = 'translateY(-50%) scale(0)';
      }
    });

    const timeTotal = document.createElement('span');
    timeTotal.className = 'time-total';
    timeTotal.textContent = '00:00';
    timeTotal.style.cssText = `
      color: #888;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      min-width: 40px;
    `;

    progressWrapper.appendChild(timeElapsed);
    progressWrapper.appendChild(progressBar);
    progressWrapper.appendChild(timeTotal);

    bar.appendChild(playPauseBtn);
    bar.appendChild(progressWrapper);

    return bar;
  }

  private setupUploadEvents(): void {
    this.uploadButton.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadButton.style.borderColor = '#3498DB';
      this.uploadButton.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.3)';
      this.uploadButton.style.background = 'rgba(52, 152, 219, 0.05)';
    });

    this.uploadButton.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadButton.style.borderColor = '#7F8C8D';
      this.uploadButton.style.boxShadow = 'none';
      this.uploadButton.style.background = 'transparent';
    });

    this.uploadButton.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.uploadButton.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadButton.style.borderColor = '#7F8C8D';
      this.uploadButton.style.boxShadow = 'none';
      this.uploadButton.style.background = 'transparent';

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleFile(target.files[0]);
      }
    });
  }

  private setupPlayerEvents(): void {
    this.playPauseBtn.addEventListener('click', () => {
      eventBus.emit('playPauseToggle');
    });

    const handleProgressInteract = (e: MouseEvent): number => {
      const rect = this.progressBar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return ratio * globalState.audioFile.duration;
    };

    this.progressBar.addEventListener('mousedown', (e) => {
      this.isDraggingProgress = true;
      const time = handleProgressInteract(e);
      eventBus.emit('audioSeek', time);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDraggingProgress) {
        const time = handleProgressInteract(e);
        eventBus.emit('audioSeek', time);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDraggingProgress) {
        this.isDraggingProgress = false;
        this.progressBar.style.height = '4px';
        const handle = this.progressFill.querySelector('div') as HTMLDivElement;
        if (handle) handle.style.transform = 'translateY(-50%) scale(0)';
      }
    });
  }

  private handleFile(file: File): void {
    eventBus.emit('audioFileSelected', file);
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  public showFileInfo(fileName: string, duration: number): void {
    const nameEl = this.fileInfoBar.querySelector('.file-name') as HTMLSpanElement;
    const durationEl = this.fileInfoBar.querySelector('.file-duration') as HTMLSpanElement;
    if (nameEl) nameEl.textContent = fileName;
    if (durationEl) durationEl.textContent = this.formatTime(duration);

    this.fileInfoBar.style.display = 'block';
    this.fileInfoBar.style.opacity = '0';
    requestAnimationFrame(() => {
      this.fileInfoBar.style.opacity = '1';
    });

    this.playerBar.style.opacity = '1';
    this.playerBar.style.pointerEvents = 'auto';

    const timeTotal = this.playerBar.querySelector('.time-total') as HTMLSpanElement;
    if (timeTotal) timeTotal.textContent = this.formatTime(duration);
  }

  public setPlaying(playing: boolean): void {
    this.playPauseBtn.innerHTML = playing ? this.pauseIcon : this.playIcon;
  }

  public updateTime(currentTime: number, duration: number): void {
    const timeElapsed = this.playerBar.querySelector('.time-elapsed') as HTMLSpanElement;
    if (timeElapsed) timeElapsed.textContent = this.formatTime(currentTime);

    if (!this.isDraggingProgress) {
      const ratio = duration > 0 ? (currentTime / duration) * 100 : 0;
      this.progressFill.style.width = `${ratio}%`;
    }
  }

  public updateEnergy(data: FreqBandData): void {
    const lowRatio = Math.min(1, data.low / 255);
    const midRatio = Math.min(1, data.mid / 255);
    const highRatio = Math.min(1, data.high / 255);

    this.energyBarLow.style.opacity = `${0.2 + lowRatio * 0.8}`;
    this.energyBarMid.style.opacity = `${0.2 + midRatio * 0.8}`;
    this.energyBarHigh.style.opacity = `${0.2 + highRatio * 0.8}`;

    const lowFill = this.energyBarLow.querySelector('.energy-low-fill') as HTMLDivElement;
    const midFill = this.energyBarMid.querySelector('.energy-mid-fill') as HTMLDivElement;
    const highFill = this.energyBarHigh.querySelector('.energy-high-fill') as HTMLDivElement;

    if (lowFill) lowFill.style.width = `${lowRatio * 100}%`;
    if (midFill) midFill.style.width = `${midRatio * 100}%`;
    if (highFill) highFill.style.width = `${highRatio * 100}%`;
  }

  public setUploadError(message: string): void {
    const infoDiv = this.uploadButton.querySelector('div > div:nth-child(3)') as HTMLDivElement;
    if (infoDiv) {
      const originalText = infoDiv.textContent;
      infoDiv.textContent = message;
      infoDiv.style.color = '#E74C3C';
      setTimeout(() => {
        infoDiv.textContent = originalText || 'MP3 / WAV，≤20MB';
        infoDiv.style.color = '#888';
      }, 3000);
    }
  }
}
