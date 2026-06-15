import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import type { BabelStandalone } from '@babel/standalone';

declare global {
  interface Window {
    Babel: BabelStandalone;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

function checkBabelAvailability() {
  if (typeof window !== 'undefined' && !window.Babel) {
    console.warn('[ReactSandbox] Babel standalone 尚未加载，等待CDN资源...');
  }
}

checkBabelAvailability();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
