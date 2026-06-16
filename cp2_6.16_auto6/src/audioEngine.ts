export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    this.frequencyData = new Uint8Array(1024);
  }

  async init(audioElement: HTMLAudioElement, audioUrl: string): Promise<void> {
    if (this.audioContext) {
      this.cleanup();
    }

    this.audioElement = audioElement;
    this.audioElement.src = audioUrl;
    this.audioElement.crossOrigin = 'anonymous';

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  async start(): Promise<void> {
    if (!this.audioContext || !this.audioElement) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (e) {
      console.error('Playback failed:', e);
    }
  }

  pause(): void {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser && this.frequencyData) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      return this.frequencyData;
    }
    return new Uint8Array(1024);
  }

  cleanup(): void {
    this.stop();
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioElement = null;
    this.isPlaying = false;
  }
}
