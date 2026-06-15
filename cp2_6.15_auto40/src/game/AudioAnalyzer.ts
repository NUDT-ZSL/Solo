export interface AudioAnalyzerOptions {
  onBeat?: (beatInfo: { bpm: number; energy: number; time: number; phase: number }) => void;
  onSpectrum?: (spectrum: Uint8Array) => void;
  audioUrl?: string;
}

interface BeatCandidate {
  time: number;
  energy: number;
  period: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private spectrumData: Uint8Array = new Uint8Array(256);
  private waveformData: Float32Array = new Float32Array(2048);
  private worker: Worker | null = null;
  private onBeatCallback: AudioAnalyzerOptions['onBeat'];
  private onSpectrumCallback: AudioAnalyzerOptions['onSpectrum'];
  private rafId: number | null = null;
  private startTime: number = 0;
  private lastBeatTime: number = -10;
  private beatThreshold: number = 0.6;
  private bpmHistory: number[] = [];
  private smoothedBpm: number = 120;
  private energyHistory: number[] = [];

  private beatCandidates: BeatCandidate[] = [];
  private detectedPeriods: number[] = [];
  private confidentBpm: number = 0;
  private beatPhase: number = 0;
  private lastProcessedWindow: number = -1;
  private readonly WINDOW_OVERLAP = 0.5;
  private readonly ANALYSIS_WINDOW = 0.5;

  private readonly FFT_SIZE = 2048;
  private estimatedLatencyMs: number = 0;
  private lastAudioFrameTime: number = 0;
  private beatStableCounter: number = 0;
  private expectedNextBeatTime: number = 0;
  private analyserLatencyCompensation: number = 0;

  constructor(options: AudioAnalyzerOptions = {}) {
    this.onBeatCallback = options.onBeat;
    this.onSpectrumCallback = options.onSpectrum;
    this.initWorker();
  }

