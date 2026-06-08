import { create } from 'zustand';
import { AudioAnalyzer, generatePresetBuffer, type AnalysisData, type BandType } from './AudioAnalyzer';
import { ParticleSystem } from './ParticleSystem';

export interface PresetItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  config: {
    frequencies: number[];
    durations: number[];
    waveType: OscillatorType;
    gain: number;
  };
}

export const PRESETS: PresetItem[] = [
  {
    id: 'moonlight',
    name: '月光奏鸣曲',
    nameEn: 'Moonlight Sonata',
    description: '贝多芬·低沉而流动的旋律',
    config: {
      frequencies: [65.41, 130.81, 196, 261.63, 329.63, 392, 329.63, 261.63, 196, 130.81, 164.81, 246.94, 329.63, 246.94, 164.81, 130.81],
      durations: [0.6, 0.6, 0.6, 0.6, 0.6, 0.8, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.2],
      waveType: 'sine',
      gain: 0.25,
    },
  },
  {
    id: 'spring',
    name: '四季·春',
    nameEn: 'Spring',
    description: '维瓦尔第·明亮而欢快的旋律',
    config: {
      frequencies: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 523.25, 440, 523.25, 659.25, 523.25, 440, 392, 440, 523.25],
      durations: [0.3, 0.3, 0.3, 0.5, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.5, 0.3, 0.3, 0.3, 0.3, 0.6],
      waveType: 'triangle',
      gain: 0.2,
    },
  },
  {
    id: 'canon',
    name: '卡农',
    nameEn: 'Canon',
    description: '帕赫贝尔·温暖而层叠的旋律',
    config: {
      frequencies: [261.63, 329.63, 392, 493.88, 440, 392, 349.23, 329.63, 293.66, 349.23, 440, 392, 349.23, 329.63, 293.66, 261.63],
      durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      waveType: 'sine',
      gain: 0.22,
    },
  },
  {
    id: 'nocturne',
    name: '夜曲',
    nameEn: 'Nocturne',
    description: '肖邦·宁静而抒情的旋律',
    config: {
      frequencies: [196, 246.94, 293.66, 349.23, 392, 349.23, 293.66, 261.63, 246.94, 220, 196, 174.61, 196, 220, 246.94, 261.63],
      durations: [0.7, 0.7, 0.5, 0.5, 0.9, 0.7, 0.5, 0.5, 0.7, 0.7, 0.5, 0.5, 0.7, 0.7, 0.7, 1.2],
      waveType: 'sine',
      gain: 0.2,
    },
  },
];

export interface InfoCardData {
  visible: boolean;
  band: BandType | null;
  emotion: string;
  spectrum: { labels: string[]; values: number[] };
  x: number;
  y: number;
}

export interface AppState {
  isPlaying: boolean;
  volume: number;
  currentPreset: string | null;
  currentTrackName: string;
  hasAudio: boolean;
  duration: number;
  currentTime: number;
  analysisData: AnalysisData;
  infoCard: InfoCardData;
  panelOpen: boolean;
  loaded: boolean;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setCurrentPreset: (id: string | null) => void;
  setCurrentTrackName: (name: string) => void;
  setHasAudio: (v: boolean) => void;
  setDuration: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setAnalysisData: (d: AnalysisData) => void;
  setInfoCard: (d: InfoCardData) => void;
  setPanelOpen: (v: boolean) => void;
  setLoaded: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isPlaying: false,
  volume: 0.7,
  currentPreset: null,
  currentTrackName: '',
  hasAudio: false,
  duration: 0,
  currentTime: 0,
  analysisData: { low: 0, mid: 0, high: 0, beat: false, volume: 0, emotion: '静谧', spectrum: new Uint8Array(0) },
  infoCard: { visible: false, band: null, emotion: '', spectrum: { labels: [], values: [] }, x: 0, y: 0 },
  panelOpen: true,
  loaded: false,
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setCurrentPreset: (id) => set({ currentPreset: id }),
  setCurrentTrackName: (name) => set({ currentTrackName: name }),
  setHasAudio: (v) => set({ hasAudio: v }),
  setDuration: (v) => set({ duration: v }),
  setCurrentTime: (v) => set({ currentTime: v }),
  setAnalysisData: (d) => set({ analysisData: d }),
  setInfoCard: (d) => set({ infoCard: d }),
  setPanelOpen: (v) => set({ panelOpen: v }),
  setLoaded: (v) => set({ loaded: v }),
}));

export class CoreEngine {
  private analyzer: AudioAnalyzer;
  private particleSystem: ParticleSystem | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private rafId: number | null = null;
  private lastTime = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private rotationStartX = 0;
  private rotationStartY = 0;
  private onPlayStateChange?: (playing: boolean) => void;
  private onTimeUpdate?: (time: number) => void;

