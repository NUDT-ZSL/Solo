export interface Point {
  x: number;
  y: number;
}

export interface Fragment {
  id: number;
  vertices: Point[];
  center: Point;
  originalCenter: Point;
  position: Point;
  startPosition: Point;
  targetPosition: Point;
  rotation: number;
  startRotation: number;
  targetRotation: number;
  scale: number;
  startScale: number;
  targetScale: number;
  opacity: number;
  startOpacity: number;
  targetOpacity: number;
  animationProgress: number;
  animationDuration: number;
  animationType: 'none' | 'scatter' | 'collect' | 'reassemble';
  animationDelay: number;
  collected: boolean;
  dragging: boolean;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class FragmentEngine {
  private fragments: Fragment[] = [];
  private sourceCanvas: HTMLCanvasElement;
  private sourceWidth: number;
  private sourceHeight: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private gridSize: number = 64;
  private spatialGrid: Map<string, Fragment[]> = new Map();
  private onCollectCallback?: (count: number, total: number) => void;
  private onReassembleCompleteCallback?: () => void;
  private reassembling: boolean = false;
  private globalTime: number = 0;

  constructor(sourceCanvas: HTMLCanvasElement, canvasWidth: number, canvasHeight: number) {
    this.sourceCanvas = sourceCanvas;
    this.sourceWidth = sourceCanvas.width;
    this.sourceHeight = sourceCanvas.height;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setOnCollect(callback: (count: number, total: number) => void): void {
    this.onCollectCallback = callback;
  }

  setOnReassembleComplete(callback: () => void): void {
    this.onReassembleCompleteCallback = callback;
  }

  generateFragments(count: number): void {
    this.fragments = [];
    this.reassembling = false;
    const imageCenterX = this.canvasWidth / 2;
    const imageCenterY = this.canvasHeight / 2;
    const imageLeft = imageCenterX - this.sourceWidth / 2;
    const imageTop = imageCenterY - this.sourceHeight / 2;

    const cellsX = Math.ceil(Math.sqrt(count * (this.sourceWidth / this.sourceHeight)));
    const cellsY = Math.ceil(count / cellsX);
    const cellWidth = this.sourceWidth / cellsX;
    const cellHeight = this.sourceHeight / cellsY;
    const actualCount = cellsX * cellsY;

    for (let cy = 0; cy < cellsY; cy++) {
      for (let cx = 0; cx < cellsX; cx++) {
        const id = cy * cellsX + cx;
        const baseX = cx * cellWidth;
        const baseY = cy * cellHeight;
        const vertexCount = 3 + Math.floor(Math.random() * 5);
        const vertices: Point[] = [];
        const jitterAmount = 0.005 * Math.max(cellWidth, cellHeight);

        for (let i = 0; i < vertexCount; i++) {
          const angle = (i / vertexCount) * Math.PI * 2 + Math.random() * 0.3;
          const radiusX = cellWidth * (0.4 + Math.random() * 0.35);
          const radiusY = cellHeight * (0.4 + Math.random() * 0.35);
          const jitterX = (Math.random() - 0.5) * 2 * jitterAmount;
          const jitterY = (Math.random() - 0.5) * 2 * jitterAmount;
          vertices.push({
            x: baseX + cellWidth / 2 + Math.cos(angle) * radiusX + jitterX,
            y: baseY + cellHeight / 2 + Math.sin(angle) * radiusY + jitterY
          });
        }

        let sumX = 0, sumY = 0;
        for (const v of vertices) {
          sumX += v.x;
          sumY += v.y;
        }
        const originalCenter = { x: sumX / vertices.length, y: sumY / vertices.length };
        const worldCenter = { x: imageLeft + originalCenter.x, y: imageTop + originalCenter.y };

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of vertices) {
          const localX = v.x - originalCenter.x;
          const localY = v.y - originalCenter.y;
          minX = Math.min(minX, localX);
          maxX = Math.max(maxX, localX);
          minY = Math.min(minY, localY);
          maxY = Math.max(maxY, localY);
        }

        this.fragments.push({
          id,
          vertices: vertices.map(v => ({ x: v.x - originalCenter.x, y: v.y - originalCenter.y })),
          center: worldCenter,
          originalCenter: { ...worldCenter },
          position: { ...worldCenter },
          startPosition: { ...worldCenter },
          targetPosition: { ...worldCenter },
          rotation: 0,
          startRotation: 0,
          targetRotation: 0,
          scale: 1,
          startScale: 1,
          targetScale: 1,
          opacity: 1,
          startOpacity: 1,
          targetOpacity: 1,
          animationProgress: 1,
          animationDuration: 0,
          animationType: 'none',
          animationDelay: 0,
          collected: false,
          dragging: false,
          bounds: { minX, maxX, minY, maxY }
        });
      }
    }
    void actualCount;
    this.buildSpatialGrid();
  }

  scatter(): void {
    this.reassembling = false;
    for (const f of this.fragments) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.max(this.canvasWidth, this.canvasHeight) * (0.25 + Math.random() * 0.4);
      f.startPosition = { ...f.position };
      f.targetPosition = {
        x: this.canvasWidth / 2 + Math.cos(angle) * distance,
        y: this.canvasHeight / 2 + Math.sin(angle) * distance
      };
      f.startRotation = f.rotation;
      f.targetRotation = (Math.random() - 0.5) * 60 * Math.PI / 180;
      f.startScale = f.scale;
      f.targetScale = 0.5 + Math.random() * 1.0;
      f.startOpacity = f.opacity;
      f.targetOpacity = 0.3;
      f.animationProgress = 0;
      f.animationDuration = 1500;
      f.animationType = 'scatter';
      f.animationDelay = 0;
      f.collected = false;
    }
  }

