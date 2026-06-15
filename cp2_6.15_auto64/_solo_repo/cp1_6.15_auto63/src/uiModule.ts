import { store } from './store';

class UiModule {
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private viewBar: HTMLElement;
  private bottomBar: HTMLElement;
  private emitterPanel: HTMLElement;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;
  private playbackInterval: ReturnType<typeof setInterval> | null = null;
  private currentPlaybackFrame = 0;

  constructor() {
    this.leftPanel = document.getElementById('left-panel')!;
    this.rightPanel = document.getElementById('right-panel')!;
    this.viewBar = document.getElementById('view-bar')!;
    this.bottomBar = document.getElementById('bottom-bar')!;
    this.emitterPanel = document.getElementById('emitter-panel')!;

    this.buildLeftPanel();
    this.buildViewBar();
    this.buildBottomBar();
    this.buildRightPanel();
    this.bindStore();
  }

  private bindStore(): void {
    store.on('emitter:select', () => this.updateEmitterPanel());
    store.on('recording:change', () => this.updateRecordingBtn());
    store.on('playing:change', () => this.updatePlaybackUI());
    store.on('keyframes:change', () => this.updateKeyframeInfo());
  }

  private buildLeftPanel(): void {
    this.leftPanel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '控制面板';
    this.leftPanel.appendChild(title);

    const wind = store.getWind();

    this.createSlider(this.leftPanel, '风力强度', 0, 10, 0.1, wind.strength, (v) => {
      store.setWind({ strength: v });
    });

    this.createSlider(this.leftPanel, '风向 (角度)', 0, 360, 1, wind.direction, (v) => {
      store.setWind({ direction: v });
    });

    this.createSlider(this.leftPanel, '湍流强度', 0, 5, 0.1, wind.turbulence, (v) => {
      store.setWind({ turbulence: v });
    });

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#666;margin-top:auto;padding-top:12px;border-top:1px solid #333350;';
    hint.textContent = '右键点击地面添加烟雾源\n左键拖拽移动发射器\n右键点击发射器编辑参数';
    hint.style.whiteSpace = 'pre-line';
    this.leftPanel.appendChild(hint);
  }

