import {
  TreeParams,
  TreeData,
  Branch,
  generateTree,
  findBranchAtPoint,
  countVisibleBranches,
  collectDescendants,
  exportToSVG
} from './fractalTree';
import { ControlsManager, Preset } from './controls';
import { AnimationController } from './animation';

const MAX_UNDO_STACK = 10;

interface PruneUndoEntry {
  branchIds: string[];
}

class FractalTreeApp {
  private canvas: HTMLCanvasElement;
  private animation: AnimationController;
  private controls: ControlsManager;

  private currentParams: TreeParams;
  private tree: TreeData | null = null;
  private rootX: number = 0;
  private rootY: number = 0;

  private pruneHistory: PruneUndoEntry[] = [];
  private totalPruned: number = 0;

  private hoverTimeout: number | null = null;
  private hoveredBranch: Branch | null = null;

  private isMouseDown: boolean = false;
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;

  constructor() {
    this.canvas = document.getElementById('fractal-canvas') as HTMLCanvasElement;
    this.animation = new AnimationController(this.canvas);

    this.currentParams = {
      depth: 6,
      angle: 30,
      lengthRatio: 0.7,
      trunkLength: 50,
      randomOffset: 0
    };

    this.controls = new ControlsManager({
      onParamChange: this.handleParamChange.bind(this),
      onPresetSelect: this.handlePresetSelect.bind(this),
      onPruneModeToggle: this.handlePruneModeToggle.bind(this),
      onUndoPrune: this.handleUndoPrune.bind(this),
      onExportSVG: this.handleExportSVG.bind(this),
      onExportPNG: this.handleExportPNG.bind(this)
    });

    this.animation.setParamsChangeCallback((tweenedParams) => {
      const rounded: Partial<TreeParams> = {};
      if (tweenedParams.depth !== undefined) {
        rounded.depth = Math.round(tweenedParams.depth);
      }
      if (tweenedParams.angle !== undefined) {
        rounded.angle = Math.round(tweenedParams.angle);
      }
      if (tweenedParams.lengthRatio !== undefined) {
        rounded.lengthRatio = parseFloat(tweenedParams.lengthRatio.toFixed(2));
      }
      if (tweenedParams.trunkLength !== undefined) {
        rounded.trunkLength = Math.round(tweenedParams.trunkLength);
      }
      if (tweenedParams.randomOffset !== undefined) {
        rounded.randomOffset = tweenedParams.randomOffset;
      }
      this.updateParamsSilently(rounded);
      this.rebuildTree();
    });

    this.setupCanvas();
    this.bindCanvasEvents();
    this.generateInitialTree();
  }

  private setupCanvas(): void {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';

      if (this.tree) {
        this.animation.render();
      }
    };

    resize();
    window.addEventListener('resize', resize);
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      const rect = this.canvas.getBoundingClientRect();
      this.mouseDownX = e.clientX - rect.left;
      this.mouseDownY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (!this.isMouseDown) return;
      this.isMouseDown = false;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dx = Math.abs(x - this.mouseDownX);
      const dy = Math.abs(y - this.mouseDownY);