  collect(fragment: Fragment): void {
    if (fragment.collected) return;
    fragment.collected = true;
    const collectCenter = { x: this.canvasWidth / 2, y: this.canvasHeight * 0.95 };
    fragment.startPosition = { ...fragment.position };
    fragment.targetPosition = { ...collectCenter };
    fragment.startRotation = fragment.rotation;
    fragment.targetRotation = 0;
    fragment.startScale = fragment.scale;
    fragment.targetScale = 0.3;
    fragment.startOpacity = fragment.opacity;
    fragment.targetOpacity = 0.3;
    fragment.animationProgress = 0;
    fragment.animationDuration = 500;
    fragment.animationType = 'collect';
    fragment.animationDelay = 0;
    fragment.dragging = false;

    const collectedCount = this.fragments.filter(f => f.collected).length;
    if (this.onCollectCallback) {
      this.onCollectCallback(collectedCount, this.fragments.length);
    }
    if (collectedCount === this.fragments.length && !this.reassembling) {
      setTimeout(() => this.startReassemble(), 300);
    }
  }

  startReassemble(): void {
    if (this.reassembling) return;
    this.reassembling = true;
    const sorted = [...this.fragments].sort((a, b) => {
      const distA = Math.hypot(a.originalCenter.x - this.canvasWidth / 2, a.originalCenter.y - this.canvasHeight / 2);
      const distB = Math.hypot(b.originalCenter.x - this.canvasWidth / 2, b.originalCenter.y - this.canvasHeight / 2);
      return distA - distB;
    });
    sorted.forEach((f, idx) => {
      f.startPosition = { ...f.position };
      f.targetPosition = { ...f.originalCenter };
      f.startRotation = f.rotation;
      f.targetRotation = 0;
      f.startScale = f.scale;
      f.targetScale = 1;
      f.startOpacity = f.opacity;
      f.targetOpacity = 1;
      f.animationProgress = 0;
      f.animationDuration = 1800;
      f.animationType = 'reassemble';
      f.animationDelay = idx * 20;
    });
  }

  isReassembling(): boolean { return this.reassembling; }
  isReassembled(): boolean {
    return this.reassembling && this.fragments.every(f => f.animationProgress >= 1);
  }

  update(deltaTime: number): void {
    this.globalTime += deltaTime;
    for (const f of this.fragments) {
      if (f.animationProgress < 1) {
        const effectiveDelta = Math.max(0, deltaTime - f.animationDelay);
        f.animationDelay = Math.max(0, f.animationDelay - deltaTime);
        if (effectiveDelta > 0) {
          f.animationProgress += effectiveDelta / f.animationDuration;
        }
        if (f.animationProgress > 1) f.animationProgress = 1;
        const t = f.animationProgress;
        let eased: number;
        switch (f.animationType) {
          case 'scatter': eased = this.easeOutCubic(t); break;
          case 'collect': eased = this.easeOutCubic(t); break;
          case 'reassemble': eased = this.easeOutElastic(t, 0.3); break;
          default: eased = t;
        }
        f.position.x = f.startPosition.x + (f.targetPosition.x - f.startPosition.x) * eased;
        f.position.y = f.startPosition.y + (f.targetPosition.y - f.startPosition.y) * eased;
        f.rotation = f.startRotation + (f.targetRotation - f.startRotation) * eased;
        f.scale = f.startScale + (f.targetScale - f.startScale) * eased;
        f.opacity = f.startOpacity + (f.targetOpacity - f.startOpacity) * eased;
      }
    }
    if (this.reassembling && this.fragments.every(f => f.animationProgress >= 1)) {
      if (this.onReassembleCompleteCallback) {
        const cb = this.onReassembleCompleteCallback;
        this.onReassembleCompleteCallback = undefined;
        cb();
      }
    }
    this.buildSpatialGrid();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutElastic(t: number, overshoot: number = 0.3): number {
    if (t === 0 || t === 1) return t;
    const p = 1 - overshoot;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    for (const f of this.fragments) {
      if (f.collected && f.animationProgress >= 1) continue;
      const cells = this.getFragmentCells(f);
      for (const key of cells) {
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, []);
        this.spatialGrid.get(key)!.push(f);
      }
    }
  }

