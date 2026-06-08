import * as THREE from 'three';

export class PaperTexture {
  private width: number;
  private height: number;

  constructor(width = 2048, height = 2048) {
    this.width = width;
    this.height = height;
  }

  generateDiffuse(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawFiberPattern(ctx);
    this.drawSpeckles(ctx);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  generateNormal(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawWrinkleNormals(ctx);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private drawFiberPattern(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#c8b89a';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const len = 5 + Math.random() * 30;
      const angle = (Math.random() - 0.5) * 0.3 + Math.PI * 0.05;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawSpeckles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const r = 0.3 + Math.random() * 1.2;
      const alpha = 0.01 + Math.random() * 0.04;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = Math.random() > 0.5 ? '#d4c9b0' : '#b8a888';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawWrinkleNormals(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    for (let i = 0; i < 600; i++) {
      const cx = Math.random() * this.width;
      const cy = Math.random() * this.height;
      const wrinkleLen = 20 + Math.random() * 80;
      const angle = Math.random() * Math.PI * 2;
      const strength = 8 + Math.random() * 25;

      for (let t = 0; t < wrinkleLen; t += 0.5) {
        const px = Math.floor(cx + Math.cos(angle) * t);
        const py = Math.floor(cy + Math.sin(angle) * t);
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);
        const spread = 1 + Math.random() * 2;

        for (let s = -spread; s <= spread; s += 0.5) {
          const sx = Math.floor(px + perpX * s);
          const sy = Math.floor(py + perpY * s);
          if (sx < 0 || sx >= this.width || sy < 0 || sy >= this.height) continue;

          const idx = (sy * this.width + sx) * 4;
          const falloff = 1 - Math.abs(s) / (spread + 1);
          const nx = Math.floor(128 + perpX * strength * falloff);
          const ny = Math.floor(128 + perpY * strength * falloff);

          data[idx] = Math.max(0, Math.min(255, nx));
          data[idx + 1] = Math.max(0, Math.min(255, ny));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
