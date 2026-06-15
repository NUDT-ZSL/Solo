interface WorkerMessage {
  type: 'BPM_MATCH';
  songs: { id: string; bpm: number }[];
  heartRate: number;
  cadence: number;
}

interface MatchResult {
  id: string;
  bpm: number;
  matchScore: number;
}

function smoothData(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += values[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
}

function calculateBPMTarget(heartRate: number, cadence: number): number {
  const hrWeight = 0.6;
  const cadenceWeight = 0.4;
  const hrTarget = heartRate * 0.95;
  const cadenceTarget = cadence * 1.0;
  return hrTarget * hrWeight + cadenceTarget * cadenceWeight;
}

function computeMatchScore(songBpm: number, targetBpm: number): number {
  const diff = Math.abs(songBpm - targetBpm);
  return Math.max(0, 1 - diff / 50);
}

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const { type, songs, heartRate, cadence } = e.data;

  if (type === 'BPM_MATCH') {
    const smoothedHR = smoothData([heartRate], 3);
    const targetBpm = calculateBPMTarget(smoothedHR[0], cadence);

    const results: MatchResult[] = songs.map((song) => ({
      id: song.id,
      bpm: song.bpm,
      matchScore: computeMatchScore(song.bpm, targetBpm)
    }));

    results.sort((a, b) => b.matchScore - a.matchScore);

    self.postMessage({
      type: 'BPM_MATCH_RESULT',
      results,
      targetBpm
    });
  }
};

export {};
