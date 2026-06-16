import React, { useState } from 'react';
import GameCanvas from './GameCanvas';
import InfoPanel from './InfoPanel';

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [depth, setDepth] = useState(100);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b1d28',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <GameCanvas
          onScoreUpdate={setScore}
          onDepthUpdate={setDepth}
        />
        <InfoPanel depth={depth} score={score} />
      </div>
    </div>
  );
};

export default App;
