import type { Palette } from '../types';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    const hex = clamped.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function interpolateColor(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const r = rgb1.r + (rgb2.r - rgb1.r) * t;
  const g = rgb1.g + (rgb2.g - rgb1.g) * t;
  const b = rgb1.b + (rgb2.b - rgb1.b) * t;
  return rgbToHex(r, g, b);
}

export function generateCSSGradient(palette: Palette): string {
  const sortedStops = [...palette.colorStops].sort((a, b) => a.position - b.position);

  if (palette.type === 'radial') {
    const shape = palette.shape || 'circle';
    const stops = sortedStops.map(s => `${s.color} ${(s.position * 100).toFixed(1)}%`).join(', ');
    return `radial-gradient(${shape}, ${stops})`;
  }

  const direction = palette.direction || 'to right';
  const actualDir = direction === 'diagonal' ? '135deg' : direction;
  const stops = sortedStops.map(s => `${s.color} ${(s.position * 100).toFixed(1)}%`).join(', ');
  return `linear-gradient(${actualDir}, ${stops})`;
}

function generateSVGDefsGradientId(palette: Palette): { defs: string; gradientId: string } {
  const sortedStops = [...palette.colorStops].sort((a, b) => a.position - b.position);
  const gradientId = 'grad_' + palette.id.replace(/-/g, '_');

  let defs = '';
  if (palette.type === 'radial') {
    const shape = palette.shape || 'circle';
    defs = `<radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">`;
    for (const s of sortedStops) {
      defs += `<stop offset="${(s.position * 100).toFixed(1)}%" stop-color="${s.color}" />`;
    }
    defs += `</radialGradient>`;
    if (shape === 'ellipse') {
      defs = `<radialGradient id="${gradientId}" cx="50%" cy="50%" rx="50%" ry="50%" gradientUnits="objectBoundingBox">`;
      for (const s of sortedStops) {
        defs += `<stop offset="${(s.position * 100).toFixed(1)}%" stop-color="${s.color}" />`;
      }
      defs += `</radialGradient>`;
    }
  } else {
    const direction = palette.direction || 'to right';
    let x1 = '0%', y1 = '0%', x2 = '100%', y2 = '0%';
    if (direction === 'to bottom') {
      x2 = '0%'; y2 = '100%';
    } else if (direction === 'diagonal') {
      x2 = '100%'; y2 = '100%';
    }
    defs = `<linearGradient id="${gradientId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="objectBoundingBox">`;
    for (const s of sortedStops) {
      defs += `<stop offset="${(s.position * 100).toFixed(1)}%" stop-color="${s.color}" />`;
    }
    defs += `</linearGradient>`;
  }
  return { defs, gradientId };
}

export function generateSVG(palette: Palette, width: number, height: number): string {
  const { defs, gradientId } = generateSVGDefsGradientId(palette);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${defs}
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${gradientId})" rx="4" ry="4"/>
</svg>`;
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function exportSVG(palette: Palette, filename = 'palette.svg'): void {
  const svgContent = generateSVG(palette, 300, 60);
  downloadFile(svgContent, filename, 'image/svg+xml;charset=utf-8');
}

export function exportPNG(palette: Palette, filename = 'palette.png'): Promise<void> {
  return new Promise((resolve) => {
    const width = 600;
    const height = 120;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve();
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const sortedStops = [...palette.colorStops].sort((a, b) => a.position - b.position);

    let gradient: CanvasGradient;
    if (palette.type === 'radial') {
      gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 2
      );
    } else {
      const direction = palette.direction || 'to right';
      let x0 = 0, y0 = 0, x1 = width, y1 = 0;
      if (direction === 'to bottom') {
        x1 = 0; y1 = height;
      } else if (direction === 'diagonal') {
        x1 = width; y1 = height;
      }
      gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    }

    for (const stop of sortedStops) {
      gradient.addColorStop(Math.max(0, Math.min(1, stop.position)), stop.color);
    }

    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, width, height, 8);
    ctx.fill();

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      resolve();
    }, 'image/png');
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

export function getMiddleColorBetweenStops(
  color1: string,
  color2: string,
  pos1: number,
  pos2: number,
  targetPos: number
): string {
  if (pos2 === pos1) return color1;
  const t = (targetPos - pos1) / (pos2 - pos1);
  return interpolateColor(color1, color2, t);
}
