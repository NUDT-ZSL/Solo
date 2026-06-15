import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function initAudioContext(): Promise<void> {
  try {
    const AudioCtx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const testCtx = new AudioCtx();
    if (testCtx.state === 'suspended') {
      await testCtx.resume();
    }
    testCtx.close().catch(() => {});
  } catch (e) {
    console.warn('AudioContext pre-init failed:', e);
  }
}

function initApp(): void {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    console.error('Root element #root not found');
    return;
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAudioContext();
    initApp();
  });
} else {
  initAudioContext();
  initApp();
}