  private createSlider(
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (v: number) => void
  ): void {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

    const lbl = document.createElement('span');
    lbl.className = 'control-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'control-value';
    val.textContent = value.toFixed(step < 1 ? 1 : 0);

    labelRow.appendChild(lbl);
    labelRow.appendChild(val);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      val.textContent = v.toFixed(step < 1 ? 1 : 0);
      onChange(v);
    });

    group.appendChild(labelRow);
    group.appendChild(slider);
    parent.appendChild(group);
  }

  private buildViewBar(): void {
    this.viewBar.innerHTML = '';

    const views: Array<{ label: string; mode: 'top' | 'side' | 'free' | 'firstPerson' }> = [
      { label: '俯视', mode: 'top' },
      { label: '侧视', mode: 'side' },
      { label: '自由旋转', mode: 'free' },
      { label: '第一人称', mode: 'firstPerson' },
    ];

    for (const v of views) {
      const btn = document.createElement('button');
      btn.className = 'btn' + (store.getViewMode() === v.mode ? ' active' : '');
      btn.textContent = v.label;
      btn.addEventListener('click', () => {
        store.setViewMode(v.mode);
        this.viewBar.querySelectorAll('.btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      this.viewBar.appendChild(btn);
    }
  }

  private buildBottomBar(): void {
    this.bottomBar.innerHTML = '';

    const recordBtn = document.createElement('button');
    recordBtn.className = 'btn';
    recordBtn.id = 'record-btn';
    recordBtn.textContent = '录制关键帧';
    recordBtn.addEventListener('click', () => {
      const isRecording = store.getRecording();
      if (isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });
    this.bottomBar.appendChild(recordBtn);

    const playBtn = document.createElement('button');
    playBtn.className = 'btn';
    playBtn.id = 'play-btn';
    playBtn.textContent = '回放';
    playBtn.addEventListener('click', () => {
      const isPlaying = store.getPlaying();
      if (isPlaying) {
        this.stopPlayback();
      } else {
        this.startPlayback();
      }
    });
    this.bottomBar.appendChild(playBtn);

    const speedSelect = document.createElement('select');
    speedSelect.id = 'playback-speed';
    [1, 2, 3, 4].forEach((s) => {
      const opt = document.createElement('option');
      opt.value = String(s);
      opt.textContent = `${s}x`;
      speedSelect.appendChild(opt);
    });
    speedSelect.addEventListener('change', () => {
      store.setPlaybackSpeed(parseInt(speedSelect.value));
    });

    this.bottomBar.appendChild(speedSelect);

    const frameInfo = document.createElement('span');
    frameInfo.id = 'frame-info';
    frameInfo.textContent = '帧: 0/0';
    this.bottomBar.appendChild(frameInfo);
  }

  private buildRightPanel(): void {
    this.rightPanel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '信息';
    this.rightPanel.appendChild(title);

    const fpsItem = document.createElement('div');
    fpsItem.className = 'info-item';
    fpsItem.innerHTML = '<span class="info-label">帧率</span><span class="info-value" id="info-fps">0</span>';
    this.rightPanel.appendChild(fpsItem);

    const particleItem = document.createElement('div');
    particleItem.className = 'info-item';
    particleItem.innerHTML = '<span class="info-label">粒子总数</span><span class="info-value" id="info-particles">0</span>';
    this.rightPanel.appendChild(particleItem);

    const emitterItem = document.createElement('div');
    emitterItem.className = 'info-item';
    emitterItem.innerHTML = '<span class="info-label">活动源</span><span class="info-value" id="info-emitters">0</span>';
    this.rightPanel.appendChild(emitterItem);

    const kfItem = document.createElement('div');
    kfItem.className = 'info-item';
    kfItem.innerHTML = '<span class="info-label">关键帧</span><span class="info-value" id="info-keyframes">0</span>';
    this.rightPanel.appendChild(kfItem);
  }

  private updateEmitterPanel(): void {
    const selectedId = store.getSelectedEmitterId();
    if (!selectedId) {
      this.emitterPanel.classList.remove('open');
      return;
    }

    const config = store.getEmitter(selectedId);
    if (!config) {
      this.emitterPanel.classList.remove('open');
      return;
    }

    this.emitterPanel.innerHTML = '';
    this.emitterPanel.classList.add('open');

    const titleRow = document.createElement('div');
    titleRow.className = 'panel-title';
    titleRow.innerHTML = '<span>发射器参数</span>';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => {
      store.selectEmitter(null);
    });
    titleRow.appendChild(closeBtn);
    this.emitterPanel.appendChild(titleRow);

    this.createSlider(this.emitterPanel, '强度', 0.1, 5, 0.1, config.intensity, (v) => {
      store.updateEmitter(selectedId, { intensity: v });
    });

    this.createSlider(this.emitterPanel, '扩散', 0.1, 3, 0.1, config.spread, (v) => {
      store.updateEmitter(selectedId, { spread: v });
    });

    const colorGroup = document.createElement('div');
    colorGroup.className = 'control-group';

    const colorLabel = document.createElement('span');
    colorLabel.className = 'control-label';
    colorLabel.textContent = '发光颜色';

    const colorWrap = document.createElement('div');
    colorWrap.className = 'color-input-wrap';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = config.color;
    colorInput.addEventListener('input', () => {
      store.updateEmitter(selectedId, { color: colorInput.value });
    });

    const colorHex = document.createElement('span');
    colorHex.className = 'control-value';
    colorHex.textContent = config.color;
    colorInput.addEventListener('input', () => {
      colorHex.textContent = colorInput.value;
    });

    colorWrap.appendChild(colorInput);
    colorWrap.appendChild(colorHex);
    colorGroup.appendChild(colorLabel);
    colorGroup.appendChild(colorWrap);
    this.emitterPanel.appendChild(colorGroup);

    const posGroup = document.createElement('div');
    posGroup.className = 'control-group';
    posGroup.innerHTML = `<span class="control-label">位置</span><span class="control-value">X: ${config.position.x.toFixed(1)} Z: ${config.position.z.toFixed(1)}</span>`;
    this.emitterPanel.appendChild(posGroup);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn';
    deleteBtn.style.cssText = 'margin-top:auto;background:#5a2222;border-color:#884444;';
    deleteBtn.textContent = '删除此烟雾源';
    deleteBtn.addEventListener('click', () => {
      store.removeEmitter(selectedId);
    });
    this.emitterPanel.appendChild(deleteBtn);
  }

  private startRecording(): void {
    store.setRecording(true);
    store.clearKeyframes();
    this.recordingInterval = setInterval(() => {
      const positions = this.getParticlePositions();
      if (positions) {
        store.addKeyframe({
          timestamp: performance.now(),
          particlePositions: positions,
          emitterIds: store.getAllEmitters().map((e) => e.id),
        });
      }
    }, 2000);
  }

  private stopRecording(): void {
    store.setRecording(false);
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  private startPlayback(): void {
    const keyframes = store.getKeyframes();
    if (keyframes.length === 0) return;
    store.setPlaying(true);
    this.currentPlaybackFrame = 0;
    this.playNextFrame();
  }

  private playNextFrame(): void {
    if (!store.getPlaying()) return;

    const keyframes = store.getKeyframes();
    if (keyframes.length === 0) {
      this.stopPlayback();
      return;
    }

    if (this.currentPlaybackFrame >= keyframes.length) {
      this.currentPlaybackFrame = 0;
    }

    this.applyKeyframe(keyframes[this.currentPlaybackFrame]);
    this.currentPlaybackFrame++;

    const speed = store.getPlaybackSpeed();
    const interval = 2000 / speed;

    this.playbackInterval = setTimeout(() => {
      this.playNextFrame();
    }, interval) as unknown as ReturnType<typeof setInterval>;
  }

  private stopPlayback(): void {
    store.setPlaying(false);
    if (this.playbackInterval) {
      clearTimeout(this.playbackInterval as unknown as number);
      this.playbackInterval = null;
    }
  }

  private applyKeyframe(kf: { particlePositions: Float32Array; emitterIds: string[] }): void {
    const event = new CustomEvent('apply-keyframe', {
      detail: { positions: kf.particlePositions },
    });
    window.dispatchEvent(event);
  }

  private getParticlePositions(): Float32Array | null {
    return null;
  }

  setParticlePositionGetter(getter: () => Float32Array): void {
    this.getParticlePositions = getter;
  }

  private updateRecordingBtn(): void {
    const btn = document.getElementById('record-btn');
    if (!btn) return;
    if (store.getRecording()) {
      btn.textContent = '停止录制';
      btn.classList.add('active');
    } else {
      btn.textContent = '录制关键帧';
      btn.classList.remove('active');
    }
  }

  private updatePlaybackUI(): void {
    const btn = document.getElementById('play-btn');
    if (!btn) return;
    if (store.getPlaying()) {
      btn.textContent = '停止回放';
      btn.classList.add('active');
    } else {
      btn.textContent = '回放';
      btn.classList.remove('active');
    }
  }

  private updateKeyframeInfo(): void {
    const el = document.getElementById('frame-info');
    if (el) {
      const kfs = store.getKeyframes();
      el.textContent = `帧: ${kfs.length}/50`;
    }
  }

  updateInfo(): void {
    const fpsEl = document.getElementById('info-fps');
    const partEl = document.getElementById('info-particles');
    const emEl = document.getElementById('info-emitters');
    const kfEl = document.getElementById('info-keyframes');

    if (fpsEl) fpsEl.textContent = String(store.getFps());
    if (partEl) partEl.textContent = String(store.getParticleCount());
    if (emEl) emEl.textContent = String(store.getEmitterCount());
    if (kfEl) kfEl.textContent = String(store.getKeyframes().length);
  }
}

export { UiModule };
