import { PixelEngine } from './core';
import { PixelEditor } from './editor';

function initApp(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container #app not found');
    return;
  }

  const engine = new PixelEngine();

  new PixelEditor({
    container,
    engine,
    pixelScale: 20,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
