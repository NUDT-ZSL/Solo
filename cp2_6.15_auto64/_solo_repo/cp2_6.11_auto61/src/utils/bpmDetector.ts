export interface BPMResult {
  bpm: number;
  confidence: number;
  isReliable: boolean;
  dominantFrequency: number;
  energy: number;
  onsetPositions: number[];
}

export class BPMDetector {
  private sampleRate: number;
  private windowSize: number;
  private hopSize: number;
  private historyBuffer: Float32Array;
  private energyHistory: number[];
  private readonly maxHistorySize: number = 2048;
  private readonly minBPM: number = 60;
  private readonly maxBPM: number = 200;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    this.windowSize = 1024;
    this.hopSize = 512;
    this.historyBuffer = new Float32Array(this.maxHistorySize);
    this.energyHistory = [];
  }

  detectBPMFromAudioBuffer(audioBuffer: AudioBuffer): BPMResult {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    const monoData = new Float32Array(Math.floor(audioBuffer.length / 2));
    for (let i = 0; i < monoData.length; i++) {
      let sum = 0;
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        sum += audioBuffer.getChannelData(c)[i * 2] || 0;
      }
      monoData[i] = sum / audioBuffer.numberOfChannels;
    }
    
    return this.detectBPM(monoData, sampleRate);
  }

  detectBPM(audioData: Float32Array, sampleRate: number): BPMResult {
    const hopSizeMs = 5;
    const frameRate = 1000 / hopSizeMs;
    const energyEnvelope = this.computeEnergyEnvelope(audioData, sampleRate);
    const onsets = this.detectOnsets(energyEnvelope, frameRate);
    
    if (onsets.length < 4) {
      return {
        bpm: 120,
        confidence: 0,
        isReliable: false,
        dominantFrequency: 0,
        energy: this.computeRMS(audioData),
        onsetPositions: onsets,
      };
    }
    
    const intervalBPM = this.estimateBPMFromIntervals(onsets, frameRate);
    const acfBPM = this.estimateBPMFromACF(energyEnvelope, frameRate);
    const combinedBPM = this.combineEstimates(intervalBPM, acfBPM);
    
    return {
      bpm: combinedBPM.bpm,
      confidence: combinedBPM.confidence,
      isReliable: combinedBPM.confidence > 0.5,
      dominantFrequency: this.findDominantFrequency(audioData, sampleRate),
      energy: this.computeRMS(audioData),
      onsetPositions: onsets,
    };
  }

  private computeEnergyEnvelope(audioData: Float32Array, sampleRate: number): Float32Array {
    const frameSize = Math.floor(sampleRate * 0.01);
    const hopSize = Math.floor(sampleRate * 0.005);
    const numFrames = Math.floor((audioData.length - frameSize) / hopSize) + 1;
    const envelope = new Float32Array(numFrames);
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      let energy = 0;
      for (let j = 0; j < frameSize; j++) {
        const sample = audioData[start + j] || 0;
        energy += sample * sample;
      }
      envelope[i] = Math.sqrt(energy / frameSize);
    }
    
    return this.smoothEnvelope(envelope, 3);
  }

  private smoothEnvelope(envelope: Float32Array, kernelSize: number): Float32Array {
    const result = new Float32Array(envelope.length);
    const half = Math.floor(kernelSize / 2);
    
    for (let i = 0; i < envelope.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = -half; j <= half; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < envelope.length) {
          sum += envelope[idx];
          count++;
        }
      }
      result[i] = sum / count;
    }
    
    return result;
  }

  private detectOnsets(envelope: Float32Array, frameRate: number): number[] {
    const onsets: number[] = [];
    const threshold = this.computeAdaptiveThreshold(envelope);
    const minSpacing = Math.floor((60 / this.maxBPM) * frameRate);
    const maxSpacing = Math.floor((60 / this.minBPM) * frameRate);
    
    let lastOnset = -minSpacing - 1;
    
    for (let i = 1; i < envelope.length - 1; i++) {
      const isPeak = envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1];
      const isAboveThreshold = envelope[i] > threshold * 1.3;
      const isValidSpacing = i - lastOnset > minSpacing;
      
      if (isPeak && isAboveThreshold && isValidSpacing) {
        onsets.push(i);
        lastOnset = i;
        
        if (onsets.length > 1) {
          const recentInterval = onsets[onsets.length - 1] - onsets[onsets.length - 2];
          if (recentInterval < minSpacing * 1.5) {
            const lastIdx = onsets.length - 1;
            if (envelope[onsets[lastIdx - 1]] > envelope[onsets[lastIdx]]) {
              onsets.pop();
              lastOnset = onsets[onsets.length - 1];
            }
          }
        }
      }
    }
    
    return onsets;
  }

  private computeAdaptiveThreshold(envelope: Float32Array): number {
    const sorted = [...envelope].sort((a, b) => a - b);
    const percentile75 = sorted[Math.floor(sorted.length * 0.75)];
    const percentile90 = sorted[Math.floor(sorted.length * 0.90)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    
    return (percentile75 + percentile90 + median * 0.5) / 2.5;
  }

  private estimateBPMFromIntervals(onsets: number[], frameRate: number): { bpm: number; confidence: number } {
    if (onsets.length < 4) {
      return { bpm: 120, confidence: 0 };
    }
    
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    const bpmIntervals = intervals.map(iv => 60 / (iv / frameRate));
    
    const filteredBPMs: number[] = [];
    for (const bpm of bpmIntervals) {
      let adjusted = bpm;
      while (adjusted < this.minBPM) adjusted *= 2;
      while (adjusted > this.maxBPM) adjusted /= 2;
      if (adjusted >= this.minBPM && adjusted <= this.maxBPM) {
        filteredBPMs.push(adjusted);
      }
    }
    
    if (filteredBPMs.length === 0) {
      return { bpm: 120, confidence: 0 };
    }
    
    const histogram = new Map<number, number>();
    const bucketSize = 2;
    
    for (const bpm of filteredBPMs) {
      const bucket = Math.round(bpm / bucketSize) * bucketSize;
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    }
    
    let maxCount = 0;
    let bestBucket = 120;
    
    for (const [bucket, count] of histogram) {
      if (count > maxCount) {
        maxCount = count;
        bestBucket = bucket;
      }
    }
    
    const closeBPMs = filteredBPMs.filter(bpm => 
      Math.abs(bpm - bestBucket) <= 4
    );
    
    const avgBPM = closeBPMs.reduce((a, b) => a + b, 0) / closeBPMs.length;
    const confidence = Math.min(1, closeBPMs.length / intervals.length);
    
    return { bpm: avgBPM, confidence };
  }

  private estimateBPMFromACF(envelope: Float32Array, frameRate: number): { bpm: number; confidence: number } {
    const minLag = Math.floor((60 / this.maxBPM) * frameRate);
    const maxLag = Math.floor((60 / this.minBPM) * frameRate);
    
    const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length;
    const centered = new Float32Array(envelope.length);
    for (let i = 0; i < envelope.length; i++) {
      centered[i] = envelope[i] - mean;
    }
    
    const acf = new Float32Array(maxLag + 1);
    
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < centered.length - lag; i++) {
        sum += centered[i] * centered[i + lag];
      }
      acf[lag] = sum / (centered.length - lag);
    }
    
    let maxVal = 0;
    let bestLag = Math.floor((minLag + maxLag) / 2);
    
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      const isPeak = acf[lag] > acf[lag - 1] && acf[lag] > acf[lag + 1];
      if (isPeak && acf[lag] > maxVal) {
        maxVal = acf[lag];
        bestLag = lag;
      }
    }
    
    if (maxVal <= 0) {
      return { bpm: 120, confidence: 0 };
    }
    
    let peakSum = bestLag * acf[bestLag];
    let weightSum = acf[bestLag];
    const searchRange = 3;
    
    for (let d = -searchRange; d <= searchRange; d++) {
      if (d !== 0 && bestLag + d >= minLag && bestLag + d <= maxLag) {
        const val = Math.max(0, acf[bestLag + d]);
        peakSum += (bestLag + d) * val;
        weightSum += val;
      }
    }
    
    const interpolatedLag = peakSum / weightSum;
    const bpm = 60 / (interpolatedLag / frameRate);
    
    let adjustedBPM = bpm;
    while (adjustedBPM < this.minBPM) adjustedBPM *= 2;
    while (adjustedBPM > this.maxBPM) adjustedBPM /= 2;
    
    const normalize = acf[bestLag] / acf[0];
    const confidence = Math.min(1, normalize * 1.5);
    
    return { bpm: adjustedBPM, confidence };
  }

  private combineEstimates(
    intervalEst: { bpm: number; confidence: number },
    acfEst: { bpm: number; confidence: number }
  ): { bpm: number; confidence: number } {
    const totalWeight = intervalEst.confidence + acfEst.confidence + 0.1;
    
    const intervalWeight = intervalEst.confidence / totalWeight;
    const acfWeight = acfEst.confidence / totalWeight;
    const defaultWeight = 0.1 / totalWeight;
    
    let bpm: number;
    let confidence: number;
    
    const intervalBPM = intervalEst.bpm || 120;
    const acfBPM = acfEst.bpm || 120;
    
    if (Math.abs(intervalBPM - acfBPM) < 5) {
      bpm = (intervalBPM * intervalEst.confidence + acfBPM * acfEst.confidence) / 
            (intervalEst.confidence + acfEst.confidence || 1);
      confidence = Math.max(intervalEst.confidence, acfEst.confidence) * 1.2;
    } else if (intervalEst.confidence > acfEst.confidence * 1.5) {
      bpm = intervalBPM;
      confidence = intervalEst.confidence * 0.8;
    } else if (acfEst.confidence > intervalEst.confidence * 1.5) {
      bpm = acfBPM;
      confidence = acfEst.confidence * 0.8;
    } else {
      bpm = (intervalBPM * intervalWeight + acfBPM * acfWeight + 120 * defaultWeight);
      confidence = Math.max(0.3, (intervalEst.confidence + acfEst.confidence) / 3);
    }
    
    return {
      bpm: Math.max(this.minBPM, Math.min(this.maxBPM, bpm)),
      confidence: Math.min(1, confidence),
    };
  }

  private findDominantFrequency(audioData: Float32Array, sampleRate: number): number {
    const fftSize = 2048;
    if (audioData.length < fftSize) {
      return 0;
    }
    
    const segment = audioData.slice(0, fftSize);
    const windowed = this.applyHannWindow(segment);
    
    const magnitudes = this.computeFFT(windowed);
    const halfSize = magnitudes.length / 2;
    
    let maxMag = 0;
    let maxIdx = 0;
    
    for (let i = 1; i < halfSize; i++) {
      if (magnitudes[i] > maxMag) {
        maxMag = magnitudes[i];
        maxIdx = i;
      }
    }
    
    if (maxIdx > 0 && maxIdx < halfSize - 1) {
      const y0 = magnitudes[maxIdx - 1];
      const y1 = magnitudes[maxIdx];
      const y2 = magnitudes[maxIdx + 1];
      
      const correction = (y2 - y0) / (2 * (2 * y1 - y0 - y2));
      maxIdx += correction;
    }
    
    return (maxIdx * sampleRate) / fftSize;
  }

  private applyHannWindow(data: Float32Array): Float32Array {
    const result = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (data.length - 1)));
      result[i] = data[i] * window;
    }
    return result;
  }

  private computeFFT(data: Float32Array): Float32Array {
    const n = data.length;
    if (n === 1) {
      const result = new Float32Array(2);
      result[0] = data[0];
      result[1] = 0;
      return result;
    }
    
    const even = new Float32Array(n / 2);
    const odd = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      even[i] = data[i * 2];
      odd[i] = data[i * 2 + 1];
    }
    
    const evenFFT = this.computeFFT(even);
    const oddFFT = this.computeFFT(odd);
    
    const result = new Float32Array(n);
    for (let k = 0; k < n / 2; k++) {
      const angle = -2 * Math.PI * k / n;
      const tRe = Math.cos(angle) * oddFFT[2 * k] - Math.sin(angle) * oddFFT[2 * k + 1];
      const tIm = Math.sin(angle) * oddFFT[2 * k] + Math.cos(angle) * oddFFT[2 * k + 1];
      
      result[2 * k] = evenFFT[2 * k] + tRe;
      result[2 * k + 1] = evenFFT[2 * k + 1] + tIm;
      result[2 * (k + n / 2)] = evenFFT[2 * k] - tRe;
      result[2 * (k + n / 2) + 1] = evenFFT[2 * k + 1] - tIm;
    }
    
    const magnitudes = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      const re = result[2 * i];
      const im = result[2 * i + 1];
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }
    
    return magnitudes;
  }

  private computeRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  reset(): void {
    this.historyBuffer.fill(0);
    this.energyHistory = [];
  }
}

