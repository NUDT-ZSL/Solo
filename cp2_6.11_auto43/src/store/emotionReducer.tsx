import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode, type Dispatch } from 'react';
import type { EmotionRecord, Echo, StatsData } from '../../shared/types';
import { DEFAULT_USER_ID } from '../../shared/types';

export interface EmotionState {
  records: EmotionRecord[];
  echoes: Echo[];
  stats: StatsData | null;
  loading: boolean;
  selectedRecord: EmotionRecord | null;
  modalOpen: boolean;
  editingRecord: EmotionRecord | null;
  shareModalOpen: boolean;
  toastMessage: string;
  toastVisible: boolean;
}

export type EmotionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_RECORDS'; payload: EmotionRecord[] }
  | { type: 'SET_ECHOES'; payload: Echo[] }
  | { type: 'SET_STATS'; payload: StatsData | null }
  | { type: 'ADD_RECORD'; payload: EmotionRecord }
  | { type: 'UPDATE_RECORD'; payload: EmotionRecord }
  | { type: 'DELETE_RECORD'; payload: string }
  | { type: 'ADD_ECHO'; payload: Echo }
  | { type: 'SET_SELECTED_RECORD'; payload: EmotionRecord | null }
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_EDITING_RECORD'; payload: EmotionRecord | null }
  | { type: 'SET_SHARE_MODAL_OPEN'; payload: boolean }
  | { type: 'SHOW_TOAST'; payload: string }
  | { type: 'HIDE_TOAST' };

const initialState: EmotionState = {
  records: [],
  echoes: [],
  stats: null,
  loading: false,
  selectedRecord: null,
  modalOpen: false,
  editingRecord: null,
  shareModalOpen: false,
  toastMessage: '',
  toastVisible: false,
};

export function emotionReducer(state: EmotionState, action: EmotionAction): EmotionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_RECORDS':
      return { ...state, records: action.payload };
    case 'SET_ECHOES':
      return { ...state, echoes: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'ADD_RECORD': {
      const exists = state.records.findIndex((r) => r.date === action.payload.date);
      if (exists >= 0) {
        const updated = [...state.records];
        updated[exists] = action.payload;
        return { ...state, records: updated };
      }
      return {
        ...state,
        records: [...state.records, action.payload].sort((a, b) => a.date.localeCompare(b.date)),
      };
    }
    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case 'DELETE_RECORD':
      return {
        ...state,
        records: state.records.filter((r) => r.id !== action.payload),
        selectedRecord: null,
      };
    case 'ADD_ECHO':
      return { ...state, echoes: [...state.echoes, action.payload] };
    case 'SET_SELECTED_RECORD':
      return { ...state, selectedRecord: action.payload };
    case 'SET_MODAL_OPEN':
      return { ...state, modalOpen: action.payload };
    case 'SET_EDITING_RECORD':
      return { ...state, editingRecord: action.payload };
    case 'SET_SHARE_MODAL_OPEN':
      return { ...state, shareModalOpen: action.payload };
    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.payload, toastVisible: true };
    case 'HIDE_TOAST':
      return { ...state, toastVisible: false };
    default:
      return state;
  }
}

interface EmotionContextValue {
  state: EmotionState;
  dispatch: Dispatch<EmotionAction>;
  fetchTrajectories: () => Promise<void>;
  createRecord: (record: Omit<EmotionRecord, 'id' | 'userId'>) => Promise<void>;
  updateRecord: (id: string, record: Partial<EmotionRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  addEcho: (echo: Omit<Echo, 'id' | 'createdAt'>) => Promise<void>;
  fetchStats: () => Promise<void>;
  showToast: (message: string) => void;
}

const EmotionContext = createContext<EmotionContextValue | null>(null);

export function EmotionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(emotionReducer, initialState);

  const fetchTrajectories = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`/api/trajectories?userId=${DEFAULT_USER_ID}`);
      const data = await res.json();
      dispatch({ type: 'SET_RECORDS', payload: data.records || [] });
      dispatch({ type: 'SET_ECHOES', payload: data.echoes || [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createRecord = useCallback(async (record: Omit<EmotionRecord, 'id' | 'userId'>) => {
    try {
      const res = await fetch('/api/trajectories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, userId: DEFAULT_USER_ID }),
      });
      const newRecord = await res.json();
      dispatch({ type: 'ADD_RECORD', payload: newRecord });
    } catch {}
  }, []);

  const updateRecord = useCallback(async (id: string, record: Partial<EmotionRecord>) => {
    try {
      const res = await fetch(`/api/trajectories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, userId: DEFAULT_USER_ID }),
      });
      const updated = await res.json();
      dispatch({ type: 'UPDATE_RECORD', payload: updated });
    } catch {}
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      await fetch(`/api/trajectories/${id}?userId=${DEFAULT_USER_ID}`, { method: 'DELETE' });
      dispatch({ type: 'DELETE_RECORD', payload: id });
    } catch {}
  }, []);

  const addEcho = useCallback(async (echo: Omit<Echo, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(echo),
      });
      const newEcho = await res.json();
      dispatch({ type: 'ADD_ECHO', payload: newEcho });
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?userId=${DEFAULT_USER_ID}`);
      const data = await res.json();
      dispatch({ type: 'SET_STATS', payload: data });
    } catch {}
  }, []);

  const showToast = useCallback((message: string) => {
    dispatch({ type: 'SHOW_TOAST', payload: message });
    setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2000);
  }, []);

  const value = useMemo<EmotionContextValue>(
    () => ({
      state,
      dispatch,
      fetchTrajectories,
      createRecord,
      updateRecord,
      deleteRecord,
      addEcho,
      fetchStats,
      showToast,
    }),
    [state, fetchTrajectories, createRecord, updateRecord, deleteRecord, addEcho, fetchStats, showToast]
  );

  return <EmotionContext.Provider value={value}>{children}</EmotionContext.Provider>;
}

export function useEmotion() {
  const ctx = useContext(EmotionContext);
  if (!ctx) throw new Error('useEmotion must be used within EmotionProvider');
  return ctx;
}
