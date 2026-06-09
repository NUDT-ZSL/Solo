export interface QuadtreeItem {
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  ref?: unknown;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_OBJECTS = 10;
const MAX_LEVELS = 5;

export class Quadtree {
  private level: number;
  private bounds: Rect;
  private objects: QuadtreeItem[];
  private nodes: Quadtree[];

  constructor(bounds: Rect, level: number = 0) {
    this.level = level;
    this.bounds = bounds;
    this.objects = [];
    this.nodes = [];
  }

  clear(): void {
    this.objects = [];
    for (let i = 0; i < 4; i++) {
      if (this.nodes[i]) {
        this.nodes[i].clear();
      }
    }
    this.nodes = [];
  }

  private split(): void {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;
    const nextLevel = this.level + 1;
    this.nodes[0] = new Quadtree({ x: x + subWidth, y, width: subWidth, height: subHeight }, nextLevel);
    this.nodes[1] = new Quadtree({ x, y, width: subWidth, height: subHeight }, nextLevel);
    this.nodes[2] = new Quadtree({ x, y: y + subHeight, width: subWidth, height: subHeight }, nextLevel);
    this.nodes[3] = new Quadtree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, nextLevel);
  }

  private getIndex(item: QuadtreeItem): number {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
    const r = item.radius ?? 0;
    const w = item.width ?? r;
    const h = item.height ?? r;
    const topQuadrant = item.y - r < horizontalMidpoint && item.y + h < horizontalMidpoint;
    const bottomQuadrant = item.y - r > horizontalMidpoint;
    if (item.x - r < verticalMidpoint && item.x + w < verticalMidpoint) {
      if (topQuadrant) index = 1;
      else if (bottomQuadrant) index = 2;
    } else if (item.x - r > verticalMidpoint) {
      if (topQuadrant) index = 0;
      else if (bottomQuadrant) index = 3;
    }
    return index;
  }

  insert(item: QuadtreeItem): void {
    if (this.nodes.length > 0) {
      const idx = this.getIndex(item);
      if (idx !== -1) {
        this.nodes[idx].insert(item);
        return;
      }
    }
    this.objects.push(item);
    if (this.objects.length > MAX_OBJECTS && this.level < MAX_LEVELS) {
      if (this.nodes.length === 0) {
        this.split();
      }
      let i = 0;
      while (i < this.objects.length) {
        const idx = this.getIndex(this.objects[i]);
        if (idx !== -1) {
          const removed = this.objects.splice(i, 1)[0];
          this.nodes[idx].insert(removed);
        } else {
          i++;
        }
      }
    }
  }

  queryRange(range: { x: number; y: number; width: number; height: number }): QuadtreeItem[] {
    const found: QuadtreeItem[] = this._queryRange(range, []);
    return found;
  }

  private _queryRange(range: { x: number; y: number; width: number; height: number }, found: QuadtreeItem[]): QuadtreeItem[] {
    if (!this.intersects(this.bounds, range)) {
      return found;
    }
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const r = obj.radius ?? 0;
      const w = obj.width ?? r;
      const h = obj.height ?? r;
      if (
        obj.x - r <= range.x + range.width &&
        obj.x + w >= range.x &&
        obj.y - r <= range.y + range.height &&
        obj.y + h >= range.y
      ) {
        found.push(obj);
      }
    }
    for (let i = 0; i < 4; i++) {
      if (this.nodes[i]) {
        this.nodes[i]._queryRange(range, found);
      }
    }
    return found;
  }

  queryCircle(cx: number, cy: number, radius: number): QuadtreeItem[] {
    const range = { x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 };
    const candidates = this.queryRange(range);
    return candidates.filter(item => {
      const dx = cx - item.x;
      const dy = cy - item.y;
      return dx * dx + dy * dy <= radius * radius;
    });
  }

  private intersects(a: Rect, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }
}
