import { Brush, PRESET_COLORS, hexToRgb } from './brush';
import { InkSystem } from './ink';

const BG_COLORS = ['#faf0e6', '#2c2c2c', '#000000'];

interface BgTransition {
  active: boolean;
  fromIdx: number;
  toIdx: number;
  progress: number;
  duration: number;
}

interface ClearAnimation {
  active: boolean;
  progress: number;
  duration: number;
  centerX: number;
  centerY: number;
}

function hexToRgbArr(hex: string): [number, number, number] {
  const c = hexToRgb(hex);
  return [c.r, c.g, c.b];
}

function lerpColor(
  fromHex: string,
  toHex: string,
  t: number
): [number, number, number] {
  const from = hexToRgbArr(fromHex);
  const to = hexToRgbArr(toHex);
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t)
  ];
}

const canvas = document.getElementById('ink-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const brush = new Brush();
const ink = new InkSystem();

let dpr = window.devicePixelRatio || 1;
let bgColorIdx = 0;

let bgTransition: BgTransition = {
  active: false,
  fromIdx: 0,
  toIdx: 0,
  progress: 0,
  duration: 30
};

let clearAnim: ClearAnimation = {
  active: false,
  progress: 0,
  duration: 60,
  centerX: 0,
  centerY: 0
};

let isCursorInCanvas = false;

const brushCursor = document.createElement('div');
brushCursor.style.cssText = `
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  border-radius: 50%;
  display: none;
  transition: box-shadow 0.15s ease;
`;
document.body.appendChild(brushCursor);

function resizeCanvas(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ink.canvasWidth = w;
  ink.canvasHeight = h;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updateBrushCursor(): void {
  const size = brush.state.size;
  const color = brush.state.colorHex;
  const alpha = brush.state.alpha;
  brushCursor.style.width = size + 'px';
  brushCursor.style.height = size + 'px';
  brushCursor.style.background = color;
  brushCursor.style.opacity = String(alpha * 0.6);
  brushCursor.style.boxShadow = `0 0 ${size * 0.8}px ${color}55`;
  brushCursor.style.border = `1px solid ${color}aa`;
}

function setCursorVisible(visible: boolean): void {
  isCursorInCanvas = visible;
  brushCursor.style.display = visible ? 'block' : 'none';
  canvas.style.cursor = visible ? 'none' : 'default';
}

function moveCursorTo(x: number, y: number): void {
  const s = brush.state.size;
  brushCursor.style.left = x - s / 2 + 'px';
  brushCursor.style.top = y - s / 2 + 'px';
}

canvas.addEventListener('mouseenter', () => setCursorVisible(true));
canvas.addEventListener('mouseleave', () => setCursorVisible(false));

function getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const pos = getCanvasPos(e);
  brush.updatePosition(pos.x, pos.y);
  moveCursorTo(e.clientX, e.clientY);
  if (brush.state.isDrawing) {
    const count = 5 + Math.floor(Math.random() * 11);
    ink.spawnParticles(brush.state, count);
  }
});

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button !== 0) return;
  brush.startDrawing();
  const pos = getCanvasPos(e);
  brush.updatePosition(pos.x, pos.y);
  const count = 5 + Math.floor(Math.random() * 11);
  ink.spawnParticles(brush.state, count);
});

window.addEventListener('mouseup', () => {
  if (brush.state.isDrawing) {
    brush.stopDrawing();
    ink.markCurrentStep();
  }
});

canvas.addEventListener(
  'touchstart',
  (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    const pos = getCanvasPos(t);
    brush.updatePosition(pos.x, pos.y);
    brush.startDrawing();
    const count = 5 + Math.floor(Math.random() * 11);
    ink.spawnParticles(brush.state, count);
    setCursorVisible(true);
    moveCursorTo(t.clientX, t.clientY);
  },
  { passive: false }
);

canvas.addEventListener(
  'touchmove',
  (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    const pos = getCanvasPos(t);
    brush.updatePosition(pos.x, pos.y);
    moveCursorTo(t.clientX, t.clientY);
    if (brush.state.isDrawing) {
      const count = 5 + Math.floor(Math.random() * 11);
      ink.spawnParticles(brush.state, count);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  (e: TouchEvent) => {
    e.preventDefault();
    if (brush.state.isDrawing) {
      brush.stopDrawing();
      ink.markCurrentStep();
    }
    setCursorVisible(false);
  },
  { passive: false }
);

function switchBackground(): void {
  if (bgTransition.active) return;
  bgTransition = {
    active: true,
    fromIdx: bgColorIdx,
    toIdx: (bgColorIdx + 1) % BG_COLORS.length,
    progress: 0,
    duration: 30
  };
}

function clearCanvasAnim(): void {
  if (clearAnim.active) return;
  clearAnim = {
    active: true,
    progress: 0,
    duration: 60,
    centerX: window.innerWidth / 2,
    centerY: window.innerHeight / 2
  };
  ink.clearAll();
}

function doUndo(): void {
  ink.undoLast();
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    doUndo();
    return;
  }
  if (e.key === ' ') {
    e.preventDefault();
    switchBackground();
    return;
  }
  if (e.key.toLowerCase() === 'c') {
    clearCanvasAnim();
    return;
  }
  if (e.key.toLowerCase() === 'r') {
    brush.setRandomColor();
    updateUI();
    updateBrushCursor();
    return;
  }
  const num = parseInt(e.key, 10);
  if (!isNaN(num) && num >= 1 && num <= 8) {
    brush.setColorByIndex(num - 1);
    updateUI();
    updateBrushCursor();
  }
});

