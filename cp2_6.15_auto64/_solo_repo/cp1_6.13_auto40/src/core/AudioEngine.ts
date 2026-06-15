export type EffectType = 'lowpass' | 'reverb' | 'delay';

export interface LowpassParams {
  frequency: number;
  Q: number;
}

export interface ReverbParams {
  decay: number;
  wet: number;
}

export interface DelayParams {
  time: number;
  feedback: number;
  wet: number;
}

export type EffectParams = LowpassParams | ReverbParams | DelayParams;

export interface EffectInstance {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: EffectParams;
  order: number;
}

export interface WaveformData {
  timeData: Float32Array;
  freqData: Uint8Array;
}

type EventCallback = (...args: any[]) => void;

const generateId = (): string =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserTime: AnalyserNode | null = null;
  private analyserFreq: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioName: string = '';
  private isPlayingState: boolean = false;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private effects: EffectInstance[] = [];
  private effectNodes: Map<string, { input: AudioNode; output: AudioNode }> = new Map();
  private convolverBuffer: AudioBuffer | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecordingState: boolean = false;
  private lastLatency: number = 0;

  async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 44100,
    });

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;

    this.analyserTime = this.audioContext.createAnalyser();
    this.analyserTime.fftSize = 2048;
    this.analyserTime.smoothingTimeConstant = 0.8;

    this.analyserFreq = this.audioContext.createAnalyser();
    this.analyserFreq.fftSize = 256;
    this.analyserFreq.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyserTime);
    this.analyserTime.connect(this.analyserFreq);
    this.analyserFreq.connect(this.audioContext.destination);
  }

  getContext(): AudioContext | null {
    return this.audioContext;
  }

  async loadAudio(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return this.loadFromArrayBuffer(arrayBuffer, file.name);
  }

  async loadFromArrayBuffer(buffer: ArrayBuffer, name: string = 'audio'): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const audioBuffer = await this.audioContext.decodeAudioData(buffer.slice(0));
    this.audioBuffer = audioBuffer;
    this.audioName = name;
    this.pausedAt = 0;
    this.isPlayingState = false;
    this.emit('loaded', audioBuffer);
    return audioBuffer;
  }

  getAudioName(): string {
    return this.audioName;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  setActiveBuffer(buffer: AudioBuffer, name: string): void {
    this.stop();
    this.audioBuffer = buffer;
    this.audioName = name;
    this.pausedAt = 0;
    this.emit('loaded', buffer);
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || this.isPlayingState) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.onended = () => {
      if (this.isPlayingState) {
        this.isPlayingState = false;
        this.pausedAt = 0;
        this.emit('ended');
      }
    };

    this.rebuildEffectChain();

    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlayingState = true;
    this.emit('play');
  }

  pause(): void {
    if (!this.isPlayingState || !this.sourceNode || !this.audioContext) return;
    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    this.sourceNode = null;
    this.isPlayingState = false;
    this.emit('pause');
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlayingState = false;
    this.pausedAt = 0;
    this.emit('stop');
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;
    const wasPlaying = this.isPlayingState;
    this.pausedAt = Math.max(0, Math.min(time, this.audioBuffer.duration));
    if (wasPlaying) {
      this.pause();
      this.play();
    }
    this.emit('timeupdate');
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (this.isPlayingState) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pausedAt;
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  isPlaying(): boolean {
    return this.isPlayingState;
  }

  addEffect(type: EffectType, index?: number): EffectInstance {
    const id = generateId();
    const params = this.getDefaultParams(type);
    const effect: EffectInstance = {
      id,
      type,
      enabled: true,
      params,
      order: index !== undefined ? index : this.effects.length,
    };

    if (index !== undefined) {
      this.effects.splice(index, 0, effect);
      this.effects.forEach((e, i) => (e.order = i));
    } else {
      this.effects.push(effect);
      effect.order = this.effects.length - 1;
    }

    if (this.isPlayingState) {
      this.rebuildEffectChain();
    }

    this.emit('effectsChanged', this.effects);
    return effect;
  }

  removeEffect(id: string): void {
    const idx = this.effects.findIndex((e) => e.id === id);
    if (idx === -1) return;
    this.effects.splice(idx, 1);
    this.effects.forEach((e, i) => (e.order = i));

    const nodes = this.effectNodes.get(id);
    if (nodes) {
      try {
        nodes.input.disconnect();
        nodes.output.disconnect();
      } catch (e) {}
      this.effectNodes.delete(id);
    }

    if (this.isPlayingState) {
      this.rebuildEffectChain();
    }
    this.emit('effectsChanged', this.effects);
  }

  reorderEffects(newOrderIds: string[]): void {
    const newEffects: EffectInstance[] = [];
    newOrderIds.forEach((id, idx) => {
      const effect = this.effects.find((e) => e.id === id);
      if (effect) {
        effect.order = idx;
        newEffects.push(effect);
      }
    });
    this.effects = newEffects;

    if (this.isPlayingState) {
      this.rebuildEffectChain();
    }
    this.emit('effectsChanged', this.effects);
  }

  toggleEffect(id: string): void {
    const effect = this.effects.find((e) => e.id === id);
    if (!effect) return;
    effect.enabled = !effect.enabled;

    if (this.isPlayingState) {
      this.rebuildEffectChain();
    }
    this.emit('effectsChanged', this.effects);
  }

  adjustEffect(id: string, params: Partial<EffectParams>): void {
    const effect = this.effects.find((e) => e.id === id);
    if (!effect) return;

    effect.params = { ...effect.params, ...params } as EffectParams;

    if (this.isPlayingState && effect.enabled) {
      this.applyEffectParams(id, effect);
    }
    this.emit('effectsChanged', this.effects);
  }

  getEffects(): EffectInstance[] {
    return [...this.effects];
  }

  setEffects(effects: EffectInstance[]): void {
    this.effects = [...effects];
    if (this.isPlayingState) {
      this.rebuildEffectChain();
    }
    this.emit('effectsChanged', this.effects);
  }

  getWaveformData(): WaveformData {
    const timeData = new Float32Array(this.analyserTime?.fftSize || 2048);
    const freqData = new Uint8Array(this.analyserFreq?.frequencyBinCount || 128);

    if (this.analyserTime) {
      this.analyserTime.getFloatTimeDomainData(timeData);
    }
    if (this.analyserFreq) {
      this.analyserFreq.getByteFrequencyData(freqData);
    }

    return { timeData, freqData };
  }

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    this.mediaRecorder = new MediaRecorder(stream);
    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecordingState = true;
    this.emit('recordingStart');
  }

  async stopRecording(): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.audioContext) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await this.audioContext!.decodeAudioData(arrayBuffer);

        this.isRecordingState = false;
        this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
        this.mediaRecorder = null;

        this.emit('recordingStop', buffer);
        resolve(buffer);
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.isRecordingState;
  }

  measureLatency(): number {
    if (!this.audioContext) return 0;
    const start = performance.now();
    const testOsc = this.audioContext.createOscillator();
    const testGain = this.audioContext.createGain();
    testGain.gain.value = 0;
    testOsc.connect(testGain);
    testGain.connect(this.audioContext.destination);
    testOsc.start();
    testOsc.stop(this.audioContext.currentTime + 0.01);
    const end = performance.now();
    this.lastLatency = end - start;
    return this.lastLatency;
  }

  getLastLatency(): number {
    return this.lastLatency;
  }

  async getExportBuffer(sampleRate: 44100 | 48000 = 44100): Promise<AudioBuffer> {
    if (!this.audioBuffer) throw new Error('No audio loaded');

    const offlineCtx = new OfflineAudioContext(
      this.audioBuffer.numberOfChannels,
      this.audioBuffer.duration * sampleRate,
      sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = this.audioBuffer;

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.8;

    let lastNode: AudioNode = source;

    for (const effect of this.effects) {
      if (!effect.enabled) continue;

      const nodes = this.createEffectNodesOffline(offlineCtx, effect);
      if (nodes) {
        lastNode.connect(nodes.input);
        lastNode = nodes.output;
      }
    }

    lastNode.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    listeners.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error('Event listener error:', e);
      }
    });
  }

  private getDefaultParams(type: EffectType): EffectParams {
    switch (type) {
      case 'lowpass':
        return { frequency: 2000, Q: 1 } as LowpassParams;
      case 'reverb':
        return { decay: 2, wet: 0.3 } as ReverbParams;
      case 'delay':
        return { time: 0.3, feedback: 0.3, wet: 0.4 } as DelayParams;
    }
  }

  private createEffectNodes(ctx: AudioContext | OfflineAudioContext, effect: EffectInstance): { input: AudioNode; output: AudioNode } | null {
    switch (effect.type) {
      case 'lowpass': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const params = effect.params as LowpassParams;
        filter.frequency.value = params.frequency;
        filter.Q.value = params.Q;
        return { input: filter, output: filter };
      }
      case 'reverb': {
        const convolver = ctx.createConvolver();
        const params = effect.params as ReverbParams;
        convolver.buffer = this.createImpulseResponse(ctx, params.decay);

        const wetGain = ctx.createGain();
        wetGain.gain.value = params.wet;
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1 - params.wet;

        const input = ctx.createGain();
        const output = ctx.createGain();

        input.connect(dryGain);
        dryGain.connect(output);
        input.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(output);

        return { input, output };
      }
      case 'delay': {
        const params = effect.params as DelayParams;
        const delayNode = ctx.createDelay(5);
        delayNode.delayTime.value = params.time;

        const feedbackGain = ctx.createGain();
        feedbackGain.gain.value = params.feedback;

        const wetGain = ctx.createGain();
        wetGain.gain.value = params.wet;
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1 - params.wet;

        const input = ctx.createGain();
        const output = ctx.createGain();

        input.connect(dryGain);
        dryGain.connect(output);
        input.connect(delayNode);
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(wetGain);
        wetGain.connect(output);

        return { input, output };
      }
    }
    return null;
  }

  private createEffectNodesOffline(ctx: OfflineAudioContext, effect: EffectInstance): { input: AudioNode; output: AudioNode } | null {
    return this.createEffectNodes(ctx, effect);
  }

  private createImpulseResponse(ctx: AudioContext | OfflineAudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }
    }

    return impulse;
  }

  private rebuildEffectChain(): void {
    if (!this.sourceNode || !this.masterGain || !this.audioContext) return;

    this.effectNodes.forEach((nodes) => {
      try {
        nodes.input.disconnect();
        nodes.output.disconnect();
      } catch (e) {}
    });
    this.effectNodes.clear();

    let lastNode: AudioNode = this.sourceNode;

    for (const effect of this.effects) {
      if (!effect.enabled) continue;

      const nodes = this.createEffectNodes(this.audioContext!, effect);
      if (nodes) {
        lastNode.connect(nodes.input);
        this.effectNodes.set(effect.id, nodes);
        lastNode = nodes.output;
      }
    }

    lastNode.connect(this.masterGain!);
  }

  private applyEffectParams(id: string, effect: EffectInstance): void {
    const nodes = this.effectNodes.get(id);
    if (!nodes || !this.audioContext) return;

    switch (effect.type) {
      case 'lowpass': {
        const filter = nodes.input as BiquadFilterNode;
        const params = effect.params as LowpassParams;
        filter.frequency.setTargetAtTime(params.frequency, this.audioContext.currentTime, 0.01);
        filter.Q.setTargetAtTime(params.Q, this.audioContext.currentTime, 0.01);
        break;
      }
      case 'reverb': {
        const params = effect.params as ReverbParams;
        const convolver = this.audioContext.createConvolver();
        convolver.buffer = this.createImpulseResponse(this.audioContext, params.decay);
        break;
      }
      case 'delay': {
        const params = effect.params as DelayParams;
        const input = nodes.input as GainNode;
        // We need to find delay/gain nodes inside the chain
        // For simplicity, we rebuild chain for delay/reverb param changes
        this.rebuildEffectChain();
        break;
      }
    }
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioEngine;
