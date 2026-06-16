import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { AppState, AppAction, Batch, RoastCurve, TastingRecord, FlavorLabel } from './types';

const API = 'http://localhost:3001/api';

const initialState: AppState = {
  batches: [],
  selectedBatchId: null,
  roasts: [],
  tastings: [],
  labels: [],
  drawerOpen: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_BATCHES':
      return { ...state, batches: action.payload };
    case 'ADD_BATCH':
      return { ...state, batches: [...state.batches, action.payload] };
    case 'SELECT_BATCH':
      return { ...state, selectedBatchId: action.payload };
    case 'ADD_ROAST':
      return { ...state, roasts: [...state.roasts, action.payload] };
    case 'UPDATE_ROAST':
      return { ...state, roasts: state.roasts.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'SET_ROASTS':
      return { ...state, roasts: action.payload };
    case 'ADD_TASTING':
      return { ...state, tastings: [...state.tastings, action.payload] };
    case 'SET_TASTINGS':
      return { ...state, tastings: action.payload };
    case 'ADD_LABEL':
      return { ...state, labels: [...state.labels, action.payload] };
    case 'SET_LABELS':
      return { ...state, labels: action.payload };
    case 'TOGGLE_COLLECT':
      return { ...state, labels: state.labels.map(l => l.id === action.payload ? { ...l, isCollected: !l.isCollected } : l) };
    case 'SET_DRAWER':
      return { ...state, drawerOpen: action.payload };
    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt'>) => Promise<void>;
  selectBatch: (id: string | null) => void;
  addRoast: (roast: Omit<RoastCurve, 'id' | 'createdAt'>) => Promise<void>;
  updateRoast: (roast: RoastCurve) => Promise<void>;
  addTasting: (tasting: Omit<TastingRecord, 'id' | 'createdAt'>) => Promise<void>;
  addLabel: (label: Omit<FlavorLabel, 'id' | 'createdAt'>) => Promise<void>;
  toggleCollect: (id: string) => void;
  setDrawer: (open: boolean) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    axios.get(`${API}/batches`).then(res => dispatch({ type: 'SET_BATCHES', payload: res.data })).catch(() => {});
    axios.get(`${API}/labels`).then(res => dispatch({ type: 'SET_LABELS', payload: res.data })).catch(() => {});
  }, []);

  const addBatch = useCallback(async (batch: Omit<Batch, 'id' | 'createdAt'>) => {
    const res = await axios.post(`${API}/batch`, batch);
    dispatch({ type: 'ADD_BATCH', payload: res.data });
  }, []);

  const selectBatch = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_BATCH', payload: id });
  }, []);

  const addRoast = useCallback(async (roast: Omit<RoastCurve, 'id' | 'createdAt'>) => {
    const res = await axios.post(`${API}/roast`, roast);
    dispatch({ type: 'ADD_ROAST', payload: res.data });
  }, []);

  const updateRoast = useCallback(async (roast: RoastCurve) => {
    const res = await axios.put(`${API}/roast/${roast.id}`, roast);
    dispatch({ type: 'UPDATE_ROAST', payload: res.data });
  }, []);

  const addTasting = useCallback(async (tasting: Omit<TastingRecord, 'id' | 'createdAt'>) => {
    const res = await axios.post(`${API}/tasting`, tasting);
    dispatch({ type: 'ADD_TASTING', payload: res.data });
  }, []);

  const addLabel = useCallback(async (label: Omit<FlavorLabel, 'id' | 'createdAt'>) => {
    const res = await axios.post(`${API}/label`, label);
    dispatch({ type: 'ADD_LABEL', payload: res.data });
  }, []);

  const toggleCollect = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_COLLECT', payload: id });
  }, []);

  const setDrawer = useCallback((open: boolean) => {
    dispatch({ type: 'SET_DRAWER', payload: open });
  }, []);

  return (
    <StoreContext.Provider value={{ state, addBatch, selectBatch, addRoast, updateRoast, addTasting, addLabel, toggleCollect, setDrawer }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
