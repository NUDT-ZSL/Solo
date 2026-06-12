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
  private readonly FRAME_INTERVAL = 1000 / this.TARGET_FPS;

  private waveformHistory: number[][] = [];
  private readonly WAVEFORM_HISTORY_MAX = 3;

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
    if (!ctx) throw new Error('Failed to get 2D context for waveform canvas');
    this.waveformCtx = ctx;

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
      slider.style.background = `linear-gradient(90deg, rgba(0, 255, 255, 0.4) 0%, rgba(0, 255, 255, 0.8) ${percent}%, #333 ${percent}%, #2a2a2a 100%)`;
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
    const dpr = window.devicePixelRatio || 1;
    this.waveformCanvas.width = rect.width * dpr;
    this.waveformCanvas.height = rect.height * dpr;
    this.waveformCtx.scale(dpr, dpr);
  }

  updateAudioData(bpm: number, volume: number, waveform: Float32Array): void {
    this.state.bpm = bpm;
    this.state.volume = volume;
    this.state.waveform = waveform;
  }

  private startUiLoop(): void {
    const loop = (time: number) => {
      this.uiFrameId = requestAnimationFrame(loop);
      const delta = time - this.lastFrameTime;
      if (delta < this.FRAME_INTERVAL) return;
      this.lastFrameTime = time - (delta % this.FRAME_INTERVAL);

      this.renderUi();
    };
    this.uiFrameId = requestAnimationFrame(loop);
  }

  private renderUi(): void {
    this.renderBpm();
    this.renderVolumeBar();
    this.renderWaveform();
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
    this.levelBar.style.background = `linear-gradient(90deg,
      hsl(${120 - vol * 120}, 90%, 50%) 0%,
      hsl(${60 - vol * 60}, 90%, 50%) 50%,
      hsl(0, 90%, 55%) 100%)`;
  }

  private renderWaveform(): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.waveformCtx;

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

    const samples = Math.min(waveform.length, Math.floor(w * 2));
    const step = Math.max(1, Math.floor(waveform.length / samples));

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 170, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 255, 200, 0.6)');
    ctx.strokeStyle = gradient;
    ctx.shadowColor = 'rgba(0, 255, 136, 0.4)';
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

    ctx.beginPath();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
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

    ctx.shadowBlur = 0;
  }

  dispose(): void {
    cancelAnimationFrame(this.uiFrameId);
  }
}
