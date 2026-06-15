import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { runTests } from './gameLogic.test';

if (import.meta.env.DEV) {
  console.log('[Dev] Running game logic unit tests...');
  runTests();
}

createRoot(document.getElementById('root')!).render(<App />);
