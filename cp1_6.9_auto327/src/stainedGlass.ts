import type { Point, Fragment, HSL, StainedGlass, LightPulse } from './types';

const WARM_PALETTE_HEX = ['#DC2626', '#F59E0B', '#FB923C', '#D946EF', '#F97316'];

function hexToHSL(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

const WARM_PALETTE: HSL[] = WARM_PALETTE_HEX.map(hexToHSL);

function hueDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonCentroid(vertices: Point[]): Point {
  let cx = 0, cy = 0, area = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const cross = vertices[j].x * vertices[i].y - vertices[i].x * vertices[j].y;
    cx += (vertices[j].x + vertices[i].x) * cross;
    cy += (vertices[j].y + vertices[i].y) * cross;
    area += cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-9) {
    cx = 0; cy = 0;
    for (const v of vertices) { cx += v.x; cy += v.y; }
    return { x: cx / vertices.length, y: cy / vertices.length };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function polygonArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    area += vertices[j].x * vertices[i].y - vertices[i].x * vertices[j].y;
  }
  return Math.abs(area) * 0.5;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function generateVoronoiSites(
  cx: number, cy: number, size: number, count: number
): Point[] {
  const half = size / 2;
  const sites: Point[] = [];
  for (let i = 0; i < count; i++) {
    sites.push({
      x: cx + (Math.random() - 0.5) * size * 0.9,
      y: cy + (Math.random() - 0.5) * size * 0.9,
    });
  }
  for (let iter = 0; iter < 3; iter++) {
    const newSites: Point[] = [];
    for (const s of sites) {
      let sx = 0, sy = 0, n = 0;
      for (const t of sites) {
        if (s === t) continue;
        const d = dist(s, t);
        if (d < size * 0.35) {
          const f = (size * 0.35 - d) / (size * 0.35);
          sx += (s.x - t.x) * f * 0.1;
          sy += (s.y - t.y) * f * 0.1;
          n++;
        }
      }
      let nx = s.x + sx;
      let ny = s.y + sy;
      nx = Math.max(cx - half * 0.95, Math.min(cx + half * 0.95, nx));
      ny = Math.max(cy - half * 0.95, Math.min(cy + half * 0.95, ny));
      newSites.push({ x: nx, y: ny });
    }
    for (let i = 0; i < sites.length; i++) sites[i] = newSites[i];
  }
  return sites;
}

interface HalfEdge {
  site: number;
  neighbor: number;
  angle: number;
  next: HalfEdge | null;
}

function buildVoronoiCells(sites: Point[], cx: number, cy: number, size: number): Point[][] {
  const n = sites.length;
  const half = size / 2;
  const minX = cx - half, maxX = cx + half;
  const minY = cy - half, maxY = cy + half;
  const cells: Point[][] = [];

  for (let i = 0; i < n; i++) {
    let cell: Point[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const mx = (sites[i].x + sites[j].x) / 2;
      const my = (sites[i].y + sites[j].y) / 2;
      const dx = sites[j].x - sites[i].x;
      const dy = sites[j].y - sites[i].y;
      cell = clipPolygonByLine(cell, mx, my, -dy, dx, sites[i]);
      if (cell.length < 3) break;
    }
    cells.push(cell);
  }
  return cells;
}

function lineSide(px: number, py: number, lx: number, ly: number, a: number, b: number): number {
  return a * (px - lx) + b * (py - ly);
}

function clipPolygonByLine(
  poly: Point[], lx: number, ly: number, a: number, b: number, insideRef: Point
): Point[] {
  const insideSign = lineSide(insideRef.x, insideRef.y, lx, ly, a, b);
  const result: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const s1 = lineSide(p1.x, p1.y, lx, ly, a, b);
    const s2 = lineSide(p2.x, p2.y, lx, ly, a, b);
    const in1 = (s1 * insideSign) >= 0;
    const in2 = (s2 * insideSign) >= 0;
    if (in1) {
      if (in2) {
        result.push(p2);
      } else {
        const t = s1 / (s1 - s2);
        result.push(lerpPoint(p1, p2, t));
      }
    } else if (in2) {
      const t = s1 / (s1 - s2);
      result.push(lerpPoint(p1, p2, t));
      result.push(p2);
    }
  }
  return result;
}

