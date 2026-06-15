import { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';
import { UILayer } from './UILayer';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }
  const engine = engineRef.current;

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  return <UILayer engine={engine} />;
}
