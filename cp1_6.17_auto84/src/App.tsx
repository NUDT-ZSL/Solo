import React from 'react';
import Scene from './Scene';
import Controls from './Controls';

const App: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0A0A2E',
    }}>
      <style>{`
        @keyframes atomCardIn {
          from { transform: scale(0.8) translateY(8px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes loadingBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        select option:hover {
          background: #3A3A5E;
        }
      `}</style>
      <div style={{ width: '80%', height: '100%' }}>
        <Scene />
      </div>
      <Controls />
    </div>
  );
};

export default App;
