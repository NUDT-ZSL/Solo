import * as THREE from 'three';

export interface PatternParams {
  curl: number;
  density: number;
  colorShift: number;
  flowSpeed: number;
}

export class CloudPatternGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private params: PatternParams;
  private readonly size = 1024;

  constructor(params: PatternParams) {
    this.params = { ...params };
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.needsUpdate = true;
    this.generate();
  }

  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  updateParams(params: Partial<PatternParams>): void {
    this.params = { ...this.params, ...params };
    this.generate();
  }

  getParams(): PatternParams {
    return { ...this.params };
  }

  private generate(): void {
    const ctx = this.ctx;
    const w = this.size;
    const h = this.size;

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);

    const { curl, density, colorShift } = this.params;
    const curlFactor = curl / 100;
    const numLayers = Math.max(2, Math.floor(density));
    const cloudsPerType = Math.max(3, Math.floor(density * 1.5));

    const baseColors = this.generateColorPalette(colorShift);

    for (let layer = 0; layer < numLayers; layer++) {
      const layerProgress = layer / numLayers;
      const alpha = 0.12 + layerProgress * 0.35;
      const scale = 0.4 + layerProgress * 1.2;
      const layerOffset = layer * 0.25;

      for (let i = 0; i < cloudsPerType; i++) {
        const colorIndex = (i + layer) % baseColors.length;
        const cloudColor = baseColors[colorIndex];
        
        const baseX = (i / cloudsPerType) * w + (layer % 2) * (w / cloudsPerType / 2);
        const baseY = h * 0.2 + layer * (h / numLayers) * 0.8;
        const wrapX = baseX % w;
        const wrapY = baseY % h;

        const rotation = (i * 0.5 + layerOffset + curlFactor * Math.PI) % (Math.PI * 2);

        if (i % 3 === 0) {
          this.drawSpiralCloud(ctx, wrapX, wrapY, 90 * scale, {
            curl: curlFactor,
            alpha,
            color: cloudColor,
            rotation,
            goldHue: colorShift
          });
        } else if (i % 3 === 1) {
          this.drawRuyiCloud(ctx, wrapX, wrapY, 100 * scale, 55 * scale, {
            curl: curlFactor,
            alpha,
            color: cloudColor,
            rotation,
            goldHue: colorShift
          });
        } else {
          this.drawScrollCloud(ctx, wrapX, wrapY, 85 * scale, 45 * scale, {
            curl: curlFactor,
            alpha,
            color: cloudColor,
            rotation,
            goldHue: colorShift
          });
        }
      }
    }

    this.texture.needsUpdate = true;
  }

  private generateColorPalette(hueShift: number): string[] {
    const baseHue = (210 + hueShift) % 360;
    const colors: string[] = [];

    for (let i = 0; i < 5; i++) {
      const hue = (baseHue + i * 30) % 360;
      const sat = 60 + i * 10;
      const light = 30 + i * 15;
      colors.push(`hsl(${hue}, ${sat}%, ${light}%)`);
    }

    return colors;
  }

  private drawSpiralCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    options: {
      curl: number;
      alpha: number;
      color: string;
      rotation: number;
      goldHue: number;
    }
  ): void {
    const { curl, alpha, color, rotation, goldHue } = options;
    const w = this.size;
    const h = this.size;

    const drawAt = (offsetX: number, offsetY: number) => {
      ctx.save();
      ctx.translate(x + offsetX, y + offsetY);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 0.6);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.4, this.adjustColor(color, -10));
      gradient.addColorStop(0.7, this.adjustColor(color, -25));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      const turns = 2.5 + curl * 2;
      const points: [number, number][] = [];
      const segments = 80;

      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * turns * Math.PI * 2;
        const r = (t / (turns * Math.PI * 2)) * size * 0.6;
        const curlOffset = Math.sin(t * 3 + curl * Math.PI) * (size * 0.08 * curl);
        const px = Math.cos(t) * (r + curlOffset);
        const py = Math.sin(t) * (r + curlOffset) * 0.7;
        points.push([px, py]);
      }

      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = prev[0] + (curr[0] - prev[0]) * 0.5;
        const cpy = prev[1] + (curr[1] - prev[1]) * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, curr[0], curr[1]);
      }

      for (let i = points.length - 2; i >= 0; i--) {
        const prev = points[i + 1];
        const curr = points[i];
        const innerOffset = size * 0.15 * (1 - i / segments);
        const cpx = prev[0] + (curr[0] - prev[0]) * 0.5;
        const cpy = prev[1] + (curr[1] - prev[1]) * 0.5 - innerOffset;
        ctx.quadraticCurveTo(cpx, cpy, curr[0], curr[1] - innerOffset * 0.5);
      }
      ctx.closePath();
      ctx.fill();

      const goldColor = `hsla(${(45 + goldHue) % 360}, 85%, 65%, ${alpha * 0.7})`;
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      for (let i = 0; i < points.length - 5; i += 8) {
        const p = points[i];
        ctx.moveTo(p[0], p[1]);
        for (let j = 0; j <= 5; j++) {
          const t2 = j / 5;
          const r2 = t2 * size * 0.1;
          const ang = t2 * Math.PI * 1.5;
          ctx.lineTo(p[0] + Math.cos(ang) * r2, p[1] + Math.sin(ang) * r2 * 0.6);
        }
      }
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    drawAt(0, 0);
    if (x < size * 0.6) drawAt(w, 0);
    if (x > w - size * 0.6) drawAt(-w, 0);
    if (y < size * 0.6) drawAt(0, h);
    if (y > h - size * 0.6) drawAt(0, -h);
  }

  private drawRuyiCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      curl: number;
      alpha: number;
      color: string;
      rotation: number;
      goldHue: number;
    }
  ): void {
    const { curl, alpha, color, rotation, goldHue } = options;
    const w = this.size;
    const h = this.size;

    const drawAt = (offsetX: number, offsetY: number) => {
      ctx.save();
      ctx.translate(x + offsetX, y + offsetY);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(-width * 0.1, 0, width * 0.1, 0, 0, width * 0.6);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, this.adjustColor(color, -15));
      gradient.addColorStop(0.8, this.adjustColor(color, -30));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      const headWidth = width * 0.5;
      const headHeight = height * 0.9;
      const tailLength = width * 0.6;
      const curlAmount = curl * height * 0.3;

      ctx.moveTo(-headWidth * 0.3, -headHeight * 0.4);

      ctx.bezierCurveTo(
        -headWidth * 0.3 - curlAmount, -headHeight * 0.8,
        headWidth * 0.2 - curlAmount, -headHeight * 0.9,
        headWidth * 0.5, -headHeight * 0.3
      );

      ctx.bezierCurveTo(
        headWidth * 0.6 + curlAmount * 0.5, -headHeight * 0.1,
        headWidth * 0.55 + curlAmount * 0.8, headHeight * 0.2,
        headWidth * 0.35, headHeight * 0.45
      );

      ctx.bezierCurveTo(
        headWidth * 0.1, headHeight * 0.6,
        -headWidth * 0.2, headHeight * 0.55,
        -headWidth * 0.4, headHeight * 0.35
      );

      ctx.bezierCurveTo(
        -headWidth * 0.5, headHeight * 0.15,
        -headWidth * 0.45, -headHeight * 0.1,
        -headWidth * 0.3, -headHeight * 0.4
      );

      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(headWidth * 0.35, headHeight * 0.3);

      const tailCurl1 = curl * tailLength * 0.2;
      const tailCurl2 = curl * tailLength * 0.35;

      ctx.bezierCurveTo(
        headWidth * 0.6, headHeight * 0.4 + tailCurl1,
        headWidth * 0.9, headHeight * 0.5 + tailCurl2,
        tailLength, headHeight * 0.3
      );

      ctx.bezierCurveTo(
        tailLength * 0.85, headHeight * 0.15,
        tailLength * 0.7, headHeight * 0.05,
        tailLength * 0.55, headHeight * 0.12
      );

      ctx.bezierCurveTo(
        tailLength * 0.45 + tailCurl1, headHeight * 0.18,
        tailLength * 0.35 + tailCurl2, headHeight * 0.22,
        tailLength * 0.25, headHeight * 0.25
      );

      ctx.fillStyle = gradient;
      ctx.fill();

      const goldColor = `hsla(${(45 + goldHue) % 360}, 85%, 65%, ${alpha * 0.75})`;
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(-headWidth * 0.3, -headHeight * 0.4);
      ctx.bezierCurveTo(
        -headWidth * 0.3 - curlAmount, -headHeight * 0.8,
        headWidth * 0.2 - curlAmount, -headHeight * 0.9,
        headWidth * 0.5, -headHeight * 0.3
      );
      ctx.bezierCurveTo(
        headWidth * 0.6 + curlAmount * 0.5, -headHeight * 0.1,
        headWidth * 0.55 + curlAmount * 0.8, headHeight * 0.2,
        headWidth * 0.35, headHeight * 0.45
      );
      ctx.bezierCurveTo(
        headWidth * 0.1, headHeight * 0.6,
        -headWidth * 0.2, headHeight * 0.55,
        -headWidth * 0.4, headHeight * 0.35
      );
      ctx.bezierCurveTo(
        -headWidth * 0.5, headHeight * 0.15,
        -headWidth * 0.45, -headHeight * 0.1,
        -headWidth * 0.3, -headHeight * 0.4
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(headWidth * 0.35, headHeight * 0.3);
      ctx.bezierCurveTo(
        headWidth * 0.6, headHeight * 0.4 + tailCurl1,
        headWidth * 0.9, headHeight * 0.5 + tailCurl2,
        tailLength, headHeight * 0.3
      );
      ctx.bezierCurveTo(
        tailLength * 0.85, headHeight * 0.15,
        tailLength * 0.7, headHeight * 0.05,
        tailLength * 0.55, headHeight * 0.12
      );
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.arc(0, -headHeight * 0.1, headWidth * 0.18, 0, Math.PI * 2);
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    drawAt(0, 0);
    if (x < width * 0.6) drawAt(w, 0);
    if (x > w - width * 0.6) drawAt(-w, 0);
    if (y < height * 0.6) drawAt(0, h);
    if (y > h - height * 0.6) drawAt(0, -h);
  }

  private drawScrollCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      curl: number;
      alpha: number;
      color: string;
      rotation: number;
      goldHue: number;
    }
  ): void {
    const { curl, alpha, color, rotation, goldHue } = options;
    const w = this.size;
    const h = this.size;

    const drawAt = (offsetX: number, offsetY: number) => {
      ctx.save();
      ctx.translate(x + offsetX, y + offsetY);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(0, 0, width * 0.1, 0, 0, width * 0.55);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.45, this.adjustColor(color, -12));
      gradient.addColorStop(0.75, this.adjustColor(color, -28));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;

      const mainWidth = width * 0.55;
      const mainHeight = height * 0.75;
      const hookSize = width * 0.35;
      const curlAmount = curl * height * 0.35;

      ctx.beginPath();

      ctx.moveTo(-mainWidth * 0.4, -mainHeight * 0.45);

      ctx.bezierCurveTo(
        -mainWidth * 0.45, -mainHeight * 0.75,
        -mainWidth * 0.2 - curlAmount * 0.3, -mainHeight * 0.85,
        -mainWidth * 0.05, -mainHeight * 0.65
      );

      ctx.bezierCurveTo(
        mainWidth * 0.1, -mainHeight * 0.45,
        mainWidth * 0.15 + curlAmount * 0.2, -mainHeight * 0.2,
        mainWidth * 0.2, 0
      );

      ctx.bezierCurveTo(
        mainWidth * 0.22 + curlAmount * 0.3, mainHeight * 0.25,
        mainWidth * 0.15, mainHeight * 0.5,
        -mainWidth * 0.05, mainHeight * 0.55
      );

      ctx.bezierCurveTo(
        -mainWidth * 0.3, mainHeight * 0.6,
        -mainWidth * 0.5, mainHeight * 0.4,
        -mainWidth * 0.55, mainHeight * 0.1
      );

      ctx.bezierCurveTo(
        -mainWidth * 0.6 - curlAmount * 0.2, -mainHeight * 0.15,
        -mainWidth * 0.5 - curlAmount * 0.4, -mainHeight * 0.35,
        -mainWidth * 0.4, -mainHeight * 0.45
      );

      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-mainWidth * 0.05, -mainHeight * 0.65);

      const hookCurl = curl * hookSize * 0.4;

      ctx.bezierCurveTo(
        mainWidth * 0.05, -mainHeight * 0.75 - hookCurl * 0.3,
        mainWidth * 0.2, -mainHeight * 0.8 - hookCurl * 0.5,
        mainWidth * 0.35, -mainHeight * 0.7 - hookCurl * 0.4
      );

      ctx.bezierCurveTo(
        mainWidth * 0.5 + hookCurl * 0.2, -mainHeight * 0.55,
        mainWidth * 0.55 + hookCurl * 0.4, -mainHeight * 0.3,
        mainWidth * 0.5, -mainHeight * 0.05
      );

      ctx.bezierCurveTo(
        mainWidth * 0.45, mainHeight * 0.15,
        mainWidth * 0.35, mainHeight * 0.25,
        mainWidth * 0.2, mainHeight * 0.2
      );

      ctx.bezierCurveTo(
        mainWidth * 0.1, mainHeight * 0.15,
        mainWidth * 0.05, mainHeight * 0.05,
        mainWidth * 0.05, -mainHeight * 0.05
      );

      ctx.bezierCurveTo(
        mainWidth * 0.08, -mainHeight * 0.15,
        mainWidth * 0.15, -mainHeight * 0.2,
        mainWidth * 0.22, -mainHeight * 0.18
      );

      ctx.bezierCurveTo(
        mainWidth * 0.3 + hookCurl * 0.2, -mainHeight * 0.15,
        mainWidth * 0.35, -mainHeight * 0.25,
        mainWidth * 0.32, -mainHeight * 0.35
      );

      ctx.bezierCurveTo(
        mainWidth * 0.28, -mainHeight * 0.45,
        mainWidth * 0.2, -mainHeight * 0.5,
        mainWidth * 0.1, -mainHeight * 0.48
      );

      ctx.fillStyle = gradient;
      ctx.fill();

      const goldColor = `hsla(${(45 + goldHue) % 360}, 85%, 65%, ${alpha * 0.7})`;
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      ctx.moveTo(-mainWidth * 0.4, -mainHeight * 0.45);
      ctx.bezierCurveTo(
        -mainWidth * 0.45, -mainHeight * 0.75,
        -mainWidth * 0.2 - curlAmount * 0.3, -mainHeight * 0.85,
        -mainWidth * 0.05, -mainHeight * 0.65
      );
      ctx.bezierCurveTo(
        mainWidth * 0.1, -mainHeight * 0.45,
        mainWidth * 0.15 + curlAmount * 0.2, -mainHeight * 0.2,
        mainWidth * 0.2, 0
      );
      ctx.bezierCurveTo(
        mainWidth * 0.22 + curlAmount * 0.3, mainHeight * 0.25,
        mainWidth * 0.15, mainHeight * 0.5,
        -mainWidth * 0.05, mainHeight * 0.55
      );
      ctx.bezierCurveTo(
        -mainWidth * 0.3, mainHeight * 0.6,
        -mainWidth * 0.5, mainHeight * 0.4,
        -mainWidth * 0.55, mainHeight * 0.1
      );
      ctx.bezierCurveTo(
        -mainWidth * 0.6 - curlAmount * 0.2, -mainHeight * 0.15,
        -mainWidth * 0.5 - curlAmount * 0.4, -mainHeight * 0.35,
        -mainWidth * 0.4, -mainHeight * 0.45
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-mainWidth * 0.05, -mainHeight * 0.65);
      ctx.bezierCurveTo(
        mainWidth * 0.05, -mainHeight * 0.75 - hookCurl * 0.3,
        mainWidth * 0.2, -mainHeight * 0.8 - hookCurl * 0.5,
        mainWidth * 0.35, -mainHeight * 0.7 - hookCurl * 0.4
      );
      ctx.bezierCurveTo(
        mainWidth * 0.5 + hookCurl * 0.2, -mainHeight * 0.55,
        mainWidth * 0.55 + hookCurl * 0.4, -mainHeight * 0.3,
        mainWidth * 0.5, -mainHeight * 0.05
      );
      ctx.bezierCurveTo(
        mainWidth * 0.45, mainHeight * 0.15,
        mainWidth * 0.35, mainHeight * 0.25,
        mainWidth * 0.2, mainHeight * 0.2
      );
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.45;
      ctx.beginPath();
      ctx.arc(-mainWidth * 0.15, 0, mainWidth * 0.12, 0, Math.PI * 2);
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    };

    drawAt(0, 0);
    if (x < width * 0.6) drawAt(w, 0);
    if (x > w - width * 0.6) drawAt(-w, 0);
    if (y < height * 0.6) drawAt(0, h);
    if (y > h - height * 0.6) drawAt(0, -h);
  }

  private adjustColor(color: string, amount: number): string {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return color;

    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = Math.max(0, Math.min(100, parseInt(match[3]) + amount));

    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
