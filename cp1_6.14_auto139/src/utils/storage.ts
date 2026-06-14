import { GameState } from '../types';

const STORAGE_KEY = 'echorealm_save';
const SAVE_VERSION = 1;

interface SavedGameState extends GameState {
  _version: number;
  _savedAt: number;
}

const validateGameState = (data: any): data is GameState => {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.currentNodeId !== 'string') return false;
  if (!data.variables || typeof data.variables !== 'object') return false;
  if (!Array.isArray(data.visitedNodes)) return false;
  if (!Array.isArray(data.history)) return false;
  return true;
};

export const saveGame = (state: GameState): void => {
  const start = performance.now();
  try {
    const dataToSave: SavedGameState = {
      ...state,
      variables: { ...state.variables },
      visitedNodes: [...state.visitedNodes],
      history: [...state.history],
      _version: SAVE_VERSION,
      _savedAt: Date.now(),
    };
    const serialized = JSON.stringify(dataToSave);
    localStorage.setItem(STORAGE_KEY, serialized);
    const elapsed = performance.now() - start;
    if (elapsed > 8) {
      console.warn(`[Storage] saveGame took ${elapsed.toFixed(2)}ms (target <10ms)`);
    }
  } catch (error) {
    console.error('Failed to save game:', error);
  }
};

export const loadGame = (): GameState | null => {
  const start = performance.now();
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);

    if (parsed._version !== undefined && parsed._version !== SAVE_VERSION) {
      console.warn(`[Storage] Save version mismatch: expected ${SAVE_VERSION}, got ${parsed._version}. Attempting migration...`);
    }

    const state: GameState = {
      currentNodeId: parsed.currentNodeId,
      variables: parsed.variables || {},
      visitedNodes: Array.isArray(parsed.visitedNodes) ? parsed.visitedNodes : [parsed.currentNodeId],
      history: Array.isArray(parsed.history) ? parsed.history : [{ nodeId: parsed.currentNodeId, timestamp: Date.now() }],
    };

    if (!validateGameState(state)) {
      console.error('[Storage] Saved game data is invalid, ignoring save.');
      return null;
    }

    const elapsed = performance.now() - start;
    if (elapsed > 8) {
      console.warn(`[Storage] loadGame took ${elapsed.toFixed(2)}ms (target <10ms)`);
    }

    return state;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
};

export const hasSaveGame = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

export const clearSave = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear save:', error);
  }
};

export const getSaveInfo = (): { savedAt?: Date; visitedCount?: number; historyCount?: number } | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    return {
      savedAt: parsed._savedAt ? new Date(parsed._savedAt) : undefined,
      visitedCount: Array.isArray(parsed.visitedNodes) ? parsed.visitedNodes.length : undefined,
      historyCount: Array.isArray(parsed.history) ? parsed.history.length : undefined,
    };
  } catch {
    return null;
  }
};
