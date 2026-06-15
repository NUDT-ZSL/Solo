import './styles.css';
import { FractalEngine } from './engine/FractalEngine';
import { SceneRenderer } from './render/SceneRenderer';
import { ControlPanel } from './ui/ControlPanel';
import { ScreenshotButton } from './ui/ScreenshotButton';

class FractalForgeApp {
  private engine: FractalEngine;
  private renderer: SceneRenderer;
  private controlPanel: ControlPanel;
  private screenshotBtn: ScreenshotButton;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="ff-app">
        <div class="ff-canvas-container" id="ff-canvas"></div>
        <div class="ff-screenshot-container" id="ff-screenshot"></div>
        <div class="ff-panel-container" id="ff-panel"></div>
      </div>
    `;

    const canvasContainer = document.getElementById('ff-canvas')!;
    const panelContainer = document.getElementById('ff-panel')!;
    const screenshotContainer = document.getElementById('ff-screenshot')!;

    this.engine = new FractalEngine();

    this.renderer = new SceneRenderer(canvasContainer);

    this.controlPanel = new ControlPanel(panelContainer);
    this.controlPanel.setParams(this.engine.getParams());

    this.screenshotBtn = new ScreenshotButton(screenshotContainer);

    this.engine.initialGenerate();
  }

  dispose(): void {
    this.screenshotBtn.dispose();
    this.controlPanel.dispose();
    this.renderer.dispose();
    this.engine.dispose();
  }
}

let app: FractalForgeApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (root) {
    app = new FractalForgeApp(root);
  }
});

export { FractalForgeApp };
