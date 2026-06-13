import type { SoundType } from '../art/Visuals';

export type { SoundType };

export class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private currentFilter: BiquadFilterNode | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private activeSound: SoundType = 'none';
  private isReady: boolean = false;

  async init(): Promise<void> {
    try {
      this.audioCtx = new AudioContext();
      await this.audioCtx.resume();
      this.preloadBuffers();
      this.isReady = true;
    } catch {
      this.audioCtx = null;
    }
  }

  private preloadBuffers() {
    if (!this.audioCtx) return;
    this.soundBuffers.set('rain', this.createNoiseBuffer('rain'));
    this.soundBuffers.set('stream', this.createNoiseBuffer('stream'));
    this.soundBuffers.set('wind', this.createNoiseBuffer('wind'));
  }

  private createNoiseBuffer(type: 'rain' | 'stream' | 'wind'): AudioBuffer {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const duration = 2;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;
        const channelOffset = channel * 0.01;

        if (type === 'rain') {
          sample = (Math.random() * 2 - 1) * 0.25;
          sample += Math.sin(t * 1200 + channelOffset * 100) * 0.03;
          sample += Math.sin(t * 3500 + channelOffset * 200) * 0.02;
          if (Math.random() < 0.002) {
            sample += (Math.random() - 0.5) * 0.5;
          }
        } else if (type === 'stream') {
          sample = (Math.random() * 2 - 1) * 0.12;
          sample += Math.sin(t * 180 + Math.sin(t * 40 + channelOffset) * 4) * 0.08;
          sample += Math.sin(t * 90 + Math.sin(t * 25 + channelOffset) * 3) * 0.06;
          sample += Math.sin(t * 400 + channelOffset * 50) * 0.02;
        } else {
          sample = (Math.random() * 2 - 1) * 0.08;
          sample += Math.sin(t * 80 + Math.sin(t * 15 + channelOffset) * 6) * 0.06;
          sample += Math.sin(t * 200 + Math.sin(t * 30 + channelOffset) * 4) * 0.03;
          sample += Math.sin(t * 50 + channelOffset * 30) * 0.04;
        }
        data[i] = sample;
      }
    }

    return buffer;
  }

  play(sound: SoundType): SoundType {
    if (!this.isReady || !this.audioCtx) {
      this.activeSound = 'none';
      return 'none';
    }

    this.stopCurrent();

    if (sound === 'none') {
      this.activeSound = 'none';
      return 'none';
    }

    const buffer = this.soundBuffers.get(sound);
    if (!buffer) {
      this.activeSound = 'none';
      return 'none';
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.5);

    const filter = this.audioCtx.createBiquadFilter();
    if (sound === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.5;
    } else if (sound === 'stream') {
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      filter.Q.value = 0.7;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      filter.Q.value = 0.3;
    }

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    source.start();

    this.currentSource = source;
    this.currentGain = gainNode;
    this.currentFilter = filter;
    this.activeSound = sound;

    return sound;
  }

  toggle(): SoundType {
    const sounds: SoundType[] = ['none', 'rain', 'stream', 'wind'];
    const idx = sounds.indexOf(this.activeSound);
    const next = sounds[(idx + 1) % sounds.length];
    return this.play(next);
  }

  getActiveSound(): SoundType {
    return this.activeSound;
  }

  private stopCurrent() {
    if (this.currentGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.currentGain.gain.cancelScheduledValues(now);
        this.currentGain.gain.setValueAtTime(this.currentGain.gain.value, now);
        this.currentGain.gain.linearRampToValueAtTime(0, now + 0.5);
        const src = this.currentSource;
        const filter = this.currentFilter;
        setTimeout(() => {
          try {
            src?.disconnect();
            filter?.disconnect();
            src?.stop();
          } catch { /* */ }
        }, 600);
      } catch { /* */ }
    }
    this.currentSource = null;
    this.currentGain = null;
    this.currentFilter = null;
  }

  playHarp() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.audioCtx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startT = now + i * 0.15;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(0.15, startT + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 1.5);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(startT);
      osc.stop(startT + 1.6);
    });
  }

  destroy() {
    this.stopCurrent();
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch { /* */ }
    }
  }
}
