import * as THREE from 'three';

export const generateCreaseTexture = (width: number = 512, height: number = 512): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  const gridSize = 4;
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  for (let i = 0; i <= gridSize; i++) {
    const x = i * cellW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    const y = i * cellH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (Math.random() > 0.5) {
        const x1 = i * cellW + (Math.random() - 0.5) * cellW * 0.2;
        const y1 = j * cellH + (Math.random() - 0.5) * cellH * 0.2;
        const x2 = (i + 1) * cellW + (Math.random() - 0.5) * cellW * 0.2;
        const y2 = (j + 1) * cellH + (Math.random() - 0.5) * cellH * 0.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      if (Math.random() > 0.6) {
        const x1 = (i + 1) * cellW + (Math.random() - 0.5) * cellW * 0.2;
        const y1 = j * cellH + (Math.random() - 0.5) * cellH * 0.2;
        const x2 = i * cellW + (Math.random() - 0.5) * cellW * 0.2;
        const y2 = (j + 1) * cellH + (Math.random() - 0.5) * cellH * 0.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < 15; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const radius = 20 + Math.random() * 60;
    const startAngle = Math.random() * Math.PI * 2;
    const angleLength = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + angleLength);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return texture;
};

export const generateStarTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

export const generateParticleTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
};

export const lerpColor = (color1: string, color2: string, t: number): THREE.Color => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return new THREE.Color(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const getComplementaryColor = (color: THREE.Color): THREE.Color => {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.h = (hsl.h + 0.5) % 1;
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
};
