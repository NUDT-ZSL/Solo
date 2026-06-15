import { GeometryEngine, GeometryParams } from './geometryEngine';

function init(): void {
  const container = document.getElementById('canvas');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const initialParams: GeometryParams = {
    speed: 2,
    scale: 1.0,
    symmetry: 6,
    color: '#ff6b35'
  };

  const engine = new GeometryEngine(canvas, initialParams);
  engine.start();

  const speedSlider = document.getElementById('speed') as HTMLInputElement | null;
  const scaleSlider = document.getElementById('scale') as HTMLInputElement | null;
  const symmetrySlider = document.getElementById('symmetry') as HTMLInputElement | null;
  const colorPicker = document.getElementById('colorPicker') as HTMLInputElement | null;
  const colorPickerBtn = document.getElementById('colorPickerBtn') as HTMLDivElement | null;

  const speedValue = document.getElementById('speedValue') as HTMLSpanElement | null;
  const scaleValue = document.getElementById('scaleValue') as HTMLSpanElement | null;
  const symmetryValue = document.getElementById('symmetryValue') as HTMLSpanElement | null;

  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      engine.setSpeed(value);
      speedValue.textContent = value.toFixed(2);
    });
  }

  if (scaleSlider && scaleValue) {
    scaleSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      engine.setScale(value);
      scaleValue.textContent = value.toFixed(2);
    });
  }

  if (symmetrySlider && symmetryValue) {
    symmetrySlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      engine.setSymmetry(value);
      symmetryValue.textContent = value.toString();
    });
  }

  if (colorPicker && colorPickerBtn) {
    colorPicker.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      engine.setColor(value);
      colorPickerBtn.style.background = value;
    });
  }

  let isMouseDown = false;
  let lastMouseX = 0;
  let accumulatedOffset = 0;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    isMouseDown = true;
    lastMouseX = e.clientX;
    accumulatedOffset = 0;
    engine.startDragging();
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isMouseDown) return;
    const deltaX = e.clientX - lastMouseX;
    lastMouseX = e.clientX;
    accumulatedOffset += deltaX * 0.15;
    engine.setMouseOffset(accumulatedOffset);
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown) {
      isMouseDown = false;
      engine.stopDragging();
    }
  });

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      isMouseDown = true;
      lastMouseX = e.touches[0].clientX;
      accumulatedOffset = 0;
      engine.startDragging();
    }
  });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isMouseDown || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - lastMouseX;
    lastMouseX = e.touches[0].clientX;
    accumulatedOffset += deltaX * 0.15;
    engine.setMouseOffset(accumulatedOffset);
  });

  window.addEventListener('touchend', () => {
    if (isMouseDown) {
      isMouseDown = false;
      engine.stopDragging();
    }
  });

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      engine.resize();
    }, 50);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
