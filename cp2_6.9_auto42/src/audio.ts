let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function noteToFrequency(note: string): number {
  const notes: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return 440;
  const semitone = notes[match[1]];
  const octave = parseInt(match[2]);
  return 440 * Math.pow(2, (octave - 4) + (semitone - 9) / 12);
}

function radiusToMidiNote(radius: number): number {
  const minR = 3;
  const maxR = 60;
  const clamped = Math.max(minR, Math.min(maxR, radius));
  const t = (clamped - minR) / (maxR - minR);
  const minMidi = 48;
  const maxMidi = 72;
  return Math.round(minMidi + t * (maxMidi - minMidi));
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playBounceSound(radius: number): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = midiToFrequency(radiusToMidiNote(radius));
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playChord(radius: number): void {
  const ctx = getAudioContext();
  const rootMidi = radiusToMidiNote(radius);
  const freqs = [
    midiToFrequency(rootMidi),
    midiToFrequency(rootMidi + 4),
    midiToFrequency(rootMidi + 7)
  ];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12 - i * 0.02, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  });
}

export function playGlide(): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(noteToFrequency('C4'), ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(noteToFrequency('C5'), ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}
