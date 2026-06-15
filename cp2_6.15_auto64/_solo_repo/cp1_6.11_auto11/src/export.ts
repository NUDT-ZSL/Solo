import type { Renderer } from './renderer';
import type { SVGPathData } from './renderer';

export type ExportResolution = 1 | 2 | 4;

export interface ExportOptions {
  resolution: ExportResolution;
  format: 'png' | 'svg';
}

export class ExportManager {
  private renderer: Renderer;
  private onProgress: ((progress: number) => void) | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  setProgressCallback(cb: (progress: number) => void): void {
    this.onProgress = cb;
  }

  async exportPNG(options: ExportOptions): Promise<void> {
    const resolution = options.resolution;
    const srcCanvas = this.renderer.getFullCanvas();
    const srcWidth = srcCanvas.width;
    const srcHeight = srcCanvas.height;
    const targetWidth = srcWidth * resolution;
    const targetHeight = srcHeight * resolution;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetWidth;
    exportCanvas.height = targetHeight;
    const ectx = exportCanvas.getContext('2d')!;

    ectx.fillStyle = '#F5E6CA';
    ectx.fillRect(0, 0, targetWidth, targetHeight);

    ectx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

    this.reportProgress(0.5);
    await this.delay(50);

    const dataUrl = exportCanvas.toDataURL('image/png');
    this.reportProgress(0.8);
    await this.delay(50);

    const link = document.createElement('a');
    link.download = `moying-shudao-${targetWidth}x${targetHeight}.png`;
    link.href = dataUrl;
    link.click();

    this.reportProgress(1);
  }

  async exportSVG(options: ExportOptions): Promise<void> {
    const paths = this.renderer.getSVGPaths();
    const canvas = this.renderer.getFullCanvas();
    const width = canvas.width * options.resolution;
    const height = canvas.height * options.resolution;
    const scale = options.resolution;

    this.reportProgress(0.3);

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
    svgContent += `  <rect width="100%" height="100%" fill="#F5E6CA"/>\n`;
    svgContent += `  <g transform="scale(${scale})">\n`;

    for (const path of paths) {
      svgContent += `    <path d="${path.d}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" opacity="${path.opacity}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }

    svgContent += `  </g>\n`;
    svgContent += `</svg>`;

    this.reportProgress(0.7);
    await this.delay(50);

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `moying-shudao-${width}x${height}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    this.reportProgress(1);
  }

  async export(options: ExportOptions): Promise<void> {
    this.reportProgress(0);
    await this.delay(30);

    if (options.format === 'png') {
      await this.exportPNG(options);
    } else {
      await this.exportSVG(options);
    }
  }

  getPreviewDataURL(): string {
    return this.renderer.getCombinedDataURL();
  }

  private reportProgress(progress: number): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
