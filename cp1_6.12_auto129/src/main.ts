import { EpicycleSystem } from './EpicycleSystem';
import { UIControls } from './UIControls';

function init() {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }

  const canvas = document.createElement('canvas');
  root.appendChild(canvas);

  const system = new EpicycleSystem(canvas);
  const ui = new UIControls(root, system);

  ui.setOnExport(() => {
    const svgContent = system.exportSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `epicycleflow_${timestamp}.svg`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  system.start();

  let fps = 0;
  let lastFpsTime = performance.now();
  let frameCount = 0;

  function updateFps() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastFpsTime = now;
    }
    requestAnimationFrame(updateFps);
  }
  updateFps();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
