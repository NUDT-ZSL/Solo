export type NoteType = 'conch' | 'coral';

export interface Note {
  id: number;
  time: number;
  lane: number;
  type: NoteType;
  hit: boolean;
  missed: boolean;
  x: number;
  y: number;
  radius: number;
  glowPhase: number;
  color: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  bpm: number;
  duration: number;
  noteDensity: number;
  speedMultiplier: number;
  bgColor1: string;
  bgColor2: string;
  noteColors: string[];
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '深渊低语',
    bpm: 90,
    duration: 45,
    noteDensity: 0.4,
    speedMultiplier: 1.0,
    bgColor1: '#020b1a',
    bgColor2: '#0a1628',
    noteColors: ['#00e5ff', '#00bfa5', '#1de9b6'],
  },
  {
    id: 2,
    name: '暗流涌动',
    bpm: 120,
    duration: 50,
    noteDensity: 0.6,
    speedMultiplier: 1.3,
    bgColor1: '#0a1628',
    bgColor2: '#0d1f3c',
    noteColors: ['#00e5ff', '#76ff03', '#00bfa5'],
  },
  {
    id: 3,
    name: '海沟漩涡',
    bpm: 150,
    duration: 55,
    noteDensity: 0.8,
    speedMultiplier: 1.6,
    bgColor1: '#0d1f3c',
    bgColor2: '#050d1a',
    noteColors: ['#00e5ff', '#ff6d00', '#76ff03'],
  },
  {
    id: 4,
    name: '潮汐终章',
    bpm: 180,
    duration: 60,
    noteDensity: 1.0,
    speedMultiplier: 2.0,
    bgColor1: '#050d1a',
    bgColor2: '#000000',
    noteColors: ['#00e5ff', '#ff6d00', '#f50057', '#76ff03'],
  },
];

const LANE_COUNT = 5;

export class BeatManager {
  private config: LevelConfig;
  private notes: Note[] = [];
  private nextNoteId = 0;
  private beatInterval: number;
  private lastBeatTime = -Infinity;
  private elapsed = 0;
  private spawnedSet = new Set<number>();

  constructor(config: LevelConfig) {
    this.config = config;
    this.beatInterval = 60 / config.bpm;
  }

  reset(config?: LevelConfig): void {
    if (config) this.config = config;
    this.notes = [];
    this.nextNoteId = 0;
    this.beatInterval = 60 / this.config.bpm;
    this.lastBeatTime = -Infinity;
    this.elapsed = 0;
    this.spawnedSet.clear();
  }

  update(dt: number): Note[] {
    this.elapsed += dt;
    const newNotes: Note[] = [];

    const beatIndex = Math.floor(this.elapsed / this.beatInterval);
    if (beatIndex > 0 && !this.spawnedSet.has(beatIndex)) {
      this.spawnedSet.add(beatIndex);
      this.lastBeatTime = beatIndex * this.beatInterval;

      if (Math.random() < this.config.noteDensity) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const type: NoteType = Math.random() > 0.4 ? 'conch' : 'coral';
        const colorIdx = Math.floor(Math.random() * this.config.noteColors.length);

        const note: Note = {
          id: this.nextNoteId++,
          time: this.lastBeatTime,
          lane,
          type,
          hit: false,
          missed: false,
          x: 0,
          y: 0,
          radius: type === 'conch' ? 28 : 22,
          glowPhase: Math.random() * Math.PI * 2,
          color: this.config.noteColors[colorIdx],
        };
        this.notes.push(note);
        newNotes.push(note);
      }

      if (this.config.noteDensity > 0.6 && Math.random() < 0.3) {
        let lane2 = Math.floor(Math.random() * LANE_COUNT);
        const type2: NoteType = 'coral';
        const ci2 = Math.floor(Math.random() * this.config.noteColors.length);

        const note2: Note = {
          id: this.nextNoteId++,
          time: this.lastBeatTime,
          lane: lane2,
          type: type2,
          hit: false,
          missed: false,
          x: 0,
          y: 0,
          radius: 22,
          glowPhase: Math.random() * Math.PI * 2,
          color: this.config.noteColors[ci2],
        };
        this.notes.push(note2);
        newNotes.push(note2);
      }
    }

    return newNotes;
  }

  getActiveNotes(hitWindow: number): Note[] {
    return this.notes.filter(
      (n) => !n.hit && !n.missed && Math.abs(this.elapsed - n.time) < hitWindow
    );
  }

  getAllNotes(): Note[] {
    return this.notes;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getProgress(): number {
    return Math.min(this.elapsed / this.config.duration, 1);
  }

  isLevelComplete(): boolean {
    return this.elapsed >= this.config.duration;
  }

  getLaneX(lane: number, canvasWidth: number): number {
    const margin = 60;
    const usable = canvasWidth - margin * 2;
    const spacing = usable / (LANE_COUNT - 1);
    return margin + lane * spacing;
  }

  getLaneCount(): number {
    return LANE_COUNT;
  }

  getConfig(): LevelConfig {
    return this.config;
  }
}
