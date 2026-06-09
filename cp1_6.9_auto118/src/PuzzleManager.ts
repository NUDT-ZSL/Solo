import type { PuzzlePiece, Vertex, LevelConfig } from './types';
import { COLOR_PALETTES, PHYSICS } from './types';

interface Triangle {
  a: Vertex;
  b: Vertex;
  c: Vertex;
}

interface Edge {
  start: Vertex;
  end: Vertex;
  isBorder: boolean;
}

export class PuzzleManager {
  private config!: LevelConfig;
  private paletteIndex = 0;

  setLevel(config: LevelConfig): void {
    this.config = config;
    this.paletteIndex = (config.level - 1) % COLOR_PALETTES.length;
  }

  generateAbstractArt(ctx: CanvasRenderingContext2D, size: number, colors: string[]): void {
    const padding = size * 0.05;
    const innerSize = size - padding * 2;

    for (let layer = 0; layer < 12; layer++) {
      const shapeType = layer % 4;
      const color = colors[layer % colors.length];
      ctx.save();
      ctx.globalAlpha = 0.28 + (layer / 12) * 0.55;

      switch (shapeType) {
        case 0: {
          const cx = padding + Math.random() * innerSize;
          const cy = padding + Math.random() * innerSize;
          const r = 40 + Math.random() * (innerSize * 0.35);
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, this.shadeColor(color, 20));
          grad.addColorStop(1, this.shadeColor(color, -30));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 1: {
          ctx.translate(padding + Math.random() * innerSize, padding + Math.random() * innerSize);
          ctx.rotate(Math.random() * Math.PI);
          const w = 60 + Math.random() * innerSize * 0.4;
          const h = 40 + Math.random() * innerSize * 0.25;
          const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
          grad.addColorStop(0, this.shadeColor(color, -20));
          grad.addColorStop(0.5, color);
          grad.addColorStop(1, this.shadeColor(color, 20));
          ctx.fillStyle = grad;
          this.roundRect(ctx, -w / 2, -h / 2, w, h, 12);
          ctx.fill();
          break;
        }
        case 2: {
          const cx = padding + Math.random() * innerSize;
          const cy = padding + Math.random() * innerSize;
          const r = 60 + Math.random() * innerSize * 0.4;
          const sides = 3 + Math.floor(Math.random() * 4);
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, color);
          grad.addColorStop(1, this.shadeColor(color, -40));
          ctx.fillStyle = grad;
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 3: {
          ctx.translate(padding + innerSize / 2 + (Math.random() - 0.5) * innerSize * 0.6,
                        padding + innerSize / 2 + (Math.random() - 0.5) * innerSize * 0.6);
          ctx.rotate(Math.random() * Math.PI * 2);
          ctx.fillStyle = color;
          const w = 30 + Math.random() * 60;
          const h = 80 + Math.random() * innerSize * 0.35;
          const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
          grad.addColorStop(0, this.shadeColor(color, 30));
          grad.addColorStop(0.5, color);
          grad.addColorStop(1, this.shadeColor(color, -30));
          ctx.fillStyle = grad;
          this.roundRect(ctx, -w / 2, -h / 2, w, h, 8);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.15;
    const noiseGrad = ctx.createLinearGradient(0, 0, size, size);
    noiseGrad.addColorStop(0, '#ffffff');
    noiseGrad.addColorStop(1, '#000000');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = noiseGrad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  generatePieces(config: LevelConfig, templateCanvas: HTMLCanvasElement): PuzzlePiece[] {
    this.setLevel(config);
    const palette = COLOR_PALETTES[this.paletteIndex].slice(0, config.colorCount);
    const size = config.canvasSize;
    const n = config.pieceCount;

    let seeds: Vertex[];
    let voronoiCells: Vertex[][];
    let attempts = 0;
    do {
      seeds = this.generateSeeds(n, size);
      for (let i = 0; i < 3; i++) seeds = this.lloydRelax(seeds, size);
      voronoiCells = this.computeVoronoi(seeds, size);
      attempts++;
    } while (!this.validateAreas(voronoiCells, size) && attempts < 15);

    const minArea = 2000 * Math.pow(size / 500, 2);
    const maxArea = 5000 * Math.pow(size / 500, 2);

    const pieces: PuzzlePiece[] = [];
    const poles: ('+' | '-')[] = this.assignPoles(n);

    for (let i = 0; i < n; i++) {
      const seed = seeds[i];
      const cell = this.roundPolygonVertices(voronoiCells[i], 10);
      const centroid = this.polygonCentroid(cell);
      const localVerts = cell.map(v => ({ x: v.x - centroid.x, y: v.y - centroid.y }));
      const area = this.polygonArea(cell);
      const areaScale = Math.max(Math.min(maxArea / Math.max(area, 1), 1.2), Math.sqrt(minArea / Math.max(area, 1)));
      const scaledVerts = localVerts.map(v => ({ x: v.x * areaScale, y: v.y * areaScale }));
      const color = palette[i % palette.length];

      const edgePos = this.getEdgeSpawnPosition(i, n, size);
      const strengthVar = config.magnetStrengthVariance;
      const magnetStrength = 1.0 + (Math.random() * 2 - 1) * strengthVar;

      const piece: PuzzlePiece = {
        id: i,
        x: edgePos.x,
        y: edgePos.y,
        vx: 0,
        vy: 0,
        targetX: centroid.x,
        targetY: centroid.y,
        pole: poles[i],
        magnetStrength,
        vertices: scaledVerts,
        color,
        gradientColors: [this.shadeColor(color, 25), this.shadeColor(color, -20)],
        isSnapped: false,
        isDragging: false,
        dragStartTime: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        flashTimer: 0,
        area: area * areaScale * areaScale,
        centroid: { x: 0, y: 0 },
        cachedCanvas: null,
      };
      piece.cachedCanvas = this.createPieceCache(piece, templateCanvas, centroid);
      pieces.push(piece);
    }

    return pieces;
  }

  checkSnap(piece: PuzzlePiece): boolean {
    if (piece.isSnapped) return false;
    const dx = piece.x - piece.targetX;
    const dy = piece.y - piece.targetY;
    const dist = Math.hypot(dx, dy);
    return dist < PHYSICS.SNAP_DISTANCE;
  }

  isNearTarget(piece: PuzzlePiece): boolean {
    const dx = piece.x - piece.targetX;
    const dy = piece.y - piece.targetY;
    return Math.hypot(dx, dy) < PHYSICS.HIGHLIGHT_DISTANCE;
  }

  pointInPiece(px: number, py: number, piece: PuzzlePiece): boolean {
    const localX = px - piece.x;
    const localY = py - piece.y;
    return this.pointInPolygon({ x: localX, y: localY }, piece.vertices);
  }

  private generateSeeds(n: number, size: number): Vertex[] {
    const seeds: Vertex[] = [];
    const margin = size * 0.12;
    for (let i = 0; i < n; i++) {
      seeds.push({
        x: margin + Math.random() * (size - margin * 2),
        y: margin + Math.random() * (size - margin * 2),
      });
    }
    return seeds;
  }

  private lloydRelax(seeds: Vertex[], size: number): Vertex[] {
    const cells = this.computeVoronoi(seeds, size);
    return cells.map(cell => this.polygonCentroid(cell));
  }

  private computeVoronoi(seeds: Vertex[], size: number): Vertex[][] {
    const margin = size * 0.02;
    const superSize = size * 2;
    const superTri: Triangle = {
      a: { x: -superSize, y: -superSize },
      b: { x: superSize * 3, y: -superSize },
      c: { x: -superSize, y: superSize * 3 },
    };

    let triangles: Triangle[] = [superTri];

    for (const point of seeds) {
      const badTriangles: Triangle[] = [];
      for (const t of triangles) {
        if (this.inCircumcircle(point, t)) badTriangles.push(t);
      }

      const polygon: Edge[] = [];
      for (const t of badTriangles) {
        const edges: Edge[] = [
          { start: t.a, end: t.b, isBorder: false },
          { start: t.b, end: t.c, isBorder: false },
          { start: t.c, end: t.a, isBorder: false },
        ];
        for (const e of edges) {
          let shared = false;
          for (const other of badTriangles) {
            if (other === t) continue;
            if (this.edgeInTriangle(e, other)) { shared = true; break; }
          }
          if (!shared) polygon.push(e);
        }
      }

      triangles = triangles.filter(t => !badTriangles.includes(t));
      for (const e of polygon) {
        triangles.push({ a: e.start, b: e.end, c: { ...point } });
      }
    }

    triangles = triangles.filter(t =>
      !this.sharesVertex(t, superTri.a) &&
      !this.sharesVertex(t, superTri.b) &&
      !this.sharesVertex(t, superTri.c)
    );

    const cells: Map<string, Vertex[]> = new Map();
    for (let i = 0; i < seeds.length; i++) {
      cells.set(`${seeds[i].x},${seeds[i].y}`, []);
    }

    const edgeToTriangles = new Map<string, number[]>();
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const edges = [
        this.edgeKey(t.a, t.b),
        this.edgeKey(t.b, t.c),
        this.edgeKey(t.c, t.a),
      ];
      for (const ek of edges) {
        if (!edgeToTriangles.has(ek)) edgeToTriangles.set(ek, []);
        edgeToTriangles.get(ek)!.push(i);
      }
    }

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const seedTriIndices: number[] = [];
      for (let ti = 0; ti < triangles.length; ti++) {
        if (this.pointInTriangle(seed, triangles[ti])) {
          seedTriIndices.push(ti);
          break;
        }
      }

      if (seedTriIndices.length === 0) continue;
      const visited = new Set<number>();
      const queue = [...seedTriIndices];
      const cellTriangles: Triangle[] = [];

      while (queue.length > 0) {
        const ti = queue.shift()!;
        if (visited.has(ti)) continue;
        visited.add(ti);
        cellTriangles.push(triangles[ti]);
        const t = triangles[ti];
        const edges = [this.edgeKey(t.a, t.b), this.edgeKey(t.b, t.c), this.edgeKey(t.c, t.a)];
        for (const ek of edges) {
          const neighbors = edgeToTriangles.get(ek) || [];
          for (const ni of neighbors) {
            if (!visited.has(ni) && this.triangleHasSeed(triangles[ni], seed, seeds)) {
              queue.push(ni);
            }
          }
        }
      }

      const circumcenters: Vertex[] = cellTriangles.map(t => this.circumcenter(t));
      const ordered = this.sortByAngle(circumcenters, seed);
      const clipped = this.clipPolygonToBounds(ordered, { x: margin, y: margin }, { x: size - margin, y: size - margin });
      cells.set(`${seed.x},${seed.y}`, clipped.length > 2 ? clipped : ordered);
    }

    const result: Vertex[][] = [];
    for (const s of seeds) {
      const cell = cells.get(`${s.x},${s.y}`) || [];
      result.push(cell.length > 2 ? cell : this.makeFallbackCell(s, size, margin));
    }
    return result;
  }

  private triangleHasSeed(t: Triangle, seed: Vertex, seeds: Vertex[]): boolean {
    const cc = this.circumcenter(t);
    let nearest = seeds[0];
    let nearestDist = Infinity;
    for (const s of seeds) {
      const d = (s.x - cc.x) ** 2 + (s.y - cc.y) ** 2;
      if (d < nearestDist) { nearestDist = d; nearest = s; }
    }
    return nearest === seed || (Math.abs(nearest.x - seed.x) < 0.01 && Math.abs(nearest.y - seed.y) < 0.01);
  }

  private inCircumcircle(p: Vertex, t: Triangle): boolean {
    const ax = t.a.x - p.x, ay = t.a.y - p.y;
    const bx = t.b.x - p.x, by = t.b.y - p.y;
    const cx = t.c.x - p.x, cy = t.c.y - p.y;
    const det =
      (ax * ax + ay * ay) * (bx * cy - cx * by) -
      (bx * bx + by * by) * (ax * cy - cx * ay) +
      (cx * cx + cy * cy) * (ax * by - bx * ay);
    return det > 0;
  }

  private circumcenter(t: Triangle): Vertex {
    const ax = t.a.x, ay = t.a.y;
    const bx = t.b.x, by = t.b.y;
    const cx = t.c.x, cy = t.c.y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-9) return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3 };
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { x: ux, y: uy };
  }

