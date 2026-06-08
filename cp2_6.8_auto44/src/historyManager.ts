import { HistoryState, PathPoint, AnimationParams } from './types';

const MAX_HISTORY = 20;

export interface HistoryStore {
  states: HistoryState[];
  currentIndex: number;
  nextId: number;
}

export function createHistoryStore(): HistoryStore {
  return {
    states: [],
    currentIndex: -1,
    nextId: 0
  };
}

export function pushState(
  store: HistoryStore,
  label: string,
  pathPoints: PathPoint[],
  animationParams: AnimationParams,
  morphTargetPoints?: PathPoint[]
): HistoryStore {
  const newState: HistoryState = {
    id: store.nextId,
    timestamp: Date.now(),
    label,
    pathPoints: JSON.parse(JSON.stringify(pathPoints)),
    animationParams: JSON.parse(JSON.stringify(animationParams)),
    morphTargetPoints: morphTargetPoints ? JSON.parse(JSON.stringify(morphTargetPoints)) : undefined
  };

  const newStates = store.states.slice(0, store.currentIndex + 1);
  newStates.push(newState);

  if (newStates.length > MAX_HISTORY) {
    const removeCount = newStates.length - MAX_HISTORY;
    newStates.splice(0, removeCount);
  }

  return {
    states: newStates,
    currentIndex: newStates.length - 1,
    nextId: store.nextId + 1
  };
}

export function undo(store: HistoryStore): HistoryStore | null {
  if (store.currentIndex <= 0) return null;
  return {
    ...store,
    currentIndex: store.currentIndex - 1
  };
}

export function redo(store: HistoryStore): HistoryStore | null {
  if (store.currentIndex >= store.states.length - 1) return null;
  return {
    ...store,
    currentIndex: store.currentIndex + 1
  };
}

export function goToState(store: HistoryStore, targetIndex: number): HistoryStore | null {
  if (targetIndex < 0 || targetIndex >= store.states.length) return null;
  if (targetIndex === store.currentIndex) return null;
  return {
    ...store,
    currentIndex: targetIndex
  };
}

export function getHistoryList(store: HistoryStore): HistoryState[] {
  return store.states;
}

export function getCurrentState(store: HistoryStore): HistoryState | null {
  if (store.currentIndex < 0 || store.currentIndex >= store.states.length) return null;
  return store.states[store.currentIndex];
}

export function canUndo(store: HistoryStore): boolean {
  return store.currentIndex > 0;
}

export function canRedo(store: HistoryStore): boolean {
  return store.currentIndex < store.states.length - 1;
}
