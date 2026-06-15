export interface BeatInfo {
  intensity: number;
  isBeat: boolean;
  bpm: number;
}

type BeatCallback = (beat: BeatInfo) => void;

export class AudioController {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private bpm = 128;
  private beatInterval: number | null = null;
  private lastBeatTime = 0;
  private beatCallback: BeatCallback | null = null;
  private scheduledNotes: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private nextBeatTime = 0;
  private schedulerTimer: number | null = null;
  private beatCount = 0;
  private waveformData: Uint8Array | null = null;

  constructor(bpm = 128) {
    this.bpm = bpm;
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
  }

  onBeat(cb: BeatCallback) {
    this.beatCallback = cb;
  }

  async start() {
    if (this.isPlaying) return;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformData = new Uint8Array(this.analyser.fftSize);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.3;
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.isPlaying = true;
    this.nextBeatTime = this.audioContext.currentTime + 0.05;
    this.beatCount = 0;
    this.scheduleBeats();
  }

  private scheduleBeats() {
    if (!this.audioContext || !this.isPlaying) return;

    const beatDuration = 60 / this.bpm;
    const scheduleAhead = 0.2;

    while (this.nextBeatTime < this.audioContext.currentTime + scheduleAhead) {
      this.scheduleBeatSound(this.nextBeatTime, this.beatCount);
      this.nextBeatTime += beatDuration;
      this.beatCount++;
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduleBeats(), 50);
  }

  private scheduleBeatSound(time: number, beatIndex: number) {
    if (!this.audioContext || !this.gainNode) return;

    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    const isDownbeat = beatIndex % 4 === 0;
    const isOffbeat = beatIndex % 2 === 1;

    if (isDownbeat) {
      osc.type = 'sine';
      osc.frequency.value = 80;
      noteGain.gain.setValueAtTime(0.5, time);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    } else if (isOffbeat) {
      osc.type = 'triangle';
      osc.frequency.value = 220;
      noteGain.gain.setValueAtTime(0.15, time);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    } else {
      osc.type = 'sine';
      osc.frequency.value = 160;
      noteGain.gain.setValueAtTime(0.25, time);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    }

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.2);

    const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    setTimeout(() => {
      if (this.beatCallback) {
        this.beatCallback({
          intensity: isDownbeat ? 1.0 : isOffbeat ? 0.4 : 0.7,
          isBeat: true,
          bpm: this.bpm,
        });
      }
    }, delay);
  }

  getBeatIntensity(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / (this.dataArray.length * 255);
  }

  getWaveform(): Uint8Array {
    if (!this.analyser || !this.waveformData) return new Uint8Array(0);
    this.analyser.getByteTimeDomainData(this.waveformData);
    return this.waveformData;
  }

  playCaptureSound(type: 'high' | 'low' | 'chord') {
    if (!this.audioContext || !this.gainNode) return;

    const freqMap = { high: 880, low: 220, chord: 440 };
    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    if (type === 'chord') {
      const osc2 = this.audioContext.createOscillator();
      const osc3 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      const gain3 = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = 440;
      osc2.type = 'sine';
      osc2.frequency.value = 554;
      osc3.type = 'sine';
      osc3.frequency.value = 659;

      const now = this.audioContext.currentTime;
      noteGain.gain.setValueAtTime(0.3, now);
      noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      gain3.gain.setValueAtTime(0.2, now);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(noteGain).connect(this.gainNode);
      osc2.connect(gain2).connect(this.gainNode);
      osc3.connect(gain3).connect(this.gainNode);

      osc.start(now);
      osc.stop(now + 0.35);
      osc2.start(now);
      osc2.stop(now + 0.35);
      osc3.start(now);
      osc3.stop(now + 0.35);
      return;
    }

    osc.type = type === 'high' ? 'sine' : 'triangle';
    osc.frequency.value = freqMap[type];

    const now = this.audioContext.currentTime;
    noteGain.gain.setValueAtTime(0.3, now);
    noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(noteGain).connect(this.gainNode);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playDamageSound() {
    if (!this.audioContext || !this.gainNode) return;
    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 120;
    const now = this.audioContext.currentTime;
    noteGain.gain.setValueAtTime(0.3, now);
    noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(noteGain).connect(this.gainNode);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    for (const osc of this.scheduledNotes) {
      try { osc.stop(); } catch {}
    }
    this.scheduledNotes = [];
    if (this.source) {
      try { this.source.stop(); } catch {}
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