  private sharesVertex(t: Triangle, v: Vertex): boolean {
    return (t.a.x === v.x && t.a.y === v.y) ||
           (t.b.x === v.x && t.b.y === v.y) ||
           (t.c.x === v.x && t.c.y === v.y);
  }

  private edgeKey(a: Vertex, b: Vertex): string {
    if (a.x < b.x || (a.x === b.x && a.y < b.y)) return `${a.x},${a.y}-${b.x},${b.y}`;
    return `${b.x},${b.y}-${a.x},${a.y}`;
  }

  private edgeInTriangle(e: Edge, t: Triangle): boolean {
    const verts = [t.a, t.b, t.c];
    let sMatch = false, eMatch = false;
    for (const v of verts) {
      if (Math.abs(v.x - e.start.x) < 1e-6 && Math.abs(v.y - e.start.y) < 1e-6) sMatch = true;
      if (Math.abs(v.x - e.end.x) < 1e-6 && Math.abs(v.y - e.end.y) < 1e-6) eMatch = true;
    }
    return sMatch && eMatch;
  }

  private pointInTriangle(p: Vertex, t: Triangle): boolean {
    const d1 = this.sign(p, t.a, t.b);
    const d2 = this.sign(p, t.b, t.c);
    const d3 = this.sign(p, t.c, t.a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  private sign(p1: Vertex, p2: Vertex, p3: Vertex): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  private sortByAngle(points: Vertex[], center: Vertex): Vertex[] {
    return [...points].sort((a, b) => {
      const a1 = Math.atan2(a.y - center.y, a.x - center.x);
      const a2 = Math.atan2(b.y - center.y, b.x - center.x);
      return a1 - a2;
    });
  }

  private clipPolygonToBounds(poly: Vertex[], min: Vertex, max: Vertex): Vertex[] {
    let result = [...poly];
    const edges: Array<[Vertex, Vertex, (p: Vertex) => boolean]> = [
      [min, { x: max.x, y: min.y }, (p) => p.y >= min.y],
      [{ x: max.x, y: min.y }, max, (p) => p.x <= max.x],
      [max, { x: min.x, y: max.y }, (p) => p.y <= max.y],
      [{ x: min.x, y: max.y }, min, (p) => p.x >= min.x],
    ];

    for (const [a, b, inside] of edges) {
      if (result.length === 0) break;
      const output: Vertex[] = [];
      let s = result[result.length - 1];
      for (const e of result) {
        if (inside(e)) {
          if (!inside(s)) output.push(this.intersectEdge(s, e, a, b));
          output.push(e);
        } else if (inside(s)) {
          output.push(this.intersectEdge(s, e, a, b));
        }
        s = e;
      }
      result = output;
    }
    return result;
  }

  private intersectEdge(p1: Vertex, p2: Vertex, p3: Vertex, p4: Vertex): Vertex {
    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 1e-9) return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }

  private validateAreas(cells: Vertex[][], size: number): boolean {
    const minArea = 2000 * Math.pow(size / 500, 2);
    const maxArea = 5000 * Math.pow(size / 500, 2);
    for (const cell of cells) {
      const a = this.polygonArea(cell);
      if (a < minArea * 0.6 || a > maxArea * 1.5) return false;
    }
    return true;
  }

  private polygonArea(verts: Vertex[]): number {
    let area = 0;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      area += (verts[j].x + verts[i].x) * (verts[j].y - verts[i].y);
    }
    return Math.abs(area / 2);
  }

