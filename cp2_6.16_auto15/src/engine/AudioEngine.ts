import type { InstrumentType, EnsembleResult, Note } from '../types';

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioContext: AudioContext | null = null;

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playNote(instrument: InstrumentType, pitch: number, duration: number): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const baseFreq = 220 * Math.pow(2, pitch / 12);
    const now = ctx.currentTime;

    switch (instrument) {
      case 'piano': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(baseFreq * 2, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
        break;
      }
      case 'violin': {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, now);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(6, now);
        lfoGain.gain.setValueAtTime(3, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + duration);
        lfo.stop(now + duration);
        break;
      }
      case 'cello': {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq / 2, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        break;
      }
      case 'flute': {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        break;
      }
      case 'percussion': {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(now);
        break;
      }
    }
  }

  playBell(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  async playEnsemble(result: EnsembleResult, onProgress: (progress: number) => void): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) {
        resolve();
        return;
      }

      const events: Array<{ time: number; note: Note }> = [];
      const beatsPerSecond = 2;

      for (const measure of result.measures) {
        for (const note of measure.notes) {
          const time = (measure.measureNumber - 1) * 4 * beatsPerSecond + note.beat * beatsPerSecond;
          events.push({ time, note });
        }
      }

      if (events.length === 0) {
        onProgress(100);
        resolve();
        return;
      }

      const startTime = this.audioContext.currentTime;
      const totalDuration = result.totalDuration;

      for (const event of events) {
        setTimeout(() => {
          this.playNote(event.note.instrument, event.note.pitch, event.note.duration);
        }, event.time * 1000);
      }

      const progressInterval = setInterval(() => {
        const elapsed = this.audioContext!.currentTime - startTime;
        const progress = Math.min(100, (elapsed / totalDuration) * 100);
        onProgress(progress);

        if (progress >= 100) {
          clearInterval(progressInterval);
          resolve();
        }
      }, 50);
    });
  }
}
