export type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface SoundSource {
  id: string;
  position: { x: number; y: number; z: number };
  color: string;
  volume: number;
  frequency: number;
  waveform: WaveformType;
  glideTime: number;
  active: boolean;
}

export const PRESET_COLORS: string[] = [
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#eab308',
  '#f97316',
];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

interface AudioNodeBundle {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  panner: StereoPannerNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: Map<string, AudioNodeBundle> = new Map();
  private sourceData: Map<string, SoundSource> = new Map();
  private isPlaying = false;
  private globalVolume = 0.7;
  private pitchOffsetSemitones = 0;

  private async ensureContext(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.globalVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public async init(): Promise<void> {
    await this.ensureContext();
  }

  public addSource(source: SoundSource): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.sources.has(source.id)) return;

    const targetFreq = midiToFreq(source.frequency + this.pitchOffsetSemitones);

    const osc = this.ctx.createOscillator();
    osc.type = source.waveform as OscillatorType;
    osc.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    if (this.isPlaying) {
      gainNode.gain.linearRampToValueAtTime(
        (source.volume / 100) * 0.25,
        this.ctx.currentTime + 0.5
      );
    }

    const panner = this.ctx.createStereoPanner();
    const pan = this.computePan(source.position.x);
    panner.pan.setValueAtTime(pan, this.ctx.currentTime);

    osc.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    osc.start();

    this.sources.set(source.id, { oscillator: osc, gainNode, panner });
    this.sourceData.set(source.id, { ...source });
  }

  public removeSource(id: string): void {
    const bundle = this.sources.get(id);
    if (!bundle || !this.ctx) return;

    const now = this.ctx.currentTime;
    bundle.gainNode.gain.cancelScheduledValues(now);
    bundle.gainNode.gain.setValueAtTime(bundle.gainNode.gain.value, now);
    bundle.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

    setTimeout(() => {
      try {
        bundle.oscillator.stop();
      } catch (_) {}
      bundle.oscillator.disconnect();
      bundle.gainNode.disconnect();
      bundle.panner.disconnect();
    }, 150);

    this.sources.delete(id);
    this.sourceData.delete(id);
  }

  public updateSource(source: SoundSource): void {
    const bundle = this.sources.get(source.id);
    const ctx = this.ctx;
    if (!bundle || !ctx) {
      if (!this.sources.has(source.id) && this.ctx) {
        this.addSource(source);
      }
      return;
    }

    const now = ctx.currentTime;
    const targetFreq = midiToFreq(source.frequency + this.pitchOffsetSemitones);

    bundle.oscillator.frequency.cancelScheduledValues(now);
    bundle.oscillator.frequency.setValueAtTime(
      bundle.oscillator.frequency.value,
      now
    );

    const glideTime = Math.max(0, source.glideTime);
    if (glideTime > 0) {
      bundle.oscillator.frequency.linearRampToValueAtTime(
        targetFreq,
        now + glideTime
      );
    } else {
      bundle.oscillator.frequency.setValueAtTime(targetFreq, now);
    }

    try {
      bundle.oscillator.type = source.waveform as OscillatorType;
    } catch (_) {}

    const targetVol = this.isPlaying ? (source.volume / 100) * 0.25 : 0;
    bundle.gainNode.gain.cancelScheduledValues(now);
    bundle.gainNode.gain.setValueAtTime(bundle.gainNode.gain.value, now);
    bundle.gainNode.gain.linearRampToValueAtTime(targetVol, now + 0.03);

    const pan = this.computePan(source.position.x);
    bundle.panner.pan.cancelScheduledValues(now);
    bundle.panner.pan.setValueAtTime(bundle.panner.pan.value, now);
    bundle.panner.pan.linearRampToValueAtTime(pan, now + 0.03);

    this.sourceData.set(source.id, { ...source });
  }

  public updateSourcePosition(id: string, x: number, y: number, z: number): void {
    const bundle = this.sources.get(id);
    const ctx = this.ctx;
    if (!bundle || !ctx) return;

    const now = ctx.currentTime;
    const pan = this.computePan(x);
    bundle.panner.pan.cancelScheduledValues(now);
    bundle.panner.pan.setValueAtTime(bundle.panner.pan.value, now);
    bundle.panner.pan.linearRampToValueAtTime(pan, now + 0.03);

    const data = this.sourceData.get(id);
    if (data) {
      data.position = { x, y, z };
    }
  }

  public play(): void {
    this.isPlaying = true;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.sources.forEach((bundle, id) => {
      const data = this.sourceData.get(id);
      const targetVol = data ? (data.volume / 100) * 0.25 : 0.15;
      bundle.gainNode.gain.cancelScheduledValues(now);
      bundle.gainNode.gain.setValueAtTime(bundle.gainNode.gain.value, now);
      bundle.gainNode.gain.linearRampToValueAtTime(targetVol, now + 0.05);
    });
  }

  public stop(): void {
    this.isPlaying = false;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.sources.forEach((bundle) => {
      bundle.gainNode.gain.cancelScheduledValues(now);
      bundle.gainNode.gain.setValueAtTime(bundle.gainNode.gain.value, now);
      bundle.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
    });
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setGlobalVolume(volumePercent: number): void {
    this.globalVolume = volumePercent / 100;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.globalVolume, now + 0.03);
    }
  }

  public setPitchOffset(semitones: number): void {
    this.pitchOffsetSemitones = semitones;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.sources.forEach((bundle, id) => {
      const data = this.sourceData.get(id);
      if (!data) return;
      const targetFreq = midiToFreq(data.frequency + semitones);
      bundle.oscillator.frequency.cancelScheduledValues(now);
      bundle.oscillator.frequency.setValueAtTime(
        bundle.oscillator.frequency.value,
        now
      );
      bundle.oscillator.frequency.linearRampToValueAtTime(targetFreq, now + 0.05);
    });
  }

  private computePan(x: number): number {
    return Math.max(-1, Math.min(1, x / 15));
  }

  public computeInterference(
    sources: SoundSource[],
    gridX: number,
    gridZ: number,
    time: number
  ): number {
    let amplitude = 0;
    for (const src of sources) {
      if (!src.active) continue;
      const dx = gridX - src.position.x;
      const dz = gridZ - src.position.z;
      const distSq = dx * dx + dz * dz;
      const dist = Math.sqrt(distSq);

      const freq = midiToFreq(src.frequency + this.pitchOffsetSemitones);
      const wavelength = 343 / Math.max(1, freq);
      const phase = (2 * Math.PI * dist) / Math.max(0.5, wavelength * 0.3);

      const timePhase = time * 2 * Math.PI * (freq / 1000);

      const volNorm = src.volume / 100;
      const attenuation = 1 / (1 + dist * 0.2 + distSq * 0.005);

      let waveShape: number;
      const t = ((timePhase - phase) / (2 * Math.PI)) % 1;
      const tt = t < 0 ? t + 1 : t;

      switch (src.waveform) {
        case 'sine':
          waveShape = Math.sin(2 * Math.PI * tt);
          break;
        case 'square':
          waveShape = tt < 0.5 ? 1 : -1;
          break;
        case 'triangle':
          waveShape = tt < 0.25
            ? tt * 4
            : tt < 0.75
              ? 1 - (tt - 0.25) * 4
              : -1 + (tt - 0.75) * 4;
          break;
        case 'sawtooth':
          waveShape = 2 * tt - 1;
          break;
        default:
          waveShape = Math.sin(2 * Math.PI * tt);
      }

      amplitude += volNorm * attenuation * waveShape * 0.6;
    }

    return Math.max(-0.8, Math.min(0.8, amplitude));
  }
}
