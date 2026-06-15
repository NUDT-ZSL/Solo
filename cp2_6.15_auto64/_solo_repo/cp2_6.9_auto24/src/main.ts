import {
  generateBarcodeData,
  drawBarcode,
  generateSVG,
  type BarcodeData,
  type BarcodeOptions
} from './barcode';

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 300;
const MAX_BARCODE_WIDTH = 400;
const GAP = 1;
const GLOW_DURATION = 300;

interface State {
  text: string;
  colors: string[];
  density: number;
  opacity: number;
}

const state: State = {
  text: 'Hello',
  colors: ['#000000', '#3a7bd5', '#00d2ff'],
  density: 3,
  opacity: 1
};

const elements = {
  canvas: document.getElementById('barcodeCanvas') as HTMLCanvasElement,
  magnifierCanvas: document.getElementById('magnifierCanvas') as HTMLCanvasElement,
  magnifier: document.getElementById('magnifier') as HTMLDivElement,
  barcodeContainer: document.getElementById('barcodeContainer') as HTMLDivElement,
  barcodeGlow: document.getElementById('barcodeGlow') as HTMLDivElement,
  textInput: document.getElementById('textInput') as HTMLInputElement,
  color1: document.getElementById('color1') as HTMLInputElement,
  color2: document.getElementById('color2') as HTMLInputElement,
  color3: document.getElementById('color3') as HTMLInputElement,
  densitySlider: document.getElementById('densitySlider') as HTMLInputElement,
  densityValue: document.getElementById('densityValue') as HTMLSpanElement,
  opacitySlider: document.getElementById('opacitySlider') as HTMLInputElement,
  opacityValue: document.getElementById('opacityValue') as HTMLSpanElement,
  copyBtn: document.getElementById('copyBtn') as HTMLButtonElement,
  downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
  toast: document.getElementById('toast') as HTMLDivElement
};

let barcodeData: BarcodeData | null = null;
let glowTimeout: number | null = null;
let rafId: number | null = null;

function getBarcodeOptions(): BarcodeOptions {
  return {
    text: state.text,
    colors: [...state.colors],
    density: state.density,
    opacity: state.opacity,
    maxWidth: MAX_BARCODE_WIDTH,
    gap: GAP
  };
}

function showToast(message: string): void {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2000);
}

function triggerGlow(): void {
  elements.barcodeGlow.classList.add('active');
  if (glowTimeout !== null) {
    window.clearTimeout(glowTimeout);
  }
  glowTimeout = window.setTimeout(() => {
    elements.barcodeGlow.classList.remove('active');
    glowTimeout = null;
  }, GLOW_DURATION);
}

function render(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }

  rafId = requestAnimationFrame(() => {
    const options = getBarcodeOptions();
    barcodeData = generateBarcodeData(options);

    const ctx = elements.canvas.getContext('2d');
    if (ctx) {
      drawBarcode(ctx, barcodeData, options, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    updateMagnifier();

    rafId = null;
  });

  triggerGlow();
}

function updateMagnifier(): void {
  if (!barcodeData) return;
  const magCtx = elements.magnifierCanvas.getContext('2d');
  if (magCtx) {
    const options = getBarcodeOptions();
    drawBarcode(magCtx, barcodeData, options, 300, 600);
  }
}

function setupMagnifier(): void {
  const container = elements.barcodeContainer;
  const magnifier = elements.magnifier;

  container.addEventListener('mouseenter', () => {
    magnifier.style.display = 'block';
  });

  container.addEventListener('mouseleave', () => {
    magnifier.style.display = 'none';
  });

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const magSize = 150;
    const magX = x - magSize / 2;
    const magY = y - magSize / 2;

    magnifier.style.left = `${magX}px`;
    magnifier.style.top = `${magY}px`;

    const magCanvas = elements.magnifierCanvas;
    const scaleX = -(x / rect.width) * 300 + magSize / 2;
    const scaleY = -(y / rect.height) * 600 + magSize / 2;
    magCanvas.style.transform = `translate(${scaleX}px, ${scaleY}px) scale(1)`;
  });
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: number | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => fn(...args), delay);
  }) as T;
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getSafePrefix(): string {
  const prefix = state.text.slice(0, 3).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  return prefix || 'barcode';
}

async function copyPNG(): Promise<void> {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      elements.canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate blob'));
      }, 'image/png');
    });

    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('已复制PNG图片到剪贴板');
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getSafePrefix()}_${formatTimestamp()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('剪贴板不可用，已触发下载');
    }
  } catch {
    showToast('复制失败');
  }
}

function downloadSVG(): void {
  if (!barcodeData) return;

  const options = getBarcodeOptions();
  const svgContent = generateSVG(barcodeData, options, CANVAS_WIDTH, CANVAS_HEIGHT);
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${getSafePrefix()}_${formatTimestamp()}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('SVG已下载');
}

function bindEvents(): void {
  elements.textInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    state.text = target.value.slice(0, 20);
    if (target.value.length > 20) {
      target.value = state.text;
    }
    render();
  });

  const onColorChange = debounce(() => {
    state.colors = [elements.color1.value, elements.color2.value, elements.color3.value];
    render();
  }, 10);

  elements.color1.addEventListener('input', onColorChange);
  elements.color2.addEventListener('input', onColorChange);
  elements.color3.addEventListener('input', onColorChange);

  elements.densitySlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    state.density = parseInt(target.value, 10);
    elements.densityValue.textContent = String(state.density);
    render();
  });

  elements.opacitySlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    state.opacity = parseFloat(target.value);
    elements.opacityValue.textContent = state.opacity.toFixed(2);
    render();
  });

  elements.copyBtn.addEventListener('click', copyPNG);
  elements.downloadBtn.addEventListener('click', downloadSVG);

  elements.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    void copyPNG();
  });
}

function init(): void {
  bindEvents();
  setupMagnifier();
  render();
}

init();
