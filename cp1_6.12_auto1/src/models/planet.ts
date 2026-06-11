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
}

function createStripeTexture(
  colors: number[],
  baseColor: number,
  width: number = 512,
  height: number = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(baseColor);
  ctx.fillStyle = `rgb(${Math.round(base.r * 255)},${Math.round(base.g * 255)},${Math.round(base.b * 255)})`;
  ctx.fillRect(0, 0, width, height);

  const bandCount = colors.length * 3;
  const bandHeight = height / bandCount;

  for (let i = 0; i < bandCount; i++) {
    const y = i * bandHeight;
    const color = new THREE.Color(colors[i % colors.length]);
    const alpha = 0.35 + Math.sin(i * 1.7) * 0.2;
    ctx.fillStyle = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha.toFixed(2)})`;
    ctx.fillRect(0, y, width, bandHeight * 0.65);
  }

  for (let i = 0; i < 60; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const w = Math.random() * width * 0.4 + 20;
    const h = Math.random() * 6 + 2;
    const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
    const alpha = Math.random() * 0.15 + 0.05;
    ctx.fillStyle = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b5442a';
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = Math.random() * 25 + 5;
    const shade = Math.random() * 40 - 20;
    const baseR = 181 + shade;
    const baseG = 68 + shade * 0.5;
    const baseB = 42 + shade * 0.3;
    ctx.fillStyle = `rgba(${Math.round(baseR)},${Math.round(baseG)},${Math.round(baseB)},0.4)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = Math.random() * 30 + 10;
    ctx.fillStyle = `rgba(100, 50, 30, ${(Math.random() * 0.3 + 0.1).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(210, 190, 170, 0.35)';
  ctx.fillRect(0, 0, 512, 20);
  ctx.fillRect(0, 236, 512, 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1a3a6a');
  gradient.addColorStop(0.2, '#1a5a9a');
  gradient.addColorStop(0.5, '#1a6aaa');
  gradient.addColorStop(0.8, '#1a5a9a');
  gradient.addColorStop(1, '#1a3a6a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  const continents = [
    { x: 260, y: 80, w: 60, h: 50 },
    { x: 240, y: 120, w: 40, h: 70 },
    { x: 280, y: 150, w: 30, h: 40 },
    { x: 350, y: 70, w: 80, h: 60 },
    { x: 360, y: 110, w: 50, h: 80 },
    { x: 130, y: 80, w: 50, h: 60 },
    { x: 140, y: 130, w: 30, h: 50 },
    { x: 400, y: 170, w: 40, h: 35 },
    { x: 100, y: 180, w: 45, h: 30 },
  ];

  continents.forEach((c) => {
    ctx.fillStyle = `rgba(50, 140, 60, 0.7)`;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(80, 160, 70, 0.4)`;
    ctx.beginPath();
    ctx.ellipse(c.x + 5, c.y + 3, c.w / 2.5, c.h / 2.5, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(220, 230, 240, 0.35)';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 238, 512, 18);

  for (let i = 0; i < 25; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(255, 255, 255, ${(Math.random() * 0.15 + 0.05).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.random() * 40 + 15, Math.random() * 8 + 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createMercuryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8c7853';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const r = Math.random() * 8 + 2;
    const shade = Math.random() * 30 - 15;
    ctx.fillStyle = `rgba(${140 + shade},${120 + shade},${83 + shade},0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 15; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const r = Math.random() * 6 + 3;
    ctx.fillStyle = `rgba(60, 50, 40, 0.4)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(120, 110, 90, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createVenusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8b84a';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const w = Math.random() * 100 + 30;
    const h = Math.random() * 15 + 5;
    const alpha = Math.random() * 0.2 + 0.05;
    ctx.fillStyle = `rgba(220, 170, 60, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, Math.random() * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createUranusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7de3f4';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 12; i++) {
    const y = (i / 12) * 128;
    const alpha = 0.05 + Math.random() * 0.1;
    ctx.fillStyle = `rgba(100, 200, 220, ${alpha.toFixed(2)})`;
    ctx.fillRect(0, y, 256, 128 / 12 * 0.7);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createNeptuneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3355dd';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 15; i++) {
    const y = (i / 15) * 128;
    const alpha = 0.08 + Math.random() * 0.12;
    ctx.fillStyle = `rgba(80, 120, 255, ${alpha.toFixed(2)})`;
    ctx.fillRect(0, y, 256, 128 / 15 * 0.6);
  }

  ctx.fillStyle = 'rgba(20, 50, 150, 0.5)';
  ctx.beginPath();
  ctx.ellipse(180, 90, 25, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 64);

  const bands = [
    { start: 0, end: 40, r: 180, g: 160, b: 120, a: 0.15 },
    { start: 40, end: 80, r: 210, g: 190, b: 140, a: 0.5 },
    { start: 80, end: 100, r: 170, g: 150, b: 110, a: 0.2 },
    { start: 100, end: 120, r: 200, g: 180, b: 130, a: 0.55 },
    { start: 120, end: 160, r: 160, g: 140, b: 100, a: 0.1 },
    { start: 160, end: 200, r: 220, g: 200, b: 150, a: 0.6 },
    { start: 200, end: 220, r: 180, g: 160, b: 120, a: 0.3 },
    { start: 220, end: 260, r: 200, g: 185, b: 135, a: 0.45 },
    { start: 260, end: 300, r: 170, g: 150, b: 110, a: 0.15 },
    { start: 300, end: 340, r: 190, g: 170, b: 125, a: 0.35 },
    { start: 340, end: 380, r: 210, g: 190, b: 145, a: 0.5 },
    { start: 380, end: 420, r: 180, g: 160, b: 120, a: 0.25 },
    { start: 420, end: 460, r: 200, g: 180, b: 135, a: 0.4 },
    { start: 460, end: 512, r: 170, g: 150, b: 110, a: 0.1 },
  ];

  bands.forEach((band) => {
    const gradient = ctx.createLinearGradient(band.start, 0, band.end, 0);
    gradient.addColorStop(0, `rgba(${band.r}, ${band.g}, ${band.b}, 0)`);
    gradient.addColorStop(0.15, `rgba(${band.r}, ${band.g}, ${band.b}, ${band.a})`);
    gradient.addColorStop(0.85, `rgba(${band.r}, ${band.g}, ${band.b}, ${band.a})`);
    gradient.addColorStop(1, `rgba(${band.r}, ${band.g}, ${band.b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(band.start, 0, band.end - band.start, 64);
  });

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 64;
    ctx.fillStyle = `rgba(255, 240, 200, ${(Math.random() * 0.08 + 0.02).toFixed(2)})`;
    ctx.fillRect(x, y, Math.random() * 3 + 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createSunGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 200, 80, 1.0)');
  gradient.addColorStop(0.15, 'rgba(255, 170, 50, 0.8)');
  gradient.addColorStop(0.3, 'rgba(255, 140, 30, 0.4)');
  gradient.addColorStop(0.5, 'rgba(255, 100, 10, 0.15)');
  gradient.addColorStop(0.7, 'rgba(255, 60, 0, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 40, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createSunCoronaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 220, 120, 0.6)');
  gradient.addColorStop(0.2, 'rgba(255, 180, 60, 0.3)');
  gradient.addColorStop(0.4, 'rgba(255, 120, 20, 0.1)');
  gradient.addColorStop(0.7, 'rgba(200, 60, 0, 0.03)');
  gradient.addColorStop(1, 'rgba(150, 30, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

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

  const glowTexture = createSunGlowTexture();
  const glowGeometry = new THREE.PlaneGeometry(SUN_CONFIG.radius * 5, SUN_CONFIG.radius * 5);
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowMesh);

  const coronaTexture = createSunCoronaTexture();
  const outerGlowGeometry = new THREE.PlaneGeometry(SUN_CONFIG.radius * 8, SUN_CONFIG.radius * 8);
  const outerGlowMaterial = new THREE.MeshBasicMaterial({
    map: coronaTexture,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
  group.add(outerGlow);

  const light = new THREE.PointLight(0xffeecc, 2.8, 0, 1.5);
  light.position.set(0, 0, 0);
  group.add(light);

  const ambientLight = new THREE.AmbientLight(0x222233, 0.35);
  group.add(ambientLight);

  group.userData.isSun = true;
  mesh.userData.isSunMesh = true;

  return { group, mesh, light, pulseTime: 0, glowMesh, outerGlow };
}

export function updateSun(sun: SunObject, delta: number, isPaused: boolean, camera: THREE.Camera): void {
  if (isPaused) return;
  sun.pulseTime += delta;

  const pulse = 1.0 + Math.sin(sun.pulseTime * 0.8) * 0.025 + Math.sin(sun.pulseTime * 1.6) * 0.012;
  sun.mesh.scale.set(pulse, pulse, pulse);

  const lightIntensity = 2.8 + Math.sin(sun.pulseTime * 1.2) * 0.2 + Math.sin(sun.pulseTime * 2.4) * 0.1;
  sun.light.intensity = lightIntensity;

  const material = sun.mesh.material as THREE.MeshBasicMaterial;
  const t = sun.pulseTime;
  const r = 1.0 + Math.sin(t * 0.5) * 0.03;
  const g = 0.78 + Math.sin(t * 0.7) * 0.03;
  const b = 0.25 + Math.sin(t * 0.9) * 0.02;
  material.color.setRGB(r, g, b);

  sun.glowMesh.lookAt(camera.position);
  sun.outerGlow.lookAt(camera.position);

  const glowScale = 1.0 + Math.sin(sun.pulseTime * 0.6) * 0.05;
  sun.glowMesh.scale.set(glowScale, glowScale, 1);
  const outerScale = 1.0 + Math.sin(sun.pulseTime * 0.4) * 0.03;
  sun.outerGlow.scale.set(outerScale, outerScale, 1);

  const glowMat = sun.glowMesh.material as THREE.MeshBasicMaterial;
  glowMat.opacity = 0.55 + Math.sin(sun.pulseTime * 1.0) * 0.1;
  const outerMat = sun.outerGlow.material as THREE.MeshBasicMaterial;
  outerMat.opacity = 0.25 + Math.sin(sun.pulseTime * 0.7) * 0.05;
}

const TEXTURE_FACTORIES: Record<string, () => THREE.CanvasTexture> = {
  Mercury: createMercuryTexture,
  Venus: createVenusTexture,
  Earth: createEarthTexture,
  Mars: createMarsTexture,
  Jupiter: () => createStripeTexture([0xd4a574, 0x8b6914, 0xc9a06a, 0xa67c52, 0xb8865a, 0x9a7348, 0xc4a870], 0xd4a574, 512, 256),
  Saturn: () => createStripeTexture([0xfad5a5, 0xd4a574, 0xe8c498, 0xc9a86c, 0xe0c890], 0xfad5a5, 512, 256),
  Uranus: createUranusTexture,
  Neptune: createNeptuneTexture
};

export function createPlanet(config: PlanetConfig): PlanetObject {
  const group = new THREE.Group();

  const baseGeometry = new THREE.IcosahedronGeometry(config.radius, 2);
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
    const atmosGeometry = new THREE.IcosahedronGeometry(config.radius * 1.08, 2);
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
      planet.ring.rotation.z += 0.0003 * delta * timeScale;
    }

    if (planet.glowMesh) {
      planet.glowMesh.rotation.y += 0.002 * delta * timeScale;
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
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return true;

  const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const lowEndKeywords = ['mali-4', 'adreno 3', 'powervr sgx', 'intel hd graphics', 'intel uhd graphics 6'];
    const rendererLower = renderer.toLowerCase();
    for (const keyword of lowEndKeywords) {
      if (rendererLower.includes(keyword)) return true;
    }
  }

  const maxTextureSize = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE);
  if (maxTextureSize < 4096) return true;

  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;

  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory && nav.deviceMemory < 4) return true;

  return false;
}
