export class AudioEngine {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array;
  private gainNode: GainNode;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private onEndedCallback: (() => void) | null = null;

  public readonly barCount: number = 64;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 0.7;
    this.gainNode.connect(this.analyser);
    this.analyser.connect(audioContext.destination);
  }

  public async loadFile(file: File): Promise<void> {
    this.stop();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  public play(): void {
    if (!this.audioBuffer) return;
    if (this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gainNode);

    const offset = this.pauseTime;
    this.source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };
  }

  public pause(): void {
    if (!this.isPlaying || !this.source) return;
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  public stop(): void {
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
    this.audioBuffer = null;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }

  public setOnEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  public getFrequencyData(): number[] {
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    const result: number[] = new Array(this.barCount);
    const binCount = this.frequencyData.length;
    const step = Math.floor(binCount / this.barCount);

    for (let i = 0; i < this.barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += this.frequencyData[i * step + j];
      }
      result[i] = (sum / step) / 255;
    }

    return result;
  }
}
