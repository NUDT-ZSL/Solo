import eventBus from './event-bus';
import { AudioEnergy } from './types';

export class MusicReactor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private frequencyData: Uint8Array | null = null;
  private isRunning: boolean = false;
  private animationId: number = 0;
  private lastEmitTime: number = 0;
  private smoothedLow: number = 0;
  private smoothedHigh: number = 0;
  private readonly EMIT_INTERVAL: number = 16;
  private readonly BURST_THRESHOLD: number = 0.65;
  private readonly SMOOTHING: number = 0.85;
  private readonly FFT_SIZE: number = 1024;
  private readonly SAMPLE_RATE: number = 48000;
  private burstCooldown: number = 0;
  private readonly BURST_COOLDOWN_MS: number = 500;

  constructor() {}

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({
        sampleRate: this.SAMPLE_RATE
      });

      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.6;

      this.microphone.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);

      this.isRunning = true;
      this.smoothedLow = 0;
      this.smoothedHigh = 0;
      this.burstCooldown = 0;
      this.animate();
    } catch (error) {
      console.error('[MusicReactor] Failed to start:', error);
      throw error;
    }
  }

  stop(): void {
    this.isRunning = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.frequencyData = null;
  }

  destroy(): void {
    this.stop();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    if (now - this.lastEmitTime < this.EMIT_INTERVAL) return;
    this.lastEmitTime = now;

    this.analyze(now);
  };

  private analyze(timestamp: number): void {
    if (!this.analyser || !this.frequencyData) return;

    const freqData = this.frequencyData as unknown as Uint8Array<ArrayBuffer>;
    this.analyser.getByteFrequencyData(freqData);

    const binCount = this.frequencyData.length;
    const binBandwidth = this.SAMPLE_RATE / this.FFT_SIZE / 2;

    const lowStartBin = Math.floor(20 / binBandwidth);
    const lowEndBin = Math.floor(250 / binBandwidth);
    const highStartBin = Math.floor(2000 / binBandwidth);
    const highEndBin = Math.floor(8000 / binBandwidth);

    let lowSum = 0;
    let lowCount = 0;
    for (let i = lowStartBin; i <= lowEndBin && i < binCount; i++) {
      lowSum += this.frequencyData[i];
      lowCount++;
    }

    let highSum = 0;
    let highCount = 0;
    let peakHigh = 0;
    for (let i = highStartBin; i <= highEndBin && i < binCount; i++) {
      const v = this.frequencyData[i];
      highSum += v;
      highCount++;
      if (v > peakHigh) peakHigh = v;
    }

    const rawLow = lowCount > 0 ? lowSum / lowCount / 255 : 0;
    const rawHigh = highCount > 0 ? highSum / highCount / 255 : 0;
    const peakHighNorm = peakHigh / 255;

    this.smoothedLow = this.smoothedLow * this.SMOOTHING + rawLow * (1 - this.SMOOTHING);
    this.smoothedHigh = this.smoothedHigh * this.SMOOTHING + rawHigh * (1 - this.SMOOTHING);

    let isBurst = false;
    if (this.burstCooldown <= 0 && peakHighNorm > this.BURST_THRESHOLD) {
      isBurst = true;
      this.burstCooldown = this.BURST_COOLDOWN_MS;
    } else if (this.burstCooldown > 0) {
      this.burstCooldown -= performance.now() - timestamp;
    }

    const data: AudioEnergy = {
      lowFreq: Math.max(0, Math.min(1, this.smoothedLow * 3)),
      highFreq: Math.max(0, Math.min(1, this.smoothedHigh * 3)),
      isBurst,
      timestamp
    };

    eventBus.emit('audioEnergy', data);
  }
}
