export interface SpectrumData {
  low: number;
  mid: number;
  high: number;
  full: Uint8Array;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array;
  private timeData: Uint8Array;
  private isPlaying: boolean = false;
  private onUpdateCallback: (data: SpectrumData) => void = () => {};

  constructor() {
    this.frequencyData = new Uint8Array(256);
    this.timeData = new Uint8Array(256);
  }

  public async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;

    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.audioBuffer = this.generateOceanAudio();
  }

  private generateOceanAudio(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    const ctx = this.audioContext;
    const sampleRate = ctx.sampleRate;
    const duration = 15;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;

        const lfo1 = Math.sin(2 * Math.PI * 0.15 * t);
        const lfo2 = Math.sin(2 * Math.PI * 0.07 * t + 1.3);
        const baseFreq = 40 + lfo1 * 15 + lfo2 * 10;
        sample += Math.sin(2 * Math.PI * baseFreq * t) * 0.35;
        sample += Math.sin(2 * Math.PI * baseFreq * 2 * t + 0.5) * 0.15;
        sample += Math.sin(2 * Math.PI * (baseFreq * 0.5) * t + 1.2) * 0.2;

        const rumble = (Math.random() * 2 - 1) * 0.08;
        sample += rumble * (0.5 + lfo1 * 0.5);

        const bubbleProb = 0.0003;
        if (Math.random() < bubbleProb) {
          const bubbleStart = i;
          const bubbleDur = Math.floor(sampleRate * (0.05 + Math.random() * 0.15));
          const bubbleFreq = 200 + Math.random() * 600;
          for (let b = 0; b < bubbleDur && bubbleStart + b < length; b++) {
            const bt = b / sampleRate;
            const env = Math.sin(Math.PI * (b / bubbleDur));
            data[bubbleStart + b] += Math.sin(2 * Math.PI * bubbleFreq * bt) * env * 0.15;
          }
        }

        const slowMod = Math.sin(2 * Math.PI * 0.02 * t) * 0.3 + 0.7;
        sample *= slowMod;

        data[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    return buffer;
  }

  public play(): void {
    if (!this.audioContext || !this.audioBuffer) return;
    if (this.isPlaying) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.analyser!);
    this.sourceNode.start();
    this.isPlaying = true;
  }

  public pause(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value / 100));
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public onUpdate(callback: (data: SpectrumData) => void): void {
    this.onUpdateCallback = callback;
  }

  public update(): SpectrumData {
    if (!this.analyser) {
      return { low: 0, mid: 0, high: 0, full: this.frequencyData };
    }
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);

    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binHz = sampleRate / (binCount * 2);

    const lowEnd = Math.floor(100 / binHz);
    const midStart = lowEnd;
    const midEnd = Math.floor(500 / binHz);
    const highStart = midEnd;
    const highEnd = Math.min(binCount, Math.floor(2000 / binHz));

    let lowSum = 0, midSum = 0, highSum = 0;
    for (let i = 0; i < lowEnd; i++) lowSum += this.frequencyData[i];
    for (let i = midStart; i < midEnd; i++) midSum += this.frequencyData[i];
    for (let i = highStart; i < highEnd; i++) highSum += this.frequencyData[i];

    const low = (lowSum / Math.max(1, lowEnd)) / 255;
    const mid = (midSum / Math.max(1, midEnd - midStart)) / 255;
    const high = (highSum / Math.max(1, highEnd - highStart)) / 255;

    const data: SpectrumData = { low, mid, high, full: this.frequencyData };
    this.onUpdateCallback(data);
    return data;
  }

  public getTimeData(): Uint8Array {
    return this.timeData;
  }
}