      if (dx > 5 || dy > 5) return;

      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      this.clearHoverTimeout();
      this.setHoveredBranch(null);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.controls.isPruneMode()) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.clearHoverTimeout();
        this.hoverTimeout = window.setTimeout(() => {
          this.handleMouseMove(x, y);
        }, 50);
      } else if (this.hoveredBranch !== null) {
        this.setHoveredBranch(null);
      }
    });
  }

  private clearHoverTimeout(): void {
    if (this.hoverTimeout !== null) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  private handleClick(x: number, y: number): void {
    if (this.animation.isAnimating()) return;

    if (this.controls.isPruneMode() && this.tree) {
      const branch = findBranchAtPoint(this.tree, x, y);
      if (branch) {
        this.pruneBranch(branch);
        return;
      }
    }

    this.regrowAt(x, y);
  }

  private handleMouseMove(x: number, y: number): void {
    if (!this.tree) return;

    const branch = findBranchAtPoint(this.tree, x, y);
    this.setHoveredBranch(branch);
  }

  private setHoveredBranch(branch: Branch | null): void {
    if (this.hoveredBranch?.id === branch?.id) return;
    this.hoveredBranch = branch;
    this.animation.setHighlightedBranch(branch);
    if (!this.animation.isAnimating()) {
      this.animation.render();
    }
  }

  private generateInitialTree(): void {
    this.rootX = window.innerWidth / 2;
    this.rootY = window.innerHeight * 0.85;
    this.rebuildTree();
    this.animation.setTree(this.tree);
    this.animation.startGrowAnimation(this.calculateGrowDuration());
  }

  private regrowAt(x: number, y: number): void {
    this.rootX = x;
    this.rootY = y;
    this.pruneHistory = [];
    this.totalPruned = 0;
    this.controls.setPrunedCount(0);
    this.rebuildTree();
    this.animation.setTree(this.tree);
    this.animation.startGrowAnimation(this.calculateGrowDuration());
  }

  private calculateGrowDuration(): number {
    const perLevel = 200;
    const maxDuration = 3000;
    return Math.min(maxDuration, this.currentParams.depth * perLevel);
  }

  private rebuildTree(): void {
    this.pruneHistory = [];
    this.totalPruned = 0;
    this.controls.setPrunedCount(0);
    this.tree = generateTree(this.currentParams, this.rootX, this.rootY);
    this.animation.setTree(this.tree);
    if (!this.animation.isAnimating()) {
      this.animation.render();
    }
  }

  private handleParamChange(params: Partial<TreeParams>): void {
    this.updateParamsSilently(params);
    this.rebuildTree();
  }

  private updateParamsSilently(params: Partial<TreeParams>): void {
    this.currentParams = {
      ...this.currentParams,
      ...params
    };
  }

  private handlePresetSelect(preset: Preset, currentParams: TreeParams): void {
    const endParams = {
      depth: preset.params.depth ?? currentParams.depth,
      angle: preset.params.angle ?? currentParams.angle,
      lengthRatio: preset.params.lengthRatio ?? currentParams.lengthRatio,
      trunkLength: preset.params.trunkLength ?? currentParams.trunkLength,
      randomOffset: preset.params.randomOffset ?? 0
    };

    this.controls.updateParams(endParams);

    this.animation.startParamsTween(currentParams, endParams, 500).then(() => {
      this.currentParams = {
        depth: endParams.depth,
        angle: endParams.angle,
        lengthRatio: endParams.lengthRatio,
        trunkLength: endParams.trunkLength,
        randomOffset: endParams.randomOffset
      };
      this.rebuildTree();
    });
  }

  private handlePruneModeToggle(_enabled: boolean): void {
    if (!_enabled) {
      this.setHoveredBranch(null);
    }
    this.canvas.style.cursor = _enabled ? 'pointer' : 'crosshair';
  }

  private pruneBranch(branch: Branch): void {
    if (!this.tree) return;

    const descendants = collectDescendants(branch);

    if (this.pruneHistory.length >= MAX_UNDO_STACK) {
      this.pruneHistory.shift();
    }
    this.pruneHistory.push({
      branchIds: descendants.map((b) => b.id)
    });

    this.totalPruned += descendants.length;
    this.controls.setPrunedCount(this.totalPruned);

    this.animation.startPruneAnimation(branch, 300).then(() => {
      this.animation.render();
    });
  }

  private handleUndoPrune(): void {
    if (!this.tree || this.pruneHistory.length === 0) return;

    const entry = this.pruneHistory.pop();
    if (!entry) return;

    let restoredCount = 0;
    for (const id of entry.branchIds) {
      const branch = this.tree.allBranches.find((b) => b.id === id);
      if (branch && branch.pruned) {
        branch.pruned = false;
        restoredCount++;
      }
    }

    this.totalPruned = Math.max(0, this.totalPruned - restoredCount);
    this.controls.setPrunedCount(this.totalPruned);
    this.animation.render();
  }

  private handleExportSVG(): void {
    if (!this.tree) return;

    const rect = this.canvas.getBoundingClientRect();
    const svgContent = exportToSVG(this.tree, Math.round(rect.width), Math.round(rect.height));

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, `fractal-tree-${Date.now()}.svg`);
    URL.revokeObjectURL(url);

    this.controls.showExportToast();
  }

  private handleExportPNG(): void {
    if (!this.tree) return;

    this.animation.render();

    const dpr = window.devicePixelRatio || 1;
    const tempCanvas = document.createElement('canvas');
    const rect = this.canvas.getBoundingClientRect();
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.fillStyle = '#1A202C';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const sourceCtx = this.canvas.getContext('2d');
    if (!sourceCtx) return;

    tempCtx.drawImage(
      this.canvas,
      0, 0, this.canvas.width, this.canvas.height,
      0, 0, tempCanvas.width, tempCanvas.height
    );

    const dataUrl = tempCanvas.toDataURL('image/png');
    this.triggerDownload(dataUrl, `fractal-tree-${Date.now()}.png`);

    this.controls.showExportToast();
  }

  private triggerDownload(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FractalTreeApp();
});
