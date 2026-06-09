import { Track, InstrumentType } from './types';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private trackNodes: Map<number, {
    gain: GainNode;
    pan: StereoPannerNode;
    reverbSend: GainNode;
    delaySend: GainNode;
    distortionSend: GainNode;
  }> = new Map();
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private distortionGain: GainNode | null = null;
  private scheduledEvents: { id: number; timeout: number }[] = [];
  private eventIdCounter = 0;
  private bpm: number = 120;
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private startTime: number = 0;
  private animationFrame: number | null = null;
  private onStepChange: ((step: number, time: number) => void) | null = null;

  async init() {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    this.reverbNode = this.audioContext.createConvolver();
    this.reverbGain = this.audioContext.createGain();
    this.reverbGain.gain.value = 0;
    await this.createReverbImpulse();
    
    this.delayNode = this.audioContext.createDelay(5.0);
    this.delayNode.delayTime.value = 0.3;
    this.delayFeedback = this.audioContext.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayGain = this.audioContext.createGain();
    this.delayGain.gain.value = 0;
    
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    this.distortionNode = this.audioContext.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(400);
    this.distortionGain = this.audioContext.createGain();
    this.distortionGain.gain.value = 0;
    
    this.reverbNode.connect(this.reverbGain);
    this.delayNode.connect(this.delayGain);
    this.distortionNode.connect(this.distortionGain);
    
    this.reverbGain.connect(this.masterGain);
    this.delayGain.connect(this.masterGain);
    this.distortionGain.connect(this.masterGain);
    
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  private async createReverbImpulse() {
    if (!this.audioContext || !this.reverbNode) return;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    
    this.reverbNode.buffer = impulse;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    
    return curve;
  }

  initTrack(track: Track) {
    if (!this.audioContext || !this.masterGain || !this.reverbNode || !this.delayNode || !this.distortionNode) return;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = track.volume / 100;
    
    const pan = this.audioContext.createStereoPanner();
    pan.pan.value = track.pan / 50;
    
    const reverbSend = this.audioContext.createGain();
    reverbSend.gain.value = track.reverb / 100;
    
    const delaySend = this.audioContext.createGain();
    delaySend.gain.value = track.delay / 100;
    
    const distortionSend = this.audioContext.createGain();
    distortionSend.gain.value = track.distortion / 100;
    
    gain.connect(pan);
    pan.connect(this.masterGain);
    pan.connect(reverbSend);
    pan.connect(delaySend);
    pan.connect(distortionSend);
    reverbSend.connect(this.reverbNode);
    delaySend.connect(this.delayNode);
    distortionSend.connect(this.distortionNode);
    
    this.trackNodes.set(track.id, { gain, pan, reverbSend, delaySend, distortionSend });
  }

  updateTrackParam(trackId: number, param: 'volume' | 'pan' | 'reverb' | 'delay' | 'distortion', value: number) {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'volume':
        nodes.gain.gain.linearRampToValueAtTime(value / 100, now + 0.15);
        break;
      case 'pan':
        nodes.pan.pan.linearRampToValueAtTime(value / 50, now + 0.15);
        break;
      case 'reverb':
        nodes.reverbSend.gain.linearRampToValueAtTime(value / 100, now + 0.15);
        break;
      case 'delay':
        nodes.delaySend.gain.linearRampToValueAtTime(value / 100, now + 0.15);
        break;
      case 'distortion':
        nodes.distortionSend.gain.linearRampToValueAtTime(value / 100, now + 0.15);
        break;
    }
  }

  playInstrument(instrument: InstrumentType, trackId: number, time?: number) {
    if (!this.audioContext) return;
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;
    
    const playTime = time ?? this.audioContext.currentTime;
    
    switch (instrument) {
      case 'kick':
        this.playKick(nodes.gain, playTime);
        break;
      case 'snare':
        this.playSnare(nodes.gain, playTime);
        break;
      case 'hihat':
        this.playHiHat(nodes.gain, playTime);
        break;
      case 'bass':
        this.playBass(nodes.gain, playTime);
        break;
      case 'keyboard':
        this.playKeyboard(nodes.gain, playTime);
        break;
      case 'guitar':
        this.playGuitar(nodes.gain, playTime);
        break;
      case 'pad':
        this.playPad(nodes.gain, playTime);
        break;
      case 'perc':
        this.playPerc(nodes.gain, playTime);
        break;
    }
  }

  private playKick(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    osc.connect(gain);
    gain.connect(destination);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playSnare(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;
    
    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(time);
    noise.stop(time + 0.2);
    
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playHiHat(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
    noise.stop(time + 0.08);
  }

  private playBass(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, time);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    osc.start(time);
    osc.stop(time + 0.4);
  }

  private playKeyboard(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const freqs = [261.63, 329.63, 392.00];
    freqs.forEach((freq) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
      
      osc.connect(gain);
      gain.connect(destination);
      osc.start(time);
      osc.stop(time + 0.6);
    });
  }

  private playGuitar(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(196, time);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.Q.value = 2;
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    osc.start(time);
    osc.stop(time + 0.8);
  }

  private playPad(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const freqs = [220, 277.18, 329.63, 440];
    freqs.forEach((freq, idx) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime((idx - 2) * 5, time);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.3);
      gain.gain.linearRampToValueAtTime(0.1, time + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 2);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      osc.start(time);
      osc.stop(time + 2);
    });
  }

  private playPerc(destination: GainNode, time: number) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.05);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.1);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    osc.connect(gain);
    gain.connect(destination);
    
    osc.start(time);
    osc.stop(time + 0.15);
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
  }

  startPlayback(tracks: Track[], onStepChange: (step: number, time: number) => void) {
    if (!this.audioContext || this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentStep = 0;
    this.startTime = this.audioContext.currentTime;
    this.onStepChange = onStepChange;
    
    this.scheduleLoop(tracks);
    this.schedulePlayhead();
  }

  private scheduleLoop(tracks: Track[]) {
    if (!this.audioContext || !this.isPlaying) return;
    
    const stepDuration = 60 / this.bpm / 4;
    const loopDuration = stepDuration * 16;
    const now = this.audioContext.currentTime;
    
    const timeSinceStart = now - this.startTime;
    const loopsCompleted = Math.floor(timeSinceStart / loopDuration);
    const loopStartTime = this.startTime + loopsCompleted * loopDuration;
    const nextLoopStartTime = loopStartTime + loopDuration;
    
    for (let step = 0; step < 16; step++) {
      const stepTime = loopStartTime + step * stepDuration;
      const nextStepTime = nextLoopStartTime + step * stepDuration;
      
      tracks.forEach(track => {
        if (track.steps[step]) {
          const id = this.eventIdCounter++;
          if (stepTime > now - 0.05) {
            const to = window.setTimeout(() => {
              this.playInstrument(track.instrument, track.id, stepTime);
              this.onStepChange?.(step, stepTime);
            }, Math.max(0, (stepTime - now) * 1000 - 10));
            this.scheduledEvents.push({ id, timeout: to });
          }
          if (nextStepTime > now) {
            const to = window.setTimeout(() => {
              this.playInstrument(track.instrument, track.id, nextStepTime);
              this.onStepChange?.(step, nextStepTime);
            }, Math.max(0, (nextStepTime - now) * 1000 - 10));
            this.scheduledEvents.push({ id, timeout: to });
          }
        }
      });
    }
    
    const nextLoopTime = nextLoopStartTime - now;
    const to = window.setTimeout(() => {
      if (this.isPlaying) this.scheduleLoop(tracks);
    }, nextLoopTime * 1000 - 50);
    
    this.scheduledEvents.push({ id: this.eventIdCounter++, timeout: to });
  }

  private schedulePlayhead() {
    if (!this.audioContext || !this.isPlaying) return;
    
    const stepDuration = 60 / this.bpm / 4;
    const loopDuration = stepDuration * 16;
    
    const updatePlayhead = () => {
      if (!this.audioContext || !this.isPlaying) return;
      
      const now = this.audioContext.currentTime;
      const timeSinceStart = now - this.startTime;
      const positionInLoop = timeSinceStart % loopDuration;
      const step = Math.floor(positionInLoop / stepDuration);
      
      if (step !== this.currentStep) {
        this.currentStep = step;
      }
      
      this.animationFrame = requestAnimationFrame(updatePlayhead);
    };
    
    this.animationFrame = requestAnimationFrame(updatePlayhead);
  }

  getPlayheadPosition(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    
    const stepDuration = 60 / this.bpm / 4;
    const loopDuration = stepDuration * 16;
    const now = this.audioContext.currentTime;
    const timeSinceStart = now - this.startTime;
    const positionInLoop = timeSinceStart % loopDuration;
    
    return positionInLoop / stepDuration;
  }

  stopPlayback() {
    this.isPlaying = false;
    this.currentStep = 0;
    
    this.scheduledEvents.forEach(e => clearTimeout(e.timeout));
    this.scheduledEvents = [];
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
