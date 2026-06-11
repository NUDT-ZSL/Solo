import { AtmosphereType, ATMOSPHERE_PRESETS, PathMemory, douglasPeuckerSimplify } from './path';

export interface UICallbacks {
  onModeChange: (mode: 'drawing' | 'playback') => void;
  onParticleDensityChange: (value: number) => void;
  onPlaybackSpeedChange: (value: number) => void;
  onAddAtmosphere: (type: AtmosphereType) => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onAuthorChange: (author: string) => void;
  onClearPath: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private pathMemory: PathMemory;
  
  private drawBtn!: HTMLButtonElement;
  private playbackBtn!: HTMLButtonElement;
  private particleSlider!: HTMLInputElement;
  private particleValue!: HTMLElement;
  private speedSlider!: HTMLInputElement;
  private speedValue!: HTMLElement;
  private authorInput!: HTMLInputElement;
  private saveBtn!: HTMLButtonElement;
  private loadBtn!: HTMLButtonElement;
  private loadInput!: HTMLInputElement;
  private addAtmosphereBtn!: HTMLButtonElement;
  private atmospherePicker!: HTMLElement;
  private segmentList!: HTMLElement;
  private pathNameDisplay!: HTMLElement;
  private fileSizeDisplay!: HTMLElement;
  private clearBtn!: HTMLButtonElement;
  
  private currentMode: 'drawing' | 'playback' = 'drawing';
  private atmospherePickerVisible: boolean = false;

  constructor(container: HTMLElement, callbacks: UICallbacks, pathMemory: PathMemory) {
    this.container = container;
    this.callbacks = callbacks;
    this.pathMemory = pathMemory;
    this.createUI();
    this.bindEvents();
  }

  private createUI(): void {
    this.container.innerHTML = `
      <div class="app-container">
        <header class="top-bar">
          <div class="logo">尘音寻迹</div>
          <div class="mode-buttons">
            <button id="drawBtn" class="mode-btn active">绘制模式</button>
            <button id="playbackBtn" class="mode-btn">回放模式</button>
          </div>
        </header>
        
        <div class="main-content">
          <aside class="left-panel glass">
            <h3 class="panel-title">参数调节</h3>
            
            <div class="control-group">
              <label class="control-label">
                <span>粒子密度</span>
                <span id="particleValue" class="control-value">80</span>
              </label>
              <input type="range" id="particleSlider" min="30" max="150" value="80" class="custom-slider">
            </div>
            
            <div class="control-group">
              <label class="control-label">
                <span>回放速度</span>
                <span id="speedValue" class="control-value">1.0x</span>
              </label>
              <input type="range" id="speedSlider" min="0.5" max="3" step="0.1" value="1" class="custom-slider">
            </div>
            
            <div class="control-group">
              <label class="control-label">作者</label>
              <input type="text" id="authorInput" placeholder="输入您的名字" class="text-input" value="匿名作者">
            </div>
            
            <div class="control-group">
              <label class="control-label">
                <span>路径名称</span>
              </label>
              <div id="pathNameDisplay" class="info-display">未命名路径</div>
              <div id="fileSizeDisplay" class="info-subtext">预估文件大小: 0KB</div>
            </div>
            
            <div class="button-group">
              <button id="clearBtn" class="secondary-btn">清空路径</button>
            </div>
          </aside>
          
          <main class="canvas-container">
            <canvas id="mainCanvas"></canvas>
          </main>
          
          <aside class="right-panel glass">
            <h3 class="panel-title">氛围设置</h3>
            
            <button id="addAtmosphereBtn" class="primary-btn">
              <span class="btn-icon">＋</span>
              添加氛围
            </button>
            
            <div id="atmospherePicker" class="atmosphere-picker hidden">
              <div class="picker-title">选择氛围类型</div>
              <div class="atmosphere-grid">
                <button class="atmosphere-card" data-type="forest">
                  <div class="atmosphere-preview forest-preview"></div>
                  <span class="atmosphere-name">森林</span>
                  <span class="atmosphere-desc">鸟鸣音符</span>
                </button>
                <button class="atmosphere-card" data-type="ocean">
                  <div class="atmosphere-preview ocean-preview"></div>
                  <span class="atmosphere-name">海洋</span>
                  <span class="atmosphere-desc">波浪符号</span>
                </button>
                <button class="atmosphere-card" data-type="dusk">
                  <div class="atmosphere-preview dusk-preview"></div>
                  <span class="atmosphere-name">暮色</span>
                  <span class="atmosphere-desc">星光点点</span>
                </button>
                <button class="atmosphere-card" data-type="volcano">
                  <div class="atmosphere-preview volcano-preview"></div>
                  <span class="atmosphere-name">火山</span>
                  <span class="atmosphere-desc">熔岩粒子</span>
                </button>
              </div>
            </div>
            
            <h3 class="panel-title" style="margin-top: 24px;">路径段落</h3>
            <div id="segmentList" class="segment-list">
              <div class="empty-state">暂无氛围段落<br>请先绘制路径</div>
            </div>
          </aside>
        </div>
        
        <footer class="bottom-bar glass">
          <button id="saveBtn" class="action-btn save-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            保存路径
          </button>
          <button id="loadBtn" class="action-btn load-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            加载路径
          </button>
          <input type="file" id="loadInput" accept=".json" style="display: none;">
        </footer>
      </div>
    `;
    
    this.drawBtn = document.getElementById('drawBtn') as HTMLButtonElement;
    this.playbackBtn = document.getElementById('playbackBtn') as HTMLButtonElement;
    this.particleSlider = document.getElementById('particleSlider') as HTMLInputElement;
    this.particleValue = document.getElementById('particleValue') as HTMLElement;
    this.speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.speedValue = document.getElementById('speedValue') as HTMLElement;
    this.authorInput = document.getElementById('authorInput') as HTMLInputElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
    this.loadInput = document.getElementById('loadInput') as HTMLInputElement;
    this.addAtmosphereBtn = document.getElementById('addAtmosphereBtn') as HTMLButtonElement;
    this.atmospherePicker = document.getElementById('atmospherePicker') as HTMLElement;
    this.segmentList = document.getElementById('segmentList') as HTMLElement;
    this.pathNameDisplay = document.getElementById('pathNameDisplay') as HTMLElement;
    this.fileSizeDisplay = document.getElementById('fileSizeDisplay') as HTMLElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  }

