export interface AudioAnalyzerOptions {
  onBeat?: (beatInfo: { bpm: number; energy: number; time: number }) => void;
  onSpectrum?: (spectrum: Uint8Array) => void;
  audioUrl?: string;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private spectrumData: Uint8Array = new Uint8Array(256);
  private waveformData: Float32Array = new Float32Array(2048);
  private worker: Worker | null = null;
  private onBeatCallback: AudioAnalyzerOptions['onBeat'];
  private onSpectrumCallback: AudioAnalyzerOptions['onSpectrum'];
  private rafId: number | null = null;
  private startTime: number = 0;
  private lastBeatTime: number = 0;
  private beatThreshold: number = 0.6;
  private bpmHistory: number[] = [];
  private smoothedBpm: number = 120;
  private energyHistory: number[] = [];

  constructor(options: AudioAnalyzerOptions = {}) {
    this.onBeatCallback = options.onBeat;
    this.onSpectrumCallback = options.onSpectrum;
    this.initWorker();
  }

  private initWorker(): void {
    const workerCode = `
      self.onmessage = function(e) {
        const { waveform, sampleRate, currentTime } = e.data;
        const result = analyzeBeat(waveform, sampleRate, currentTime);
        self.postMessage(result);
      };

      function analyzeBeat(waveform, sampleRate, currentTime) {
        const n = waveform.length;
        let sum = 0;
        let sumSq = 0;
        let peak = 0;

        for (let i = 0; i < n; i++) {
          const v = Math.abs(waveform[i]);
          sum += v;
          sumSq += v * v;
          if (v > peak) peak = v;
        }

        const rms = Math.sqrt(sumSq / n);
        const avg = sum / n;
        const energy = rms * 2;

        const lowBandStart = Math.floor(n * 0.02);
        const lowBandEnd = Math.floor(n * 0.15);
        let lowSum = 0;
        for (let i = lowBandStart; i < lowBandEnd; i++) {
          lowSum += Math.abs(waveform[i]);
        }
        const lowEnergy = lowSum / (lowBandEnd - lowBandStart) * 3;

        const bandPassStart = Math.floor(n * 0.05);
        const bandPassEnd = Math.floor(n * 0.1);
        let bpSum = 0;
        let bpMax = 0;
        for (let i = bandPassStart; i < bandPassEnd; i++) {
          const v = Math.abs(waveform[i]);
          bpSum += v;
          if (v > bpMax) bpMax = v;
        }
        const bpAvg = bpSum / (bandPassEnd - bandPassStart);

        const flux = Math.max(0, (bpMax - bpAvg * 1.3)) * 5;

        return {
          time: currentTime,
          energy: energy,
          lowEnergy: lowEnergy,
          flux: flux,
          peak: peak,
          avg: avg,
          rms: rms
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);

    this.worker.onmessage = (e) => {
      this.handleAnalysisResult(e.data);
    };
  }

  private handleAnalysisResult(data: {
    time: number;
    energy: number;
    lowEnergy: number;
    flux: number;
    peak: number;
    avg: number;
    rms: number;
  }): void {
    this.energyHistory.push(data.energy);
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }

    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((a, b) => a + (b - avgEnergy) ** 2, 0) / this.energyHistory.length;
    const stdDev = Math.sqrt(variance);
    const threshold = avgEnergy + stdDev * 0.8;

    const combinedEnergy = (data.energy * 0.4 + data.lowEnergy * 0.3 + data.flux * 0.3);
    const beatDetected = combinedEnergy > threshold && (data.time - this.lastBeatTime) > 0.25;

    if (beatDetected) {
      this.lastBeatTime = data.time;
      const interval = data.time - (this.bpmHistory.length > 0 ? this.bpmHistory[this.bpmHistory.length - 1] : 0);
      if (interval > 0.3 && interval < 2) {
        const instantBpm = 60 / interval;
        this.bpmHistory.push(instantBpm);
        if (this.bpmHistory.length > 10) {
          this.bpmHistory.shift();
        }
        if (this.bpmHistory.length > 2) {
          const sorted = [...this.bpmHistory].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          this.smoothedBpm = sorted.length % 2
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        }
      }

      if (this.onBeatCallback) {
        this.onBeatCallback({
          bpm: this.smoothedBpm,
          energy: combinedEnergy,
          time: data.time
        });
      }
    }
  }

  public async loadAudio(url: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.7;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.8;

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    if (this.source) {
      try { (this.source as AudioBufferSourceNode).stop(); } catch (e) {}
    }

    this.source = this.audioContext.createBufferSource();
    (this.source as AudioBufferSourceNode).buffer = audioBuffer;
    (this.source as AudioBufferSourceNode).connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformData = new Float32Array(this.analyser.fftSize);
  }

  public async start(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.source && 'buffer' in this.source) {
      (this.source as AudioBufferSourceNode).start();
      this.startTime = this.audioContext.currentTime;
    }

    this.analyzeLoop();
  }

  public startWithMicrophone(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          this.analyser = this.audioContext!.createAnalyser();
          this.analyser.fftSize = 2048;
          this.analyser.smoothingTimeConstant = 0.7;

          this.source = this.audioContext!.createMediaStreamSource(stream);
          this.source.connect(this.analyser);

          this.gainNode = this.audioContext!.createGain();
          this.gainNode.gain.value = 1;
          this.analyser.connect(this.gainNode);
          this.gainNode.connect(this.audioContext!.destination);

          this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount);
          this.waveformData = new Float32Array(this.analyser.fftSize);

          this.startTime = this.audioContext!.currentTime;
          this.analyzeLoop();
          resolve();
        })
        .catch(reject);
    });
  }

  private analyzeLoop(): void {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.spectrumData);
    this.analyser.getFloatTimeDomainData(this.waveformData);

    const currentTime = this.audioContext
      ? this.audioContext.currentTime - this.startTime
      : performance.now() / 1000;

    if (this.worker) {
      this.worker.postMessage({
        waveform: this.waveformData,
        sampleRate: this.audioContext?.sampleRate || 44100,
        currentTime: currentTime
      });
    }

    if (this.onSpectrumCallback) {
      this.onSpectrumCallback(this.spectrumData);
    }

    this.rafId = requestAnimationFrame(() => this.analyzeLoop());
  }

  public playRiseSound(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  public playBreakSound(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const noiseGain = ctx.createGain();
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.15);
  }

  public getSpectrum(): Uint8Array {
    return this.spectrumData;
  }

  public getBpm(): number {
    return this.smoothedBpm;
  }

  public stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.source && 'stop' in this.source) {
      try { (this.source as AudioBufferSourceNode).stop(); } catch (e) {}
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
