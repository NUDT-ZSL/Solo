import * as THREE from 'three';
import { PlanetConfig, SUN_CONFIG } from '../data/planetData';

export interface PlanetObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  config: PlanetConfig;
  orbitAngle: number;
  labelDiv?: HTMLDivElement;
  ring?: THREE.Mesh;
  glowMesh?: THREE.Mesh;
}

export interface SunObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  pulseTime: number;
  glowMesh: THREE.Mesh;
  outerGlow: THREE.Mesh;
  coronaGlow: THREE.Mesh;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function createStripeTexture(
  colors: number[],
  baseColor: number,
  width: number = 512,
  height: number = 256,
  seed: number = 42
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(seed);

  const base = new THREE.Color(baseColor);
  ctx.fillStyle = `rgb(${Math.round(base.r * 255)},${Math.round(base.g * 255)},${Math.round(base.b * 255)})`;
  ctx.fillRect(0, 0, width, height);

  const bandCount = colors.length * 4 + 6;
  for (let i = 0; i < bandCount; i++) {
    const y = (i / bandCount) * height;
    const bandHeight = height / bandCount * (0.5 + rand() * 0.8);
    const color = new THREE.Color(colors[Math.floor(rand() * colors.length) % colors.length]);
    const alpha = 0.2 + rand() * 0.4;

    const gradient = ctx.createLinearGradient(0, y, 0, y + bandHeight);
    gradient.addColorStop(0, `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},0)`);
    gradient.addColorStop(0.3, `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha.toFixed(2)})`);
    gradient.addColorStop(0.7, `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${(alpha * 0.8).toFixed(2)})`);
    gradient.addColorStop(1, `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, width, bandHeight);
  }

  for (let i = 0; i < 100; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const w = rand() * width * 0.3 + 10;
    const h = rand() * 8 + 2;
    const color = new THREE.Color(colors[Math.floor(rand() * colors.length) % colors.length]);
    const alpha = rand() * 0.2 + 0.03;
    ctx.fillStyle = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, rand() * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(12345);

  const baseGradient = ctx.createLinearGradient(0, 0, 0, 256);
  baseGradient.addColorStop(0, '#c2553a');
  baseGradient.addColorStop(0.3, '#b5442a');
  baseGradient.addColorStop(0.5, '#a83d25');
  baseGradient.addColorStop(0.7, '#b5442a');
  baseGradient.addColorStop(1, '#c2553a');
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 300; i++) {
    const x = rand() * 512;
    const y = rand() * 256;
    const r = rand() * 30 + 3;
    const shade = rand() * 60 - 30;
    const baseR = 181 + shade;
    const baseG = 68 + shade * 0.4;
    const baseB = 42 + shade * 0.2;
    const alpha = 0.2 + rand() * 0.35;
    ctx.fillStyle = `rgba(${Math.round(baseR)},${Math.round(baseG)},${Math.round(baseB)},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 25; i++) {
    const x = rand() * 512;
    const y = rand() * 256;
    const r = rand() * 18 + 5;
    const innerR = r * (0.3 + rand() * 0.3);
    const darkR = 80 + rand() * 30;
    const darkG = 30 + rand() * 20;
    const darkB = 15 + rand() * 15;

    ctx.fillStyle = `rgba(${darkR}, ${darkG}, ${darkB}, ${(0.25 + rand() * 0.2).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${darkR + 40}, ${darkG + 20}, ${darkB + 10}, ${(0.15 + rand() * 0.15).toFixed(2)})`;
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${200 + rand() * 30}, ${180 + rand() * 20}, ${150 + rand() * 20}, ${(0.15 + rand() * 0.2).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.2, innerR, 0, Math.PI * 2);
    ctx.fill();
  }

  const polarGradient1 = ctx.createLinearGradient(0, 0, 0, 25);
  polarGradient1.addColorStop(0, 'rgba(220, 200, 180, 0.5)');
  polarGradient1.addColorStop(0.5, 'rgba(200, 170, 150, 0.3)');
  polarGradient1.addColorStop(1, 'rgba(180, 140, 120, 0)');
  ctx.fillStyle = polarGradient1;
  ctx.fillRect(0, 0, 512, 25);

  const polarGradient2 = ctx.createLinearGradient(0, 231, 0, 256);
  polarGradient2.addColorStop(0, 'rgba(180, 140, 120, 0)');
  polarGradient2.addColorStop(0.5, 'rgba(200, 170, 150, 0.3)');
  polarGradient2.addColorStop(1, 'rgba(220, 200, 180, 0.5)');
  ctx.fillStyle = polarGradient2;
  ctx.fillRect(0, 231, 512, 25);

  for (let i = 0; i < 50; i++) {
    const x = rand() * 512;
    const y = rand() * 256;
    const r = rand() * 3 + 0.5;
    ctx.fillStyle = `rgba(60, 25, 15, ${(0.3 + rand() * 0.3).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const x = rand() * 512;
    const y = 50 + rand() * 156;
    const w = rand() * 80 + 30;
    const h = rand() * 4 + 1;
    ctx.fillStyle = `rgba(130, 50, 30, ${(0.1 + rand() * 0.15).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, rand() * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(67890);

  const oceanGradient = ctx.createLinearGradient(0, 0, 0, 256);
  oceanGradient.addColorStop(0, '#1a3a6a');
  oceanGradient.addColorStop(0.2, '#1a5a9a');
  oceanGradient.addColorStop(0.5, '#1a6aaa');
  oceanGradient.addColorStop(0.8, '#1a5a9a');
  oceanGradient.addColorStop(1, '#1a3a6a');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, 512, 256);

  const continents = [
    { x: 260, y: 80, w: 65, h: 55, r: 0.3 },
    { x: 240, y: 125, w: 42, h: 75, r: 0.2 },
    { x: 285, y: 155, w: 28, h: 38, r: 0.4 },
    { x: 360, y: 75, w: 90, h: 65, r: 0.5 },
    { x: 370, y: 115, w: 52, h: 85, r: 0.3 },
    { x: 125, y: 82, w: 55, h: 62, r: 0.2 },
    { x: 145, y: 135, w: 32, h: 55, r: 0.4 },
    { x: 410, y: 175, w: 45, h: 32, r: 0.6 },
    { x: 95, y: 185, w: 50, h: 28, r: 0.3 },
    { x: 320, y: 50, w: 25, h: 20, r: 0.5 },
    { x: 200, y: 160, w: 20, h: 15, r: 0.2 },
  ];

  continents.forEach((c) => {
    ctx.fillStyle = 'rgba(45, 130, 55, 0.75)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, c.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(70, 155, 60, 0.45)';
    ctx.beginPath();
    ctx.ellipse(c.x + 6, c.y + 4, c.w / 2.8, c.h / 2.8, c.r + 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(100, 170, 80, 0.25)';
    ctx.beginPath();
    ctx.ellipse(c.x + 10, c.y + 8, c.w / 4, c.h / 4, c.r + 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 40; i++) {
    const x = rand() * 512;
    const y = rand() * 256;
    const r = rand() * 4 + 1;
    ctx.fillStyle = `rgba(30, 110, 45, ${(0.4 + rand() * 0.3).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const iceGradient1 = ctx.createLinearGradient(0, 0, 0, 22);
  iceGradient1.addColorStop(0, 'rgba(240, 248, 255, 0.8)');
  iceGradient1.addColorStop(0.6, 'rgba(220, 235, 250, 0.4)');
  iceGradient1.addColorStop(1, 'rgba(200, 220, 240, 0)');
  ctx.fillStyle = iceGradient1;
  ctx.fillRect(0, 0, 512, 22);

  const iceGradient2 = ctx.createLinearGradient(0, 234, 0, 256);
  iceGradient2.addColorStop(0, 'rgba(200, 220, 240, 0)');
  iceGradient2.addColorStop(0.4, 'rgba(220, 235, 250, 0.4)');
  iceGradient2.addColorStop(1, 'rgba(240, 248, 255, 0.8)');
  ctx.fillStyle = iceGradient2;
  ctx.fillRect(0, 234, 512, 22);

  for (let i = 0; i < 35; i++) {
    const x = rand() * 512;
    const y = rand() * 256;
    ctx.fillStyle = `rgba(255, 255, 255, ${(rand() * 0.18 + 0.04).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rand() * 45 + 12, rand() * 9 + 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMercuryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(11111);

  ctx.fillStyle = '#8c7853';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 120; i++) {
    const x = rand() * 256;
    const y = rand() * 128;
    const r = rand() * 10 + 1.5;
    const shade = rand() * 40 - 20;
    ctx.fillStyle = `rgba(${Math.round(140 + shade)},${Math.round(120 + shade * 0.8)},${Math.round(83 + shade * 0.5)},0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 35; i++) {
    const x = rand() * 256;
    const y = rand() * 128;
    const r = rand() * 8 + 2;
    ctx.fillStyle = `rgba(55, 45, 35, 0.45)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(110, 100, 80, 0.35)`;
    ctx.lineWidth = 0.5 + rand();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(160, 145, 115, 0.25)`;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createVenusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(22222);

  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#d4a040');
  gradient.addColorStop(0.5, '#e8b84a');
  gradient.addColorStop(1, '#d4a040');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 60; i++) {
    const x = rand() * 256;
    const y = rand() * 128;
    const w = rand() * 120 + 25;
    const h = rand() * 18 + 4;
    const alpha = rand() * 0.25 + 0.05;
    const color = new THREE.Color().setHSL(0.1 + rand() * 0.05, 0.6, 0.5 + rand() * 0.15);
    ctx.fillStyle = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, rand() * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 15; i++) {
    const y = (i / 15) * 128;
    const alpha = 0.05 + rand() * 0.1;
    ctx.fillStyle = `rgba(200, 150, 60, ${alpha.toFixed(2)})`;
    ctx.fillRect(0, y, 256, 128 / 15 * 0.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createUranusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(33333);

  ctx.fillStyle = '#7de3f4';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 18; i++) {
    const y = (i / 18) * 128;
    const alpha = 0.06 + rand() * 0.12;
    const shade = rand() * 20 - 10;
    ctx.fillStyle = `rgba(${Math.round(125 + shade)}, ${Math.round(210 + shade)}, ${Math.round(230 + shade)}, ${alpha.toFixed(2)})`;
    ctx.fillRect(0, y, 256, 128 / 18 * 0.55);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createNeptuneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(44444);

  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#2a45c0');
  gradient.addColorStop(0.5, '#3355dd');
  gradient.addColorStop(1, '#2a45c0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * 128;
    const alpha = 0.08 + rand() * 0.15;
    ctx.fillStyle = `rgba(80, 120, 255, ${alpha.toFixed(2)})`;
    ctx.fillRect(0, y, 256, 128 / 20 * 0.5);
  }

  ctx.fillStyle = 'rgba(20, 50, 150, 0.5)';
  ctx.beginPath();
  ctx.ellipse(180, 90, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(60, 100, 220, 0.3)';
  ctx.beginPath();
  ctx.ellipse(180, 90, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(55555);

  ctx.clearRect(0, 0, 1024, 128);

  const bands = [
    { start: 0, end: 70, r: 180, g: 160, b: 120, a: 0.1 },
    { start: 70, end: 150, r: 210, g: 190, b: 140, a: 0.45 },
    { start: 150, end: 190, r: 170, g: 150, b: 110, a: 0.15 },
    { start: 190, end: 240, r: 200, g: 180, b: 130, a: 0.55 },
    { start: 240, end: 280, r: 220, g: 200, b: 150, a: 0.3 },
    { start: 280, end: 320, r: 160, g: 140, b: 100, a: 0.08 },
    { start: 320, end: 400, r: 225, g: 205, b: 155, a: 0.6 },
    { start: 400, end: 440, r: 180, g: 160, b: 120, a: 0.25 },
    { start: 440, end: 520, r: 200, g: 185, b: 135, a: 0.5 },
    { start: 520, end: 580, r: 170, g: 150, b: 110, a: 0.12 },
    { start: 580, end: 660, r: 190, g: 170, b: 125, a: 0.4 },
    { start: 660, end: 720, r: 210, g: 190, b: 145, a: 0.55 },
    { start: 720, end: 780, r: 180, g: 160, b: 120, a: 0.2 },
    { start: 780, end: 860, r: 200, g: 180, b: 135, a: 0.45 },
    { start: 860, end: 940, r: 170, g: 155, b: 115, a: 0.3 },
    { start: 940, end: 1024, r: 185, g: 165, b: 125, a: 0.15 },
  ];

  bands.forEach((band) => {
    const gradient = ctx.createLinearGradient(band.start, 0, band.end, 0);
    gradient.addColorStop(0, `rgba(${band.r}, ${band.g}, ${band.b}, 0)`);
    gradient.addColorStop(0.1, `rgba(${band.r}, ${band.g}, ${band.b}, ${band.a})`);
    gradient.addColorStop(0.5, `rgba(${band.r + 10}, ${band.g + 8}, ${band.b + 5}, ${band.a * 0.9})`);
    gradient.addColorStop(0.9, `rgba(${band.r}, ${band.g}, ${band.b}, ${band.a})`);
    gradient.addColorStop(1, `rgba(${band.r}, ${band.g}, ${band.b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(band.start, 0, band.end - band.start, 128);
  });

  for (let i = 0; i < 300; i++) {
    const x = rand() * 1024;
    const y = rand() * 128;
    const w = rand() * 4 + 0.5;
    const h = rand() * 2 + 0.5;
    const brightness = rand() * 0.12 + 0.03;
    ctx.fillStyle = `rgba(255, 240, 200, ${brightness.toFixed(2)})`;
    ctx.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 50; i++) {
    const x = rand() * 1024;
    const width = rand() * 80 + 10;
    const alpha = rand() * 0.08 + 0.02;
    ctx.fillStyle = `rgba(255, 250, 230, ${alpha.toFixed(2)})`;
    ctx.fillRect(x, 0, width, 128);
  }

  for (let i = 0; i < 10; i++) {
    const x = rand() * 1024;
    const gapWidth = rand() * 15 + 3;
    ctx.fillStyle = `rgba(80, 60, 40, ${(0.1 + rand() * 0.15).toFixed(2)})`;
    ctx.fillRect(x, 0, gapWidth, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRadialGlowTexture(
  innerColor: string,
  outerColor: string,
  size: number = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(1, outerColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createSun(): SunObject {
  const group = new THREE.Group();

  const geometry = new THREE.IcosahedronGeometry(SUN_CONFIG.radius, 3);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffcc44
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const glowTexture = createRadialGlowTexture(
    'rgba(255, 200, 80, 1.0)',
    'rgba(255, 40, 0, 0.0)',
    256
  );
  const glowGeometry = new THREE.PlaneGeometry(SUN_CONFIG.radius * 6, SUN_CONFIG.radius * 6);
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowMesh);

  const outerGlowTexture = createRadialGlowTexture(
    'rgba(255, 180, 60, 0.5)',
    'rgba(200, 60, 0, 0.0)',
    256
  );
  const outerGlowGeometry = new THREE.PlaneGeometry(SUN_CONFIG.radius * 10, SUN_CONFIG.radius * 10);
  const outerGlowMaterial = new THREE.MeshBasicMaterial({
    map: outerGlowTexture,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
  group.add(outerGlow);

  const coronaTexture = createRadialGlowTexture(
    'rgba(255, 220, 150, 0.25)',
    'rgba(150, 50, 0, 0.0)',
    512
  );
  const coronaGeometry = new THREE.PlaneGeometry(SUN_CONFIG.radius * 16, SUN_CONFIG.radius * 16);
  const coronaMaterial = new THREE.MeshBasicMaterial({
    map: coronaTexture,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const coronaGlow = new THREE.Mesh(coronaGeometry, coronaMaterial);
  group.add(coronaGlow);

  const light = new THREE.PointLight(0xffeecc, 3.0, 0, 1.2);
  light.position.set(0, 0, 0);
  group.add(light);

  const ambientLight = new THREE.AmbientLight(0x222233, 0.35);
  group.add(ambientLight);

  group.userData.isSun = true;
  mesh.userData.isSunMesh = true;

  return { group, mesh, light, pulseTime: 0, glowMesh, outerGlow, coronaGlow };
}

export function updateSun(
  sun: SunObject,
  delta: number,
  isPaused: boolean,
  camera: THREE.Camera
): void {
  if (isPaused) return;
  sun.pulseTime += delta;

  const t = sun.pulseTime;
  const pulse1 = Math.sin(t * 0.6) * 0.02;
  const pulse2 = Math.sin(t * 1.3 + 0.5) * 0.012;
  const pulse3 = Math.sin(t * 2.1 + 1.2) * 0.005;
  const totalPulse = 1.0 + pulse1 + pulse2 + pulse3;
  sun.mesh.scale.set(totalPulse, totalPulse, totalPulse);

  const lightIntensity = 3.0 + Math.sin(t * 0.9) * 0.2 + Math.sin(t * 1.7) * 0.12 + Math.sin(t * 2.8) * 0.05;
  sun.light.intensity = lightIntensity;

  const material = sun.mesh.material as THREE.MeshBasicMaterial;
  const r = 1.0 + Math.sin(t * 0.4) * 0.025;
  const g = 0.8 + Math.sin(t * 0.6 + 0.3) * 0.03;
  const b = 0.27 + Math.sin(t * 0.8 + 0.7) * 0.02;
  material.color.setRGB(r, g, b);

  sun.glowMesh.lookAt(camera.position);
  sun.outerGlow.lookAt(camera.position);
  sun.coronaGlow.lookAt(camera.position);

  const glowScale = 1.0 + Math.sin(t * 0.5) * 0.06;
  sun.glowMesh.scale.set(glowScale, glowScale, 1);

  const outerScale = 1.0 + Math.sin(t * 0.35) * 0.04;
  sun.outerGlow.scale.set(outerScale, outerScale, 1);

  const coronaScale = 1.0 + Math.sin(t * 0.25 + 1) * 0.03;
  sun.coronaGlow.scale.set(coronaScale, coronaScale, 1);

  const glowMat = sun.glowMesh.material as THREE.MeshBasicMaterial;
  glowMat.opacity = 0.6 + Math.sin(t * 0.7) * 0.08;

  const outerMat = sun.outerGlow.material as THREE.MeshBasicMaterial;
  outerMat.opacity = 0.3 + Math.sin(t * 0.5) * 0.06;

  const coronaMat = sun.coronaGlow.material as THREE.MeshBasicMaterial;
  coronaMat.opacity = 0.15 + Math.sin(t * 0.3) * 0.05;
}

const TEXTURE_FACTORIES: Record<string, () => THREE.CanvasTexture> = {
  Mercury: createMercuryTexture,
  Venus: createVenusTexture,
  Earth: createEarthTexture,
  Mars: createMarsTexture,
  Jupiter: () => createStripeTexture(
    [0xd4a574, 0x8b6914, 0xc9a06a, 0xa67c52, 0xb8865a, 0x9a7348, 0xc4a870, 0x7a5a2a],
    0xd4a574,
    512,
    256,
    77777
  ),
  Saturn: () => createStripeTexture(
    [0xfad5a5, 0xd4a574, 0xe8c498, 0xc9a86c, 0xe0c890, 0xdab878],
    0xfad5a5,
    512,
    256,
    88888
  ),
  Uranus: createUranusTexture,
  Neptune: createNeptuneTexture
};

export function createPlanet(config: PlanetConfig): PlanetObject {
  const group = new THREE.Group();

  const detail = config.radius > 2 ? 3 : 2;
  const baseGeometry = new THREE.IcosahedronGeometry(config.radius, detail);
  let material: THREE.MeshStandardMaterial;

  const textureFactory = TEXTURE_FACTORIES[config.name];
  if (textureFactory) {
    const texture = textureFactory();
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.05,
      emissive: config.emissive ?? 0x000000,
      emissiveIntensity: config.emissiveIntensity ?? 0
    });
  } else if (config.stripeColors && config.stripeColors.length > 0) {
    const texture = createStripeTexture(config.stripeColors, config.color);
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.05,
      emissive: config.emissive ?? 0x000000,
      emissiveIntensity: config.emissiveIntensity ?? 0
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.85,
      metalness: 0.05,
      emissive: config.emissive ?? 0x000000,
      emissiveIntensity: config.emissiveIntensity ?? 0
    });
  }

  const mesh = new THREE.Mesh(baseGeometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  let ring: THREE.Mesh | undefined;
  let glowMesh: THREE.Mesh | undefined;

  if (config.hasRing && config.ringInnerRadius && config.ringOuterRadius) {
    const ringGeometry = new THREE.RingGeometry(
      config.ringInnerRadius,
      config.ringOuterRadius,
      128
    );

    const ringTexture = createSaturnRingTexture();
    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);
  }

  if (config.name === 'Earth') {
    const atmosGeometry = new THREE.IcosahedronGeometry(config.radius * 1.08, detail);
    const atmosMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
      depthWrite: false
    });
    glowMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    group.add(glowMesh);
  }

  group.userData.isPlanet = true;
  group.userData.planetName = config.name;
  mesh.userData.isPlanetMesh = true;
  mesh.userData.planetName = config.name;

  return {
    group,
    mesh,
    config,
    orbitAngle: Math.random() * Math.PI * 2,
    ring,
    glowMesh
  };
}

export function updatePlanet(
  planet: PlanetObject,
  delta: number,
  isPaused: boolean,
  timeScale: number = 1
): void {
  if (!isPaused) {
    planet.orbitAngle += planet.config.orbitSpeed * delta * 0.15 * timeScale;
    planet.mesh.rotation.y += planet.config.rotationSpeed * delta * timeScale;

    const x = Math.cos(planet.orbitAngle) * planet.config.orbitRadius;
    const z = Math.sin(planet.orbitAngle) * planet.config.orbitRadius;
    planet.group.position.set(x, 0, z);

    if (planet.ring) {
      planet.ring.rotation.z += 0.0005 * delta * timeScale;
    }

    if (planet.glowMesh) {
      planet.glowMesh.rotation.y += 0.003 * delta * timeScale;
    }
  }
}

export function createStarField(count: number, radius: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.7 + Math.random() * 0.3);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = Math.random() * 2 + 0.5;

    const brightness = 0.6 + Math.random() * 0.4;
    const hue = 0.55 + Math.random() * 0.15;
    const color = new THREE.Color().setHSL(hue, 0.3, brightness);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false
  });

  const stars = new THREE.Points(geometry, material);
  stars.userData.isStarField = true;
  return stars;
}

export function detectLowEndDevice(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return true;

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      const lowEndKeywords = [
        'mali-4', 'mali-t6', 'mali-t720',
        'adreno 3', 'adreno 405',
        'powervr sgx', 'powervr rogue g6200',
        'intel hd graphics 3000', 'intel hd graphics 4000',
        'intel uhd graphics 605', 'intel uhd graphics 610',
        'intel hd graphics 2500', 'intel hd graphics 4600'
      ];
      const rendererLower = renderer.toLowerCase();
      for (const keyword of lowEndKeywords) {
        if (rendererLower.includes(keyword)) return true;
      }
    }

    const maxTextureSize = (gl as WebGLRenderingContext).getParameter(
      (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE
    ) as number;
    if (maxTextureSize < 4096) return true;

    const nav = navigator as Navigator & {
      hardwareConcurrency?: number;
      deviceMemory?: number;
    };
    if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) return true;
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return true;

    if ('devicePixelRatio' in window) {
      if (window.devicePixelRatio <= 1.25) return true;
    }

    return false;
  } catch {
    return false;
  }
}