  private initWorker(): void {
    const workerCode = `
      const SAMPLE_RATE = 44100;
      const FFT_SIZE = 2048;

      let prevSpectrum = new Float32Array(FFT_SIZE / 2);
      let energyBuffer = [];
      let lastBeatInBuffer = -100;
      const MIN_BEAT_INTERVAL = 0.28;
      const MAX_BEAT_INTERVAL = 2.0;

      function computeRMS(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
      }

      function computeLowBandEnergy(buffer, sampleRate) {
        const lowFreqEnd = Math.max(2, Math.floor(250 / (sampleRate / 2) * buffer.length));
        let sum = 0;
        for (let i = 0; i < lowFreqEnd && i < buffer.length; i++) {
          sum += Math.abs(buffer[i]);
        }
        return sum / Math.max(1, lowFreqEnd);
      }

      function computeSpectralFlux(spectrum, prevSpectrum) {
        let flux = 0;
        const half = Math.min(spectrum.length, prevSpectrum.length, 128);
        for (let i = 0; i < half; i++) {
          const diff = spectrum[i] - prevSpectrum[i];
          flux += Math.max(0, diff);
        }
        return flux / half;
      }

      function fft(buffer) {
        const n = buffer.length;
        const real = new Float32Array(n);
        const imag = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          real[i] = buffer[i];
          imag[i] = 0;
        }
        const bits = Math.log2(n);
        for (let i = 0; i < n; i++) {
          let j = 0;
          for (let k = 0; k < bits; k++) {
            j = (j << 1) | ((i >> k) & 1);
          }
          if (j > i) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
          }
        }
        for (let len = 2; len <= n; len <<= 1) {
          const halfLen = len >> 1;
          const ang = -2 * Math.PI / len;
          for (let i = 0; i < n; i += len) {
            let wReal = 1, wImag = 0;
            for (let j = 0; j < halfLen; j++) {
              const tReal = real[i + j + halfLen] * wReal - imag[i + j + halfLen] * wImag;
              const tImag = real[i + j + halfLen] * wImag + imag[i + j + halfLen] * wReal;
              real[i + j + halfLen] = real[i + j] - tReal;
              imag[i + j + halfLen] = imag[i + j] - tImag;
              real[i + j] += tReal;
              imag[i + j] += tImag;
              const nextWReal = wReal * Math.cos(ang) - wImag * Math.sin(ang);
              wImag = wReal * Math.sin(ang) + wImag * Math.cos(ang);
              wReal = nextWReal;
            }
          }
        }
        const magnitude = new Float32Array(n / 2);
        for (let i = 0; i < n / 2; i++) {
          magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }
        return magnitude;
      }

      function findPeakOffset(waveform, sampleRate) {
        const n = Math.min(waveform.length, Math.floor(sampleRate * 0.08));
        let peakIdx = 0, peakVal = 0;
        for (let i = 0; i < n; i++) {
          const v = Math.abs(waveform[i]);
          if (v > peakVal) { peakVal = v; peakIdx = i; }
        }
        return peakIdx / sampleRate;
      }

      function autocorrelate(buffer, sampleRate, minLag, maxLag) {
        const n = buffer.length;
        const c = new Float32Array(maxLag + 1);
        for (let lag = minLag; lag <= maxLag; lag++) {
          let sum = 0;
          const end = n - lag;
          for (let i = 0; i < end; i++) {
            sum += buffer[i] * buffer[i + lag];
          }
          c[lag] = sum;
        }
        let bestLag = -1, bestVal = 0;
        for (let lag = minLag + 2; lag <= maxLag - 2; lag++) {
          if (c[lag] > bestVal && c[lag] > c[lag - 1] && c[lag] > c[lag + 1] &&
              c[lag] > c[lag - 2] && c[lag] > c[lag + 2]) {
            bestVal = c[lag]; bestLag = lag;
          }
        }
        return { lag: bestLag, confidence: bestVal / (c[0] || 1) };
      }

      function detectBPM(energyBuffer, sampleRate) {
        const minBpm = 58, maxBpm = 184;
        const minLag = Math.max(2, Math.floor(sampleRate * 60 / maxBpm));
        const maxLag = Math.floor(sampleRate * 60 / minBpm);
        const { lag, confidence } = autocorrelate(energyBuffer, sampleRate, minLag, Math.min(maxLag, energyBuffer.length - 5));
        if (lag <= 0) return { bpm: 0, confidence: 0 };
        let bpm = 60 * sampleRate / lag;
        while (bpm < 80) bpm *= 2;
        while (bpm > 160) bpm /= 2;
        return { bpm, confidence };
      }

      self.onmessage = function(e) {
        const { waveform, sampleRate, currentTime } = e.data;
        const rms = computeRMS(waveform);
        const lowEnergy = computeLowBandEnergy(waveform, sampleRate);
        const fftSize = Math.min(2048, Math.pow(2, Math.floor(Math.log2(waveform.length))));
        const fftInput = waveform.slice(0, fftSize);
        const spectrum = fft(fftInput);
        const flux = computeSpectralFlux(spectrum, prevSpectrum);
        prevSpectrum = spectrum;
        const windowEnergy = rms * 0.25 + lowEnergy * 0.55 + flux * 0.2;
        const windowDuration = waveform.length / sampleRate;
        const windowCenter = currentTime - windowDuration * 0.5;

        energyBuffer.push({ time: windowCenter, energy: windowEnergy });
        if (energyBuffer.length > 140) energyBuffer.shift();

        let beatDetected = false;
        let beatConfidence = 0;
        let beatTimeOffset = 0;
        if (energyBuffer.length >= 35) {
          const energies = energyBuffer.map(e => e.energy);
          const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
          const variance = energies.reduce((a, b) => a + (b - mean) ** 2, 0) / energies.length;
          const stdDev = Math.sqrt(variance) + 1e-6;
          const threshold = mean + stdDev * 1.25;
          const timeSinceLastBeat = windowCenter - lastBeatInBuffer;

          if (windowEnergy > threshold && timeSinceLastBeat > MIN_BEAT_INTERVAL) {
            beatDetected = true;
            beatTimeOffset = findPeakOffset(waveform, sampleRate);
            beatConfidence = Math.min(1, (windowEnergy - threshold) / (stdDev * 2) + 0.15);
            lastBeatInBuffer = windowCenter + beatTimeOffset;
          } else if (windowEnergy > threshold * 0.92 && timeSinceLastBeat > MAX_BEAT_INTERVAL) {
            beatDetected = true;
            beatConfidence = 0.35;
            lastBeatInBuffer = windowCenter;
          }
        }

        let bpmResult = { bpm: 0, confidence: 0 };
        if (energyBuffer.length >= 80) {
          const energyArray = new Float32Array(energyBuffer.map(e => e.energy));
          const totalTime = energyBuffer[energyBuffer.length - 1].time - energyBuffer[0].time;
          const effectiveSR = totalTime > 0 ? energyBuffer.length / totalTime : 60;
          bpmResult = detectBPM(energyArray, effectiveSR);
        }

        self.postMessage({
          time: windowCenter,
          energy: windowEnergy,
          lowEnergy: lowEnergy,
          flux: flux,
          rms: rms,
          beatDetected: beatDetected,
          beatConfidence: beatConfidence,
          beatTimeOffset: beatTimeOffset,
          windowDuration: windowDuration,
          bpm: bpmResult.bpm,
          bpmConfidence: bpmResult.confidence,
          spectrum: spectrum
        });
      };
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
    rms: number;
    beatDetected: boolean;
    beatConfidence: number;
    beatTimeOffset: number;
    windowDuration: number;
    bpm: number;
    bpmConfidence: number;
    spectrum: Float32Array;
  }): void {
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const frameCompensation = (this.FFT_SIZE / sampleRate) * 0.5 + this.analyserLatencyCompensation;

    this.energyHistory.push(data.energy);
    if (this.energyHistory.length > 45) this.energyHistory.shift();

    if (data.bpm > 0 && data.bpmConfidence > 0.25) {
      this.detectedPeriods.push(data.bpm);
      if (this.detectedPeriods.length > 24) this.detectedPeriods.shift();

      if (this.detectedPeriods.length >= 6) {
        const sorted = [...this.detectedPeriods].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.2)];
        const q3 = sorted[Math.floor(sorted.length * 0.8)];
        const iqr = Math.max(0.5, q3 - q1);
        const filtered = sorted.filter(b => b >= q1 - iqr * 1.5 && b <= q3 + iqr * 1.5);
        if (filtered.length > 0) {
          this.confidentBpm = filtered.reduce((a, b) => a + b, 0) / filtered.length;
          const prev = this.smoothedBpm;
          this.smoothedBpm = prev * 0.65 + this.confidentBpm * 0.35;
          if (Math.abs(this.smoothedBpm - prev) < 4) {
            this.beatStableCounter = Math.min(50, this.beatStableCounter + 1);
          } else {
            this.beatStableCounter = Math.max(0, this.beatStableCounter - 2);
          }
        }
      }
    }

    const audioNow = (this.audioContext ? this.audioContext.currentTime - this.startTime : performance.now() / 1000);

    if (this.beatStableCounter > 8 && this.smoothedBpm > 0) {
      const beatInterval = 60 / this.smoothedBpm;
      const tolerance = beatInterval * 0.1;
      if (audioNow >= this.expectedNextBeatTime - tolerance &&
          audioNow <= this.expectedNextBeatTime + tolerance) {
        if (audioNow - this.lastBeatTime > beatInterval * 0.75) {
          this.issueBeat(audioNow, Math.max(data.energy, 0.5), 0.55);
          this.expectedNextBeatTime = audioNow + beatInterval;
        }
      }
    }

    if (data.beatDetected && data.beatConfidence > 0.2) {
      const beatTime = data.time + data.beatTimeOffset + frameCompensation;
      const interval = beatTime - this.lastBeatTime;
      if (interval > 0.25 && interval < 2.0) {
        const prevBpm = this.smoothedBpm;
        if (prevBpm > 0 && this.beatStableCounter > 4) {
          const expectedInterval = 60 / prevBpm;
          const drift = Math.abs(interval - expectedInterval);
          if (drift > expectedInterval * 0.25 && data.beatConfidence < 0.5) {
            return;
          }
        }
        this.issueBeat(beatTime, data.energy, data.beatConfidence);
        if (this.beatStableCounter > 6 && prevBpm > 0) {
          this.expectedNextBeatTime = beatTime + 60 / prevBpm;
        }
      }
    }

    if (this.onSpectrumCallback) {
      const byteSpectrum = new Uint8Array(this.spectrumData.length);
      const maxVal = Math.max(...data.spectrum.slice(0, byteSpectrum.length), 1);
      const scale = 255 / maxVal;
      for (let i = 0; i < byteSpectrum.length && i < data.spectrum.length; i++) {
        byteSpectrum[i] = Math.min(255, data.spectrum[i] * scale);
      }
      this.onSpectrumCallback(byteSpectrum);
    }
  }

  private issueBeat(beatTime: number, energy: number, confidence: number): void {
    this.lastBeatTime = beatTime;

    if (this.smoothedBpm > 0) {
      const expectedInterval = 60 / this.smoothedBpm;
      this.beatPhase = ((beatTime % expectedInterval) + expectedInterval) % expectedInterval / expectedInterval;
      this.bpmHistory.push(expectedInterval);
    } else {
      this.beatPhase = 0;
    }
    if (this.bpmHistory.length > 18) this.bpmHistory.shift();

    if (this.onBeatCallback) {
      this.onBeatCallback({
        bpm: Math.round(this.smoothedBpm) || 120,
        energy: energy,
        time: beatTime,
        phase: this.beatPhase
      });
    }
  }

  public async loadAudio(url: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const sr = this.audioContext.sampleRate;
    this.analyserLatencyCompensation = 0.025;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.62;

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

    this.resetState();
  }

  private resetState(): void {
    this.beatCandidates = [];
    this.detectedPeriods = [];
    this.confidentBpm = 0;
    this.smoothedBpm = 120;
    this.beatPhase = 0;
    this.lastBeatTime = -10;
    this.energyHistory = [];
    this.bpmHistory = [];
    this.beatStableCounter = 0;
    this.expectedNextBeatTime = -1;
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
      this.analyserLatencyCompensation = 0.06;

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const ctx = this.audioContext!;
          this.analyser = ctx.createAnalyser();
          this.analyser.fftSize = this.FFT_SIZE;
          this.analyser.smoothingTimeConstant = 0.62;

          this.source = ctx.createMediaStreamSource(stream);
          this.source.connect(this.analyser!);

          this.gainNode = ctx.createGain();
          this.gainNode.gain.value = 1;
          this.analyser.connect(this.gainNode);
          this.gainNode.connect(ctx.destination);

          this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount);
          this.waveformData = new Float32Array(this.analyser.fftSize);

          this.startTime = ctx.currentTime;
          this.resetState();
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
      const wfBuffer = this.waveformData.buffer as ArrayBuffer;
      this.worker.postMessage({
        waveform: new Float32Array(wfBuffer, this.waveformData.byteOffset, this.waveformData.length),
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

  public getBeatPhase(): number {
    return this.beatPhase;
  }

  public getEstimatedLatencyMs(): number {
    return this.estimatedLatencyMs;
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
