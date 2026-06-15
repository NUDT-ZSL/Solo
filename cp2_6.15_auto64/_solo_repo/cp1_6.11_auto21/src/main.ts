import { ProbeController } from './controller';
import type { ProbeControllerOptions } from './types';

let controller: ProbeController | null = null;
let mainCanvasDpr: number = 1;

function init(): void {
  const els = getRequiredElements();
  if (!els) {
    console.error('流光探针初始化失败：缺少必要的DOM元素');
    return;
  }

  mainCanvasDpr = window.devicePixelRatio || 1;
  resizeMainCanvas(els.mainCanvas, els.canvasSection);

  const controllerOptions: ProbeControllerOptions = {
    mainCanvas: els.mainCanvas,
    gradientCanvas: els.gradientCanvas,
    historyContainer: els.historyContainer,
    tooltip: els.tooltip,
    tooltipColor: els.tooltipColor,
    tooltipHex: els.tooltipHex,
    tooltipRgb: els.tooltipRgb,
    tooltipHsl: els.tooltipHsl,
    startColorSwatch: els.startColorSwatch,
    endColorSwatch: els.endColorSwatch,
    fineTuneSection: els.fineTuneSection,
    fineTunePreview: els.fineTunePreview,
    lockBtn: els.lockBtn,
    rSlider: els.rSlider,
    gSlider: els.gSlider,
    bSlider: els.bSlider,
    hSlider: els.hSlider,
    sSlider: els.sSlider,
    lSlider: els.lSlider,
    rInput: els.rInput,
    gInput: els.gInput,
    bInput: els.bInput,
    hInput: els.hInput,
    sInput: els.sInput,
    lInput: els.lInput,
    exportBtn: els.exportBtn,
    copyFeedback: els.copyFeedback,
    linearModeBtn: els.linearModeBtn,
    radialModeBtn: els.radialModeBtn
  };

  controller = new ProbeController(controllerOptions);

  setupUploadHandlers(els.uploadZone, els.fileInput, els.mainCanvas, els.loadingOverlay, els.canvasSection);
  setupClearHandler(els.clearBtn, els.confirmModal, els.modalCancel, els.modalConfirm);
  setupPanelToggle(els.panelToggle, els.sidePanel);

  window.addEventListener('resize', () => {
    const newDpr = window.devicePixelRatio || 1;
    const dprChanged = newDpr !== mainCanvasDpr;
    if (dprChanged) mainCanvasDpr = newDpr;
    resizeMainCanvas(els.mainCanvas, els.canvasSection);
  });

  setTimeout(() => {
    els.loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      els.loadingOverlay.style.display = 'none';
    }, 300);
  }, 500);
}

interface RequiredElements {
  mainCanvas: HTMLCanvasElement;
  gradientCanvas: HTMLCanvasElement;
  historyContainer: HTMLElement;
  uploadZone: HTMLElement;
  fileInput: HTMLInputElement;
  canvasSection: HTMLElement;
  loadingOverlay: HTMLElement;
  tooltip: HTMLElement;
  tooltipColor: HTMLElement;
  tooltipHex: HTMLElement;
  tooltipRgb: HTMLElement;
  tooltipHsl: HTMLElement;
  startColorSwatch: HTMLElement;
  endColorSwatch: HTMLElement;
  fineTuneSection: HTMLElement;
  fineTunePreview: HTMLElement;
  lockBtn: HTMLElement;
  rSlider: HTMLInputElement;
  gSlider: HTMLInputElement;
  bSlider: HTMLInputElement;
  hSlider: HTMLInputElement;
  sSlider: HTMLInputElement;
  lSlider: HTMLInputElement;
  rInput: HTMLInputElement;
  gInput: HTMLInputElement;
  bInput: HTMLInputElement;
  hInput: HTMLInputElement;
  sInput: HTMLInputElement;
  lInput: HTMLInputElement;
  exportBtn: HTMLElement;
  copyFeedback: HTMLElement;
  linearModeBtn: HTMLElement;
  radialModeBtn: HTMLElement;
  clearBtn: HTMLElement;
  confirmModal: HTMLElement;
  modalCancel: HTMLElement;
  modalConfirm: HTMLElement;
  panelToggle: HTMLElement;
  sidePanel: HTMLElement;
}

