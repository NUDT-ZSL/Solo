import React, { useMemo } from 'react';
import { UIOverlay } from './UIOverlay';
import { GameEngine } from './GameEngine';

const App: React.FC = () => {
  const engine = useMemo(() => new GameEngine(), []);

  return <UIOverlay engine={engine} />;
};

export default App;
