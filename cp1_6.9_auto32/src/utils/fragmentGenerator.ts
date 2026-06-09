export interface Vertex {
  x: number;
  y: number;
}

export interface FragmentData {
  id: string;
  gridRow: number;
  gridCol: number;
  vertices: Vertex[];
  sourceX: number;
  sourceY: number;
  cellWidth: number;
  cellHeight: number;
  averageColor: string;
  averageColorRgb: { r: number; g: number; b: number };
  serratedBorderWidth: number;
  preRenderedCanvas: HTMLCanvasElement;
}

export interface GeneratedFragments {
  fragments: FragmentData[];
  imageWidth: number;
  imageHeight: number;
  cellWidth: number;
  cellHeight: number;
  overallAverageColor: { r: number; g: number; b: number };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generatePolygonVertices(
  baseX: number,
  baseY: number,
  w: number,
  h: number,
  rand: () => number
): Vertex[] {
  const vertCount = 4 + Math.floor(rand() * 4);
  const verts: Vertex[] = [];
  const centerX = baseX + w / 2;
  const centerY = baseY + h / 2;

  for (let i = 0; i < vertCount; i++) {
    const angle = (i / vertCount) * Math.PI * 2;
    const radiusBase = Math.min(w, h) * 0.52;
    const jitter = (rand() - 0.5) * 0.32;
    const radius = radiusBase * (1 + jitter);
    let x = centerX + Math.cos(angle) * radius;
    let y = centerY + Math.sin(angle) * radius;

    const marginX = w * 0.05;
    const marginY = h * 0.05;
    x = Math.max(baseX - marginX, Math.min(baseX + w + marginX, x));
    y = Math.max(baseY - marginY, Math.min(baseY + h + marginY, y));

    verts.push({ x: x - baseX, y: y - baseY });
  }
  return verts;
}

function buildPath2D(vertices: Vertex[]): Path2D {
  const path = new Path2D();
  if (vertices.length === 0) return path;
  path.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    path.lineTo(vertices[i].x, vertices[i].y);
  }
  path.closePath();
  return path;
}

function computeAverageColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): { r: number; g: number; b: number; css: string } {
  const px = Math.max(1, Math.floor(x));
  const py = Math.max(1, Math.floor(y));
  const pw = Math.min(ctx.canvas.width - px, Math.max(1, Math.floor(w)));
  const ph = Math.min(ctx.canvas.height - py, Math.max(1, Math.floor(h)));

  const step = Math.max(1, Math.floor(Math.sqrt(pw * ph) / 400));
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  try {
    const data = ctx.getImageData(px, py, pw, ph).data;
    for (let i = 0; i < data.length; i += 4 * step) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }
  } catch {
    rSum = 128; gSum = 128; bSum = 128; count = 1;
  }

  if (count === 0) count = 1;
  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);
  return { r, g, b, css: `rgba(${r}, ${g}, ${b}, 0.3)` };
}

function preRenderFragment(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  frag: FragmentData,
  sw: number,
  sh: number
): HTMLCanvasElement {
  const cw = Math.ceil(frag.cellWidth * 1.15);
  const ch = Math.ceil(frag.cellHeight * 1.15);
  const offX = (cw - frag.cellWidth) / 2;
  const offY = (ch - frag.cellHeight) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  const shiftedVerts = frag.vertices.map(v => ({
    x: v.x + offX,
    y: v.y + offY,
  }));

  const path = buildPath2D(shiftedVerts);
  ctx.save();
  ctx.clip(path);
  ctx.drawImage(
    sourceImage,
    frag.sourceX, frag.sourceY, sw, sh,
    offX, offY, frag.cellWidth, frag.cellHeight
  );
  ctx.restore();

  ctx.save();
  ctx.clip(path);
  ctx.globalAlpha = 0.6;
  const { r, g, b } = frag.averageColorRgb;
  for (let i = 0; i < frag.serratedBorderWidth; i++) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.12 - i * 0.025})`;
    ctx.lineWidth = 1;
    const insetPath = new Path2D();
    const scale = 1 - (i + 0.5) / Math.min(frag.cellWidth, frag.cellHeight) * 4;
    const cx = cw / 2, cy = ch / 2;
    insetPath.moveTo(cx + (shiftedVerts[0].x - cx) * scale, cy + (shiftedVerts[0].y - cy) * scale);
    for (let k = 1; k < shiftedVerts.length; k++) {
      insetPath.lineTo(cx + (shiftedVerts[k].x - cx) * scale, cy + (shiftedVerts[k].y - cy) * scale);
    }
    insetPath.closePath();
    ctx.stroke(insetPath);
  }
  ctx.restore();

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = frag.serratedBorderWidth;
  ctx.strokeStyle = frag.averageColor;
  ctx.stroke(path);
  ctx.restore();

  return canvas;
}

export function generateFragments(
  sourceImage: HTMLImageElement,
  gridSize: number,
  seed: number = Date.now()
): GeneratedFragments {
  const imgW = sourceImage.naturalWidth || sourceImage.width;
  const imgH = sourceImage.naturalHeight || sourceImage.height;

  const maxRenderDim = 900;
  let renderW = imgW;
  let renderH = imgH;
  if (imgW > maxRenderDim || imgH > maxRenderDim) {
    const scale = maxRenderDim / Math.max(imgW, imgH);
    renderW = Math.round(imgW * scale);
    renderH = Math.round(imgH * scale);
  }

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = renderW;
  renderCanvas.height = renderH;
  const renderCtx = renderCanvas.getContext('2d')!;
  renderCtx.drawImage(sourceImage, 0, 0, renderW, renderH);

  const cellW = renderW / gridSize;
  const cellH = renderH / gridSize;

  const rand = seededRandom(seed);
  const fragments: FragmentData[] = [];

  let overallR = 0, overallG = 0, overallB = 0;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const sx = col * cellW;
      const sy = row * cellH;
      const vertices = generatePolygonVertices(0, 0, cellW, cellH, rand);
      const avgColor = computeAverageColor(renderCtx, sx, sy, cellW, cellH);
      overallR += avgColor.r;
      overallG += avgColor.g;
      overallB += avgColor.b;

      const serratedW = 2 + Math.floor(rand() * 3);

      const frag: FragmentData = {
        id: `frag_${row}_${col}_${seed}`,
        gridRow: row,
        gridCol: col,
        vertices,
        sourceX: sx,
        sourceY: sy,
        cellWidth: cellW,
        cellHeight: cellH,
        averageColor: avgColor.css,
        averageColorRgb: { r: avgColor.r, g: avgColor.g, b: avgColor.b },
        serratedBorderWidth: serratedW,
        preRenderedCanvas: null as any,
      };

      frag.preRenderedCanvas = preRenderFragment(
        renderCanvas, frag, cellW, cellH
      );
      fragments.push(frag);
    }
  }

  const total = gridSize * gridSize;
  return {
    fragments,
    imageWidth: renderW,
    imageHeight: renderH,
    cellWidth: cellW,
    cellHeight: cellH,
    overallAverageColor: {
      r: Math.round(overallR / total),
      g: Math.round(overallG / total),
      b: Math.round(overallB / total),
    },
  };
}

export function shuffleFragments<T>(arr: T[], seed: number = Date.now()): T[] {
  const rand = seededRandom(seed + 7);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getGridCenter(
  row: number,
  col: number,
  cellW: number,
  cellH: number
): { x: number; y: number } {
  return {
    x: col * cellW + cellW / 2,
    y: row * cellH + cellH / 2,
  };
}
