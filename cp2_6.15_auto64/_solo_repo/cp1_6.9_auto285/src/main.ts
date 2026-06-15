import { BubbleManager } from './BubbleManager';
import { Renderer } from './Renderer';

const HINT_FADE_DELAY = 3000;

function bootstrap(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('未找到 canvas 元素');
    return;
  }

  const hintPanel = document.getElementById('hint-panel');

  const manager = new BubbleManager();
  const renderer = new Renderer(canvas, manager);

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  const handleResize = (): void => {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    manager.setSize(viewportWidth, viewportHeight);
    renderer.resize(viewportWidth, viewportHeight, dpr);
  };
  handleResize();
  window.addEventListener('resize', handleResize);

  manager.mouse.x = viewportWidth * 0.5;
  manager.mouse.y = viewportHeight * 0.5;

  let hasInteracted = false;
  const setMouseFromEvent = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (touch) {
        return { x: touch.clientX, y: touch.clientY };
      }
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  window.addEventListener('mousemove', (e) => {
    const pos = setMouseFromEvent(e);
    manager.mouse.x = pos.x;
    manager.mouse.y = pos.y;
  });

  window.addEventListener('touchmove', (e) => {
    const pos = setMouseFromEvent(e);
    manager.mouse.x = pos.x;
    manager.mouse.y = pos.y;
    if (manager.mouse.isDown) {
      manager.handleDrag(pos.x, pos.y, performance.now());
    }
    e.preventDefault();
  }, { passive: false });

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    const pos = setMouseFromEvent(e);
    manager.mouse.x = pos.x;
    manager.mouse.y = pos.y;
    manager.mouse.isDown = true;
    manager.mouse.lastGenTime = 0;
    hasInteracted = true;
    if (e instanceof MouseEvent) {
      manager.handleClick(pos.x, pos.y);
    } else {
      manager.handleClick(pos.x, pos.y);
    }
  };

  const handlePointerUp = () => {
    manager.mouse.isDown = false;
  };

  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('touchstart', (e) => {
    handlePointerDown(e);
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', handlePointerUp);

  setTimeout(() => {
    if (hintPanel) {
      hintPanel.classList.add('fade-out');
      setTimeout(() => {
        hintPanel.style.display = 'none';
      }, 900);
    }
  }, HINT_FADE_DELAY);

  let lastTime = performance.now();
  let rafId = 0;
  let frameCount = 0;

  const tick = (now: number): void => {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    manager.update(dt, now);
    renderer.render(viewportWidth, viewportHeight, dt);

    frameCount++;
    if (frameCount % 300 === 0) {
      void hasInteracted;
    }

    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(rafId);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
