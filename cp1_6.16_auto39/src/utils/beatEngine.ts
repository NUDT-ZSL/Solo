export interface StandardBeatPattern {
  id: string;
  name: string;
  beats: number[];
  beatsPerMeasure: number;
  defaultBPM: number;
}

export interface BeatPoint {
  x: number;
  y: number;
  beatIndex: number;
  deviation: number;
}

export interface VisualData {
  standardPoints: BeatPoint[];
  userPoints: BeatPoint[];
  deviations: number[];
  accuracy: number;
}

export interface DeviationResult {
  deviations: number[];
  accuracy: number;
  grade: string;
}

export interface BeatPosition {
  currentBeatIndex: number;
  positionPercent: number;
  beatProgress: number;
}

export const STANDARD_PATTERNS: StandardBeatPattern[] = [
  {
    id: '4/4',
    name: '4/4 拍',
    beats: [0, 500, 1000, 1500],
    beatsPerMeasure: 4,
    defaultBPM: 120,
  },
  {
    id: '3/4',
    name: '3/4 拍',
    beats: [0, 667, 1333],
    beatsPerMeasure: 3,
    defaultBPM: 120,
  },
  {
    id: '6/8',
    name: '6/8 拍',
    beats: [0, 333, 667, 1000, 1333, 1667],
    beatsPerMeasure: 6,
    defaultBPM: 120,
  },
];

export function getStandardBeats(patternId: string, bpm: number): number[] {
  const pattern = STANDARD_PATTERNS.find(p => p.id === patternId);
  if (!pattern) return [];

  const beatInterval = 60000 / bpm;
  return pattern.beats.map((_, index) => index * beatInterval);
}

export function parseUserBeat(timestamps: number[], startTime: number): number[] {
  if (timestamps.length === 0) return [];
  return timestamps.map(ts => ts - startTime).sort((a, b) => a - b);
}

export function calculateDeviation(
  userBeats: number[],
  standardBeats: number[]
): DeviationResult {
  const deviations: number[] = [];
  const maxDeviation = 200;

  for (let i = 0; i < standardBeats.length; i++) {
    if (i < userBeats.length) {
      const deviation = userBeats[i] - standardBeats[i];
      deviations.push(Math.round(deviation));
    } else {
      deviations.push(maxDeviation);
    }
  }

  for (let i = standardBeats.length; i < userBeats.length; i++) {
    deviations.push(maxDeviation);
  }

  const validDeviations = deviations.slice(0, Math.max(userBeats.length, standardBeats.length));
  const absDeviations = validDeviations.map(d => Math.abs(d));
  const avgDeviation = absDeviations.reduce((a, b) => a + b, 0) / (absDeviations.length || 1);

  const accuracy = Math.max(0, Math.min(100, 100 - (avgDeviation / maxDeviation) * 100));

  let grade: string;
  if (accuracy >= 90) {
    grade = '优秀';
  } else if (accuracy >= 75) {
    grade = '良好';
  } else {
    grade = '继续努力';
  }

  return { deviations, accuracy, grade };
}

export function generateVisualData(
  userBeats: number[],
  standardBeats: number[],
  canvasWidth: number,
  canvasHeight: number
): VisualData {
  const padding = 60;
  const graphWidth = canvasWidth - padding * 2;
  const graphHeight = canvasHeight - padding * 2;
  const centerY = canvasHeight / 2;

  const totalDuration = standardBeats.length > 0 
    ? standardBeats[standardBeats.length - 1] + 500 
    : 2000;

  const standardPoints: BeatPoint[] = standardBeats.map((beatTime, index) => {
    const x = padding + (beatTime / totalDuration) * graphWidth;
    return {
      x,
      y: centerY,
      beatIndex: index,
      deviation: 0,
    };
  });

  const { deviations, accuracy } = calculateDeviation(userBeats, standardBeats);
  const maxDeviationDisplay = 150;

  const userPoints: BeatPoint[] = userBeats.map((beatTime, index) => {
    const x = padding + (beatTime / totalDuration) * graphWidth;
    const deviation = deviations[index] || 0;
    const normalizedDeviation = Math.max(-1, Math.min(1, deviation / maxDeviationDisplay));
    const y = centerY - normalizedDeviation * (graphHeight / 2 - 20);

    return {
      x,
      y,
      beatIndex: index,
      deviation,
    };
  });

  return {
    standardPoints,
    userPoints,
    deviations,
    accuracy,
  };
}

export function generateWaveformPoints(
  points: BeatPoint[],
  _canvasWidth: number,
  canvasHeight: number
): { x: number; y: number }[] {
  if (points.length < 2) return points.map(p => ({ x: p.x, y: p.y }));

  const result: { x: number; y: number }[] = [];
  const centerY = canvasHeight / 2;

  result.push({ x: points[0].x, y: centerY });

  for (let i = 0; i < points.length; i++) {
    result.push({ x: points[i].x, y: points[i].y });
    if (i < points.length - 1) {
      result.push({ x: (points[i].x + points[i + 1].x) / 2, y: centerY });
    }
  }

  result.push({ x: points[points.length - 1].x, y: centerY });

  return result;
}

export function getBeatPositions(
  standardBeats: number[],
  currentTime: number,
  bpm: number
): BeatPosition {
  if (standardBeats.length === 0) {
    return {
      currentBeatIndex: 0,
      positionPercent: 0,
      beatProgress: 0,
    };
  }

  const beatInterval = 60000 / bpm;
  const totalDuration = standardBeats.length * beatInterval;

  if (currentTime >= totalDuration) {
    return {
      currentBeatIndex: standardBeats.length - 1,
      positionPercent: 1,
      beatProgress: 1,
    };
  }

  const currentBeatIndex = Math.min(
    Math.floor(currentTime / beatInterval),
    standardBeats.length - 1
  );

  const beatStartTime = currentBeatIndex * beatInterval;
  const beatProgress = Math.min(1, (currentTime - beatStartTime) / beatInterval);

  const positionPercent = Math.min(1, currentTime / totalDuration);

  return {
    currentBeatIndex,
    positionPercent,
    beatProgress,
  };
}
