import { GameEvent } from '../types';
import { eventBus } from './EventBus';

interface AudioTrack {
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
  volume: number;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private tracks: Map<string, AudioTrack> = new Map();
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private currentAmbient: string | null = null;
  private fadeDuration: number = 1000;
  private ambientNodes: Map<string, { oscNodes: OscillatorNode[]; gainNode: GainNode | null }> = new Map();

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5;

      this.isInitialized = true;
      this.setupEventListeners();
      this.preloadSyntheticAmbients();
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
    }
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.PLAY_SOUND, (soundName: string, volume?: number) => {
      this.playSound(soundName, volume);
    });

    eventBus.on(GameEvent.STOP_SOUND, (soundName: string) => {
      this.stopSound(soundName);
    });

    eventBus.on(GameEvent.FADE_SOUND, (soundName: string, targetVolume: number, duration?: number) => {
      this.fadeTo(soundName, targetVolume, duration);
    });

    eventBus.on(GameEvent.SCENE_CHANGE, (sceneData: any) => {
      if (sceneData.ambientSound) {
        this.switchAmbient(sceneData.ambientSound);
      } else {
        this.stopCurrentAmbient();
      }
    });
  }

  private createSyntheticBuffer(soundName: string): AudioBuffer | null {
    if (!this.audioContext) return null;

    const duration = 10;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      switch (soundName) {
        case 'ambient_wind':
          this.generateWind(data, frameCount, sampleRate, channel);
          break;
        case 'ambient_rain':
          this.generateRain(data, frameCount, sampleRate, channel);
          break;
        case 'ambient_forest':
          this.generateForest(data, frameCount, sampleRate, channel);
          break;
        case 'ambient_magic':
          this.generateMagic(data, frameCount, sampleRate, channel);
          break;
        case 'ambient_water':
          this.generateWater(data, frameCount, sampleRate, channel);
          break;
        case 'ambient_fire':
          this.generateFire(data, frameCount, sampleRate, channel);
          break;
        default:
          this.generateWind(data, frameCount, sampleRate, channel);
      }
    }

    return buffer;
  }

  private generateWind(data: Float32Array, frames: number, sr: number, channel: number): void {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const phase = channel * 0.5;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      const pink = b0 + b1 + b2;
      const t = i / sr + phase;
      const slowLfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.05 * t);
      const medLfo = 1 + 0.3 * Math.sin(2 * Math.PI * 0.2 * t);
      data[i] = pink * 0.15 * slowLfo * medLfo;
    }
  }

  private generateRain(data: Float32Array, frames: number, sr: number, channel: number): void {
    for (let i = 0; i < frames; i++) {
      const t = i / sr;
      const baseNoise = (Math.random() * 2 - 1) * 0.08;
      const droplet = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 0.25 : 0;
      const thunder = Math.random() < 0.0001 ? Math.exp(-((t * 0.1) % 5)) * 0.3 : 0;
      const slowVar = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.03 * t);
      data[i] = (baseNoise + droplet + thunder) * slowVar;
    }
  }

  private generateForest(data: Float32Array, frames: number, sr: number, channel: number): void {
    for (let i = 0; i < frames; i++) {
      const t = i / sr + channel * 0.1;
      const wind = (Math.random() * 2 - 1) * 0.03;
      const birdChirp = Math.random() < 0.0008
        ? Math.sin(2 * Math.PI * (2000 + Math.random() * 1500) * (t % 0.1)) * Math.exp(-(t % 0.1) * 30) * 0.15
        : 0;
      const rustle = Math.random() < 0.01 ? (Math.random() * 2 - 1) * 0.05 : 0;
      const ambient = Math.sin(2 * Math.PI * 60 * t) * 0.01 + Math.sin(2 * Math.PI * 120 * t) * 0.005;
      data[i] = wind + birdChirp + rustle + ambient;
    }
  }

  private generateMagic(data: Float32Array, frames: number, sr: number, channel: number): void {
    for (let i = 0; i < frames; i++) {
      const t = i / sr + channel * 0.05;
      const drone = Math.sin(2 * Math.PI * 110 * t) * 0.03 + Math.sin(2 * Math.PI * 165 * t) * 0.02 + Math.sin(2 * Math.PI * 220 * t) * 0.015;
      const shimmer = Math.random() < 0.005
        ? Math.sin(2 * Math.PI * (2000 + Math.random() * 3000) * (t % 0.05)) * Math.exp(-(t % 0.05) * 100) * 0.08
        : 0;
      const sparkle = Math.sin(2 * Math.PI * (4000 + Math.sin(t * 2) * 1000) * t) * 0.005 * Math.sin(t * 0.5);
      const slowPad = Math.sin(2 * Math.PI * 55 * t) * 0.02 * (0.5 + 0.5 * Math.sin(t * 0.3));
      data[i] = drone + shimmer + sparkle + slowPad;
    }
  }

  private generateWater(data: Float32Array, frames: number, sr: number, channel: number): void {
    let y1 = 0, y2 = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / sr + channel * 0.2;
      const white = Math.random() * 2 - 1;
      y1 = (white + 0.997 * y1) * 0.5;
      y2 = (y1 + 0.99 * y2) * 0.5;
      const waveNoise = y2 * 0.1;
      const wave = Math.sin(2 * Math.PI * 0.3 * t) * 0.5 + 0.5;
      const lapping = wave * Math.sin(2 * Math.PI * (0.8 + 0.2 * Math.sin(t)) * t) * 0.04;
      const bubble = Math.random() < 0.0005 ? Math.exp(-((t * 0.01) % 1) * 5) * Math.sin(2 * Math.PI * 500 * t) * 0.1 : 0;
      data[i] = waveNoise * (0.5 + 0.5 * wave) + lapping + bubble;
    }
  }

  private generateFire(data: Float32Array, frames: number, sr: number, channel: number): void {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;
      b0 = 0.985 * b0 + white * 0.06;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.85 * b2 + white * 0.3;
      const crackle = Math.random() < 0.001 ? (Math.random() * 2 - 1) * 0.4 * Math.exp(-((t * 10) % 1) * 20) : 0;
      const rumble = b0 * 0.3 + b1 * 0.2;
      const hiss = b2 * 0.08;
      const flicker = 0.8 + 0.2 * Math.sin(2 * Math.PI * 2 * t + Math.random() * 0.5);
      data[i] = (rumble + hiss + crackle) * flicker;
    }
  }

  private preloadSyntheticAmbients(): void {
    const soundNames = ['ambient_wind', 'ambient_rain', 'ambient_forest', 'ambient_magic', 'ambient_water', 'ambient_fire'];
    for (const name of soundNames) {
      const buffer = this.createSyntheticBuffer(name);
      if (buffer) {
        this.tracks.set(name, {
          buffer,
          source: null,
          gainNode: null,
          isPlaying: false,
          volume: 1,
        });
      }
    }
  }

  async preloadSound(soundName: string, url: string): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    if (this.tracks.has(soundName) && this.tracks.get(soundName)!.buffer) {
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      this.tracks.set(soundName, {
        buffer: audioBuffer,
        source: null,
        gainNode: null,
        isPlaying: false,
        volume: 1,
      });
    } catch (error) {
      console.warn(`Failed to preload sound ${soundName} from ${url}, using synthetic fallback:`, error);
      const fallbackBuffer = this.createSyntheticBuffer(soundName);
      if (fallbackBuffer) {
        this.tracks.set(soundName, {
          buffer: fallbackBuffer,
          source: null,
          gainNode: null,
          isPlaying: false,
          volume: 1,
        });
      }
    }
  }

  async playSound(soundName: string, volume: number = 1): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (!this.audioContext || !this.masterGain) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    let track = this.tracks.get(soundName);
    if (!track || !track.buffer) {
      const fallback = this.createSyntheticBuffer(soundName);
      if (fallback) {
        this.tracks.set(soundName, {
          buffer: fallback,
          source: null,
          gainNode: null,
          isPlaying: false,
          volume: 1,
        });
        track = this.tracks.get(soundName)!;
      } else {
        return;
      }
    }

    if (track.isPlaying && track.source) {
      try {
        track.source.stop();
      } catch {}
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = track.buffer;
      source.loop = soundName.includes('ambient') || soundName.includes('bg');
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start();
      source.onended = () => {
        if (track.source === source) {
          track.isPlaying = false;
        }
      };

      track.source = source;
      track.gainNode = gainNode;
      track.isPlaying = true;
      track.volume = volume;
    } catch (e) {
      console.error(`Error playing sound ${soundName}:`, e);
    }
  }

  stopSound(soundName: string): void {
    const track = this.tracks.get(soundName);
    if (track && track.source) {
      try {
        track.source.stop();
      } catch {}
      track.isPlaying = false;
      track.source = null;
    }

    const ambient = this.ambientNodes.get(soundName);
    if (ambient) {
      ambient.oscNodes.forEach((node) => {
        try { node.stop(); } catch {}
      });
      this.ambientNodes.delete(soundName);
    }
  }

  fadeTo(soundName: string, targetVolume: number, duration: number = this.fadeDuration): void {
    const track = this.tracks.get(soundName);
    if (!track || !track.gainNode || !this.audioContext) return;

    try {
      const currentTime = this.audioContext.currentTime;
      track.gainNode.gain.cancelScheduledValues(currentTime);
      track.gainNode.gain.setValueAtTime(track.volume, currentTime);
      track.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration / 1000);
      track.volume = targetVolume;
    } catch (e) {
      console.error(`Error fading sound ${soundName}:`, e);
    }
  }

  async switchAmbient(newAmbient: string): Promise<void> {
    if (this.currentAmbient === newAmbient) return;

    if (this.currentAmbient) {
      const prev = this.currentAmbient;
      this.fadeTo(prev, 0, this.fadeDuration);
      setTimeout(() => {
        if (this.currentAmbient !== newAmbient) {
          this.stopSound(prev);
        }
      }, this.fadeDuration);
    }

    this.currentAmbient = newAmbient;
    await this.playSound(newAmbient, 0);
    setTimeout(() => {
      this.fadeTo(newAmbient, 0.3, this.fadeDuration);
    }, 50);
  }

  stopCurrentAmbient(): void {
    if (this.currentAmbient) {
      const amb = this.currentAmbient;
      this.fadeTo(amb, 0, this.fadeDuration);
      setTimeout(() => {
        if (this.currentAmbient === amb) {
          this.stopSound(amb);
          this.currentAmbient = null;
        }
      }, this.fadeDuration);
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.audioContext) {
      try {
        this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      } catch {}
    }
  }

  getMasterVolume(): number {
    return this.masterGain ? this.masterGain.gain.value : 0;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  destroy(): void {
    this.tracks.forEach((track) => {
      if (track.source) {
        try { track.source.stop(); } catch {}
      }
    });
    this.tracks.clear();
    this.ambientNodes.forEach((amb) => {
      amb.oscNodes.forEach((n) => { try { n.stop(); } catch {} });
    });
    this.ambientNodes.clear();
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
    }
    this.isInitialized = false;
  }
}

export const audioManager = new AudioManager();
export default audioManager;
