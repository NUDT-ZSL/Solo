type Listener = () => void;

interface EmitterConfig {
  id: string;
  position: { x: number; y: number; z: number };
  intensity: number;
  color: string;
  spread: number;
}

interface WindParams {
  strength: number;
  direction: number;
  turbulence: number;
}

interface Keyframe {
  timestamp: number;
  particlePositions: Float32Array;
  emitterIds: string[];
}

class Store {
  private listeners: Map<string, Listener[]> = new Map();
  private emitters: Map<string, EmitterConfig> = new Map();
  private wind: WindParams = { strength: 2, direction: 0, turbulence: 1 };
  private keyframes: Keyframe[] = [];
  private isRecording = false;
  private isPlaying = false;
  private playbackSpeed = 1;
  private selectedEmitterId: string | null = null;
  private viewMode: 'top' | 'side' | 'free' | 'firstPerson' = 'free';
  private fps = 0;
  private particleCount = 0;

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return () => {
      const arr = this.listeners.get(event);
      if (arr) {
        const idx = arr.indexOf(listener);
        if (idx > -1) arr.splice(idx, 1);
      }
    };
  }

  emit(event: string): void {
    const arr = this.listeners.get(event);
    if (arr) arr.forEach((fn) => fn());
  }

  addEmitter(config: EmitterConfig): void {
    this.emitters.set(config.id, config);
    this.emit('emitters:change');
  }

  removeEmitter(id: string): void {
    this.emitters.delete(id);
    if (this.selectedEmitterId === id) {
      this.selectedEmitterId = null;
      this.emit('emitter:select');
    }
    this.emit('emitters:change');
  }

  updateEmitter(id: string, partial: Partial<EmitterConfig>): void {
    const existing = this.emitters.get(id);
    if (existing) {
      Object.assign(existing, partial);
      this.emit('emitters:change');
    }
  }

  getEmitter(id: string): EmitterConfig | undefined {
    return this.emitters.get(id);
  }

  getAllEmitters(): EmitterConfig[] {
    return Array.from(this.emitters.values());
  }

  getEmitterCount(): number {
    return this.emitters.size;
  }

  selectEmitter(id: string | null): void {
    this.selectedEmitterId = id;
    this.emit('emitter:select');
  }

  getSelectedEmitterId(): string | null {
    return this.selectedEmitterId;
  }

  setWind(params: Partial<WindParams>): void {
    Object.assign(this.wind, params);
    this.emit('wind:change');
  }

  getWind(): WindParams {
    return { ...this.wind };
  }

  setRecording(val: boolean): void {
    this.isRecording = val;
    this.emit('recording:change');
  }

  getRecording(): boolean {
    return this.isRecording;
  }

  addKeyframe(kf: Keyframe): void {
    if (this.keyframes.length >= 50) {
      this.keyframes.shift();
    }
    this.keyframes.push(kf);
    this.emit('keyframes:change');
  }

  getKeyframes(): Keyframe[] {
    return this.keyframes;
  }

  clearKeyframes(): void {
    this.keyframes = [];
    this.emit('keyframes:change');
  }

  setPlaying(val: boolean): void {
    this.isPlaying = val;
    this.emit('playing:change');
  }

  getPlaying(): boolean {
    return this.isPlaying;
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  setViewMode(mode: 'top' | 'side' | 'free' | 'firstPerson'): void {
    this.viewMode = mode;
    this.emit('view:change');
  }

  getViewMode(): 'top' | 'side' | 'free' | 'firstPerson' {
    return this.viewMode;
  }

  setFps(fps: number): void {
    this.fps = fps;
  }

  getFps(): number {
    return this.fps;
  }

  setParticleCount(count: number): void {
    this.particleCount = count;
  }

  getParticleCount(): number {
    return this.particleCount;
  }
}

export const store = new Store();
export type { EmitterConfig, WindParams, Keyframe };
