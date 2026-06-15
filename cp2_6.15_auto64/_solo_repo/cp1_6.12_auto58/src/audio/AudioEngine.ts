import type { SoundCard } from '../data/CardDeck';
import { CardType, WaveformType } from '../data/CardDeck';

export interface AudioAnalysisData {
  waveform: Float32Array;
  frequency: Uint8Array;
  isPlaying: boolean;
  peakFrequency: number;
  rms: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeNodes: AudioNode[] = [];
  private waveformData: Float32Array = new Float32Array(512);
  private frequencyData: Uint8Array = new Uint8Array(256);
  private _isPlaying: boolean = false;
  private playStartTime: number = 0;
  private currentDuration: number = 0;

  init(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.7;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.waveformData = new Float32Array(this.analyser.fftSize);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCardSound(card: SoundCard): void {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    this.stopAll();

    const now = this.ctx.currentTime;
    this._isPlaying = true;
    this.playStartTime = now;
    this.currentDuration = card.duration;

    this.createMainOscillator(card, now);
    this.createHarmonics(card, now);
    this.createSubBass(card, now);

    const endNode = this.masterGain;
    this.timeDelayedCleanup(card.duration + 0.1, endNode);
  }

  private createMainOscillator(card: SoundCard, now: number): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = card.waveform as OscillatorType;
    osc.frequency.setValueAtTime(card.frequency, now);

    switch (card.type) {
      case CardType.ATTACK:
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(card.frequency * 0.4, 20), now + card.duration
        );
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
        gain.gain.setValueAtTime(0.35, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + card.duration);
        break;
      case CardType.DEFENSE:
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(card.frequency * 1.3, 20), now + card.duration
        );
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.setValueAtTime(0.2, now + card.duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + card.duration);
        break;
      case CardType.DISRUPT:
        osc.frequency.setValueAtTime(card.frequency, now);
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(card.frequency * 2.5, 20), now + card.duration * 0.3
        );
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(card.frequency * 0.3, 20), now + card.duration
        );
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        for (let i = 0; i < 4; i++) {
          const t = now + (i / 4) * card.duration;
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.linearRampToValueAtTime(0.05, t + card.duration / 8);
        }
        gain.gain.exponentialRampToValueAtTime(0.001, now + card.duration);
        break;
    }

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + card.duration + 0.05);

    this.activeNodes.push(osc, gain);
    osc.onended = () => this.removeNode(osc);
  }

  private createHarmonics(card: SoundCard, now: number): void {
    if (!this.ctx || !this.masterGain) return;

    const harmonicRatios = [2, 3];
    const harmonicGains = [0.12, 0.06];

    harmonicRatios.forEach((ratio, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = card.waveform as OscillatorType;
      const harmFreq = card.frequency * ratio;
      osc.frequency.setValueAtTime(harmFreq, now);

      if (card.type === CardType.ATTACK) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(harmFreq * 0.4, 20), now + card.duration
        );
      } else {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(harmFreq * 1.2, 20), now + card.duration
        );
      }

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(harmonicGains[idx], now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + card.duration * 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + card.duration);

      this.activeNodes.push(osc, gain);
      osc.onended = () => this.removeNode(osc);
    });
  }

  private createSubBass(card: SoundCard, now: number): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(card.frequency / 4, 30), now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(card.frequency / 8, 20), now + card.duration
    );

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + card.duration * 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + card.duration);

    this.activeNodes.push(osc, gain);
    osc.onended = () => this.removeNode(osc);
  }

  private removeNode(node: AudioNode): void {
    const idx = this.activeNodes.indexOf(node);
    if (idx > -1) this.activeNodes.splice(idx, 1);
  }

  private timeDelayedCleanup(delay: number, _endNode: AudioNode): void {
    setTimeout(() => {
      if (this.activeNodes.length === 0) {
        this._isPlaying = false;
      }
    }, delay * 1000);
  }

  stopAll(): void {
    this.activeNodes.forEach(node => {
      if (node instanceof OscillatorNode) {
        try { node.stop(); } catch { /* already stopped */ }
      }
    });
    this.activeNodes = [];
    this._isPlaying = false;
  }

  getAnalysis(): AudioAnalysisData {
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.waveformData);
      this.analyser.getByteFrequencyData(this.frequencyData);

      if (this._isPlaying && this.ctx) {
        const elapsed = this.ctx.currentTime - this.playStartTime;
        if (elapsed > this.currentDuration + 0.1) {
          this._isPlaying = false;
        }
      }
    }

    let peakFrequency = 0;
    let maxVal = 0;
    if (this.frequencyData.length > 0) {
      for (let i = 0; i < this.frequencyData.length; i++) {
        if (this.frequencyData[i] > maxVal) {
          maxVal = this.frequencyData[i];
          peakFrequency = i;
        }
      }
    }

    let rms = 0;
    for (let i = 0; i < this.waveformData.length; i++) {
      rms += this.waveformData[i] * this.waveformData[i];
    }
    rms = Math.sqrt(rms / this.waveformData.length);

    return {
      waveform: this.waveformData,
      frequency: this.frequencyData,
      isPlaying: this._isPlaying,
      peakFrequency,
      rms
    };
  }

  getWaveformSample(index: number): number {
    if (this.analyser && this._isPlaying) {
      this.analyser.getFloatTimeDomainData(this.waveformData);
    }
    if (index >= 0 && index < this.waveformData.length) {
      return this.waveformData[index];
    }
    return 0;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  playUIClick(): void {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playResultSound(won: boolean): void {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = won ? [523.25, 659.25, 783.99] : [392, 349.23, 293.66];
    const noteDur = 0.25;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = won ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * noteDur);
      gain.gain.setValueAtTime(0, now + i * noteDur);
      gain.gain.linearRampToValueAtTime(0.2, now + i * noteDur + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * noteDur + noteDur);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * noteDur);
      osc.stop(now + i * noteDur + noteDur + 0.05);
    });
  }

  destroy(): void {
    this.stopAll();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.analyser = null;
    this.masterGain = null;
  }
}
