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
}

export type FeatureStream = AsyncGenerator<AudioFeature, void, unknown>;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private isRunning = false;
  
  private energyHistory: number[] = [];
  private lowFreqHistory: number[] = [];
  private onsetHistory: number[] = [];
  private beatIntervals: number[] = [];
  private lastOnsetTime = 0;
  private lastBeatEstimate = 120;
  private smoothedBpm = 120;
  private featureHistory: AudioFeature[] = [];
  private maxHistorySize = 100;
  
  private static readonly LOW_FREQ_RATIO = 0.15;
  private static readonly MID_FREQ_RATIO = 0.5;
  private static readonly ONSET_THRESHOLD_MULTIPLIER = 1.3;
  private static readonly MIN_BEAT_INTERVAL = 250;
  private static readonly MAX_BEAT_INTERVAL = 2000;
  private static readonly SMOOTHING_ALPHA = 0.15;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadFromBuffer(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
    
    this.source = this.audioContext.createBufferSource();
    (this.source as AudioBufferSourceNode).buffer = audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  async loadFromElement(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
    
    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  start(): void {
    if (!this.audioContext || this.audioContext.state === 'closed') return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isRunning = true;
    this.resetHistory();
  }

  stop(): void {
    this.isRunning = false;
  }

  private resetHistory(): void {
    this.energyHistory = [];
    this.lowFreqHistory = [];
    this.onsetHistory = [];
    this.beatIntervals = [];
    this.lastOnsetTime = 0;
    this.lastBeatEstimate = 120;
    this.smoothedBpm = 120;
    this.featureHistory = [];
  }

  getCurrentFeature(): AudioFeature {
    if (!this.analyser || !this.dataArray || !this.timeDomainData) {
      return this.getDefaultFeature();
    }

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    
    const timestamp = performance.now();
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
    
    const maxFreq = Math.max(lowFreq, midFreq, highFreq);
    let dominant: 'low' | 'mid' | 'high' = 'mid';
    if (maxFreq === lowFreq) dominant = 'low';
    else if (maxFreq === highFreq) dominant = 'high';
    
    const isOnset = this.detectOnset(energy, lowFreq, timestamp);
    const beatIntensity = this.calculateBeatIntensity(isOnset, energy, lowFreq);
    const bpm = this.calculateBpm(timestamp, isOnset, energy, lowFreq);
    
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
    };
    
    this.featureHistory.push(feature);
    if (this.featureHistory.length > this.maxHistorySize) {
      this.featureHistory.shift();
    }
    
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }
    
    this.lowFreqHistory.push(lowFreq);
    if (this.lowFreqHistory.length > 43) {
      this.lowFreqHistory.shift();
    }
    
    return feature;
  }

  private detectOnset(energy: number, lowFreq: number, timestamp: number): boolean {
    if (this.energyHistory.length < 10) return false;
    
    const recentEnergies = this.energyHistory.slice(-20);
    const avgEnergy = recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length;
    const variance = recentEnergies.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / recentEnergies.length;
    const stdDev = Math.sqrt(variance);
    
    const recentLowFreqs = this.lowFreqHistory.slice(-20);
    const avgLowFreq = recentLowFreqs.reduce((a, b) => a + b, 0) / recentLowFreqs.length;
    const lowFreqVariance = recentLowFreqs.reduce((sum, f) => sum + Math.pow(f - avgLowFreq, 2), 0) / recentLowFreqs.length;
    const lowFreqStdDev = Math.sqrt(lowFreqVariance);
    
    const energyThreshold = avgEnergy + stdDev * 0.8;
    const lowFreqThreshold = avgLowFreq + lowFreqStdDev * 1.0;
    
    const energySpike = energy > energyThreshold * AudioAnalyzer.ONSET_THRESHOLD_MULTIPLIER;
    const lowFreqSpike = lowFreq > lowFreqThreshold * AudioAnalyzer.ONSET_THRESHOLD_MULTIPLIER;
    
    const timeSinceLastOnset = timestamp - this.lastOnsetTime;
    const validTiming = timeSinceLastOnset > AudioAnalyzer.MIN_BEAT_INTERVAL;
    
    if ((energySpike || lowFreqSpike) && validTiming && (energy > 0.2 || lowFreq > 0.15)) {
      this.lastOnsetTime = timestamp;
      this.onsetHistory.push(timestamp);
      if (this.onsetHistory.length > 50) {
        this.onsetHistory.shift();
      }
      return true;
    }
    
    return false;
  }

  private calculateBeatIntensity(isOnset: boolean, energy: number, lowFreq: number): number {
    if (!isOnset) {
      return Math.max(0, (energy * 0.5 + lowFreq * 0.3) * 0.3);
    }
    
    const recentOnsets = this.onsetHistory.slice(-5);
    if (recentOnsets.length < 2) return 0.8;
    
    const intervals = [];
    for (let i = 1; i < recentOnsets.length; i++) {
      intervals.push(recentOnsets[i] - recentOnsets[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, iv) => sum + Math.pow(iv - avgInterval, 2), 0) / intervals.length;
    const regularity = 1 - Math.min(1, Math.sqrt(intervalVariance) / (avgInterval * 0.5));
    
    return Math.min(1, regularity * 0.4 + energy * 0.35 + lowFreq * 0.25);
  }

  private calculateBpm(timestamp: number, isOnset: boolean, energy: number, lowFreq: number): number {
    if (isOnset && this.onsetHistory.length >= 2) {
      const recentOnsets = this.onsetHistory.slice(-20);
      const intervals: number[] = [];
      
      for (let i = 1; i < recentOnsets.length; i++) {
        const interval = recentOnsets[i] - recentOnsets[i - 1];
        if (interval >= AudioAnalyzer.MIN_BEAT_INTERVAL && interval <= AudioAnalyzer.MAX_BEAT_INTERVAL) {
          intervals.push(interval);
        }
      }
      
      if (intervals.length >= 2) {
        for (const interval of intervals.slice(-3)) {
          this.beatIntervals.push(interval);
        }
        if (this.beatIntervals.length > 30) {
          this.beatIntervals.splice(0, this.beatIntervals.length - 30);
        }
      }
    }
    
    if (this.beatIntervals.length < 2) {
      const energyBased = 60 + Math.min(120, Math.max(0, energy) * 120) + (lowFreq > 0.5 ? 20 : 0);
      return Math.round(this.smoothedBpm * (1 - AudioAnalyzer.SMOOTHING_ALPHA) + energyBased * AudioAnalyzer.SMOOTHING_ALPHA);
    }
    
    const sortedIntervals = [...this.beatIntervals].sort((a, b) => a - b);
    const q1 = sortedIntervals[Math.floor(sortedIntervals.length * 0.25)];
    const q3 = sortedIntervals[Math.floor(sortedIntervals.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - iqr * 1.5;
    const upperBound = q3 + iqr * 1.5;
    
    const filteredIntervals = this.beatIntervals.filter(
      iv => iv >= lowerBound && iv <= upperBound
    );
    
    if (filteredIntervals.length === 0) {
      return this.smoothedBpm;
    }
    
    const intervalCounts: Map<number, number> = new Map();
    const bucketSize = 20;
    
    for (const interval of filteredIntervals) {
      const bucket = Math.round(interval / bucketSize) * bucketSize;
      intervalCounts.set(bucket, (intervalCounts.get(bucket) || 0) + 1);
    }
    
    let bestInterval = filteredIntervals[0];
    let maxCount = 0;
    
    for (const [interval, count] of intervalCounts) {
      if (count > maxCount) {
        maxCount = count;
        bestInterval = interval;
      }
    }
    
    const weightedIntervals = filteredIntervals.map((iv, idx) => {
      const weight = 0.5 + 0.5 * (idx / filteredIntervals.length);
      const bucketDiff = Math.abs(iv - bestInterval);
      const similarityWeight = bucketDiff < 80 ? 1 : Math.max(0, 1 - (bucketDiff - 80) / 200);
      return iv * weight * similarityWeight;
    });
    
    const totalWeight = filteredIntervals.reduce((sum, _, idx) => {
      const weight = 0.5 + 0.5 * (idx / filteredIntervals.length);
      const bucketDiff = Math.abs(filteredIntervals[idx] - bestInterval);
      const similarityWeight = bucketDiff < 80 ? 1 : Math.max(0, 1 - (bucketDiff - 80) / 200);
      return sum + weight * similarityWeight;
    }, 0);
    
    if (totalWeight === 0) {
      return this.smoothedBpm;
    }
    
    const avgInterval = weightedIntervals.reduce((a, b) => a + b, 0) / totalWeight;
    let rawBpm = 60000 / avgInterval;
    
    while (rawBpm < 60) rawBpm *= 2;
    while (rawBpm > 200) rawBpm /= 2;
    
    const avgRecentEnergy = this.energyHistory.length > 0
      ? this.energyHistory.slice(-10).reduce((a, b) => a + b, 0) / this.energyHistory.slice(-10).length
      : 0.3;
    const avgRecentLowFreq = this.lowFreqHistory.length > 0
      ? this.lowFreqHistory.slice(-10).reduce((a, b) => a + b, 0) / this.lowFreqHistory.slice(-10).length
      : 0.2;
    const confidenceBoost = 1 + (avgRecentEnergy * 0.3 + avgRecentLowFreq * 0.2);
    rawBpm = Math.min(200, rawBpm * confidenceBoost);
    
    this.smoothedBpm = this.smoothedBpm * (1 - AudioAnalyzer.SMOOTHING_ALPHA) + rawBpm * AudioAnalyzer.SMOOTHING_ALPHA;
    this.lastBeatEstimate = this.smoothedBpm;
    
    return Math.round(this.smoothedBpm * 10) / 10;
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
    this.resetHistory();
  }
}

export async function analyzeAudio(audioBuffer: AudioBuffer): Promise<AudioFeature[]> {
  const sampleRate = 10;
  const duration = audioBuffer.duration;
  const totalSamples = Math.floor(duration * sampleRate);
  const features: AudioFeature[] = [];
  
  const numberOfChannels = audioBuffer.numberOfChannels;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numberOfChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }
  
  const samplesPerWindow = Math.floor(audioBuffer.sampleRate / sampleRate);
  const fftSize = 512;
  const windowSize = Math.min(fftSize, samplesPerWindow);
  
  const hannWindow = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
  }
  
  let energyHistory: number[] = [];
  let lowFreqHistory: number[] = [];
  let onsetHistory: number[] = [];
  let beatIntervals: number[] = [];
  let lastOnsetTime = 0;
  let smoothedBpm = 120;
  
  const lowFreqEnd = Math.floor((fftSize / 2) * 0.15);
  const midFreqEnd = Math.floor((fftSize / 2) * 0.5);
  
  for (let sampleIdx = 0; sampleIdx < totalSamples; sampleIdx++) {
    const timeSec = sampleIdx / sampleRate;
    const startSample = sampleIdx * samplesPerWindow;
    const endSample = Math.min(startSample + windowSize, audioBuffer.length);
    const actualWindowSize = endSample - startSample;
    
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    
    for (let i = 0; i < actualWindowSize; i++) {
      let sample = 0;
      for (let c = 0; c < numberOfChannels; c++) {
        sample += channelData[c][startSample + i] || 0;
      }
      sample /= numberOfChannels;
      real[i] = sample * hannWindow[i];
    }
    
    const magnitudes = computeFFTMagnitudes(real, imag, fftSize);
    const halfFft = fftSize / 2;
    
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < halfFft; i++) {
      const value = magnitudes[i];
      totalSum += value;
      if (i < lowFreqEnd) {
        lowSum += value;
      } else if (i < midFreqEnd) {
        midSum += value;
      } else {
        highSum += value;
      }
    }
    
    const lowFreq = Math.min(1, lowSum / (lowFreqEnd * 1.0));
    const midFreq = Math.min(1, midSum / ((midFreqEnd - lowFreqEnd) * 1.0));
    const highFreq = Math.min(1, highSum / ((halfFft - midFreqEnd) * 1.0));
    const energy = Math.min(1, totalSum / (halfFft * 1.0));
    
    let rms = 0;
    for (let i = 0; i < actualWindowSize; i++) {
      let sample = 0;
      for (let c = 0; c < numberOfChannels; c++) {
        sample += channelData[c][startSample + i] || 0;
      }
      sample /= numberOfChannels;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / actualWindowSize);
    
    const maxFreq = Math.max(lowFreq, midFreq, highFreq);
    let dominant: 'low' | 'mid' | 'high' = 'mid';
    if (maxFreq === lowFreq) dominant = 'low';
    else if (maxFreq === highFreq) dominant = 'high';
    
    const timestamp = timeSec * 1000;
    
    let isOnset = false;
    if (energyHistory.length >= 10) {
      const recentEnergies = energyHistory.slice(-20);
      const avgEnergy = recentEnergies.reduce((a, b) => a + b, 0) / recentEnergies.length;
      const variance = recentEnergies.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / recentEnergies.length;
      const stdDev = Math.sqrt(variance);
      
      const recentLowFreqs = lowFreqHistory.slice(-20);
      const avgLowFreq = recentLowFreqs.reduce((a, b) => a + b, 0) / recentLowFreqs.length;
      const lowFreqVariance = recentLowFreqs.reduce((sum, f) => sum + Math.pow(f - avgLowFreq, 2), 0) / recentLowFreqs.length;
      const lowFreqStdDev = Math.sqrt(lowFreqVariance);
      
      const energyThreshold = avgEnergy + stdDev * 0.8;
      const lowFreqThreshold = avgLowFreq + lowFreqStdDev * 1.0;
      const energySpike = energy > energyThreshold * 1.3;
      const lowFreqSpike = lowFreq > lowFreqThreshold * 1.3;
      const timeSinceLastOnset = timestamp - lastOnsetTime;
      const validTiming = timeSinceLastOnset > 250;
      
      if ((energySpike || lowFreqSpike) && validTiming && (energy > 0.2 || lowFreq > 0.15)) {
        isOnset = true;
        lastOnsetTime = timestamp;
        onsetHistory.push(timestamp);
        if (onsetHistory.length > 50) onsetHistory.shift();
      }
    }
    
    let beatIntensity = 0;
    if (!isOnset) {
      beatIntensity = Math.max(0, (energy * 0.5 + lowFreq * 0.3) * 0.3);
    } else {
      const recentOnsets = onsetHistory.slice(-5);
      if (recentOnsets.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < recentOnsets.length; i++) {
          intervals.push(recentOnsets[i] - recentOnsets[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = intervals.reduce((sum, iv) => sum + Math.pow(iv - avgInterval, 2), 0) / intervals.length;
        const regularity = 1 - Math.min(1, Math.sqrt(intervalVariance) / (avgInterval * 0.5));
        beatIntensity = Math.min(1, regularity * 0.4 + energy * 0.35 + lowFreq * 0.25);
      } else {
        beatIntensity = 0.8;
      }
    }
    
    if (isOnset && onsetHistory.length >= 2) {
      const recentOnsets = onsetHistory.slice(-20);
      const intervals: number[] = [];
      for (let i = 1; i < recentOnsets.length; i++) {
        const interval = recentOnsets[i] - recentOnsets[i - 1];
        if (interval >= 250 && interval <= 2000) {
          intervals.push(interval);
        }
      }
      if (intervals.length >= 2) {
        for (const interval of intervals.slice(-3)) {
          beatIntervals.push(interval);
        }
        if (beatIntervals.length > 30) {
          beatIntervals.splice(0, beatIntervals.length - 30);
        }
      }
    }
    
    let bpm: number;
    if (beatIntervals.length < 2) {
      const energyBased = 60 + Math.min(120, Math.max(0, energy) * 120) + (lowFreq > 0.5 ? 20 : 0);
      bpm = Math.round(smoothedBpm * 0.85 + energyBased * 0.15);
    } else {
      const sortedIntervals = [...beatIntervals].sort((a, b) => a - b);
      const q1 = sortedIntervals[Math.floor(sortedIntervals.length * 0.25)];
      const q3 = sortedIntervals[Math.floor(sortedIntervals.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - iqr * 1.5;
      const upperBound = q3 + iqr * 1.5;
      
      const filteredIntervals = beatIntervals.filter(iv => iv >= lowerBound && iv <= upperBound);
      
      if (filteredIntervals.length === 0) {
        bpm = Math.round(smoothedBpm);
      } else {
        const intervalCounts: Map<number, number> = new Map();
        for (const interval of filteredIntervals) {
          const bucket = Math.round(interval / 20) * 20;
          intervalCounts.set(bucket, (intervalCounts.get(bucket) || 0) + 1);
        }
        
        let bestInterval = filteredIntervals[0];
        let maxCount = 0;
        for (const [interval, count] of intervalCounts) {
          if (count > maxCount) {
            maxCount = count;
            bestInterval = interval;
          }
        }
        
        const weightedIntervals = filteredIntervals.map((iv, idx) => {
          const weight = 0.5 + 0.5 * (idx / filteredIntervals.length);
          const bucketDiff = Math.abs(iv - bestInterval);
          const similarityWeight = bucketDiff < 80 ? 1 : Math.max(0, 1 - (bucketDiff - 80) / 200);
          return iv * weight * similarityWeight;
        });
        
        const totalWeight = filteredIntervals.reduce((sum, _, idx) => {
          const weight = 0.5 + 0.5 * (idx / filteredIntervals.length);
          const bucketDiff = Math.abs(filteredIntervals[idx] - bestInterval);
          const similarityWeight = bucketDiff < 80 ? 1 : Math.max(0, 1 - (bucketDiff - 80) / 200);
          return sum + weight * similarityWeight;
        }, 0);
        
        if (totalWeight > 0) {
          const avgInterval = weightedIntervals.reduce((a, b) => a + b, 0) / totalWeight;
          let rawBpm = 60000 / avgInterval;
          while (rawBpm < 60) rawBpm *= 2;
          while (rawBpm > 200) rawBpm /= 2;
          
          const avgRecentEnergy = energyHistory.slice(-10).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(10, energyHistory.length));
          const avgRecentLowFreq = lowFreqHistory.slice(-10).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(10, lowFreqHistory.length));
          const confidenceBoost = 1 + (avgRecentEnergy * 0.3 + avgRecentLowFreq * 0.2);
          rawBpm = Math.min(200, rawBpm * confidenceBoost);
          
          smoothedBpm = smoothedBpm * 0.85 + rawBpm * 0.15;
        }
        bpm = Math.round(smoothedBpm * 10) / 10;
      }
    }
    
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
    });
    
    energyHistory.push(energy);
    if (energyHistory.length > 43) energyHistory.shift();
    lowFreqHistory.push(lowFreq);
    if (lowFreqHistory.length > 43) lowFreqHistory.shift();
  }
  
  return features;
}

function computeFFTMagnitudes(real: Float32Array, imag: Float32Array, n: number): Float32Array {
  const reversed = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    reversed[i] = i;
  }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [reversed[i], reversed[j]] = [reversed[j], reversed[i]];
    }
  }
  
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = real[reversed[i]] || 0;
    im[i] = imag[reversed[i]] || 0;
  }
  
  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >> 1;
    const ang = -2 * Math.PI / size;
    const wReBase = Math.cos(ang);
    const wImBase = Math.sin(ang);
    
    for (let i = 0; i < n; i += size) {
      let wRe = 1;
      let wIm = 0;
      
      for (let k = 0; k < halfSize; k++) {
        const evenRe = re[i + k];
        const evenIm = im[i + k];
        const oddIdx = i + k + halfSize;
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
  
  const magnitudes = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  
  return magnitudes;
}
