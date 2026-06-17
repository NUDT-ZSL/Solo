import { SceneRenderer } from './scene-renderer';
import { UIController } from './ui-control';
import { generateGalaxy } from './galaxy-generator';

function createStarfield() {
  const container = document.getElementById('starfield');
  if (!container) return;

  for (let i = 0; i < 200; i++) {
    const particle = document.createElement('div');
    particle.className = 'star-particle';

    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = 1;
    const minOpacity = 0.3 + Math.random() * 0.1;
    const maxOpacity = 0.6 + Math.random() * 0.1;
    const duration = 2 + Math.random() * 4;

    particle.style.left = `${x}%`;
    particle.style.top = `${y}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.setProperty('--min-opacity', minOpacity.toString());
    particle.style.setProperty('--max-opacity', maxOpacity.toString());
    particle.style.setProperty('--duration', `${duration}s`);

    container.appendChild(particle);
  }
}

function main() {
  createStarfield();

  const canvas = document.getElementById('galaxy-canvas') as HTMLCanvasElement;
  const renderer = new SceneRenderer(canvas);
  const ui = new UIController();

  let lowDetailActive = false;

  renderer.setFpsCallback((fps) => {
    ui.updateFps(fps);

    if (fps < 45 && !lowDetailActive) {
      lowDetailActive = true;
      renderer.setLowDetailMode(true);
    } else if (fps >= 50 && lowDetailActive) {
      lowDetailActive = false;
      renderer.setLowDetailMode(false);
    }
  });

  renderer.setBoundaryCallback((distance) => {
    if (distance > 80) {
      ui.showBoundaryNotice();
    }
  });

  ui.setGenerateCallback((params) => {
    const data = generateGalaxy(params);
    renderer.buildGalaxy(data);
    renderer.resetCamera();
  });

  const initialParams = ui.getParams();
  const initialData = generateGalaxy(initialParams);
  renderer.buildGalaxy(initialData);

  renderer.start();
}

main();
