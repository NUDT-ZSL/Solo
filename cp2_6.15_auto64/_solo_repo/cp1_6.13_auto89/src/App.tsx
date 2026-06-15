import { useMemo } from 'react';
import { FishManager } from './core/FishManager';
import { SonarSystem } from './core/SonarSystem';
import { SimContext } from './core/SimContext';
import { MainScene } from './renderer/MainScene';
import { HUD } from './renderer/HUD';

function App() {
  const fishManager = useMemo(() => new FishManager(), []);
  const sonarSystem = useMemo(() => new SonarSystem(fishManager), [fishManager]);
  const ctxValue = useMemo(() => ({ fishManager, sonarSystem }), [fishManager, sonarSystem]);

  return (
    <SimContext.Provider value={ctxValue}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MainScene />
        <HUD />
      </div>
    </SimContext.Provider>
  );
}

export default App;
