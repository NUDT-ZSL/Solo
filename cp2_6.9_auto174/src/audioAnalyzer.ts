import { AudioData, WaveType } from './types';

export class AudioAnalyzer {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private oscillatorGain: GainNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private currentSource: 'file' | 'oscillator' | null = null;

  async init(): Promise<void> {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0.7;
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
  }

  async decodeAudioFile(file: File): Promise<void> {
    if (!this.context) await this.init();
    if (!this.context) throw new Error('AudioContext not initialized');

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.context.decodeAudioData(arrayBuffer);
  }

  playDecodedFile(): void {
    if (!this.context || !this.audioBuffer) return;
    this.stopAll();

    this.sourceNode = this.context.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.gainNode!);
    this.sourceNode.start(0);
    this.sourceNode.onended = () => {
      this.isPlaying = false;
    };

    this.isPlaying = true;
    this.currentSource = 'file';
  }

  startOscillator(type: WaveType, frequency: number, gainValue: number): void {
    if (!this.context) return;
    this.stopAll();

    this.oscillatorNode = this.context.createOscillator();
    this.oscillatorGain = this.context.createGain();

    this.oscillatorNode.type = type as globalThis.OscillatorType;
    this.oscillatorNode.frequency.value = frequency;
    this.oscillatorGain.gain.value = gainValue;

    this.oscillatorNode.connect(this.oscillatorGain);
    this.oscillatorGain.connect(this.gainNode!);
    this.oscillatorNode.start(0);

    this.isPlaying = true;
    this.currentSource = 'oscillator';
  }

  stopAll(): void {
    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.oscillatorNode) {
      try { this.oscillatorNode.stop(); } catch (e) {}
      this.oscillatorNode.disconnect();
      this.oscillatorNode = null;
    }
    if (this.oscillatorGain) {
      this.oscillatorGain.disconnect();
      this.oscillatorGain = null;
    }
    this.isPlaying = false;
    this.currentSource = null;
  }

  togglePlayback(): void {
    if (this.currentSource === 'file') {
      if (this.isPlaying) {
        this.context?.suspend();
        this.isPlaying = false;
      } else {
        this.context?.resume();
        this.isPlaying = true;
      }
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(value, this.context?.currentTime || 0);
    }
  }

  setOscillatorFrequency(frequency: number): void {
    if (this.oscillatorNode && this.currentSource === 'oscillator') {
      this.oscillatorNode.frequency.setValueAtTime(frequency, this.context?.currentTime || 0);
    }
  }

  setOscillatorGain(gainValue: number): void {
    if (this.oscillatorGain && this.currentSource === 'oscillator') {
      this.oscillatorGain.gain.setValueAtTime(gainValue, this.context?.currentTime || 0);
    }
  }

  setOscillatorType(type: WaveType): void {
    if (this.oscillatorNode && this.currentSource === 'oscillator') {
      this.oscillatorNode.type = type as globalThis.OscillatorType;
    }
  }

  getAudioData(): AudioData {
    if (!this.analyser || !this.frequencyData || !this.timeDomainData) {
      return {
        frequencyData: new Uint8Array(512),
        timeDomainData: new Uint8Array(1024),
        averageFrequency: 0,
        lowFrequency: 0,
        highFrequency: 0,
        volume: 0
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    let sum = 0;
    let lowSum = 0;
    let highSum = 0;
    const lowEnd = Math.floor(this.frequencyData.length * 0.1);
    const highStart = Math.floor(this.frequencyData.length * 0.7);

    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
      if (i < lowEnd) lowSum += this.frequencyData[i];
      if (i > highStart) highSum += this.frequencyData[i];
    }

    return {
      frequencyData: new Uint8Array(this.frequencyData),
      timeDomainData: new Uint8Array(this.timeDomainData),
      averageFrequency: sum / this.frequencyData.length,
      lowFrequency: lowSum / lowEnd,
      highFrequency: highSum / (this.frequencyData.length - highStart),
      volume: sum / this.frequencyData.length / 255
    };
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentSource(): 'file' | 'oscillator' | null {
    return this.currentSource;
  }

  hasAudioBuffer(): boolean {
    return this.audioBuffer !== null;
  }
}
