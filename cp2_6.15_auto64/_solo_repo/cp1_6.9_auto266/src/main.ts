import { Renderer } from './renderer';
import { UIManager } from './ui';

const BASE_HUE = 180;
const HUE_SPREAD = 60;
const WAVE_COOLDOWN = 30;

function main(): void {
  const canvasEl = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvasEl) {
    throw new Error('Canvas 元素未找到');
  }
  const canvas = canvasEl;

  const renderer = new Renderer(canvas);
  let isFast = false;
  let lastWaveTime = 0;
  let isMouseDown = false;
  let currentHue = BASE_HUE;

  const ui = new UIManager({
    onReset: () => {
      renderer.clearWaves();
    },
    onSpeedToggle: () => {
      isFast = !isFast;
      renderer.setSpeedMultiplier(isFast ? 2 : 1);
      ui.updateSpeedButton(isFast);
    },
  });

  ui.updateSpeedButton(isFast);

  function handleMouseDown(e: MouseEvent): void {
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentHue = BASE_HUE + (Math.random() - 0.5) * HUE_SPREAD;
    emitWave(x, y);
  }

  function handleMouseMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    renderer.setMousePosition(x, y);

    if (isMouseDown) {
      emitWave(x, y);
    }
  }

  function handleMouseUp(): void {
    isMouseDown = false;
  }

  function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    isMouseDown = true;
    currentHue = BASE_HUE + (Math.random() - 0.5) * HUE_SPREAD;
    emitWave(x, y);
  }

  function handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    renderer.setMousePosition(x, y);
    if (isMouseDown) {
      emitWave(x, y);
    }
  }

  function handleTouchEnd(): void {
    isMouseDown = false;
  }

  function emitWave(x: number, y: number): void {
    const now = performance.now();
    if (now - lastWaveTime < WAVE_COOLDOWN) return;
    lastWaveTime = now;

    currentHue += (Math.random() - 0.5) * 10;
    if (currentHue < BASE_HUE - HUE_SPREAD) currentHue = BASE_HUE - HUE_SPREAD;
    if (currentHue > BASE_HUE + HUE_SPREAD) currentHue = BASE_HUE + HUE_SPREAD;

    renderer.addWave({
      x,
      y,
      hue: currentHue,
    });
  }

  function handleResize(): void {
    renderer.resize();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('resize', handleResize);

  let lastTime = performance.now();

  function loop(now: number): void {
    const deltaMs = now - lastTime;
    lastTime = now;
    const deltaTime = Math.min(deltaMs / 1000, 0.05);

    renderer.update(deltaTime);
    renderer.render();

    ui.updateWaveCount(renderer.getTotalCount());

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', main);
