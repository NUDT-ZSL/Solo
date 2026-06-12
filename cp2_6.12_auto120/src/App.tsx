import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import CapsuleMap from './mapModule/CapsuleMap';
import UserStatusBar from './interactionModule/UserStatusBar';
import { Capsule, capsuleApi } from './services/api';

interface AppState {
  capsules: Capsule[];
  refreshCapsules: () => void;
  userPosition: [number, number] | null;
  setUserPosition: (pos: [number, number] | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const App: React.FC = () => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const refreshCapsules = useCallback(async () => {
    try {
      const data = await capsuleApi.getAll();
      setCapsules(data);
    } catch (e) {
      console.error('Failed to load capsules:', e);
    }
  }, []);

  useEffect(() => {
    refreshCapsules();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          setUserPosition([39.9087, 116.3975]);
        },
        { timeout: 5000 }
      );
    } else {
      setUserPosition([39.9087, 116.3975]);
    }
  }, [refreshCapsules]);

  return (
    <AppContext.Provider value={{ capsules, refreshCapsules, userPosition, setUserPosition }}>
      <div style={styles.container}>
        <div style={styles.panel}>
          <UserStatusBar />
        </div>
        <div style={styles.divider} />
        <div style={styles.mapContainer}>
          {userPosition && <CapsuleMap />}
        </div>
      </div>
    </AppContext.Provider>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#0f0f1a',
  },
  panel: {
    width: '22%',
    minWidth: '260px',
    height: '100%',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    overflowY: 'auto',
  },
  divider: {
    width: '6px',
    height: '100%',
    backgroundColor: '#0f0f1a',
  },
  mapContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
};

export default App;
