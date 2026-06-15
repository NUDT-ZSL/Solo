import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { runTests } from './gameLogic.test';
import { useGameStore } from './useGameStore';

if (import.meta.env.DEV) {
  console.log('[Dev] Running game logic unit tests...');
  runTests();
  (window as any).__gameStore = useGameStore;
}

createRoot(document.getElementById('root')!).render(<App />);
