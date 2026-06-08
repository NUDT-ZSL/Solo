type NoteInfo = {
  frequency: number;
  name: string;
  scale: string;
};

const C_MAJOR_SCALE: Record<string, NoteInfo> = {
  '#FF3B3B': { frequency: 261.63, name: 'C4', scale: 'C大调' },
  '#FF8C3B': { frequency: 293.66, name: 'D4', scale: 'C大调' },
  '#FFD93B': { frequency: 329.63, name: 'E4', scale: 'C大调' },
  '#5BFF3B': { frequency: 349.23, name: 'F4', scale: 'C大调' },
  '#3BFF8C': { frequency: 392.00, name: 'G4', scale: 'C大调' },
  '#3BFFD9': { frequency: 440.00, name: 'A4', scale: 'C大调' },
  '#3B8CFF': { frequency: 493.88, name: 'B4', scale: 'C大调' },
};

const A_MINOR_SCALE: Record<string, NoteInfo> = {
  '#3B3BFF': { frequency: 220.00, name: 'A3', scale: 'A小调' },
  '#8C3BFF': { frequency: 246.94, name: 'B3', scale: 'A小调' },
  '#D93BFF': { frequency: 261.63, name: 'C4', scale: 'A小调' },
  '#FF3BD9': { frequency: 293.66, name: 'D4', scale: 'A小调' },
  '#FF3B8C': { frequency: 329.63, name: 'E4', scale: 'A小调' },
  '#FF3B5B': { frequency: 349.23, name: 'F4', scale: 'A小调' },
  '#D93B3B': { frequency: 392.00, name: 'G4', scale: 'A小调' },
};

const ALL_SCALES = { ...C_MAJOR_SCALE, ...A_MINOR_SCALE };

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type SoundEngineConfig = {
  masterVolume: number;
  fadeDuration: number;
  reverbMix: number;
};

const DEFAULT_CONFIG: SoundEngineConfig = {
  masterVolume: 0.3,
  fadeDuration: 0.15,
  reverbMix: 0.2,
};

export type RecordedEvent = {
  timestamp: number;
  color: string;
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  type: 'start' | 'move' | 'end';
};

class SoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private config: SoundEngineConfig;
  private activeOscillators: Map<string, OscillatorNode> = new Map();
  private isRecording = false;
  private recordedEvents: RecordedEvent[] = [];
  private recordingStartTime = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;

  constructor(config: Partial<SoundEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  init() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();

    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.config.masterVolume;

    this.dryGain = this.audioContext.createGain();
    this.dryGain.gain.value = 1 - this.config.reverbMix;

    this.wetGain = this.audioContext.createGain();
    this.wetGain.gain.value = this.config.reverbMix;

    this.convolver = this.audioContext.createConvolver();
    this.convolver.buffer = this.createReverbImpulse(2, 2);

    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);

    this.dryGain.connect(this.compressor);
    this.wetGain.connect(this.compressor);
    this.compressor.connect(this.audioContext.destination);

    this.recordingDestination = this.audioContext.createMediaStreamDestination();
    this.compressor.connect(this.recordingDestination);
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = this.audioContext!;
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  private getFrequencyFromPosition(
    color: string,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number
  ): { frequency: number; noteInfo: NoteInfo | null } {
    const noteInfo = ALL_SCALES[color.toUpperCase()] || ALL_SCALES[C_MAJOR_SCALE['#FF3B3B'].name] || null;

    if (!noteInfo) {
      const baseFreq = 261.63;
      const xRatio = x / Math.max(canvasWidth, 1);
      const yRatio = 1 - y / Math.max(canvasHeight, 1);
      const octaveShift = Math.floor(yRatio * 2) - 1;
      const detune = (xRatio - 0.5) * 100;
      return {
        frequency: baseFreq * Math.pow(2, octaveShift) * Math.pow(2, detune / 1200),
        noteInfo: { frequency: baseFreq, name: 'C4', scale: 'C大调' },
      };
    }

    const xRatio = x / Math.max(canvasWidth, 1);
    const yRatio = 1 - y / Math.max(canvasHeight, 1);
    const pitchBend = (xRatio - 0.5) * 200;
    const octaveShift = yRatio > 0.75 ? 1 : yRatio < 0.25 ? -1 : 0;

    return {
      frequency: noteInfo.frequency * Math.pow(2, octaveShift) * Math.pow(2, pitchBend / 1200),
      noteInfo,
    };
  }

  private getOscillatorType(color: string): OscillatorType {
    const upper = color.toUpperCase();
    if (C_MAJOR_SCALE[upper]) return 'sine';
    if (A_MINOR_SCALE[upper]) return 'triangle';
    return 'sine';
  }

  playNote(
    color: string,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    strokeId: string
  ): NoteInfo | null {
    this.init();
    if (!this.audioContext || !this.masterGain) return null;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.activeOscillators.has(strokeId)) {
      const existing = this.activeOscillators.get(strokeId)!;
      const { frequency, noteInfo } = this.getFrequencyFromPosition(
        color, x, y, canvasWidth, canvasHeight
      );
      existing.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.05);
      return noteInfo;
    }

    const { frequency, noteInfo } = this.getFrequencyFromPosition(
      color, x, y, canvasWidth, canvasHeight
    );
    const oscType = this.getOscillatorType(color);

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = oscType;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    const noteGain = this.audioContext.createGain();
    noteGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    noteGain.gain.linearRampToValueAtTime(
      this.config.masterVolume,
      this.audioContext.currentTime + this.config.fadeDuration
    );

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000 + (y / Math.max(canvasHeight, 1)) * 3000;
    filter.Q.value = 1;

    oscillator.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    oscillator.start();

    this.activeOscillators.set(strokeId, oscillator);

    (oscillator as any)._noteGain = noteGain;
    (oscillator as any)._filter = filter;

    if (this.isRecording) {
      this.recordedEvents.push({
        timestamp: Date.now() - this.recordingStartTime,
        color,
        x,
        y,
        canvasWidth,
        canvasHeight,
        type: 'start',
      });
    }

    return noteInfo;
  }

  updateNote(
    color: string,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    strokeId: string
  ) {
    if (!this.audioContext) return;

    const oscillator = this.activeOscillators.get(strokeId);
    if (!oscillator) return;

    const { frequency } = this.getFrequencyFromPosition(color, x, y, canvasWidth, canvasHeight);
    oscillator.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.03);

    const filter = (oscillator as any)._filter as BiquadFilterNode | undefined;
    if (filter) {
      filter.frequency.setTargetAtTime(
        2000 + (y / Math.max(canvasHeight, 1)) * 3000,
        this.audioContext.currentTime,
        0.05
      );
    }

    if (this.isRecording) {
      this.recordedEvents.push({
        timestamp: Date.now() - this.recordingStartTime,
        color,
        x,
        y,
        canvasWidth,
        canvasHeight,
        type: 'move',
      });
    }
  }

  stopNote(strokeId: string) {
    const oscillator = this.activeOscillators.get(strokeId);
    if (!oscillator || !this.audioContext) return;

    const noteGain = (oscillator as any)._noteGain as GainNode | undefined;
    if (noteGain) {
      noteGain.gain.setTargetAtTime(0, this.audioContext.currentTime, this.config.fadeDuration);
    }

    setTimeout(() => {
      try {
        oscillator.stop();
        oscillator.disconnect();
        const filter = (oscillator as any)._filter;
        if (filter) filter.disconnect();
        if (noteGain) noteGain.disconnect();
      } catch {}
    }, this.config.fadeDuration * 1000 + 100);

    this.activeOscillators.delete(strokeId);

    if (this.isRecording) {
      this.recordedEvents.push({
        timestamp: Date.now() - this.recordingStartTime,
        color: '',
        x: 0,
        y: 0,
        canvasWidth: 0,
        canvasHeight: 0,
        type: 'end',
      });
    }
  }

  startRecording() {
    this.init();
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.recordedEvents = [];
    this.recordedChunks = [];

    if (this.recordingDestination && this.audioContext) {
      this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start(100);
    }
  }

  stopRecording(): { audioBlob: Blob | null; events: RecordedEvent[] } {
    this.isRecording = false;

    return new Promise<{ audioBlob: Blob | null; events: RecordedEvent[] }>((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob =
            this.recordedChunks.length > 0
              ? new Blob(this.recordedChunks, { type: 'audio/webm' })
              : null;
          resolve({ audioBlob: blob, events: [...this.recordedEvents] });
        };
        this.mediaRecorder.stop();
      } else {
        resolve({ audioBlob: null, events: [...this.recordedEvents] });
      }
    }) as any;
  }

  async stopRecordingAsync(): Promise<{ audioBlob: Blob | null; events: RecordedEvent[] }> {
    this.isRecording = false;

    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob =
            this.recordedChunks.length > 0
              ? new Blob(this.recordedChunks, { type: 'audio/webm' })
              : null;
          resolve({ audioBlob: blob, events: [...this.recordedEvents] });
        };
        this.mediaRecorder.stop();
      } else {
        resolve({ audioBlob: null, events: [...this.recordedEvents] });
      }
    });
  }

  getRecordingEvents(): RecordedEvent[] {
    return [...this.recordedEvents];
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getNoteInfoForColor(color: string): NoteInfo | null {
    return ALL_SCALES[color.toUpperCase()] || null;
  }

  getScaleForColor(color: string): string {
    const upper = color.toUpperCase();
    if (C_MAJOR_SCALE[upper]) return 'C大调';
    if (A_MINOR_SCALE[upper]) return 'A小调';
    return 'C大调';
  }

  setMasterVolume(volume: number) {
    this.config.masterVolume = volume;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(volume, this.audioContext!.currentTime, 0.05);
    }
  }

  destroy() {
    this.activeOscillators.forEach((_, id) => this.stopNote(id));
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const PALETTE_COLORS = [
  '#FF3B3B', '#FF8C3B', '#FFD93B', '#5BFF3B',
  '#3BFF8C', '#3BFFD9', '#3B8CFF', '#3B3BFF',
  '#8C3BFF', '#D93BFF', '#FF3BD9', '#FF3B8C',
];

export { C_MAJOR_SCALE, A_MINOR_SCALE, ALL_SCALES };
export type { NoteInfo };
export default SoundEngine;
