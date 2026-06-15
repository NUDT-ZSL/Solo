export interface SpectrumData {
  frequencies: Uint8Array;
  timestamp: number;
}

export type SpectrumCallback = (data: SpectrumData) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private animationFrame: number | null = null;
  private callback: SpectrumCallback | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  async loadFile(file: File | string, callback: SpectrumCallback): Promise<void> {
    this.stop();
    this.callback = callback;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    if (typeof file === 'string') {
      this.audioElement.src = file;
    } else {
      const url = URL.createObjectURL(file);
      this.audioElement.src = url;
    }

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.audioElement.addEventListener('canplaythrough', () => {
      this.audioElement?.play();
    }, { once: true });

    this.startPolling();
  }

  private startPolling(): void {
    this.intervalId = setInterval(() => {
      if (this.analyser && this.frequencyData && this.callback) {
        this.analyser.getByteFrequencyData(this.frequencyData);
        const subband = new Uint8Array(64);
        const binCount = this.frequencyData.length;
        const ratio = binCount / 64;
        for (let i = 0; i < 64; i++) {
          const start = Math.floor(i * ratio);
          const end = Math.floor((i + 1) * ratio);
          let sum = 0;
          for (let j = start; j < end; j++) {
            sum += this.frequencyData[j];
          }
          subband[i] = Math.round(sum / (end - start || 1));
        }
        this.callback({
          frequencies: subband,
          timestamp: performance.now(),
        });
      }
    }, 50);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.frequencyData = null;
    this.callback = null;
  }

  pause(): void {
    this.audioElement?.pause();
  }

  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.audioElement?.play();
  }

  isPlaying(): boolean {
    return this.audioElement !== null && !this.audioElement.paused;
  }

  getProgress(): number {
    if (!this.audioElement || !this.audioElement.duration) return 0;
    return this.audioElement.currentTime / this.audioElement.duration;
  }

  getDuration(): number {
    return this.audioElement?.duration ?? 0;
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime ?? 0;
  }

  seekTo(fraction: number): void {
    if (this.audioElement && this.audioElement.duration) {
      this.audioElement.currentTime = fraction * this.audioElement.duration;
    }
  }
}
