import { initGameState, updateState } from './game';
import type { GameState } from './game';
import { render } from './renderer';
import type { RenderResult } from './renderer';
import { setupEventHandlers } from './events';

function resizeCanvas(canvas: HTMLCanvasElement, state: GameState) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.canvasW = w;
  state.canvasH = h;
}

function main() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const state = initGameState(w, h);
  resizeCanvas(canvas, state);

  let lastRr: RenderResult | null = null;

  window.addEventListener('resize', () => {
    resizeCanvas(canvas, state);
  });

  setupEventHandlers({
    state,
    canvas,
    setRenderResult: (r) => { lastRr = r; },
    getRenderResult: () => lastRr,
  });

  let lastTime = performance.now();
  let fpsTimer = 0;
  let frameCount = 0;
  let currentFps = 60;

  function loop(now: number) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 1) {
      currentFps = frameCount;
      frameCount = 0;
      fpsTimer = 0;
    }

    updateState(state, dt);

    ctx.clearRect(0, 0, state.canvasW, state.canvasH);
    lastRr = render(ctx, state, now);

    if (currentFps < 45) {
      ctx.fillStyle = 'rgba(255,100,100,0.8)';
    } else {
      ctx.fillStyle = 'rgba(0,255,170,0.4)';
    }
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${currentFps}fps`, state.canvasW - 8, state.canvasH - 8);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
