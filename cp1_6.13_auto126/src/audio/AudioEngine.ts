export interface SoundSource {
  id: string;
  position: { x: number; y: number; z: number };
  color: string;
  volume: number;
  frequency: number;
  waveform: OscillatorType;
  glideTime: number;
  active: boolean;
}

type WaveformType = OscillatorType;

const PRESET_COLORS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#f97316'];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: Map<string, {
    oscillator: OscillatorNode;
    gainNode: GainNode;
    panner: StereoPannerNode;
  }> = new Map();
  private isPlaying = false;
  private globalVolume = 0.7;
  private pitchOffset = 0;

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.globalVolume;
    this.masterGain.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  addSource(source: SoundSource): void {
    if (!this.ctx || !this.masterGain) return;

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    const freq = midiToFreq(source.frequency + this.pitchOffset);
    oscillator.type = source.waveform;
    oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    if (this.isPlaying) {
      gainNode.gain.linearRampToValueAtTime(
        (source.volume / 100) * 0.3,
        this.ctx.currentTime + 0.5
      );
    }

    const pan = Math.max(-1, Math.min(1, source.position.x / 15));
    panner.pan.setValueAtTime(pan, this.ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    oscillator.start();

    this.sources.set(source.id, { oscillator, gainNode, panner });
  }

  removeSource(id: string): void {
    const src = this.sources.get(id);
    if (!src) return;
    src.gainNode.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.05);
    setTimeout(() => {
      try {
        src.oscillator.stop();
        src.oscillator.disconnect();
        src.gainNode.disconnect();
        src.panner.disconnect();
      } catch (_) {}
    }, 100);
    this.sources.delete(id);
  }

  updateSource(source: SoundSource): void {
    const src = this.sources.get(source.id);
    if (!src || !this.ctx) return;

    const now = this.ctx.currentTime;
    const targetFreq = midiToFreq(source.frequency + this.pitchOffset);
    const glideTime = source.glideTime;

    if (glideTime > 0) {
      src.oscillator.frequency.linearRampToValueAtTime(targetFreq, now + glideTime);
    } else {
      src.oscillator.frequency.setValueAtTime(targetFreq, now);
    }

    src.oscillator.type = source.waveform;

    const targetVol = this.isPlaying ? (source.volume / 100) * 0.3 : 0;
    src.gainNode.gain.linearRampToValueAtTime(targetVol, now + 0.02);

    const pan = Math.max(-1, Math.min(1, source.position.x / 15));
    src.panner.pan.linearRampToValueAtTime(pan, now + 0.02);
  }

  updateSourcePosition(id: string, x: number, _y: number, z: number): void {
    const src = this.sources.get(id);
    if (!src || !this.ctx) return;
    const pan = Math.max(-1, Math.min(1, x / 15));
    src.panner.pan.linearRampToValueAtTime(pan, this.ctx.currentTime + 0.02);
  }

  play(): void {
    this.isPlaying = true;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.sources.forEach((src) => {
      src.gainNode.gain.linearRampToValueAtTime(
        0.3,
        now + 0.05
      );
    });
  }

  stop(): void {
    this.isPlaying = false;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.sources.forEach((src) => {
      src.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
    });
  }

  setGlobalVolume(vol: number): void {
    this.globalVolume = vol / 100;
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        this.globalVolume,
        this.ctx!.currentTime + 0.02
      );
    }
  }

  setPitchOffset(semitones: number): void {
    this.pitchOffset = semitones;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sources.forEach((src, id) => {
      const el = Array.from(this.sources.entries()).find(([k]) => k === id);
      if (!el) return;
      src.oscillator.frequency.linearRampToValueAtTime(
        midiToFreq(69 + this.pitchOffset),
        now + 0.05
      );
    });
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  computeInterference(
    sources: SoundSource[],
    gridX: number,
    gridZ: number,
    time: number
  ): number {
    let amplitude = 0;
    for (const source of sources) {
      if (!source.active) continue;
      const dx = gridX - source.position.x;
      const dz = gridZ - source.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const freq = midiToFreq(source.frequency + this.pitchOffset);
      const phase = (2 * Math.PI * freq * time) / 440;
      const attenuation = source.volume / 100;
      const distAtten = 1 / (1 + dist * 0.15);
      amplitude += attenuation * distAtten * Math.sin(phase - dist * 0.5);
    }
    return Math.max(-0.8, Math.min(0.8, amplitude * 0.4));
  }
}

export { PRESET_COLORS, midiToFreq, freqToMidi };
export type { WaveformType };
