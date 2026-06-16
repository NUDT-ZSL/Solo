import React, { useState, useCallback, useEffect } from 'react';
import Scene from '@/components/Scene';
import ControlPanel from '@/components/ControlPanel';
import { useSunPosition } from '@/hooks/useSunPosition';
import { type WindowType, type Season } from '@/data/roomConfig';

const App: React.FC = () => {
  const [windowType, setWindowType] = useState<WindowType>('circle');
  const [orientation, setOrientation] = useState(180);
  const [time, setTime] = useState(12);
  const [season, setSeason] = useState<Season>('summer');

  const sunPos = useSunPosition(orientation, time, season);

  const handleWindowTypeChange = useCallback((type: WindowType) => {
    setWindowType(type);
  }, []);

  const handleOrientationChange = useCallback((value: number) => {
    setOrientation(value);
  }, []);

  const handleTimeChange = useCallback((value: number) => {
    setTime(value);
  }, []);

  const handleSeasonChange = useCallback((s: Season) => {
    setSeason(s);
  }, []);

  useEffect(() => {
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: { windowType, orientation, time, season },
      }),
    }).catch(() => {});
  }, [windowType, orientation, time, season]);

  return (
    <div style={styles.container}>
      <div style={styles.panelWrapper}>
        <ControlPanel
          windowType={windowType}
          orientation={orientation}
          time={time}
          season={season}
          sunAltitude={sunPos.altitude}
          sunAzimuth={sunPos.azimuth}
          onWindowTypeChange={handleWindowTypeChange}
          onOrientationChange={handleOrientationChange}
          onTimeChange={handleTimeChange}
          onSeasonChange={handleSeasonChange}
        />
      </div>
      <div style={styles.separator} />
      <div style={styles.sceneWrapper}>
        <Scene
          windowType={windowType}
          orientation={orientation}
          time={time}
          season={season}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    background: '#1a1a2e',
    overflow: 'hidden',
  },
  panelWrapper: {
    padding: 12,
    boxSizing: 'border-box' as const,
  },
  separator: {
    width: 1,
    background: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'stretch',
  },
  sceneWrapper: {
    flex: 1,
    position: 'relative' as const,
    aspectRatio: '16/9',
    maxHeight: '100vh',
  },
};

export default App;
