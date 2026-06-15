import * as Tone from 'tone';
import type { Sample, Track } from './types';

interface TrackState {
  synth: Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth | Tone.PolySynth | Tone.NoiseSynth | null;
  gain: Tone.Gain;
  panner: Tone.Panner;
  analyser: Tone.Analyser;
  loop: Tone.Loop | null;
}

interface TrackConfigForExport {
  sampleId: string | null;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

class AudioEngine {
  private masterGain: Tone.Gain;
  private masterAnalyser: Tone.Analyser;
  private tracks: Map<string, TrackState> = new Map();
  private trackConfigs: Map<string, TrackConfigForExport> = new Map();
  private samples: Map<string, Sample> = new Map();
  private beatLoop: Tone.Loop | null = null;
  private isPlaying = false;
  private bpm = 120;
  private beatCallback: ((beat: number) => void) | null = null;
  private currentBeat = 0;
  private barLength = 4;

  constructor() {
    this.masterGain = new Tone.Gain(0.8).toDestination();
    this.masterAnalyser = new Tone.Analyser('waveform', 256);
    this.masterGain.connect(this.masterAnalyser);
  }

  setSamples(samples: Sample[]) {
    this.samples.clear();
    samples.forEach(s => this.samples.set(s.id, s));
  }

  getSample(id: string): Sample | undefined {
    return this.samples.get(id);
  }

