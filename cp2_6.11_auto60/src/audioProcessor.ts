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

  private readonly FFT = 1024;
  private readonly SAMPLE_RATE = 44100;

  private beatHistory: number[] = [];
  private lastBeatTime = 0;
  private peakThreshold = 140;
  private smoothedLoudness = 0;
  private smoothedFreq = 300;
  private smoothedBpm = 60;

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
      this.analyser.smoothingTimeConstant = 0.6;

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

    this.updateBeat(rawLoud);
    const rawBpm = this.estimateBpm();
    this.smoothedBpm = this.lerp(this.smoothedBpm, rawBpm, 0.15);

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
    for (let i = 1; i < len; i++) {
      if (buf[i] > peakVal) {
        peakVal = buf[i];
        peakIdx = i;
      }
    }
    if (peakVal < 20) return 300;
    const binHz = this.SAMPLE_RATE / this.FFT;
    return Math.max(60, Math.min(8000, peakIdx * binHz));
  }

  private updateBeat(loudness: number): void {
    const now = performance.now();
    this.beatHistory.push(now);
    const cutoff = now - 2000;
    while (this.beatHistory.length > 0 && this.beatHistory[0] < cutoff) {
      this.beatHistory.shift();
    }

    if (loudness > this.peakThreshold && now - this.lastBeatTime > 250) {
      this.lastBeatTime = now;
      this.peakThreshold = this.lerp(this.peakThreshold, loudness * 0.7, 0.1);
    } else {
      this.peakThreshold = this.lerp(this.peakThreshold, 140, 0.02);
    }
  }

  private estimateBpm(): number {
    const wins = this.beatHistory.length;
    if (wins < 2) return 60;
    const first = this.beatHistory[0];
    const last = this.beatHistory[wins - 1];
    const spanSec = Math.max(0.5, (last - first) / 1000);
    const bpm = (wins - 1) * 60 / spanSec;
    return Math.max(40, Math.min(240, bpm));
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
