import { AuroraEngine } from './aurora';
import { ControlPanel } from './controls';

function main() {
  const canvas = document.getElementById('aurora-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #aurora-canvas not found');
    return;
  }

  const engine = new AuroraEngine(canvas);
  const controls = new ControlPanel(engine);
  controls.mount();

  let rafId: number;
  const updateInfoLoop = () => {
    controls.updateInfo();
    rafId = requestAnimationFrame(updateInfoLoop);
  };
  rafId = requestAnimationFrame(updateInfoLoop);

  let lastMoveTime = 0;
  const handleMouseMove = (e: MouseEvent) => {
    const now = performance.now();
    if (now - lastMoveTime < 8) return;
    lastMoveTime = now;
    engine.updateMouse(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      engine.updateMouse(t.clientX, t.clientY);
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      for (let i = 0; i < 5; i++) {
        engine.updateMouse(t.clientX, t.clientY);
      }
    }
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });

  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => engine.resize(), 100);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engine.stop();
      cancelAnimationFrame(rafId);
    } else {
      engine.start();
      rafId = requestAnimationFrame(updateInfoLoop);
    }
  });

  engine.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
