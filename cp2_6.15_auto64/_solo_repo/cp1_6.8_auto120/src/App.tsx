import { useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import ReefScene from './components/ReefScene';
import CoralInfoCard from './components/UIControls';
import { UIControls } from './components/UIControls';
import { useReefStore } from './store/useReefStore';
import { generateCoralData } from './data/coralData';
import type { CoralData } from './store/useReefStore';

const coralDataCache = generateCoralData();

export default function App() {
  const [selectedCoral, setSelectedCoral] = useState<CoralData | null>(null);
  const setSelectedCoralStore = useReefStore((s) => s.setSelectedCoral);

  const handleClickCoral = useCallback(
    (coralId: string) => {
      const coral = coralDataCache.find((c) => c.id === coralId);
      if (coral) {
        setSelectedCoral(coral);
        setSelectedCoralStore(coral);
      }
    },
    [setSelectedCoralStore]
  );

  const handleDismissCard = useCallback(() => {
    setSelectedCoral(null);
    setSelectedCoralStore(null);
  }, [setSelectedCoralStore]);

  const handleResetView = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.dispatchEvent(new CustomEvent('reset-camera'));
    }
  }, []);

  return (
    <div className="app-root">
      <Canvas
        shadows
        camera={{ position: [0, 8, 16], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <ReefScene onClickCoral={handleClickCoral} />
      </Canvas>

      <div className="ui-overlay">
        <div className="app-title">
          <h1>光之珊瑚礁</h1>
          <p>Luminous Coral Reef</p>
        </div>

        {selectedCoral && (
          <div className="coral-card-container" onClick={handleDismissCard}>
            <div onClick={(e) => e.stopPropagation()}>
              <CoralInfoCard coral={selectedCoral} />
            </div>
          </div>
        )}

        <UIControls onResetView={handleResetView} />
      </div>
    </div>
  );
}
