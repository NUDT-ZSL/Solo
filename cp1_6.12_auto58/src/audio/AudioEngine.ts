import type { SoundCard } from '../data/CardDeck';
import { WaveformType } from '../data/CardDeck';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentOscillators: OscillatorNode[] = [];
  private waveformData: Float32Array;
  private frequencyData: Uint8Array;

  constructor() {
    this.waveformData = new Float32Array(512);
    this.frequencyData = new Uint8Array(256);
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AC();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playCardSound(card: SoundCard): void {
    const ctx = this.ensureContext();
    const analyser = this.analyser!;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = card.waveform;
    oscillator.frequency.setValueAtTime(card.frequency, ctx.currentTime);

    const baseFreq = card.frequency;
    const endFreq = card.type === 'attack' ? baseFreq * 0.5 : baseFreq * 1.5;
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 20),
      ctx.currentTime + card.duration
    );

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + card.duration);

    oscillator.connect(gainNode);
    gainNode.connect(analyser);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + card.duration);

    this.currentOscillators.push(oscillator);
    oscillator.onended = () => {
      const idx = this.currentOscillators.indexOf(oscillator);
      if (idx > -1) this.currentOscillators.splice(idx, 1);
    };
  }

  playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ensureContext();
    const analyser = this.analyser!;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(analyser);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  getWaveformData(): Float32Array {
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.waveformData);
    }
    return this.waveformData;
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  getFrequencyBand(card: SoundCard): 'low' | 'mid' | 'high' {
    if (card.frequency < 400) return 'low';
    if (card.frequency < 1000) return 'mid';
    return 'high';
  }

  getWaveformColor(card: SoundCard): number {
    if (card.waveform === WaveformType.SINE) return 0x3b82f6;
    if (card.waveform === WaveformType.SQUARE) return 0xef4444;
    return 0x22c55e;
  }

  getAICardColor(card: SoundCard): number {
    if (card.waveform === WaveformType.SINE) return 0x7c3aed;
    if (card.waveform === WaveformType.SQUARE) return 0x9333ea;
    return 0x6d28d9;
  }
}
