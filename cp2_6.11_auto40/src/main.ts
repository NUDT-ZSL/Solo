import { HourglassRenderer } from './hourglassRenderer';
import { ControlPanel } from './controlPanel';

function main(): void {
  const canvas = document.getElementById('sand-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const app = document.getElementById('app');
  if (!app) {
    console.error('App element not found');
    return;
  }

  const renderer = new HourglassRenderer(canvas);
  renderer.start();

  const controlPanel = new ControlPanel();
  controlPanel.mount(app);

  controlPanel.onFlowRateChange((v: number) => {
    renderer.setFlowRate(v);
  });

  controlPanel.onHueChange((v: number) => {
    renderer.setHue(v);
  });

  controlPanel.onShapeChange((v: number) => {
    renderer.setShapeFactor(v);
  });

  controlPanel.onReset(() => {
    renderer.reset();
  });

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  let mouseDown = false;
  let mouseDownPos = { x: 0, y: 0 };
  const clickThreshold = 5;

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    renderer.handleMouseMove(pos.x, pos.y);
  });

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    mouseDown = true;
    const pos = getCanvasPos(e.clientX, e.clientY);
    mouseDownPos = pos;
    renderer.handleMouseDown(pos.x, pos.y);
  });

  canvas.addEventListener('mouseup', (e: MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const dx = pos.x - mouseDownPos.x;
    const dy = pos.y - mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    renderer.handleMouseUp();

    if (dist < clickThreshold && mouseDown) {
      renderer.handleClick(pos.x, pos.y);
    }
    mouseDown = false;
  });

  canvas.addEventListener('mouseleave', () => {
    renderer.handleMouseUp();
    mouseDown = false;
  });

  let touchId: number | null = null;
  let touchStartPos = { x: 0, y: 0 };

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      const t = e.touches[0];
      touchId = t.identifier;
      const pos = getCanvasPos(t.clientX, t.clientY);
      touchStartPos = pos;
      mouseDownPos = pos;
      renderer.handleMouseDown(pos.x, pos.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touchId) {
        const pos = getCanvasPos(t.clientX, t.clientY);
        renderer.handleMouseMove(pos.x, pos.y);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touchId) {
        const pos = getCanvasPos(t.clientX, t.clientY);
        const dx = pos.x - mouseDownPos.x;
        const dy = pos.y - mouseDownPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        renderer.handleMouseUp();

        if (dist < clickThreshold) {
          renderer.handleClick(pos.x, pos.y);
        }
        touchId = null;
      }
    }
  }, { passive: false });

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      renderer.resize();
    }, 150);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
