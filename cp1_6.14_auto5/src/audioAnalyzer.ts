export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  lowFrequency: number;
  highFrequency: number;
  decibel: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyDataArray: Uint8Array<ArrayBuffer> = new Uint8Array();
  private timeDomainDataArray: Uint8Array<ArrayBuffer> = new Uint8Array();
  private sampleRate: number = 44100;
  private fftSize: number = 2048;

  constructor() {}

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.sampleRate = this.audioContext.sampleRate;
    }
  }

  async loadFile(file: File): Promise<void> {
    this.ensureContext();
    this.stop();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.crossOrigin = 'anonymous';

    this.source = this.audioContext!.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser!);
    this.analyser!.connect(this.audioContext!.destination);
  }

  async play(): Promise<void> {
    if (!this.audioElement) return;
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }
    await this.audioElement.play();
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if (this.source instanceof AudioBufferSourceNode) {
      try {
        this.source.stop();
      } catch (_e) {
        // already stopped
      }
    }
    this.source = null;
  }

  get isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  getAudioData(): AudioData {
    if (!this.analyser) {
      return {
        frequencyData: new Uint8Array(),
        timeDomainData: new Uint8Array(),
        lowFrequency: 0,
        highFrequency: 0,
        decibel: -60,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyDataArray);
    this.analyser.getByteTimeDomainData(this.timeDomainDataArray);

    const binCount = this.analyser.frequencyBinCount;
    const nyquist = this.sampleRate / 2;
    const binFrequency = nyquist / binCount;

    const lowStartBin = Math.floor(0 / binFrequency);
    const lowEndBin = Math.floor(200 / binFrequency);
    const highStartBin = Math.floor(2000 / binFrequency);
    const highEndBin = Math.min(Math.floor(8000 / binFrequency), binCount - 1);

    let lowSum = 0;
    let lowCount = 0;
    for (let i = lowStartBin; i <= lowEndBin; i++) {
      lowSum += this.frequencyDataArray[i];
      lowCount++;
    }
    const lowFreq = lowCount > 0 ? lowSum / lowCount / 255 : 0;

    let highSum = 0;
    let highCount = 0;
    for (let i = highStartBin; i <= highEndBin; i++) {
      highSum += this.frequencyDataArray[i];
      highCount++;
    }
    const highFreq = highCount > 0 ? highSum / highCount / 255 : 0;

    let totalSum = 0;
    for (let i = 0; i < binCount; i++) {
      totalSum += this.frequencyDataArray[i];
    }
    const avgAmplitude = totalSum / binCount / 255;
    const decibel = avgAmplitude > 0 ? 20 * Math.log10(avgAmplitude) : -60;
    const clampedDb = Math.max(-60, Math.min(0, decibel));

    return {
      frequencyData: this.frequencyDataArray,
      timeDomainData: this.timeDomainDataArray,
      lowFrequency: lowFreq,
      highFrequency: highFreq,
      decibel: clampedDb,
    };
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  getCurrentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  setCurrentTime(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
    }
  }
}
