import type { ExtractedPath, BezierCurve } from './imageProcessor';

export function generateSVG(paths: ExtractedPath[], width: number, height: number): string {
  let pathData = '';

  paths.forEach(p => {
    if (p.curves.length === 0) return;
    const d = curvesToPathData(p.curves);
    pathData += `  <path d="${d}" fill="none" stroke="${p.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="white"/>
${pathData}</svg>`;
}

export function curvesToPathData(curves: BezierCurve[]): string {
  if (curves.length === 0) return '';
  let d = `M ${curves[0].p0.x.toFixed(2)} ${curves[0].p0.y.toFixed(2)}`;
  curves.forEach(c => {
    d += ` C ${c.p1.x.toFixed(2)} ${c.p1.y.toFixed(2)}, ${c.p2.x.toFixed(2)} ${c.p2.y.toFixed(2)}, ${c.p3.x.toFixed(2)} ${c.p3.y.toFixed(2)}`;
  });
  return d;
}

export function downloadSVG(svgString: string, filename: string = 'sketch.svg'): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function renderPathToCanvas(
  ctx: CanvasRenderingContext2D,
  curves: BezierCurve[],
  color: string,
  alpha: number = 1,
  lineWidth: number = 2
): void {
  if (curves.length === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(curves[0].p0.x, curves[0].p0.y);
  curves.forEach(c => {
    ctx.bezierCurveTo(c.p1.x, c.p1.y, c.p2.x, c.p2.y, c.p3.x, c.p3.y);
  });
  ctx.stroke();
  ctx.restore();
}
