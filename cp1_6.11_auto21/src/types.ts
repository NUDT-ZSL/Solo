// ============================================================
// 流光探针 - 统一类型定义
// 各模块通过此文件共享接口，保证数据流一致性
// ============================================================

// -------------------- 颜色系统 --------------------

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorData {
  r: number;
  g: number;
  b: number;
  hex: string;
  hsl: HSL;
}

// -------------------- 渐变系统 --------------------

export type GradientType = 'linear' | 'radial';

export interface GradientConfig {
  startColor: string;
  endColor: string;
  type: GradientType;
}

// -------------------- 历史记录 --------------------

export interface HistoryItem {
  id: string;
  color: ColorData;
  locked: boolean;
  timestamp: number;
}

export type HistoryUpdateCallback = (items: HistoryItem[]) => void;
export type HistorySelectCallback = (item: HistoryItem) => void;
export type HistoryDeleteCallback = (id: string) => void;

// -------------------- Probe 对外 API --------------------

export interface ImageRect {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  scale: number;
}

export interface IColorProbe {
  loadImage(image: HTMLImageElement): void;
  getColorAt(clientX: number, clientY: number): ColorData | null;
  isInImage(clientX: number, clientY: number): boolean;
  getImagePosition(clientX: number, clientY: number): { x: number; y: number } | null;
  getImageRect(): ImageRect | null;
}

// -------------------- Gradient 对外 API --------------------

export interface IGradientGenerator {
  setConfig(config: Partial<GradientConfig>): void;
  getConfig(): GradientConfig;
  setSize(width: number, height: number): void;
  render(): void;
  generateColorSteps(steps: number): string[];
  generateCSS(): string;
  destroy(): void;
}

// -------------------- History 对外 API --------------------

export interface IColorHistory {
  setContainer(container: HTMLElement): void;
  setOnUpdate(callback: HistoryUpdateCallback): void;
  setOnSelect(callback: HistorySelectCallback): void;
  setOnDelete(callback: HistoryDeleteCallback): void;
  addColor(color: ColorData): HistoryItem;
  removeColor(id: string): boolean;
  updateColor(id: string, color: ColorData): boolean;
  toggleLock(id: string): boolean;
  clear(): void;
  getItems(): HistoryItem[];
  getItem(id: string): HistoryItem | undefined;
  getMaxItems(): number;
}

// -------------------- Controller 选项 --------------------

export interface ProbeControllerOptions {
  mainCanvas: HTMLCanvasElement;
  gradientCanvas: HTMLCanvasElement;
  historyContainer: HTMLElement;
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
}

// -------------------- 工具函数 --------------------

export type RgbToHex = (r: number, g: number, b: number) => string;
export type HexToRgb = (hex: string) => RGB | null;
export type RgbToHsl = (r: number, g: number, b: number) => HSL;
export type HslToRgb = (h: number, s: number, l: number) => RGB;
