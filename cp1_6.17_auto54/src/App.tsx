import EcoVisualizer from './EcoVisualizer';
import ControlPanel from './ControlPanel';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌿 生态瓶模拟器</h1>
        <p>探索微型生态系统中的资源竞争与平衡策略</p>
      </header>
      <div className="app-main">
        <div className="visualizer-section">
          <EcoVisualizer />
        </div>
        <div className="control-section">
          <ControlPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