const colorPreview = document.getElementById('color-preview') as HTMLDivElement;
const colorHex = document.getElementById('color-hex') as HTMLDivElement;
const swatchesEl = document.getElementById('swatches') as HTMLDivElement;
const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
const sizeValue = document.getElementById('size-value') as HTMLSpanElement;
const alphaSlider = document.getElementById('alpha-slider') as HTMLInputElement;
const alphaValue = document.getElementById('alpha-value') as HTMLSpanElement;
const spreadSlider = document.getElementById('spread-slider') as HTMLInputElement;
const spreadValue = document.getElementById('spread-value') as HTMLSpanElement;
const fadeSlider = document.getElementById('fade-slider') as HTMLInputElement;
const fadeValue = document.getElementById('fade-value') as HTMLSpanElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnBg = document.getElementById('btn-bg') as HTMLButtonElement;
const btnRandom = document.getElementById('btn-random') as HTMLButtonElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;

function buildSwatches(): void {
  swatchesEl.innerHTML = '';
  PRESET_COLORS.forEach((hex, i) => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.dataset.index = String(i);
    const inner = document.createElement('div');
    inner.className = 'swatch-inner';
    inner.style.background = hex;
    sw.appendChild(inner);
    sw.addEventListener('click', () => {
      brush.setColorByIndex(i);
      updateUI();
      updateBrushCursor();
    });
    swatchesEl.appendChild(sw);
  });
}

function updateUI(): void {
  colorPreview.style.background = brush.state.colorHex;
  colorHex.textContent = brush.state.colorHex.toUpperCase();
  sizeSlider.value = String(brush.state.size);
  sizeValue.textContent = String(brush.state.size);
  alphaSlider.value = String(brush.state.alpha);
  alphaValue.textContent = brush.state.alpha.toFixed(1);
  spreadSlider.value = String(ink.spreadMultiplier);
  spreadValue.textContent = ink.spreadMultiplier.toFixed(1);
  fadeSlider.value = String(ink.fadeMultiplier);
  fadeValue.textContent = ink.fadeMultiplier.toFixed(1);
  const swatchNodes = swatchesEl.querySelectorAll('.swatch');
  swatchNodes.forEach((node, i) => {
    if (PRESET_COLORS[i] === brush.state.colorHex) {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });
}

sizeSlider.addEventListener('input', () => {
  brush.setSize(parseFloat(sizeSlider.value));
  sizeValue.textContent = String(brush.state.size);
  updateBrushCursor();
});

alphaSlider.addEventListener('input', () => {
  brush.setAlpha(parseFloat(alphaSlider.value));
  alphaValue.textContent = brush.state.alpha.toFixed(1);
  updateBrushCursor();
});

spreadSlider.addEventListener('input', () => {
  ink.spreadMultiplier = parseFloat(spreadSlider.value);
  spreadValue.textContent = ink.spreadMultiplier.toFixed(1);
});

fadeSlider.addEventListener('input', () => {
  ink.fadeMultiplier = parseFloat(fadeSlider.value);
  fadeValue.textContent = ink.fadeMultiplier.toFixed(1);
});

btnClear.addEventListener('click', clearCanvasAnim);
btnBg.addEventListener('click', switchBackground);
btnRandom.addEventListener('click', () => {
  brush.setRandomColor();
  updateUI();
  updateBrushCursor();
});
btnSave.addEventListener('click', saveAsPNG);
btnUndo.addEventListener('click', doUndo);

function saveAsPNG(): void {
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d')!;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.fillStyle = BG_COLORS[bgColorIdx];
  octx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  octx.drawImage(canvas, 0, 0, window.innerWidth, window.innerHeight);
  const dataUrl = off.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `ink-art-${Date.now()}.png`;
  a.click();
}

function drawBackground(): void {
  let r: number, g: number, b: number;
  if (bgTransition.active) {
    const [lr, lg, lb] = lerpColor(
      BG_COLORS[bgTransition.fromIdx],
      BG_COLORS[bgTransition.toIdx],
      bgTransition.progress
    );
    r = lr;
    g = lg;
    b = lb;
  } else {
    const c = hexToRgbArr(BG_COLORS[bgColorIdx]);
    r = c[0];
    g = c[1];
    b = c[2];
  }
  document.body.style.background = `rgb(${r},${g},${b})`;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function renderClearMask(): void {
  if (!clearAnim.active) return;
  const maxRadius =
    Math.sqrt(
      clearAnim.centerX * clearAnim.centerX +
        clearAnim.centerY * clearAnim.centerY
    ) + 100;
  const radius = maxRadius * clearAnim.progress;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.rect(0, 0, window.innerWidth, window.innerHeight);
  ctx.arc(clearAnim.centerX, clearAnim.centerY, radius, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();
}

let rafId = 0;

function animate(): void {
  if (bgTransition.active) {
    bgTransition.progress += 1 / bgTransition.duration;
    if (bgTransition.progress >= 1) {
      bgTransition.progress = 1;
      bgColorIdx = bgTransition.toIdx;
      bgTransition.active = false;
    }
  }
  if (clearAnim.active) {
    clearAnim.progress += 1 / clearAnim.duration;
    if (clearAnim.progress >= 1) {
      clearAnim.progress = 1;
      clearAnim.active = false;
    }
  }

  ink.update();
  drawBackground();
  ink.render(ctx);
  renderClearMask();
  rafId = requestAnimationFrame(animate);
}

buildSwatches();
updateUI();
updateBrushCursor();
animate();
