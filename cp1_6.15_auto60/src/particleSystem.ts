import * as THREE from 'three';

export type ColorTheme = 'nebula' | 'flame' | 'aurora' | 'rose' | 'ghost';

export const colorThemes: Record<ColorTheme, { name: string; center: THREE.Color; edge: THREE.Color }> = {
  nebula: {
    name: '星云蓝紫',
    center: new THREE.Color(0x8b5cf6),
    edge: new THREE.Color(0x1e1b4b)
  },
  flame: {
    name: '烈焰橙红',
    center: new THREE.Color(0xfbbf24),
    edge: new THREE.Color(0x7f1d1d)
  },
  aurora: {
    name: '极光绿蓝',
    center: new THREE.Color(0x34d399),
    edge: new THREE.Color(0x0c4a6e)
  },
  rose: {
    name: '玫瑰粉金',
    center: new THREE.Color(0xfbbf24),
    edge: new THREE.Color(0x831843)
  },
  ghost: {
    name: '幽灵灰白',
    center: new THREE.Color(0xf1f5f9),
    edge: new THREE.Color(0x334155)
  }
};

export interface ParticleConfig {
  count: number;
  radius: number;
  theme: ColorTheme;
  rotationSpeed: number;
}

let particleSystem: THREE.Points | null = null;
let positions: Float32Array | null = null;
let targetPositions: Float32Array | null = null;
let colors: Float32Array | null = null;
let targetColors: Float32Array | null = null;
let sizes: Float32Array | null = null;
let currentConfig: ParticleConfig | null = null;
let transitionProgress: number = 1;
let rotationAngle: number = 0;

const transitionDuration: number = 300;
let transitionStartTime: number = 0;
let isTransitioning: boolean = false;

function generateSpiralPositions(count: number, radius: number): Float32Array {
  const pos = new Float32Array(count * 3);
  const arms: number = 3;

  for (let i = 0; i < count; i++) {
    const t: number = i / count;
    const armOffset: number = (i % arms) * ((Math.PI * 2) / arms);
    const spiralTightness: number = 4.0;
    const distance: number = Math.pow(Math.random(), 0.5) * radius;
    const angle: number = armOffset + t * Math.PI * 2 * spiralTightness + (Math.random() - 0.5) * 0.5;
    const verticalSpread: number = (1 - distance / radius) * radius * 0.3;

    pos[i * 3] = Math.cos(angle) * distance + (Math.random() - 0.5) * radius * 0.1;
    pos[i * 3 + 1] = (Math.random() - 0.5) * verticalSpread;
    pos[i * 3 + 2] = Math.sin(angle) * distance + (Math.random() - 0.5) * radius * 0.1;
  }

  return pos;
}

function generateColors(count: number, positions: Float32Array, radius: number, theme: ColorTheme): Float32Array {
  const cols = new Float32Array(count * 3);
  const { center, edge } = colorThemes[theme];

  for (let i = 0; i < count; i++) {
    const x: number = positions[i * 3];
    const y: number = positions[i * 3 + 1];
    const z: number = positions[i * 3 + 2];
    const dist: number = Math.sqrt(x * x + y * y + z * z) / radius;
    const t: number = Math.min(dist, 1);

    const r: number = center.r * (1 - t) + edge.r * t;
    const g: number = center.g * (1 - t) + edge.g * t;
    const b: number = center.b * (1 - t) + edge.b * t;

    cols[i * 3] = r;
    cols[i * 3 + 1] = g;
    cols[i * 3 + 2] = b;
  }

  return cols;
}

function generateSizes(count: number): Float32Array {
  const sz = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    sz[i] = 2 + Math.random() * 8;
  }
  return sz;
}

export function initParticles(scene: THREE.Scene, config: ParticleConfig): THREE.Points {
  currentConfig = { ...config };

  positions = generateSpiralPositions(config.count, config.radius);
  targetPositions = new Float32Array(positions);
  colors = generateColors(config.count, positions, config.radius, config.theme);
  targetColors = new Float32Array(colors);
  sizes = generateSizes(config.count);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);

  return particleSystem;
}

export function updateParticles(config: ParticleConfig, deltaTime: number): void {
  if (!particleSystem || !currentConfig) return;

  const needRecompute: boolean =
    config.count !== currentConfig.count ||
    config.radius !== currentConfig.radius ||
    config.theme !== currentConfig.theme;

  if (needRecompute) {
    const newPositions = generateSpiralPositions(config.count, config.radius);
    const newColors = generateColors(config.count, newPositions, config.radius, config.theme);

    if (targetPositions && targetPositions.length === newPositions.length) {
      targetPositions.set(newPositions);
      targetColors!.set(newColors);
    } else {
      targetPositions = newPositions;
      targetColors = newColors;
      positions = new Float32Array(newPositions);
      colors = new Float32Array(newColors);

      const geometry = particleSystem.geometry;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      if (sizes && sizes.length !== config.count) {
        sizes = generateSizes(config.count);
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      }
    }

    isTransitioning = true;
    transitionStartTime = performance.now();
    currentConfig = { ...config };
  }

  if (isTransitioning && targetPositions && targetColors) {
    const elapsed: number = performance.now() - transitionStartTime;
    transitionProgress = Math.min(elapsed / transitionDuration, 1);
    const eased: number = 1 - Math.pow(1 - transitionProgress, 3);

    for (let i = 0; i < positions!.length; i++) {
      positions![i] = positions![i] + (targetPositions[i] - positions![i]) * eased * 0.15;
      colors![i] = colors![i] + (targetColors[i] - colors![i]) * eased * 0.15;
    }

    if (transitionProgress >= 1) {
      positions!.set(targetPositions);
      colors!.set(targetColors);
      isTransitioning = false;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
  }

  rotationAngle += config.rotationSpeed * deltaTime * 0.3;
  if (particleSystem) {
    particleSystem.rotation.y = rotationAngle;
  }
}

export function getCurrentThemeName(): string {
  if (!currentConfig) return 'nebula';
  return colorThemes[currentConfig.theme].name;
}

export function getCurrentCount(): number {
  return currentConfig?.count ?? 1000;
}
