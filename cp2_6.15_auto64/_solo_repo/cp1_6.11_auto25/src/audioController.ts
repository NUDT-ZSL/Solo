export type TimbreStyle = 'soft' | 'bright' | 'dark';

export interface AudioData {
  spectrum: Uint8Array;
  bpm: number;
  bassLevel: number;
  midHighLevel: number;
  isPlaying: boolean;
}

interface TimbreConfig {
  masterVolume: number;
  kickGain: number;
  padOscType: OscillatorType;
  padVolume: number;
  padFilterFreq: number;
  arpOscType: OscillatorType;
  arpVolume: number;
  delayTime: number;
  delayFeedback: number;
  baseFreq: number;
}

const TIMBRE_CONFIGS: Record<TimbreStyle, TimbreConfig> = {
  soft: {
    masterVolume: 0.35,
    kickGain: 0.5,
    padOscType: 'sine',
    padVolume: 0.18,
    padFilterFreq: 1200,
    arpOscType: 'sine',
    arpVolume: 0.12,
    delayTime: 0.45,
    delayFeedback: 0.35,
    baseFreq: 220
  },
  bright: {
    masterVolume: 0.4,
    kickGain: 0.7,
    padOscType: 'triangle',
    padVolume: 0.22,
    padFilterFreq: 2400,
    arpOscType: 'square',
    arpVolume: 0.15,
    delayTime: 0.3,
    delayFeedback: 0.45,
    baseFreq: 330
  },
  dark: {
    masterVolume: 0.38,
    kickGain: 0.8,
    padOscType: 'sawtooth',
    padVolume: 0.2,
    padFilterFreq: 600,
    arpOscType: 'sawtooth',
    arpVolume: 0.1,
    delayTime: 0.6,
    delayFeedback: 0.5,
    baseFreq: 110
  }
};

