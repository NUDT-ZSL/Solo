export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  beatIntensity: number;
  rmsVolume: number;
  lowBandEnergy: number;
  midBandEnergy: number;
  highBandEnergy: number;
  isBeat: boolean;
}

const FFT_SIZE = 256;
const FREQUENCY_BANDS = 128;
const BEAT_HISTORY_SIZE = 43;
const BEAT_COOLDOWN_FRAMES = 30;
const BEAT_MULTIPLIER = 1.3;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private rmsHistory: number[] = [];
  private beatCooldown = 0;
  private currentBeatThreshold = 0.5;

  constructor() {
    this.frequencyData = new Uint8Array(FREQUENCY_BANDS);
    this.timeDomainData = new Uint8Array(FFT_SIZE);
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.75;
    }
  }

  async connectMicrophone(): Promise<void> {
    this.ensureContext();
    this.disconnectCurrentSource();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (this.audioContext && this.analyser) {
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);
    }
  }

  async connectAudioElement(audioElement: HTMLAudioElement): Promise<void> {
    this.ensureContext();
    this.disconnectCurrentSource();

    if (this.audioContext && this.analyser) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
  }

  private disconnectCurrentSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore disconnect errors
      }
      this.sourceNode = null;
    }
  }

  stopMicrophone(): void {
    if (this.sourceNode && 'mediaStream' in this.sourceNode) {
      this.sourceNode.mediaStream.getTracks().forEach(track => track.stop());
    }
    this.disconnectCurrentSource();
  }

  setBeatThreshold(threshold: number): void {
    this.currentBeatThreshold = Math.max(0, Math.min(1, threshold));
  }

  getContextState(): AudioContextState {
    return this.audioContext ? this.audioContext.state : 'closed';
  }

  async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  analyze(): AudioAnalysisData {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
      this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    }

    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const normalized = (this.timeDomainData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rmsVolume = Math.sqrt(sumSquares / this.timeDomainData.length);

    let lowSum = 0;
    for (let i = 0; i < 20; i++) lowSum += this.frequencyData[i];
    const lowBandEnergy = lowSum / (20 * 255);

    let midSum = 0;
    for (let i = 20; i < 80; i++) midSum += this.frequencyData[i];
    const midBandEnergy = midSum / (60 * 255);

    let highSum = 0;
    for (let i = 80; i < FREQUENCY_BANDS; i++) highSum += this.frequencyData[i];
    const highBandEnergy = highSum / (48 * 255);

    this.rmsHistory.push(rmsVolume);
    if (this.rmsHistory.length > BEAT_HISTORY_SIZE) {
      this.rmsHistory.shift();
    }

    const historyAvg = this.rmsHistory.reduce((a, b) => a + b, 0) / Math.max(this.rmsHistory.length, 1);
    const beatIntensity = historyAvg > 0 ? rmsVolume / (historyAvg * BEAT_MULTIPLIER + 0.001) : 0;
    const clampedBeatIntensity = Math.min(1, beatIntensity);

    let isBeat = false;
    if (this.beatCooldown > 0) {
      this.beatCooldown--;
    } else if (clampedBeatIntensity > this.currentBeatThreshold &&
               rmsVolume > historyAvg * BEAT_MULTIPLIER) {
      isBeat = true;
      this.beatCooldown = BEAT_COOLDOWN_FRAMES;
    }

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      beatIntensity: clampedBeatIntensity,
      rmsVolume,
      lowBandEnergy,
      midBandEnergy,
      highBandEnergy,
      isBeat
    };
  }

  destroy(): void {
    this.stopMicrophone();
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* ignore */ }
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => { /* ignore */ });
      this.audioContext = null;
    }
  }
}

export function mapFrequencyToHue(binIndex: number, totalBins: number): number {
  const ratio = binIndex / totalBins;
  if (ratio < 20 / 128) {
    const t = ratio / (20 / 128);
    return 0 + t * 30;
  } else if (ratio < 80 / 128) {
    const t = (ratio - 20 / 128) / (60 / 128);
    return 120 + t * 100;
  } else {
    const t = (ratio - 80 / 128) / (48 / 128);
    return 270 + t * 60;
  }
}