  private bindEvents(): void {
    this.drawBtn.addEventListener('click', () => this.setMode('drawing'));
    this.playbackBtn.addEventListener('click', () => this.setMode('playback'));
    
    this.particleSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.particleValue.textContent = value.toString();
      this.pathMemory.particleDensity = value;
      this.callbacks.onParticleDensityChange(value);
      this.updateFileSize();
    });
    
    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = value.toFixed(1) + 'x';
      this.pathMemory.playbackSpeed = value;
      this.callbacks.onPlaybackSpeedChange(value);
      this.updateFileSize();
    });
    
    this.authorInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.pathMemory.author = value || '匿名作者';
      this.callbacks.onAuthorChange(value);
      this.updateFileSize();
    });
    
    this.addAtmosphereBtn.addEventListener('click', () => this.toggleAtmospherePicker());
    
    document.querySelectorAll('.atmosphere-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-type') as AtmosphereType;
        if (type) {
          this.callbacks.onAddAtmosphere(type);
          this.hideAtmospherePicker();
        }
      });
    });
    
    this.saveBtn.addEventListener('click', () => this.handleSave());
    this.loadBtn.addEventListener('click', () => this.loadInput.click());
    this.loadInput.addEventListener('change', (e) => this.handleLoad(e));
    this.clearBtn.addEventListener('click', () => this.callbacks.onClearPath());
    
    document.addEventListener('click', (e) => {
      if (this.atmospherePickerVisible && 
          !this.atmospherePicker.contains(e.target as Node) && 
          e.target !== this.addAtmosphereBtn) {
        this.hideAtmospherePicker();
      }
    });
  }

  private setMode(mode: 'drawing' | 'playback'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    
    if (mode === 'drawing') {
      this.drawBtn.classList.add('active');
      this.playbackBtn.classList.remove('active');
    } else {
      this.drawBtn.classList.remove('active');
      this.playbackBtn.classList.add('active');
    }
    
    this.callbacks.onModeChange(mode);
  }

  private toggleAtmospherePicker(): void {
    if (this.atmospherePickerVisible) {
      this.hideAtmospherePicker();
    } else {
      this.showAtmospherePicker();
    }
  }

  private showAtmospherePicker(): void {
    if (this.pathMemory.getPointCount() < 2) {
      alert('请先绘制至少两个点的路径');
      return;
    }
    this.atmospherePickerVisible = true;
    this.atmospherePicker.classList.remove('hidden');
    this.addAtmosphereBtn.classList.add('active');
  }

  private hideAtmospherePicker(): void {
    this.atmospherePickerVisible = false;
    this.atmospherePicker.classList.add('hidden');
    this.addAtmosphereBtn.classList.remove('active');
  }

  private handleSave(): void {
    if (this.pathMemory.getPointCount() < 2) {
      alert('请先绘制路径后再保存');
      return;
    }
    
    const points = this.pathMemory.getPoints();
    if (points.length > 500) {
      const simplified = douglasPeuckerSimplify(points, 0.002);
      const tempMemory = new PathMemory(
        this.pathMemory.name,
        this.pathMemory.author,
        this.pathMemory.particleDensity,
        this.pathMemory.playbackSpeed
      );
      for (const p of simplified) {
        tempMemory.addPoint(p.x, p.y, p.timestamp);
      }
      for (const seg of this.pathMemory.getSegments()) {
        tempMemory.addSegment(seg.startIndex, seg.endIndex, seg.atmosphere);
      }
      this.downloadFile(tempMemory);
    } else {
      this.downloadFile(this.pathMemory);
    }
  }

  private downloadFile(pathMemory: PathMemory): void {
    const jsonData = pathMemory.serialize();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pathMemory.name.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private handleLoad(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.callbacks.onLoad(file);
    }
    input.value = '';
  }

  setPathMemory(pathMemory: PathMemory): void {
    this.pathMemory = pathMemory;
    this.particleSlider.value = pathMemory.particleDensity.toString();
    this.particleValue.textContent = pathMemory.particleDensity.toString();
    this.speedSlider.value = pathMemory.playbackSpeed.toString();
    this.speedValue.textContent = pathMemory.playbackSpeed.toFixed(1) + 'x';
    this.authorInput.value = pathMemory.author;
    this.pathNameDisplay.textContent = pathMemory.name;
    this.updateSegmentList();
    this.updateFileSize();
  }

  updateSegmentList(): void {
    const segments = this.pathMemory.getSegments();
    
    if (segments.length === 0) {
      this.segmentList.innerHTML = '<div class="empty-state">暂无氛围段落<br>请先绘制路径</div>';
      return;
    }
    
    this.segmentList.innerHTML = segments.map((seg, idx) => {
      const preset = ATMOSPHERE_PRESETS[seg.atmosphere];
      return `
        <div class="segment-item">
          <div class="segment-color" style="background-color: ${preset.color};"></div>
          <div class="segment-info">
            <div class="segment-name">${preset.name}</div>
            <div class="segment-range">点 ${seg.startIndex} - ${seg.endIndex}</div>
          </div>
          <div class="segment-index">#${idx + 1}</div>
        </div>
      `;
    }).join('');
  }

  updateFileSize(): void {
    const sizeBytes = this.pathMemory.estimateFileSize();
    const sizeKB = (sizeBytes / 1024).toFixed(1);
    this.fileSizeDisplay.textContent = `预估文件大小: ${sizeKB}KB`;
    
    if (sizeBytes > 500 * 1024) {
      this.fileSizeDisplay.style.color = '#FF6B6B';
    } else if (sizeBytes > 300 * 1024) {
      this.fileSizeDisplay.style.color = '#FF8C42';
    } else {
      this.fileSizeDisplay.style.color = '#6BCB77';
    }
  }

  updatePathName(name: string): void {
    this.pathNameDisplay.textContent = name;
    this.updateFileSize();
  }

  setModeFromExternal(mode: 'drawing' | 'playback'): void {
    if (this.currentMode === mode) return;
    this.setMode(mode);
  }

  getCanvas(): HTMLCanvasElement {
    return document.getElementById('mainCanvas') as HTMLCanvasElement;
  }

  showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getCurrentMode(): 'drawing' | 'playback' {
    return this.currentMode;
  }

  updateAtmosphereButtonState(canAdd: boolean): void {
    this.addAtmosphereBtn.disabled = !canAdd;
  }
}
