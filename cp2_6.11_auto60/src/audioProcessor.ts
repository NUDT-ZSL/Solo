export interface AudioParams {
  loudness: number;
  frequency: number;
  bpm: number;
}

type Listener = (ok: boolean, err?: string) => void;

export class AudioProcessor {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private timeBuf: Uint8Array | null = null;
  private freqBuf: Uint8Array | null = null;

  private readonly FFT = 2048;
  private readonly SAMPLE_RATE = 44100;

  private smoothedLoudness = 0;
  private smoothedFreq = 300;
  private smoothedBpm = 60;

  private onsetHistory: number[] = [];
  private prevSpectralFlux = 0;
  private spectralFluxHistory: number[] = [];
  private readonly ONSET_WINDOW_SEC = 4;

  private autocorrBpm = 60;

  constructor() {}

  async requestMicrophone(listener?: Listener): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = '当前浏览器不支持麦克风 API，请使用最新版 Chrome/Edge';
        listener?.(false, msg);
        return false;
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.FFT;
      this.analyser.smoothingTimeConstant = 0.5;

      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.timeBuf = new Uint8Array(this.analyser.fftSize);
      this.freqBuf = new Uint8Array(this.analyser.frequencyBinCount);

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      listener?.(true);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '麦克风授权失败，请检查权限设置';
      listener?.(false, msg);
      return false;
    }
  }

  close(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }

  getParams(): AudioParams {
    if (!this.analyser || !this.timeBuf || !this.freqBuf) {
      return { loudness: 0, frequency: 300, bpm: 60 };
    }

    this.analyser.getByteTimeDomainData(this.timeBuf as Uint8Array<ArrayBuffer>);
    this.analyser.getByteFrequencyData(this.freqBuf as Uint8Array<ArrayBuffer>);

    const rawLoud = this.calcLoudness(this.timeBuf);
    this.smoothedLoudness = this.lerp(this.smoothedLoudness, rawLoud, 0.35);

    const rawFreq = this.calcDominantFreq(this.freqBuf);
    this.smoothedFreq = this.lerp(this.smoothedFreq, rawFreq, 0.25);

    this.detectOnset(this.freqBuf);
    this.runAutocorrelation();

    this.smoothedBpm = this.lerp(this.smoothedBpm, this.autocorrBpm, 0.08);

    return {
      loudness: this.smoothedLoudness,
      frequency: this.smoothedFreq,
      bpm: this.smoothedBpm,
    };
  }

  private calcLoudness(buf: Uint8Array): number {
    let sum = 0;
    const n = buf.length;
    for (let i = 0; i < n; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / n);
    const db = 20 * Math.log10(Math.max(rms, 1e-6));
    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
    return Math.round(normalized * 100);
  }

  private calcDominantFreq(buf: Uint8Array): number {
    let peakIdx = 0;
    let peakVal = 0;
    const len = buf.length;
    const searchEnd = Math.min(len, Math.floor(len * 0.5));
    for (let i = 1; i < searchEnd; i++) {
      if (buf[i] > peakVal) {
        peakVal = buf[i];
        peakIdx = i;
      }
    }
    if (peakVal < 20) return 300;
    const binHz = this.SAMPLE_RATE / this.FFT;
    return Math.max(60, Math.min(8000, peakIdx * binHz));
  }

  private detectOnset(freqBuf: Uint8Array): void {
    const now = performance.now();
    let flux = 0;
    const len = freqBuf.length;
    for (let i = 0; i < len; i++) {
      const diff = freqBuf[i] - (this.prevSpectralFlux > 0 ? freqBuf[i] * 0.7 : 0);
      if (diff > 0) flux += diff;
    }
    this.prevSpectralFlux = flux;

    this.spectralFluxHistory.push(flux);
    const cutoff = now - this.ONSET_WINDOW_SEC * 1000;

    const windowSize = 10;
    let localSum = 0;
    let localCount = 0;
    const start = Math.max(0, this.spectralFluxHistory.length - windowSize);
    for (let i = start; i < this.spectralFluxHistory.length; i++) {
      localSum += this.spectralFluxHistory[i];
      localCount++;
    }
    const localMean = localCount > 0 ? localSum / localCount : 0;
    const threshold = localMean * 1.5 + 500;

    if (flux > threshold) {
      if (this.onsetHistory.length === 0 || now - this.onsetHistory[this.onsetHistory.length - 1] > 200) {
        this.onsetHistory.push(now);
      }
    }

    while (this.onsetHistory.length > 0 && this.onsetHistory[0] < cutoff) {
      this.onsetHistory.shift();
    }
    while (this.spectralFluxHistory.length > 300) {
      this.spectralFluxHistory.shift();
    }
  }

  private runAutocorrelation(): void {
    const onsets = this.onsetHistory;
    if (onsets.length < 4) {
      this.autocorrBpm = 60;
      return;
    }

    const minBpm = 40;
    const maxBpm = 220;
    const minLagMs = 60000 / maxBpm;
    const maxLagMs = 60000 / minBpm;

    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    if (intervals.length < 2) {
      this.autocorrBpm = 60;
      return;
    }

    let sum = 0;
    for (const iv of intervals) sum += iv;
    const mean = sum / intervals.length;
    const stdDev = Math.sqrt(
      intervals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / intervals.length
    );
    const normScale = stdDev > 1 ? stdDev : 1;

    let bestLag = minLagMs;
    let bestCorr = -Infinity;

    for (let lag = minLagMs; lag <= maxLagMs; lag += 5) {
      let corr = 0;
      let count = 0;
      for (const iv of intervals) {
        const ivNorm = (iv - lag) / normScale;
        const iv2Norm = (iv - lag * 2) / normScale;
        const ivHalfNorm = (iv - lag / 2) / normScale;
        const score = Math.max(
          Math.exp(-ivNorm * ivNorm / 2),
          Math.exp(-iv2Norm * iv2Norm / 2) * 0.7,
          Math.exp(-ivHalfNorm * ivHalfNorm / 2) * 0.5
        );
        corr += score;
        count++;
      }
      corr /= count;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    const onsetDensity = onsets.length / ((onsets[onsets.length - 1] - onsets[0] + 1) / 1000);
    const confThreshold = 0.35;
    if (bestCorr < confThreshold && onsetDensity < 1.2) {
      this.autocorrBpm = 60;
      return;
    }

    const rawBpm = 60000 / bestLag;
    if (rawBpm > maxBpm * 1.5) {
      this.autocorrBpm = rawBpm / 2;
    } else if (rawBpm < minBpm) {
      this.autocorrBpm = rawBpm * 2;
    } else {
      this.autocorrBpm = rawBpm;
    }
    this.autocorrBpm = Math.max(minBpm, Math.min(maxBpm, this.autocorrBpm));
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
