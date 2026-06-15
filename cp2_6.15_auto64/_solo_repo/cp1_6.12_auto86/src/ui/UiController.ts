import type { AudioEngine } from '../audio/AudioEngine';
import type { SceneManager } from '../scene/SceneManager';

interface UiState {
  bpm: number;
  volume: number;
  waveform: Float32Array;
  sensitivity: number;
  density: number;
  saturation: number;
  isRecording: boolean;
  isPlaying: boolean;
}

type RenderMode = 'full' | 'reduced' | 'minimal';

export class UiController {
  private audioEngine: AudioEngine;
  private sceneManager: SceneManager;

  private micBtn: HTMLButtonElement;
  private uploadBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private bpmDisplay: HTMLDivElement;
  private levelBar: HTMLDivElement;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private sensitivitySlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private saturationSlider: HTMLInputElement;
  private sensitivityVal: HTMLSpanElement;
  private densityVal: HTMLSpanElement;
  private saturationVal: HTMLSpanElement;

  private state: UiState = {
    bpm: 0,
    volume: 0,
    waveform: new Float32Array(0),
    sensitivity: 50,
    density: 35,
    saturation: 70,
    isRecording: false,
    isPlaying: false,
  };

  private uiFrameId = 0;
  private lastFrameTime = 0;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_INTERVAL_60 = 1000 / 60;
  private readonly FRAME_INTERVAL_30 = 1000 / 30;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private offscreenDirty = true;

  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_MAX = 30;
  private smoothedFps = 60;
  private renderMode: RenderMode = 'full';
  private frameSkipCounter = 0;

  constructor(audioEngine: AudioEngine, sceneManager: SceneManager) {
    this.audioEngine = audioEngine;
    this.sceneManager = sceneManager;

    this.micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    this.uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.bpmDisplay = document.getElementById('bpm-display') as HTMLDivElement;
    this.levelBar = document.getElementById('level-bar') as HTMLDivElement;
    this.waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.saturationSlider = document.getElementById('saturation-slider') as HTMLInputElement;
    this.sensitivityVal = document.getElementById('sensitivity-val') as HTMLSpanElement;
    this.densityVal = document.getElementById('density-val') as HTMLSpanElement;
    this.saturationVal = document.getElementById('saturation-val') as HTMLSpanElement;

    const ctx = this.waveformCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.waveformCtx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen 2D context');
    this.offscreenCtx = offCtx;

    this.setupCustomSliderStyles();
    this.setupEventListeners();
    this.resizeWaveformCanvas();
    this.startUiLoop();
  }

