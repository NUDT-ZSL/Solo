import { ImageProcessor, type ExtractedPath, type Point, type BezierCurve } from './imageProcessor';
import { generateSVG, downloadSVG, renderPathToCanvas, curvesToPathData } from './svgExporter';

const processor = new ImageProcessor();
let paths: ExtractedPath[] = [];
let selectedPathId: number | null = null;
let draggingNodeIndex: number = -1;
let activeColorPickerPathId: number | null = null;
let tempHSL = { h: 0, s: 100, l: 50 };

const $ = (id: string) => document.getElementById(id)!;
const fileInput = $('fileInput') as HTMLInputElement;
const threshold = $('threshold') as HTMLInputElement;
const thresholdValue = $('thresholdValue');
const extractBtn = $('extractBtn') as HTMLButtonElement;
const exportBtn = $('exportBtn') as HTMLButtonElement;
const mainCanvas = $('mainCanvas') as HTMLCanvasElement;
const imageInfo = $('imageInfo');
const progressInfo = $('progressInfo');
const pathsContainer = $('pathsContainer');
const togglePanel = $('togglePanel') as HTMLButtonElement;
const controlPanel = $('controlPanel');
const colorPickerOverlay = $('colorPickerOverlay');
const colorWheel = $('colorWheel') as HTMLCanvasElement;
const hueSlider = $('hueSlider') as HTMLInputElement;
const satSlider = $('satSlider') as HTMLInputElement;
const lightSlider = $('lightSlider') as HTMLInputElement;
const hueVal = $('hueVal');
const satVal = $('satVal');
const lightVal = $('lightVal');
const cancelColor = $('cancelColor') as HTMLButtonElement;
const confirmColor = $('confirmColor') as HTMLButtonElement;

const mainCtx = mainCanvas.getContext('2d')!;
let lastFrameTime = 0;
let binarizeScheduled = false;

function renderAll() {
  const w = processor.getWidth();
  const h = processor.getHeight();
  if (w === 0 || h === 0) return;
  mainCanvas.width = w;
  mainCanvas.height = h;

  const binary = processor.binarize(parseInt(threshold.value));
  mainCtx.putImageData(binary, 0, 0);

  paths.forEach(p => {
    renderPathToCanvas(mainCtx, p.curves, p.color, 0.6, 2.5);
  });

  if (selectedPathId !== null) {
    const p = paths.find(x => x.id === selectedPathId);
    if (p) {
      renderPathNodes(p);
    }
  }
}

function renderPathNodes(p: ExtractedPath) {
  mainCtx.save();
  mainCtx.fillStyle = '#00D4FF';
  mainCtx.strokeStyle = '#fff';
  mainCtx.lineWidth = 1.5;
  p.curves.forEach((c, i) => {
    if (i === 0) {
      drawNode(c.p0);
    }
    drawNode(c.p1);
    drawNode(c.p2);
    drawNode(c.p3);
  });
  mainCtx.restore();
}

function drawNode(p: Point) {
  mainCtx.beginPath();
  mainCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  mainCtx.fill();
  mainCtx.stroke();
}

function scheduleBinarize() {
  if (binarizeScheduled) return;
  binarizeScheduled = true;
  const now = performance.now();
  const delay = Math.max(0, 33 - (now - lastFrameTime));
  setTimeout(() => {
    binarizeScheduled = false;
    lastFrameTime = performance.now();
    renderAll();
  }, delay);
}

threshold.addEventListener('input', () => {
  thresholdValue.textContent = threshold.value;
  scheduleBinarize();
});

fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert('文件大小不能超过10MB');
    return;
  }

  const fd = new FormData();
  fd.append('image', file);

  progressInfo.textContent = '上传中...';
  try {
    await fetch('/api/upload', { method: 'POST', body: fd });
  } catch {}

  const reader = new FileReader();
  reader.onprogress = (ev) => {
    if (ev.lengthComputable) {
      progressInfo.textContent = `加载中 ${Math.round((ev.loaded / ev.total) * 100)}%`;
    }
  };
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = processor.loadImage(img, 800);
      imageInfo.textContent = `${file.name} - ${width}×${height}`;
      progressInfo.textContent = '就绪';
      paths = [];
      selectedPathId = null;
      exportBtn.disabled = true;
      updatePathsList();
      renderAll();
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
});

