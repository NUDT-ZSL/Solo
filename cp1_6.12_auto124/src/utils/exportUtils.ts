import JSZip from 'jszip';
import { Shape } from '../types';
import { getShapePath, getGradientId, getShadowId, hexToRgba } from './shapeUtils';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function generateGradientDef(shape: Shape): string {
  const { gradient, id } = shape;
  const gradientId = getGradientId(id);
  
  if (gradient.type === 'linear') {
    const angleRad = (gradient.angle * Math.PI) / 180;
    const x1 = 50 - 50 * Math.cos(angleRad);
    const y1 = 50 - 50 * Math.sin(angleRad);
    const x2 = 50 + 50 * Math.cos(angleRad);
    const y2 = 50 + 50 * Math.sin(angleRad);
    
    const stops = gradient.stops
      .sort((a, b) => a.offset - b.offset)
      .map(stop => `    <stop offset="${stop.offset * 100}%" stop-color="${stop.color}" />`)
      .join('\n');
    
    return `  <linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n${stops}\n  </linearGradient>`;
  } else {
    const stops = gradient.stops
      .sort((a, b) => a.offset - b.offset)
      .map(stop => `    <stop offset="${stop.offset * 100}%" stop-color="${stop.color}" />`)
      .join('\n');
    
    return `  <radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%">\n${stops}\n  </radialGradient>`;
  }
}

export function generateShadowDef(shape: Shape): string {
  const { shadow, id } = shape;
  const shadowId = getShadowId(id);
  
  return `  <filter id="${shadowId}" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="${shadow.offsetX}" dy="${shadow.offsetY}" stdDeviation="${shadow.blur}" flood-color="${shadow.color}" flood-opacity="${shadow.opacity}" />
  </filter>`;
}

export function generateShapeSvg(shape: Shape): string {
  const { id, x, y, width, height, rotation, fill, useGradient, shadow, visible } = shape;
  
  if (!visible) return '';
  
  const gradientId = getGradientId(id);
  const shadowId = getShadowId(id);
  const fillValue = useGradient ? `url(#${gradientId})` : fill;
  const path = getShapePath(shape);
  
  const transform = `translate(${x}, ${y}) rotate(${rotation}, ${width / 2}, ${height / 2})`;
  
  return `  <g transform="${transform}" filter="url(#${shadowId})">
    <path d="${path}" fill="${fillValue}" />
  </g>`;
}

export function generateFullSvg(shapes: Shape[]): string {
  const defs: string[] = [];
  const shapeSvgs: string[] = [];
  
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const shape of sortedShapes) {
    if (!shape.visible) continue;
    
    if (shape.shadow.blur > 0 || shape.shadow.offsetX !== 0 || shape.shadow.offsetY !== 0) {
      defs.push(generateShadowDef(shape));
    }
    if (shape.useGradient) {
      defs.push(generateGradientDef(shape));
    }
    shapeSvgs.push(generateShapeSvg(shape));
  }
  
  const defsString = defs.length > 0 ? `\n<defs>\n${defs.join('\n')}\n</defs>` : '';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">${defsString}
${shapeSvgs.join('\n')}
</svg>`;
}

export async function svgToPng(
  svgString: string,
  scale: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const dpr = window.devicePixelRatio || 1;
    const totalScale = scale * dpr;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    canvas.width = CANVAS_WIDTH * totalScale;
    canvas.height = CANVAS_HEIGHT * totalScale;
    
    ctx.scale(totalScale, totalScale);
    
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      URL.revokeObjectURL(url);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate PNG blob'));
          }
        },
        'image/png'
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };
    
    img.src = url;
  });
}

export async function exportAsZip(
  shapes: Shape[],
  options: { scale: number; includeSvg: boolean }
): Promise<Blob> {
  const zip = new JSZip();
  const svgString = generateFullSvg(shapes);
  
  if (options.includeSvg) {
    zip.file('logolab_design.svg', svgString);
  }
  
  const pngBlob = await svgToPng(svgString, options.scale);
  zip.file(`logolab_design_${options.scale}x.png`, pngBlob);
  
  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getCanvasSize(): { width: number; height: number } {
  return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}
