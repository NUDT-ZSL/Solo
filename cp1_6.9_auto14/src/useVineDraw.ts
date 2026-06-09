import { useRef, useCallback, useState, useEffect } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface VinePath {
  id: string;
  points: Point[];
  color: string;
  baseColor: string;
  thickness: number;
  isMain: boolean;
  parentId?: string;
  createdAt: number;
  opacity: number;
  scale: number;
  noiseIntensity: number;
  hsvHue: number;
  hsvSat: number;
}

export interface VineNode {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  vineAId: string;
  vineBId: string;
  scale: number;
  opacity: number;
}

export interface VineStep {
  paths: VinePath[];
  nodes: VineNode[];
}

export interface AnimationState {
  isAnimating: boolean;
  startTime: number;
}

const PERM = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + t * (b - a); }
function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlinNoise(x: number, y: number, freq: number = 0.05): number {
  const xf = x * freq, yf = y * freq;
  const xi = Math.floor(xf) & 255, yi = Math.floor(yf) & 255;
  const xf0 = xf - Math.floor(xf), yf0 = yf - Math.floor(yf);
  const u = fade(xf0), v = fade(yf0);
  const aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi], bb = PERM[PERM[xi + 1] + yi + 1];
  return lerp(
    lerp(grad(aa, xf0, yf0), grad(ba, xf0 - 1, yf0), u),
    lerp(grad(ab, xf0, yf0 - 1), grad(bb, xf0 - 1, yf0 - 1), u),
    v
  );
}

export function hsvToRgb(h: number, s: number, v: number): string {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 74, g: 123, b: 61 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

export function mixColors(colorA: string, colorB: string, ratioA: number = 0.5): string {
  const a = hexToRgb(colorA.startsWith('#') ? colorA : rgbStrToHex(colorA));
  const b = hexToRgb(colorB.startsWith('#') ? colorB : rgbStrToHex(colorB));
  return rgbToHex(
    a.r * ratioA + b.r * (1 - ratioA),
    a.g * ratioA + b.g * (1 - ratioA),
    a.b * ratioA + b.b * (1 - ratioA)
  );
}

function rgbStrToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '#4A7B3D';
  return rgbToHex(parseInt(m[0]), parseInt(m[1]), parseInt(m[2]));
}

export function smoothCatmullRom(points: Point[], segments: number = 4): Point[] {
  if (points.length < 2) return points.slice();
  const result: Point[] = [];
  const pts = [points[0], ...points, points[points.length - 1]];
  for (let i = 0; i < pts.length - 3; i++) {
    const p0 = pts[i], p1 = pts[i + 1], p2 = pts[i + 2], p3 = pts[i + 3];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t, t3 = t2 * t;
      result.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pointToSegDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function pathTotalLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

export function pointAtLength(points: Point[], targetLen: number): { point: Point; dir: Point; index: number } {
  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const d = dist(points[i - 1], points[i]);
    if (accumulated + d >= targetLen) {
      const t = d === 0 ? 0 : (targetLen - accumulated) / d;
      const p = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
      };
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      return { point: p, dir: { x: dx / mag, y: dy / mag }, index: i };
    }
    accumulated += d;
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2] || last;
  const dx = last.x - prev.x, dy = last.y - prev.y;
  const mag = Math.sqrt(dx * dx + dy * dy) || 1;
  return { point: last, dir: { x: dx / mag, y: dy / mag }, index: points.length - 1 };
}

function genId(): string { return Math.random().toString(36).slice(2, 10); }

export const BASE_COLORS = ['#4A7B3D', '#5D8A3C', '#6B8E23', '#8F7C5A'];

export interface VineDrawState {
  paths: VinePath[];
  nodes: VineNode[];
  currentSpeed: number;
  currentColor: string;
}