export async function runBPMTests(): Promise<void> {
  console.log('=== BPM 检测器单元测试 ===\n');
  
  const sampleRate = 44100;
  const detector = new BPMDetector(sampleRate);
  
  console.log('测试1: 生成固定节奏的音频信号 (120 BPM)...');
  const testBPM = 120;
  const testDuration = 10;
  const numSamples = sampleRate * testDuration;
  const testAudio = new Float32Array(numSamples);
  
  const beatInterval = 60 / testBPM;
  const beatSamples = Math.floor(sampleRate * beatInterval);
  const beatWidth = Math.floor(sampleRate * 0.1);
  
  for (let i = 0; i < numSamples; i++) {
    const beatPos = i % beatSamples;
    if (beatPos < beatWidth) {
      const envelope = Math.sin((beatPos / beatWidth) * Math.PI);
      testAudio[i] = envelope * 0.8 * Math.sin(2 * Math.PI * 60 * i / sampleRate);
    } else {
      testAudio[i] = 0.05 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
  }
  
  const result1 = detector.detectBPM(testAudio, sampleRate);
  console.log(`   预期 BPM: ${testBPM}`);
  console.log(`   检测 BPM: ${result1.bpm.toFixed(1)}`);
  console.log(`   置信度: ${result1.confidence.toFixed(3)}`);
  console.log(`   检测到 ${result1.onsetPositions.length} 个 onset`);
  console.log(`   结果: ${Math.abs(result1.bpm - testBPM) < 3 ? '✓ 通过' : '✗ 失败'}\n`);
  
  console.log('测试2: 生成变化节奏 (90 BPM)...');
  const testBPM2 = 90;
  const testAudio2 = new Float32Array(numSamples);
  const beatInterval2 = 60 / testBPM2;
  const beatSamples2 = Math.floor(sampleRate * beatInterval2);
  
  for (let i = 0; i < numSamples; i++) {
    const beatPos = i % beatSamples2;
    if (beatPos < beatWidth) {
      const envelope = Math.sin((beatPos / beatWidth) * Math.PI);
      testAudio2[i] = envelope * 0.9 * Math.sin(2 * Math.PI * 80 * i / sampleRate);
    } else {
      testAudio2[i] = 0.03 * (Math.random() - 0.5);
    }
  }
  
  const result2 = detector.detectBPM(testAudio2, sampleRate);
  console.log(`   预期 BPM: ${testBPM2}`);
  console.log(`   检测 BPM: ${result2.bpm.toFixed(1)}`);
  console.log(`   置信度: ${result2.confidence.toFixed(3)}`);
  console.log(`   检测到 ${result2.onsetPositions.length} 个 onset`);
  console.log(`   结果: ${Math.abs(result2.bpm - testBPM2) < 3 ? '✓ 通过' : '✗ 失败'}\n`);
  
  console.log('测试3: 白噪声 (无节奏)...');
  const noiseAudio = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    noiseAudio[i] = (Math.random() - 0.5) * 0.3;
  }
  
  const result3 = detector.detectBPM(noiseAudio, sampleRate);
  console.log(`   预期: 低置信度, BPM接近默认`);
  console.log(`   检测 BPM: ${result3.bpm.toFixed(1)}`);
  console.log(`   置信度: ${result3.confidence.toFixed(3)}`);
  console.log(`   检测到 ${result3.onsetPositions.length} 个 onset`);
  console.log(`   结果: ${result3.confidence < 0.3 ? '✓ 通过 (低置信度正确)' : '⚠ 注意 (置信度较高)'}\n`);
  
  console.log('=== 测试完成 ===');
}

if (typeof window !== 'undefined' && (window as any).runTests) {
  runBPMTests();
}
