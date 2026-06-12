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

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private fftSize = 2048;
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
  private beatThreshold = 1.2;
  private beatDecay = 0.98;
  private beatAvgEnergy = 0;
  private lastBeatTime = 0;
  private beatIntervals: number[] = [];
  private sensitivity = 50;
  private animFrameId = 0;
  private gainNode: GainNode | null = null;
  private startTime = 0;
  private pauseTime = 0;

  constructor() {
    this.spectrumData = new Float32Array(this.fftSize / 2);
    this.waveformData = new Float32Array(this.fftSize);
  }

  setCallback(cb: AudioEngineCallback): void {
    this.callback = cb;
  }

  setSensitivity(val: number): void {
    this.sensitivity = val;
    this.beatThreshold = 1.0 + (val / 100) * 0.8;
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

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.analyser = this.audioContext!.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
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

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

    if (this.audioBuffer.duration > 30) {
      throw new Error('Audio file must be 30 seconds or less');
    }
  }

  playFile(): void {
    if (!this.audioContext || !this.audioBuffer) return;

    if (this.sourceNode) {
      (this.sourceNode as AudioBufferSourceNode).stop();
      (this.sourceNode as AudioBufferSourceNode).disconnect();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;
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
    this.startTime = this.audioContext.currentTime - this.pauseTime;

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
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    cancelAnimationFrame(this.animFrameId);
    this.bpm = 0;
    this.pitch = 0;
    this.volume = 0;
    this.isBeat = false;
    this.spectrumEnergy = 0;
    this.beatAvgEnergy = 0;
    this.beatIntervals = [];
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
    this.isBeat = this.detectBeat();
    this.spectrumEnergy = this.computeSpectrumEnergy();
    this.pitch = this.detectPitch();

    if (this.isBeat) {
      this.beatTimestamp = performance.now();
    }

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
    return Math.min(1, rms * 5);
  }

  private computeSpectrumEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this.spectrumData.length; i++) {
      const val = Math.pow(10, this.spectrumData[i] / 10);
      sum += val;
    }
    return sum / this.spectrumData.length;
  }

  private detectBeat(): boolean {
    const lowFreqEnd = Math.floor((300 / (this.audioContext?.sampleRate || 44100)) * this.spectrumData.length);
    let lowEnergy = 0;
    for (let i = 0; i < lowFreqEnd; i++) {
      const val = Math.pow(10, this.spectrumData[i] / 10);
      lowEnergy += val;
    }
    lowEnergy /= Math.max(1, lowFreqEnd);

    this.beatAvgEnergy = this.beatAvgEnergy * this.beatDecay + lowEnergy * (1 - this.beatDecay);

    const now = performance.now();
    const minInterval = (60 / 180) * 1000;

    if (
      lowEnergy > this.beatAvgEnergy * this.beatThreshold &&
      now - this.lastBeatTime > minInterval
    ) {
      const interval = now - this.lastBeatTime;
      if (this.lastBeatTime > 0 && interval < 2000) {
        this.beatIntervals.push(interval);
        if (this.beatIntervals.length > 16) {
          this.beatIntervals.shift();
        }
        this.bpm = Math.round(60000 / this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length);
        if (this.bpm < 60) this.bpm = 60;
        if (this.bpm > 180) this.bpm = 180;
      }
      this.lastBeatTime = now;
      return true;
    }

    return false;
  }

  private detectPitch(): number {
    const bufLen = this.waveformData.length;
    let maxCorr = 0;
    let bestOffset = -1;

    const rms = this.volume;
    if (rms < 0.01) return 0;

    const minPeriod = Math.floor((this.audioContext?.sampleRate || 44100) / 1047);
    const maxPeriod = Math.floor((this.audioContext?.sampleRate || 44100) / 65);

    for (let offset = minPeriod; offset <= maxPeriod; offset++) {
      let corr = 0;
      for (let i = 0; i < bufLen - offset; i++) {
        corr += this.waveformData[i] * this.waveformData[i + offset];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestOffset = offset;
      }
    }

    if (bestOffset === -1) return 0;

    const freq = (this.audioContext?.sampleRate || 44100) / bestOffset;
    if (freq < 65 || freq > 1047) return 0;

    return freq;
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
}
