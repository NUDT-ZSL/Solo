export interface AudioManagerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  beatTimestamps: number[];
  currentBeatIndex: number;
  isOnBeat: boolean;
  lastBeatTime: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private beatTimestamps: number[] = [];
  private currentBeatIndex: number = 0;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private duration: number = 60;
  private bpm: number = 128;
  private beatInterval: number = 60 / this.bpm;
  private onBeatCallback: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private lastBeatTriggered: number = -1;
  private sourceNodes: AudioScheduledSourceNode[] = [];

  constructor() {}

  public async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);
    this.generateBeatTimestamps();
  }

