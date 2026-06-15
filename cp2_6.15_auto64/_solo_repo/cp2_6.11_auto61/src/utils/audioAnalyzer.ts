import { BPMDetector, type BPMResult } from './bpmDetector';

export interface AudioFeature {
  timestamp: number;
  bpm: number;
  energy: number;
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  dominant: 'low' | 'mid' | 'high';
  beatIntensity: number;
  isOnset: boolean;
  bpmConfidence: number;
}

export type FeatureStream = AsyncGenerator<AudioFeature, void, unknown>;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private isRunning = false;
  
  private bpmDetector: BPMDetector;
  private audioBufferForBPM: Float32Array;
  private audioBufferIndex: number;
  private lastBPMUpdate: number = 0;
  private currentBPMResult: BPMResult;
  private readonly BPM_UPDATE_INTERVAL: number = 1000;
  
  private energyHistory: number[] = [];
  private lowFreqHistory: number[] = [];
  private onsetHistory: number[] = [];
  private beatIntervals: number[] = [];
  private lastOnsetTime = 0;
  private smoothedBpm = 120;
  private featureHistory: AudioFeature[] = [];
  private maxHistorySize = 100;
  
  private static readonly LOW_FREQ_RATIO = 0.15;
  private static readonly MID_FREQ_RATIO = 0.5;
  private static readonly ONSET_THRESHOLD_MULTIPLIER = 1.3;
  private static readonly MIN_BEAT_INTERVAL = 250;
  private static readonly SMOOTHING_ALPHA = 0.12;
  private static readonly BPM_BUFFER_SIZE = 44100 * 6;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.bpmDetector = new BPMDetector(44100);
    this.audioBufferForBPM = new Float32Array(AudioAnalyzer.BPM_BUFFER_SIZE);
    this.audioBufferIndex = 0;
    this.currentBPMResult = {
      bpm: 120,
      confidence: 0,
      isReliable: false,
      dominantFrequency: 0,
      energy: 0,
      onsetPositions: [],
    };
  }

  async loadFromBuffer(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.7;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
    
    this.source = this.audioContext.createBufferSource();
    (this.source as AudioBufferSourceNode).buffer = audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    this.resetState();
    this.computeFullBPM(audioBuffer);
  }

  async loadFromElement(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.7;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
    
    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    this.resetState();
  }

  private async computeFullBPM(audioBuffer: AudioBuffer): Promise<void> {
    try {
      const result = this.bpmDetector.detectBPMFromAudioBuffer(audioBuffer);
      this.currentBPMResult = result;
      this.smoothedBpm = result.bpm;
    } catch (err) {
      console.warn('Full BPM computation failed:', err);
    }
  }

  start(): void {
    if (!this.audioContext || this.audioContext.state === 'closed') return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isRunning = true;
    this.resetState();
  }

  stop(): void {
    this.isRunning = false;
  }

  private resetState(): void {
    this.energyHistory = [];
    this.lowFreqHistory = [];
    this.onsetHistory = [];
    this.beatIntervals = [];
    this.lastOnsetTime = 0;
    this.featureHistory = [];
    this.audioBufferIndex = 0;
    this.lastBPMUpdate = 0;
    this.bpmDetector.reset();
  }

  getCurrentFeature(): AudioFeature {
    if (!this.analyser || !this.dataArray || !this.timeDomainData) {
      return this.getDefaultFeature();
    }

    const timestamp = performance.now();
    
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    
    const bufferLength = this.dataArray.length;
    const lowEnd = Math.floor(bufferLength * AudioAnalyzer.LOW_FREQ_RATIO);
    const midEnd = Math.floor(bufferLength * AudioAnalyzer.MID_FREQ_RATIO);
    
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = this.dataArray[i];
      totalSum += value;
      if (i < lowEnd) {
        lowSum += value;
      } else if (i < midEnd) {
        midSum += value;
      } else {
        highSum += value;
      }
    }
    
    const lowFreq = lowSum / (lowEnd * 255);
    const midFreq = midSum / ((midEnd - lowEnd) * 255);
    const highFreq = highSum / ((bufferLength - midEnd) * 255);
    const energy = totalSum / (bufferLength * 255);
    
    let rms = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (this.timeDomainData[i] - 128) / 128;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / bufferLength);
    
    for (let i = 0; i < bufferLength; i++) {
      if (this.audioBufferIndex >= AudioAnalyzer.BPM_BUFFER_SIZE) {
        this.audioBufferIndex = 0;
      }
      const sample = (this.timeDomainData[i] - 128) / 128;
      this.audioBufferForBPM[this.audioBufferIndex++] = sample;
    }
    
    if (timestamp - this.lastBPMUpdate > this.BPM_UPDATE_INTERVAL && 
        this.audioBufferIndex > 44100) {
      this.updateBPM();
      this.lastBPMUpdate = timestamp;
    }
    
    const maxFreq = Math.max(lowFreq, midFreq, highFreq);
    let dominant: 'low' | 'mid' | 'high' = 'mid';
    if (maxFreq === lowFreq) dominant = 'low';
    else if (maxFreq === highFreq) dominant = 'high';
    
    const isOnset = this.detectOnset(energy, lowFreq, timestamp);
    const beatIntensity = this.calculateBeatIntensity(isOnset, energy, lowFreq);
    const bpm = this.updateRealtimeBPM(timestamp, isOnset, energy, lowFreq);
    
    const feature: AudioFeature = {
      timestamp,
      bpm,
      energy,
      lowFreq,
      midFreq,
      highFreq,
      dominant,
      beatIntensity,
      isOnset,
      bpmConfidence: this.currentBPMResult.confidence,
    };
    
    this.featureHistory.push(feature);
    if (this.featureHistory.length > this.maxHistorySize) {
      this.featureHistory.shift();
    }
    
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 60) {
      this.energyHistory.shift();
    }
    
    this.lowFreqHistory.push(lowFreq);
    if (this.lowFreqHistory.length > 60) {
      this.lowFreqHistory.shift();
    }
    
    return feature;
  }

  private updateBPM(): void {
    try {
      const sampleCount = Math.min(this.audioBufferIndex, AudioAnalyzer.BPM_BUFFER_SIZE);
      const audioSlice = new Float32Array(sampleCount);
      
      for (let i = 0; i < sampleCount; i++) {
        const idx = (this.audioBufferIndex - sampleCount + i) % AudioAnalyzer.BPM_BUFFER_SIZE;
        audioSlice[i] = this.audioBufferForBPM[idx];
      }
      
      const result = this.bpmDetector.detectBPM(audioSlice, this.audioContext?.sampleRate || 44100);
      
      if (result.confidence > 0.4 && result.isReliable) {
        const targetBPM = result.bpm;
        const alpha = Math.min(0.3, result.confidence * 0.5);
        this.smoothedBpm = this.smoothedBpm * (1 - alpha) + targetBPM * alpha;
        this.currentBPMResult = result;
      } else if (result.confidence > 0.2) {
        const alpha = 0.1;
        this.smoothedBpm = this.smoothedBpm * (1 - alpha) + result.bpm * alpha;
        this.currentBPMResult = {
          ...result,
          bpm: this.smoothedBpm,
        };
      }
    } catch (err) {
      console.warn('BPM update failed:', err);
    }
  }

  private detectOnset(energy: number, lowFreq: number, timestamp: number): boolean {
    if (this.energyHistory.length < 15) return false;
    
    const recentEnergies = this.energyHistory.slice(-25);
    const avgEnergy = recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length;
    const variance = recentEnergies.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / recentEnergies.length;
    const stdDev = Math.sqrt(variance);
    
    const recentLowFreqs = this.lowFreqHistory.slice(-25);
    const avgLowFreq = recentLowFreqs.reduce((a, b) => a + b, 0) / recentLowFreqs.length;
    const lowFreqVariance = recentLowFreqs.reduce((sum, f) => sum + Math.pow(f - avgLowFreq, 2), 0) / recentLowFreqs.length;
    const lowFreqStdDev = Math.sqrt(lowFreqVariance);
    
    const energyThreshold = avgEnergy + stdDev * 0.7;
    const lowFreqThreshold = avgLowFreq + lowFreqStdDev * 0.9;
    
    const energySpike = energy > energyThreshold * AudioAnalyzer.ONSET_THRESHOLD_MULTIPLIER;
    const lowFreqSpike = lowFreq > lowFreqThreshold * AudioAnalyzer.ONSET_THRESHOLD_MULTIPLIER;
    
    const timeSinceLastOnset = timestamp - this.lastOnsetTime;
    const minInterval = Math.max(AudioAnalyzer.MIN_BEAT_INTERVAL, (60 / 200) * 1000);
    const validTiming = timeSinceLastOnset > minInterval;
    
    if ((energySpike || lowFreqSpike) && validTiming && (energy > 0.15 || lowFreq > 0.12)) {
      this.lastOnsetTime = timestamp;
      this.onsetHistory.push(timestamp);
      if (this.onsetHistory.length > 80) {
        this.onsetHistory.shift();
      }
      return true;
    }
    
    return false;
  }

  private calculateBeatIntensity(isOnset: boolean, energy: number, lowFreq: number): number {
    if (!isOnset) {
      return Math.max(0, (energy * 0.4 + lowFreq * 0.3) * 0.25);
    }
    
    const recentOnsets = this.onsetHistory.slice(-6);
    if (recentOnsets.length < 2) return 0.75;
    
    const intervals: number[] = [];
    for (let i = 1; i < recentOnsets.length; i++) {
      intervals.push(recentOnsets[i] - recentOnsets[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, iv) => sum + Math.pow(iv - avgInterval, 2), 0) / intervals.length;
    const regularity = 1 - Math.min(1, Math.sqrt(intervalVariance) / (avgInterval * 0.4));
    
    const bpmBoost = this.currentBPMResult.confidence * 0.3;
    
    return Math.min(1, regularity * 0.4 + energy * 0.35 + lowFreq * 0.25 + bpmBoost);
  }

  private updateRealtimeBPM(
    timestamp: number,
    isOnset: boolean,
    energy: number,
    lowFreq: number
  ): number {
    if (isOnset && this.onsetHistory.length >= 4) {
      const recentOnsets = this.onsetHistory.slice(-25);
      const intervals: number[] = [];
      
      for (let i = 1; i < recentOnsets.length; i++) {
        const interval = recentOnsets[i] - recentOnsets[i - 1];
        const minInterval = (60 / 200) * 1000;
        const maxInterval = (60 / 60) * 1000;
        if (interval >= minInterval && interval <= maxInterval) {
          intervals.push(interval);
        }
      }
      
      if (intervals.length >= 3) {
        for (const interval of intervals.slice(-4)) {
          this.beatIntervals.push(interval);
        }
        if (this.beatIntervals.length > 40) {
          this.beatIntervals.splice(0, this.beatIntervals.length - 40);
        }
        
        if (this.beatIntervals.length >= 6) {
          const realtimeBPM = this.computeBPMFromIntervals();
          if (realtimeBPM >= 60 && realtimeBPM <= 200) {
            const alpha = AudioAnalyzer.SMOOTHING_ALPHA;
            this.smoothedBpm = this.smoothedBpm * (1 - alpha) + realtimeBPM * alpha;
          }
        }
      }
    }
    
    if (this.currentBPMResult.confidence > 0.6) {
      const targetBPM = this.currentBPMResult.bpm;
      const blendAlpha = 0.03;
      this.smoothedBpm = this.smoothedBpm * (1 - blendAlpha) + targetBPM * blendAlpha;
    }
    
    const energyBased = 70 + Math.min(110, Math.max(0, energy) * 110) + (lowFreq > 0.4 ? 15 : 0);
    const finalAlpha = this.currentBPMResult.confidence > 0.5 ? 0.05 : 0.15;
    const finalBPM = this.smoothedBpm * (1 - finalAlpha) + energyBased * finalAlpha;
    
    return Math.max(60, Math.min(200, Math.round(finalBPM * 10) / 10));
  }

  private computeBPMFromIntervals(): number {
    if (this.beatIntervals.length < 4) return this.smoothedBpm;
    
    const sorted = [...this.beatIntervals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - iqr * 1.5;
    const upperBound = q3 + iqr * 1.5;
    
    const filtered = this.beatIntervals.filter(iv => iv >= lowerBound && iv <= upperBound);
    if (filtered.length === 0) return this.smoothedBpm;
    
    const counts = new Map<number, number>();
    const bucketSize = 15;
    
    for (const iv of filtered) {
      const bucket = Math.round(iv / bucketSize) * bucketSize;
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
    }
    
    let bestInterval = filtered[0];
    let maxCount = 0;
    for (const [bucket, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        bestInterval = bucket;
      }
    }
    
    const weightedSum = filtered.reduce((sum, iv, idx) => {
      const recency = 0.4 + 0.6 * (idx / filtered.length);
      const bucketDiff = Math.abs(iv - bestInterval);
      const similarity = bucketDiff < 60 ? 1 : Math.max(0, 1 - (bucketDiff - 60) / 200);
      return sum + iv * recency * similarity;
    }, 0);
    
    const totalWeight = filtered.reduce((sum, _, idx) => {
      const recency = 0.4 + 0.6 * (idx / filtered.length);
      const iv = filtered[idx];
      const bucketDiff = Math.abs(iv - bestInterval);
      const similarity = bucketDiff < 60 ? 1 : Math.max(0, 1 - (bucketDiff - 60) / 200);
      return sum + recency * similarity;
    }, 0);
    
    if (totalWeight <= 0) return this.smoothedBpm;
    
    const avgInterval = weightedSum / totalWeight;
    let bpm = 60000 / avgInterval;
    
    while (bpm < 60) bpm *= 2;
    while (bpm > 200) bpm /= 2;
    
    return bpm;
  }

  private getDefaultFeature(): AudioFeature {
    return {
      timestamp: performance.now(),
      bpm: this.smoothedBpm,
      energy: 0,
      lowFreq: 0,
      midFreq: 0,
      highFreq: 0,
      dominant: 'mid',
      beatIntensity: 0,
      isOnset: false,
      bpmConfidence: this.currentBPMResult.confidence,
    };
  }

  async* analyzeStream(): FeatureStream {
    this.start();
    
    while (this.isRunning) {
      yield this.getCurrentFeature();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getSource(): AudioBufferSourceNode | MediaElementAudioSourceNode | null {
    return this.source;
  }

  getFeatureHistory(): AudioFeature[] {
    return [...this.featureHistory];
  }

  getBPMResult(): BPMResult {
    return this.currentBPMResult;
  }

  close(): void {
    this.stop();
    if (this.source) {
      try {
        if ('stop' in this.source) {
          (this.source as AudioBufferSourceNode).stop();
        }
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.dataArray = null;
    this.timeDomainData = null;
    this.resetState();
  }
}

export async function analyzeAudio(audioBuffer: AudioBuffer): Promise<AudioFeature[]> {
  const sampleRate = 10;
  const duration = audioBuffer.duration;
  const totalSamples = Math.floor(duration * sampleRate);
  const features: AudioFeature[] = [];
  
  const detector = new BPMDetector(audioBuffer.sampleRate);
  const bpmResult = detector.detectBPMFromAudioBuffer(audioBuffer);
  
  const numberOfChannels = audioBuffer.numberOfChannels;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numberOfChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }
  
  const samplesPerWindow = Math.floor(audioBuffer.sampleRate / sampleRate);
  const fftSize = 1024;
  const windowSize = Math.min(fftSize, samplesPerWindow);
  
  const hannWindow = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
  }
  
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const halfFft = fftSize / 2;
  
  const lowFreqEnd = Math.floor(halfFft * 0.15);
  const midFreqEnd = Math.floor(halfFft * 0.5);
  
  let energyHistory: number[] = [];
  let lowFreqHistory: number[] = [];
  let onsetHistory: number[] = [];
  let lastOnsetTime = 0;
  let smoothedBpm = bpmResult.bpm;
  let beatIntervals: number[] = [];
  
  const computeFFT = (): Float32Array => {
    const n = fftSize;
    const reversed = new Uint32Array(n);
    for (let i = 0; i < n; i++) reversed[i] = i;
    
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) [reversed[i], reversed[j]] = [reversed[j], reversed[i]];
    }
    
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      re[i] = real[reversed[i]] || 0;
      im[i] = imag[reversed[i]] || 0;
    }
    
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const ang = -2 * Math.PI / size;
      const wReBase = Math.cos(ang);
      const wImBase = Math.sin(ang);
      
      for (let i = 0; i < n; i += size) {
        let wRe = 1, wIm = 0;
        for (let k = 0; k < half; k++) {
          const evenRe = re[i + k];
          const evenIm = im[i + k];
          const oddIdx = i + k + half;
          const tRe = wRe * re[oddIdx] - wIm * im[oddIdx];
          const tIm = wRe * im[oddIdx] + wIm * re[oddIdx];
          
          re[i + k] = evenRe + tRe;
          im[i + k] = evenIm + tIm;
          re[oddIdx] = evenRe - tRe;
          im[oddIdx] = evenIm - tIm;
          
          const newWRe = wRe * wReBase - wIm * wImBase;
          const newWIm = wRe * wImBase + wIm * wReBase;
          wRe = newWRe;
          wIm = newWIm;
        }
      }
    }
    
    const mags = new Float32Array(halfFft);
    for (let i = 0; i < halfFft; i++) {
      mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    }
    return mags;
  };
  
  for (let sampleIdx = 0; sampleIdx < totalSamples; sampleIdx++) {
    const timeSec = sampleIdx / sampleRate;
    const startSample = sampleIdx * samplesPerWindow;
    const endSample = Math.min(startSample + windowSize, audioBuffer.length);
    const actualWindow = endSample - startSample;
    
    real.fill(0);
    imag.fill(0);
    
    for (let i = 0; i < actualWindow; i++) {
      let sample = 0;
      for (let c = 0; c < numberOfChannels; c++) {
        sample += channelData[c][startSample + i] || 0;
      }
      sample /= numberOfChannels;
      real[i] = sample * hannWindow[i];
    }
    
    const magnitudes = computeFFT();
    
    let lowSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    for (let i = 0; i < halfFft; i++) {
      const val = magnitudes[i];
      totalSum += val;
      if (i < lowFreqEnd) lowSum += val;
      else if (i < midFreqEnd) midSum += val;
      else highSum += val;
    }
    
    const lowFreq = Math.min(1, lowSum / (lowFreqEnd * 0.5));
    const midFreq = Math.min(1, midSum / ((midFreqEnd - lowFreqEnd) * 0.5));
    const highFreq = Math.min(1, highSum / ((halfFft - midFreqEnd) * 0.5));
    const energy = Math.min(1, totalSum / (halfFft * 0.5));
    
    let rms = 0;
    for (let i = 0; i < actualWindow; i++) {
      let sample = 0;
      for (let c = 0; c < numberOfChannels; c++) {
        sample += channelData[c][startSample + i] || 0;
      }
      sample /= numberOfChannels;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / actualWindow);
    
    const maxFreq = Math.max(lowFreq, midFreq, highFreq);
    let dominant: 'low' | 'mid' | 'high' = 'mid';
    if (maxFreq === lowFreq) dominant = 'low';
    else if (maxFreq === highFreq) dominant = 'high';
    
    const timestamp = timeSec * 1000;
    
    let isOnset = false;
    if (energyHistory.length >= 15) {
      const recent = energyHistory.slice(-25);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((s, e) => s + Math.pow(e - avg, 2), 0) / recent.length;
      const std = Math.sqrt(variance);
      
      const recentLow = lowFreqHistory.slice(-25);
      const avgLow = recentLow.reduce((a, b) => a + b, 0) / recentLow.length;
      const varianceLow = recentLow.reduce((s, f) => s + Math.pow(f - avgLow, 2), 0) / recentLow.length;
      const stdLow = Math.sqrt(varianceLow);
      
      const energyThresh = avg + std * 0.7;
      const lowThresh = avgLow + stdLow * 0.9;
      const energySpike = energy > energyThresh * 1.3;
      const lowSpike = lowFreq > lowThresh * 1.3;
      const timeSince = timestamp - lastOnsetTime;
      const validTime = timeSince > 250;
      
      if ((energySpike || lowSpike) && validTime && (energy > 0.15 || lowFreq > 0.12)) {
        isOnset = true;
        lastOnsetTime = timestamp;
        onsetHistory.push(timestamp);
        if (onsetHistory.length > 80) onsetHistory.shift();
      }
    }
    
    let beatIntensity = 0;
    if (!isOnset) {
      beatIntensity = Math.max(0, (energy * 0.4 + lowFreq * 0.3) * 0.25);
    } else {
      const recent = onsetHistory.slice(-6);
      if (recent.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < recent.length; i++) {
          intervals.push(recent[i] - recent[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((s, iv) => s + Math.pow(iv - avgInterval, 2), 0) / intervals.length;
        const regularity = 1 - Math.min(1, Math.sqrt(variance) / (avgInterval * 0.4));
        beatIntensity = Math.min(1, regularity * 0.4 + energy * 0.35 + lowFreq * 0.25);
      } else {
        beatIntensity = 0.75;
      }
    }
    
    if (isOnset && onsetHistory.length >= 4) {
      const recentOnsets = onsetHistory.slice(-25);
      const intervals: number[] = [];
      for (let i = 1; i < recentOnsets.length; i++) {
        const iv = recentOnsets[i] - recentOnsets[i - 1];
        if (iv >= 300 && iv <= 1000) intervals.push(iv);
      }
      if (intervals.length >= 3) {
        for (const iv of intervals.slice(-4)) beatIntervals.push(iv);
        if (beatIntervals.length > 40) {
          beatIntervals.splice(0, beatIntervals.length - 40);
        }
      }
    }
    
    let bpm: number;
    if (beatIntervals.length >= 6) {
      const sorted = [...beatIntervals].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const filtered = beatIntervals.filter(iv => iv >= q1 - iqr * 1.5 && iv <= q3 + iqr * 1.5);
      
      if (filtered.length >= 4) {
        const avgIv = filtered.reduce((a, b) => a + b, 0) / filtered.length;
        let computedBpm = 60000 / avgIv;
        while (computedBpm < 60) computedBpm *= 2;
        while (computedBpm > 200) computedBpm /= 2;
        smoothedBpm = smoothedBpm * 0.88 + computedBpm * 0.12;
      }
    }
    
    if (bpmResult.confidence > 0.5) {
      smoothedBpm = smoothedBpm * 0.97 + bpmResult.bpm * 0.03;
    }
    
    bpm = Math.max(60, Math.min(200, Math.round(smoothedBpm * 10) / 10));
    
    features.push({
      timestamp,
      bpm,
      energy,
      lowFreq,
      midFreq,
      highFreq,
      dominant,
      beatIntensity,
      isOnset,
      bpmConfidence: bpmResult.confidence,
    });
    
    energyHistory.push(energy);
    if (energyHistory.length > 60) energyHistory.shift();
    lowFreqHistory.push(lowFreq);
    if (lowFreqHistory.length > 60) lowFreqHistory.shift();
  }
  
  return features;
}
