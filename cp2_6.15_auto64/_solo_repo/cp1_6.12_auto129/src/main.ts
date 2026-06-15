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

  const perfStats = document.createElement('div');
  perfStats.className = 'perf-stats';
  perfStats.innerHTML = `
    <div>FPS: <span class="fps">--</span></div>
    <div>Draw: <span class="draw">--</span>ms</div>
    <div>Points: <span class="points">0</span></div>
  `;
  root.appendChild(perfStats);

  const fpsSpan = perfStats.querySelector('.fps') as HTMLElement;
  const drawSpan = perfStats.querySelector('.draw') as HTMLElement;
  const pointsSpan = perfStats.querySelector('.points') as HTMLElement;

  function updatePerfDisplay() {
    const metrics = system.getPerformanceMetrics();
    fpsSpan.textContent = metrics.fps.toString();
    drawSpan.textContent = metrics.drawTime.toFixed(1);
    pointsSpan.textContent = system.getTracePoints().length.toString();
    requestAnimationFrame(updatePerfDisplay);
  }
  updatePerfDisplay();

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

  let lastRedrawTime = 0;
  system.onZoomChange(() => {
    const start = performance.now();
    lastRedrawTime = performance.now() - start;
    console.log(`Zoom change redraw time: ${lastRedrawTime.toFixed(2)}ms`);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
