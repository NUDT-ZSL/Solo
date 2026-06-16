import { audioGenerators } from '../samples/generateAudio';

export interface TrackState {
  id: string;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  playing: boolean;
  effectEnabled: boolean;
}

export interface AudioTrack {
  state: TrackState;
  buffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  panNode: StereoPannerNode | null;
  muteGainNode: GainNode | null;
  analyserNode: AnalyserNode | null;
  startOffset: number;
  startTime: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private tracks: Map<string, AudioTrack> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    this.audioContext = new AudioContext({
      sampleRate: 44100,
      latencyHint: 'interactive'
    });

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;

    this.masterAnalyser = this.audioContext.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.3;

    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.audioContext.destination);

    const sampleRate = this.audioContext.sampleRate;
    const duration = 8;

    for (const gen of audioGenerators) {
      const buffer = gen.generator(sampleRate, duration);

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.7;

      const panNode = this.audioContext.createStereoPanner();
      panNode.pan.setValueAtTime(0, this.audioContext.currentTime);

      const muteGainNode = this.audioContext.createGain();
      muteGainNode.gain.value = 1;

      const analyserNode = this.audioContext.createAnalyser();
      analyserNode.fftSize = 256;

      gainNode.connect(panNode);
      panNode.connect(muteGainNode);
      muteGainNode.connect(analyserNode);
      analyserNode.connect(this.masterGain);

      const track: AudioTrack = {
        state: {
          id: gen.id,
          name: gen.name,
          volume: 0.7,
          pan: 0,
          muted: false,
          solo: false,
          playing: false,
          effectEnabled: true
        },
        buffer,
        sourceNode: null,
        gainNode,
        panNode,
        muteGainNode,
        analyserNode,
        startOffset: 0,
        startTime: 0
      };

      this.tracks.set(gen.id, track);
    }

    this.initialized = true;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getTracks(): AudioTrack[] {
    return Array.from(this.tracks.values());
  }

  getTrack(id: string): AudioTrack | undefined {
    return this.tracks.get(id);
  }

  getMasterAnalyser(): AnalyserNode | null {
    return this.masterAnalyser;
  }

  getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 0;
  }

  setMasterVolume(value: number): void {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(value, this.audioContext.currentTime);
    }
  }

  setVolume(trackId: string, value: number): void {
    const track = this.tracks.get(trackId);
    if (track?.gainNode && this.audioContext) {
      track.gainNode.gain.setValueAtTime(value, this.audioContext.currentTime);
      track.state.volume = value;
    }
  }

  setPan(trackId: string, value: number): void {
    const track = this.tracks.get(trackId);
    if (track?.panNode && this.audioContext) {
      const clampedValue = Math.max(-1, Math.min(1, value));
      track.panNode.pan.setValueAtTime(clampedValue, this.audioContext.currentTime);
      track.state.pan = clampedValue;
    }
  }

  setMuted(trackId: string, muted: boolean): void {
    const track = this.tracks.get(trackId);
    if (track?.muteGainNode && this.audioContext) {
      track.muteGainNode.gain.setValueAtTime(muted ? 0 : 1, this.audioContext.currentTime);
      track.state.muted = muted;
      this.updateSoloMuteState();
    }
  }

  setSolo(trackId: string, solo: boolean): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.state.solo = solo;
      this.updateSoloMuteState();
    }
  }

  setEffectEnabled(trackId: string, enabled: boolean): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.state.effectEnabled = enabled;
    }
  }

  private updateSoloMuteState(): void {
    if (!this.audioContext) return;

    const hasSolo = Array.from(this.tracks.values()).some(t => t.state.solo);

    for (const track of this.tracks.values()) {
      if (!track.muteGainNode) continue;

      let gain = 1;
      if (track.state.muted) {
        gain = 0;
      } else if (hasSolo && !track.state.solo) {
        gain = 0;
      }

      track.muteGainNode.gain.setValueAtTime(gain, this.audioContext.currentTime);
    }
  }

  async startTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track?.buffer || !this.audioContext) return;

    if (track.state.playing) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = track.buffer;
    source.loop = true;

    source.connect(track.gainNode!);

    track.startTime = this.audioContext.currentTime;
    source.start(0, track.startOffset % track.buffer.duration);

    track.sourceNode = source;
    track.state.playing = true;

    source.onended = () => {
      if (track.sourceNode === source) {
        track.sourceNode = null;
        track.state.playing = false;
      }
    };
  }

  stopTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track?.sourceNode || !this.audioContext) return;

    track.startOffset = (this.audioContext.currentTime - track.startTime) % (track.buffer?.duration ?? 0);
    if (track.startOffset < 0) track.startOffset = 0;

    try {
      track.sourceNode.stop();
      track.sourceNode.disconnect();
    } catch (e) {
      // ignore
    }

    track.sourceNode = null;
    track.state.playing = false;
  }

  toggleTrack(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return Promise.resolve();

    if (track.state.playing) {
      this.stopTrack(trackId);
      return Promise.resolve();
    } else {
      return this.startTrack(trackId);
    }
  }

  stopAll(): void {
    for (const trackId of this.tracks.keys()) {
      this.stopTrack(trackId);
    }
  }

  getMasterLevelData(): Uint8Array {
    if (!this.masterAnalyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  dispose(): void {
    this.stopAll();
    for (const track of this.tracks.values()) {
      track.gainNode?.disconnect();
      track.panNode?.disconnect();
      track.muteGainNode?.disconnect();
      track.analyserNode?.disconnect();
    }
    this.masterGain?.disconnect();
    this.masterAnalyser?.disconnect();
    this.audioContext?.close();
    this.tracks.clear();
    this.initialized = false;
  }
}