function getRequiredElements(): RequiredElements | null {
  const byId = <T extends HTMLElement>(id: string): T | null =>
    document.getElementById(id) as T | null;

  const result = {
    mainCanvas: byId<HTMLCanvasElement>('mainCanvas'),
    gradientCanvas: byId<HTMLCanvasElement>('gradientCanvas'),
    historyContainer: byId('colorHistory'),
    uploadZone: byId('uploadZone'),
    fileInput: byId<HTMLInputElement>('fileInput'),
    canvasSection: byId('canvasSection'),
    loadingOverlay: byId('loadingOverlay'),
    tooltip: byId('colorTooltip'),
    tooltipColor: byId('tooltipColor'),
    tooltipHex: byId('tooltipHex'),
    tooltipRgb: byId('tooltipRgb'),
    tooltipHsl: byId('tooltipHsl'),
    startColorSwatch: byId('startColorSwatch'),
    endColorSwatch: byId('endColorSwatch'),
    fineTuneSection: byId('fineTuneSection'),
    fineTunePreview: byId('fineTunePreview'),
    lockBtn: byId('lockBtn'),
    rSlider: byId<HTMLInputElement>('rSlider'),
    gSlider: byId<HTMLInputElement>('gSlider'),
    bSlider: byId<HTMLInputElement>('bSlider'),
    hSlider: byId<HTMLInputElement>('hSlider'),
    sSlider: byId<HTMLInputElement>('sSlider'),
    lSlider: byId<HTMLInputElement>('lSlider'),
    rInput: byId<HTMLInputElement>('rInput'),
    gInput: byId<HTMLInputElement>('gInput'),
    bInput: byId<HTMLInputElement>('bInput'),
    hInput: byId<HTMLInputElement>('hInput'),
    sInput: byId<HTMLInputElement>('sInput'),
    lInput: byId<HTMLInputElement>('lInput'),
    exportBtn: byId('exportBtn'),
    copyFeedback: byId('copyFeedback'),
    linearModeBtn: byId('linearModeBtn'),
    radialModeBtn: byId('radialModeBtn'),
    clearBtn: byId('clearBtn'),
    confirmModal: byId('confirmModal'),
    modalCancel: byId('modalCancel'),
    modalConfirm: byId('modalConfirm'),
    panelToggle: byId('panelToggle'),
    sidePanel: byId('sidePanel')
  };

  for (const [key, value] of Object.entries(result)) {
    if (!value) {
      console.error(`缺少元素: #${key}`);
      return null;
    }
  }
  return result as RequiredElements;
}

// 只设置物理尺寸，不做 context 缩放；避免与 probe.ts 的内部坐标计算冲突
function resizeMainCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  const dpr = mainCanvasDpr;
  const cssWidth = Math.max(1, Math.floor(rect.width));
  const cssHeight = Math.max(1, Math.floor(rect.height));

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
}

function setupUploadHandlers(
  uploadZone: HTMLElement,
  fileInput: HTMLInputElement,
  canvas: HTMLCanvasElement,
  loadingOverlay: HTMLElement,
  canvasSection: HTMLElement
): void {
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFile(file, uploadZone, canvas, loadingOverlay, canvasSection);
    }
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');

    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file, uploadZone, canvas, loadingOverlay, canvasSection);
    }
  });
}

function handleFile(
  file: File,
  uploadZone: HTMLElement,
  canvas: HTMLCanvasElement,
  loadingOverlay: HTMLElement,
  canvasSection: HTMLElement
): void {
  loadingOverlay.style.display = 'flex';
  loadingOverlay.style.opacity = '1';

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      resizeMainCanvas(canvas, canvasSection);

      uploadZone.style.display = 'none';
      canvas.style.display = 'block';

      if (controller) {
        controller.loadImage(img);
      }

      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 300);
      }, 200);
    };
    img.onerror = () => {
      loadingOverlay.style.display = 'none';
      console.error('图片加载失败');
    };
    img.src = e.target?.result as string;
  };
  reader.onerror = () => {
    loadingOverlay.style.display = 'none';
    console.error('文件读取失败');
  };
  reader.readAsDataURL(file);
}

function setupClearHandler(
  clearBtn: HTMLElement,
  modal: HTMLElement,
  cancelBtn: HTMLElement,
  confirmBtn: HTMLElement
): void {
  clearBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  confirmBtn.addEventListener('click', () => {
    if (controller) {
      controller.clearHistory();
    }
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

function setupPanelToggle(toggle: HTMLElement, panel: HTMLElement): void {
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
