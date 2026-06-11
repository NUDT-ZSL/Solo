import { ProbeController } from './controller';

let controller: ProbeController | null = null;

function init(): void {
  const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const gradientCanvas = document.getElementById('gradientCanvas') as HTMLCanvasElement;
  const historyContainer = document.getElementById('colorHistory') as HTMLElement;
  const uploadZone = document.getElementById('uploadZone') as HTMLElement;
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const canvasSection = document.getElementById('canvasSection') as HTMLElement;
  const loadingOverlay = document.getElementById('loadingOverlay') as HTMLElement;
  
  const tooltip = document.getElementById('colorTooltip') as HTMLElement;
  const tooltipColor = document.getElementById('tooltipColor') as HTMLElement;
  const tooltipHex = document.getElementById('tooltipHex') as HTMLElement;
  const tooltipRgb = document.getElementById('tooltipRgb') as HTMLElement;
  const tooltipHsl = document.getElementById('tooltipHsl') as HTMLElement;
  
  const startColorSwatch = document.getElementById('startColorSwatch') as HTMLElement;
  const endColorSwatch = document.getElementById('endColorSwatch') as HTMLElement;
  
  const fineTuneSection = document.getElementById('fineTuneSection') as HTMLElement;
  const fineTunePreview = document.getElementById('fineTunePreview') as HTMLElement;
  const lockBtn = document.getElementById('lockBtn') as HTMLElement;
  
  const rSlider = document.getElementById('rSlider') as HTMLInputElement;
  const gSlider = document.getElementById('gSlider') as HTMLInputElement;
  const bSlider = document.getElementById('bSlider') as HTMLInputElement;
  const hSlider = document.getElementById('hSlider') as HTMLInputElement;
  const sSlider = document.getElementById('sSlider') as HTMLInputElement;
  const lSlider = document.getElementById('lSlider') as HTMLInputElement;
  
  const rInput = document.getElementById('rInput') as HTMLInputElement;
  const gInput = document.getElementById('gInput') as HTMLInputElement;
  const bInput = document.getElementById('bInput') as HTMLInputElement;
  const hInput = document.getElementById('hInput') as HTMLInputElement;
  const sInput = document.getElementById('sInput') as HTMLInputElement;
  const lInput = document.getElementById('lInput') as HTMLInputElement;
  
  const exportBtn = document.getElementById('exportBtn') as HTMLElement;
  const copyFeedback = document.getElementById('copyFeedback') as HTMLElement;
  const linearModeBtn = document.getElementById('linearModeBtn') as HTMLElement;
  const radialModeBtn = document.getElementById('radialModeBtn') as HTMLElement;
  
  const clearBtn = document.getElementById('clearBtn') as HTMLElement;
  const confirmModal = document.getElementById('confirmModal') as HTMLElement;
  const modalCancel = document.getElementById('modalCancel') as HTMLElement;
  const modalConfirm = document.getElementById('modalConfirm') as HTMLElement;
  
  const panelToggle = document.getElementById('panelToggle') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;

  resizeMainCanvas(mainCanvas, canvasSection);
  
  controller = new ProbeController({
    mainCanvas,
    gradientCanvas,
    historyContainer,
    tooltip,
    tooltipColor,
    tooltipHex,
    tooltipRgb,
    tooltipHsl,
    startColorSwatch,
    endColorSwatch,
    fineTuneSection,
    fineTunePreview,
    lockBtn,
    rSlider,
    gSlider,
    bSlider,
    hSlider,
    sSlider,
    lSlider,
    rInput,
    gInput,
    bInput,
    hInput,
    sInput,
    lInput,
    exportBtn,
    copyFeedback,
    linearModeBtn,
    radialModeBtn
  });

  setupUploadHandlers(uploadZone, fileInput, mainCanvas, loadingOverlay);
  setupClearHandler(clearBtn, confirmModal, modalCancel, modalConfirm);
  setupPanelToggle(panelToggle, sidePanel);
  
  window.addEventListener('resize', () => {
    resizeMainCanvas(mainCanvas, canvasSection);
    resizeGradientCanvas(gradientCanvas);
  });

  resizeGradientCanvas(gradientCanvas);
  
  setTimeout(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
  }, 500);
}

function resizeMainCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
}

function resizeGradientCanvas(canvas: HTMLCanvasElement): void {
  const container = canvas.parentElement;
  if (!container) return;
  
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = Math.max(rect.width * dpr, 300 * dpr);
  canvas.height = rect.height * dpr;
  canvas.style.width = `${Math.max(rect.width, 300)}px`;
  canvas.style.height = `${rect.height}px`;
  
  if (controller) {
    controller.resizeGradientCanvas(canvas.width, canvas.height);
  }
}

function setupUploadHandlers(
  uploadZone: HTMLElement,
  fileInput: HTMLInputElement,
  canvas: HTMLCanvasElement,
  loadingOverlay: HTMLElement
): void {
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFile(file, uploadZone, canvas, loadingOverlay);
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
      handleFile(file, uploadZone, canvas, loadingOverlay);
    }
  });
}

function handleFile(
  file: File,
  uploadZone: HTMLElement,
  canvas: HTMLCanvasElement,
  loadingOverlay: HTMLElement
): void {
  loadingOverlay.style.display = 'flex';
  loadingOverlay.style.opacity = '1';

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
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
    img.src = e.target?.result as string;
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

document.addEventListener('DOMContentLoaded', init);
