/**
 * 云纹纹理生成模块
 * 
 * 职责：根据参数生成程序化中国传统云纹纹理贴图，并支持动态流动效果
 * 
 * 数据流向：
 *   接收参数对象（PatternParams）→ 计算纹理坐标（多层分形噪声叠加）
 *   → 绘制Canvas纹理 → 输出Three.js CanvasTexture
 * 
 * 调用关系：
 *   - 被 main.ts 的 CloudLoomApp 类实例化
 *   - 被 main.ts 每帧调用 update() 实现纹理流动
 *   - 被 main.ts 调用 setParams() 响应UI参数变化
 *   - 输出的纹理通过 getTexture() 提供给 Three.js 材质使用
 */

import * as THREE from 'three';

export interface PatternParams {
  curl: number;
  density: number;
  hueOffset: number;
  flowSpeed: number;
}

export class CloudPatternGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private params: PatternParams;
  private flowOffset: number = 0;
  private time: number = 0;
  private readonly width: number = 1024;
  private readonly height: number = 1024;
  private perm: number[];

  constructor(params: PatternParams) {
    this.params = { ...params };
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.perm = this.generatePermutation();
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.needsUpdate = true;
    this.generate();
  }

  private generatePermutation(): number[] {
    const perm = [];
    for (let i = 0; i < 256; i++) {
      perm[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return perm.concat(perm);
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

  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const AA = this.perm[A];
    const AB = this.perm[A + 1];
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B];
    const BB = this.perm[B + 1];
    return this.lerp(
      this.lerp(this.grad(this.perm[AA], x, y), this.grad(this.perm[BA], x - 1, y), u),
      this.lerp(this.grad(this.perm[AB], x, y - 1), this.grad(this.perm[BB], x - 1, y - 1), u),
      v
    );
  }

  private fbm(x: number, y: number, octaves: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  setParams(params: Partial<PatternParams>): void {
    Object.assign(this.params, params);
    this.generate();
  }

  getParams(): PatternParams {
    return { ...this.params };
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    const flowRadiansPerFrame = this.params.flowSpeed;
    const framesPerSecond = 60;
    const flowRadiansPerSecond = flowRadiansPerFrame * framesPerSecond;
    const flowOffsetPerSecond = flowRadiansPerSecond / (Math.PI * 2);

    this.flowOffset += flowOffsetPerSecond * deltaTime;
    if (this.flowOffset > 1) {
      this.flowOffset -= 1;
    }
    if (this.flowOffset < 0) {
      this.flowOffset += 1;
    }

    this.texture.offset.y = this.flowOffset;

    const animatedNoiseScale = 0.002;
    const noiseOffset = this.fbm(
      this.time * animatedNoiseScale,
      this.flowOffset * 10,
      3
    );
    this.texture.offset.x = noiseOffset * 0.05;

    this.texture.needsUpdate = true;
    this.texture.updateMatrix();
  }

  private generate(): void {
    const { curl, density, hueOffset } = this.params;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const baseGradient = ctx.createLinearGradient(0, 0, 0, h);
    baseGradient.addColorStop(0, '#0a0a20');
    baseGradient.addColorStop(0.5, '#0f0f2e');
    baseGradient.addColorStop(1, '#0a0a20');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, w, h);

    const octaves = Math.max(2, Math.floor((density - 10) / 8) + 3);
    const noiseScale = 0.0025 + (50 - density) * 0.00008;
    const curlFactor = curl / 100;
    const baseHue = hueOffset;

    for (let layer = 0; layer < octaves; layer++) {
      const layerScale = 0.35 + layer * 0.25;
      const layerAlpha = 0.08 + layer * 0.07;
      const hue = (baseHue + layer * 25) % 360;

      this.drawFractalCloudLayer(
        ctx, w, h,
        layerScale, noiseScale,
        curlFactor, hue, layerAlpha,
        layer + 1, octaves
      );
    }

    this.drawTraditionalCloudMotifs(ctx, w, h, curlFactor, baseHue, density);
    this.drawBorderPattern(ctx, w, h, baseHue);

    this.texture.needsUpdate = true;
  }

  private drawFractalCloudLayer(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
    noiseScale: number,
    curlFactor: number,
    hue: number,
    alpha: number,
    detailLevel: number,
    maxOctaves: number
  ): void {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const step = Math.max(1, Math.floor(5 - detailLevel * 0.6));
    const layerNoiseScale = noiseScale * (1 + detailLevel * 0.35);
    const fbmOctaves = Math.min(5, 2 + detailLevel);

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const nx = x * layerNoiseScale * scale;
        const ny = y * layerNoiseScale * scale;

        const curlAngle = curlFactor * Math.PI * 0.6 * Math.sin((x + y) * 0.004 + detailLevel);
        const cosA = Math.cos(curlAngle);
        const sinA = Math.sin(curlAngle);
        const rx = nx * cosA - ny * sinA;
        const ry = nx * sinA + ny * cosA;

        const noiseVal = this.fbm(rx + detailLevel * 150, ry + detailLevel * 250, fbmOctaves);

        const threshold = 0.3 + (maxOctaves - detailLevel) * 0.06;
        if (noiseVal > threshold) {
          const intensity = (noiseVal - threshold) / (1 - threshold);
          const cloudAlpha = Math.pow(intensity, 1.4) * alpha;

          const colorHue = hue + noiseVal * 35 * curlFactor;
          const saturation = 55 + noiseVal * 25;
          const lightness = 50 + noiseVal * 30;

          const rgb = this.hslToRgb(colorHue / 360, saturation / 100, lightness / 100);
          const r = Math.round(rgb.r * 255);
          const g = Math.round(rgb.g * 255);
          const b = Math.round(rgb.b * 255);

          for (let dy = 0; dy < step && y + dy < h; dy++) {
            for (let dx = 0; dx < step && x + dx < w; dx++) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              const edgeFactor = (1 - Math.abs(dx - step / 2) / step * 0.4) * (1 - Math.abs(dy - step / 2) / step * 0.4);
              const blendAlpha = cloudAlpha * edgeFactor;
              
              data[idx] = Math.min(255, data[idx] + r * blendAlpha);
              data[idx + 1] = Math.min(255, data[idx + 1] + g * blendAlpha);
              data[idx + 2] = Math.min(255, data[idx + 2] + b * blendAlpha);
              data[idx + 3] = Math.max(data[idx + 3], Math.min(255, blendAlpha * 255));
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r, g, b };
  }

  private drawTraditionalCloudMotif(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    curlFactor: number,
    hue: number,
    alpha: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const numLobes = Math.floor(5 + curlFactor * 7);
    const angleStep = (Math.PI * 2) / numLobes;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, `hsla(${hue}, 70%, 75%, ${alpha})`);
    gradient.addColorStop(0.5, `hsla(${(hue + 15) % 360}, 60%, 65%, ${alpha * 0.7})`);
    gradient.addColorStop(1, `hsla(${(hue + 30) % 360}, 50%, 55%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();

    for (let i = 0; i <= numLobes; i++) {
      const angle = i * angleStep;
      const curlOffset = Math.sin(angle * 3 + x * 0.01) * curlFactor * 0.35;
      const radius = size * (0.6 + curlOffset + Math.sin(angle * 2 + y * 0.01) * 0.2);

      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * 0.55;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        const prevAngle = (i - 1) * angleStep;
        const prevRadius = size * (0.6 + Math.sin(prevAngle * 3 + x * 0.01) * curlFactor * 0.35 + Math.sin(prevAngle * 2 + y * 0.01) * 0.2);
        const prevX = Math.cos(prevAngle) * prevRadius;
        const prevY = Math.sin(prevAngle) * prevRadius * 0.55;

        const cpx = (prevX + px) / 2 + Math.sin(angle) * 8 * curlFactor;
        const cpy = (prevY + py) / 2 + Math.cos(angle) * 6 * curlFactor;

        ctx.quadraticCurveTo(cpx, cpy, px, py);
      }
    }

    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.4);
    innerGradient.addColorStop(0, `hsla(${hue}, 85%, 85%, ${alpha * 0.4})`);
    innerGradient.addColorStop(1, `hsla(${hue}, 70%, 70%, 0)`);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    ctx.restore();
  }

  private drawTraditionalCloudMotifs(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    curlFactor: number,
    baseHue: number,
    density: number
  ): void {
    const densityFactor = (density - 10) / 40;
    const motifsPerRow = Math.floor(4 + densityFactor * 4);
    const motifsPerCol = Math.floor(3 + densityFactor * 3);
    const cellW = w / motifsPerRow;
    const cellH = h / motifsPerCol;

    for (let row = 0; row < motifsPerCol; row++) {
      for (let col = 0; col < motifsPerRow; col++) {
        const cx = (col + 0.5) * cellW + Math.sin(row * 1.5 + col) * 20;
        const cy = (row + 0.5) * cellH + Math.cos(row * 1.2 + col) * 15;
        const size = (50 + densityFactor * 30) + Math.sin(row * 2 + col * 1.5) * 15;
        const hue = (baseHue + row * 30 + col * 20) % 360;
        const alpha = 0.2 + densityFactor * 0.15 + Math.sin(row + col) * 0.08;

        this.drawTraditionalCloudMotif(ctx, cx, cy, size, curlFactor, hue, alpha);
      }
    }
  }

  private drawBorderPattern(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    hueOffset: number
  ): void {
    const hue = (hueOffset + 180) % 360;

    ctx.save();

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, `hsla(${hue}, 60%, 50%, 0)`);
    gradient.addColorStop(0.5, `hsla(${hue}, 60%, 50%, 0.3)`);
    gradient.addColorStop(1, `hsla(${hue}, 60%, 50%, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;

    for (let i = 0; i < w; i += 35) {
      this.drawSmallCloudMotif(ctx, i, 12, 12, hue);
      this.drawSmallCloudMotif(ctx, i, h - 12, 12, hue);
    }

    for (let i = 0; i < h; i += 35) {
      this.drawSmallCloudMotif(ctx, 12, i, 12, hue);
      this.drawSmallCloudMotif(ctx, w - 12, i, 12, hue);
    }

    ctx.restore();
  }

  private drawSmallCloudMotif(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    hue: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, `hsla(${hue}, 60%, 65%, 0.5)`);
    gradient.addColorStop(1, `hsla(${hue}, 50%, 55%, 0)`);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = size * (0.6 + Math.sin(angle * 3 + x * 0.1) * 0.25);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r * 0.5;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  dispose(): void {
    this.texture.dispose();
  }
}
