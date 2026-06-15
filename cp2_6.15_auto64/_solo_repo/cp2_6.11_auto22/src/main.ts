import { DrawCanvas, COLORS } from './drawCanvas';
import { ParticleCloud } from './particleCloud';

const loadingEl = document.getElementById('loading')!;
const appEl = document.getElementById('app')!;
const drawCanvas = document.getElementById('drawCanvas') as HTMLCanvasElement;
const threeCanvas = document.getElementById('threeCanvas') as HTMLCanvasElement;
const container = document.getElementById('canvasContainer')!;
const paletteEl = document.getElementById('colorPalette')!;
const brushSizeEl = document.getElementById('brushSize') as HTMLInputElement;
const brushSizeLabel = document.getElementById('brushSizeLabel')!;
const resetBtn = document.getElementById('resetBtn')!;
const tooltipEl = document.getElementById('tooltip')!;

function buildPalette(draw: DrawCanvas): void {
  let activeBtn: HTMLButtonElement | null = null;
  COLORS.forEach((color) => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.type = 'button';
    btn.style.setProperty('--swatch-color', color);
    btn.style.background = color;
    btn.title = color;
    if (color === draw.getColor()) {
      btn.classList.add('active');
      activeBtn = btn;
    }
    btn.addEventListener('click', () => {
      if (activeBtn) activeBtn.classList.remove('active');
      btn.classList.add('active');
      activeBtn = btn;
      draw.setColor(color);
    });
    paletteEl.appendChild(btn);
  });
}

function init(): void {
  const cloud = new ParticleCloud(threeCanvas, drawCanvas, container, tooltipEl);
  const draw = new DrawCanvas(drawCanvas, container, {
    onParticlesReady: (particles, segmentId) => {
      cloud.addParticles(particles, segmentId);
    },
    onSegmentRemoved: (segmentId) => {
      cloud.removeSegment(segmentId);
    }
  });

  buildPalette(draw);
  document.documentElement.style.setProperty('--brush-color', draw.getColor());
  brushSizeEl.value = String(draw.getWidth());
  brushSizeLabel.textContent = draw.getWidth() + 'px';

  brushSizeEl.addEventListener('input', () => {
    const v = parseInt(brushSizeEl.value, 10);
    draw.setWidth(v);
    brushSizeLabel.textContent = v + 'px';
  });

  resetBtn.addEventListener('click', () => {
    draw.reset();
    cloud.resetAll();
  });

  window.addEventListener('resize', () => {
    cloud.resize();
  });

  let lastT = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    cloud.update(dt);
    cloud.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  loadingEl.style.display = 'none';
  appEl.style.display = 'flex';
  cloud.resize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
