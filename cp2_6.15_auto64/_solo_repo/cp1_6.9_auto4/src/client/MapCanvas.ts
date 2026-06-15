import type { TreeData } from '../shared/types';

export interface MapCanvasOptions {
  container: HTMLElement;
  width: number;
  height: number;
  readOnly?: boolean;
  onCanvasClick?: (worldX: number, worldY: number) => void;
  onTreeClick?: (tree: TreeData, screenX: number, screenY: number, treeTopY: number) => void;
}

interface Crosshair {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: 'halo' | 'bloom';
  haloAngle?: number;
  haloRadius?: number;
  treeId?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
}

interface AnimatedTreeState {
  targetHeight: number;
  currentHeight: number;
  targetBranches: number;
  currentBranches: number;
  targetCanopyOpacity: number;
  currentCanopyOpacity: number;
  hasHalo: boolean;
  hasBloom: boolean;
  growthStart: number;
  fullyGrown: boolean;
}

export class MapCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: MapCanvasOptions;
  private width: number;
  private height: number;

  private trees: TreeData[] = [];
  private treeStates = new Map<string, AnimatedTreeState>();

  private offsetX = 0;
  private offsetY = 0;
  private scale = 1;
  private minScale = 0.5;
  private maxScale = 3;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartOffsetX = 0;
  private dragStartOffsetY = 0;
  private draggedDistance = 0;
  private mouseDownX = 0;
  private mouseDownY = 0;

  private crosshair: Crosshair | null = null;
  private ripples: Ripple[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];

  private rafId: number | null = null;
  private lastTime = 0;
  private bloomEmitterTimers = new Map<string, number>();

  private hoveredTreeId: string | null = null;

  constructor(options: MapCanvasOptions) {
    this.options = options;
    this.width = options.width;
    this.height = options.height;

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.style.borderRadius = '16px';
    canvas.style.boxShadow = '0 0 80px rgba(0,0,0,0.5)';
    options.container.appendChild(canvas);
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.initStars();
    this.bindEvents();
    this.startLoop();
  }

  private initStars() {
    const count = 180;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.5 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private bindEvents() {
    const canvas = this.canvas;
    const readOnly = !!this.options.readOnly;

    if (!readOnly) {
      canvas.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
      canvas.addEventListener('click', this.onClick);
    } else {
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
    }

    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const canvas = this.canvas;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize);
    canvas.remove();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.initStars();
  }

  setTrees(trees: TreeData[]) {
    const prevIds = new Set(this.trees.map(t => t.id));
    this.trees = trees.slice();
    for (const tree of trees) {
      if (!prevIds.has(tree.id) || !this.treeStates.has(tree.id)) {
        this.treeStates.set(tree.id, this.computeTargetState(tree, true));
      } else {
        const existing = this.treeStates.get(tree.id)!;
        const target = this.computeTargetState(tree, false);
        if (
          target.targetHeight !== existing.targetHeight ||
          target.targetBranches !== existing.targetBranches ||
          target.targetCanopyOpacity !== existing.targetCanopyOpacity ||
          target.hasHalo !== existing.hasHalo ||
          target.hasBloom !== existing.hasBloom
        ) {
          this.treeStates.set(tree.id, {
            ...existing,
            ...target,
            growthStart: performance.now(),
            fullyGrown: false,
          });
        }
      }
      if (this.treeStates.get(tree.id)!.hasBloom && !this.bloomEmitterTimers.has(tree.id)) {
        this.bloomEmitterTimers.set(tree.id, performance.now());
      }
    }
    for (const id of Array.from(this.treeStates.keys())) {
      if (!trees.find(t => t.id === id)) {
        this.treeStates.delete(id);
        this.bloomEmitterTimers.delete(id);
      }
    }
  }

  private computeTargetState(tree: TreeData, isNew: boolean): AnimatedTreeState {
    const d = tree.streakDays;
    let targetHeight: number;
    let targetBranches: number;
    let targetCanopyOpacity: number;
    let hasHalo = false;
    let hasBloom = false;

    if (d >= 14) {
      targetHeight = 72;
      targetBranches = 5;
      targetCanopyOpacity = 1;
      hasHalo = true;
      hasBloom = true;
    } else if (d >= 7) {
      targetHeight = 60;
      targetBranches = 5;
      targetCanopyOpacity = 1;
      hasHalo = true;
    } else if (d >= 3) {
      targetHeight = 30;
      targetBranches = 2;
      targetCanopyOpacity = 0.55;
    } else {
      targetHeight = 10;
      targetBranches = 0;
      targetCanopyOpacity = 0;
    }

    const now = performance.now();
    if (isNew) {
      return {
        targetHeight,
        currentHeight: 2,
        targetBranches,
        currentBranches: 0,
        targetCanopyOpacity,
        currentCanopyOpacity: 0,
        hasHalo,
        hasBloom,
        growthStart: now,
        fullyGrown: false,
      };
    }
    return {
      targetHeight,
      currentHeight: targetHeight,
      targetBranches,
      currentBranches: targetBranches,
      targetCanopyOpacity,
      currentCanopyOpacity: targetCanopyOpacity,
      hasHalo,
      hasBloom,
      growthStart: now - 1000,
      fullyGrown: true,
    };
  }

  showCrosshair(worldX: number, worldY: number) {
    this.crosshair = {
      x: worldX,
      y: worldY,
      startTime: performance.now(),
      duration: 300,
    };
  }

  addRipple(worldX: number, worldY: number, color: string) {
    this.ripples.push({
      x: worldX,
      y: worldY,
      startTime: performance.now(),
      duration: 1000,
      color,
    });
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const px = (wx / 100) * this.width;
    const py = (wy / 100) * this.height;
    return {
      x: px * this.scale + this.offsetX,
      y: py * this.scale + this.offsetY,
    };
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const px = (sx - this.offsetX) / this.scale;
    const py = (sy - this.offsetY) / this.scale;
    return {
      x: (px / this.width) * 100,
      y: (py / this.height) * 100,
    };
  }

  private getCanvasXY(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const pos = this.getCanvasXY(e);
    this.isDragging = true;
    this.draggedDistance = 0;
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;
    this.dragStartOffsetX = this.offsetX;
    this.dragStartOffsetY = this.offsetY;
    this.mouseDownX = pos.x;
    this.mouseDownY = pos.y;
    this.canvas.style.cursor = 'grabbing';
  };

  private onMouseMove = (e: MouseEvent) => {
    const pos = this.getCanvasXY(e);
    if (this.isDragging) {
      const dx = pos.x - this.dragStartX;
      const dy = pos.y - this.dragStartY;
      this.draggedDistance = Math.max(Math.abs(dx), Math.abs(dy));
      this.offsetX = this.dragStartOffsetX + dx;
      this.offsetY = this.dragStartOffsetY + dy;
    } else {
      this.hoveredTreeId = this.pickTree(pos.x, pos.y);
      this.canvas.style.cursor = this.hoveredTreeId ? 'pointer' : 'grab';
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const pos = this.getCanvasXY(e as unknown as MouseEvent);
    const delta = -e.deltaY;
    const factor = Math.exp(delta * 0.001);
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    if (newScale === this.scale) return;
    const ratio = newScale / this.scale;
    this.offsetX = pos.x - (pos.x - this.offsetX) * ratio;
    this.offsetY = pos.y - (pos.y - this.offsetY) * ratio;
    this.scale = newScale;
  };

  private onClick = (e: MouseEvent) => {
    if (this.draggedDistance > 5) return;
    const pos = this.getCanvasXY(e);
    const hit = this.pickTreeData(pos.x, pos.y);
    if (hit) {
      const screen = this.worldToScreen(hit.tree.x, hit.tree.y);
      const state = this.treeStates.get(hit.tree.id);
      const topY = screen.y - (state?.currentHeight || 30) * this.scale;
      this.options.onTreeClick?.(hit.tree, screen.x, screen.y, topY);
      return;
    }
    const world = this.screenToWorld(pos.x, pos.y);
    const clampedX = Math.max(0, Math.min(100, world.x));
    const clampedY = Math.max(0, Math.min(100, world.y));
    this.options.onCanvasClick?.(clampedX, clampedY);
  };

  private onResize = () => {};

  private pickTree(sx: number, sy: number): string | null {
    const hit = this.pickTreeData(sx, sy);
    return hit ? hit.tree.id : null;
  }

  private pickTreeData(sx: number, sy: number): { tree: TreeData; state: AnimatedTreeState } | null {
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const tree = this.trees[i];
      const state = this.treeStates.get(tree.id);
      if (!state) continue;
      const screen = this.worldToScreen(tree.x, tree.y);
      const h = state.currentHeight * this.scale;
      const r = Math.max(14, h * 0.7);
      const canopyCx = screen.x;
      const canopyCy = screen.y - h * 0.6;
      const d1 = Math.hypot(sx - canopyCx, sy - canopyCy);
      const d2 = Math.hypot(sx - screen.x, sy - screen.y);
      if (d1 < r || d2 < 18) {
        return { tree, state };
      }
    }
    return null;
  }

  resetView() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
  }

  private startLoop() {
    const tick = (t: number) => {
      if (!this.lastTime) this.lastTime = t;
      this.lastTime = t;
      this.update(t);
      this.render(t);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(time: number) {
    for (const [id, state] of this.treeStates.entries()) {
      if (state.fullyGrown) continue;
      const elapsed = time - state.growthStart;
      const t = Math.min(1, elapsed / 1000);
      const ease = 1 - Math.pow(1 - t, 3);
      state.currentHeight = 2 + (state.targetHeight - 2) * ease;
      state.currentBranches = Math.round(state.targetBranches * ease);
      state.currentCanopyOpacity = state.targetCanopyOpacity * ease;
      if (t >= 1) state.fullyGrown = true;
    }

    for (const [id, state] of this.treeStates.entries()) {
      if (state.hasBloom && state.fullyGrown) {
        const last = this.bloomEmitterTimers.get(id) || time;
        const emitEvery = 333;
        let t = last;
        while (t + emitEvery <= time) {
          t += emitEvery;
          this.emitBloomParticles(id, 3);
        }
        this.bloomEmitterTimers.set(id, t);
      }
    }

    this.particles = this.particles.filter(p => {
      p.life -= 16;
      if (p.kind === 'bloom') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
      }
      return p.life > 0;
    });

    this.ripples = this.ripples.filter(r => time - r.startTime < r.duration);

    if (this.crosshair && time - this.crosshair.startTime > this.crosshair.duration) {
      this.crosshair = null;
    }
  }

  private emitBloomParticles(treeId: string, count: number) {
    const tree = this.trees.find(t => t.id === treeId);
    if (!tree) return;
    const state = this.treeStates.get(treeId);
    if (!state) return;
    const screen = this.worldToScreen(tree.x, tree.y);
    const topY = screen.y - state.currentHeight * this.scale;
    const colors = ['#FF69B4', '#FFD700', '#FF7043', '#9575CD', '#4FC3F7', tree.moodColor];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.2;
      const dist = 40 * this.scale;
      this.particles.push({
        x: screen.x + (Math.random() - 0.5) * 10,
        y: topY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        life: dist / speed * 16,
        maxLife: dist / speed * 16,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2.5,
        kind: 'bloom',
      });
    }
  }

  private render(time: number) {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.clearRect(0, 0, W, H);
    this.renderBackground(ctx, W, H, time);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.renderGrid(ctx, W, H);
    this.renderRipples(ctx, time);

    const sorted = this.trees
      .map(t => ({ t, s: this.worldToScreen(t.x, t.y), st: this.treeStates.get(t.id) }))
      .filter(x => x.st)
      .sort((a, b) => a.s.y - b.s.y);

    for (const item of sorted) {
      this.renderTree(ctx, item.t, item.st!, time);
    }

    this.renderParticles(ctx, time);
    this.renderCrosshair(ctx, time);

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#16213E');
    grad.addColorStop(1, '#0F3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const star of this.stars) {
      const alpha = star.baseAlpha + Math.sin(time * 0.001 + star.phase) * 0.2;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.05, Math.min(1, alpha))})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1 / this.scale;
    const step = 10;
    for (let x = 0; x <= 100; x += step) {
      const px = (x / 100) * W;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }
    for (let y = 0; y <= 100; y += step) {
      const py = (y / 100) * H;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2 / this.scale;
    ctx.strokeRect(0, 0, W, H);
  }

  private renderRipples(ctx: CanvasRenderingContext2D, time: number) {
    const W = this.width;
    const H = this.height;
    for (const r of this.ripples) {
      const t = (time - r.startTime) / r.duration;
      const alpha = (1 - t) * 0.6;
      const radius = 5 + t * 80;
      const px = (r.x / 100) * W;
      const py = (r.y / 100) * H;
      ctx.strokeStyle = this.hexToRgba(r.color, alpha);
      ctx.lineWidth = 2 / this.scale;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = this.hexToRgba(r.color, alpha * 0.5);
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D, time: number) {
    if (!this.crosshair) return;
    const W = this.width;
    const H = this.height;
    const t = (time - this.crosshair.startTime) / this.crosshair.duration;
    if (t >= 1) return;
    const px = (this.crosshair.x / 100) * W;
    const py = (this.crosshair.y / 100) * H;
    const size = (1 - t) * 40 + 6;
    const shrink = 1 - t * 0.6;
    const alpha = 1 - t;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2 / this.scale;
    ctx.beginPath();
    ctx.moveTo(px - size * shrink, py);
    ctx.lineTo(px - size * 0.2 * shrink, py);
    ctx.moveTo(px + size * 0.2 * shrink, py);
    ctx.lineTo(px + size * shrink, py);
    ctx.moveTo(px, py - size * shrink);
    ctx.lineTo(px, py - size * 0.2 * shrink);
    ctx.moveTo(px, py + size * 0.2 * shrink);
    ctx.lineTo(px, py + size * shrink);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(px, py, size * shrink, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderTree(
    ctx: CanvasRenderingContext2D,
    tree: TreeData,
    state: AnimatedTreeState,
    time: number
  ) {
    const W = this.width;
    const H = this.height;
    const bx = (tree.x / 100) * W;
    const by = (tree.y / 100) * H;
    const h = state.currentHeight;
    const d = tree.streakDays;
    const isHover = this.hoveredTreeId === tree.id;

    ctx.save();
    ctx.translate(bx, by);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 1, Math.max(6, h * 0.35), Math.max(2, h * 0.08), 0, 0, Math.PI * 2);
    ctx.fill();

    if (d < 3) {
      this.renderSprout(ctx, h, tree, state);
    } else if (d < 7) {
      this.renderSmallTree(ctx, h, state.currentBranches, tree, state);
    } else {
      this.renderBigTree(ctx, h, state.currentBranches, tree, state, time);
    }

    if (isHover) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5 / this.scale;
      const r = Math.max(18, h * 0.8);
      ctx.beginPath();
      ctx.arc(0, -h * 0.6, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderSprout(
    ctx: CanvasRenderingContext2D,
    h: number,
    tree: TreeData,
    state: AnimatedTreeState
  ) {
    const leafColor = tree.moodColor;
    const stemColor = '#8D6E63';
    const stemW = Math.max(1.5, h * 0.12);

    ctx.fillStyle = stemColor;
    ctx.beginPath();
    ctx.roundRect(-stemW / 2, -h, stemW, h, 2);
    ctx.fill();

    const alpha = state.currentCanopyOpacity > 0 ? state.currentCanopyOpacity : 0.85;
    ctx.fillStyle = this.hexToRgba(leafColor, alpha);
    ctx.beginPath();
    ctx.ellipse(-stemW, -h + 1, 4 + h * 0.2, 2 + h * 0.08, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(stemW, -h + 2, 4 + h * 0.2, 2 + h * 0.08, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -h - 2, 3 + h * 0.15, 2 + h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSmallTree(
    ctx: CanvasRenderingContext2D,
    h: number,
    branches: number,
    tree: TreeData,
    state: AnimatedTreeState
  ) {
    const trunkColor = '#8D6E63';
    const trunkW = Math.max(2, h * 0.13);
    ctx.fillStyle = trunkColor;
    ctx.beginPath();
    ctx.roundRect(-trunkW / 2, -h, trunkW, h, 2);
    ctx.fill();

    const canopyY = -h * 0.75;
    const canopyR = h * 0.55;
    const alpha = Math.max(0.3, state.currentCanopyOpacity);
    const gradient = ctx.createRadialGradient(0, canopyY, canopyR * 0.2, 0, canopyY, canopyR);
    gradient.addColorStop(0, this.hexToRgba(tree.moodColor, alpha + 0.1));
    gradient.addColorStop(1, this.hexToRgba(tree.moodColor, Math.max(0.15, alpha - 0.2)));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, canopyY, canopyR, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < branches; i++) {
      const t = (i + 1) / (branches + 1);
      const yy = -h * (0.3 + t * 0.55);
      const side = i % 2 === 0 ? -1 : 1;
      const len = h * (0.35 + t * 0.15);
      const angle = side * (0.5 + (i % 3) * 0.1);
      ctx.strokeStyle = trunkColor;
      ctx.lineWidth = Math.max(1, trunkW * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(Math.sin(angle) * len, yy - Math.cos(angle) * len);
      ctx.stroke();
    }
  }

  private renderBigTree(
    ctx: CanvasRenderingContext2D,
    h: number,
    branches: number,
    tree: TreeData,
    state: AnimatedTreeState,
    time: number
  ) {
    const trunkColor = '#6D4C41';
    const trunkW = Math.max(3, h * 0.14);
    const trunkGrad = ctx.createLinearGradient(-trunkW / 2, 0, trunkW / 2, 0);
    trunkGrad.addColorStop(0, '#5D4037');
    trunkGrad.addColorStop(0.5, '#8D6E63');
    trunkGrad.addColorStop(1, '#4E342E');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(-trunkW * 0.7, 0);
    ctx.lineTo(-trunkW / 2, -h * 0.95);
    ctx.lineTo(trunkW / 2, -h * 0.95);
    ctx.lineTo(trunkW * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    const canopyY = -h * 0.7;
    const canopyR = h * 0.62;
    const alpha = state.currentCanopyOpacity;
    const color = tree.moodColor;

    const grad1 = ctx.createRadialGradient(-canopyR * 0.4, canopyY - canopyR * 0.2, canopyR * 0.3, -canopyR * 0.4, canopyY - canopyR * 0.2, canopyR * 0.8);
    grad1.addColorStop(0, this.hexToRgba(color, alpha + 0.05));
    grad1.addColorStop(1, this.hexToRgba(color, alpha - 0.1));
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.arc(-canopyR * 0.4, canopyY - canopyR * 0.2, canopyR * 0.75, 0, Math.PI * 2);
    ctx.fill();

    const grad2 = ctx.createRadialGradient(canopyR * 0.4, canopyY - canopyR * 0.1, canopyR * 0.3, canopyR * 0.4, canopyY - canopyR * 0.1, canopyR * 0.8);
    grad2.addColorStop(0, this.hexToRgba(color, alpha + 0.1));
    grad2.addColorStop(1, this.hexToRgba(color, alpha - 0.15));
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.arc(canopyR * 0.4, canopyY - canopyR * 0.1, canopyR * 0.7, 0, Math.PI * 2);
    ctx.fill();

    const grad3 = ctx.createRadialGradient(0, canopyY - canopyR * 0.55, canopyR * 0.2, 0, canopyY - canopyR * 0.55, canopyR * 0.7);
    grad3.addColorStop(0, this.hexToRgba(this.lighten(color, 20), alpha + 0.15));
    grad3.addColorStop(1, this.hexToRgba(color, alpha));
    ctx.fillStyle = grad3;
    ctx.beginPath();
    ctx.arc(0, canopyY - canopyR * 0.5, canopyR * 0.6, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < branches; i++) {
      const t = (i + 1) / (branches + 1);
      const yy = -h * (0.25 + t * 0.65);
      const side = i % 2 === 0 ? -1 : 1;
      const len = h * (0.4 + t * 0.2);
      const angle = side * (0.45 + (i % 4) * 0.08 - t * 0.2);
      ctx.strokeStyle = trunkColor;
      ctx.lineWidth = Math.max(1.2, trunkW * (0.6 - t * 0.2));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(Math.sin(angle) * len, yy - Math.cos(angle) * len);
      ctx.stroke();
    }

    if (state.hasHalo) {
      const haloR = canopyR * 1.35;
      const rotation = (time / 3000) * Math.PI * 2;
      const dotCount = 24;
      for (let i = 0; i < dotCount; i++) {
        const a = rotation + (i / dotCount) * Math.PI * 2;
        const wobble = Math.sin(time * 0.002 + i) * 2;
        const px = Math.cos(a) * (haloR + wobble);
        const py = canopyY + Math.sin(a) * (haloR * 0.35 + wobble * 0.5);
        const size = 1.5 + Math.sin(time * 0.003 + i * 0.7) * 0.8;
        ctx.fillStyle = this.hexToRgba(this.lighten(color, 30), 0.75);
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, _time: number) {
    const W = this.width;
    const H = this.height;
    for (const p of this.particles) {
      if (p.kind !== 'bloom') continue;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = this.hexToRgba(p.color, Math.max(0, alpha));
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x / this.scale - this.offsetX / this.scale, p.y / this.scale - this.offsetY / this.scale, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private lighten(hex: string, percent: number): string {
    const clean = hex.replace('#', '');
    let r = parseInt(clean.substring(0, 2), 16);
    let g = parseInt(clean.substring(2, 4), 16);
    let b = parseInt(clean.substring(4, 6), 16);
    r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

declare global {
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, w: number, h: number, r: number): void;
  }
}
if (typeof window !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
  };
}