  constructor() {
    this.analyzer = new AudioAnalyzer();
  }

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.particleSystem = new ParticleSystem(canvas);
    await this.analyzer.init();
    this.setupInteraction();
    window.addEventListener('resize', this.handleResize);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.analyzer.stop();
    window.removeEventListener('resize', this.handleResize);
    this.removeInteraction();
  }

  private handleResize = () => {
    if (this.particleSystem) this.particleSystem.resize();
  };

  private setupInteraction() {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private removeInteraction() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    if (this.particleSystem) {
      const r = this.particleSystem.getRotation();
      this.rotationStartX = r.rx;
      this.rotationStartY = r.ry;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.particleSystem) return;
    const dx = (e.clientX - this.dragStartX) * 0.005;
    const dy = (e.clientY - this.dragStartY) * 0.005;
    this.particleSystem.setRotation(
      Math.max(-1.2, Math.min(1.2, this.rotationStartX + dy)),
      this.rotationStartY + dx
    );
  };

  private onMouseUp = () => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.particleSystem) return;
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.particleSystem.setZoom(this.particleSystem.getZoom() + delta);
  };

  private onClick = (e: MouseEvent) => {
    if (!this.particleSystem || this.isDragging) return;
    const band = this.particleSystem.findNearestBand(e.clientX, e.clientY);
    if (band) {
      const store = useAppStore.getState();
      const data = store.analysisData;
      const spectrum = this.analyzer.getSpectrumSnapshot();
      this.analyzer.pause();
      useAppStore.getState().setPlaying(false);
      useAppStore.getState().setInfoCard({
        visible: true,
        band,
        emotion: data.emotion,
        spectrum,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.togglePlay();
    }
  };

  async loadPreset(presetId: string) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    this.stop();
    await this.analyzer.loadPreset(async (ctx) => {
      return generatePresetBuffer(ctx, preset.config);
    });
    const store = useAppStore.getState();
    store.setCurrentPreset(presetId);
    store.setCurrentTrackName(preset.name);
    store.setHasAudio(true);
    store.setDuration(this.analyzer.duration);
  }

  async loadFile(file: File): Promise<{ success: boolean; error?: string }> {
    this.stop();
    const result = await this.analyzer.loadFile(file);
    if (result.success) {
      const store = useAppStore.getState();
      store.setCurrentPreset(null);
      store.setCurrentTrackName(file.name.replace(/\.[^/.]+$/, ''));
      store.setHasAudio(true);
      store.setDuration(this.analyzer.duration);
    }
    return result;
  }

  play() {
    this.analyzer.play();
    useAppStore.getState().setPlaying(true);
    if (!this.rafId) this.startLoop();
  }

  stop() {
    this.analyzer.stop();
    useAppStore.getState().setPlaying(false);
  }

  togglePlay() {
    if (this.analyzer.isPlaying) {
      this.analyzer.pause();
      useAppStore.getState().setPlaying(false);
    } else if (this.analyzer.hasAudio) {
      if (useAppStore.getState().currentTime > 0) {
        this.analyzer.resume();
      } else {
        this.analyzer.play();
      }
      useAppStore.getState().setPlaying(true);
      if (!this.rafId) this.startLoop();
    }
  }

  setVolume(v: number) {
    this.analyzer.setVolume(v);
    useAppStore.getState().setVolume(v);
  }

  closeInfoCard() {
    useAppStore.getState().setInfoCard({
      visible: false, band: null, emotion: '', spectrum: { labels: [], values: [] }, x: 0, y: 0,
    });
    this.analyzer.resume();
    useAppStore.getState().setPlaying(true);
  }

  private startLoop() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      const data = this.analyzer.analyze();
      useAppStore.getState().setAnalysisData(data);
      useAppStore.getState().setCurrentTime(this.analyzer.currentTime);

      if (this.particleSystem) {
        this.particleSystem.update(data, dt);
        this.particleSystem.render();
      }

      if (this.analyzer.isPlaying) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  startIdleRender() {
    if (this.rafId) return;
    const emptyData: AnalysisData = { low: 0, mid: 0, high: 0, beat: false, volume: 0, emotion: '静谧', spectrum: new Uint8Array(0) };
    this.lastTime = performance.now();
    const idleLoop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      if (this.particleSystem) {
        this.particleSystem.update(emptyData, dt);
        this.particleSystem.render();
      }
      if (!this.analyzer.isPlaying) {
        this.rafId = requestAnimationFrame(idleLoop);
      }
    };
    this.rafId = requestAnimationFrame(idleLoop);
  }

  getAnalyzer() { return this.analyzer; }
}