  async start() {
    await Tone.start();
    Tone.Transport.bpm.value = this.bpm;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  getBpm(): number {
    return this.bpm;
  }

  setMasterVolume(volume: number) {
    const linearVol = Math.max(0, Math.min(100, volume)) / 100;
    this.masterGain.gain.value = linearVol;
  }

  setBeatCallback(callback: (beat: number) => void) {
    this.beatCallback = callback;
  }

  getLoopDuration(): number {
    return (60 / this.bpm) * this.barLength;
  }

  private degreeToPanPosition(degree: number): number {
    return Math.max(-1, Math.min(1, Math.max(-45, Math.min(45, degree)) / 45));
  }

  private createSynthForSample(sample: Sample): Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth | Tone.PolySynth | Tone.NoiseSynth {
    switch (sample.category) {
      case 'drum':
        if (sample.id.includes('kick') || sample.id.includes('drum_1')) {
          return new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: 'sine' },
            envelope: {
              attack: 0.001,
              decay: 0.4,
              sustain: 0.01,
              release: 1.4,
              attackCurve: 'exponential'
            }
          });
        } else if (sample.id.includes('hat') || sample.id.includes('drum_3') || sample.id.includes('drum_4')) {
          return new Tone.MetalSynth({
            frequency: sample.frequency,
            envelope: {
              attack: 0.001,
              decay: sample.id.includes('Open') ? 0.4 : 0.1,
              release: 0.01
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
          });
        } else if (sample.id.includes('snare') || sample.id.includes('clap') || sample.id.includes('drum_2') || sample.id.includes('drum_5')) {
          return new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
              attack: 0.001,
              decay: 0.2,
              sustain: 0
            }
          });
        } else {
          return new Tone.MembraneSynth({
            pitchDecay: 0.08,
            octaves: 6,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 }
          });
        }
      case 'bass':
        return new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 }
        });
      case 'vocal':
        return new Tone.AMSynth({
          harmonicity: 2.5,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.8 }
        });
      case 'melody':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 1 }
        });
      default:
        return new Tone.Synth();
    }
  }

  private triggerSynth(synth: Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth | Tone.PolySynth | Tone.NoiseSynth, sample: Sample, time: number) {
    const freq = sample.frequency || 440;
    const duration = Math.min(sample.duration, 2);

    if (synth instanceof Tone.MembraneSynth) {
      synth.triggerAttackRelease(freq, duration, time);
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease(duration, time);
    } else if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease(duration, time);
    } else if (synth instanceof Tone.PolySynth) {
      synth.triggerAttackRelease([freq, freq * 1.25, freq * 1.5], duration, time);
    } else {
      synth.triggerAttackRelease(freq, duration, time);
    }
  }

  addTrack(track: Track) {
    if (this.tracks.has(track.id)) return;

    const linearVol = Math.max(0, Math.min(100, track.volume)) / 100;
    const gain = new Tone.Gain(linearVol);
    const panPos = this.degreeToPanPosition(track.pan);
    const panner = new Tone.Panner(panPos);
    const analyser = new Tone.Analyser('waveform', 128);

    gain.connect(panner);
    panner.connect(this.masterGain);
    panner.connect(analyser);

    this.tracks.set(track.id, {
      synth: null,
      gain,
      panner,
      analyser,
      loop: null
    });

    this.trackConfigs.set(track.id, {
      sampleId: track.sampleId,
      volume: track.volume,
      pan: track.pan,
      muted: track.muted,
      solo: track.muted
    });

    if (track.sampleId) {
      const sample = this.samples.get(track.sampleId);
      if (sample) {
        this.attachSampleToTrack(track.id, sample);
      }
    }
  }

  private attachSampleToTrack(trackId: string, sample: Sample) {
    const state = this.tracks.get(trackId);
    if (!state) return;

    if (state.synth) {
      state.synth.disconnect();
      state.synth.dispose();
      state.synth = null;
    }
    if (state.loop) {
      state.loop.stop();
      state.loop.dispose();
      state.loop = null;
    }

    const synth = this.createSynthForSample(sample);
    synth.connect(state.gain);
    state.synth = synth;

    if (this.isPlaying) {
      this.startTrackLoop(trackId, sample);
    }

    const config = this.trackConfigs.get(trackId);
    if (config) {
      config.sampleId = sample.id;
    }
  }

  private startTrackLoop(trackId: string, sample: Sample) {
    const state = this.tracks.get(trackId);
    if (!state || !state.synth) return;

    const loop = new Tone.Loop((time) => {
      const config = this.trackConfigs.get(trackId);
      if (!config || config.muted) return;
      const hasSolo = Array.from(this.trackConfigs.values()).some(c => c.solo);
      if (hasSolo && !config.solo) return;
      if (state.synth) {
        this.triggerSynth(state.synth, sample, time);
      }
    }, '1n');

    loop.start(0);
    state.loop = loop;
  }

  removeTrack(trackId: string) {
    const state = this.tracks.get(trackId);
    if (state) {
      if (state.synth) {
        state.synth.disconnect();
        state.synth.dispose();
      }
      if (state.loop) {
        state.loop.stop();
        state.loop.dispose();
      }
      state.gain.disconnect();
      state.panner.disconnect();
      state.analyser.disconnect();
      state.gain.dispose();
      state.panner.dispose();
      state.analyser.dispose();
      this.tracks.delete(trackId);
      this.trackConfigs.delete(trackId);
    }
  }

  setTrackSample(trackId: string, sampleId: string | null) {
    const state = this.tracks.get(trackId);
    const config = this.trackConfigs.get(trackId);

    if (config) {
      config.sampleId = sampleId;
    }

    if (!sampleId) {
      if (state) {
        if (state.synth) {
          state.synth.disconnect();
          state.synth.dispose();
          state.synth = null;
        }
        if (state.loop) {
          state.loop.stop();
          state.loop.dispose();
          state.loop = null;
        }
      }
      return;
    }
    const sample = this.samples.get(sampleId);
    if (sample) {
      this.attachSampleToTrack(trackId, sample);
    }
  }

  setTrackVolume(trackId: string, volume: number) {
    const state = this.tracks.get(trackId);
    const config = this.trackConfigs.get(trackId);
    if (config) {
      config.volume = volume;
    }
    if (state) {
      const linearVol = Math.max(0, Math.min(100, volume)) / 100;
      state.gain.gain.value = linearVol;
    }
  }

  setTrackPan(trackId: string, pan: number) {
    const state = this.tracks.get(trackId);
    const config = this.trackConfigs.get(trackId);
    if (config) {
      config.pan = pan;
    }
    if (state) {
      const panPosition = this.degreeToPanPosition(pan);
      state.panner.pan.setValueAtTime(panPosition, Tone.now());
    }
  }

  setTrackMuted(trackId: string, muted: boolean) {
    const state = this.tracks.get(trackId);
    const config = this.trackConfigs.get(trackId);
    if (config) {
      config.muted = muted;
    }
    if (state) {
      state.gain.gain.setValueAtTime(muted ? 0 : (config ? config.volume / 100 : 0.8), Tone.now());
    }
  }

  updateSoloState(tracks: Track[]) {
    const hasSolo = tracks.some(t => t.solo);
    tracks.forEach(track => {
      const state = this.tracks.get(track.id);
      const config = this.trackConfigs.get(track.id);
      if (!state || !config) return;

      if (hasSolo) {
        const shouldBeMuted = !track.solo || track.muted;
        config.muted = track.muted;
        state.gain.gain.setValueAtTime(shouldBeMuted ? 0 : config.volume / 100, Tone.now());
      } else {
        config.muted = track.muted;
        state.gain.gain.setValueAtTime(track.muted ? 0 : config.volume / 100, Tone.now());
      }
    });
  }

  triggerBeatSynced(sampleId: string, volume: number = 80): number {
    const sample = this.samples.get(sampleId);
    if (!sample) return 0;

    const quarterNoteDuration = 60 / this.bpm;
    const transportSeconds = Tone.Transport.seconds;
    const timeSinceLastQuarter = transportSeconds % quarterNoteDuration;
    const timeToNextQuarter = quarterNoteDuration - timeSinceLastQuarter;
    const threshold = quarterNoteDuration * 0.25;

    let triggerDelay = 0;
    if (this.isPlaying && timeSinceLastQuarter > threshold) {
      triggerDelay = timeToNextQuarter;
    }

    const triggerTime = Tone.now() + triggerDelay;

    const gain = new Tone.Gain(Math.max(0, Math.min(100, volume)) / 100);
    gain.connect(this.masterGain);

    const synth = this.createSynthForSample(sample);
    synth.connect(gain);

    this.triggerSynth(synth, sample, triggerTime);

    const cleanupDelay = (sample.duration + 1 + triggerDelay) * 1000;
    setTimeout(() => {
      synth.disconnect();
      synth.dispose();
      gain.disconnect();
      gain.dispose();
    }, cleanupDelay);

    return triggerDelay;
  }

  triggerSample(sampleId: string, volume: number = 80) {
    this.triggerBeatSynced(sampleId, volume);
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentBeat = 0;

    Tone.Transport.start();

    this.beatLoop = new Tone.Loop((time) => {
      Tone.Draw.schedule(() => {
        this.currentBeat = (this.currentBeat + 1) % 16;
        if (this.beatCallback) {
          this.beatCallback(this.currentBeat);
        }
      }, time);
    }, '4n');

    this.beatLoop.start(0);

    this.tracks.forEach((state, trackId) => {
      if (state.synth && !state.loop) {
        const config = this.trackConfigs.get(trackId);
        if (config && config.sampleId) {
          const sample = this.samples.get(config.sampleId);
          if (sample) {
            this.startTrackLoop(trackId, sample);
          }
        }
      }
    });
  }

  pause() {
    this.isPlaying = false;
    Tone.Transport.pause();
    if (this.beatLoop) {
      this.beatLoop.stop();
      this.beatLoop.dispose();
      this.beatLoop = null;
    }
    this.tracks.forEach((state) => {
      if (state.loop) {
        state.loop.stop();
        state.loop.dispose();
        state.loop = null;
      }
    });
  }

  stop() {
    this.isPlaying = false;
    Tone.Transport.stop();
    this.currentBeat = 0;
    if (this.beatLoop) {
      this.beatLoop.stop();
      this.beatLoop.dispose();
      this.beatLoop = null;
    }
    this.tracks.forEach((state) => {
      if (state.loop) {
        state.loop.stop();
        state.loop.dispose();
        state.loop = null;
      }
    });
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getTrackAnalyserData(trackId: string): Float32Array {
    const state = this.tracks.get(trackId);
    if (state) {
      return state.analyser.getValue() as Float32Array;
    }
    return new Float32Array(128);
  }

  getMasterAnalyserData(): Float32Array {
    return this.masterAnalyser.getValue() as Float32Array;
  }

  async exportWav(durationSeconds: number, onProgress: (progress: number) => void): Promise<Blob> {
    onProgress(0);

    const sampleRate = 44100;
    const numChannels = 2;
    const numSamples = Math.floor(durationSeconds * sampleRate);
    const quarterNoteDuration = 60 / this.bpm;
    const totalQuarters = Math.ceil(durationSeconds / quarterNoteDuration);

    const activeTracks: Array<{
      sample: Sample;
      volume: number;
      panPosition: number;
    }> = [];

    this.trackConfigs.forEach((config, trackId) => {
      if (!config.sampleId || config.muted) return;
      const hasSolo = Array.from(this.trackConfigs.values()).some(c => c.solo);
      if (hasSolo && !config.solo) return;
      const sample = this.samples.get(config.sampleId);
      if (sample) {
        activeTracks.push({
          sample,
          volume: config.volume / 100,
          panPosition: this.degreeToPanPosition(config.pan)
        });
      }
    });

    const audioBuffer = Tone.getContext().createBuffer(numChannels, numSamples, sampleRate);
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);

    const progressStep = Math.max(1, Math.floor(numSamples / 20));

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let leftSum = 0;
      let rightSum = 0;

      for (const track of activeTracks) {
        const freq = track.sample.frequency || 440;
        const duration = Math.min(track.sample.duration, 2);
        const beatPosInQuarter = t % quarterNoteDuration;
        const beatNumber = Math.floor(t / quarterNoteDuration);
        const envelope = Math.exp(-beatPosInQuarter / duration * 4);
        const baseAmp = Math.sin(2 * Math.PI * freq * t) * envelope * track.volume * 0.12;

        let harmonics = 0;
        if (track.sample.category === 'bass') {
          harmonics = Math.sin(2 * Math.PI * freq * 2 * t) * envelope * track.volume * 0.03;
          harmonics += Math.sin(2 * Math.PI * freq * 3 * t) * envelope * track.volume * 0.01;
        } else if (track.sample.category === 'melody') {
          harmonics = Math.sin(2 * Math.PI * freq * 1.25 * t) * envelope * track.volume * 0.05;
          harmonics += Math.sin(2 * Math.PI * freq * 1.5 * t) * envelope * track.volume * 0.03;
        } else if (track.sample.category === 'drum') {
          const noiseVal = (Math.random() * 2 - 1) * envelope * track.volume * 0.04;
          harmonics = noiseVal;
        } else if (track.sample.category === 'vocal') {
          harmonics = Math.sin(2 * Math.PI * freq * 2.5 * t) * envelope * track.volume * 0.04;
        }

        const amp = baseAmp + harmonics;
        const panLeft = Math.cos((track.panPosition + 1) / 2 * Math.PI / 2);
        const panRight = Math.sin((track.panPosition + 1) / 2 * Math.PI / 2);
        leftSum += amp * panLeft;
        rightSum += amp * panRight;
      }

      leftChannel[i] = Math.max(-1, Math.min(1, leftSum));
      rightChannel[i] = Math.max(-1, Math.min(1, rightSum));

      if (i % progressStep === 0) {
        onProgress(Math.floor((i / numSamples) * 90));
      }
    }

    onProgress(95);

    const wavBuffer = this.audioBufferToWav(audioBuffer);
    onProgress(100);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const samples = buffer.length;
    const dataSize = samples * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < samples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
