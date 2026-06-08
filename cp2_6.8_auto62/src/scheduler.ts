import { Intersection, Phase, Direction } from './traffic';

export type ScheduleStrategy = 'fixed' | 'adaptive' | 'mainRoadPriority' | 'aiPredict';

export const STRATEGY_LABELS: { [key in ScheduleStrategy]: string } = {
  fixed: '固定时长',
  adaptive: '自适应',
  mainRoadPriority: '优先主干道',
  aiPredict: 'AI预测'
};

function countQueue(it: Intersection, phase: Phase): number {
  const dirs: Direction[] = phase === 'northSouth' ? ['north', 'south'] : ['east', 'west'];
  let total = 0;
  for (const d of dirs) {
    for (const lane of it.lanes[d]) {
      total += lane.queueLength;
    }
  }
  return total;
}

function movingAverage(arr: number[], window: number): number {
  if (arr.length === 0) return 0;
  const slice = arr.slice(-window);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

export function getGreenDuration(strategy: ScheduleStrategy, it: Intersection, phase: Phase): number {
  switch (strategy) {
    case 'fixed':
      return 30;

    case 'adaptive': {
      const queue = countQueue(it, phase);
      const base = 15;
      const extra = queue * 2;
      return Math.min(60, Math.max(10, base + extra));
    }

    case 'mainRoadPriority': {
      const isMain =
        (phase === 'northSouth' && it.gridY === 1) ||
        (phase === 'eastWest' && it.gridX === 1);
      const base = 15;
      return isMain ? base * 2 : base;
    }

    case 'aiPredict': {
      const nsDirs: Direction[] = ['north', 'south'];
      const ewDirs: Direction[] = ['east', 'west'];
      let nsFlow = 0, ewFlow = 0;
      for (const d of nsDirs) {
        for (const lane of it.lanes[d]) {
          nsFlow += movingAverage(it.trafficHistory, 30);
        }
      }
      for (const d of ewDirs) {
        for (const lane of it.lanes[d]) {
          ewFlow += movingAverage(it.trafficHistory, 30);
        }
      }
      nsFlow = Math.max(nsFlow, 1);
      ewFlow = Math.max(ewFlow, 1);
      const total = nsFlow + ewFlow;
      const ratio = phase === 'northSouth' ? nsFlow / total : ewFlow / total;
      const totalGreen = 60;
      return Math.min(60, Math.max(10, Math.round(totalGreen * ratio)));
    }

    default:
      return 30;
  }
}

export function applyStrategyToAll(
  strategy: ScheduleStrategy,
  intersections: Intersection[],
  immediate: boolean = false
) {
  for (const it of intersections) {
    const nextPhase: Phase = it.signal.currentPhase === 'northSouth' ? 'eastWest' : 'northSouth';
    const dur = getGreenDuration(strategy, it, nextPhase);
    it.signal.nextGreenDuration = dur;
    if (immediate) {
      it.signal.greenDuration = getGreenDuration(strategy, it, it.signal.currentPhase);
      it.signal.remainingTime = Math.min(it.signal.remainingTime, it.signal.greenDuration);
    }
    it.signal.pendingStrategyUpdate = true;
  }
}

export function createGetGreenDuration(strategy: ScheduleStrategy) {
  return (it: Intersection, phase: Phase) => getGreenDuration(strategy, it, phase);
}
