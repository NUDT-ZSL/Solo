export interface AudioParams {
  volume: number;
  pitch: number;
  cepstrum: number;
  frequencyData: Uint8Array;
  timeData: Float32Array;
}

export type AudioCallback = (params: AudioParams) => void;

const SAMPLE_RATE = 44100;
const FFT_SIZE = 1024;
const MIN_PITCH = 80;
const MAX_PITCH = 8000;
const FRAME_INTERVAL = 1000 / 30;

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeData: Float32Array = new Float32Array(0);
  private callback: AudioCallback | null = null;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private lastPitch = 0;
  private smoothedVolume = 0;
  private smoothedPitch = 0;
  private smoothedCepstrum = 0;

  onUpdate(callback: AudioCallback): void {
    this.callback = callback;
  }

  async startRecording(): Promise<void> {
    if (this.audioContext && this.analyser && this.stream) {
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: SAMPLE_RATE
        }
      });

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: SAMPLE_RATE
        });
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.5;

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Float32Array(FFT_SIZE);

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.lastFrameTime = 0;
      this.smoothedVolume = 0;
      this.smoothedPitch = 0;
      this.smoothedCepstrum = 0;
      this.lastPitch = 0;

      this.startAnalysisLoop();
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      throw err;
    }
  }

  stopRecording(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      void this.audioContext.suspend();
    }
  }

  isRecording(): boolean {
    return this.stream !== null && this.rafId !== null;
  }

  private startAnalysisLoop(): void {
    const loop = (time: number): void => {
      this.rafId = requestAnimationFrame(loop);

      if (time - this.lastFrameTime < FRAME_INTERVAL) {
        return;
      }
      this.lastFrameTime = time;

      if (!this.analyser || !this.callback) {
        return;
      }

      this.analyser.getByteFrequencyData(this.frequencyData as unknown as Uint8Array<ArrayBuffer>);
      this.analyser.getFloatTimeDomainData(this.timeData as unknown as Float32Array<ArrayBuffer>);

      const volume = this.calculateVolume();
      const pitch = this.calculatePitch();
      const cepstrum = this.calculateCepstrum();

      this.smoothedVolume = this.smoothedVolume * 0.7 + volume * 0.3;
      this.smoothedPitch = this.smoothedPitch * 0.6 + pitch * 0.4;
      this.smoothedCepstrum = this.smoothedCepstrum * 0.5 + cepstrum * 0.5;

      this.callback({
        volume: Math.min(1, this.smoothedVolume),
        pitch: this.smoothedPitch,
        cepstrum: this.smoothedCepstrum,
        frequencyData: this.frequencyData.slice(),
        timeData: this.timeData.slice()
      });
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private calculateVolume(): number {
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sumSquares += this.timeData[i] * this.timeData[i];
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    return Math.min(1, rms * 5);
  }

  private calculatePitch(): number {
    if (!this.analyser) return 0;

    let maxIndex = -1;
    let maxValue = -1;

    const minBin = Math.floor(MIN_PITCH / (SAMPLE_RATE / FFT_SIZE));
    const maxBin = Math.floor(MAX_PITCH / (SAMPLE_RATE / FFT_SIZE));

    for (let i = minBin; i < Math.min(maxBin, this.frequencyData.length); i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }

    if (maxIndex < 0 || maxValue < 30) {
      return this.lastPitch;
    }

    let interpolatedIndex = maxIndex;
    if (maxIndex > 0 && maxIndex < this.frequencyData.length - 1) {
      const y0 = this.frequencyData[maxIndex - 1];
      const y1 = this.frequencyData[maxIndex];
      const y2 = this.frequencyData[maxIndex + 1];
      const denominator = y0 - 2 * y1 + y2;
      if (denominator !== 0) {
        interpolatedIndex = maxIndex + (y2 - y0) / (2 * denominator);
      }
    }

    const pitch = interpolatedIndex * (SAMPLE_RATE / FFT_SIZE);
    const clampedPitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch));
    this.lastPitch = clampedPitch;
    return clampedPitch;
  }

  private calculateCepstrum(): number {
    const n = this.timeData.length;
    const autocorr: number[] = new Array(Math.min(256, n)).fill(0);

    for (let lag = 0; lag < autocorr.length; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += this.timeData[i] * this.timeData[i + lag];
      }
      autocorr[lag] = sum / (n - lag);
    }

    let maxDiff = 0;
    let periodDiff = 0;
    for (let i = 1; i < autocorr.length - 1; i++) {
      const diff = Math.abs(autocorr[i] - autocorr[i - 1]);
      if (diff > maxDiff) {
        maxDiff = diff;
        periodDiff = i;
      }
    }

    if (periodDiff === 0 || maxDiff < 0.0001) return 0;

    const cepstrumValue = SAMPLE_RATE / periodDiff;
    return Math.min(1, cepstrumValue / MAX_PITCH);
  }

  destroy(): void {
    this.stopRecording();
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this.callback = null;
  }
}
