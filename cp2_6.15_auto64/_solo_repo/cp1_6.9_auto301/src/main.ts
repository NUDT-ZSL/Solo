/**
 * main.ts — 应用入口
 * 职责：初始化Canvas、事件监听、rAF动画循环、FPS监控与性能自适应、DOM控制面板绑定
 * 数据流向：
 *   DOM事件(Mouse/Touch/Slider/Button) → ParticleSystem API
 *   requestAnimationFrame → dt计算 → ParticleSystem.update() → .render()
 *   FPS滑动窗口采样 → 若<30FPS且粒子>300 → 降级策略(生成速率减半/阴影降质)
 */

import { ParticleSystem, SystemConfig } from './particleSystem';

const FPS_HISTORY_SIZE = 10;
const DOWNGRADE_PARTICLE_THRESHOLD = 300;
const DOWNGRADE_FPS_THRESHOLD = 30;

interface DOMRefs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gravitySlider: HTMLInputElement;
  gravityValue: HTMLSpanElement;
  repulsionSlider: HTMLInputElement;
  repulsionValue: HTMLSpanElement;
  spawnRateSlider: HTMLInputElement;
  spawnRateValue: HTMLSpanElement;
  clearBtn: HTMLButtonElement;
  fpsCounter: HTMLDivElement;
}

function initDOM(): DOMRefs {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Canvas element #canvas not found');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const $ = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el as T;
  };

  return {
    canvas,
    ctx,
    gravitySlider: $<HTMLInputElement>('gravitySlider'),
    gravityValue: $<HTMLSpanElement>('gravityValue'),
    repulsionSlider: $<HTMLInputElement>('repulsionSlider'),
    repulsionValue: $<HTMLSpanElement>('repulsionValue'),
    spawnRateSlider: $<HTMLInputElement>('spawnRateSlider'),
    spawnRateValue: $<HTMLSpanElement>('spawnRateValue'),
    clearBtn: $<HTMLButtonElement>('clearBtn'),
    fpsCounter: $<HTMLDivElement>('fpsCounter')
  };
}