  private setupCustomSliderStyles(): void {
    const sliders = [this.sensitivitySlider, this.densitySlider, this.saturationSlider];

    const updateSliderFill = (slider: HTMLInputElement) => {
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const val = Number(slider.value);
      const percent = ((val - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(90deg, rgba(0, 255, 255, 0.4) 0%, rgba(0, 255, 255, 0.85) ${percent}%, #333 ${percent}%, #2a2a2a 100%)`;
    };

    sliders.forEach((s) => {
      updateSliderFill(s);
      s.addEventListener('input', () => updateSliderFill(s));
    });
  }

  private setupEventListeners(): void {
    this.micBtn.addEventListener('click', async () => {
      if (this.state.isRecording) {
        this.audioEngine.stop();
        this.state.isRecording = false;
        this.micBtn.textContent = '🎤 开始录音';
        this.micBtn.classList.remove('active');
      } else {
        try {
          await this.audioEngine.startMicrophone();
          this.state.isRecording = true;
          this.state.isPlaying = false;
          this.micBtn.textContent = '⏹ 停止录音';
          this.micBtn.classList.add('active');
          this.uploadBtn.classList.remove('active');
        } catch (err) {
          alert('无法访问麦克风：' + (err instanceof Error ? err.message : '未知错误'));
        }
      }
    });

    this.uploadBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        await this.audioEngine.loadFile(file);
        this.audioEngine.playFile();
        this.state.isPlaying = true;
        this.state.isRecording = false;
        this.uploadBtn.classList.add('active');
        this.micBtn.classList.remove('active');
        this.micBtn.textContent = '🎤 开始录音';
      } catch (err) {
        alert('加载音频失败：' + (err instanceof Error ? err.message : '请上传30秒以内的MP3文件'));
      }
      target.value = '';
    });

    this.sensitivitySlider.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.state.sensitivity = val;
      this.sensitivityVal.textContent = String(val);
      this.audioEngine.setSensitivity(val);
    });

    this.densitySlider.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.state.density = val;
      this.densityVal.textContent = String(val);
      this.sceneManager.setGeometryDensity(val);
    });

    this.saturationSlider.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.state.saturation = val;
      this.saturationVal.textContent = String(val);
      this.sceneManager.setSaturation(val);
    });

    window.addEventListener('resize', () => {
      this.resizeWaveformCanvas();
    });
  }

  private resizeWaveformCanvas(): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    this.waveformCanvas.width = w * dpr;
    this.waveformCanvas.height = h * dpr;
    this.waveformCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offscreenCanvas.width = w * dpr;
    this.offscreenCanvas.height = h * dpr;
    this.offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offscreenDirty = true;
  }

  updateAudioData(bpm: number, volume: number, waveform: Float32Array): void {
    this.state.bpm = bpm;
    this.state.volume = volume;
    this.state.waveform = waveform;
    this.offscreenDirty = true;
  }

  private updateFpsTracking(delta: number): void {
    if (delta <= 0) return;
    const instantFps = 1000 / delta;
    this.fpsHistory.push(instantFps);
    if (this.fpsHistory.length > this.FPS_HISTORY_MAX) {
      this.fpsHistory.shift();
    }

    if (this.fpsHistory.length >= 10) {
      const sorted = [...this.fpsHistory].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      this.smoothedFps = this.smoothedFps * 0.7 + median * 0.3;
    } else {
      this.smoothedFps = this.smoothedFps * 0.85 + instantFps * 0.15;
    }

    if (this.smoothedFps < 45) {
      this.renderMode = 'minimal';
    } else if (this.smoothedFps < 50) {
      this.renderMode = 'reduced';
    } else {
      this.renderMode = 'full';
    }
  }

  private startUiLoop(): void {
    const loop = (time: number) => {
      this.uiFrameId = requestAnimationFrame(loop);

      const delta = time - this.lastFrameTime;
      this.updateFpsTracking(delta);

      let frameInterval: number;
      switch (this.renderMode) {
        case 'minimal':
          frameInterval = this.FRAME_INTERVAL_30;
          break;
        case 'reduced':
          frameInterval = (this.FRAME_INTERVAL_60 + this.FRAME_INTERVAL_30) / 2;
          break;
        case 'full':
        default:
          frameInterval = this.FRAME_INTERVAL_60;
          break;
      }

      if (delta < frameInterval) return;
      this.lastFrameTime = time - (delta % frameInterval);

      this.frameSkipCounter++;

      this.renderUi();
    };
    this.uiFrameId = requestAnimationFrame(loop);
  }

  private renderUi(): void {
    this.renderBpm();
    this.renderVolumeBar();

    if (this.renderMode !== 'minimal') {
      this.renderWaveformDoubleBuffered();
    } else if (this.frameSkipCounter % 2 === 0) {
      this.renderWaveformDoubleBuffered();
    }
  }

  private renderBpm(): void {
    if (this.state.bpm > 0) {
      this.bpmDisplay.textContent = String(this.state.bpm);
    } else {
      this.bpmDisplay.textContent = '--';
    }
  }

  private renderVolumeBar(): void {
    const vol = Math.max(0, Math.min(1, this.state.volume));
    const percent = vol * 100;
    this.levelBar.style.width = percent.toFixed(1) + '%';
    const hueStart = 120 - vol * 120;
    const hueMid = Math.max(20, hueStart - 40);
    this.levelBar.style.background = `linear-gradient(90deg,
      hsl(${hueStart}, 95%, 50%) 0%,
      hsl(${hueMid}, 95%, 52%) 55%,
      hsl(0, 95%, 55%) 100%)`;
  }

  private renderWaveformDoubleBuffered(): void {
    if (this.offscreenDirty) {
      this.renderToOffscreen();
      this.offscreenDirty = false;
    }

    const rect = this.waveformCanvas.getBoundingClientRect();
    this.waveformCtx.clearRect(0, 0, rect.width, rect.height);
    this.waveformCtx.drawImage(
      this.offscreenCanvas,
      0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height,
      0, 0, rect.width, rect.height
    );
  }

  private renderToOffscreen(): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.offscreenCtx;

    ctx.clearRect(0, 0, w, h);

    const waveform = this.state.waveform;
    if (waveform.length === 0) {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    const samples = Math.min(waveform.length, Math.floor(w * 1.5));
    const step = Math.max(1, Math.floor(waveform.length / samples));

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.7)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 180, 0.95)');
    gradient.addColorStop(1, 'rgba(0, 255, 210, 0.7)');
    ctx.strokeStyle = gradient;
    ctx.shadowColor = 'rgba(0, 255, 136, 0.35)';
    ctx.shadowBlur = 6;

    const midY = h / 2;
    const amp = h / 2.2;

    for (let i = 0; i < samples; i++) {
      const dataIdx = i * step;
      if (dataIdx >= waveform.length) break;

      const x = (i / (samples - 1)) * w;
      const val = waveform[dataIdx];
      const y = midY - val * amp;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    if (this.renderMode === 'full') {
      ctx.beginPath();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.18)';
      ctx.shadowBlur = 0;
      for (let i = 0; i < samples; i++) {
        const dataIdx = i * step;
        if (dataIdx >= waveform.length) break;
        const x = (i / (samples - 1)) * w;
        const val = Math.abs(waveform[dataIdx]);
        const y1 = midY - val * amp;
        const y2 = midY + val * amp;
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  dispose(): void {
    cancelAnimationFrame(this.uiFrameId);
  }
}
