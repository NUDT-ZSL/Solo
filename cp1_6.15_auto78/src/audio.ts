import type { InstrumentCategory } from './data';

export interface AudioPlayer {
  play: () => void;
  stop: () => void;
  isPlaying: () => boolean;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function getNoteFrequency(semitoneOffset: number): number {
  const baseFrequency = 261.63;
  return baseFrequency * Math.pow(2, semitoneOffset / 12);
}

function playPiano(ctx: AudioContext, destination: AudioNode, startTime: number, duration: number, pitch: number): void {
  const frequencies = [pitch, pitch + 12, pitch + 19];
  frequencies.forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = getNoteFrequency(offset);
    const gainValue = 0.3 / (i + 1);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

function playGuitar(ctx: AudioContext, destination: AudioNode, startTime: number, duration: number, pitch: number): void {
  const frequencies = [pitch - 5, pitch, pitch + 7, pitch + 12];
  frequencies.forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = getNoteFrequency(offset);
    filter.type = 'lowpass';
    filter.frequency.value = 2000 + i * 500;
    filter.Q.value = 1;
    const gainValue = 0.2 / (i + 1);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

function playViolin(ctx: AudioContext, destination: AudioNode, startTime: number, duration: number, pitch: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = getNoteFrequency(pitch + 7);
  lfo.type = 'sine';
  lfo.frequency.value = 6;
  lfoGain.gain.value = 3;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.1);
  gain.gain.setValueAtTime(0.25, startTime + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  lfo.start(startTime);
  osc.stop(startTime + duration);
  lfo.stop(startTime + duration);
}

function playDrums(ctx: AudioContext, destination: AudioNode, startTime: number, _duration: number, _pitch: number): void {
  const pattern = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75];
  pattern.forEach((offset, i) => {
    const time = startTime + offset;
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(120, time);
    kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
    kickGain.gain.setValueAtTime(0.4, time);
    kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    kickOsc.connect(kickGain);
    kickGain.connect(destination);
    kickOsc.start(time);
    kickOsc.stop(time + 0.15);

    if (i % 2 === 1) {
      const snareBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const snareData = snareBuffer.getChannelData(0);
      for (let j = 0; j < snareData.length; j++) {
        snareData[j] = (Math.random() * 2 - 1) * (1 - j / snareData.length);
      }
      const snareSource = ctx.createBufferSource();
      const snareGain = ctx.createGain();
      const snareFilter = ctx.createBiquadFilter();
      snareSource.buffer = snareBuffer;
      snareFilter.type = 'highpass';
      snareFilter.frequency.value = 1500;
      snareGain.gain.value = 0.2;
      snareSource.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(destination);
      snareSource.start(time);
    }
  });
}

function playWind(ctx: AudioContext, destination: AudioNode, startTime: number, duration: number, pitch: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = getNoteFrequency(pitch + 12);
  filter.type = 'lowpass';
  filter.frequency.value = 3000;
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  lfoGain.gain.value = 2;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.08);
  gain.gain.setValueAtTime(0.3, startTime + duration * 0.6);
  gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  lfo.start(startTime);
  osc.stop(startTime + duration);
  lfo.stop(startTime + duration);
}

const audioMap: Record<InstrumentCategory, (ctx: AudioContext, dest: AudioNode, start: number, dur: number, pitch: number) => void> = {
  '全部': playPiano,
  '吉他': playGuitar,
  '钢琴': playPiano,
  '小提琴': playViolin,
  '架子鼓': playDrums,
  '管乐器': playWind,
};

export function createInstrumentAudio(category: InstrumentCategory, pitch: number = 0): AudioPlayer {
  let isPlaying = false;
  let activeSources: Array<{ stop: () => void }> = [];

  const play = () => {
    if (isPlaying) return;
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);

    const startTime = ctx.currentTime;
    const duration = 2;

    const playFn = audioMap[category] || playPiano;
    playFn(ctx, masterGain, startTime, duration, pitch);

    const dummyOsc = ctx.createOscillator();
    dummyOsc.frequency.value = 0;
    const dummyGain = ctx.createGain();
    dummyGain.gain.value = 0;
    dummyOsc.connect(dummyGain);
    dummyGain.connect(ctx.destination);
    dummyOsc.start(startTime);
    dummyOsc.stop(startTime + duration);
    activeSources.push(dummyOsc);

    isPlaying = true;

    setTimeout(() => {
      isPlaying = false;
      activeSources = [];
    }, duration * 1000);
  };

  const stop = () => {
    activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // ignore
      }
    });
    activeSources = [];
    isPlaying = false;
  };

  return {
    play,
    stop,
    isPlaying: () => isPlaying,
  };
}
