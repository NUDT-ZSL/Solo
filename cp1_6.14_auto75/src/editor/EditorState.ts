export interface PlatformData {
  id: string;
  type: 'platform';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpikeData {
  id: string;
  type: 'spike';
  x: number;
  y: number;
}

export interface GoalData {
  id: string;
  type: 'goal';
  x: number;
  y: number;
}

export type ElementData = PlatformData | SpikeData | GoalData;

export interface LevelData {
  name: string;
  version: number;
  elements: ElementData[];
}

export type ToolMode = 'select' | 'platform' | 'spike' | 'goal';

type ChangeListener = () => void;

let nextId = 1;

class EditorState {
  private _elements: ElementData[] = [];
  private _selectedId: string | null = null;
  private _zoom: number = 1;
  private _panX: number = 0;
  private _panY: number = 0;
  private _toolMode: ToolMode = 'select';
  private _isPlaying: boolean = false;
  private _listeners: Set<ChangeListener> = new Set();

  get elements(): ElementData[] {
    return this._elements;
  }

  get selectedId(): string | null {
    return this._selectedId;
  }

  get zoom(): number {
    return this._zoom;
  }

  get panX(): number {
    return this._panX;
  }

  get panY(): number {
    return this._panY;
  }

  get toolMode(): ToolMode {
    return this._toolMode;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  subscribe(listener: ChangeListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    this._listeners.forEach(l => l());
  }

  setToolMode(mode: ToolMode): void {
    if (this._toolMode !== mode) {
      this._toolMode = mode;
      this.notify();
    }
  }

  setPlaying(playing: boolean): void {
    if (this._isPlaying !== playing) {
      this._isPlaying = playing;
      this.notify();
    }
  }

  setZoom(zoom: number): void {
    const z = Math.max(0.5, Math.min(2.0, zoom));
    if (this._zoom !== z) {
      this._zoom = z;
      this.notify();
    }
  }

  setPan(panX: number, panY: number): void {
    if (this._panX !== panX || this._panY !== panY) {
      this._panX = panX;
      this._panY = panY;
      this.notify();
    }
  }

  addPlatform(x: number, y: number): PlatformData {
    const p: PlatformData = {
      id: `plat_${nextId++}`,
      type: 'platform',
      x: Math.round(x - 40),
      y: Math.round(y - 10),
      width: 80,
      height: 20,
    };
    this._elements = [...this._elements, p];
    this._selectedId = p.id;
    this.notify();
    return p;
  }

  addSpike(x: number, y: number): SpikeData {
    const s: SpikeData = {
      id: `spike_${nextId++}`,
      type: 'spike',
      x: Math.round(x - 12),
      y: Math.round(y),
    };
    this._elements = [...this._elements, s];
    this._selectedId = s.id;
    this.notify();
    return s;
  }

  addGoal(x: number, y: number): GoalData {
    const g: GoalData = {
      id: `goal_${nextId++}`,
      type: 'goal',
      x: Math.round(x - 20),
      y: Math.round(y - 20),
    };
    this._elements = [...this._elements, g];
    this._selectedId = g.id;
    this.notify();
    return g;
  }

  removeElement(id: string): void {
    const prev = this._elements.length;
    this._elements = this._elements.filter(e => e.id !== id);
    if (this._elements.length !== prev) {
      if (this._selectedId === id) {
        this._selectedId = null;
      }
      this.notify();
    }
  }

  select(id: string | null): void {
    if (this._selectedId !== id) {
      this._selectedId = id;
      this.notify();
    }
  }

  getSelected(): ElementData | null {
    return this._elements.find(e => e.id === this._selectedId) || null;
  }

  getPlatforms(): PlatformData[] {
    return this._elements.filter((e): e is PlatformData => e.type === 'platform');
  }

  getSpikes(): SpikeData[] {
    return this._elements.filter((e): e is SpikeData => e.type === 'spike');
  }

  getGoals(): GoalData[] {
    return this._elements.filter((e): e is GoalData => e.type === 'goal');
  }

  getLeftmostPlatform(): PlatformData | null {
    const platforms = this.getPlatforms();
    if (platforms.length === 0) return null;
    return platforms.reduce((min, p) => p.x < min.x ? p : min, platforms[0]);
  }

  hitTest(wx: number, wy: number): ElementData | null {
    for (let i = this._elements.length - 1; i >= 0; i--) {
      const e = this._elements[i];
      if (e.type === 'platform') {
        if (wx >= e.x && wx <= e.x + e.width && wy >= e.y && wy <= e.y + e.height) {
          return e;
        }
      } else if (e.type === 'spike') {
        const cx = e.x + 12;
        const by = e.y;
        const ty = e.y + 20;
        if (wx >= e.x && wx <= e.x + 24 && wy >= by && wy <= ty) {
          const relY = (wy - by) / (ty - by);
          const halfW = 12 * relY;
          if (wx >= cx - halfW && wx <= cx + halfW) {
            return e;
          }
        }
      } else if (e.type === 'goal') {
        const cx = e.x + 20;
        const cy = e.y + 20;
        const dx = wx - cx;
        const dy = wy - cy;
        if (dx * dx + dy * dy <= 20 * 20) {
          return e;
        }
      }
    }
    return null;
  }

  hitTestHandle(wx: number, wy: number): { id: string; handle: string } | null {
    const sel = this.getSelected();
    if (!sel || sel.type !== 'platform') return null;
    const p = sel as PlatformData;
    const hs = 6;
    const handles = [
      { handle: 'tl', x: p.x, y: p.y + p.height },
      { handle: 'tr', x: p.x + p.width, y: p.y + p.height },
      { handle: 'bl', x: p.x, y: p.y },
      { handle: 'br', x: p.x + p.width, y: p.y },
      { handle: 'ml', x: p.x, y: p.y + p.height / 2 },
      { handle: 'mr', x: p.x + p.width, y: p.y + p.height / 2 },
      { handle: 'mt', x: p.x + p.width / 2, y: p.y + p.height },
      { handle: 'mb', x: p.x + p.width / 2, y: p.y },
    ];
    for (const h of handles) {
      if (Math.abs(wx - h.x) <= hs && Math.abs(wy - h.y) <= hs) {
        return { id: p.id, handle: h.handle };
      }
    }
    return null;
  }

  resizePlatform(id: string, handle: string, wx: number, wy: number): void {
    const el = this._elements.find(e => e.id === id);
    if (!el || el.type !== 'platform') return;
    const p = el as PlatformData;
    const minW = 20;
    const minH = 10;
    const oldX = p.x;
    const oldY = p.y;
    const oldW = p.width;
    const oldH = p.height;
    let newX = oldX, newY = oldY, newW = oldW, newH = oldH;

    switch (handle) {
      case 'tl':
        newW = Math.max(minW, oldX + oldW - wx);
        newH = Math.max(minH, wy - oldY);
        newX = oldX + oldW - newW;
        newY = oldY + oldH - newH;
        break;
      case 'tr':
        newW = Math.max(minW, wx - oldX);
        newH = Math.max(minH, wy - oldY);
        newY = oldY + oldH - newH;
        break;
      case 'bl':
        newW = Math.max(minW, oldX + oldW - wx);
        newH = Math.max(minH, oldY + oldH - wy);
        newX = oldX + oldW - newW;
        break;
      case 'br':
        newW = Math.max(minW, wx - oldX);
        newH = Math.max(minH, oldY + oldH - wy);
        break;
      case 'ml':
        newW = Math.max(minW, oldX + oldW - wx);
        newX = oldX + oldW - newW;
        break;
      case 'mr':
        newW = Math.max(minW, wx - oldX);
        break;
      case 'mt':
        newH = Math.max(minH, wy - oldY);
        newY = oldY + oldH - newH;
        break;
      case 'mb':
        newH = Math.max(minH, oldY + oldH - wy);
        break;
    }

    p.x = Math.round(newX);
    p.y = Math.round(newY);
    p.width = Math.round(newW);
    p.height = Math.round(newH);
    this._elements = [...this._elements];
    this.notify();
  }

  moveElement(id: string, x: number, y: number): void {
    const el = this._elements.find(e => e.id === id);
    if (!el) return;
    el.x = Math.round(x);
    el.y = Math.round(y);
    this._elements = [...this._elements];
    this.notify();
  }

  screenToWorld(sx: number, sy: number, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    return {
      x: (sx - cx) / this._zoom + this._panX,
      y: -(sy - cy) / this._zoom + this._panY,
    };
  }

  worldToScreen(wx: number, wy: number, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    return {
      x: (wx - this._panX) * this._zoom + cx,
      y: -(wy - this._panY) * this._zoom + cy,
    };
  }

  toJSON(): LevelData {
    return {
      name: 'untitled',
      version: 1,
      elements: this._elements.map(e => ({ ...e })),
    };
  }

  exportLevel(): LevelData {
    return this.toJSON();
  }
}

export default EditorState;
