import { Heatmap, ViewState } from './heatmap';
import { ParticleSystem } from './particle';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
const timeValue = document.getElementById('time-value') as HTMLSpanElement;
const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
const windValue = document.getElementById('wind-value') as HTMLSpanElement;
const heatValueEl = document.getElementById('heat-value') as HTMLSpanElement;
const particleCountEl = document.getElementById('particle-count') as HTMLSpanElement;
const avgVelocityEl = document.getElementById('avg-velocity') as HTMLSpanElement;
const dataPanel = document.getElementById('data-panel') as HTMLDivElement;
const legendBar = document.getElementById('legend-bar') as HTMLCanvasElement;

const mobileToggleLegend = document.getElementById('mobile-toggle-legend') as HTMLButtonElement;
const mobileTogglePanel = document.getElementById('mobile-toggle-panel') as HTMLButtonElement;
const legendEl = document.getElementById('legend') as HTMLDivElement;
const panelEl = document.getElementById('data-panel') as HTMLDivElement;

let mapWidth = 0;
let mapHeight = 0;

const view: ViewState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;

let mouseX = 0;
let mouseY = 0;

let isPanelDragging = false;
let panelDragStartX = 0;
let panelDragStartY = 0;
let panelStartLeft = 0;
let panelStartTop = 0;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  mapWidth = rect.width;
  mapHeight = rect.height;

  view.offsetX = (rect.width - mapWidth * view.zoom) / 2;
  view.offsetY = (rect.height - mapHeight * view.zoom) / 2;

  if (heatmap) heatmap.resize(mapWidth, mapHeight);
  if (particles) particles.resize(mapWidth, mapHeight);
}

function drawLegendBar(): void {
  const lctx = legendBar.getContext('2d')!;
  const w = legendBar.width;
  const h = legendBar.height;
  const gradient = lctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, '#00FF88');
  gradient.addColorStop(1, '#FF3300');
  lctx.fillStyle = gradient;
  lctx.fillRect(0, 0, w, h);
}

let heatmap: Heatmap;
let particles: ParticleSystem;

function init(): void {
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  setTimeout(() => {
    resizeCanvas();
    heatmap = new Heatmap(canvas);
    particles = new ParticleSystem(canvas);
    drawLegendBar();
    startLoop();
  }, 0);
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartOffsetX = view.offsetX;
  dragStartOffsetY = view.offsetY;
});

window.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  if (isDragging) {
    view.offsetX = dragStartOffsetX + (e.clientX - dragStartX);
    view.offsetY = dragStartOffsetY + (e.clientY - dragStartY);
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('wheel', (e: WheelEvent) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const oldZoom = view.zoom;
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  let newZoom = oldZoom * zoomFactor;
  newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

  const mapX = (mx - view.offsetX) / oldZoom;
  const mapY = (my - view.offsetY) / oldZoom;

  view.zoom = newZoom;
  view.offsetX = mx - mapX * newZoom;
  view.offsetY = my - mapY * newZoom;
}, { passive: false });

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  if (e.touches.length === 1) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    dragStartOffsetX = view.offsetX;
    dragStartOffsetY = view.offsetY;
  }
}, { passive: true });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  if (isDragging && e.touches.length === 1) {
    view.offsetX = dragStartOffsetX + (e.touches[0].clientX - dragStartX);
    view.offsetY = dragStartOffsetY + (e.touches[0].clientY - dragStartY);
  }
}, { passive: true });

canvas.addEventListener('touchend', () => {
  isDragging = false;
});

timeSlider.addEventListener('input', () => {
  const hour = parseInt(timeSlider.value, 10);
  timeValue.textContent = `${hour.toString().padStart(2, '0')}:00`;
  if (heatmap) heatmap.setTimeOfDay(hour);
  if (particles) particles.setTimeOfDay(hour);
});

windSlider.addEventListener('input', () => {
  const angle = parseInt(windSlider.value, 10);
  windValue.textContent = `${angle}°`;
  if (particles) particles.setWindAngle(angle);
});

dataPanel.addEventListener('mousedown', (e: MouseEvent) => {
  isPanelDragging = true;
  panelDragStartX = e.clientX;
  panelDragStartY = e.clientY;
  const panelRect = dataPanel.getBoundingClientRect();
  panelStartLeft = panelRect.left;
  panelStartTop = panelRect.top;
  dataPanel.style.position = 'fixed';
  dataPanel.style.left = `${panelStartLeft}px`;
  dataPanel.style.top = `${panelStartTop}px`;
  dataPanel.style.right = 'auto';
  dataPanel.style.bottom = 'auto';
  e.preventDefault();
});

window.addEventListener('mousemove', (e: MouseEvent) => {
  if (isPanelDragging) {
    const dx = e.clientX - panelDragStartX;
    const dy = e.clientY - panelDragStartY;
    dataPanel.style.left = `${panelStartLeft + dx}px`;
    dataPanel.style.top = `${panelStartTop + dy}px`;
  }
});

window.addEventListener('mouseup', () => {
  isPanelDragging = false;
});

mobileToggleLegend.addEventListener('click', () => {
  if (legendEl.classList.contains('expanded')) {
    legendEl.classList.remove('expanded');
    legendEl.classList.add('collapsed');
    mobileToggleLegend.textContent = '图例 ▸';
  } else {
    legendEl.classList.remove('collapsed');
    legendEl.classList.add('expanded');
    mobileToggleLegend.textContent = '图例 ▾';
  }
});

mobileTogglePanel.addEventListener('click', () => {
  if (panelEl.classList.contains('expanded')) {
    panelEl.classList.remove('expanded');
    panelEl.classList.add('collapsed');
    mobileTogglePanel.textContent = '数据 ▸';
  } else {
    panelEl.classList.remove('collapsed');
    panelEl.classList.add('expanded');
    mobileTogglePanel.textContent = '数据 ▾';
  }
});

window.addEventListener('resize', resizeCanvas);

let lastTime = performance.now();
let frameCount = 0;

function startLoop(): void {
  function loop(now: number): void {
    const deltaTime = now - lastTime;
    lastTime = now;
    frameCount++;

    if (heatmap) heatmap.update(deltaTime, now);
    if (particles) particles.update(deltaTime, now);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (heatmap) heatmap.render(ctx, view);
    if (particles) particles.render(ctx, view);

    if (heatmap && !isDragging) {
      const heatValue = heatmap.getConcentrationAt(mouseX, mouseY, view);
      heatValueEl.textContent = heatValue.toString();
    }
    if (particles) {
      particleCountEl.textContent = particles.getParticleCount().toString();
      avgVelocityEl.textContent = particles.getAverageVelocity().toFixed(2);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

init();
