export interface ElevationPoint {
  distance: number;
  elevation: number;
}

export interface PaceEntry {
  km: number;
  recommendedPace: number;
  actualPace: number;
  cumulativeTime: number;
  elevationChange: number;
}

export interface SimulationState {
  isRunning: boolean;
  currentKm: number;
  currentPace: number;
  cumulativeTime: number;
  isCompleted: boolean;
}

export interface RaceResult {
  targetTime: number;
  actualTime: number;
  difference: number;
  paceList: PaceEntry[];
}
