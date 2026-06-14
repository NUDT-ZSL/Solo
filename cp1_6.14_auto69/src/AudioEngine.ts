import type { InstrumentType, Track, Note, LevelData, EffectType } from './types';

interface TrackAudioNodes {
  gainNode: GainNode;
  panNode: StereoPannerNode;
  analyser: AnalyserNode;
  reverbNode: ConvolverNode | null;
  delayNode: DelayNode | null;
  chorusGain: GainNode | null;
  chorusDelay: DelayNode | null;
}

class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioContext: AudioContext | null = null;
  private bpm: number = 140;
  private trackNodes: Map<string, TrackAudioNodes> = new Map();
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private levelCallbacks: ((levels: LevelData[]) => void) | null = null;
  private animationFrameId: number | null = null;
  private scheduledNotes: Map<string, { stop: () => void }> = new Map();
  private reverbBuffer: AudioBuffer | null = null;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterAnalyser = this.audioContext.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.audioContext.destination);

    this.reverbBuffer = await this.createReverbImpulse();
    this.startLevelMonitoring();
  }

  private async createReverbImpulse(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext!.sampleRate;
    const length = sampleRate * 2;
    const impulse = this.audioContext!.createBuffer(2, length, sampleRate);
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2);
      leftChannel[i] = (Math.random() * 2 - 1) * decay;
      rightChannel[i] = (Math.random() * 2 - 1) * decay;
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

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = track.volume / 100;

    const panNode = this.audioContext.createStereoPanner();
    panNode.pan.value = track.mixer.pan;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;

    gainNode.connect(panNode);
    panNode.connect(analyser);
    analyser.connect(this.masterGain!);

    this.trackNodes.set(track.id, {
      gainNode,
      panNode,
      analyser,
      reverbNode: null,
      delayNode: null,
      chorusGain: null,
      chorusDelay: null,
    });

    this.updateTrackEffects(track);
  }

  public updateTrackVolume(trackId: string, volume: number, muted: boolean): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.gainNode.gain.value = muted ? 0 : volume / 100;
    }
  }

  public updateTrackPan(trackId: string, pan: number): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.panNode.pan.value = pan;
    }
  }

  public updateTrackEffects(track: Track): void {
    const nodes = this.trackNodes.get(track.id);
    if (!nodes || !this.audioContext) return;

    this.disconnectEffects(nodes);

    let currentOutput: AudioNode = nodes.analyser;

    for (const effect of track.effects) {
      if (!effect.enabled) continue;

      if (effect.type === 'reverb' && this.reverbBuffer) {
        const reverb = this.audioContext.createConvolver();
        reverb.buffer = this.reverbBuffer;
        const wetGain = this.audioContext.createGain();
        wetGain.gain.value = effect.params.wet || 0.3;
        const dryGain = this.audioContext.createGain();
        dryGain.gain.value = 1 - (effect.params.wet || 0.3);

        currentOutput.connect(reverb);
        reverb.connect(wetGain);
        wetGain.connect(this.masterGain!);
        currentOutput.connect(dryGain);
        dryGain.connect(this.masterGain!);

        nodes.reverbNode = reverb;
      } else if (effect.type === 'delay') {
        const delay = this.audioContext.createDelay(5.0);
        delay.delayTime.value = effect.params.time || 0.3;
        const feedback = this.audioContext.createGain();
        feedback.gain.value = effect.params.feedback || 0.4;
        const wetGain = this.audioContext.createGain();
        wetGain.gain.value = effect.params.wet || 0.3;

        currentOutput.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        wetGain.connect(this.masterGain!);

        nodes.delayNode = delay;
      } else if (effect.type === 'chorus') {
        const chorusDelay = this.audioContext.createDelay(0.05);
        chorusDelay.delayTime.value = effect.params.delay || 0.015;
        const chorusGain = this.audioContext.createGain();
        chorusGain.gain.value = effect.params.wet || 0.3;

        currentOutput.connect(chorusDelay);
        chorusDelay.connect(chorusGain);
        chorusGain.connect(this.masterGain!);

        nodes.chorusDelay = chorusDelay;
        nodes.chorusGain = chorusGain;
      }
    }

    if (currentOutput === nodes.analyser) {
      currentOutput.connect(this.masterGain!);
    }
  }

  private disconnectEffects(nodes: TrackAudioNodes): void {
    try {
      nodes.analyser.disconnect();
      if (nodes.reverbNode) nodes.reverbNode.disconnect();
      if (nodes.delayNode) nodes.delayNode.disconnect();
      if (nodes.chorusGain) nodes.chorusGain.disconnect();
      if (nodes.chorusDelay) nodes.chorusDelay.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
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
    const actualDuration = duration / speedMultiplier;
    const frequency = 440 * Math.pow(2, (actualPitch - 69) / 12);

    const noteId = `${trackId}-${pitch}-${startTime}`;

    if (this.scheduledNotes.has(noteId)) {
      this.scheduledNotes.get(noteId)!.stop();
    }

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    const createOscillator = (type: OscillatorType, freq: number, gainValue: number): { osc: OscillatorNode; gain: GainNode } => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = gainValue * (velocity / 127);
      osc.connect(gain);
      gain.connect(nodes.gainNode);
      return { osc, gain };
    };

    if (instrument === 'piano') {
      const { osc, gain } = createOscillator('triangle', frequency, 0.6);
      oscillators.push(osc);
      gains.push(gain);

      const { osc: osc2, gain: gain2 } = createOscillator('sine', frequency * 2, 0.2);
      oscillators.push(osc2);
      gains.push(gain2);
    } else if (instrument === 'bass') {
      const { osc, gain } = createOscillator('sawtooth', frequency * 0.5, 0.7);
      oscillators.push(osc);
      gains.push(gain);

      const { osc: osc2, gain: gain2 } = createOscillator('sine', frequency, 0.3);
      oscillators.push(osc2);
      gains.push(gain2);
    } else if (instrument === 'drums') {
      if (pitch % 12 === 0) {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
        gain.gain.setValueAtTime(velocity / 127, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.connect(gain);
        gain.connect(nodes.gainNode);
        oscillators.push(osc);
        gains.push(gain);
      } else if (pitch % 12 === 2) {
        const bufferSize = this.audioContext!.sampleRate * 0.2;
        const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const noise = this.audioContext!.createBufferSource();
        noise.buffer = buffer;
        const gain = this.audioContext!.createGain();
        gain.gain.value = velocity / 127 * 0.5;
        noise.connect(gain);
        gain.connect(nodes.gainNode);
        noise.start(startTime);
        noise.stop(startTime + 0.2);

        const stopNoise = () => {
          try { noise.stop(); } catch (e) { /* ignore */ }
        };
        this.scheduledNotes.set(noteId, { stop: stopNoise });
        return;
      } else {
        const { osc, gain } = createOscillator('square', frequency, 0.4);
        oscillators.push(osc);
        gains.push(gain);
      }
    }

    const actualStart = this.audioContext.currentTime + startTime;
    const noteDuration = actualDuration * this.getStepDuration();

    gains.forEach((gain, i) => {
      gain.gain.setValueAtTime(0, actualStart);
      gain.gain.linearRampToValueAtTime(gain.gain.value, actualStart + 0.01);
      gain.gain.setValueAtTime(gain.gain.value, actualStart + noteDuration * 0.9);
      gain.gain.exponentialRampToValueAtTime(0.001, actualStart + noteDuration);
    });

    oscillators.forEach(osc => {
      osc.start(actualStart);
      osc.stop(actualStart + noteDuration + 0.1);
    });

    const stopAll = () => {
      oscillators.forEach(osc => {
        try { osc.stop(); } catch (e) { /* ignore */ }
      });
    };

    this.scheduledNotes.set(noteId, { stop: stopAll });

    setTimeout(() => {
      this.scheduledNotes.delete(noteId);
    }, (actualStart + noteDuration + 0.2 - this.audioContext.currentTime) * 1000);
  }

  public scheduleNotes(notes: Note[], tracks: Track[], loopStart: number, loopEnd: number, currentTime: number): void {
    const stepDuration = this.getStepDuration();
    const loopLength = loopEnd - loopStart;

    const hasSolo = tracks.some(t => t.solo);

    notes.forEach(note => {
      const track = tracks.find(t => t.id === note.trackId);
      if (!track || track.muted) return;
      if (hasSolo && !track.solo) return;

      const adjustedStep = loopStart + ((note.step - loopStart) % loopLength + loopLength) % loopLength;
      const noteTime = adjustedStep * stepDuration - currentTime;

      if (noteTime >= 0 && noteTime < stepDuration * 2) {
        this.playNote(
          track.id,
          track.instrument,
          note.pitch,
          note.velocity,
          noteTime,
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
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        levels.push({ trackId, level: average / 255 });
      });

      this.levelCallbacks(levels);
      this.animationFrameId = requestAnimationFrame(updateLevels);
    };

    this.animationFrameId = requestAnimationFrame(updateLevels);
  }

  public stop(): void {
    this.scheduledNotes.forEach(note => note.stop());
    this.scheduledNotes.clear();
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
      this.disconnectEffects(nodes);
      try {
        nodes.gainNode.disconnect();
        nodes.panNode.disconnect();
        nodes.analyser.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.trackNodes.clear();
    if (this.masterGain) this.masterGain.disconnect();
    if (this.masterAnalyser) this.masterAnalyser.disconnect();
    if (this.audioContext) this.audioContext.close();
    AudioEngine.instance = null;
  }
}

export const audioEngine = AudioEngine.getInstance();
export type { EffectType };
