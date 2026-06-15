import { StarCanvas } from './components/StarCanvas';
import { ControlPanel } from './components/ControlPanel';
import { AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  starSize: 0.15,
  burstSpeed: 1.0,
};

function init(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  appRoot.appendChild(canvasContainer);

  const starCanvas = new StarCanvas(canvasContainer, { ...DEFAULT_CONFIG });

  const controlPanel = new ControlPanel(
    appRoot,
    { ...DEFAULT_CONFIG },
    (config) => starCanvas.updateConfig(config),
    () => starCanvas.reset()
  );

  starCanvas.start();

  window.addEventListener('beforeunload', () => {
    starCanvas.dispose();
    controlPanel.dispose();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('fade-in');
  }
  init();
});
