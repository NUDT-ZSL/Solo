export interface BeatEvent {
  time: number;
  pillarIndex: number;
  duration: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  bpm: number;
  pillarCount: number;
  pattern: number[][];
  duration: number;
}

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '原始之火',
    bpm: 90,
    pillarCount: 4,
    pattern: [[0], [2], [1], [3]],
    duration: 30000,
  },
  {
    id: 2,
    name: '兽骨回响',
    bpm: 110,
    pillarCount: 6,
    pattern: [[0], [3], [1], [4], [2], [5], [0, 3], [1, 4]],
    duration: 35000,
  },
  {
    id: 3,
    name: '风暴祭坛',
    bpm: 130,
    pillarCount: 9,
    pattern: [[0], [4], [8], [2], [6], [0, 4, 8], [1, 5], [3, 7], [0], [2], [4], [6], [8]],
    duration: 40000,
  },
  {
    id: 4,
    name: '神灵降临',
    bpm: 150,
    pillarCount: 9,
    pattern: [
      [0, 4], [2, 6], [1, 7], [3, 5],
      [0, 1, 2], [6, 7, 8], [0, 3, 6], [2, 5, 8],
      [4], [0, 8], [2, 6], [4],
      [0, 2, 6, 8], [1, 3, 5, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8],
    ],
    duration: 45000,
  },
  {
    id: 5,
    name: '永恒鼓韵',
    bpm: 170,
    pillarCount: 9,
    pattern: [
      [0], [1], [2], [5], [8], [7], [6], [3],
      [0, 4, 8], [2, 4, 6], [1, 3, 5, 7],
      [0, 1], [2, 5], [8, 7], [6, 3],
      [4], [0, 2, 6, 8], [4], [1, 3, 5, 7],
      [0, 1, 2, 5, 8, 7, 6, 3],
    ],
    duration: 50000,
  },
];

export function getLevels(): LevelConfig[] {
  return LEVELS;
}

export function getLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function generateBeatSequence(level: LevelConfig): BeatEvent[] {
  const beatInterval = 60000 / level.bpm;
  const events: BeatEvent[] = [];
  const totalBeats = Math.floor(level.duration / beatInterval);
  const beatDuration = beatInterval * 0.4;

  for (let i = 0; i < totalBeats; i++) {
    const patternIndex = i % level.pattern.length;
    const pillars = level.pattern[patternIndex];

    for (const pillarIndex of pillars) {
      if (pillarIndex < level.pillarCount) {
        events.push({
          time: i * beatInterval,
          pillarIndex,
          duration: beatDuration,
        });
      }
    }
  }

  events.sort((a, b) => a.time - b.time);
  return events;
}

export function getPreviewTime(beatInterval: number): number {
  return beatInterval;
}

export function getHitWindow(bpm: number): number {
  const beatInterval = 60000 / bpm;
  return Math.min(beatInterval * 0.3, 200);
}

export function judgeHit(
  currentTime: number,
  beatTime: number,
  hitWindow: number,
  latencyOffset: number
): 'perfect' | 'good' | 'miss' | null {
  const adjustedTime = currentTime + latencyOffset;
  const diff = Math.abs(adjustedTime - beatTime);

  if (diff <= hitWindow * 0.4) return 'perfect';
  if (diff <= hitWindow) return 'good';
  if (diff <= hitWindow * 1.5) return 'miss';
  return null;
}
