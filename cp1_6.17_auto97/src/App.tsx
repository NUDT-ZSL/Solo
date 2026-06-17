import { ControlPanel } from './components/ControlPanel';
import { NebulaScene } from './components/NebulaScene';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <ControlPanel />
      <div className="scene-container">
        <NebulaScene />
      </div>
    </div>
  );
}

export default App;