function computeNormal(centroid: Point, glassCenter: Point): Point {
  const dx = centroid.x - glassCenter.x;
  const dy = centroid.y - glassCenter.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

function assignColors(n: number): HSL[] {
  const result: HSL[] = [];
  const paletteCopy = WARM_PALETTE.map(c => ({ ...c }));
  for (let i = 0; i < n; i++) {
    let attempts = 0;
    let chosen: HSL;
    do {
      const fromPalette = paletteCopy[Math.floor(Math.random() * paletteCopy.length)];
      const jitterH = (Math.random() - 0.5) * 20;
      const jitterS = (Math.random() - 0.5) * 10;
      const jitterL = (Math.random() - 0.5) * 10;
      chosen = {
        h: (fromPalette.h + jitterH + 360) % 360,
        s: Math.max(60, Math.min(100, fromPalette.s + jitterS)),
        l: Math.max(35, Math.min(65, fromPalette.l + jitterL)),
      };
      attempts++;
      let ok = true;
      for (let k = Math.max(0, result.length - 4); k < result.length; k++) {
        if (hueDiff(chosen.h, result[k].h) < 30) { ok = false; break; }
      }
      if (ok || attempts > 20) break;
    } while (true);
    result.push(chosen);
  }
  return result;
}

function findNeighbors(cells: Point[][]): number[][] {
  const n = cells.length;
  const neighbors: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shareEdge(cells[i], cells[j])) {
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    }
  }
  return neighbors;
}

function shareEdge(a: Point[], b: Point[]): boolean {
  const threshold = 2;
  let shared = 0;
  for (const p of a) {
    for (const q of b) {
      if (dist(p, q) < threshold) { shared++; if (shared >= 2) return true; }
    }
  }
  return shared >= 2;
}

export function createStainedGlass(
  id: number, x: number, y: number, width: number, height: number, isMobile: boolean
): StainedGlass {
  const size = Math.min(width, height);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const fragmentCount = Math.floor(Math.random() * 5) + 8;
  const sites = generateVoronoiSites(cx, cy, size * 0.95, fragmentCount);
  const cells = buildVoronoiCells(sites, cx, cy, size * 0.95);
  const colors = assignColors(fragmentCount);
  const neighborList = findNeighbors(cells);

  const fragments: Fragment[] = cells.map((vertices, idx) => {
    const centroid = polygonCentroid(vertices);
    return {
      id: idx,
      vertices,
      centroid,
      baseColor: { ...colors[idx] },
      currentColor: { ...colors[idx] },
      opacity: 0.7,
      targetOpacity: 0.7,
      hueOffset: 0,
      targetHueOffset: 0,
      raiseOffset: 0,
      targetRaiseOffset: 0,
      isHovered: false,
      normal: computeNormal(centroid, { x: cx, y: cy }),
      area: polygonArea(vertices),
      neighbors: neighborList[idx] || [],
    };
  });

  return {
    id,
    x, y, width, height,
    fragments,
    breathPhase: Math.random() * Math.PI * 2,
    breathScale: 1,
    isMobile,
    boundingBox: { minX: x, minY: y, maxX: x + width, maxY: y + height },
  };
}

