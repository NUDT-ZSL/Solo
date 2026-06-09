import type { Layer, TextureType } from './MaterialLibrary';

export class LayerRenderer {
  static drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, forExport: boolean = false): void {
    if (!layer.visible) return;

    ctx.save();

    const pressScale = 1 - layer.pressAnim * 0.05;
    const effectiveScale = layer.scale * pressScale;
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;

    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(effectiveScale, effectiveScale);
    ctx.translate(-cx, -cy);

    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = LayerRenderer.mapBlendMode(layer.blendMode);

    ctx.shadowColor = layer.shadowColor;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
    ctx.shadowBlur = layer.shadowBlur;

    LayerRenderer.drawElementShape(ctx, layer);

    ctx.shadowColor = 'transparent';
    LayerRenderer.drawLightEffect(ctx, layer);

    ctx.restore();
  }

  private static mapBlendMode(mode: string): GlobalCompositeOperation {
    switch (mode) {
      case 'multiply': return 'multiply';
      case 'screen': return 'screen';
      case 'soft-light': return 'soft-light';
      case 'hard-light': return 'hard-light';
      default: return 'source-over';
    }
  }

  private static drawElementShape(ctx: CanvasRenderingContext2D, layer: Layer): void {
    const { x, y, width, height, type, colors } = layer;

    switch (type) {
      case 'vintage-stamp':
        LayerRenderer.drawVintageStamp(ctx, x, y, width, height, colors);
        break;
      case 'graffiti-stroke':
        LayerRenderer.drawGraffitiStroke(ctx, x, y, width, height, colors);
        break;
      case 'torn-paper':
        LayerRenderer.drawTornPaper(ctx, x, y, width, height, colors);
        break;
      case 'neon-bar':
        LayerRenderer.drawNeonBar(ctx, x, y, width, height, colors);
        break;
      case 'dried-flower':
        LayerRenderer.drawDriedFlower(ctx, x, y, width, height, colors);
        break;
      case 'vinyl-record':
        LayerRenderer.drawVinylRecord(ctx, x, y, width, height, colors);
        break;
    }
  }

  private static drawVintageStamp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
    const perforation = 10;
    const pSize = 6;

    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, colors[2]);
    grad.addColorStop(1, colors[3]);
    ctx.fillStyle = grad;

    ctx.beginPath();
    for (let i = 0; i <= w; i += perforation) {
      ctx.moveTo(x + i, y);
      ctx.arc(x + i, y, pSize / 2, 0, Math.PI * 2);
      ctx.moveTo(x + i, y + h);
      ctx.arc(x + i, y + h, pSize / 2, 0, Math.PI * 2);
    }
    for (let i = 0; i <= h; i += perforation) {
      ctx.moveTo(x, y + i);
      ctx.arc(x, y + i, pSize / 2, 0, Math.PI * 2);
      ctx.moveTo(x + w, y + i);
      ctx.arc(x + w, y + i, pSize / 2, 0, Math.PI * 2);
    }
    ctx.fill();

    const innerX = x + pSize;
    const innerY = y + pSize;
    const innerW = w - pSize * 2;
    const innerH = h - pSize * 2;

    const mainGrad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
    mainGrad.addColorStop(0, colors[0]);
    mainGrad.addColorStop(1, colors[1]);
    ctx.fillStyle = mainGrad;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(innerX + 6, innerY + 6, innerW - 12, innerH - 12);

    ctx.fillStyle = colors[2];
    ctx.font = `bold ${Math.min(w, h) * 0.18}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POST', x + w / 2, y + h * 0.38);

    ctx.font = `${Math.min(w, h) * 0.1}px serif`;
    ctx.fillText('1952', x + w / 2, y + h * 0.58);

    ctx.beginPath();
    ctx.arc(x + w * 0.75, y + h * 0.2, w * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = colors[2];
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private static drawGraffitiStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h * 0.7);
    ctx.bezierCurveTo(
      x + w * 0.2, y + h * 0.2,
      x + w * 0.4, y + h * 0.9,
      x + w * 0.5, y + h * 0.5
    );
    ctx.bezierCurveTo(
      x + w * 0.6, y + h * 0.1,
      x + w * 0.8, y + h * 0.8,
      x + w * 0.95, y + h * 0.4
    );

    ctx.lineWidth = h * 0.35;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[3]);
    grad.addColorStop(1, colors[1]);
    ctx.strokeStyle = grad;
    ctx.stroke();

    ctx.lineWidth = h * 0.1;
    ctx.strokeStyle = colors[2];
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < 5; i++) {
      const px = x + w * (0.15 + i * 0.18);
      const py = y + h * (0.3 + Math.sin(i * 1.5) * 0.3);
      ctx.beginPath();
      ctx.arc(px, py, h * 0.04 + Math.random() * h * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = colors[2];
      ctx.globalAlpha = 0.4;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private static drawTornPaper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
    ctx.save();

    const grad = ctx.createLinearGradient(x, y, x + w * 0.5, y + h * 0.5);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.6, colors[1]);
    grad.addColorStop(1, colors[2]);
    ctx.fillStyle = grad;

    ctx.beginPath();
    const points: [number, number][] = [];
    const steps = 40;
    const seed = (x * 7 + y * 13) % 100;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const noiseX = (Math.sin(seed + t * 15) * 0.5 + 0.5) * w * 0.03;
      points.push([x + t * w + noiseX, y + (Math.cos(seed + t * 12) * 0.5 + 0.5) * h * 0.04]);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([x + w + (Math.sin(seed + 10 + t * 14) * 0.5 + 0.5) * h * 0.035, y + t * h]);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([x + w - t * w + (Math.cos(seed + 20 + t * 16) * 0.5 + 0.5) * w * 0.03, y + h + (Math.sin(seed + 30 + t * 11) * 0.5 + 0.5) * h * 0.035]);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([x + (Math.cos(seed + 40 + t * 13) * 0.5 + 0.5) * w * 0.025, y + h - t * h]);
    }

    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors[3];
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors[3];
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 60; i++) {
      const nx = x + ((seed * 31 + i * 17) % 1000) / 1000 * w;
      const ny = y + ((seed * 41 + i * 23) % 1000) / 1000 * h;
      ctx.fillRect(nx, ny, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private static drawNeonBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
    ctx.save();

    const cx = x + w / 2;
    const barWidth = w * 0.3;

    ctx.shadowColor = colors[0];
    ctx.shadowBlur = w * 0.8;

    const grad1 = ctx.createLinearGradient(x, y, x, y + h);
    grad1.addColorStop(0, colors[0]);
    grad1.addColorStop(0.5, colors[1]);
    grad1.addColorStop(1, colors[0]);
    ctx.fillStyle = grad1;

    ctx.beginPath();
    ctx.roundRect(cx - barWidth / 2, y, barWidth, h, barWidth / 2);
    ctx.fill();

    ctx.shadowBlur = w * 0.4;
    ctx.shadowColor = colors[1];
    const innerGrad = ctx.createLinearGradient(x, y, x, y + h);
    innerGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    innerGrad.addColorStop(0.5, colors[2]);
    innerGrad.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = innerGrad;

    ctx.beginPath();
    ctx.roundRect(cx - barWidth * 0.2, y + h * 0.02, barWidth * 0.4, h * 0.96, barWidth * 0.2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    const bulbCount = 6;
    for (let i = 0; i < bulbCount; i++) {
      const by = y + h * (0.15 + i * (0.7 / (bulbCount - 1)));
      ctx.beginPath();
      ctx.arc(cx, by, barWidth * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx + (i - 1) * barWidth * 0.8, y + h * 0.1, barWidth * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = colors[3];
      ctx.globalAlpha = 0.6;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private static drawDriedFlower(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
    ctx.save();

    const cx = x + w / 2;
    const cy = y + h * 0.45;
    const petalCount = 8;
    const petalLen = Math.min(w, h) * 0.32;
    const petalW = Math.min(w, h) * 0.12;

    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 + layer * 0.2;
        const tipX = cx + Math.cos(angle) * petalLen * (layer === 0 ? 1 : 0.7);
        const tipY = cy + Math.sin(angle) * petalLen * (layer === 0 ? 1 : 0.7);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(petalLen * 0.5, -petalW, petalLen * (layer === 0 ? 1 : 0.7), 0);
        ctx.quadraticCurveTo(petalLen * 0.5, petalW, 0, 0);

        const pGrad = ctx.createLinearGradient(0, 0, petalLen, 0);
        pGrad.addColorStop(0, colors[2]);
        pGrad.addColorStop(0.5, colors[0]);
        pGrad.addColorStop(1, colors[1]);
        ctx.fillStyle = pGrad;
        ctx.fill();

        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
        void tipX; void tipY;
      }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, petalLen * 0.22, 0, Math.PI * 2);
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, petalLen * 0.22);
    centerGrad.addColorStop(0, colors[3]);
    centerGrad.addColorStop(1, colors[1]);
    ctx.fillStyle = centerGrad;
    ctx.fill();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * petalLen * 0.15, cy + Math.sin(a) * petalLen * 0.15, petalLen * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = colors[2];
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy + petalLen * 0.25);
    ctx.quadraticCurveTo(cx - w * 0.05, y + h * 0.75, cx + w * 0.03, y + h * 0.95);
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = Math.min(w, h) * 0.03;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx - w * 0.08, y + h * 0.75, w * 0.08, w * 0.04, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = colors[0];
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private static drawVinylRecord(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
    ctx.save();

    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 2;

    for (let ring = 0; ring < 30; ring++) {
      ctx.beginPath();
      ctx.arc(cx, cy, r - ring * (r / 35), 0, Math.PI * 2);
      ctx.strokeStyle = ring % 2 === 0 ? colors[0] : colors[1];
      ctx.lineWidth = r / 40;
      ctx.stroke();
    }

    const labelR = r * 0.35;
    const labelGrad = ctx.createRadialGradient(cx - labelR * 0.3, cy - labelR * 0.3, 0, cx, cy, labelR);
    labelGrad.addColorStop(0, colors[3]);
    labelGrad.addColorStop(0.6, colors[2]);
    labelGrad.addColorStop(1, colors[1]);

    ctx.beginPath();
    ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
    ctx.fillStyle = labelGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = colors[0];
    ctx.fill();
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = `bold ${r * 0.11}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JAZZ', cx, cy - labelR * 0.4);

    ctx.font = `${r * 0.07}px sans-serif`;
    ctx.fillText('VOL.3', cx, cy - labelR * 0.15);

    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(0, labelR * 0.55);
      ctx.lineTo(0, labelR * 0.7);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = r * 0.015;
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx - r * 0.5, cy - r * 0.5, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    ctx.restore();
  }

  private static drawLightEffect(ctx: CanvasRenderingContext2D, layer: Layer): void {
    const { lightEffect, x, y, width, height } = layer;
    if (lightEffect.type === 'none' || lightEffect.intensity <= 0) return;

    const cx = x + width / 2;
    const cy = y + height / 2;
    const effectR = Math.max(width, height) * (lightEffect.radius / 100);

    ctx.save();
    ctx.globalAlpha = lightEffect.intensity * 0.5;

    switch (lightEffect.type) {
      case 'soft-glow': {
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, effectR);
        glowGrad.addColorStop(0, 'rgba(255, 240, 200, 0.8)');
        glowGrad.addColorStop(0.5, 'rgba(255, 220, 150, 0.3)');
        glowGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, effectR, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'neon': {
        const neonColors = layer.colors[0] || '#FF00FF';
        ctx.shadowColor = neonColors;
        ctx.shadowBlur = effectR * 0.5;
        const neonGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, effectR);
        neonGrad.addColorStop(0, neonColors);
        neonGrad.addColorStop(0.4, layer.colors[1] || neonColors);
        neonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = neonGrad;
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.arc(cx, cy, effectR, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'sparkle': {
        const sparkleCount = Math.floor(15 + lightEffect.intensity * 20);
        for (let i = 0; i < sparkleCount; i++) {
          const angle = (i * 137.5 * Math.PI) / 180;
          const dist = Math.random() * effectR;
          const sx = cx + Math.cos(angle) * dist;
          const sy = cy + Math.sin(angle) * dist;
          const size = (1 + Math.random() * 3) * (1 - dist / effectR);

          ctx.save();
          ctx.translate(sx, sy);
          ctx.fillStyle = `rgba(255, 255, 230, ${lightEffect.intensity * (0.5 + Math.random() * 0.5)})`;
          for (let s = 0; s < 4; s++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -size * 2);
            ctx.lineTo(size * 0.2, 0);
            ctx.lineTo(0, size * 2);
            ctx.lineTo(-size * 0.2, 0);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        break;
      }
    }

    ctx.restore();
  }

  static drawTexture(ctx: CanvasRenderingContext2D, w: number, h: number, type: TextureType, size: number): void {
    if (type === 'none') return;

    ctx.save();
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d')!;

    const pixelSize = Math.max(1, size);

    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        let alpha = 0;
        let color = '#000000';

        switch (type) {
          case 'old-paper': {
            const noise = Math.random();
            alpha = noise * 0.08 + Math.sin(px * 0.01) * 0.02 + Math.cos(py * 0.008) * 0.02;
            color = noise > 0.7 ? '#8B7355' : '#C9A96E';
            break;
          }
          case 'burlap': {
            const crossX = (px / pixelSize) % 3 === 0;
            const crossY = (py / pixelSize) % 3 === 0;
            if (crossX || crossY) {
              alpha = 0.12 + Math.random() * 0.05;
              color = crossX && crossY ? '#5C4033' : '#8B6914';
            }
            break;
          }
          case 'watercolor': {
            const n = LayerRenderer.perlinNoise(px * 0.02, py * 0.02);
            alpha = Math.max(0, n) * 0.15;
            color = n > 0 ? '#A0522D' : '#4A4A4A';
            break;
          }
        }

        offCtx.fillStyle = color;
        offCtx.globalAlpha = Math.min(0.2, Math.max(0, alpha));
        offCtx.fillRect(px, py, pixelSize, pixelSize);
      }
    }

    ctx.drawImage(offCanvas, 0, 0);
    ctx.restore();
  }

  private static perlinNoise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const hash = (a: number, b: number) => ((Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1 + 1) % 1;
    const aa = hash(X, Y) * 2 - 1;
    const ab = hash(X, Y + 1) * 2 - 1;
    const ba = hash(X + 1, Y) * 2 - 1;
    const bb = hash(X + 1, Y + 1) * 2 - 1;
    const x1 = aa + u(xf) * (ba - aa);
    const x2 = ab + u(xf) * (bb - ab);
    return x1 + u(yf) * (x2 - x1);
  }

  static drawSelectionOutline(ctx: CanvasRenderingContext2D, layer: Layer, snapX: number | null, snapY: number | null, canvasW: number, canvasH: number): void {
    ctx.save();

    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const s = layer.scale;

    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);

    ctx.strokeStyle = 'rgba(91, 155, 213, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
    ctx.setLineDash([]);

    const handleSize = 8;
    const corners = [
      [layer.x, layer.y],
      [layer.x + layer.width, layer.y],
      [layer.x + layer.width, layer.y + layer.height],
      [layer.x, layer.y + layer.height]
    ];

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#5B9BD5';
    ctx.lineWidth = 1.5;

    corners.forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(91, 155, 213, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);

    if (snapX !== null) {
      ctx.beginPath();
      ctx.moveTo(snapX, 0);
      ctx.lineTo(snapX, canvasH);
      ctx.stroke();
    }
    if (snapY !== null) {
      ctx.beginPath();
      ctx.moveTo(0, snapY);
      ctx.lineTo(canvasW, snapY);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  static drawRotationLabel(ctx: CanvasRenderingContext2D, layer: Layer): void {
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const topY = layer.y - 10;

    const label = `${Math.round(layer.rotation % 360)}°`;
    ctx.save();
    ctx.font = '12px sans-serif';
    const metrics = ctx.measureText(label);
    const labelW = metrics.width + 12;
    const labelH = 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.roundRect(cx - labelW / 2, topY - labelH, labelW, labelH, 4);
    ctx.fill();

    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, topY - labelH / 2);

    ctx.restore();
    void cy;
  }
}