  private polygonCentroid(verts: Vertex[]): Vertex {
    let cx = 0, cy = 0, a = 0;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const cross = verts[j].x * verts[i].y - verts[i].x * verts[j].y;
      cx += (verts[j].x + verts[i].x) * cross;
      cy += (verts[j].y + verts[i].y) * cross;
      a += cross;
    }
    a *= 3;
    if (Math.abs(a) < 1e-6) return { x: verts[0].x, y: verts[0].y };
    return { x: cx / a, y: cy / a };
  }

  private pointInPolygon(p: Vertex, verts: Vertex[]): boolean {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      if ((yi > p.y) !== (yj > p.y) &&
          p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  private roundPolygonVertices(verts: Vertex[], segments: number): Vertex[] {
    if (verts.length < 3) return verts;
    const result: Vertex[] = [];
    for (let i = 0; i < verts.length; i++) {
      const prev = verts[(i - 1 + verts.length) % verts.length];
      const curr = verts[i];
      const next = verts[(i + 1) % verts.length];
      for (let s = 0; s < segments; s++) {
        const t = (s + 1) / (segments + 1);
        const t1 = 1 - t;
        const x1 = prev.x * t1 + curr.x * t;
        const y1 = prev.y * t1 + curr.y * t;
        const x2 = curr.x * t1 + next.x * t;
        const y2 = curr.y * t1 + next.y * t;
        const bx = x1 * t1 + x2 * t;
        const by = y1 * t1 + y2 * t;
        if (s === 0 || s === segments - 1 || segments <= 2) result.push({ x: bx, y: by });
        else if (s % Math.ceil(segments / 4) === 0) result.push({ x: bx, y: by });
      }
      result.push(curr);
    }
    return result.filter((_, i, arr) => {
      const prev = arr[(i - 1 + arr.length) % arr.length];
      return Math.hypot(prev.x - arr[i].x, prev.y - arr[i].y) > 0.5;
    });
  }

  private makeFallbackCell(seed: Vertex, size: number, margin: number): Vertex[] {
    const r = size * 0.18;
    const sides = 6;
    const verts: Vertex[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      verts.push({
        x: Math.max(margin, Math.min(size - margin, seed.x + Math.cos(a) * r)),
        y: Math.max(margin, Math.min(size - margin, seed.y + Math.sin(a) * r)),
      });
    }
    return verts;
  }

  private assignPoles(n: number): ('+' | '-')[] {
    const poles: ('+' | '-')[] = [];
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) poles.push('+');
    for (let i = half; i < n; i++) poles.push('-');
    for (let i = poles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poles[i], poles[j]] = [poles[j], poles[i]];
    }
    return poles;
  }

  private getEdgeSpawnPosition(idx: number, total: number, size: number): Vertex {
    const side = idx % 4;
    const t = (Math.floor(idx / 4) + Math.random() * 0.7) / (Math.ceil(total / 4) + 1);
    const margin = size * 0.06;
    const innerSize = size - margin * 2;
    switch (side) {
      case 0: return { x: margin + t * innerSize, y: margin + Math.random() * size * 0.05 };
      case 1: return { x: size - margin - Math.random() * size * 0.05, y: margin + t * innerSize };
      case 2: return { x: margin + (1 - t) * innerSize, y: size - margin - Math.random() * size * 0.05 };
      default: return { x: margin + Math.random() * size * 0.05, y: margin + (1 - t) * innerSize };
    }
  }

  private createPieceCache(piece: PuzzlePiece, templateCanvas: HTMLCanvasElement, worldCentroid: Vertex): HTMLCanvasElement {
    const bounds = this.getPolygonBounds(piece.vertices);
    const pad = 4;
    const w = Math.ceil(bounds.w + pad * 2);
    const h = Math.ceil(bounds.h + pad * 2);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const srcX = Math.max(0, Math.floor(worldCentroid.x + bounds.minX - pad));
    const srcY = Math.max(0, Math.floor(worldCentroid.y + bounds.minY - pad));
    const srcW = Math.min(templateCanvas.width - srcX, w);
    const srcH = Math.min(templateCanvas.height - srcY, h);

    ctx.save();
    ctx.translate(-bounds.minX + pad, -bounds.minY + pad);
    this.drawPolygonPath(ctx, piece.vertices);
    ctx.clip();
    if (srcW > 0 && srcH > 0) {
      ctx.drawImage(templateCanvas, srcX, srcY, srcW, srcH, bounds.minX - pad, bounds.minY - pad, srcW, srcH);
    }

    const grad = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    grad.addColorStop(0, 'rgba(255,255,255,0.28)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = grad;
    ctx.fill();

    const metalGrad = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.minY);
    metalGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    metalGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    metalGrad.addColorStop(1, 'rgba(255,255,255,0.1)');
    ctx.fillStyle = metalGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-bounds.minX + pad, -bounds.minY + pad);
    this.drawPolygonPath(ctx, piece.vertices);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = piece.gradientColors[0];
    ctx.shadowColor = piece.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
    ctx.restore();

    piece.centroid = {
      x: -bounds.minX + pad,
      y: -bounds.minY + pad,
    };
    return canvas;
  }

  private getPolygonBounds(verts: Vertex[]): { minX: number; maxX: number; minY: number; maxY: number; w: number; h: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of verts) {
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
  }

  drawPolygonPath(ctx: CanvasRenderingContext2D, verts: Vertex[]): void {
    ctx.beginPath();
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      if (i === 0) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private shadeColor(hex: string, percent: number): string {
    const h = hex.replace('#', '');
    let r = parseInt(h.substring(0, 2), 16);
    let g = parseInt(h.substring(2, 4), 16);
    let b = parseInt(h.substring(4, 6), 16);
    const p = percent / 100;
    r = Math.round(Math.min(255, Math.max(0, r + (p > 0 ? (255 - r) : r) * p)));
    g = Math.round(Math.min(255, Math.max(0, g + (p > 0 ? (255 - g) : g) * p)));
    b = Math.round(Math.min(255, Math.max(0, b + (p > 0 ? (255 - b) : b) * p)));
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }
}