class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private padOscillators: OscillatorNode[] = [];
  private padGains: GainNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private spectrumData: Uint8Array = new Uint8Array(new ArrayBuffer(128));
  private frameCounter: number = 0;
  private _bpm: number = 90;
  private _isPlaying: boolean = false;
  private _timbreStyle: TimbreStyle = 'soft';
  private beatInterval: number | null = null;
  private beatCount: number = 0;
  private arpInterval: number | null = null;
  private startOnResume: boolean = false;
  private cachedBassLevel: number = 0;
  private cachedMidHighLevel: number = 0;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get bpm(): number {
    return this._bpm;
  }

  get timbreStyle(): TimbreStyle {
    return this._timbreStyle;
  }

  private ensureContext(): void {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;
    this.spectrumData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    this.delayNode = this.ctx.createDelay(2);
    this.delayFeedback = this.ctx.createGain();

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  setTimbre(style: TimbreStyle): void {
    this._timbreStyle = style;
    const config = TIMBRE_CONFIGS[style];

    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this._isPlaying ? config.masterVolume : 0,
        this.ctx.currentTime,
        0.1
      );
    }

    if (this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime(config.delayTime, this.ctx?.currentTime ?? 0, 0.1);
    }
    if (this.delayFeedback) {
      this.delayFeedback.gain.setTargetAtTime(config.delayFeedback, this.ctx?.currentTime ?? 0, 0.1);
    }
    if (this.padFilter) {
      this.padFilter.frequency.setTargetAtTime(config.padFilterFreq, this.ctx?.currentTime ?? 0, 0.2);
    }
    if (this.padGains.length > 0 && this.ctx) {
      this.padGains.forEach((g, i) => {
        g.gain.setTargetAtTime(config.padVolume * (i === 0 ? 1 : 0.6), this.ctx!.currentTime, 0.2);
      });
    }
  }

  private scheduleKick(time: number): void {
    if (!this.ctx || !this.masterGain) return;
    const config = TIMBRE_CONFIGS[this._timbreStyle];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(config.kickGain, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode!);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  private scheduleArpNote(time: number, step: number): void {
    if (!this.ctx || !this.masterGain) return;
    const config = TIMBRE_CONFIGS[this._timbreStyle];
    const arpNotes = [0, 3, 7, 10, 12, 10, 7, 3];
    const semitone = arpNotes[step % arpNotes.length];
    const freq = config.baseFreq * Math.pow(2, semitone / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = config.arpOscType;
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = config.padFilterFreq * 1.5;
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(config.arpVolume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode!);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private createPad(): void {
    if (!this.ctx || !this.masterGain) return;
    const config = TIMBRE_CONFIGS[this._timbreStyle];

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = config.padFilterFreq;
    this.padFilter.Q.value = 0.8;

    const intervals = [0, 7, 12, 19];
    intervals.forEach((semitone, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = config.padOscType;
      osc.frequency.value = config.baseFreq * Math.pow(2, semitone / 12);

      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(this.padFilter!);

      this.padOscillators.push(osc);
      this.padGains.push(gain);

      osc.start();
    });

    this.padFilter.connect(this.masterGain);
    this.padFilter.connect(this.delayNode!);
  }

  private startSequencer(): void {
    if (!this.ctx) return;

    const beatDur = 60 / this._bpm;
    this.beatCount = 0;

    this.padGains.forEach((g, i) => {
      const config = TIMBRE_CONFIGS[this._timbreStyle];
      g.gain.setTargetAtTime(config.padVolume * (i === 0 ? 1 : 0.6), this.ctx!.currentTime, 0.5);
    });

    const scheduleAhead = 0.1;
    let nextBeatTime = this.ctx.currentTime + 0.05;
    let arpStep = 0;

    const tick = () => {
      if (!this._isPlaying || !this.ctx) return;

      while (nextBeatTime < this.ctx.currentTime + scheduleAhead) {
        const beatInBar = this.beatCount % 16;

        if (beatInBar % 4 === 0) {
          this.scheduleKick(nextBeatTime);
        }

        if (beatInBar % 2 === 0) {
          this.scheduleArpNote(nextBeatTime, arpStep);
          arpStep++;
        }

        if (beatInBar % 8 === 4 && this._timbreStyle !== 'dark') {
          this.scheduleKick(nextBeatTime * 0.98 + 0.02);
        }

        nextBeatTime += beatDur / 4;
        this.beatCount++;
      }

      this.beatInterval = window.setTimeout(tick, 25);
    };

    tick();
  }

  private stopSequencer(): void {
    if (this.beatInterval !== null) {
      clearTimeout(this.beatInterval);
      this.beatInterval = null;
    }
    if (this.arpInterval !== null) {
      clearTimeout(this.arpInterval);
      this.arpInterval = null;
    }
  }

  async start(): Promise<void> {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.startOnResume = true;
      await this.ctx.resume();
    }

    this._bpm = 60 + Math.floor(Math.random() * 61);

    if (this.padOscillators.length === 0) {
      this.createPad();
    }

    const config = TIMBRE_CONFIGS[this._timbreStyle];
    this.masterGain.gain.setTargetAtTime(config.masterVolume, this.ctx.currentTime, 0.3);

    if (this.delayNode) this.delayNode.delayTime.value = config.delayTime;
    if (this.delayFeedback) this.delayFeedback.gain.value = config.delayFeedback;

    this._isPlaying = true;
    this.startSequencer();
  }

  stop(): void {
    if (!this.ctx || !this.masterGain) {
      this._isPlaying = false;
      return;
    }

    this.stopSequencer();

    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    this.padGains.forEach(g => {
      g.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.3);
    });

    setTimeout(() => {
      this._isPlaying = false;
    }, 500);
  }

  getAudioData(): AudioData {
    this.frameCounter++;

    if (this.analyser && this.frameCounter % 3 === 0) {
      this.analyser.getByteFrequencyData(this.spectrumData as Uint8Array<ArrayBuffer>);

      const bassEnd = Math.floor(this.spectrumData.length * 0.12);
      const midStart = Math.floor(this.spectrumData.length * 0.35);
      const midEnd = this.spectrumData.length;

      let bassSum = 0;
      for (let i = 0; i < bassEnd; i++) bassSum += this.spectrumData[i];
      this.cachedBassLevel = bassSum / bassEnd / 255;

      let midSum = 0;
      for (let i = midStart; i < midEnd; i++) midSum += this.spectrumData[i];
      this.cachedMidHighLevel = midSum / (midEnd - midStart) / 255;
    }

    return {
      spectrum: this.spectrumData,
      bpm: this._bpm,
      bassLevel: this.cachedBassLevel,
      midHighLevel: this.cachedMidHighLevel,
      isPlaying: this._isPlaying
    };
  }

  destroy(): void {
    this.stop();
    this.stopSequencer();
    this.padOscillators.forEach(o => { try { o.stop(); } catch { /* noop */ } });
    this.padOscillators = [];
    this.padGains = [];
    if (this.ctx) {
      try { this.ctx.close(); } catch { /* noop */ }
      this.ctx = null;
    }
  }
}

export const audioController = new AudioController();
