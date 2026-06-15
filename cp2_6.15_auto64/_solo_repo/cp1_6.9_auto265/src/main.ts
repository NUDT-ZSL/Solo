import { Weaver, StrokeResult } from './weaver';
import { ParticleSystem } from './particle';
import { UIController } from './ui';

interface PointerState {
  drawing: boolean;
  lastX: number;
  lastY: number;
  lastT: number;
  pendingDir: number;
}

function main(): void {
  const canvasEl = document.getElementById('loom-canvas') as HTMLCanvasElement | null;
  if (!canvasEl) {
    console.error('找不到 #loom-canvas 元素');
    return;
  }
  const canvas: HTMLCanvasElement = canvasEl;

  const weaver = new Weaver(canvas);
  const particles = new ParticleSystem(canvas);
  const ui = new UIController();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  updateParticleBounds();

  const pointer: PointerState = {
    drawing: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    pendingDir: 0,
  };

  let rafId = 0;
  let lastFrame = performance.now();
  let strokeDirSmoothed = 0;

  ui.onReset(() => {
    weaver.reset();
    particles.reset();
    ui.resetState();
  });

  function updateParticleBounds(): void {
    const r = canvas.getBoundingClientRect();
    particles.resize(r.width, r.height);
  }

  function getPos(ev: PointerEvent | MouseEvent | Touch): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left),
      y: (ev.clientY - r.top),
    };
  }

  function handlePointerDown(x: number, y: number): void {
    if (x < 0 || y < 0 || x > canvas.clientWidth || y > canvas.clientHeight) return;
    pointer.drawing = true;
    pointer.lastX = x;
    pointer.lastY = y;
    pointer.lastT = performance.now();
    strokeDirSmoothed = 0;
    weaver.startStroke(x, y);
  }

  function handlePointerMove(x: number, y: number): void {
    if (!pointer.drawing) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - pointer.lastT) / 1000);
    const dx = x - pointer.lastX;
    const dy = y - pointer.lastY;
    const stepDir = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      let delta = stepDir - strokeDirSmoothed;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      strokeDirSmoothed += delta * Math.min(1, dt * 30);
    }
    const result: StrokeResult | null = weaver.moveStroke(x, y, dt);
    if (result && result.emitParticles) {
      const count = 2 + Math.floor(Math.random() * 4);
      const speedBoost = Math.min(2.2, 1 + (result.point.speed - 150) / 400);
      particles.emit(x, y, result.point.hue, strokeDirSmoothed || stepDir, count, speedBoost);
    }
    pointer.lastX = x;
    pointer.lastY = y;
    pointer.lastT = now;
  }

  function handlePointerUp(): void {
    if (!pointer.drawing) return;
    pointer.drawing = false;
    weaver.endStroke();
  }

  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const { x, y } = getPos(ev);
    handlePointerDown(x, y);
  });

  canvas.addEventListener('pointermove', (ev) => {
    const { x, y } = getPos(ev);
    handlePointerMove(x, y);
  });

  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  canvas.addEventListener('touchstart', (ev) => {
    if (!ev.touches.length) return;
    ev.preventDefault();
    const t = ev.touches[0];
    const { x, y } = getPos(t);
    handlePointerDown(x, y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (ev) => {
    if (!ev.touches.length) return;
    ev.preventDefault();
    const t = ev.touches[0];
    const { x, y } = getPos(t);
    handlePointerMove(x, y);
  }, { passive: false });

  canvas.addEventListener('touchend', (ev) => {
    ev.preventDefault();
    handlePointerUp();
  }, { passive: false });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      weaver.resize();
      updateParticleBounds();
    });
  });

  function frame(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    weaver.update(dt);
    particles.update(dt);
    weaver.render();
    particles.render(dpr);
    ui.update({
      ribbonCount: weaver.ribbonCount,
      uniqueColors: weaver.uniqueColors,
    });
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
    ui.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
