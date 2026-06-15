import { TreeData, Branch, drawTree, collectDescendants } from './fractalTree';

export interface AnimationState {
  progress: number;
  isAnimating: boolean;
}

type AnimationType = 'grow' | 'prune' | 'tweenParams' | 'none';

interface ActiveAnimation {
  type: AnimationType;
  startTime: number;
  duration: number;
  onComplete?: () => void;
  data?: any;
}

export class AnimationController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tree: TreeData | null = null;
  private rafId: number | null = null;

  private highlightedBranch: Branch | null = null;
  private glowingBranches: Set<string> = new Set();
  private pruningBranches: Map<string, number> = new Map();
  private growProgress: number = 1;

  private activeAnimation: ActiveAnimation | null = null;

  private tweenStartParams: any = null;
  private tweenEndParams: any = null;
  private onParamsChange: ((params: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
  }

  setTree(tree: TreeData | null): void {
    this.tree = tree;
  }

  setHighlightedBranch(branch: Branch | null): void {
    this.highlightedBranch = branch;
  }

  setParamsChangeCallback(callback: (params: any) => void): void {
    this.onParamsChange = callback;
  }

  startGrowAnimation(duration: number = 1600): Promise<void> {
    return new Promise((resolve) => {
      this.stopCurrentAnimation();
      this.growProgress = 0;
      this.glowingBranches = new Set();

      this.activeAnimation = {
        type: 'grow',
        startTime: performance.now(),
        duration,
        onComplete: () => {
          this.glowingBranches = new Set();
          this.growProgress = 1;
          resolve();
        }
      };

      this.ensureLoop();
    });
  }

  startPruneAnimation(branch: Branch, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      const descendants = collectDescendants(branch);
      descendants.forEach((b) => this.pruningBranches.set(b.id, 0));

      this.activeAnimation = {
        type: 'prune',
        startTime: performance.now(),
        duration,
        data: { branchIds: descendants.map((b) => b.id) },
        onComplete: () => {
          descendants.forEach((b) => {
            b.pruned = true;
            this.pruningBranches.delete(b.id);
          });
          resolve();
        }
      };

      this.ensureLoop();
    });
  }

  startParamsTween(
    startParams: any,
    endParams: any,
    duration: number = 500
  ): Promise<void> {
    return new Promise((resolve) => {
      this.stopCurrentAnimation();
      this.tweenStartParams = { ...startParams };
      this.tweenEndParams = { ...endParams };

      this.activeAnimation = {
        type: 'tweenParams',
        startTime: performance.now(),
        duration,
        onComplete: () => {
          this.tweenStartParams = null;
          this.tweenEndParams = null;
          resolve();
        }
      };

      this.ensureLoop();
    });
  }

  stopCurrentAnimation(): void {
    if (this.activeAnimation) {
      if (this.activeAnimation.onComplete) {
        this.activeAnimation.onComplete();
      }
      this.activeAnimation = null;
    }
  }

  private ensureLoop(): void {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  private loop(timestamp: number): void {
    this.rafId = null;
    let needsRender = false;

    if (this.activeAnimation) {
      const elapsed = timestamp - this.activeAnimation.startTime;
      const t = Math.min(1, elapsed / this.activeAnimation.duration);
      const eased = this.easeInOutCubic(t);

      switch (this.activeAnimation.type) {
        case 'grow':
          this.growProgress = eased;
          this.updateGlowingBranches();
          needsRender = true;
          break;

        case 'prune':
          if (this.activeAnimation.data?.branchIds) {
            for (const id of this.activeAnimation.data.branchIds) {
              this.pruningBranches.set(id, eased);
            }
          }
          needsRender = true;
          break;

        case 'tweenParams':
          if (this.tweenStartParams && this.tweenEndParams && this.onParamsChange) {
            const tweened: any = {};
            for (const key of Object.keys(this.tweenEndParams)) {
              const start = this.tweenStartParams[key] ?? 0;
              const end = this.tweenEndParams[key] ?? 0;
              tweened[key] = start + (end - start) * eased;
            }
            this.onParamsChange(tweened);
            needsRender = true;
          }
          break;
      }

      if (t >= 1) {
        const onComplete = this.activeAnimation.onComplete;
        this.activeAnimation = null;
        if (onComplete) onComplete();
      }
    }

    if (this.highlightedBranch !== null) {
      needsRender = true;
    }

    if (needsRender) {
      this.render();
    }

    if (this.activeAnimation || this.highlightedBranch !== null) {
      this.ensureLoop();
    }
  }

  private updateGlowingBranches(): void {
    if (!this.tree) return;

    this.glowingBranches.clear();
    const targetDepth = Math.floor(this.growProgress * this.tree.params.depth);
    const maxDepth = this.tree.params.depth;
    const glowingSet = this.glowingBranches;

    const collectAtDepth = (branch: Branch, currentTarget: number): void => {
      if (branch.depth === currentTarget - 1 || (currentTarget === maxDepth && branch.depth >= currentTarget - 1)) {
        if (branch.children.length === 0 || branch.depth >= currentTarget - 1) {
          glowingSet.add(branch.id);
        }
      }
      for (const child of branch.children) {
        collectAtDepth(child, currentTarget);
      }
    };

    if (this.tree.root) {
      collectAtDepth(this.tree.root, targetDepth);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  render(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#1A202C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.tree) {
      drawTree(ctx, this.tree, {
        progress: this.growProgress,
        highlightedBranch: this.highlightedBranch,
        glowingBranches: this.glowingBranches,
        pruningBranches: this.pruningBranches
      });
    }
  }

  isAnimating(): boolean {
    return this.activeAnimation !== null;
  }

  getCurrentProgress(): number {
    return this.growProgress;
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