export function useVineDraw() {
  const [, forceUpdate] = useState(0);
  const pathsRef = useRef<VinePath[]>([]);
  const nodesRef = useRef<VineNode[]>([]);
  const undoStack = useRef<VineStep[]>([]);
  const redoStack = useRef<VineStep[]>([]);
  const drawingRef = useRef(false);
  const currentMainIdRef = useRef<string | null>(null);
  const lastDrawTimeRef = useRef<number>(0);
  const lastMouseDirRef = useRef<Point>({ x: 1, y: 0 });
  const accumulatedBranchLenRef = useRef(0);
  const speedRef = useRef(0);
  const animStateRef = useRef<AnimationState>({ isAnimating: false, startTime: 0 });
  const animPathsRef = useRef<Map<string, { velocity: Point[] }>>(new Map());
  const [currentColor, setCurrentColor] = useState<string>(BASE_COLORS[0]);
  const currentColorRef = useRef<string>(BASE_COLORS[0]);

  const MAX_HISTORY = 20;
  const MIN_SAMPLE_DIST = 3;
  const BRANCH_INTERVAL = 80;
  const NODE_FUSE_DIST = 15;

  useEffect(() => { currentColorRef.current = currentColor; }, [currentColor]);

  const getState = useCallback((): VineDrawState => ({
    paths: pathsRef.current,
    nodes: nodesRef.current,
    currentSpeed: speedRef.current,
    currentColor: currentColorRef.current
  }), []);

  const pushHistory = useCallback(() => {
    const snap: VineStep = {
      paths: JSON.parse(JSON.stringify(pathsRef.current)),
      nodes: JSON.parse(JSON.stringify(nodesRef.current))
    };
    undoStack.current.push(snap);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const restoreStep = useCallback((step: VineStep) => {
    pathsRef.current = JSON.parse(JSON.stringify(step.paths));
    nodesRef.current = JSON.parse(JSON.stringify(step.nodes));
    forceUpdate(n => n + 1);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return false;
    const current: VineStep = {
      paths: JSON.parse(JSON.stringify(pathsRef.current)),
      nodes: JSON.parse(JSON.stringify(nodesRef.current))
    };
    redoStack.current.push(current);
    const prev = undoStack.current.pop()!;
    restoreStep(prev);
    return true;
  }, [restoreStep]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return false;
    const current: VineStep = {
      paths: JSON.parse(JSON.stringify(pathsRef.current)),
      nodes: JSON.parse(JSON.stringify(nodesRef.current))
    };
    undoStack.current.push(current);
    const next = redoStack.current.pop()!;
    restoreStep(next);
    return true;
  }, [restoreStep]);

  const colorForSpeed = useCallback((speedPxPerSec: number, baseHex: string) => {
    let hue = 120, sat = 50, val = 50;
    if (speedPxPerSec < 100) {
      hue = 120; sat = 50; val = 45;
    } else if (speedPxPerSec > 300) {
      hue = 100; sat = 80; val = 60;
    } else {
      const t = (speedPxPerSec - 100) / 200;
      hue = 120 - t * 20;
      sat = 50 + t * 30;
      val = 45 + t * 15;
    }
    const baseRgb = hexToRgb(baseHex);
    const dynamic = hsvToRgb(hue, sat / 100, val / 100);
    const dynRgb = hexToRgb(dynamic.startsWith('#') ? dynamic : rgbStrToHex(dynamic));
    const mixed = rgbToHex(
      baseRgb.r * 0.5 + dynRgb.r * 0.5,
      baseRgb.g * 0.5 + dynRgb.g * 0.5,
      baseRgb.b * 0.5 + dynRgb.b * 0.5
    );
    return { color: mixed, hue, sat };
  }, []);

  const thicknessForSpeed = useCallback((speedPxPerSec: number): number => {
    if (speedPxPerSec < 100) return 5;
    if (speedPxPerSec > 300) return 2;
    return 5 - (speedPxPerSec - 100) / 200 * 3;
  }, []);

  const noiseForSpeed = useCallback((speedPxPerSec: number): number => {
    if (speedPxPerSec < 100) return 0.3;
    if (speedPxPerSec > 300) return 0.6;
    return 0.3 + (speedPxPerSec - 100) / 200 * 0.3;
  }, []);

  const createSpiralTendril = useCallback((origin: Point, dir: Point, length: number): Point[] => {
    const points: Point[] = [];
    const turns = 2 + Math.random() * 1.5;
    const perp = { x: -dir.y, y: dir.x };
    const steps = Math.max(12, Math.floor(length * 0.8));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const along = t * length;
      const angle = t * turns * Math.PI * 2;
      const radius = (1 - t) * length * 0.25;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      points.push({
        x: origin.x + dir.x * along + perp.x * dx + dir.y * dy,
        y: origin.y + dir.y * along + perp.y * dx - dir.x * dy
      });
    }
    return points;
  }, []);

  const createBranch = useCallback((parentPath: VinePath, origin: Point, dir: Point, length: number, isTendril: boolean, speed: number): VinePath => {
    const baseHex = parentPath.baseColor;
    const { color, hue, sat } = colorForSpeed(speed * (isTendril ? 0.7 : 0.85), baseHex);
    let points: Point[];
    if (isTendril) {
      points = createSpiralTendril(origin, dir, length);
    } else {
      const steps = Math.max(8, Math.floor(length / 4));
      points = [origin];
      let curX = origin.x, curY = origin.y;
      let curDir = { ...dir };
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const segLen = length / steps;
        const jitterAngle = (Math.random() - 0.5) * 0.6 * (1 - t * 0.3);
        const cosA = Math.cos(jitterAngle), sinA = Math.sin(jitterAngle);
        const nd = {
          x: curDir.x * cosA - curDir.y * sinA,
          y: curDir.x * sinA + curDir.y * cosA
        };
        curDir = nd;
        curX += curDir.x * segLen;
        curY += curDir.y * segLen;
        points.push({ x: curX, y: curY });
      }
    }
    const smoothPts = smoothCatmullRom(points, 3);
    return {
      id: genId(),
      points: smoothPts,
      color,
      baseColor: baseHex,
      thickness: Math.max(1, parentPath.thickness * (isTendril ? 0.35 : 0.55)),
      isMain: false,
      parentId: parentPath.id,
      createdAt: performance.now(),
      opacity: 0.7,
      scale: 1.0,
      noiseIntensity: parentPath.noiseIntensity * (isTendril ? 0.8 : 0.9),
      hsvHue: hue,
      hsvSat: sat
    };
  }, [colorForSpeed, createSpiralTendril]);

  const checkCreateNodes = useCallback((newPath: VinePath) => {
    const allPaths = pathsRef.current;
    const toAdd: VineNode[] = [];
    for (const other of allPaths) {
      if (other.id === newPath.id) continue;
      if (newPath.parentId && other.id === newPath.parentId) continue;
      for (let i = 1; i < newPath.points.length; i++) {
        const np1 = newPath.points[i - 1], np2 = newPath.points[i];
        for (let j = 1; j < other.points.length; j++) {
          const op1 = other.points[j - 1], op2 = other.points[j];
          const midA = { x: (np1.x + np2.x) / 2, y: (np1.y + np2.y) / 2 };
          const midB = { x: (op1.x + op2.x) / 2, y: (op1.y + op2.y) / 2 };
          const d = dist(midA, midB);
          if (d < NODE_FUSE_DIST) {
            const exists = nodesRef.current.some(n =>
              (n.vineAId === newPath.id && n.vineBId === other.id) ||
              (n.vineAId === other.id && n.vineBId === newPath.id)
            );
            if (!exists) {
              toAdd.push({
                id: genId(),
                x: (midA.x + midB.x) / 2,
                y: (midA.y + midB.y) / 2,
                rx: 8 + Math.random() * 4,
                ry: 6 + Math.random() * 2,
                color: mixColors(newPath.color, other.color, 0.5),
                vineAId: newPath.id,
                vineBId: other.id,
                scale: 1.2,
                opacity: 0.7
              });
              break;
            }
          }
        }
      }
    }
    nodesRef.current.push(...toAdd);
  }, []);

  const startDraw = useCallback((x: number, y: number) => {
    pushHistory();
    drawingRef.current = true;
    accumulatedBranchLenRef.current = 0;
    lastDrawTimeRef.current = performance.now();
    const now = performance.now();
    const { color, hue, sat } = colorForSpeed(50, currentColorRef.current);
    const main: VinePath = {
      id: genId(),
      points: [{ x, y }],
      color,
      baseColor: currentColorRef.current,
      thickness: 5,
      isMain: true,
      createdAt: now,
      opacity: 0.7,
      scale: 1.0,
      noiseIntensity: 0.3,
      hsvHue: hue,
      hsvSat: sat
    };
    pathsRef.current.push(main);
    currentMainIdRef.current = main.id;
    speedRef.current = 0;
    forceUpdate(n => n + 1);
  }, [pushHistory, colorForSpeed]);

  const continueDraw = useCallback((x: number, y: number) => {
    if (!drawingRef.current || !currentMainIdRef.current) return;
    const main = pathsRef.current.find(p => p.id === currentMainIdRef.current);
    if (!main) return;

    const last = main.points[main.points.length - 1];
    const d = dist(last, { x, y });
    if (d < MIN_SAMPLE_DIST) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastDrawTimeRef.current);
    const speed = (d / dt) * 1000;
    speedRef.current = speed;
    lastDrawTimeRef.current = now;

    const rawDir = { x: x - last.x, y: y - last.y };
    const rawMag = Math.sqrt(rawDir.x ** 2 + rawDir.y ** 2) || 1;
    const curDir = { x: rawDir.x / rawMag, y: rawDir.y / rawMag };
    const dotProd = lastMouseDirRef.current.x * curDir.x + lastMouseDirRef.current.y * curDir.y;
    const turnAngle = Math.acos(Math.max(-1, Math.min(1, dotProd)));
    lastMouseDirRef.current = curDir;

    main.points.push({ x, y });
    accumulatedBranchLenRef.current += d;

    const { color, hue, sat } = colorForSpeed(speed, main.baseColor);
    main.color = color;
    main.hsvHue = hue;
    main.hsvSat = sat;
    main.thickness = thicknessForSpeed(speed);
    main.noiseIntensity = noiseForSpeed(speed);

    const turnBoost = turnAngle > 0.3 ? 0.3 : 0;
    while (accumulatedBranchLenRef.current >= BRANCH_INTERVAL) {
      accumulatedBranchLenRef.current -= BRANCH_INTERVAL;
      const branchProb = 0.7 + turnBoost;
      if (Math.random() < branchProb) {
        const lenAlong = pathTotalLength(main.points) - BRANCH_INTERVAL * 0.5;
        const pos = pointAtLength(main.points, Math.max(0, lenAlong));
        const angle = (30 + Math.random() * 30) * (Math.PI / 180);
        const side = Math.random() > 0.5 ? 1 : -1;
        const cosA = Math.cos(angle * side), sinA = Math.sin(angle * side);
        const branchDir = {
          x: pos.dir.x * cosA - pos.dir.y * sinA,
          y: pos.dir.x * sinA + pos.dir.y * cosA
        };
        const mainLen = pathTotalLength(main.points);
        const branchLen = mainLen * (0.4 + Math.random() * 0.2);
        const branch = createBranch(main, pos.point, branchDir, branchLen, false, speed);
        pathsRef.current.push(branch);
        checkCreateNodes(branch);

        if (branch.points.length >= 4) {
          const tendrilCount = 1 + Math.floor(Math.random() * 2);
          for (let tc = 0; tc < tendrilCount; tc++) {
            const tLen = 5 + Math.random() * 10;
            const tAlong = tLen + Math.random() * (pathTotalLength(branch.points) - tLen * 2);
            const tPos = pointAtLength(branch.points, tAlong);
            const tAngle = (25 + Math.random() * 35) * (Math.PI / 180);
            const tSide = Math.random() > 0.5 ? 1 : -1;
            const tCos = Math.cos(tAngle * tSide), tSin = Math.sin(tAngle * tSide);
            const tDir = {
              x: tPos.dir.x * tCos - tPos.dir.y * tSin,
              y: tPos.dir.x * tSin + tPos.dir.y * tCos
            };
            const tendril = createBranch(branch, tPos.point, tDir, tLen, true, speed);
            pathsRef.current.push(tendril);
            checkCreateNodes(tendril);
          }
        }
      }
    }

    if (main.points.length > 2) {
      checkCreateNodes(main);
    }

    forceUpdate(n => n + 1);
  }, [colorForSpeed, thicknessForSpeed, noiseForSpeed, createBranch, checkCreateNodes]);

  const endDraw = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    animStateRef.current = { isAnimating: true, startTime: performance.now() };

    const velocityMap = new Map<string, { velocity: Point[] }>();
    for (const path of pathsRef.current) {
      velocityMap.set(path.id, {
        velocity: path.points.map(() => ({ x: 0, y: 0 }))
      });
    }
    animPathsRef.current = velocityMap;

    for (const path of pathsRef.current) {
      path.scale = 1.2;
    }
    for (const node of nodesRef.current) {
      node.scale = 1.2;
    }
    forceUpdate(n => n + 1);
  }, []);

  const ELASTIC_K = 0.15;
  const DAMPING = 0.8;
  const ANIM_DURATION = 800;

  const tickAnimation = useCallback((): boolean => {
    if (!animStateRef.current.isAnimating) return false;
    const elapsed = performance.now() - animStateRef.current.startTime;
    const t = Math.min(1, elapsed / ANIM_DURATION);
    const easeOut = 1 - Math.pow(1 - t, 3);

    for (const path of pathsRef.current) {
      const velMap = animPathsRef.current.get(path.id);
      if (!velMap) continue;
      for (let i = 0; i < path.points.length; i++) {
        const pt = path.points[i];
        const v = velMap.velocity[i];
        const targetScale = 1.0;
        const spring = (targetScale - path.scale) * ELASTIC_K;
        v.x = v.x * DAMPING + spring * pt.x * 0.001;
        v.y = v.y * DAMPING + spring * pt.y * 0.001;
      }
      path.scale = 1.2 + (1.0 - 1.2) * easeOut;
      path.opacity = 0.7 + (1.0 - 0.7) * easeOut;
    }

    for (const node of nodesRef.current) {
      node.scale = 1.2 + (1.0 - 1.2) * easeOut;
      node.opacity = 0.7 + (1.0 - 0.7) * easeOut;
    }

    if (t >= 1) {
      animStateRef.current.isAnimating = false;
      for (const path of pathsRef.current) { path.scale = 1.0; path.opacity = 1.0; }
      for (const node of nodesRef.current) { node.scale = 1.0; node.opacity = 1.0; }
    }
    forceUpdate(n => n + 1);
    return animStateRef.current.isAnimating;
  }, []);

  const pathToSvgPath = (points: Point[]): string => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)}`;
    }
    if (points.length >= 2) {
      const last = points[points.length - 1];
      d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    }
    return d;
  };

  const exportSVG = useCallback((canvasWidth: number, canvasHeight: number): string => {
    const parts: string[] = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" style="background-color:#1C261C">`);
    parts.push(`<defs>`);
    parts.push(`  <filter id="noise" x="-20%" y="-20%" width="140%" height="140%">`);
    parts.push(`    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="turb"/>`);
    parts.push(`    <feColorMatrix in="turb" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.5 0"/>`);
    parts.push(`  </filter>`);
    parts.push(`</defs>`);
    for (const path of pathsRef.current) {
      const d = pathToSvgPath(path.points);
      if (!d) continue;
      const width = Math.max(1, path.thickness * path.scale);
      const op = Math.round(path.opacity * 100) / 100;
      parts.push(`<path d="${d}" stroke="${path.color}" stroke-width="${width.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${op}" filter="url(#noise)"/>`);
    }
    for (const node of nodesRef.current) {
      const rx = (node.rx * node.scale).toFixed(1);
      const ry = (node.ry * node.scale).toFixed(1);
      const op = Math.round(node.opacity * 100) / 100;
      parts.push(`<ellipse cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" rx="${rx}" ry="${ry}" fill="${node.color}" opacity="${op}"/>`);
    }
    parts.push(`</svg>`);
    return parts.join('\n');
  }, []);

  const setBaseColor = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  return {
    getState,
    startDraw,
    continueDraw,
    endDraw,
    undo,
    redo,
    exportSVG,
    tickAnimation,
    currentColor,
    setBaseColor,
    isDrawing: drawingRef.current,
    canUndo: () => undoStack.current.length > 0,
    canRedo: () => redoStack.current.length > 0
  };
}
