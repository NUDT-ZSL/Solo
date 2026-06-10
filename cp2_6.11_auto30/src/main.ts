import {
  PixelChar,
  getPixelMap,
  renderCharToOffscreen,
  layoutChars,
  computeOptimalScale,
  getCharCellSize,
  BASE_PIXEL_SIZE,
} from './pixelEngine';
import {
  InteractionState,
  initInteraction,
  renderFrame,
  setCharsAppear,
  exportCanvas,
  updateGlobalColor,
} from './interaction';

const PALETTE = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C',
  '#3498DB', '#9B59B6', '#E91E63', '#4A6FA5', '#C5A55A',
  '#2C3E6B', '#34495E',
];

const DEFAULT_COLOR = '#4A6FA5';
const MAX_CHARS = 20;
const MAX_PER_ROW = 10;

let interactionState: InteractionState | null = null;
let rafId = 0;
let currentColor = DEFAULT_COLOR;
let isLoopRunning = false;

interface AppConfig {
  canvasBaseWidth: number;
  canvasHeight: number;
}

let config: AppConfig = {
  canvasBaseWidth: 1100,
  canvasHeight: 600,
};

function main(): void {
  setupResponsiveConfig();
  initUI();
  bindInputEvents();
  startRenderLoop();
  generatePixelArt('文字像素画8月S你好');
}

function setupResponsiveConfig(): void {
  const w = window.innerWidth;
  if (w < 1200) {
    config.canvasBaseWidth = 1000;
    const palette = document.getElementById('palette');
    if (palette) {
      palette.classList.remove('palette-left');
      palette.classList.add('palette-right');
    }
  } else {
    config.canvasBaseWidth = 1100;
    const palette = document.getElementById('palette');
    if (palette) {
      palette.classList.remove('palette-right');
      palette.classList.add('palette-left');
    }
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.width = config.canvasBaseWidth;
    canvas.height = config.canvasHeight;
    canvas.style.width = `${config.canvasBaseWidth}px`;
    canvas.style.height = `${config.canvasHeight}px`;
  }
}

function initUI(): void {
  const paletteEl = document.getElementById('palette') as HTMLDivElement;
  paletteEl.innerHTML = '';
  PALETTE.forEach((color, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    if (color === currentColor) swatch.classList.add('swatch-active');
    swatch.title = `颜色 ${idx + 1}`;
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('swatch-active'));
      swatch.classList.add('swatch-active');
      handlePaletteChange(color);
    });
    paletteEl.appendChild(swatch);
  });

  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  exportBtn.addEventListener('click', handleExport);

  const modalClose = document.getElementById('modalClose') as HTMLButtonElement;
  const modalCancel = document.getElementById('modalCancel') as HTMLButtonElement;
  const modalSave = document.getElementById('modalSave') as HTMLButtonElement;
  modalClose.addEventListener('click', hideExportModal);
  modalCancel.addEventListener('click', hideExportModal);
  modalSave.addEventListener('click', handleSaveImage);

  const overlay = document.getElementById('exportOverlay') as HTMLDivElement;
  overlay.addEventListener('click', (e: MouseEvent) => {
    if (e.target === overlay) hideExportModal();
  });
}

function bindInputEvents(): void {
  const input = document.getElementById('textInput') as HTMLInputElement;
  const btn = document.getElementById('generateBtn') as HTMLButtonElement;

  input.addEventListener('input', () => {
    if (input.value.length > MAX_CHARS) {
      input.value = input.value.substring(0, MAX_CHARS);
    }
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doGenerate();
    }
  });

  btn.addEventListener('click', doGenerate);
}

function doGenerate(): void {
  const input = document.getElementById('textInput') as HTMLInputElement;
  const btn = document.getElementById('generateBtn') as HTMLButtonElement;
  const text = input.value.trim();
  if (!text) return;

  btn.classList.add('loading');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span><span>生成中...</span>';
  btn.disabled = true;

  setTimeout(() => {
    generatePixelArt(text);
    btn.classList.remove('loading');
    btn.innerHTML = originalText;
    btn.disabled = false;
  }, 320);
}

function generatePixelArt(text: string): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  canvas.width = config.canvasBaseWidth;
  canvas.height = config.canvasHeight;

  const scale = computeOptimalScale(
    text.length,
    canvas.width,
    canvas.height,
    40,
    40,
    MAX_PER_ROW
  );
  const { w: cellW, h: cellH } = getCharCellSize(scale);
  const layout = layoutChars(text, canvas.width, scale, 40, MAX_PER_ROW);
  const pixelChars: PixelChar[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    const map = getPixelMap(code, ch);
    const offscreen = renderCharToOffscreen(map, currentColor, scale);
    const pos = layout[i];
    pixelChars.push({
      char: ch,
      charCode: code,
      x: pos.baseX,
      y: pos.baseY,
      baseX: pos.baseX,
      baseY: pos.baseY,
      pixelMap: map,
      color: currentColor,
      glowStartTime: -9999999,
      pulseStartTime: -9999999,
      offscreenCanvas: offscreen,
      charWidth: cellW,
      charHeight: cellH,
      pixelScale: scale,
    });
  }

  interactionState = initInteraction(canvas, pixelChars, currentColor);
  setCharsAppear(interactionState);
  renderFrame(interactionState, true);
}

function handlePaletteChange(color: string): void {
  currentColor = color;
  if (!interactionState) return;
  updateGlobalColor(interactionState, color, (pc, newColor) => {
    pc.offscreenCanvas = renderCharToOffscreen(pc.pixelMap, newColor, pc.pixelScale || BASE_PIXEL_SIZE);
    pc.color = newColor;
  });
  renderFrame(interactionState, true);
}

function handleExport(): void {
  if (!interactionState) return;
  const preview = document.getElementById('previewImg') as HTMLImageElement;
  showExportModal();

  exportCanvas(interactionState, (blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      preview.src = url;
      (preview as any)._blobUrl = url;
    }
  });
}

function showExportModal(): void {
  const overlay = document.getElementById('exportOverlay') as HTMLDivElement;
  overlay.classList.add('visible');
}

function hideExportModal(): void {
  const overlay = document.getElementById('exportOverlay') as HTMLDivElement;
  overlay.classList.remove('visible');
  const preview = document.getElementById('previewImg') as HTMLImageElement;
  if ((preview as any)._blobUrl) {
    URL.revokeObjectURL((preview as any)._blobUrl);
    (preview as any)._blobUrl = null;
  }
  preview.src = '';
}

function handleSaveImage(): void {
  if (!interactionState) return;
  const preview = document.getElementById('previewImg') as HTMLImageElement;
  const save = (blob: Blob | null) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `文字像素画_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    hideExportModal();
  };
  if ((preview as any)._blobUrl) {
    fetch((preview as any)._blobUrl)
      .then(r => r.blob())
      .then(save);
  } else {
    exportCanvas(interactionState, save);
  }
}

function startRenderLoop(): void {
  if (isLoopRunning) return;
  isLoopRunning = true;
  const loop = () => {
    if (interactionState) {
      renderFrame(interactionState);
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  setupResponsiveConfig();
  const input = document.getElementById('textInput') as HTMLInputElement;
  const t = input.value.trim() || '文字像素画8月S你好';
  generatePixelArt(t);
});

document.addEventListener('DOMContentLoaded', main);
if (document.readyState !== 'loading') {
  main();
}

export {};