export function createGlassLayout(
  viewportWidth: number, viewportHeight: number, isMobile: boolean
): StainedGlass[] {
  const glasses: StainedGlass[] = [];
  let id = 0;

  if (isMobile) {
    const rows = 8;
    const cols = 1;
    const sizeMin = 80, sizeMax = 120;
    const totalHeight = rows * ((sizeMin + sizeMax) / 2 + 40);
    const startY = (viewportHeight - totalHeight) / 2;
    const centerX = viewportWidth / 2;
    for (let r = 0; r < rows; r++) {
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const x = centerX - size / 2 + (Math.random() - 0.5) * 10;
      const y = startY + r * (size + 40) + (Math.random() - 0.5) * 10;
      glasses.push(createStainedGlass(id++, x, y, size, size, true));
    }
  } else {
    const topCount = Math.floor(Math.random() * 2) + 4;
    const bottomCount = Math.floor(Math.random() * 2) + 4;
    const sizeMin = 120, sizeMax = 200;
    const gap = 30;
    const rowGap = 60;

    function layoutRow(count: number, rowY: number): number {
      const sizes: number[] = [];
      let totalW = 0;
      for (let i = 0; i < count; i++) {
        const s = sizeMin + Math.random() * (sizeMax - sizeMin);
        sizes.push(s);
        totalW += s;
      }
      totalW += gap * (count - 1);
      const startX = (viewportWidth - totalW) / 2;
      let x = startX;
      const maxSize = Math.max(...sizes);
      for (let i = 0; i < count; i++) {
        const jitterX = (Math.random() - 0.5) * 15;
        const jitterY = (Math.random() - 0.5) * 12;
        glasses.push(createStainedGlass(
          id++,
          x + jitterX,
          rowY + (maxSize - sizes[i]) / 2 + jitterY,
          sizes[i], sizes[i], false
        ));
        x += sizes[i] + gap;
      }
      return maxSize;
    }

    const avgSize = (sizeMin + sizeMax) / 2;
    const totalHeight = avgSize * 2 + rowGap;
    const startY = (viewportHeight - totalHeight) / 2;
    const topSize = layoutRow(topCount, startY);
    layoutRow(bottomCount, startY + topSize + rowGap);
  }

  return glasses;
}

export function updateStainedGlass(glass: StainedGlass, deltaTime: number): void {
  glass.breathPhase += (deltaTime / 1000) * (Math.PI * 2 / 3);
  glass.breathScale = 1 + Math.sin(glass.breathPhase) * 0.01;

  for (const f of glass.fragments) {
    const t = Math.min(1, deltaTime / 120);
    f.opacity = lerp(f.opacity, f.targetOpacity, t);
    f.raiseOffset = lerp(f.raiseOffset, f.targetRaiseOffset, t);
    f.hueOffset = lerp(f.hueOffset, f.targetHueOffset, Math.min(1, deltaTime / 300));
    f.currentColor = {
      h: (f.baseColor.h + f.hueOffset + 360) % 360,
      s: f.baseColor.s,
      l: f.baseColor.l,
    };
  }
}

