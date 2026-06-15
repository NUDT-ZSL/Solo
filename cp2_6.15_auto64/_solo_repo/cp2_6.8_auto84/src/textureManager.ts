import * as THREE from 'three';

export type PatternType = 'diamond' | 'wave' | 'figure';

interface PatternTexture {
  map: THREE.Texture | null;
}

function makeDiamondPattern(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string): void {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  const diamondColor = '#8B4513';
  const goldColor = '#F7C948';

  ctx.strokeStyle = diamondColor;
  ctx.lineWidth = 3;
  const bandY1 = h * 0.15;
  const bandY2 = h * 0.85;
  ctx.beginPath();
  ctx.moveTo(0, bandY1);
  ctx.lineTo(w, bandY1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, bandY2);
  ctx.lineTo(w, bandY2);
  ctx.stroke();

  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 4;
  const diaSize = 40;
  for (let y = bandY1 + 20; y < bandY2; y += diaSize * 2) {
    for (let x = 0; x < w; x += diaSize) {
      const offset = (Math.floor(y / diaSize) % 2 === 0) ? 0 : diaSize / 2;
      const cx = x + offset + diaSize / 2;
      const cy = y + diaSize / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - diaSize / 2);
      ctx.lineTo(cx + diaSize / 2, cy);
      ctx.lineTo(cx, cy + diaSize / 2);
      ctx.lineTo(cx - diaSize / 2, cy);
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#6B3410';
  for (let y = bandY1 + 30; y < bandY2; y += diaSize * 2) {
    for (let x = 0; x < w; x += diaSize * 2) {
      const offset = (Math.floor(y / diaSize) % 2 === 0) ? 0 : diaSize / 2;
      const cx = x + offset + diaSize / 2;
      const cy = y + diaSize / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function makeWavePattern(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string): void {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  const waveColor = '#F7C948';
  const accentColor = '#D4A853';

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  const bandY1 = h * 0.1;
  const bandY2 = h * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, bandY1);
  ctx.lineTo(w, bandY1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, bandY2);
  ctx.lineTo(w, bandY2);
  ctx.stroke();

  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 3;
  const amplitude = 15;
  const period = 80;
  for (let band = 0; band < 5; band++) {
    const y0 = bandY1 + 20 + band * 60;
    const phase = band % 2 === 0 ? 0 : period / 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = y0 + Math.sin((x + phase) / period * Math.PI * 2) * amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = accentColor;
  for (let x = 30; x < w; x += 60) {
    for (let y = bandY1 + 50; y < bandY2 - 20; y += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function makeFigurePattern(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string): void {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  const darkRed = '#8B2500';
  const golden = '#F7C948';
  const black = '#1A1A1A';

  ctx.strokeStyle = darkRed;
  ctx.lineWidth = 2;
  const bandY1 = h * 0.12;
  const bandY2 = h * 0.88;

  ctx.beginPath();
  ctx.moveTo(0, bandY1);
  ctx.lineTo(w, bandY1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, bandY2);
  ctx.lineTo(w, bandY2);
  ctx.stroke();

  const figureY = h / 2;
  const spacing = w / 4;
  for (let i = 0; i < 4; i++) {
    const cx = spacing / 2 + i * spacing;
    const topY = figureY - 60;
    const headR = 18;
    const bodyH = 70;
    ctx.fillStyle = darkRed;
    ctx.strokeStyle = black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, topY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = golden;
    ctx.beginPath();
    ctx.moveTo(cx - 25, topY + 15);
    ctx.lineTo(cx + 25, topY + 15);
    ctx.lineTo(cx + 35, topY + 15 + bodyH * 0.4);
    ctx.lineTo(cx - 35, topY + 15 + bodyH * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = darkRed;
    ctx.fillRect(cx - 8, topY - 3, 16, 3);
    ctx.fillRect(cx - 14, topY + 3, 28, 2);
  }

  ctx.fillStyle = golden;
  for (let x = 0; x < w; x += 50) {
    for (let y = bandY1 + 10; y < bandY2 - 10; y += 100) {
      ctx.beginPath();
      ctx.arc(x + 25, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createPatternTexture(pattern: PatternType, reveal: number = 1): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseColor = '#B87333';

  if (pattern === 'diamond') {
    makeDiamondPattern(ctx, size, size, baseColor);
  } else if (pattern === 'wave') {
    makeWavePattern(ctx, size, size, baseColor);
  } else {
    makeFigurePattern(ctx, size, size, baseColor);
  }

  if (reveal < 1) {
    ctx.globalAlpha = 1 - reveal;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function createBumpTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 50 + 128;
    data[i] = noise;
    data[i + 1] = noise;
    data[i + 2] = noise;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

export class TextureManager {
  private patterns: { [key in PatternType]: PatternTexture };
  private bumpMap: THREE.Texture | null = null;

  constructor() {
    this.patterns = {
      diamond: { map: null },
      wave: { map: null },
      figure: { map: null }
    };
    this.bumpMap = createBumpTexture();
  }

  init(): void {
    this.patterns.diamond.map = createPatternTexture('diamond', 1);
    this.patterns.wave.map = createPatternTexture('wave', 1);
    this.patterns.figure.map = createPatternTexture('figure', 1);
  }

  getPattern(pattern: PatternType): THREE.Texture | null {
    return this.patterns[pattern].map;
  }

  getBumpMap(): THREE.Texture | null {
    return this.bumpMap;
  }

  applyPatternToMaterial(material: THREE.MeshStandardMaterial, pattern: PatternType, revealAmount: number = 1): void {
    if (revealAmount >= 0.99) {
      if (this.patterns[pattern].map) {
        material.map = this.patterns[pattern].map!;
      }
    } else {
      material.map = createPatternTexture(pattern, revealAmount);
    }
    material.needsUpdate = true;
  }

  updateReveal(material: THREE.MeshStandardMaterial, pattern: PatternType, revealAmount: number): void {
    material.map = createPatternTexture(pattern, revealAmount);
    material.needsUpdate = true;
  }

  dispose(): void {
    Object.values(this.patterns).forEach(p => {
      if (p.map) p.map.dispose();
    });
    if (this.bumpMap) this.bumpMap.dispose();
  }
}
