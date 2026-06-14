import type { InstrumentType, Track, Note, LevelData, EffectType } from './types';

interface TrackAudioNodes {
  preGain: GainNode;
  volumeGain: GainNode;
  panNode: StereoPannerNode;
  analyser: AnalyserNode;
  drySend: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  chorusSend: GainNode;
  reverbConvolver: ConvolverNode | null;
  delayNode: DelayNode | null;
  delayFeedback: GainNode | null;
  chorusDelay: DelayNode | null;
  chorusLFO: OscillatorNode | null;
  chorusLFOGain: GainNode | null;
}

interface ReusableVoice {
  osc: OscillatorNode;
  gain: GainNode;
  inUse: boolean;
}

class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioContext: AudioContext | null = null;
  private bpm: number = 140;
  private trackNodes: Map<string, TrackAudioNodes> = new Map();
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterReverb: ConvolverNode | null = null;
  private masterReverbWet: GainNode | null = null;
  private masterDelay: DelayNode | null = null;
  private masterDelayFeedback: GainNode | null = null;
  private masterDelayWet: GainNode | null = null;
  private levelCallbacks: ((levels: LevelData[]) => void) | null = null;
  private animationFrameId: number | null = null;
  private voicePool: ReusableVoice[] = [];
  private maxVoices: number = 64;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx();

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;

    this.masterAnalyser = this.audioContext.createAnalyser();
    this.masterAnalyser.fftSize = 512;

    this.masterReverb = this.audioContext.createConvolver();
    this.masterReverb.buffer = this.createReverbImpulse(2.5, 2.0);
    this.masterReverbWet = this.audioContext.createGain();
    this.masterReverbWet.gain.value = 0.15;

    this.masterDelay = this.audioContext.createDelay(5.0);
    this.masterDelay.delayTime.value = 0.25;
    this.masterDelayFeedback = this.audioContext.createGain();
    this.masterDelayFeedback.gain.value = 0.35;
    this.masterDelayWet = this.audioContext.createGain();
    this.masterDelayWet.gain.value = 0.1;

    this.masterDelay.connect(this.masterDelayFeedback);
    this.masterDelayFeedback.connect(this.masterDelay);
    this.masterDelay.connect(this.masterDelayWet);

    this.masterReverb.connect(this.masterReverbWet);

    this.masterGain.connect(this.masterAnalyser);
    this.masterReverbWet.connect(this.masterAnalyser);
    this.masterDelayWet.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.audioContext.destination);

    this.initVoicePool();
    this.startLevelMonitoring();
  }

  private initVoicePool(): void {
    if (!this.audioContext) return;
    for (let i = 0; i < this.maxVoices; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.audioContext.createGain());
      this.voicePool.push({ osc, gain, inUse: false });
    }
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.exp(-t * decay * 3);
        const earlyReflections = Math.exp(-t * 30) * 0.4;
        channelData[i] = (Math.random() * 2 - 1) * (envelope + earlyReflections) * (1 - t * 0.3);
      }
    }

    return impulse;
  }

  public setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  public getStepDuration(): number {
    return 60 / this.bpm / 4;
  }

  public initTrack(track: Track): void {
    if (!this.audioContext || this.trackNodes.has(track.id)) return;

    const preGain = this.audioContext.createGain();
    preGain.gain.value = 1.0;

    const volumeGain = this.audioContext.createGain();
    volumeGain.gain.value = track.muted ? 0 : track.volume / 100;

    const panNode = this.audioContext.createStereoPanner();
    panNode.pan.value = track.mixer.pan;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;

    const drySend = this.audioContext.createGain();
    drySend.gain.value = 1.0;

    const reverbSend = this.audioContext.createGain();
    reverbSend.gain.value = 0;

    const delaySend = this.audioContext.createGain();
    delaySend.gain.value = 0;

    const chorusSend = this.audioContext.createGain();
    chorusSend.gain.value = 0;

    preGain.connect(volumeGain);
    volumeGain.connect(panNode);
    panNode.connect(analyser);

    analyser.connect(drySend);
    drySend.connect(this.masterGain!);

    analyser.connect(reverbSend);
    reverbSend.connect(this.masterReverb!);

    analyser.connect(delaySend);
    delaySend.connect(this.masterDelay!);

    const trackNodes: TrackAudioNodes = {
      preGain,
      volumeGain,
      panNode,
      analyser,
      drySend,
      reverbSend,
      delaySend,
      chorusSend,
      reverbConvolver: null,
      delayNode: null,
      delayFeedback: null,
      chorusDelay: null,
      chorusLFO: null,
      chorusLFOGain: null,
    };

    this.setupTrackEffects(track, trackNodes);
    this.trackNodes.set(track.id, trackNodes);
  }

  private setupTrackEffects(track: Track, nodes: TrackAudioNodes): void {
    if (!this.audioContext) return;

    track.effects.forEach((effect) => {
      if (!effect.enabled) return;

      if (effect.type === 'reverb') {
        nodes.reverbSend.gain.value = effect.params.wet || 0.3;
      } else if (effect.type === 'delay') {
        nodes.delaySend.gain.value = effect.params.wet || 0.3;
      } else if (effect.type === 'chorus') {
        const chorusDelay = this.audioContext.createDelay(0.05);
        chorusDelay.delayTime.value = effect.params.delay || 0.015;

        const chorusLFO = this.audioContext.createOscillator();
        chorusLFO.type = 'sine';
        chorusLFO.frequency.value = 0.5;

        const chorusLFOGain = this.audioContext.createGain();
        chorusLFOGain.gain.value = 0.003;

        chorusLFO.connect(chorusLFOGain);
        chorusLFOGain.connect(chorusDelay.delayTime);
        chorusLFO.start();

        const chorusWet = this.audioContext.createGain();
        chorusWet.gain.value = effect.params.wet || 0.3;

        nodes.analyser.connect(chorusDelay);
        chorusDelay.connect(chorusWet);
        chorusWet.connect(this.masterGain!);

        nodes.chorusDelay = chorusDelay;
        nodes.chorusLFO = chorusLFO;
        nodes.chorusLFOGain = chorusLFOGain;
        nodes.chorusSend = chorusWet;
      }
    });
  }

  public updateTrackVolume(trackId: string, volume: number, muted: boolean): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes && this.audioContext) {
      const now = this.audioContext.currentTime;
      nodes.volumeGain.gain.cancelScheduledValues(now);
      nodes.volumeGain.gain.linearRampToValueAtTime(
        muted ? 0 : Math.max(0, Math.min(1, volume / 100)),
        now + 0.02
      );
    }
  }

  public updateTrackPan(trackId: string, pan: number): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes && this.audioContext) {
      const now = this.audioContext.currentTime;
      nodes.panNode.pan.cancelScheduledValues(now);
      nodes.panNode.pan.linearRampToValueAtTime(
        Math.max(-1, Math.min(1, pan)),
        now + 0.02
      );
    }
  }

  public updateTrackEffects(track: Track): void {
    const nodes = this.trackNodes.get(track.id);
    if (!nodes || !this.audioContext) return;

    if (nodes.reverbConvolver) {
      try { nodes.reverbConvolver.disconnect(); } catch (e) { /* ignore */ }
      nodes.reverbConvolver = null;
    }
    if (nodes.delayNode) {
      try {
        nodes.delayNode.disconnect();
        if (nodes.delayFeedback) nodes.delayFeedback.disconnect();
      } catch (e) { /* ignore */ }
      nodes.delayNode = null;
      nodes.delayFeedback = null;
    }
    if (nodes.chorusDelay) {
      try {
        nodes.chorusDelay.disconnect();
        if (nodes.chorusLFO) nodes.chorusLFO.stop();
        if (nodes.chorusLFOGain) nodes.chorusLFOGain.disconnect();
      } catch (e) { /* ignore */ }
      nodes.chorusDelay = null;
      nodes.chorusLFO = null;
      nodes.chorusLFOGain = null;
    }

    nodes.reverbSend.gain.value = 0;
    nodes.delaySend.gain.value = 0;
    nodes.chorusSend.gain.value = 0;

    this.setupTrackEffects(track, nodes);
  }

  private midiToFreq(midiPitch: number): number {
    return 440 * Math.pow(2, (midiPitch - 69) / 12);
  }

  public playNote(
    trackId: string,
    instrument: InstrumentType,
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number,
    transpose: number = 0,
    speedMultiplier: number = 1
  ): void {
    if (!this.audioContext) return;

    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;

    const actualPitch = pitch + transpose;
    const actualDuration = Math.max(0.05, duration / speedMultiplier) * this.getStepDuration();
    const velocityFactor = Math.max(0.05, Math.min(1, velocity / 127));

    const contextTime = this.audioContext.currentTime;
    const noteStart = contextTime + Math.max(0, startTime);
    const noteEnd = noteStart + actualDuration;

    this.synthesizeInstrument(
      instrument,
      actualPitch,
      velocityFactor,
      noteStart,
      noteEnd,
      nodes.preGain
    );
  }

  private synthesizeInstrument(
    instrument: InstrumentType,
    pitch: number,
    velocity: number,
    startTime: number,
    endTime: number,
    output: AudioNode
  ): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const duration = endTime - startTime;

    switch (instrument) {
      case 'piano':
        this.synthPiano(pitch, velocity, startTime, duration, output);
        break;
      case 'drums':
        this.synthDrums(pitch, velocity, startTime, output);
        break;
      case 'bass':
        this.synthBass(pitch, velocity, startTime, duration, output);
        break;
    }
  }

  private synthPiano(
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number,
    output: AudioNode
  ): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const freq = this.midiToFreq(pitch);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();
    const master = ctx.createGain();

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4000;
    filter.Q.value = 0.5;

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.gain.value = 0.6 * velocity;
    gain2.gain.value = 0.2 * velocity;
    gain3.gain.value = 0.08 * velocity;

    gain1.connect(master);
    gain2.connect(master);
    gain3.connect(master);

    master.connect(filter);
    filter.connect(output);

    const attackTime = 0.005;
    const decayTime = Math.min(0.3, duration * 0.3);
    const sustainLevel = 0.4;
    const releaseTime = Math.max(0.1, duration * 0.4);

    master.gain.setValueAtTime(0, startTime);
    master.gain.linearRampToValueAtTime(1.0, startTime + attackTime);
    master.gain.exponentialRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
    master.gain.setValueAtTime(sustainLevel, endTimeSafe(startTime + duration) - releaseTime);
    master.gain.exponentialRampToValueAtTime(0.001, endTimeSafe(startTime + duration));

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    const stopTime = endTimeSafe(startTime + duration + releaseTime + 0.1);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);
  }

  private synthDrums(
    pitch: number,
    velocity: number,
    startTime: number,
    output: AudioNode
  ): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;

    const pitchClass = pitch % 12;
    const noteClass = pitchClass;

    if (noteClass === 0 || noteClass === 1) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const clickGain = ctx.createGain();
      const clickOsc = ctx.createOscillator();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, startTime);
      osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.12);

      clickOsc.type = 'square';
      clickOsc.frequency.value = 180;

      oscGain.gain.setValueAtTime(velocity * 1.2, startTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      clickGain.gain.setValueAtTime(velocity * 0.3, startTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.02);

      osc.connect(oscGain);
      oscGain.connect(output);
      clickOsc.connect(clickGain);
      clickGain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
      clickOsc.start(startTime);
      clickOsc.stop(startTime + 0.03);
    }
    else if (noteClass === 2 || noteClass === 3) {
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.8);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;

      const toneFilter = ctx.createBiquadFilter();
      toneFilter.type = 'bandpass';
      toneFilter.frequency.value = 3500;
      toneFilter.Q.value = 0.8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(velocity * 0.9, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      const tone = ctx.createOscillator();
      tone.type = 'triangle';
      tone.frequency.value = 220;

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(velocity * 0.4, startTime);
      toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      noise.connect(filter);
      filter.connect(toneFilter);
      toneFilter.connect(noiseGain);
      noiseGain.connect(output);

      tone.connect(toneGain);
      toneGain.connect(output);

      noise.start(startTime);
      noise.stop(startTime + 0.2);
      tone.start(startTime);
      tone.stop(startTime + 0.15);
    }
    else if (noteClass === 4 || noteClass === 5) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = this.midiToFreq(Math.max(36, pitch));

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(velocity * 0.7, startTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = velocity * 0.3;

      osc.connect(oscGain);
      oscGain.connect(output);
      noise.connect(noiseGain);
      noiseGain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
      noise.start(startTime);
      noise.stop(startTime + 0.05);
    }
    else {
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000 + noteClass * 300;
      filter.Q.value = 1.5;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(velocity * 0.6, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(output);

      noise.start(startTime);
      noise.stop(startTime + 0.15);
    }
  }

  private synthBass(
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number,
    output: AudioNode
  ): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const freq = this.midiToFreq(pitch);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq * 0.5;

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = freq * 0.5;

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = freq * 0.25;

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const subGain = ctx.createGain();
    const master = ctx.createGain();

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, startTime);
    filter.frequency.exponentialRampToValueAtTime(250, startTime + Math.min(duration, 0.2));
    filter.Q.value = 2;

    osc1.connect(gain1);
    osc2.connect(gain2);
    subOsc.connect(subGain);

    gain1.gain.value = 0.5 * velocity;
    gain2.gain.value = 0.25 * velocity;
    subGain.gain.value = 0.4 * velocity;

    gain1.connect(master);
    gain2.connect(master);
    subGain.connect(master);

    master.connect(filter);
    filter.connect(output);

    const attackTime = 0.003;
    const decayTime = Math.min(0.15, duration * 0.2);
    const sustainLevel = 0.6;
    const releaseTime = Math.max(0.08, duration * 0.25);

    master.gain.setValueAtTime(0, startTime);
    master.gain.linearRampToValueAtTime(1.0, startTime + attackTime);
    master.gain.exponentialRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
    master.gain.setValueAtTime(sustainLevel, endTimeSafe(startTime + duration) - releaseTime);
    master.gain.exponentialRampToValueAtTime(0.001, endTimeSafe(startTime + duration));

    osc1.start(startTime);
    osc2.start(startTime);
    subOsc.start(startTime);

    const stopTime = endTimeSafe(startTime + duration + releaseTime + 0.05);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    subOsc.stop(stopTime);
  }

  public scheduleNotes(notes: Note[], tracks: Track[], loopStart: number, loopEnd: number, currentTime: number): void {
    const stepDuration = this.getStepDuration();
    const loopLength = Math.max(1, loopEnd - loopStart);

    const hasSolo = tracks.some(t => t.solo);

    notes.forEach(note => {
      const track = tracks.find(t => t.id === note.trackId);
      if (!track || track.muted) return;
      if (hasSolo && !track.solo) return;

      const noteStepInLoop = ((note.step - loopStart) % loopLength + loopLength) % loopLength;
      const adjustedStep = loopStart + noteStepInLoop;
      const noteTime = adjustedStep * stepDuration - currentTime;

      if (noteTime >= -0.01 && noteTime < stepDuration * 4) {
        this.playNote(
          track.id,
          track.instrument,
          note.pitch,
          note.velocity,
          Math.max(0, noteTime),
          note.duration,
          track.transpose,
          track.speedMultiplier
        );
      }
    });
  }

  public setLevelCallback(callback: (levels: LevelData[]) => void): void {
    this.levelCallbacks = callback;
  }

  private startLevelMonitoring(): void {
    const updateLevels = () => {
      if (!this.levelCallbacks || !this.audioContext) return;

      const levels: LevelData[] = [];
      this.trackNodes.forEach((nodes, trackId) => {
        const dataArray = new Uint8Array(nodes.analyser.frequencyBinCount);
        nodes.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        levels.push({ trackId, level: average / 255 });
      });

      this.levelCallbacks(levels);
      this.animationFrameId = requestAnimationFrame(updateLevels);
    };

    this.animationFrameId = requestAnimationFrame(updateLevels);
  }

  public stop(): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    this.trackNodes.forEach(nodes => {
      try {
        nodes.preGain.gain.cancelScheduledValues(now);
        nodes.preGain.gain.setValueAtTime(nodes.preGain.gain.value, now);
        nodes.preGain.gain.linearRampToValueAtTime(0, now + 0.05);
        setTimeout(() => {
          if (this.audioContext) {
            const restoreTime = this.audioContext.currentTime;
            nodes.preGain.gain.setValueAtTime(1, restoreTime);
          }
        }, 100);
      } catch (e) { /* ignore */ }
    });
  }

  public resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.stop();
    this.trackNodes.forEach((nodes) => {
      try {
        nodes.preGain.disconnect();
        nodes.volumeGain.disconnect();
        nodes.panNode.disconnect();
        nodes.analyser.disconnect();
        nodes.drySend.disconnect();
        nodes.reverbSend.disconnect();
        nodes.delaySend.disconnect();
        nodes.chorusSend.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.trackNodes.clear();
    try {
      if (this.masterGain) this.masterGain.disconnect();
      if (this.masterAnalyser) this.masterAnalyser.disconnect();
      if (this.masterReverb) this.masterReverb.disconnect();
      if (this.masterReverbWet) this.masterReverbWet.disconnect();
      if (this.masterDelay) this.masterDelay.disconnect();
      if (this.masterDelayFeedback) this.masterDelayFeedback.disconnect();
      if (this.masterDelayWet) this.masterDelayWet.disconnect();
    } catch (e) { /* ignore */ }
    if (this.audioContext) this.audioContext.close();
    AudioEngine.instance = null;
  }
}

function endTimeSafe(time: number): number {
  return Math.max(time, time + 0.001);
}

export const audioEngine = AudioEngine.getInstance();
export type { EffectType };
