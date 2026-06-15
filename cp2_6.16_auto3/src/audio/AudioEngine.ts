import { Note, Chord } from '../store';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ScheduledEvent {
  type: 'note' | 'chord';
  index: number;
  startTime: number;
  duration: number;
  stopNodes?: () => void;
}

class AudioEngineClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduled: ScheduledEvent[] = [];
  private startContextTime: number = 0;
  private startPerfTime: number = 0;
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private onTick: ((beatIndex: number, chordIndex: number) => void) | null = null;

  ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setTickHandler(handler: (beatIndex: number, chordIndex: number) => void) {
    this.onTick = handler;
  }

  private createPianoNote(freq: number, startTime: number, duration: number) {
    if (!this.ctx || !this.masterGain) return () => {};

    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    osc1.connect(gain);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.value = 0.2;
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);

    const attack = 0.01;
    const decay = 0.15;
    const sustain = 0.35;
    const release = 0.25;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.setValueAtTime(sustain, startTime + duration - release);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.start(startTime);
    osc1.stop(startTime + duration + release);
    osc2.start(startTime);
    osc2.stop(startTime + duration + release);

    return () => {
      try {
        const now = this.ctx!.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
        osc1.stop(now + release);
        osc2.stop(now + release);
      } catch (e) {}
    };
  }

  private createChordPad(freqs: number[], startTime: number, duration: number) {
    if (!this.ctx || !this.masterGain) return () => {};

    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    filter.Q.value = 0.5;

    gain.connect(filter);
    filter.connect(this.masterGain);

    const stops: Array<() => void> = [];
    const oscTypes: OscillatorType[] = ['sawtooth', 'triangle'];

    freqs.forEach((freq, i) => {
      oscTypes.forEach((type, j) => {
        const osc = this.ctx!.createOscillator();
        osc.type = type;
        osc.frequency.value = freq * (j === 0 ? 1 : 2);
        const oGain = this.ctx!.createGain();
        oGain.gain.value = 0.13 / freqs.length;
        osc.connect(oGain);
        oGain.connect(gain);

        const attack = 0.06;
        const release = 0.3;

        osc.start(startTime);
        osc.stop(startTime + duration + release);

        stops.push(() => {
          try {
            const now = this.ctx!.currentTime;
            oGain.gain.cancelScheduledValues(now);
            oGain.gain.setValueAtTime(oGain.gain.value, now);
            oGain.gain.exponentialRampToValueAtTime(0.0001, now + release);
            osc.stop(now + release);
          } catch (e) {}
        });
      });
    });

    const attack = 0.08;
    const release = 0.3;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + attack);
    gain.gain.setValueAtTime(0.5, startTime + duration - release);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    return () => stops.forEach((s) => s());
  }

  playChordOnce(chord: Chord) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const freqs = chord.notes.map((n) => midiToFreq(n));
    this.createChordPad(freqs, now, 1.8);
  }

  schedule(notes: Note[], chords: Chord[], bpm: number) {
    const ctx = this.ensureContext();
    this.clearSchedule();

    const beatDuration = 60 / bpm;
    const now = ctx.currentTime + 0.05;
    this.startContextTime = now;
    this.startPerfTime = performance.now();
    this.isRunning = true;

    let beatCursor = 0;
    notes.forEach((note, i) => {
      const startTime = now + beatCursor * beatDuration;
      const duration = note.duration * beatDuration * 0.9;
      const stopNodes = this.createPianoNote(midiToFreq(note.note), startTime, duration);
      this.scheduled.push({
        type: 'note',
        index: i,
        startTime,
        duration: note.duration * beatDuration,
        stopNodes,
      });
      beatCursor += note.duration;
    });

    let chordCursor = 0;
    chords.forEach((chord, i) => {
      const startTime = now + chordCursor * beatDuration;
      const duration = chord.duration * beatDuration;
      const freqs = chord.notes.map((n) => midiToFreq(n));
      const stopNodes = this.createChordPad(freqs, startTime, duration);
      this.scheduled.push({
        type: 'chord',
        index: i,
        startTime,
        duration,
        stopNodes,
      });
      chordCursor += chord.duration;
    });

    const totalBeats = Math.max(beatCursor, chordCursor);
    this.startTickLoop(now, beatDuration, totalBeats, notes, chords);
  }

  private startTickLoop(
    startTime: number,
    beatDuration: number,
    totalBeats: number,
    notes: Note[],
    chords: Chord[],
  ) {
    let lastNoteIdx = -1;
    let lastChordIdx = -1;
    const loop = () => {
      if (!this.isRunning) return;
      const ctx = this.ctx!;
      const now = ctx.currentTime;
      const elapsedBeats = (now - startTime) / beatDuration;

      let noteIdx = -1;
      let cum = 0;
      for (let i = 0; i < notes.length; i++) {
        if (elapsedBeats >= cum && elapsedBeats < cum + notes[i].duration) {
          noteIdx = i;
          break;
        }
        cum += notes[i].duration;
      }
      if (noteIdx !== lastNoteIdx) {
        lastNoteIdx = noteIdx;
      }

      let chordIdx = -1;
      cum = 0;
      for (let i = 0; i < chords.length; i++) {
        if (elapsedBeats >= cum && elapsedBeats < cum + chords[i].duration) {
          chordIdx = i;
          break;
        }
        cum += chords[i].duration;
      }
      if (chordIdx !== lastChordIdx) {
        lastChordIdx = chordIdx;
      }

      if (this.onTick) {
        this.onTick(noteIdx, chordIdx);
      }

      if (elapsedBeats >= totalBeats + 0.5) {
        this.isRunning = false;
        if (this.onTick) this.onTick(-1, -1);
        return;
      }

      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  getCurrentTime(): number {
    if (!this.ctx) return 0;
    return this.ctx.currentTime - this.startContextTime;
  }

  pause() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isRunning = true;
      });
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearSchedule();
  }

  private clearSchedule() {
    this.scheduled.forEach((ev) => {
      if (ev.stopNodes) ev.stopNodes();
    });
    this.scheduled = [];
  }
}

export const AudioEngine = new AudioEngineClass();
