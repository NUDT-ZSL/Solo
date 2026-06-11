export interface AudioFeature {
  timestamp: number;
  bpm: number;
  energy: number;
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  dominant: 'low' | 'mid' | 'high';
}

export type FeatureStream = AsyncGenerator<AudioFeature, void, unknown>;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isRunning = false;
  private lastBeatTime = 0;
  private beatHistory: number[] = [];

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadFromBuffer(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  async loadFromElement(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    
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
    this.beatHistory = [];
    this.lastBeatTime = performance.now();
  }

  stop(): void {
    this.isRunning = false;
  }

  getCurrentFeature(): AudioFeature {
    if (!this.analyser || !this.dataArray) {
      return {
        timestamp: 0,
        bpm: 0,
        energy: 0,
        lowFreq: 0,
        midFreq: 0,
        highFreq: 0,
        dominant: 'mid',
      };
    }

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    
    const bufferLength = this.dataArray.length;
    const lowEnd = Math.floor(bufferLength * 0.15);
    const midEnd = Math.floor(bufferLength * 0.5);
    
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
    
    const maxFreq = Math.max(lowFreq, midFreq, highFreq);
    let dominant: 'low' | 'mid' | 'high' = 'mid';
    if (maxFreq === lowFreq) dominant = 'low';
    else if (maxFreq === highFreq) dominant = 'high';
    
    const bpm = this.calculateBPM(energy);
    
    return {
      timestamp: performance.now(),
      bpm,
      energy,
      lowFreq,
      midFreq,
      highFreq,
      dominant,
    };
  }

  private calculateBPM(energy: number): number {
    const now = performance.now();
    const threshold = 0.6;
    
    if (energy > threshold && now - this.lastBeatTime > 200) {
      const interval = now - this.lastBeatTime;
      this.beatHistory.push(interval);
      if (this.beatHistory.length > 10) {
        this.beatHistory.shift();
      }
      this.lastBeatTime = now;
    }
    
    if (this.beatHistory.length === 0) return 60;
    
    const avgInterval = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const bpm = 60000 / avgInterval;
    
    return Math.min(Math.max(bpm, 60), 200);
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

  close(): void {
    this.stop();
    if (this.source) {
      try {
        (this.source as AudioBufferSourceNode).stop?.();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.dataArray = null;
  }
}

export async function analyzeAudio(audioBuffer: AudioBuffer): Promise<AudioFeature[]> {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  
  const analyser = offlineContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  
  source.connect(analyser);
  analyser.connect(offlineContext.destination);
  
  source.start();
  
  const features: AudioFeature[] = [];
  const sampleRate = 10;
  const totalSamples = Math.floor(audioBuffer.duration * sampleRate);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const bufferLength = dataArray.length;
  const lowEnd = Math.floor(bufferLength * 0.15);
  const midEnd = Math.floor(bufferLength * 0.5);
  
  let beatHistory: number[] = [];
  let lastBeatTime = 0;
  
  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate;
    offlineContext.suspend(time);
  }
  
  let currentSample = 0;
  
  function processSuspend(): void {
    if (currentSample >= totalSamples) return;
    
    analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
    
    const time = currentSample / sampleRate;
    
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;
    
    for (let j = 0; j < bufferLength; j++) {
      const value = dataArray[j];
      totalSum += value;
      if (j < lowEnd) {
        lowSum += value;
      } else if (j < midEnd) {
        midSum += value;
      } else {
        highSum += value;
      }
    }
    
    const lowFreq = lowSum / (lowEnd * 255);
    const midFreq = midSum / ((midEnd - lowEnd) * 255);
    const highFreq = highSum / ((bufferLength - midEnd) * 255);
    const energy = totalSum / (bufferLength * 255);
    
    const maxFreq = Math.max(lowFreq, midFreq, highFreq);
    let dominant: 'low' | 'mid' | 'high' = 'mid';
    if (maxFreq === lowFreq) dominant = 'low';
    else if (maxFreq === highFreq) dominant = 'high';
    
    const threshold = 0.6;
    let bpm = 60;
    if (energy > threshold && time - lastBeatTime > 0.2) {
      const interval = time - lastBeatTime;
      beatHistory.push(interval);
      if (beatHistory.length > 10) {
        beatHistory.shift();
      }
      lastBeatTime = time;
    }
    if (beatHistory.length > 0) {
      const avgInterval = beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length;
      bpm = Math.min(Math.max(60 / avgInterval, 60), 200);
    }
    
    features.push({
      timestamp: time * 1000,
      bpm,
      energy,
      lowFreq,
      midFreq,
      highFreq,
      dominant,
    });
    
    currentSample++;
    if (currentSample < totalSamples) {
      offlineContext.suspend(currentSample / sampleRate).then(processSuspend);
    }
  }
  
  offlineContext.addEventListener('statechange', () => {
    if (offlineContext.state === 'suspended') {
      processSuspend();
      offlineContext.resume();
    }
  });
  
  await offlineContext.startRendering();
  
  return features;
}