extractBtn.addEventListener('click', () => {
  if (processor.getWidth() === 0) {
    alert('请先上传图片');
    return;
  }

  progressInfo.textContent = '提取路径中...';
  setTimeout(() => {
    const start = performance.now();
    paths = processor.extractPaths(5);
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    progressInfo.textContent = `提取完成: ${paths.length} 条路径 (${elapsed}s)`;
    exportBtn.disabled = paths.length === 0;
    selectedPathId = paths.length > 0 ? paths[0].id : null;
    updatePathsList();
    renderAll();
  }, 50);
});

exportBtn.addEventListener('click', () => {
  const svg = generateSVG(paths, processor.getWidth(), processor.getHeight());
  downloadSVG(svg, 'sketch_vector.svg');
});

togglePanel.addEventListener('click', () => {
  controlPanel.classList.toggle('open');
});

function updatePathsList() {
  if (paths.length === 0) {
    pathsContainer.innerHTML = '<p class="empty-hint">请先上传图片并提取路径</p>';
    return;
  }

  const palette = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA', '#FF9F43', '#5F27CD'];
  paths.forEach((p, i) => {
    if (p.color === '#00FFFF') {
      p.color = palette[i % palette.length];
    }
  });

  const grid = document.createElement('div');
  grid.className = 'paths-grid';

  paths.forEach(p => {
    const card = document.createElement('div');
    card.className = 'path-card' + (p.id === selectedPathId ? ' selected' : '');
    card.dataset.pathId = String(p.id);

    const thumb = document.createElement('div');
    thumb.className = 'path-thumbnail';
    const c = document.createElement('canvas');
    c.width = 100;
    c.height = 100;
    drawThumbnail(c, p);
    thumb.appendChild(c);

    const info = document.createElement('div');
    info.className = 'path-info';
    const name = document.createElement('span');
    name.className = 'path-name';
    name.textContent = `路径 ${p.id + 1}`;
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = p.color;
    swatch.dataset.pathId = String(p.id);
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      openColorPicker(p.id, p.color);
    });

    info.appendChild(name);
    info.appendChild(swatch);
    card.appendChild(thumb);
    card.appendChild(info);

    card.addEventListener('click', () => {
      selectedPathId = p.id;
      updatePathsList();
      renderAll();
    });

    grid.appendChild(card);
  });

  pathsContainer.innerHTML = '';
  pathsContainer.appendChild(grid);
}