  private getFragmentCells(f: Fragment): string[] {
    const cells: string[] = [];
    const worldMinX = f.position.x + f.bounds.minX * f.scale;
    const worldMaxX = f.position.x + f.bounds.maxX * f.scale;
    const worldMinY = f.position.y + f.bounds.minY * f.scale;
    const worldMaxY = f.position.y + f.bounds.maxY * f.scale;
    const startGX = Math.floor(worldMinX / this.gridSize);
    const endGX = Math.floor(worldMaxX / this.gridSize);
    const startGY = Math.floor(worldMinY / this.gridSize);
    const endGY = Math.floor(worldMaxY / this.gridSize);
    for (let gx = startGX; gx <= endGX; gx++) {
      for (let gy = startGY; gy <= endGY; gy++) {
        cells.push(`${gx},${gy}`);
      }
    }
    return cells;
  }

  getFragmentAt(x: number, y: number): Fragment | null {
    const candidates: Fragment[] = [];
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(y / this.gridSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          for (const f of cell) {
            if (!candidates.includes(f) && !f.collected && f.animationProgress >= 1) {
              candidates.push(f);
            }
          }
        }
      }
    }
    candidates.sort((a, b) => {
      const distA = Math.hypot(a.position.x - x, a.position.y - y);
      const distB = Math.hypot(b.position.x - x, b.position.y - y);
      return distA - distB;
    });
    for (const f of candidates) {
      if (this.pointInFragment(x, y, f)) return f;
    }
    return null;
  }

  private pointInFragment(x: number, y: number, f: Fragment): boolean {
    const cos = Math.cos(-f.rotation);
    const sin = Math.sin(-f.rotation);
    const localX = (x - f.position.x) * cos - (y - f.position.y) * sin;
    const localY = (x - f.position.x) * sin + (y - f.position.y) * cos;
    const scaledX = localX / f.scale;
    const scaledY = localY / f.scale;
    let inside = false;
    const verts = f.vertices;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      const intersect = ((yi > scaledY) !== (yj > scaledY)) &&
        (scaledX < (xj - xi) * (scaledY - yi) / (yj - yi + 1e-10) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  render(ctx: CanvasRenderingContext2D, _time: number): void {
    const imageLeft = this.canvasWidth / 2 - this.sourceWidth / 2;
    const imageTop = this.canvasHeight / 2 - this.sourceHeight / 2;
    for (const f of this.fragments) {
      if (f.collected && f.animationProgress >= 1 && f.animationType === 'collect') continue;
      ctx.save();
      ctx.globalAlpha = f.opacity;
      ctx.translate(f.position.x, f.position.y);
      ctx.rotate(f.rotation);
      const verts = f.vertices;
      const scaledVerts = verts.map(v => ({ x: v.x * f.scale, y: v.y * f.scale }));
      ctx.beginPath();
      ctx.moveTo(scaledVerts[0].x, scaledVerts[0].y);
      for (let i = 1; i < scaledVerts.length; i++) {
        ctx.lineTo(scaledVerts[i].x, scaledVerts[i].y);
      }
      ctx.closePath();
      ctx.save();
      ctx.clip();
      const sourceCenterX = f.originalCenter.x - imageLeft;
      const sourceCenterY = f.originalCenter.y - imageTop;
      const drawX = -sourceCenterX;
      const drawY = -sourceCenterY;
      ctx.drawImage(this.sourceCanvas, drawX, drawY);
      ctx.restore();
      const isDragging = f.dragging;
      if (isDragging) {
        const pulse = 0.5 + 0.5 * Math.sin(this.globalTime * (Math.PI * 2 / 300));
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8 + pulse * 8;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      }
      ctx.beginPath();
      ctx.moveTo(scaledVerts[0].x, scaledVerts[0].y);
      for (let i = 1; i < scaledVerts.length; i++) {
        ctx.lineTo(scaledVerts[i].x, scaledVerts[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  renderCollectionZone(ctx: CanvasRenderingContext2D, time: number): void {
    const y = this.canvasHeight * 0.9;
    const pulse = 0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / 1000));
    ctx.save();
    ctx.fillStyle = `rgba(255, 0, 0, ${0.06 + pulse * 0.06})`;
    ctx.fillRect(0, y, this.canvasWidth, this.canvasHeight - y);
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.12 + pulse * 0.12})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, y + i * 10);
      ctx.lineTo(this.canvasWidth, y + i * 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  collectAllForTesting(): void {
    for (const f of this.fragments) {
      if (!f.collected) {
        this.collect(f);
      }
    }
  }

  getFragments(): Fragment[] { return this.fragments; }
  getCollectedCount(): number { return this.fragments.filter(f => f.collected).length; }
  getTotalCount(): number { return this.fragments.length; }
  getSourceCanvas(): HTMLCanvasElement { return this.sourceCanvas; }
  getGlobalTime(): number { return this.globalTime; }
  getCollectionZoneY(): number { return this.canvasHeight * 0.9; }
}
