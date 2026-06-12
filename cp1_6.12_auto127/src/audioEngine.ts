import * as Tone from 'tone';
import type { Sample, Track, SampleCategory } from './types';
import { CATEGORY_COLORS } from './types';

interface TrackState {
  player?: Tone.Player;
  synth?: Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth;
  gain: Tone.Gain;
  pan: Tone.Panner;
  analyser: Tone.Analyser;
}

class AudioEngine {
  private masterGain: Tone.Gain;
  private masterAnalyser: Tone.Analyser;
  private tracks: Map<string, TrackState> = new Map();
  private samples: Map<string, Sample> = new Map();
  private loop: Tone.Loop | null = null;
  private isPlaying = false;
  private bpm = 120;
  private beatCallback: ((beat: number) => void) | null = null;
  private currentBeat = 0;

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
    const db = Tone.gainToDb(Math.max(0, Math.min(100, volume)) / 100);
    this.masterGain.gain.value = Tone.dbToGain(db);
  }

  setBeatCallback(callback: (beat: number) => void) {
    this.beatCallback = callback;
  }

  private createSynthForSample(sample: Sample): Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth {
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
          }) as unknown as Tone.Synth;
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
        }) as unknown as Tone.Synth;
      default:
        return new Tone.Synth();
    }
  }

  addTrack(track: Track) {
    if (this.tracks.has(track.id)) return;

    const gain = new Tone.Gain(Tone.gainToDb(Math.max(0, Math.min(100, track.volume)) / 100));
    const pan = new Tone.Panner(track.pan / 45);
    const analyser = new Tone.Analyser('waveform', 128);

    gain.connect(pan);
    pan.connect(this.masterGain);
    pan.connect(analyser);

    this.tracks.set(track.id, { gain, pan, analyser });

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
    }
    if (state.player) {
      state.player.disconnect();
      state.player.dispose();
    }

    const synth = this.createSynthForSample(sample);
    synth.connect(state.gain);
    state.synth = synth;
  }

  removeTrack(trackId: string) {
    const state = this.tracks.get(trackId);
    if (state) {
      if (state.synth) {
        state.synth.disconnect();
        state.synth.dispose();
      }
      if (state.player) {
        state.player.disconnect();
        state.player.dispose();
      }
      state.gain.disconnect();
      state.pan.disconnect();
      state.analyser.disconnect();
      state.gain.dispose();
      state.pan.dispose();
      state.analyser.dispose();
      this.tracks.delete(trackId);
    }
  }

  setTrackSample(trackId: string, sampleId: string | null) {
    if (!sampleId) {
      const state = this.tracks.get(trackId);
      if (state && state.synth) {
        state.synth.disconnect();
        state.synth.dispose();
        state.synth = undefined;
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
    if (state) {
      const db = Tone.gainToDb(Math.max(0, Math.min(100, volume)) / 100);
      state.gain.gain.value = Tone.dbToGain(db);
    }
  }

  setTrackPan(trackId: string, pan: number) {
    const state = this.tracks.get(trackId);
    if (state) {
      state.pan.pan.value = Math.max(-1, Math.min(1, pan / 45));
    }
  }

  setTrackMuted(trackId: string, muted: boolean) {
    const state = this.tracks.get(trackId);
    if (state) {
      state.gain.mute = muted;
    }
  }

  updateSoloState(tracks: Track[]) {
    const hasSolo = tracks.some(t => t.solo);
    tracks.forEach(track => {
      const state = this.tracks.get(track.id);
      if (state) {
        if (hasSolo) {
          state.gain.mute = !track.solo || track.muted;
        } else {
          state.gain.mute = track.muted;
        }
      }
    });
  }

  triggerSample(sampleId: string, volume: number = 80) {
    const sample = this.samples.get(sampleId);
    if (!sample) return;

    const now = Tone.now();
    const quarterNote = (60 / this.bpm);
    const currentTimeInBeat = (Tone.Transport.seconds || 0) % quarterNote;
    const threshold = quarterNote * 0.1;
    const triggerTime = currentTimeInBeat < threshold ? now + (threshold - currentTimeInBeat) : now;

    const gain = new Tone.Gain(Tone.gainToDb(Math.max(0, Math.min(100, volume)) / 100));
    gain.connect(this.masterGain);

    const synth = this.createSynthForSample(sample);
    synth.connect(gain);

    const freq = sample.frequency || 440;
    const duration = Math.min(sample.duration, 2);

    if (synth instanceof Tone.MembraneSynth) {
      synth.triggerAttackRelease(freq, duration, triggerTime);
    } else if (synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease(duration, triggerTime);
    } else if (sample.category === 'drum' && (sample.id.includes('snare') || sample.id.includes('clap') || sample.id.includes('drum_2') || sample.id.includes('drum_5'))) {
      (synth as unknown as Tone.NoiseSynth).triggerAttackRelease(duration, triggerTime);
    } else if (synth instanceof Tone.PolySynth) {
      (synth as Tone.PolySynth).triggerAttackRelease([freq, freq * 1.25, freq * 1.5], duration, triggerTime);
    } else {
      (synth as Tone.Synth).triggerAttackRelease(freq, duration, triggerTime);
    }

    setTimeout(() => {
      synth.disconnect();
      synth.dispose();
      gain.disconnect();
      gain.dispose();
    }, (duration + 1) * 1000);
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentBeat = 0;

    Tone.Transport.start();

    const beatDuration = (60 / this.bpm);
    this.loop = new Tone.Loop((time) => {
      Tone.Draw.schedule(() => {
        this.currentBeat = (this.currentBeat + 1) % 16;
        if (this.beatCallback) {
          this.beatCallback(this.currentBeat);
        }
      }, time);
    }, '4n');

    this.loop.start(0);
  }

  pause() {
    this.isPlaying = false;
    Tone.Transport.pause();
    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }
  }

  stop() {
    this.isPlaying = false;
    Tone.Transport.stop();
    this.currentBeat = 0;
    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }
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
    const offline = new Tone.Offline(2, durationSeconds, 44100);
    const offlineSamples = this.samples;
    const tracksCopy = Array.from(this.tracks.entries());

    const render = async (): Promise<AudioBuffer> => {
      return new Promise((resolve) => {
        const progressInterval = setInterval(() => {
          onProgress(Math.min(90, (offline as any).progress ? (offline as any).progress * 90 : 50));
        }, 100);

        Tone.Offline(() => {
          const masterGainOffline = new Tone.Gain(this.masterGain.gain.value).toDestination();
          
          const totalSteps = Math.ceil(durationSeconds / (60 / this.bpm));
          
          tracksCopy.forEach(([trackId, state]) => {
            // Track configuration will be recreated in offline context
          });
          
          return Promise.resolve();
        }, 2, durationSeconds, 44100).then((buffer) => {
          clearInterval(progressInterval);
          onProgress(100);
          resolve(buffer);
        });
      });
    };

    // Generate a simple mixed tone buffer as fallback export
    const sampleRate = 44100;
    const numChannels = 2;
    const numSamples = Math.floor(durationSeconds * sampleRate);
    const audioBuffer = Tone.getContext().createBuffer(numChannels, numSamples, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        let activeTracks = 0;

        tracksCopy.forEach(([trackId, state]) => {
          const trackConfig = (window as any).__trackConfigs?.[trackId];
          if (trackConfig && trackConfig.sampleId) {
            activeTracks++;
            const freq = offlineSamples.get(trackConfig.sampleId)?.frequency || 440;
            const beatDur = 60 / this.bpm;
            const beatPos = (t % beatDur) / beatDur;
            const envelope = Math.exp(-beatPos * 8);
            const vol = (trackConfig.volume || 80) / 100;
            sample += Math.sin(2 * Math.PI * freq * t) * envelope * vol * 0.15;
          }
        });

        if (activeTracks === 0) {
          sample = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-(t % (60 / this.bpm)) * 6) * 0.1;
        }

        channelData[i] = Math.max(-1, Math.min(1, sample));

        if (i % Math.floor(numSamples / 10) === 0) {
          onProgress(Math.floor((i / numSamples) * 100));
        }
      }
    }

    onProgress(100);

    const wavBuffer = this.audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
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
    view.setUint16(20, format, true);
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
