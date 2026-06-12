import * as Tone from 'tone';
import type { Sample, Track, SampleCategory } from './types';

interface TrackState {
  synth: Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth | Tone.PolySynth | null;
  gain: Tone.Gain;
  panner: Tone.Panner;
  analyserWaveform: Tone.Analyser;
  analyserFFT: Tone.Analyser;
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
    this.masterAnalyser = new Tone.Analyser('fft', 256);
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

  private createSynthForSample(sample: Sample): Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.AMSynth | Tone.PolySynth {
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
        });
      default:
        return new Tone.Synth();
    }
  }

  private degreeToPanPosition(degree: number): number {
    const normalized = Math.max(-45, Math.min(45, degree)) / 45;
    return normalized;
  }

  addTrack(track: Track) {
    if (this.tracks.has(track.id)) return;

    const linearVol = Math.max(0, Math.min(100, track.volume)) / 100;
    const gain = new Tone.Gain(linearVol);
    const panPos = this.degreeToPanPosition(track.pan);
    const panner = new Tone.Panner(panPos);
    const analyserWaveform = new Tone.Analyser('waveform', 128);
    const analyserFFT = new Tone.Analyser('fft', 64);

    gain.connect(panner);
    panner.connect(this.masterGain);
    panner.connect(analyserWaveform);
    panner.connect(analyserFFT);

    this.tracks.set(track.id, {
      synth: null,
      gain,
      panner,
      analyserWaveform,
      analyserFFT,
      loop: null
    });

    this.trackConfigs.set(track.id, {
      sampleId: track.sampleId,
      volume: track.volume,
      pan: track.pan,
      muted: track.muted,
      solo: track.solo
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

    const freq = sample.frequency || 440;
    const duration = Math.min(sample.duration, 2);

    const loop = new Tone.Loop((time) => {
      const config = this.trackConfigs.get(trackId);
      if (config && !config.muted) {
        const synth = state.synth;
        if (synth instanceof Tone.MembraneSynth) {
          synth.triggerAttackRelease(freq, duration, time);
        } else if (synth instanceof Tone.MetalSynth) {
          synth.triggerAttackRelease(duration, time);
        } else if (sample.category === 'drum' && (sample.id.includes('snare') || sample.id.includes('clap') || sample.id.includes('drum_2') || sample.id.includes('drum_5'))) {
          (synth as unknown as Tone.NoiseSynth).triggerAttackRelease(duration, time);
        } else if (synth instanceof Tone.PolySynth) {
          synth.triggerAttackRelease([freq, freq * 1.25, freq * 1.5], duration, time);
        } else {
          (synth as Tone.Synth).triggerAttackRelease(freq, duration, time);
        }
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
      state.analyserWaveform.disconnect();
      state.analyserFFT.disconnect();
      state.gain.dispose();
      state.panner.dispose();
      state.analyserWaveform.dispose();
      state.analyserFFT.dispose();
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

  setTrackPan(trackId