function setupCanvas(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateSliderTrackGradient(
  slider: HTMLInputElement,
  hue: number
): void {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  const h1 = hue;
  const h2 = (hue + 60) % 360;
  slider.style.background = `linear-gradient(
    to right,
    hsl(${h1}, 80%, 70%) 0%,
    hsl(${h2}, 80%, 70%) ${pct}%,
    rgba(255,255,255,0.15) ${pct}%,
    rgba(255,255,255,0.15) 100%
  )`;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(
    w * 0.3, h * 0.25, 0,
    w * 0.5, h * 0.5, Math.max(w, h) * 0.8
  );
  grad.addColorStop(0, '#1a0a3e');
  grad.addColorStop(0.5, '#0a0a2e');
  grad.addColorStop(1, '#05051a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function bootstrap(): void {
  const dom = initDOM();

  const initialConfig: SystemConfig = {
    gravityStrength: parseFloat(dom.gravitySlider.value),
    repulsionStrength: parseFloat(dom.repulsionSlider.value),
    spawnRate: parseFloat(dom.spawnRateSlider.value)
  };

  const defaultShadowBlur = 10;
  let hasDowngraded = false;

  setupCanvas(dom.canvas);
  const W = window.innerWidth;
  const H = window.innerHeight;

  const system = new ParticleSystem(W, H, initialConfig);

  let lastTime = performance.now();
  const fpsHistory: number[] = [];
  let fpsUpdateAccumulator = 0;
  let currentFpsDisplay = '--';
  let lastHueUpdateHue = -1;

  function refreshAllSliderGradients(): void {
    const hue = system.getCurrentHue();
    if (Math.abs(hue - lastHueUpdateHue) < 10) return;
    lastHueUpdateHue = hue;
    updateSliderTrackGradient(dom.gravitySlider, hue);
    updateSliderTrackGradient(dom.repulsionSlider, (hue + 120) % 360);
    updateSliderTrackGradient(dom.spawnRateSlider, (hue + 240) % 360);
  }

  refreshAllSliderGradients();

  function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = dom.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function handlePointerDown(clientX: number, clientY: number): void {
    const { x, y } = getCanvasCoords(clientX, clientY);
    system.handleMouseDown(x, y);
  }

  function handlePointerMove(clientX: number, clientY: number): void {
    const { x, y } = getCanvasCoords(clientX, clientY);
    system.handleMouseMove(x, y);
  }

  function handlePointerUp(): void {
    system.handleMouseUp();
  }

  dom.canvas.addEventListener('mousedown', (e) => handlePointerDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', handlePointerUp);

  dom.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) handlePointerDown(t.clientX, t.clientY);
  }, { passive: false });

  dom.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) handlePointerMove(t.clientX, t.clientY);
  }, { passive: false });

  dom.canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handlePointerUp();
  }, { passive: false });

  dom.canvas.addEventListener('touchcancel', handlePointerUp);

  window.addEventListener('resize', () => {
    setupCanvas(dom.canvas);
    system.setCanvasSize(window.innerWidth, window.innerHeight);
  });

  dom.gravitySlider.addEventListener('input', () => {
    const v = parseFloat(dom.gravitySlider.value);
    system.gravityStrength = v;
    dom.gravityValue.textContent = v.toFixed(3);
    refreshAllSliderGradients();
  });

  dom.repulsionSlider.addEventListener('input', () => {
    const v = parseFloat(dom.repulsionSlider.value);
    system.repulsionStrength = v;
    dom.repulsionValue.textContent = v.toFixed(3);
    refreshAllSliderGradients();
  });

  dom.spawnRateSlider.addEventListener('input', () => {
    const v = parseFloat(dom.spawnRateSlider.value);
    system.spawnRate = hasDowngraded ? Math.max(10, v / 2) : v;
    dom.spawnRateValue.textContent = String(Math.round(v));
    refreshAllSliderGradients();
  });

  dom.clearBtn.addEventListener('click', () => {
    system.startClear(performance.now());
  });

  function handlePerformanceDowngrade(avgFps: number): void {
    const particleCount = system.getParticleCount();
    const shouldDowngrade =
      particleCount > DOWNGRADE_PARTICLE_THRESHOLD && avgFps < DOWNGRADE_FPS_THRESHOLD;

    if (shouldDowngrade && !hasDowngraded) {
      hasDowngraded = true;
      const currentSliderRate = parseFloat(dom.spawnRateSlider.value);
      system.spawnRate = Math.max(10, currentSliderRate / 2);
      system.shadowBlur = 5;
    } else if (!shouldDowngrade && hasDowngraded) {
      if (avgFps > 50) {
        hasDowngraded = false;
        const currentSliderRate = parseFloat(dom.spawnRateSlider.value);
        system.spawnRate = currentSliderRate;
        system.shadowBlur = defaultShadowBlur;
      }
    }
  }

  function loop(now: number): void {
    const dtMs = Math.min(50, now - lastTime);
    lastTime = now;
    const dt = dtMs / 1000;

    const instantFps = 1000 / Math.max(1, dtMs);
    fpsHistory.push(instantFps);
    if (fpsHistory.length > FPS_HISTORY_SIZE) fpsHistory.shift();

    fpsUpdateAccumulator += dtMs;
    if (fpsUpdateAccumulator >= 250) {
      fpsUpdateAccumulator = 0;
      const avg = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
      currentFpsDisplay = String(Math.round(avg));
      handlePerformanceDowngrade(avg);
    }

    system.update(dt, now);

    const w = window.innerWidth;
    const h = window.innerHeight;
    drawBackground(dom.ctx, w, h);
    system.render(dom.ctx);

    refreshAllSliderGradients();

    const particleCount = system.getParticleCount();
    dom.fpsCounter.textContent = `${currentFpsDisplay} FPS | 粒子: ${particleCount}${hasDowngraded ? ' (低性能模式)' : ''}`;

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', bootstrap);
