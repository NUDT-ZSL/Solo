import React, { useReducer, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import type { AppState, AppAction, Capsule } from './types';
import { getCapsules, openCapsule as openCapsuleApi } from './api';

const CapsulePage = lazy(() => import('./pages/CapsulePage'));

const initialState: AppState = {
  capsules: [],
  loading: true,
  error: null,
  filterStatus: 'all',
  filterColor: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CAPSULES':
      return { ...state, capsules: action.payload, loading: false };
    case 'ADD_CAPSULE':
      return { ...state, capsules: [action.payload, ...state.capsules] };
    case 'UPDATE_CAPSULE':
      return {
        ...state,
        capsules: state.capsules.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FILTER_STATUS':
      return { ...state, filterStatus: action.payload };
    case 'SET_FILTER_COLOR':
      return { ...state, filterColor: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addCapsule: (capsule: Capsule) => void;
  updateCapsule: (capsule: Capsule) => void;
  openCapsuleById: (id: string) => Promise<Capsule | null>;
}

export const AppContext = React.createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCapsules();
        if (!cancelled) dispatch({ type: 'SET_CAPSULES', payload: data });
      } catch (err) {
        if (!cancelled)
          dispatch({ type: 'SET_ERROR', payload: '加载胶囊列表失败' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addCapsule = (capsule: Capsule) => {
    dispatch({ type: 'ADD_CAPSULE', payload: capsule });
  };

  const updateCapsule = (capsule: Capsule) => {
    dispatch({ type: 'UPDATE_CAPSULE', payload: capsule });
  };

  const openCapsuleById = async (id: string): Promise<Capsule | null> => {
    try {
      const updated = await openCapsuleApi(id);
      updateCapsule(updated);
      return updated;
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '打开胶囊失败' });
      return null;
    }
  };

  const ctxValue: AppContextType = {
    state,
    dispatch,
    addCapsule,
    updateCapsule,
    openCapsuleById,
  };

  const headerStyle: React.CSSProperties = {
    padding: '32px 24px 0',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #FFD700, #FF8C42, #9B72CF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '2px',
    marginBottom: '8px',
  };

  const subtitleStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontWeight: 300,
    letterSpacing: '1px',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '16px',
  };

  const suspenseFallback = (
    <div style={loadingStyle}>加载中...</div>
  );

  return (
    <AppContext.Provider value={ctxValue}>
      <Router>
        <div style={{ minHeight: '100vh' }}>
          <header style={headerStyle}>
            <h1 style={titleStyle}>时光胶囊</h1>
            <p style={subtitleStyle}>封存此刻 · 静待未来 · 重逢之时</p>
          </header>
          {state.error && (
            <div
              style={{
                maxWidth: '1200px',
                margin: '16px 24px 0',
                padding: '12px 20px',
                background: 'rgba(217, 83, 79, 0.2)',
                borderRadius: '8px',
                color: '#E89BB1',
                fontSize: '14px',
                marginInline: 'auto',
              }}
            >
              {state.error}
            </div>
          )}
          {state.loading && state.capsules.length === 0 ? (
            <div style={loadingStyle}>正在穿越时空...</div>
          ) : (
            <Suspense fallback={suspenseFallback}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                  path="/capsule/:id"
                  element={<CapsulePage />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          )}
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
