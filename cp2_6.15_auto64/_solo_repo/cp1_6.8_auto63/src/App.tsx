import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EcosystemEngine } from './EcosystemEngine';
import { TreeType, ForestStats } from './types';
import ForestCanvas from './ForestCanvas';
import ControlPanel from './ControlPanel';

const App: React.FC = () => {
  const engineRef = useRef<EcosystemEngine>(new EcosystemEngine());
  const [selectedTree, setSelectedTree] = useState<TreeType>('pine');
  const [planting, setPlanting] = useState(false);
  const [seasonProgress, setSeasonProgress] = useState(0);
  const [stats, setStats] = useState<ForestStats>({
    treeCount: 0,
    animalCount: 0,
    season: 'spring',
  });

  useEffect(() => {
    const engine = engineRef.current;
    const originalInit = engine.init.bind(engine);
    engine.init = (canvas: HTMLCanvasElement, _onStats: (s: ForestStats) => void) => {
      originalInit(canvas, (s: ForestStats) => {
        setStats(s);
      });
    };
  }, []);

  const handleSeasonChange = useCallback((progress: number) => {
    setSeasonProgress(progress);
    engineRef.current.setSeasonByProgress(progress);
  }, []);

  const handleTogglePlanting = useCallback(() => {
    setPlanting(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current.reset();
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ForestCanvas
        engine={engineRef.current}
        selectedTree={selectedTree}
        planting={planting}
      />
      <ControlPanel
        selectedTree={selectedTree}
        onSelectTree={setSelectedTree}
        seasonProgress={seasonProgress}
        onSeasonChange={handleSeasonChange}
        planting={planting}
        onTogglePlanting={handleTogglePlanting}
        onReset={handleReset}
        stats={stats}
      />
    </div>
  );
};

export default App;
