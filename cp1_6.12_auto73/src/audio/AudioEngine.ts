export type SoundPackType = 'electronic' | 'piano' | 'synth';
export type ActionType = 'jump' | 'coin' | 'slide' | 'land' | 'menu';

export interface SoundPackConfig {
  oscillatorType: OscillatorType;
  filterType: BiquadFilterType;
  filterFrequency: number;
  filterQ: number;
  masterGain: number;
  reverb: boolean;
  reverbMix: number;
  distortion: boolean;
  distortionAmount: number;
}

export const SOUND_PACKS: Record<SoundPackType, SoundPackConfig> = {
  electronic: {
    oscillatorType: 'square',
    filterType: 'highpass',
    filterFrequency: 200,
    filterQ: 1,
    masterGain: 0.2,
    reverb: false,
    reverbMix: 0,
    distortion: true,
    distortionAmount: 50
  },
  piano: {
    oscillatorType: 'sine',
    filterType: 'lowpass',
    filterFrequency: 4000,
    filterQ: 0.5,
    masterGain: 0.25,
    reverb: true,
    reverbMix: 0.3,
    distortion: false,
    distortionAmount: 0
  },
  synth: {
    oscillatorType: 'sawtooth',
    filterType: 'lowpass',
    filterFrequency: 800,
    filterQ: 3,
    masterGain: 0.22,
    reverb: false,
    reverbMix: 0,
    distortion: false,
    distortionAmount: 0
  }
};

interface ActiveNode {
  osc: OscillatorNode;
  gain: GainNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentPack: SoundPackType = 'electronic';
  private config: SoundPackConfig;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private activeNodes: ActiveNode[] = [];

  constructor() {
    this.config = { ...SOUND_PACKS.electronic };
  }

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.buildAudioChain();
  }

  private buildAudioChain(): void {
    if (!this.ctx) return;

    this.destroyAudioChain();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.config.masterGain;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = this.config.filterType;
    this.filterNode.frequency.value = this.config.filterFrequency;
    this.filterNode.Q.value = this.config.filterQ;

    if (this.config.distortion) {
      this.distortionNode = this.ctx.createWaveShaper();
      this.distortionNode.curve = this.makeDistortionCurve(this.config.distortionAmount);
      this.distortionNode.oversample = '4x';
    }

    if (this.config.reverb) {
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createImpulseResponse(2, 2.5);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = this.config.reverbMix;
      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1 - this.config.reverbMix;
    }

    this.connectChain();
  }

  private connectChain(): void {
    if (!this.ctx || !this.masterGain || !this.filterNode) return;

    if (this.config.distortion && this.distortionNode) {
      if (this.config.reverb && this.reverbNode && this.reverbGain && this.dryGain) {
        this.filterNode.connect(this.distortionNode);
        this.distortionNode.connect(this.dryGain);
        this.distortionNode.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.dryGain.connect(this.masterGain);
        this.reverbGain.connect(this.masterGain);
      } else {
        this.filterNode.connect(this.distortionNode);
        this.distortionNode.connect(this.masterGain);
      }
    } else {
      if (this.config.reverb && this.reverbNode && this.reverbGain && this.dryGain) {
        this.filterNode.connect(this.dryGain);
        this.filterNode.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.dryGain.connect(this.masterGain);
        this.reverbGain.connect(this.masterGain);
      } else {
        this.filterNode.connect(this.masterGain);
      }
    }

    this.masterGain.connect(this.ctx.destination);
  }

  private destroyAudioChain(): void {
    this.activeNodes.forEach((n) => {
      try { n.osc.stop(); } catch (_) { /* noop */ }
      try { n.osc.disconnect(); } catch (_) { /* noop */ }
      try { n.gain.disconnect(); } catch (_) { /* noop */ }
    });
    this.activeNodes = [];

    try { this.masterGain?.disconnect(); } catch (_) { /* noop */ }
    try { this.filterNode?.disconnect(); } catch (_) { /* noop */ }
    try { this.distortionNode?.disconnect(); } catch (_) { /* noop */ }
    try { this.reverbNode?.disconnect(); } catch (_) { /* noop */ }
    try { this.reverbGain?.disconnect(); } catch (_) { /* noop */ }
    try { this.dryGain?.disconnect(); } catch (_) { /* noop */ }

    this.masterGain = null;
    this.filterNode = null;
    this.distortionNode = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.dryGain = null;
  }

  switchSoundPack(pack: SoundPackType): void {
    if (!this.ctx) return;
    this.currentPack = pack;
    this.config = { ...SOUND_PACKS[pack] };
    this.buildAudioChain();
  }

  getCurrentPack(): SoundPackType {
    return this.currentPack;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  playAction(action: ActionType): void {
    if (!this.ctx || !this.filterNode) return;
    const now = this.ctx.currentTime;

    switch (action) {
      case 'jump':
        this.playArpeggio([261.63, 329.63, 392.00, 523.25], 0.08, now);
        break;
      case 'coin':
        this.playTone(880, 0.1, now, 0.4);
        this.playTone(1318.51, 0.08, now + 0.05, 0.3);
        break;
      case 'slide':
        this.playSweep(120, 80, 0.2, now);
        break;
      case 'land':
        this.playTone(196, 0.08, now, 0.3);
        break;
      case 'menu':
        this.playTone(523.25, 0.08, now, 0.25);
        this.playTone(783.99, 0.07, now + 0.07, 0.2);
        break;
    }
  }

  private playTone(freq: number, duration: number, startTime: number, volume: number = 0.3): void {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = this.config.oscillatorType;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
    this.activeNodes.push({ osc, gain });
    setTimeout(() => {
      const idx = this.activeNodes.findIndex((n) => n.osc === osc);
      if (idx >= 0) this.activeNodes.splice(idx, 1);
    }, (duration + 0.1) * 1000);
  }

  private playArpeggio(freqs: number[], noteGap: number, startTime: number): void {
    freqs.forEach((f, i) => {
      this.playTone(f, noteGap * 1.5, startTime + i * noteGap, 0.35);
    });
  }

  private playSweep(startFreq: number, endFreq: number, duration: number, startTime: number): void {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = this.config.oscillatorType;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), startTime + duration);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
    this.activeNodes.push({ osc, gain });
    setTimeout(() => {
      const idx = this.activeNodes.findIndex((n) => n.osc === osc);
      if (idx >= 0) this.activeNodes.splice(idx, 1);
    }, (duration + 0.1) * 1000);
  }

  playNote(freq: number, duration: number, volume: number = 0.3): void {
    if (!this.ctx) return;
    this.playTone(freq, duration, this.ctx.currentTime, volume);
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }
}
