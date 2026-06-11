import { useReducer, useEffect, useCallback, useState } from 'react';
import RecordPage from './pages/RecordPage';
import CalendarPage from './pages/CalendarPage';
import SyncOverlay from './components/SyncOverlay';
import { useIndexedDB } from './hooks/useIndexedDB';
import type { ScentEntry } from './types';

type Route =
  | { path: '/record' }
  | { path: '/calendar' }
  | { path: '/detail'; id: string };

interface AppState {
  route: Route;
  entries: ScentEntry[];
  loading: boolean;
}

type Action =
  | { type: 'SET_ROUTE'; payload: Route }
  | { type: 'SET_ENTRIES'; payload: ScentEntry[] }
  | { type: 'ADD_ENTRY'; payload: ScentEntry }
  | { type: 'UPDATE_ENTRY'; payload: ScentEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  route: { path: '/record' },
  entries: [],
  loading: true,
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_ROUTE':
      return { ...state, route: action.payload };
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload, loading: false };
    case 'ADD_ENTRY':
      return { ...state, entries: [action.payload, ...state.entries] };
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { saveOffline, loadOffline, syncStatus, isOnline } = useIndexedDB();
  const [syncProgress, setSyncProgress] = useState(0);
  const [showSyncOverlay, setShowSyncOverlay] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const offlineEntries = await loadOffline();
        dispatch({ type: 'SET_ENTRIES', payload: offlineEntries });

        if (navigator.onLine) {
          try {
            const response = await fetch('/api/entries');
            if (response.ok) {
              const serverEntries: ScentEntry[] = await response.json();
              dispatch({ type: 'SET_ENTRIES', payload: serverEntries });
              
              serverEntries.forEach((entry) => {
                saveOffline({ ...entry, synced: true });
              });
            }
          } catch (err) {
            console.log('无法从服务器加载数据，使用本地数据');
          }
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initData();
  }, [loadOffline, saveOffline]);

  useEffect(() => {
    if (syncStatus === 'syncing') {
      setShowSyncOverlay(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) progress = 90;
        setSyncProgress(progress);
      }, 300);
      return () => clearInterval(interval);
    } else if (syncStatus === 'synced') {
      setSyncProgress(100);
      const timer = setTimeout(() => {
        setShowSyncOverlay(false);
        setSyncProgress(0);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (syncStatus === 'error') {
      const timer = setTimeout(() => {
        setShowSyncOverlay(false);
        setSyncProgress(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const handleNavigate = useCallback((path: string) => {
    if (path.startsWith('/detail/')) {
      const id = path.replace('/detail/', '');
      dispatch({ type: 'SET_ROUTE', payload: { path: '/detail', id } });
    } else if (path === '/record') {
      dispatch({ type: 'SET_ROUTE', payload: { path: '/record' } });
    } else if (path === '/calendar') {
      dispatch({ type: 'SET_ROUTE', payload: { path: '/calendar' } });
    }
  }, []);

  const handleSaveEntry = useCallback(
    async (entry: ScentEntry) => {
      try {
        await saveOffline(entry);
        dispatch({ type: 'ADD_ENTRY', payload: entry });

        if (navigator.onLine) {
          try {
            const response = await fetch('/api/entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry),
            });

            if (response.ok) {
              const serverEntry = await response.json();
              dispatch({ type: 'UPDATE_ENTRY', payload: serverEntry });
              await saveOffline({ ...serverEntry, synced: true });
            }
          } catch (err) {
            console.log('保存到服务器失败，已保存到本地');
          }
        }
      } catch (err) {
        console.error('保存失败:', err);
      }
    },
    [saveOffline],
  );

  const handleSpeak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const renderRoute = () => {
    switch (state.route.path) {
      case '/record':
        return (
          <RecordPage
            onSave={handleSaveEntry}
            onNavigate={handleNavigate}
          />
        );
      case '/calendar':
        return (
          <CalendarPage
            entries={state.entries}
            onNavigate={handleNavigate}
            onSpeak={handleSpeak}
          />
        );
      default:
        return (
          <RecordPage
            onSave={handleSaveEntry}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  if (state.loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1A1A2E',
          color: '#E0D8C8',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {renderRoute()}
      <SyncOverlay
        visible={showSyncOverlay}
        progress={syncProgress}
        status={syncStatus as 'syncing' | 'synced' | 'error'}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '20px',
          background: isOnline ? 'rgba(124, 205, 124, 0.2)' : 'rgba(107, 123, 141, 0.3)',
          color: isOnline ? '#7CCD7C' : '#6B7B8D',
          fontSize: '12px',
          zIndex: 500,
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOnline ? '#7CCD7C' : '#6B7B8D',
          }}
        />
        {isOnline ? '在线' : '离线模式'}
      </div>
    </div>
  );
};

export default App;
