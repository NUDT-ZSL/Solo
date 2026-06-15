export class ExportTool {
  static exportToPNG(canvas: HTMLCanvasElement): void {
    const scale = 2;
    const width = canvas.width * scale;
    const height = canvas.height * scale;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get offscreen canvas context');
    }

    ctx.fillStyle = '#ece8df';
    ctx.fillRect(0, 0, width, height);

    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);

    const dataURL = offscreenCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = this.generateFileName();
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static generateFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `note_${year}${month}${day}_${hours}${minutes}${seconds}.png`;
  }
}
