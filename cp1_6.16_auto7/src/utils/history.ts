import { BonsaiState, cloneState } from './bonSaiLogic';

const MAX_HISTORY = 50;

export interface HistoryState {
  past: BonsaiState[];
  present: BonsaiState;
  future: BonsaiState[];
}

export function createInitialState(initialState: BonsaiState): HistoryState {
  return {
    past: [],
    present: cloneState(initialState),
    future: []
  };
}

export function pushHistory(history: HistoryState, newState: BonsaiState): HistoryState {
  const newPast = [...history.past, cloneState(history.present)];
  
  if (newPast.length > MAX_HISTORY) {
    newPast.shift();
  }
  
  return {
    past: newPast,
    present: cloneState(newState),
    future: []
  };
}

export function undoHistory(history: HistoryState): HistoryState | null {
  if (history.past.length === 0) {
    return null;
  }
  
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future]
  };
}

export function redoHistory(history: HistoryState): HistoryState | null {
  if (history.future.length === 0) {
    return null;
  }
  
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture
  };
}

export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

export function statesEqual(a: BonsaiState, b: BonsaiState): boolean {
  if ((a.pot === null) !== (b.pot === null)) return false;
  if (a.pot && b.pot && (a.pot.type !== b.pot.type || a.pot.color !== b.pot.color)) return false;
  
  if ((a.plant === null) !== (b.plant === null)) return false;
  if (a.plant && b.plant && a.plant.type !== b.plant.type) return false;
  
  if (a.decorations.length !== b.decorations.length) return false;
  
  for (let i = 0; i < a.decorations.length; i++) {
    const decA = a.decorations[i];
    const decB = b.decorations[i];
    if (decA.id !== decB.id || 
        decA.type !== decB.type || 
        decA.x !== decB.x || 
        decA.y !== decB.y) {
      return false;
    }
  }
  
  return true;
}
