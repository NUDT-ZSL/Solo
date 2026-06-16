import { useState, useEffect, useCallback } from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';

export interface CongestionData {
  totalVehicles: number;
  averageSpeed: number;
  severeCongestionCount: number;
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [60, 50, 60];

function App() {
  const [trafficDensity, setTrafficDensity] = useState<number>(50);
  const [speedThreshold, setSpeedThreshold] = useState<number>(40);
  const [timeSpeed, setTimeSpeed] = useState<number>(1);
  const [congestionData, setCongestionData] = useState<CongestionData>({
    totalVehicles: 50,
    averageSpeed: 40,
    severeCongestionCount: 0,
  });
  const [resetCameraTrigger, setResetCameraTrigger] = useState<number>(0);

  const handleResetCamera = useCallback(() => {
    setResetCameraTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleResetCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetCamera]);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0d0d0d',
      overflow: 'hidden',
    }}>
      <Scene
        trafficDensity={trafficDensity}
        speedThreshold={speedThreshold}
        timeSpeed={timeSpeed}
        defaultCameraPosition={DEFAULT_CAMERA_POSITION}
        resetCameraTrigger={resetCameraTrigger}
        onCongestionUpdate={setCongestionData}
      />
      <ControlPanel
        trafficDensity={trafficDensity}
        setTrafficDensity={setTrafficDensity}
        speedThreshold={speedThreshold}
        setSpeedThreshold={setSpeedThreshold}
        timeSpeed={timeSpeed}
        setTimeSpeed={setTimeSpeed}
        congestionData={congestionData}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
}

export default App;
