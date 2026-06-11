import type { StrokePath, BrushPoint } from './brush';
import { BrushEngine } from './brush';
import type { CanvasRenderer } from './renderer';

export type ExportFormat = 'png' | 'svg';
export type ExportScale = 1 | 2 | 4;

export interface ExportOptions {
  format: ExportFormat;
  scale: ExportScale;
}

const BASE_WIDTH = 1024;
const BASE_HEIGHT = 768;

export class ExportManager {
  private renderer: CanvasRenderer;

  constructor(renderer: CanvasRenderer) {
    this.renderer = renderer;
  }

  async exportPNG(scale: ExportScale = 4): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        setTimeout(() => {
          try {
            const exportCanvas = this.renderer.captureToOffscreen(scale);
            exportCanvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('PNG导出失败：无法生成Blob'));
                }
              },
              'image/png',
              1.0
            );
          } catch (err) {
            reject(err);
          }
        }, 50);
      } catch (err) {
        reject(err);
      }
    });
  }

  exportSVG(strokes: StrokePath[]): string {
    const { width, height } = this.renderer.getSize();
    const texture = this.renderer.getTexture();

    const svgParts: string[] = [];

    svgParts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    );

    svgParts.push(this.getSVGTextureDefs(texture));
    svgParts.push(`<rect width="100%" height="100%" fill="url(#paperBg)" />`);

    for (const stroke of strokes) {
      svgParts.push(this.strokeToSVGPath(stroke));
    }

    svgParts.push('</svg>');

    return svgParts.join('\n');
  }

  private strokeToSVGPath(stroke: StrokePath): string {
    const points = stroke.points;
    if (points.length === 0) return '';

    if (points.length === 1) {
      const p = points[0];
      const rgb = BrushEngine.hexToRgb(stroke.color);
      return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(p.width / 2).toFixed(2)}" fill="rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity.toFixed(3)})" />`;
    }

    const rgb = BrushEngine.hexToRgb(stroke.color);
    let pathD = '';
    const segments: { d: string; opacity: number; width: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      if (i === 0) {
        pathD = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      }

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      const segmentD = ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      pathD += segmentD;

      segments.push({
        d: pathD,
        opacity: (p1.opacity + p2.opacity) / 2,
        width: (p1.width + p2.width) / 2
      });
    }

    let result = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      result += `<path d="${seg.d}" fill="none" stroke="rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${seg.opacity.toFixed(3)})" stroke-width="${seg.width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }

    return result;
  }

  private getSVGTextureDefs(texture: string): string {
    let defs = `<defs>
      <pattern id="paperNoise" patternUnits="userSpaceOnUse" width="200" height="200">
        <rect width="200" height="200" fill="#FAF0DC"/>`;

    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * 200);
      const y = Math.floor(Math.random() * 200);
      const opacity = (Math.random() * 0.04).toFixed(3);
      defs += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgba(180,160,120,${opacity})"/>`;
    }

    defs += `</pattern>`;

    if (texture === 'gold') {
      for (let i = 0; i < 30; i++) {
        const cx = Math.floor(Math.random() * 200);
        const cy = Math.floor(Math.random() * 200);
        const r = (Math.random() * 3 + 1).toFixed(2);
        const opacity = (0.3 + Math.random() * 0.3).toFixed(3);
        defs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,215,100,${opacity})"/>`;
      }
    } else if (texture === 'cloud') {
      for (let i = 0; i < 3; i++) {
        const cx = Math.floor(Math.random() * 200);
        const cy = Math.floor(Math.random() * 200);
        const rx = (60 + Math.random() * 40).toFixed(2);
        const ry = (30 + Math.random() * 20).toFixed(2);
        defs += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(100,100,120,0.06)"/>`;
      }
    }

    defs += `<radialGradient id="paperBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#FFF8E8"/>
        <stop offset="100%" stop-color="#FAF0DC"/>
      </radialGradient>
    </defs>`;

    return defs;
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadSVG(svgContent: string, filename: string): void {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, filename);
  }

  async exportAndDownload(
    options: ExportOptions,
    strokes: StrokePath[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (onProgress) onProgress(0.1);

    if (options.format === 'png') {
      const blob = await this.exportPNG(options.scale);
      if (onProgress) onProgress(0.8);

      const filename = `墨影书道_${timestamp}_${options.scale}x.png`;
      this.downloadBlob(blob, filename);
      if (onProgress) onProgress(1.0);
    } else {
      const svg = this.exportSVG(strokes);
      if (onProgress) onProgress(0.8);

      const filename = `墨影书道_${timestamp}.svg`;
      this.downloadSVG(svg, filename);
      if (onProgress) onProgress(1.0);
    }
  }

  generatePreview(previewCanvas: HTMLCanvasElement, scale: number = 0.25): void {
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = this.renderer.getSize();
    previewCanvas.width = Math.floor(width * scale);
    previewCanvas.height = Math.floor(height * scale);

    const mainCanvas = this.renderer.getCanvas();
    const textureLayer = document.getElementById('textureLayer') as HTMLCanvasElement;

    ctx.fillStyle = '#FAF0DC';
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    if (textureLayer) {
      ctx.drawImage(textureLayer, 0, 0, previewCanvas.width, previewCanvas.height);
    }
    ctx.drawImage(mainCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
  }
}
