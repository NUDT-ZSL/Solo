import * as THREE from 'three';
import { PlanetConfig, SUN_CONFIG } from '../data/planetData';

export interface PlanetObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  config: PlanetConfig;
  orbitAngle: number;
  labelDiv?: HTMLDivElement;
  ring?: THREE.Mesh;
}

export interface SunObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  pulseTime: number;
}

function createStripeTexture(colors: number[], baseColor: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(baseColor);
  ctx.fillStyle = `rgb(${base.r * 255},${base.g * 255},${base.b * 255})`;
  ctx.fillRect(0, 0, 256, 128);

  const stripeCount = colors.length;
  const stripeHeight = 128 / (stripeCount * 2);

  for (let i = 0; i < stripeCount * 2; i++) {
    const y = i * stripeHeight;
    const color = new THREE.Color(colors[i % colors.length]);
    ctx.fillStyle = `rgba(${color.r * 255},${color.g * 255},${color.b * 255},0.6)`;
    ctx.fillRect(0, y, 256, stripeHeight * 0.7);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createSun(): SunObject {
  const group = new THREE.Group();

  const geometry = new THREE.IcosahedronGeometry(SUN_CONFIG.radius, 2);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(SUN_CONFIG.color).lerp(new THREE.Color(SUN_CONFIG.emissive!), 0.3)
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const glowGeometry = new THREE.IcosahedronGeometry(SUN_CONFIG.radius * 1.2, 2);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide,
    depthWrite: false
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowMesh);

  const light = new THREE.PointLight(0xffeecc, 2.5, 0, 2);
  light.position.set(0, 0, 0);
  group.add(light);

  const ambientLight = new THREE.AmbientLight(0x222233, 0.35);
  group.add(ambientLight);

  group.userData.isSun = true;
  mesh.userData.isSunMesh = true;

  return { group, mesh, light, pulseTime: 0 };
}

export function updateSun(sun: SunObject, delta: number, isPaused: boolean): void {
  if (isPaused) return;
  sun.pulseTime += delta;
  const pulse = 1 + Math.sin(sun.pulseTime * 1.2) * 0.04;
  sun.mesh.scale.set(pulse, pulse, pulse);

  const lightIntensity = 2.5 + Math.sin(sun.pulseTime * 1.5) * 0.15;
  sun.light.intensity = lightIntensity;

  const material = sun.mesh.material as THREE.MeshBasicMaterial;
  const colorShift = Math.sin(sun.pulseTime * 0.8) * 0.05;
  material.color = new THREE.Color(SUN_CONFIG.color)
    .lerp(new THREE.Color(SUN_CONFIG.emissive!), 0.3 + colorShift);
}

export function createPlanet(config: PlanetConfig): PlanetObject {
  const group = new THREE.Group();

  const baseGeometry = new THREE.IcosahedronGeometry(config.radius, 2);
  let material: THREE.MeshStandardMaterial;

  if (config.stripeColors && config.stripeColors.length > 0) {
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
  if (config.hasRing && config.ringInnerRadius && config.ringOuterRadius) {
    const ringGeometry = new THREE.RingGeometry(
      config.ringInnerRadius,
      config.ringOuterRadius,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: config.ringColor ?? 0xc9a86c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);
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
    ring
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