function drawThumbnail(canvas: HTMLCanvasElement, p: ExtractedPath) {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 100, 100);
  const bw = p.bounds.maxX - p.bounds.minX;
  const bh = p.bounds.maxY - p.bounds.minY;
  if (bw === 0 || bh === 0) return;
  const scale = 80 / Math.max(bw, bh);
  const offX = (100 - bw * scale) / 2 - p.bounds.minX * scale;
  const offY = (100 - bh * scale) / 2 - p.bounds.minY * scale;
  ctx.save();
  ctx.translate(offX, offY);
  ctx.scale(scale, scale);
  renderPathToCanvas(ctx, p.curves, p.color, 1, 2 / scale);
  ctx.restore();
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function drawColorWheel() {
  const ctx = colorWheel.getContext('2d')!;
  const cx = 100, cy = 100, r = 95;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const dist = Math.hypot(x, y);
      if (dist > r) continue;
      const angle = Math.atan2(y, x) * 180 / Math.PI;
      const h = (angle + 360) % 360;
      const s = (dist / r) * 100;
      ctx.fillStyle = hslToHex(h, s, tempHSL.l);
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  const selHue = tempHSL.h * Math.PI / 180;
  const selR = (tempHSL.s / 100) * r;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(selHue) * selR, cy + Math.sin(selHue) * selR, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function openColorPicker(pathId: number, currentColor: string) {
  activeColorPickerPathId = pathId;
  const hsl = hexToHSL(currentColor);
  tempHSL = { ...hsl };
  hueSlider.value = String(hsl.h);
  satSlider.value = String(hsl.s);
  lightSlider.value = String(hsl.l);
  hueVal.textContent = String(hsl.h);
  satVal.textContent = String(hsl.s);
  lightVal.textContent = String(hsl.l);
  drawColorWheel();
  colorPickerOverlay.classList.add('active');
}

function closeColorPicker() {
  colorPickerOverlay.classList.remove('active');
  activeColorPickerPathId = null;
}

hueSlider.addEventListener('input', () => {
  tempHSL.h = parseInt(hueSlider.value);
  hueVal.textContent = hueSlider.value;
  drawColorWheel();
});

satSlider.addEventListener('input', () => {
  tempHSL.s = parseInt(satSlider.value);
  satVal.textContent = satSlider.value;
  drawColorWheel();
});

lightSlider.addEventListener('input', () => {
  tempHSL.l = parseInt(lightSlider.value);
  lightVal.textContent = lightSlider.value;
  drawColorWheel();
});

colorWheel.addEventListener('click', (e) => {
  const rect = colorWheel.getBoundingClientRect();
  const x = e.clientX - rect.left - 100;
  const y = e.clientY - rect.top - 100;
  const dist = Math.hypot(x, y);
  if (dist <= 95) {
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    tempHSL.h = Math.round((angle + 360) % 360);
    tempHSL.s = Math.round((dist / 95) * 100);
    hueSlider.value = String(tempHSL.h);
    satSlider.value = String(tempHSL.s);
    hueVal.textContent = String(tempHSL.h);
    satVal.textContent = String(tempHSL.s);
    drawColorWheel();
  }
});

cancelColor.addEventListener('click', closeColorPicker);

confirmColor.addEventListener('click', () => {
  if (activeColorPickerPathId !== null) {
    const p = paths.find(x => x.id === activeColorPickerPathId);
    if (p) {
      p.color = hslToHex(tempHSL.h, tempHSL.s, tempHSL.l);
      updatePathsList();
      renderAll();
    }
  }
  closeColorPicker();
});

colorPickerOverlay.addEventListener('click', (e) => {
  if (e.target === colorPickerOverlay) closeColorPicker();
});

mainCanvas.addEventListener('mousedown', (e) => {
  if (selectedPathId === null) return;
  const rect = mainCanvas.getBoundingClientRect();
  const scaleX = mainCanvas.width / rect.width;
  const scaleY = mainCanvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const p = paths.find(x => x.id === selectedPathId);
  if (!p) return;

  for (let ci = 0; ci < p.curves.length; ci++) {
    const c = p.curves[ci];
    const nodes = [
      { key: 'p0', pt: c.p0 },
      { key: 'p1', pt: c.p1 },
      { key: 'p2', pt: c.p2 },
      { key: 'p3', pt: c.p3 },
    ] as const;
    for (const n of nodes) {
      if (Math.hypot(mx - n.pt.x, my - n.pt.y) < 8) {
        draggingNodeIndex = ci * 4 + (['p0', 'p1', 'p2', 'p3'].indexOf(n.key));
        return;
      }
    }
  }
});

mainCanvas.addEventListener('mousemove', (e) => {
  if (draggingNodeIndex < 0 || selectedPathId === null) return;
  const rect = mainCanvas.getBoundingClientRect();
  const scaleX = mainCanvas.width / rect.width;
  const scaleY = mainCanvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const p = paths.find(x => x.id === selectedPathId);
  if (!p) return;

  const ci = Math.floor(draggingNodeIndex / 4);
  const ni = draggingNodeIndex % 4;
  const keys: (keyof BezierCurve)[] = ['p0', 'p1', 'p2', 'p3'];
  const key = keys[ni];
  p.curves[ci][key] = { x: mx, y: my };

  if (ni === 3 && ci < p.curves.length - 1) {
    p.curves[ci + 1].p0 = { x: mx, y: my };
  }
  if (ni === 0 && ci > 0) {
    p.curves[ci - 1].p3 = { x: mx, y: my };
  }

  renderAll();
});

window.addEventListener('mouseup', () => {
  if (draggingNodeIndex >= 0) {
    draggingNodeIndex = -1;
    updatePathsList();
  }
});

progressInfo.textContent = '就绪';
