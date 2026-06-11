import { MarbleType, NOTE_FREQUENCIES, C_MAJOR_SCALE, CONFIG, INSTRUMENT_NAMES } from './constants';

export interface InstrumentConfig {
  oscillatorType: OscillatorType;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    Q?: number;
  };
  gain: number;
  detune?: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private initialized = false;

  private readonly instrumentConfigs: Record<string, InstrumentConfig> = {
    drum: {
      oscillatorType: 'sine',
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.05 },
      gain: 0.4
    },
    bass: {
      oscillatorType: 'sawtooth',
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.2 },
      filter: { type: 'lowpass', frequency: 400, Q: 4 },
      gain: 0.35,
      detune: -1200
    },
    piano: {
      oscillatorType: 'triangle',
      envelope: { attack: 0.002, decay: 0.3, sustain: 0.1, release: 0.4 },
      filter: { type: 'lowpass', frequency: 3500, Q: 1 },
      gain: 0.3
    },
    synth: {
      oscillatorType: 'square',
      envelope: { attack: 0.003, decay: 0.2, sustain: 0.2, release: 0.3 },
      filter: { type: 'bandpass', frequency: 2000, Q: 6 },
      gain: 0.25
    }
  };

  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 24;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.7;

      this.reverbNode = this.audioContext.createConvolver();
      this.reverbGain = this.audioContext.createGain();
      this.reverbGain.gain.value = 0.18;

      await this.createReverbImpulse();

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.audioContext.destination);
      this.reverbGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.error('音频引擎初始化失败:', e);
    }
  }

  private async createReverbImpulse(): Promise<void> {
    if (!this.audioContext || !this.reverbNode) return;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2.0;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }

    this.reverbNode.buffer = impulse;
    this.reverbNode.connect(this.reverbGain!);
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private getFrequency(noteIndex: number, startNote: number = 0): number {
    const scaleIndex = (startNote + noteIndex) % C_MAJOR_SCALE.length;
    const octaveShift = Math.floor((startNote + noteIndex) / C_MAJOR_SCALE.length);
    const noteName = C_MAJOR_SCALE[scaleIndex];
    let freq = NOTE_FREQUENCIES[noteName];
    if (octaveShift > 0) freq *= Math.pow(2, octaveShift);
    if (octaveShift < 0) freq /= Math.pow(2, -octaveShift);
    return freq;
  }

  public playNote(
    marbleType: MarbleType,
    noteIndex: number,
    startNote: number = 0,
    duration: number = CONFIG.NOTE_DURATION
  ): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const instrument = INSTRUMENT_NAMES[marbleType];
    const config = this.instrumentConfigs[instrument];
    if (!config) return;

    const frequency = this.getFrequency(noteIndex, startNote);
    const now = this.audioContext.currentTime;

    this.synthesizeNote(config, frequency, now, duration);

    if (instrument === 'drum') {
      this.playDrumClick(frequency, now);
    }

    if (instrument === 'piano') {
      this.addPianoHarmonics(frequency, now, duration);
    }

    if (instrument === 'synth') {
      this.addSynthModulation(frequency, now, duration);
    }
  }

  private synthesizeNote(
    config: InstrumentConfig,
    frequency: number,
    startTime: number,
    duration: number
  ): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = config.oscillatorType;
    osc.frequency.value = frequency;
    if (config.detune) {
      osc.detune.value = config.detune;
    }

    const { attack, decay, sustain, release } = config.envelope;
    const peakTime = startTime + attack;
    const sustainTime = peakTime + decay;
    const noteEnd = startTime + Math.max(duration, attack + decay + 0.05);
    const releaseEnd = noteEnd + release;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(config.gain, peakTime);
    gainNode.gain.linearRampToValueAtTime(config.gain * sustain, sustainTime);
    gainNode.gain.setValueAtTime(config.gain * sustain, noteEnd);
    gainNode.gain.linearRampToValueAtTime(0.0001, releaseEnd);

    let lastNode: AudioNode = osc;

    if (config.filter) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = config.filter.type;
      filter.frequency.value = config.filter.frequency;
      if (config.filter.Q) filter.Q.value = config.filter.Q;
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    if (this.reverbNode) {
      const reverbSend = this.audioContext.createGain();
      reverbSend.gain.value = 0.3;
      gainNode.connect(reverbSend);
      reverbSend.connect(this.reverbNode);
    }

    osc.start(startTime);
    osc.stop(releaseEnd + 0.05);
  }

  private playDrumClick(frequency: number, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 3);
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = frequency * 2;
    noiseFilter.Q.value = 2;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.08, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(startTime);
    noiseSource.stop(startTime + 0.05);
  }

  private addPianoHarmonics(frequency: number, startTime: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const harmonics = [
      { mult: 2, gain: 0.08, decay: 0.4 },
      { mult: 3, gain: 0.04, decay: 0.3 },
      { mult: 4, gain: 0.02, decay: 0.25 }
    ];

    harmonics.forEach(h => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = frequency * h.mult;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(h.gain, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + h.decay);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + duration + h.decay + 0.05);
    });
  }

  private addSynthModulation(frequency: number, startTime: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = 12;

    osc2.type = 'sawtooth';
    osc2.frequency.value = frequency * 1.005;

    lfo.connect(lfoGain);
    lfoGain.connect(osc2.frequency);

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.1, startTime + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.2);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    lfo.start(startTime);
    osc2.start(startTime);
    lfo.stop(startTime + duration + 0.25);
    osc2.stop(startTime + duration + 0.25);
  }

  public playHarmony(
    marbleType: MarbleType,
    baseNoteIndex: number,
    intervalOffset: number,
    startNote: number = 0
  ): void {
    const harmonyNoteIndex = baseNoteIndex + intervalOffset;
    this.playNote(marbleType, harmonyNoteIndex, startNote, CONFIG.NOTE_DURATION * 1.2);
  }

  public playOrnament(startNote: number = 0): void {
    if (!this.initialized || !this.audioContext) return;

    const noteIndex = Math.floor(Math.random() * C_MAJOR_SCALE.length);
    const ornamentStart = this.audioContext.currentTime;

    this.synthesizeQuickNote(NOTE_FREQUENCIES[C_MAJOR_SCALE[(startNote + noteIndex) % C_MAJOR_SCALE.length]], ornamentStart);

    setTimeout(() => {
      if (!this.audioContext) return;
      const nextIndex = (noteIndex + (Math.random() > 0.5 ? 2 : -2) + C_MAJOR_SCALE.length) % C_MAJOR_SCALE.length;
      this.synthesizeQuickNote(NOTE_FREQUENCIES[C_MAJOR_SCALE[(startNote + nextIndex) % C_MAJOR_SCALE.length]], this.audioContext!.currentTime);
    }, 40);
  }

  private synthesizeQuickNote(frequency: number, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  public getInstrumentConfigs(): Record<string, InstrumentConfig> {
    return { ...this.instrumentConfigs };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}
