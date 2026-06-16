export function generateDrumsLoop(sampleRate: number, duration: number): AudioBuffer {
  const length = Math.floor(sampleRate * duration);
  const buffer = new AudioBuffer({ length, sampleRate, numberOfChannels: 2 });
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 120;
  const beatLength = (60 / bpm) * sampleRate;
  const barLength = beatLength * 4;

  for (let i = 0; i < length; i++) {
    const posInBar = i % barLength;
    const beat = Math.floor(posInBar / beatLength);
    const posInBeat = posInBar % beatLength;

    let sample = 0;

    if (beat === 0 || beat === 2) {
      const kickEnv = Math.exp(-posInBeat / (sampleRate * 0.15));
      const kickFreq = 60 + 80 * Math.exp(-posInBeat / (sampleRate * 0.05));
      sample += Math.sin(2 * Math.PI * kickFreq * (i / sampleRate)) * kickEnv * 0.8;
    }

    if (beat === 1 || beat === 3) {
      const snareEnv = Math.exp(-posInBeat / (sampleRate * 0.2));
      const noise = (Math.random() * 2 - 1) * snareEnv * 0.6;
      const snareTone = Math.sin(2 * Math.PI * 200 * (i / sampleRate)) * snareEnv * 0.3;
      sample += noise + snareTone;
    }

    const hihatPos = posInBar % (beatLength / 2);
    if (hihatPos < sampleRate * 0.05) {
      const hihatEnv = Math.exp(-hihatPos / (sampleRate * 0.03));
      const hihatNoise = (Math.random() * 2 - 1) * hihatEnv * 0.3;
      sample += hihatNoise;
    }

    left[i] = Math.max(-1, Math.min(1, sample));
    right[i] = Math.max(-1, Math.min(1, sample));
  }

  return buffer;
}

export function generateBassLoop(sampleRate: number, duration: number): AudioBuffer {
  const length = Math.floor(sampleRate * duration);
  const buffer = new AudioBuffer({ length, sampleRate, numberOfChannels: 2 });
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const notes = [55, 55, 73.42, 65.41, 55, 55, 73.42, 65.41];
  const bpm = 120;
  const beatLength = (60 / bpm) * sampleRate;
  const noteLength = beatLength;

  for (let i = 0; i < length; i++) {
    const noteIndex = Math.floor(i / noteLength) % notes.length;
    const freq = notes[noteIndex];
    const posInNote = i % noteLength;

    const env = Math.exp(-posInNote / (sampleRate * 0.3)) * 0.6;
    const wave1 = Math.sin(2 * Math.PI * freq * (i / sampleRate));
    const wave2 = Math.sin(2 * Math.PI * freq * 2 * (i / sampleRate)) * 0.3;
    const wave3 = Math.sin(2 * Math.PI * freq * 3 * (i / sampleRate)) * 0.1;

    const sample = (wave1 + wave2 + wave3) * env * 0.7;

    left[i] = Math.max(-1, Math.min(1, sample));
    right[i] = Math.max(-1, Math.min(1, sample));
  }

  return buffer;
}

export function generateKeysLoop(sampleRate: number, duration: number): AudioBuffer {
  const length = Math.floor(sampleRate * duration);
  const buffer = new AudioBuffer({ length, sampleRate, numberOfChannels: 2 });
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const chord = [261.63, 329.63, 392.0, 523.25];
  const bpm = 120;
  const beatLength = (60 / bpm) * sampleRate;
  const barLength = beatLength * 4;

  for (let i = 0; i < length; i++) {
    const posInBar = i % barLength;
    const beat = Math.floor(posInBar / beatLength);
    const posInBeat = posInBar % beatLength;

    const env = Math.exp(-posInBeat / (sampleRate * 0.8)) * 0.5;

    let sample = 0;
    for (let n = 0; n < chord.length; n++) {
      const freq = chord[n];
      const detune = Math.sin(2 * Math.PI * 3 * (i / sampleRate)) * 2;
      sample += Math.sin(2 * Math.PI * (freq + detune) * (i / sampleRate)) * 0.2;
      sample += Math.sin(2 * Math.PI * freq * 2 * (i / sampleRate)) * 0.05;
    }

    if (beat === 0) {
      sample *= 1.2;
    }

    sample *= env;

    const chorus = Math.sin(2 * Math.PI * (261.63 + 5) * (i / sampleRate)) * 0.1;
    sample += chorus;

    left[i] = Math.max(-1, Math.min(1, sample));
    right[i] = Math.max(-1, Math.min(1, sample));
  }

  return buffer;
}

export function generateStringsLoop(sampleRate: number, duration: number): AudioBuffer {
  const length = Math.floor(sampleRate * duration);
  const buffer = new AudioBuffer({ length, sampleRate, numberOfChannels: 2 });
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 120;
  const beatLength = (60 / bpm) * sampleRate;
  const barLength = beatLength * 4;

  const chordProgression = [
    [293.66, 369.99, 440.0],
    [261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63],
    [220.0, 277.18, 329.63]
  ];

  for (let i = 0; i < length; i++) {
    const barIndex = Math.floor(i / barLength) % chordProgression.length;
    const chord = chordProgression[barIndex];
    const posInBar = i % barLength;

    const attack = 0.1 * sampleRate;
    const release = 0.3 * sampleRate;
    let env: number;

    if (posInBar < attack) {
      env = posInBar / attack;
    } else if (posInBar > barLength - release) {
      env = (barLength - posInBar) / release;
    } else {
      env = 1;
    }
    env *= 0.4;

    let sample = 0;
    for (let n = 0; n < chord.length; n++) {
      const freq = chord[n];
      const vibrato = Math.sin(2 * Math.PI * 5 * (i / sampleRate)) * 3;
      const wave = Math.sin(2 * Math.PI * (freq + vibrato) * (i / sampleRate));
      const harmonic = Math.sin(2 * Math.PI * freq * 2 * (i / sampleRate)) * 0.15;
      sample += (wave + harmonic) * (0.35 / chord.length);
    }

    const lfo = Math.sin(2 * Math.PI * 0.5 * (i / sampleRate)) * 0.05;
    sample *= (1 + lfo);

    const width = 0.3;
    left[i] = Math.max(-1, Math.min(1, sample * env * (1 - width)));
    right[i] = Math.max(-1, Math.min(1, sample * env * (1 + width)));
  }

  return buffer;
}

export interface GeneratedAudio {
  id: string;
  name: string;
  generator: (sr: number, dur: number) => AudioBuffer;
}

export const audioGenerators: GeneratedAudio[] = [
  { id: 'drums', name: '鼓', generator: generateDrumsLoop },
  { id: 'bass', name: '贝斯', generator: generateBassLoop },
  { id: 'keys', name: '键盘', generator: generateKeysLoop },
  { id: 'strings', name: '弦乐', generator: generateStringsLoop }
];