export function renderStainedGlass(
  ctx: CanvasRenderingContext2D, glass: StainedGlass, time: number
): void {
  const cx = glass.x + glass.width / 2;
  const cy = glass.y + glass.height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(glass.breathScale, glass.breathScale);
  ctx.translate(-cx, -cy);

  const glowRadius = 4;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 240, 220, 0.3)';
  ctx.shadowBlur = glowRadius * 2;
  ctx.strokeStyle = 'rgba(200, 200, 210, 0.9)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(glass.x, glass.y, glass.width, glass.height);
  ctx.restore();

  for (const f of glass.fragments) {
    if (f.vertices.length < 3) continue;
    ctx.beginPath();
    const offsetX = f.normal.x * f.raiseOffset;
    const offsetY = f.normal.y * f.raiseOffset;
    ctx.moveTo(f.vertices[0].x + offsetX, f.vertices[0].y + offsetY);
    for (let i = 1; i < f.vertices.length; i++) {
      ctx.lineTo(f.vertices[i].x + offsetX, f.vertices[i].y + offsetY);
    }
    ctx.closePath();

    const color = f.currentColor;
    ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${f.opacity})`;
    ctx.fill();
  }

  ctx.save();
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  for (const f of glass.fragments) {
    if (f.vertices.length < 3) continue;
    ctx.beginPath();
    const offsetX = f.normal.x * f.raiseOffset;
    const offsetY = f.normal.y * f.raiseOffset;
    ctx.moveTo(f.vertices[0].x + offsetX, f.vertices[0].y + offsetY);
    for (let i = 1; i < f.vertices.length; i++) {
      ctx.lineTo(f.vertices[i].x + offsetX, f.vertices[i].y + offsetY);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(220, 220, 230, 0.85)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(glass.x, glass.y, glass.width, glass.height);

  ctx.restore();
}

function pointInPolygon(px: number, py: number, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findHoveredFragment(
  glasses: StainedGlass[], mx: number, my: number
): { glass: StainedGlass; fragment: Fragment } | null {
  for (const g of glasses) {
    const bb = g.boundingBox;
    const pad = 20;
    if (mx < bb.minX - pad || mx > bb.maxX + pad || my < bb.minY - pad || my > bb.maxY + pad) continue;
    for (let i = g.fragments.length - 1; i >= 0; i--) {
      const f = g.fragments[i];
      const offsetX = f.normal.x * f.raiseOffset;
      const offsetY = f.normal.y * f.raiseOffset;
      const shiftedVerts = f.vertices.map(v => ({ x: v.x + offsetX, y: v.y + offsetY }));
      if (pointInPolygon(mx, my, shiftedVerts)) {
        return { glass: g, fragment: f };
      }
    }
  }
  return null;
}

export function clearHoverStates(glasses: StainedGlass[]): void {
  for (const g of glasses) {
    for (const f of g.fragments) {
      f.isHovered = false;
      f.targetOpacity = 0.7;
      f.targetRaiseOffset = 0;
    }
  }
}

export function setHovered(
  glass: StainedGlass, fragment: Fragment, hovered: boolean
): void {
  fragment.isHovered = hovered;
  fragment.targetOpacity = hovered ? 0.4 : 0.7;
  fragment.targetRaiseOffset = hovered ? 3 : 0;
}

export class LightPulseSystem {
  private pulses: LightPulse[] = [];

  trigger(glass: StainedGlass, fragment: Fragment): void {
    const pulse: LightPulse = {
      glassId: glass.id,
      fragmentId: fragment.id,
      x: fragment.centroid.x,
      y: fragment.centroid.y,
      radius: 0,
      maxRadius: Math.max(glass.width, glass.height) * 1.2,
      opacity: 1,
      color: { ...fragment.baseColor },
      active: true,
      affectedFragments: new Set<number>(),
    };
    pulse.affectedFragments.add(fragment.id);
    const visited = new Set<number>();
    visited.add(fragment.id);
    let frontier: number[] = [fragment.id];
    while (frontier.length > 0) {
      const next: number[] = [];
      for (const fid of frontier) {
        const frag = glass.fragments[fid];
        if (!frag) continue;
        for (const nid of frag.neighbors) {
          if (!visited.has(nid)) {
            visited.add(nid);
            next.push(nid);
          }
        }
      }
      for (const nid of next) pulse.affectedFragments.add(nid);
      frontier = next;
    }
    this.pulses.push(pulse);
    this.applyPulseHue(glass, pulse);
  }

  private applyPulseHue(glass: StainedGlass, pulse: LightPulse): void {
    for (const fid of pulse.affectedFragments) {
      const frag = glass.fragments[fid];
      if (!frag || fid === pulse.fragmentId) continue;
      frag.targetHueOffset = 30;
    }
    setTimeout(() => {
      for (const fid of pulse.affectedFragments) {
        const frag = glass.fragments[fid];
        if (frag) frag.targetHueOffset = 0;
      }
    }, 800);
  }

  update(glasses: StainedGlass[], deltaTime: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.radius += (deltaTime / 1000) * 600;
      const t = p.radius / p.maxRadius;
      p.opacity = Math.max(0, 1 - t);
      if (p.radius >= p.maxRadius) {
        this.pulses.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, glasses: StainedGlass[]): void {
    for (const p of this.pulses) {
      const glass = glasses.find(g => g.id === p.glassId);
      if (!glass) continue;
      const cx = glass.x + glass.width / 2;
      const cy = glass.y + glass.height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(glass.breathScale, glass.breathScale);
      ctx.translate(-cx, -cy);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${p.color.h}, ${p.color.s}%, ${Math.min(80, p.color.l + 20)}%, ${p.opacity * 0.8})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${p.color.h}, ${p.color.s}%, ${Math.min(85, p.color.l + 25)}%, ${p.opacity * 0.4})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  clear(): void {
    this.pulses = [];
  }
}
