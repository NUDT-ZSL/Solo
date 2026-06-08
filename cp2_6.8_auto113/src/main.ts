import {
  Branch,
  TreeParams,
  DEFAULT_PARAMS,
  PRESETS,
  generateTree,
  findBranchAtPoint,
  markBranchRemoved,
  regenerateFromParent,
  prepareGrowthAnimation,
  countVisibleBranches,
  createAnimationState,
  updateBranchesAnimation,
  getBranchRenderData,
  createTweenState,
  startTween,
  updateTween,
} from './tree';
import { UIController } from './ui';

class TreeApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private branches: Branch[] = [];
  private params: TreeParams = { ...DEFAULT_PARAMS };
  private animationState = createAnimationState();
  private tweenState = createTweenState();
  private ui: UIController;
  private needsRegen = true;

  constructor() {
    this.canvas = document.getElementById('tree-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;

    this.ui = new UIController({
      onParamsChange: (partial) => this.handleParamsChange(partial),
      onPresetSelect: (name) => this.handlePresetSelect(name),
      onGrowToggle: () => this.handleGrowToggle(),
      onExport: () => this.handleExport(),
      onReset: () => this.handleReset(),
    });

    this.setupCanvas();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  private setupCanvas(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.needsRegen = true;
  }

  private getOrigin(): { x: number; y: number } {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      x: width / 2,
      y: height * 0.9,
    };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const branch = findBranchAtPoint(this.branches, x, y, 10);
    if (branch && !branch.removed) {
      markBranchRemoved(branch);
      setTimeout(() => {
        this.branches = regenerateFromParent(this.branches, branch, this.params);
      }, 500);
    }
  }

  private handleParamsChange(partial: Partial<TreeParams>): void {
    this.params = { ...this.params, ...partial };
    this.needsRegen = true;
  }

  private handlePresetSelect(name: string): void {
    const preset = PRESETS[name];
    if (!preset) return;

    const targetParams: TreeParams = {
      ...this.params,
      branchAngle: preset.branchAngle,
      colorStart: preset.colorStart,
      colorMid: preset.colorMid,
      colorEnd: preset.colorEnd,
    };

    startTween(this.tweenState, this.params, targetParams, performance.now());
    this.needsRegen = true;
  }

  private handleGrowToggle(): void {
    if (!this.animationState.growing) {
      this.animationState.growing = true;
      this.animationState.paused = false;
      this.animationState.growthStartTime = performance.now();
      prepareGrowthAnimation(this.branches);
      this.ui.setGrowing(true);
    } else {
      this.animationState.paused = !this.animationState.paused;
      if (this.animationState.paused) {
        this.animationState.growthStartTime =
          performance.now() -
          (this.animationState.growthStartTime -
            this.animationState.growthStartTime);
      } else {
        this.animationState.growthStartTime = performance.now();
      }
      this.ui.setGrowing(!this.animationState.paused);
    }
  }

  private handleExport(): void {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.fillStyle = '#1A202C';
    exportCtx.fillRect(0, 0, 1920, 1080);

    const scaleX = 1920 / window.innerWidth;
    const scaleY = 1080 / window.innerHeight;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (1920 - window.innerWidth * scale) / 2;
    const offsetY = (1080 - window.innerHeight * scale) / 2;

    exportCtx.save();
    exportCtx.translate(offsetX, offsetY);
    exportCtx.scale(scale, scale);

    for (const branch of this.branches) {
      if (branch.removed || branch.opacity <= 0.01) continue;
      const data = getBranchRenderData(branch);
      exportCtx.beginPath();
      exportCtx.moveTo(data.startX, data.startY);
      exportCtx.lineTo(data.endX, data.endY);
      exportCtx.strokeStyle = data.color;
      exportCtx.lineWidth = data.thickness;
      exportCtx.lineCap = 'round';
      exportCtx.stroke();
    }

    exportCtx.restore();

    const link = document.createElement('a');
    link.download = `recursive-tree-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  private handleReset(): void {
    this.params = { ...DEFAULT_PARAMS };
    this.ui.resetToDefault();
    this.animationState.growing = false;
    this.animationState.paused = false;
    this.ui.setGrowing(false);
    this.needsRegen = true;
  }

  private regenerateTree(): void {
    const origin = this.getOrigin();
    this.branches = generateTree(origin.x, origin.y, this.params);
    this.needsRegen = false;
  }

  private updateBranchColors(): void {
    for (const branch of this.branches) {
      const t = branch.depth / branch.maxDepth;
      let color;
      if (t < 0.5) {
        color = lerpColorLocal(this.params.colorStart, this.params.colorMid, t * 2);
      } else {
        color = lerpColorLocal(
          this.params.colorMid,
          this.params.colorEnd,
          (t - 0.5) * 2
        );
      }
      color = applyHueShiftLocal(color, this.params.startHue);
      branch.color = color;
    }
  }

  private render(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#1A202C';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.lineCap = 'round';

    for (const branch of this.branches) {
      if (branch.removed || branch.opacity <= 0.01) continue;
      const data = getBranchRenderData(branch);
      this.ctx.beginPath();
      this.ctx.moveTo(data.startX, data.startY);
      this.ctx.lineTo(data.endX, data.endY);
      this.ctx.strokeStyle = data.color;
      this.ctx.lineWidth = data.thickness;
      this.ctx.stroke();
    }
  }

  private loop(timestamp: number): void {
    if (this.needsRegen) {
      this.regenerateTree();
    }

    const tweenResult = updateTween(this.tweenState, this.params, timestamp);
    if (tweenResult) {
      this.params = tweenResult;
      this.ui.setParams(this.params);
      this.updateBranchColors();
    }

    updateBranchesAnimation(this.branches, this.animationState, timestamp);

    this.render();

    const count = countVisibleBranches(this.branches);
    this.ui.setBranchCount(count);

    requestAnimationFrame(this.loop);
  }
}

function lerpColorLocal(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

function rgbToHslLocal(rgb: { r: number; g: number; b: number }): {
  h: number;
  s: number;
  l: number;
} {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, l };
}

function hslToRgbLocal(hsl: { h: number; s: number; l: number }): {
  r: number;
  g: number;
  b: number;
} {
  const { h, s, l } = hsl;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function applyHueShiftLocal(
  color: { r: number; g: number; b: number },
  hueShift: number
): { r: number; g: number; b: number } {
  const hsl = rgbToHslLocal(color);
  hsl.h = (hsl.h + hueShift) % 360;
  if (hsl.h < 0) hsl.h += 360;
  return hslToRgbLocal(hsl);
}

window.addEventListener('DOMContentLoaded', () => {
  new TreeApp();
});
