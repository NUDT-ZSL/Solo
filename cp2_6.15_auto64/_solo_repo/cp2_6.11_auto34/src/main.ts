import { GenerateConfig, DEFAULT_CONFIG, generate, exportPNG, HistoryEntry, TemplateType } from './generator';
import { createUI } from './ui';

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const controlPanel = document.getElementById('controlPanel')!;

let currentConfig: GenerateConfig = { ...DEFAULT_CONFIG };
let history: HistoryEntry[] = [];
let historyIdCounter = 0;

const ui = createUI(controlPanel, {
  onGenerate() {
    doGenerate();
  },
  onConfigChange(config: GenerateConfig) {
    currentConfig = config;
  },
  onTemplateChange(template: TemplateType) {
    currentConfig.template = template;
    doGenerate();
  },
  onExport() {
    exportPNG(canvas);
  },
  onHistoryRestore(index: number) {
    const entry = history[index];
    if (!entry) return;
    currentConfig = { ...entry.config };
    ctx.putImageData(entry.imageData, 0, 0);
    ui.updateConfig(currentConfig);
  },
}, currentConfig);

function doGenerate(): void {
  ui.showLoading();
  requestAnimationFrame(() => {
    const imageData = generate(ctx, currentConfig);
    addToHistory(imageData);
    ui.hideLoading();
  });
}

function addToHistory(imageData: ImageData): void {
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 100;
  thumbCanvas.height = 100;
  const thumbCtx = thumbCanvas.getContext('2d')!;
  thumbCtx.drawImage(canvas, 0, 0, 100, 100);
  const thumbnail = thumbCanvas.toDataURL('image/png');

  const entry: HistoryEntry = {
    id: ++historyIdCounter,
    thumbnail,
    config: { ...currentConfig },
    imageData,
  };

  history.unshift(entry);
  if (history.length > 10) {
    history = history.slice(0, 10);
  }

  ui.updateHistory(history);
}

doGenerate();
