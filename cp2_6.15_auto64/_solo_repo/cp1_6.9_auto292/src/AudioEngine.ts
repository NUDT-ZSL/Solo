export interface BandData {
  index: number;
  energy: number;
  energyHistory: number[];
  variance: number;
  gain: number;
}

export interface SpectrumCallback {
  (bands: BandData[]): void;
}

const BAND_COUNT = 32;
const FFT_SIZE = 2048;
const HISTORY_SIZE = 10;
const MIN_GAIN = -12;
const MAX_GAIN = 12;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private sourceNode: MediaStreamAudioSourceNode | AudioBufferSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array(FFT_SIZE);
  private bandData: BandData[] = [];
  private rafId: number | null = null;
  private isRecording = false;
  private recordChunks: Blob[] = [];
  private recordedBuffer: AudioBuffer | null = null;
  private playbackSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private spectrumCallback: SpectrumCallback | null = null;
  private lastVarianceCalc = 0;
  private synthesisNodes: OscillatorNode[] = [];
  private synthesisGains: GainNode[] = [];
  private masterGain: GainNode | null = null;

  constructor() {
    for (let i = 0; i < BAND_COUNT; i++) {
      this.bandData.push({
        index: i,
        energy: 0,
        energyHistory: [],
        variance: 0,
        gain: 0,
      });
    }
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private createFilterChain(ctx: AudioContext): BiquadFilterNode[] {
    const filters: BiquadFilterNode[] = [];
    const sampleRate = ctx.sampleRate;
    const nyquist = sampleRate / 2;

    for (let i = 0; i < BAND_COUNT; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      const freqLogMin = Math.log2(20);
      const freqLogMax = Math.log2(nyquist * 0.9);
      const freq = Math.pow(2, freqLogMin + (freqLogMax - freqLogMin) * (i / BAND_COUNT));
      filter.frequency.value = freq;
      const nextFreq = Math.pow(2, freqLogMin + (freqLogMax - freqLogMin) * ((i + 1) / BAND_COUNT));
      filter.Q.value = freq / (nextFreq - freq);
      filter.gain.value = this.bandData[i].gain;
      filters.push(filter);
    }
    return filters;
  }

  setSpectrumCallback(callback: SpectrumCallback | null) {
    this.spectrumCallback = callback;
  }

  async startRecording(): Promise<void> {
    const ctx = await this.ensureContext();

    this.stopPlayback();
    this.stopAnalysis();
    this.recordedBuffer = null;
    this.recordChunks = [];

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.sourceNode = ctx.createMediaStreamSource(this.mediaStream);

    this.filterNodes = this.createFilterChain(ctx);
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 1;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.7;

    let node: AudioNode = this.sourceNode;
    for (const filter of this.filterNodes) {
      node.connect(filter);
      node = filter;
    }
    node.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: 'audio/webm' });
    } catch {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordChunks.push(e.data);
    };

    this.mediaRecorder.onstop = async () => {
      const blob = new Blob(this.recordChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      try {
        this.recordedBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn('Audio decode failed, synthesis mode will be used');
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    this.startAnalysis();

    setTimeout(() => {
      if (this.isRecording) {
        this.stopRecording();
      }
    }, 10000);
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.stopAnalysis();
    this.disconnectSource();
  }

  private disconnectSource() {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
      }
    } catch {}
    for (const f of this.filterNodes) {
      try { f.disconnect(); } catch {}
    }
    try {
      if (this.analyser) this.analyser.disconnect();
      if (this.gainNode) this.gainNode.disconnect();
    } catch {}
    this.sourceNode = null;
    this.filterNodes = [];
    this.gainNode = null;
  }

  async startPlayback(): Promise<void> {
    const ctx = await this.ensureContext();
    this.stopPlayback();

    if (this.recordedBuffer) {
      this.playbackSource = ctx.createBufferSource();
      this.playbackSource.buffer = this.recordedBuffer;
      this.playbackSource.loop = true;

      this.filterNodes = this.createFilterChain(ctx);
      for (let i = 0; i < BAND_COUNT; i++) {
        this.filterNodes[i].gain.value = this.bandData[i].gain;
      }
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = 1;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.7;

      let node: AudioNode = this.playbackSource;
      for (const filter of this.filterNodes) {
        node.connect(filter);
        node = filter;
      }
      node.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      this.playbackSource.onended = () => {
        this.isPlaying = false;
      };
      this.playbackSource.start();
      this.isPlaying = true;
      this.startAnalysis();
    } else {
      this.startSynthesis(ctx);
    }
  }

  private startSynthesis(ctx: AudioContext) {
    this.synthesisNodes = [];
    this.synthesisGains = [];

    this.filterNodes = this.createFilterChain(ctx);
    for (let i = 0; i < BAND_COUNT; i++) {
      this.filterNodes[i].gain.value = this.bandData[i].gain;
    }

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.7;

    const nyquist = ctx.sampleRate / 2;
    const freqLogMin = Math.log2(20);
    const freqLogMax = Math.log2(nyquist * 0.9);

    let prev: AudioNode | null = null;
    for (let i = 0; i < BAND_COUNT; i++) {
      const osc = ctx.createOscillator();
      const freq = Math.pow(2, freqLogMin + (freqLogMax - freqLogMin) * (i / BAND_COUNT));
      osc.frequency.value = freq;
      osc.type = i % 3 === 0 ? 'sine' : i % 3 === 1 ? 'triangle' : 'sawtooth';

      const g = ctx.createGain();
      const normalizedEnergy = this.bandData[i].energy / 255;
      g.gain.value = normalizedEnergy * 0.15;

      osc.connect(g);

      if (prev) {
        const merger = ctx.createGain();
        prev.connect(merger);
        g.connect(merger);
        prev = merger;
      } else {
        prev = g;
      }

      this.synthesisNodes.push(osc);
      this.synthesisGains.push(g);
      osc.start();
    }

    if (!prev) return;

    let node = prev;
    for (const filter of this.filterNodes) {
      node.connect(filter);
      node = filter;
    }
    node.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    this.isPlaying = true;
    this.startAnalysis();
  }

  stopPlayback(): void {
    this.isPlaying = false;

    if (this.playbackSource) {
      try { this.playbackSource.stop(); } catch {}
      try { this.playbackSource.disconnect(); } catch {}
      this.playbackSource = null;
    }

    for (const osc of this.synthesisNodes) {
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
    }
    for (const g of this.synthesisGains) {
      try { g.disconnect(); } catch {}
    }
    this.synthesisNodes = [];
    this.synthesisGains = [];

    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch {}
      this.masterGain = null;
    }

    this.stopAnalysis();
    this.disconnectSource();
  }

  setBandGain(bandIndex: number, gainDb: number): void {
    const clamped = Math.max(MIN_GAIN, Math.min(MAX_GAIN, gainDb));
    if (this.bandData[bandIndex]) {
      this.bandData[bandIndex].gain = clamped;
    }
    if (this.filterNodes[bandIndex]) {
      this.filterNodes[bandIndex].gain.setTargetAtTime(clamped, this.audioContext?.currentTime || 0, 0.02);
    }
  }

  setBandEnergy(bandIndex: number, energy: number): void {
    if (this.bandData[bandIndex]) {
      this.bandData[bandIndex].energy = Math.max(0, Math.min(255, energy));
    }
  }

  setAllBandData(bands: { index: number; energy?: number; gain?: number; radius?: number }[]): void {
    for (const b of bands) {
      if (this.bandData[b.index]) {
        if (b.energy !== undefined) this.bandData[b.index].energy = b.energy;
        if (b.gain !== undefined) {
          this.bandData[b.index].gain = b.gain;
          if (this.filterNodes[b.index] && this.audioContext) {
            this.filterNodes[b.index].gain.setTargetAtTime(b.gain, this.audioContext.currentTime, 0.02);
          }
        }
      }
    }
  }

  getBandData(): BandData[] {
    return this.bandData.map((b) => ({ ...b }));
  }

  resetGains(): void {
    for (let i = 0; i < BAND_COUNT; i++) {
      this.bandData[i].gain = 0;
      if (this.filterNodes[i] && this.audioContext) {
        this.filterNodes[i].gain.setTargetAtTime(0, this.audioContext.currentTime, 0.02);
      }
    }
  }

  private startAnalysis(): void {
    if (this.rafId !== null) return;
    const tick = () => {
      this.analyze();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopAnalysis(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private analyze(): void {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.frequencyData);

    const usableBins = Math.floor(this.frequencyData.length / 2);
    const binsPerBand = usableBins / BAND_COUNT;

    for (let i = 0; i < BAND_COUNT; i++) {
      const startBin = Math.floor(i * binsPerBand);
      const endBin = Math.floor((i + 1) * binsPerBand);
      let sum = 0;
      for (let j = startBin; j < endBin; j++) {
        sum += this.frequencyData[j];
      }
      const avg = endBin > startBin ? sum / (endBin - startBin) : 0;
      const gainFactor = Math.pow(10, this.bandData[i].gain / 20);
      const adjusted = Math.min(255, avg * gainFactor);

      this.bandData[i].energy = Math.max(this.bandData[i].energy * 0.7, adjusted);

      this.bandData[i].energyHistory.push(adjusted);
      if (this.bandData[i].energyHistory.length > HISTORY_SIZE) {
        this.bandData[i].energyHistory.shift();
      }
    }

    const now = performance.now();
    if (now - this.lastVarianceCalc > 200) {
      this.lastVarianceCalc = now;
      for (let i = 0; i < BAND_COUNT; i++) {
        const hist = this.bandData[i].energyHistory;
        if (hist.length < 2) {
          this.bandData[i].variance = 0;
          continue;
        }
        const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
        const variance = hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length;
        this.bandData[i].variance = variance;
      }
    }

    if (this.spectrumCallback) {
      this.spectrumCallback(this.bandData.map((b) => ({ ...b, energyHistory: [...b.energyHistory] })));
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  hasRecordedData(): boolean {
    return this.recordedBuffer !== null || this.bandData.some((b) => b.energy > 10);
  }

  static get BAND_COUNT() {
    return BAND_COUNT;
  }

  static get MIN_GAIN() {
    return MIN_GAIN;
  }

  static get MAX_GAIN() {
    return MAX_GAIN;
  }
}
