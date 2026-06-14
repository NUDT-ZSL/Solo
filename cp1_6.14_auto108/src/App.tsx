import { useEffect } from 'react';
import { GameEngine } from './GameEngine';
import { Bridge } from './Bridge';
import { StatusBar } from './components/StatusBar';
import { BuildingPalette } from './components/BuildingPalette';
import { ColonyCanvas } from './components/ColonyCanvas';
import { ResourcePanel } from './components/ResourcePanel';
import './styles/global.css';

const engine = new GameEngine();
const bridge = new Bridge(engine);

function App() {
  useEffect(() => {
    engine.start();
    return () => {
      engine.stop();
      bridge.destroy();
    };
  }, []);

  return (
    <div className="app-container">
      <StatusBar bridge={bridge} />
      <div className="main-content">
        <BuildingPalette bridge={bridge} />
        <ColonyCanvas bridge={bridge} />
        <ResourcePanel bridge={bridge} />
      </div>
    </div>
  );
}

export default App;
