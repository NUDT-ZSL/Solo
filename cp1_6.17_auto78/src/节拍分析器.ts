export interface BeatState {
  bpm: number;
  beatInterval: number;
  currentBeat: number;
  lastBeatTime: number;
  beatProgress: number;
  isBeat: boolean;
  beatTimestamps: number[];
}

export interface HitAccuracy {
  isPerfect: boolean;
  isGood: boolean;
  offset: number;
  offsetMs: number;
}

export const createBeatAnalyzer = (bpm: number = 120): BeatState => {
  const beatInterval = 60000 / bpm;
  return {
    bpm,
    beatInterval,
    currentBeat: 0,
    lastBeatTime: 0,
    beatProgress: 0,
    isBeat: false,
    beatTimestamps: [],
  };
};

export const updateBeat = (state: BeatState, currentTime: number): BeatState => {
  const elapsed = currentTime - state.lastBeatTime;
  const progress = Math.min(elapsed / state.beatInterval, 1);
  
  let isBeat = false;
  let newLastBeatTime = state.lastBeatTime;
  let newCurrentBeat = state.currentBeat;
  const newTimestamps = [...state.beatTimestamps];

  if (progress >= 1) {
    isBeat = true;
    newLastBeatTime = currentTime;
    newCurrentBeat = state.currentBeat + 1;
    newTimestamps.push(currentTime);
    
    if (newTimestamps.length > 100) {
      newTimestamps.shift();
    }
  }

  return {
    ...state,
    currentBeat: newCurrentBeat,
    lastBeatTime: newLastBeatTime,
    beatProgress: isBeat ? 0 : progress,
    isBeat,
    beatTimestamps: newTimestamps,
  };
};

export const checkHitAccuracy = (
  state: BeatState,
  hitTime: number,
  perfectWindow: number = 50,
  goodWindow: number = 150
): HitAccuracy => {
  let closestOffset = Infinity;

  for (const timestamp of state.beatTimestamps) {
    const offset = Math.abs(hitTime - timestamp);
    if (offset < closestOffset) {
      closestOffset = offset;
    }
  }

  const nextBeatTime = state.lastBeatTime + state.beatInterval;
  const nextOffset = Math.abs(hitTime - nextBeatTime);
  if (nextOffset < closestOffset) {
    closestOffset = nextOffset;
  }

  const prevBeatTime = state.lastBeatTime;
  const prevOffset = Math.abs(hitTime - prevBeatTime);
  if (prevOffset < closestOffset) {
    closestOffset = prevOffset;
  }

  return {
    isPerfect: closestOffset <= perfectWindow,
    isGood: closestOffset <= goodWindow,
    offset: closestOffset,
    offsetMs: closestOffset,
  };
};

export const getBeatPulse = (state: BeatState): number => {
  const progress = state.beatProgress;
  if (progress < 0.1) {
    return 1 - progress / 0.1;
  }
  return 0;
};

export const getCurrentBeatTime = (state: BeatState): number => {
  return state.lastBeatTime;
};

export const getNextBeatTime = (state: BeatState): number => {
  return state.lastBeatTime + state.beatInterval;
};
