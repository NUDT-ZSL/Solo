export interface AudioData {
  spectrum: Float32Array;
  waveform: Float32Array;
  bpm: number;
  pitch: number;
  volume: number;
  isBeat: boolean;
  beatTimestamp: number;
  spectrumEnergy: number;
}

type AudioEngineCallback = (data: AudioData) => void;

const FREQ_MIN = 65.41;
const FREQ_MAX = 1046.50;
const BPM_MIN = 60;
const BPM_MAX = 180;
const FFT_SIZE = 2048;

const BPM_ESTIMATION_WINDOW_SEC = 6;
const ENERGY_SAMPLE_RATE = 60;
const ENERGY_BUFFER_SIZE = BPM_ESTIMATION_WINDOW_SEC * ENERGY_SAMPLE_RATE;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private spectrumData: Float32Array = new Float32Array(0);
  private waveformData: Float32Array = new Float32Array(0);
  private callback: AudioEngineCallback | null = null;
  private isRecording = false;
  private isPlaying = false;
  private bpm = 0;
  private pitch = 0;
  private volume = 0;
  private isBeat = false;
  private beatTimestamp = 0;
  private spectrumEnergy = 0;
  private sensitivity = 50;
  private animFrameId = 0;
  private gainNode: GainNode | null = null;
  private pauseTime = 0;

  private energyRingBuffer: Float32Array = new Float32Array(ENERGY_BUFFER_SIZE);
  private energyWriteIdx = 0;
  private energySamplesCollected = 0;
  private lastEnergySampleTime = 0;
  private readonly ENERGY_SAMPLE_INTERVAL = 1000 / ENERGY_SAMPLE_RATE;

  private bpmHistory: number[] = [];
  private readonly BPM_HISTORY_MAX = 12;
  private lastBpmEstimateTime = 0;
  private readonly BPM_ESTIMATE_INTERVAL = 500;

  private energyHistory: number[] = [];
  private readonly ENERGY_HISTORY_SIZE = 43;
  private lastBeatTime = 0;
  private beatDifferential: number[] = [];
  private readonly BEAT_DIFF_MAX = 20;

  constructor() {
    this.spectrumData = new Float32Array(FFT_SIZE / 2);
    this.waveformData = new Float32Array(FFT_SIZE);
  }

  setCallback(cb: AudioEngineCallback): void {
    this.callback = cb;
  }

  setSensitivity(val: number): void {
    this.sensitivity = val;
  }

  getBPM(): number {
    return this.bpm;
  }

  getVolume(): number {
    return this.volume;
  }

  getWaveformData(): Float32Array {
    return this.waveformData;
  }

  getSpectrumData(): Float32Array {
    return this.spectrumData;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async initContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async startMicrophone(): Promise<void> {
    await this.initContext();
    this.stop();
    this.resetAnalysisState();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.analyser = this.audioContext!.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.75;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      this.gainNode = this.audioContext!.createGain();
      this.gainNode.gain.value = 1;

      const micSource = this.audioContext!.createMediaStreamSource(this.mediaStream);
      micSource.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      this.sourceNode = micSource;
      this.isRecording = true;
      this.spectrumData = new Float32Array(this.analyser.frequencyBinCount);
      this.waveformData = new Float32Array(this.analyser.fftSize);

      this.startAnalysisLoop();
    } catch (err) {
      console.error('Microphone access failed:', err);
      throw err;
    }
  }

  async loadFile(file: File): Promise<void> {
    await this.initContext();
    this.stop();
    this.resetAnalysisState();

    if (!file.type.includes('audio') && !file.name.toLowerCase().endsWith('.mp3')) {
      throw new Error('Please upload an audio file (MP3 format)');
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

    if (this.audioBuffer.duration > 30) {
      this.audioBuffer = null;
      throw new Error('Audio file must be 30 seconds or less');
    }
  }

  playFile(): void {
    if (!this.audioContext || !this.audioBuffer) return;

    if (this.sourceNode) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
      try {
        (this.sourceNode as AudioBufferSourceNode).disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.75;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;

    const bufferSource = this.audioContext.createBufferSource();
    bufferSource.buffer = this.audioBuffer;
    bufferSource.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    bufferSource.start(0, this.pauseTime);

    bufferSource.onended = () => {
      this.isPlaying = false;
      this.pauseTime = 0;
    };

    this.sourceNode = bufferSource;
    this.isPlaying = true;
    this.spectrumData = new Float32Array(this.analyser.frequencyBinCount);
    this.waveformData = new Float32Array(this.analyser.fftSize);

    this.startAnalysisLoop();
  }

  stop(): void {
    this.isRecording = false;
    this.isPlaying = false;

    if (this.sourceNode) {
      try {
        if (this.sourceNode instanceof AudioBufferSourceNode) {
          this.sourceNode.stop();
        }
      } catch {
        // ignore
      }
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // ignore
      }
      this.gainNode = null;
    }

    cancelAnimationFrame(this.animFrameId);
    this.resetAnalysisState();
  }

  private resetAnalysisState(): void {
    this.bpm = 0;
    this.pitch = 0;
    this.volume = 0;
    this.isBeat = false;
    this.spectrumEnergy = 0;
    this.energyHistory = [];
    this.beatDifferential = [];
    this.lastBeatTime = 0;
    this.bpmHistory = [];
    this.lastBpmEstimateTime = 0;
    this.lastEnergySampleTime = 0;
    this.energyWriteIdx = 0;
    this.energySamplesCollected = 0;
    this.energyRingBuffer.fill(0);
    this.pauseTime = 0;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private startAnalysisLoop(): void {
    const loop = () => {
      this.analyze();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private analyze(): void {
    if (!this.analyser) return;

    this.analyser.getFloatFrequencyData(this.spectrumData);
    this.analyser.getFloatTimeDomainData(this.waveformData);

    this.volume = this.computeVolume();
    this.spectrumEnergy = this.computeSpectrumEnergy();
    this.isBeat = this.detectBeat();
    this.pitch = this.detectPitch();

    if (this.isBeat) {
      this.beatTimestamp = performance.now();
    }

    this.sampleEnergyForBpm(performance.now());
    this.estimateBpmAutocorrelation(performance.now());

    if (this.callback) {
      this.callback({
        spectrum: this.spectrumData,
        waveform: this.waveformData,
        bpm: this.bpm,
        pitch: this.pitch,
        volume: this.volume,
        isBeat: this.isBeat,
        beatTimestamp: this.beatTimestamp,
        spectrumEnergy: this.spectrumEnergy,
      });
    }
  }

  private computeVolume(): number {
    let sum = 0;
    for (let i = 0; i < this.waveformData.length; i++) {
      sum += this.waveformData[i] * this.waveformData[i];
    }
    const rms = Math.sqrt(sum / this.waveformData.length);
    return Math.min(1, rms * 4);
  }

  private computeSpectrumEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this.spectrumData.length; i++) {
      const val = Math.pow(10, this.spectrumData[i] / 10);
      sum += val;
    }
    return sum / this.spectrumData.length;
  }

  private computeLowBandEnergy(): number {
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const lowFreqEnd = Math.floor((200 / sampleRate) * this.spectrumData.length);
    const highFreqStart = Math.floor((20 / sampleRate) * this.spectrumData.length);
    let lowEnergy = 0;
    let count = 0;
    for (let i = highFreqStart; i < lowFreqEnd; i++) {
      const val = Math.pow(10, this.spectrumData[i] / 10);
      lowEnergy += val;
      count++;
    }
    return lowEnergy / Math.max(1, count);
  }

  private sampleEnergyForBpm(now: number): void {
    if (now - this.lastEnergySampleTime < this.ENERGY_SAMPLE_INTERVAL) return;
    this.lastEnergySampleTime = now;

    const lowEnergy = this.computeLowBandEnergy();
    this.energyRingBuffer[this.energyWriteIdx] = lowEnergy;
    this.energyWriteIdx = (this.energyWriteIdx + 1) % ENERGY_BUFFER_SIZE;
    this.energySamplesCollected = Math.min(this.energySamplesCollected + 1, ENERGY_BUFFER_SIZE);
  }

  private estimateBpmAutocorrelation(now: number): void {
    if (now - this.lastBpmEstimateTime < this.BPM_ESTIMATE_INTERVAL) return;
    if (this.energySamplesCollected < ENERGY_SAMPLE_RATE * 2) return;

    this.lastBpmEstimateTime = now;

    const sampleCount = this.energySamplesCollected;
    const signal = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const idx = (this.energyWriteIdx - sampleCount + i + ENERGY_BUFFER_SIZE) % ENERGY_BUFFER_SIZE;
      signal[i] = this.energyRingBuffer[idx];
    }

    let mean = 0;
    for (let i = 0; i < sampleCount; i++) mean += signal[i];
    mean /= sampleCount;

    for (let i = 0; i < sampleCount; i++) signal[i] -= mean;

    const minLag = Math.floor((60 / BPM_MAX) * ENERGY_SAMPLE_RATE);
    const maxLag = Math.ceil((60 / BPM_MIN) * ENERGY_SAMPLE_RATE);

    let bestLag = -1;
    let bestCorr = -Infinity;
    const correlations = new Float32Array(maxLag + 1);

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < sampleCount - lag; i++) {
        sum += signal[i] * signal[i + lag];
      }
      sum /= (sampleCount - lag);
      correlations[lag] = sum;

      if (sum > bestCorr) {
        bestCorr = sum;
        bestLag = lag;
      }
    }

    if (bestLag <= 0 || bestCorr <= 0) return;

    let refinedLag = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
      const cLeft = correlations[bestLag - 1];
      const cCenter = bestCorr;
      const cRight = correlations[bestLag + 1];
      const denom = 2 * (2 * cCenter - cLeft - cRight);
      if (Math.abs(denom) > 1e-10) {
        refinedLag = bestLag + (cLeft - cRight) / denom;
      }
    }

    const bpmEstimate = (60 * ENERGY_SAMPLE_RATE) / refinedLag;

    if (bpmEstimate < BPM_MIN * 0.5 || bpmEstimate > BPM_MAX * 2) return;

    let finalBpm = bpmEstimate;
    if (bpmEstimate < BPM_MIN) finalBpm = bpmEstimate * 2;
    if (bpmEstimate > BPM_MAX) finalBpm = bpmEstimate / 2;

    if (finalBpm < BPM_MIN || finalBpm > BPM_MAX) return;

    this.bpmHistory.push(finalBpm);
    if (this.bpmHistory.length > this.BPM_HISTORY_MAX) this.bpmHistory.shift();

    if (this.bpmHistory.length >= 3) {
      const medianBpm = this.computeMedian(this.bpmHistory);
      if (this.bpm === 0) {
        this.bpm = Math.round(medianBpm);
      } else {
        const target = medianBpm;
        const delta = target - this.bpm;
        const alpha = Math.abs(delta) < 5 ? 0.25 : 0.6;
        this.bpm = Math.round(this.bpm + alpha * delta);
      }
    } else {
      this.bpm = Math.round(finalBpm);
    }
  }

  private detectBeat(): boolean {
    const lowEnergy = this.computeLowBandEnergy();

    this.energyHistory.push(lowEnergy);
    if (this.energyHistory.length > this.ENERGY_HISTORY_SIZE) {
      this.energyHistory.shift();
    }

    if (this.energyHistory.length < 10) return false;

    let sum = 0;
    for (const e of this.energyHistory) sum += e;
    const avgEnergy = sum / this.energyHistory.length;

    let varianceSum = 0;
    for (const e of this.energyHistory) {
      varianceSum += (e - avgEnergy) * (e - avgEnergy);
    }
    const variance = varianceSum / this.energyHistory.length;
    const stdDev = Math.sqrt(variance);

    const sensitivityFactor = 0.4 + (this.sensitivity / 100) * 1.0;
    const dynamicThreshold = avgEnergy + stdDev * sensitivityFactor;

    const now = performance.now();
    const minInterval = (60 / BPM_MAX) * 1000;

    if (
      lowEnergy > dynamicThreshold &&
      now - this.lastBeatTime > minInterval &&
      lowEnergy > avgEnergy * 1.1
    ) {
      if (this.lastBeatTime > 0) {
        const interval = now - this.lastBeatTime;
        if (interval < 2000 && interval > minInterval) {
          this.beatDifferential.push(interval);
          if (this.beatDifferential.length > this.BEAT_DIFF_MAX) {
            this.beatDifferential.shift();
          }
        }
      }
      this.lastBeatTime = now;
      return true;
    }

    return false;
  }

  private computeMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  private detectPitch(): number {
    const rms = this.volume;
    if (rms < 0.01) return 0;

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const bufLen = this.waveformData.length;

    const minPeriod = Math.floor(sampleRate / FREQ_MAX);
    const maxPeriod = Math.floor(sampleRate / FREQ_MIN);

    let bestCorr = -Infinity;
    let bestOffset = -1;

    for (let offset = minPeriod; offset <= maxPeriod; offset++) {
      let corr = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < bufLen - offset; i++) {
        const a = this.waveformData[i];
        const b = this.waveformData[i + offset];
        corr += a * b;
        normA += a * a;
        normB += b * b;
      }
      const norm = Math.sqrt(normA * normB);
      if (norm > 0) corr /= norm;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestOffset = offset;
      }
    }

    if (bestOffset === -1 || bestCorr < 0.2) return 0;

    let refined = bestOffset;
    if (bestOffset > minPeriod && bestOffset < maxPeriod) {
      const left = this.computeNormalizedCorrelation(bestOffset - 1);
      const center = bestCorr;
      const right = this.computeNormalizedCorrelation(bestOffset + 1);
      const denom = 2 * (2 * center - left - right);
      if (Math.abs(denom) > 1e-6) {
        refined = bestOffset + (left - right) / denom;
      }
    }

    const freq = sampleRate / refined;
    if (freq < FREQ_MIN || freq > FREQ_MAX) return 0;

    return freq;
  }

  private computeNormalizedCorrelation(offset: number): number {
    const bufLen = this.waveformData.length;
    let corr = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < bufLen - offset; i++) {
      const a = this.waveformData[i];
      const b = this.waveformData[i + offset];
      corr += a * b;
      normA += a * a;
      normB += b * b;
    }
    const norm = Math.sqrt(normA * normB);
    return norm > 0 ? corr / norm : 0;
  }
}
