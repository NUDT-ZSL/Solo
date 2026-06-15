import { TerrainManager } from './terrain';
import { PhysicsEngine } from './engine';
import { UIManager, Mode } from './ui';
import './styles.css';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const terrainManager = new TerrainManager(canvas.width, canvas.height);
const engine = new PhysicsEngine(terrainManager, canvas.width, canvas.height);
const ui = new UIManager(canvas, terrainManager, engine);

terrainManager.onChange = () => {
  ui.renderPreviewBar();
};

ui.setModeChangeCallback((_mode: Mode) => {
});

ui.setResetCallback(() => {
  engine.reset();
  terrainManager.reset();
  ui.updateToolbarUI();
  ui.renderPreviewBar();
});

ui.setLaunchCallback(() => {
});

ui.renderPreviewBar();
ui.handleResize();

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;
let currentFPS = 60;

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, '#1E2A38');
  grd.addColorStop(1, '#2D3B4F');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gameLoop(timestamp: number) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    currentFPS = frameCount / fpsTime;
    frameCount = 0;
    fpsTime = 0;
    ui.updateFPS(currentFPS);
  }

  engine.update(dt);

  drawBackground();

  if (ui.mode === 'editor') {
    terrainManager.drawGrid(ctx);
  }

  terrainManager.drawTerrains(ctx);
  engine.draw(ctx);
  ui.render();
  ui.updateStats();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
