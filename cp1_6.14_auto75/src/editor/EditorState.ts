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

let nextId = 1;

class EditorState {
  elements: ElementData[] = [];
  selectedId: string | null = null;
  zoom: number = 1;
  panX: number = 0;
  panY: number = 0;

  addPlatform(x: number, y: number): PlatformData {
    const p: PlatformData = {
      id: `plat_${nextId++}`,
      type: 'platform',
      x: Math.round(x - 40),
      y: Math.round(y - 10),
      width: 80,
      height: 20,
    };
    this.elements.push(p);
    return p;
  }

  addSpike(x: number, y: number): SpikeData {
    const s: SpikeData = {
      id: `spike_${nextId++}`,
      type: 'spike',
      x: Math.round(x - 12),
      y: Math.round(y - 20),
    };
    this.elements.push(s);
    return s;
  }

  addGoal(x: number, y: number): GoalData {
    const g: GoalData = {
      id: `goal_${nextId++}`,
      type: 'goal',
      x: Math.round(x - 20),
      y: Math.round(y - 20),
    };
    this.elements.push(g);
    return g;
  }

  removeElement(id: string): void {
    this.elements = this.elements.filter(e => e.id !== id);
    if (this.selectedId === id) {
      this.selectedId = null;
    }
  }

  select(id: string | null): void {
    this.selectedId = id;
  }

  getSelected(): ElementData | null {
    return this.elements.find(e => e.id === this.selectedId) || null;
  }

  getPlatforms(): PlatformData[] {
    return this.elements.filter((e): e is PlatformData => e.type === 'platform');
  }

  getSpikes(): SpikeData[] {
    return this.elements.filter((e): e is SpikeData => e.type === 'spike');
  }

  getGoals(): GoalData[] {
    return this.elements.filter((e): e is GoalData => e.type === 'goal');
  }

  getLeftmostPlatform(): PlatformData | null {
    const platforms = this.getPlatforms();
    if (platforms.length === 0) return null;
    return platforms.reduce((min, p) => p.x < min.x ? p : min, platforms[0]);
  }

  hitTest(wx: number, wy: number): ElementData | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const e = this.elements[i];
      if (e.type === 'platform') {
        if (wx >= e.x && wx <= e.x + e.width && wy >= e.y && wy <= e.y + e.height) {
          return e;
        }
      } else if (e.type === 'spike') {
        const cx = e.x + 12;
        const by = e.y + 20;
        const ty = e.y;
        if (wx >= e.x && wx <= e.x + 24 && wy >= ty && wy <= by) {
          const relY = (wy - ty) / (by - ty);
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
      { handle: 'tl', x: p.x, y: p.y },
      { handle: 'tr', x: p.x + p.width, y: p.y },
      { handle: 'bl', x: p.x, y: p.y + p.height },
      { handle: 'br', x: p.x + p.width, y: p.y + p.height },
      { handle: 'ml', x: p.x, y: p.y + p.height / 2 },
      { handle: 'mr', x: p.x + p.width, y: p.y + p.height / 2 },
      { handle: 'mt', x: p.x + p.width / 2, y: p.y },
      { handle: 'mb', x: p.x + p.width / 2, y: p.y + p.height },
    ];
    for (const h of handles) {
      if (Math.abs(wx - h.x) <= hs && Math.abs(wy - h.y) <= hs) {
        return { id: p.id, handle: h.handle };
      }
    }
    return null;
  }

  resizePlatform(id: string, handle: string, wx: number, wy: number): void {
    const el = this.elements.find(e => e.id === id);
    if (!el || el.type !== 'platform') return;
    const p = el as PlatformData;
    const minW = 20;
    const minH = 10;
    switch (handle) {
      case 'tl':
        p.width = Math.max(minW, p.x + p.width - wx);
        p.height = Math.max(minH, p.y + p.height - wy);
        p.x = p.x + (p.width === minW ? 0 : wx - p.x) > 0 ? Math.min(wx, p.x + p.width - minW) : p.x;
        p.y = p.y + (p.height === minH ? 0 : wy - p.y) > 0 ? Math.min(wy, p.y + p.height - minH) : p.y;
        break;
      case 'tr':
        p.width = Math.max(minW, wx - p.x);
        p.height = Math.max(minH, p.y + p.height - wy);
        p.y = Math.min(wy, p.y + p.height - minH);
        break;
      case 'bl':
        p.width = Math.max(minW, p.x + p.width - wx);
        p.height = Math.max(minH, wy - p.y);
        p.x = Math.min(wx, p.x + p.width - minW);
        break;
      case 'br':
        p.width = Math.max(minW, wx - p.x);
        p.height = Math.max(minH, wy - p.y);
        break;
      case 'ml':
        p.width = Math.max(minW, p.x + p.width - wx);
        p.x = Math.min(wx, p.x + p.width - minW);
        break;
      case 'mr':
        p.width = Math.max(minW, wx - p.x);
        break;
      case 'mt':
        p.height = Math.max(minH, p.y + p.height - wy);
        p.y = Math.min(wy, p.y + p.height - minH);
        break;
      case 'mb':
        p.height = Math.max(minH, wy - p.y);
        break;
    }
  }

  moveElement(id: string, dx: number, dy: number): void {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    el.x += dx;
    el.y += dy;
  }

  screenToWorld(sx: number, sy: number, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    return {
      x: (sx - cx) / this.zoom + this.panX,
      y: -(sy - cy) / this.zoom + this.panY,
    };
  }

  worldToScreen(wx: number, wy: number, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    return {
      x: (wx - this.panX) * this.zoom + cx,
      y: -(wy - this.panY) * this.zoom + cy,
    };
  }

  exportJSON(): LevelData {
    return {
      name: 'untitled',
      version: 1,
      elements: this.elements.map(e => ({ ...e })),
    };
  }
}

export default EditorState;
