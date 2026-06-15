import { AudioData } from './store';

export default class AudioEngine {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private micStream: MediaStream | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array;
  private amplitudeData: Uint8Array;
  private energyHistory: number[] = [];
  private beatTimestamps: number[] = [];
  private readonly HISTORY_LENGTH = 30;
  private readonly BEAT_THRESHOLD = 1.4;
  private readonly LOW_FREQ_BINS = 10;

  constructor() {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.amplitudeData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  async resumeContext(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async startMicrophone(): Promise<void> {
    await this.resumeContext();
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream);
    this.micSourceNode.connect(this.analyser);
  }

  async loadFile(file: File): Promise<void> {
    await this.resumeContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    this.sourceNode.start(0);
  }

  stop(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.analyser.disconnect();
    this.energyHistory = [];
    this.beatTimestamps = [];
  }

  getAudioData(): AudioData {
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.amplitudeData);

    const frequencies = new Uint8Array(256);
    const amplitudes = new Uint8Array(256);
    frequencies.set(this.frequencyData.subarray(0, 256));
    amplitudes.set(this.amplitudeData.subarray(0, 256));

    let lowFreqEnergy = 0;
    for (let i = 0; i < this.LOW_FREQ_BINS; i++) {
      lowFreqEnergy += this.frequencyData[i];
    }
    lowFreqEnergy /= this.LOW_FREQ_BINS;

    this.energyHistory.push(lowFreqEnergy);
    if (this.energyHistory.length > this.HISTORY_LENGTH) {
      this.energyHistory.shift();
    }

    const avgEnergy =
      this.energyHistory.reduce((sum, e) => sum + e, 0) /
      this.energyHistory.length;

    const detected = lowFreqEnergy > avgEnergy * this.BEAT_THRESHOLD;
    const rawIntensity = avgEnergy > 0 ? (lowFreqEnergy - avgEnergy) / avgEnergy : 0;
    const intensity = Math.max(0, Math.min(1, rawIntensity));

    const now = performance.now();
    if (detected) {
      this.beatTimestamps.push(now);
      if (this.beatTimestamps.length > 30) {
        this.beatTimestamps.shift();
      }
    }

    let bpm = 0;
    if (this.beatTimestamps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.beatTimestamps.length; i++) {
        intervals.push(this.beatTimestamps[i] - this.beatTimestamps[i - 1]);
      }
      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      if (avgInterval > 0) {
        bpm = Math.round(60000 / avgInterval);
      }
    }

    let rmsSum = 0;
    for (let i = 0; i < amplitudes.length; i++) {
      const normalized = (amplitudes[i] - 128) / 128;
      rmsSum += normalized * normalized;
    }
    const volume = Math.sqrt(rmsSum / amplitudes.length);

    return {
      frequencies,
      amplitudes,
      beat: { detected, intensity, bpm },
      volume,
    };
  }
}
