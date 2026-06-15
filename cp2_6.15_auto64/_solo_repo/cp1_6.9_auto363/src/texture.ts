export class PaperTexture {
  private permutation: number[];

  constructor() {
    this.permutation = this.generatePermutation();
  }

  private generatePermutation(): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  generate(width: number, height: number): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const baseR = 245;
    const baseG = 240;
    const baseB = 225;
    const amplitude = 20;
    const frequency = 0.01;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const noiseVal = this.noise2D(x * frequency, y * frequency);
        const offset = Math.floor(noiseVal * amplitude);

        const fiberNoise = this.noise2D(x * frequency * 4, y * frequency * 4) * 8;
        const totalOffset = offset + Math.floor(fiberNoise);

        data[idx] = Math.min(255, Math.max(0, baseR + totalOffset));
        data[idx + 1] = Math.min(255, Math.max(0, baseG + totalOffset));
        data[idx + 2] = Math.min(255, Math.max(0, baseB + totalOffset - 2));
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }
}
