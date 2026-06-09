import { ParticleSystem } from './particleSystem';

interface GameState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  system: ParticleSystem;
  mouseX: number;
  mouseY: number;
  mouseInTube: boolean;
  lastTime: number;
  fps: number;
  frameCount: number;
  fpsTime: number;
  eruptionFlash: number;
  running: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function init(): GameState {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  resizeCanvas(canvas);

  const system = new ParticleSystem(canvas.width, canvas.height);

  const state: GameState = {
    canvas,
    ctx,
    system,
    mouseX: -1000,
    mouseY: -1000,
    mouseInTube: false,
    lastTime: performance.now(),
    fps: 60,
    frameCount: 0,
    fpsTime: 0,
    eruptionFlash: 0,
    running: true
  };

  bindEvents(state);

  return state;
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
}

function bindEvents(state: GameState): void {
  const { canvas, system } = state;

  window.addEventListener('resize', () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    resizeCanvas(canvas);
    system.resize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.mouseInTube = system.isPointInTube(state.mouseX, state.mouseY);
  });

  window.addEventListener('mouseleave', () => {
    state.mouseX = -1000;
    state.mouseY = -1000;
    state.mouseInTube = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      system.triggerEruption();
      state.eruptionFlash = 1.0;
      flashInfoPanel();
    }
  });
}

function flashInfoPanel(): void {
  const panel = document.getElementById('infoPanel');
  if (panel) {
    panel.classList.add('flash');
    setTimeout(() => {
      panel.classList.remove('flash');
    }, 200);
  }
}

function updateStats(state: GameState): void {
  const stats = state.system.getStats();

  const fpsEl = document.getElementById('fps');
  const totalEl = document.getElementById('totalCount');
  const flowingEl = document.getElementById('flowingCount');
  const cooledEl = document.getElementById('cooledCount');
  const splashEl = document.getElementById('splashCount');
  const eruptionEl = document.getElementById('eruptionCount');
  const avgTempEl = document.getElementById('avgTemp');
  const tempIndicator = document.getElementById('tempIndicator');

  if (fpsEl) fpsEl.textContent = state.fps.toString();
  if (totalEl) totalEl.textContent = stats.total.toString();
  if (flowingEl) flowingEl.textContent = stats.flowing.toString();
  if (cooledEl) cooledEl.textContent = stats.cooled.toString();
  if (splashEl) splashEl.textContent = stats.splash.toString();
  if (eruptionEl) eruptionEl.textContent = stats.eruption.toString();

  const tempPercent = Math.round(stats.avgTemperature * 100);
  if (avgTempEl) avgTempEl.textContent = tempPercent + '%';
  if (tempIndicator) tempIndicator.style.left = tempPercent + '%';
}

function renderFlashOverlay(state: GameState): void {
  if (state.eruptionFlash > 0.01) {
    const { ctx, canvas } = state;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.eruptionFlash * 0.1})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function gameLoop(state: GameState): void {
  if (!state.running) return;

  const now = performance.now();
  const deltaTime = Math.min(now - state.lastTime, 50);
  state.lastTime = now;

  state.frameCount++;
  state.fpsTime += deltaTime;
  if (state.fpsTime >= 1000) {
    state.fps = state.frameCount;
    state.frameCount = 0;
    state.fpsTime = 0;
  }

  state.eruptionFlash = lerp(state.eruptionFlash, 0, 0.05);

  state.system.update(
    state.mouseX,
    state.mouseY,
    state.mouseInTube,
    deltaTime
  );

  const { ctx, canvas, system } = state;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  system.renderTube(ctx);
  system.render(ctx);
  renderFlashOverlay(state);

  ctx.restore();

  updateStats(state);

  requestAnimationFrame(() => gameLoop(state));
}

document.addEventListener('DOMContentLoaded', () => {
  const state = init();
  gameLoop(state);
});
