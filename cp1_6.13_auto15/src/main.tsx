import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctor();
  }
  return audioContext;
}

const ctx = getAudioContext();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

const resumeOnFirstInteraction = () => {
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  window.removeEventListener('pointerdown', resumeOnFirstInteraction);
  window.removeEventListener('keydown', resumeOnFirstInteraction);
};
window.addEventListener('pointerdown', resumeOnFirstInteraction);
window.addEventListener('keydown', resumeOnFirstInteraction);

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App audioContext={ctx} />
  </React.StrictMode>
);
