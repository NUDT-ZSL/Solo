export type ColorPreset = 'bluePurple' | 'redOrange' | 'warm';

export type NebulaType = 'spiral' | 'elliptical' | 'irregular';

export interface DensityParams {
  particleCount: number;
  colorPreset: ColorPreset;
  rotationSpeed: number;
  radius: number;
  nebulaType: NebulaType;
  spiralArms?: number;
  armWidth?: number;
  eccentricity?: number;
  flatness?: number;
  clusterCount?: number;
  clusterSpread?: number;
  concentration?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  z: number;
  baseR: number;
  baseTheta: number;
  basePhi: number;
  size: number;
  color: [number, number, number];
  colorHex: string;
  angularOffset: number;
  radialOffset: number;
  verticalOffset: number;
  birthPhase: number;
  orbitSpeed: number;
}

const COLOR_PRESETS: Record<ColorPreset, { inner: [number, number, number]; outer: [number, number, number] }> = {
  bluePurple: { inner: [0.290, 0.565, 0.851], outer: [0.557, 0.267, 0.678] },
  redOrange: { inner: [0.902, 0.302, 0.247], outer: [0.976, 0.600, 0.133] },
  warm: { inner: [0.957, 0.647, 0.306], outer: [0.820, 0.306, 0.243] },
};

class PerlinNoise {
  private perm: number[];

  constructor(seed: number = 42) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const p = this.perm;
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;
    return this.lerp(
      this.lerp(
        this.lerp(this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z), u),
        this.lerp(this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  fbm(x: number, y: number, z: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise3D(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxValue;
  }
}

const perlin = new PerlinNoise(42);

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

function colorToHex(c: [number, number, number]): string {
  const r = Math.round(Math.min(255, Math.max(0, c[0] * 255)));
  const g = Math.round(Math.min(255, Math.max(0, c[1] * 255)));
  const b = Math.round(Math.min(255, Math.max(0, c[2] * 255)));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function generateSpiralPosition(index: number, total: number, params: DensityParams): { r: number; theta: number; phi: number } {
  const arms = params.spiralArms || 3;
  const armWidth = params.armWidth || 0.4;
  const concentration = params.concentration || 0.6;
  const radius = params.radius;

  const armIndex = index % arms;
  const armAngle = (armIndex / arms) * Math.PI * 2;

  const t = Math.pow(Math.random(), concentration);
  const r = t * radius;

  const spiralAngle = armAngle + t * Math.PI * 3;
  const spread = armWidth * (1 + t * 0.5);
  const noiseVal = perlin.fbm(Math.cos(armAngle) * 2, Math.sin(armAngle) * 2, t * 2, 3);
  const theta = spiralAngle + (Math.random() - 0.5) * spread + noiseVal * 0.5;

  const phiNoise = perlin.fbm(r * 0.05, armIndex * 1.7, index * 0.001, 2);
  const phi = (Math.random() - 0.5) * Math.PI * 0.6 + phiNoise * 0.3;

  return { r, theta, phi };
}

function generateEllipticalPosition(_index: number, _total: number, params: DensityParams): { r: number; theta: number; phi: number } {
  const eccentricity = params.eccentricity || 0.6;
  const flatness = params.flatness || 0.3;
  const concentration = params.concentration || 0.8;
  const radius = params.radius;

  const t = Math.pow(Math.random(), concentration);
  const r = t * radius;

  const theta = Math.random() * Math.PI * 2;

  const phiMax = Math.PI * (1 - flatness);
  const phi = (Math.random() - 0.5) * phiMax;

  const noiseVal = perlin.fbm(
    r * 0.03 * Math.cos(theta),
    r * 0.03 * Math.sin(theta),
    r * 0.03 * Math.sin(phi),
    3
  );

  const rFinal = r * (1 + noiseVal * 0.15 * eccentricity);

  return { r: rFinal, theta, phi };
}

function generateIrregularPosition(index: number, _total: number, params: DensityParams): { r: number; theta: number; phi: number } {
  const clusterCount = params.clusterCount || 5;
  const clusterSpread = params.clusterSpread || 15;
  const concentration = params.concentration || 0.4;
  const radius = params.radius;

  const clusterIndex = Math.floor(Math.random() * clusterCount);
  const clusterAngle1 = perlin.fbm(clusterIndex * 2.3, 0.5, 0.3, 2) * Math.PI * 2;
  const clusterAngle2 = perlin.fbm(0.3, clusterIndex * 1.7, 0.5, 2) * Math.PI - Math.PI / 2;
  const clusterDist = perlin.fbm(clusterIndex * 0.7, clusterIndex * 1.3, 1.0, 2) * radius * 0.6;

  const cx = clusterDist * Math.cos(clusterAngle1) * Math.cos(clusterAngle2);
  const cy = clusterDist * Math.sin(clusterAngle2);
  const cz = clusterDist * Math.sin(clusterAngle1) * Math.cos(clusterAngle2);

  const localR = Math.pow(Math.random(), concentration) * clusterSpread;
  const localTheta = Math.random() * Math.PI * 2;
  const localPhi = (Math.random() - 0.5) * Math.PI;

  const noiseVal = perlin.fbm(index * 0.01, clusterIndex * 0.5, 0.7, 2);
  const scatter = (1 - concentration) * radius * 0.3;

  const px = cx + localR * Math.cos(localTheta) * Math.cos(localPhi) + noiseVal * scatter;
  const py = cy + localR * Math.sin(localPhi) + noiseVal * scatter * 0.5;
  const pz = cz + localR * Math.sin(localTheta) * Math.cos(localPhi) + noiseVal * scatter;

  const r = Math.sqrt(px * px + py * py + pz * pz);
  const theta = Math.atan2(pz, px);
  const phi = Math.asin(Math.max(-1, Math.min(1, py / Math.max(r, 0.001))));

  return { r: Math.min(r, radius * 1.2), theta, phi };
}

function sphericalToCartesian(r: number, theta: number, phi: number): { x: number; y: number; z: number } {
  return {
    x: r * Math.cos(phi) * Math.cos(theta),
    y: r * Math.sin(phi),
    z: r * Math.cos(phi) * Math.sin(theta),
  };
}

export function generateNebula(params: DensityParams): Particle[] {
  const { particleCount, colorPreset, radius } = params;
  const preset = COLOR_PRESETS[colorPreset];
  const particles: Particle[] = [];

  const generators: Record<NebulaType, (i: number, t: number, p: DensityParams) => { r: number; theta: number; phi: number }> = {
    spiral: generateSpiralPosition,
    elliptical: generateEllipticalPosition,
    irregular: generateIrregularPosition,
  };

  const generator = generators[params.nebulaType];

  for (let i = 0; i < particleCount; i++) {
    const { r, theta, phi } = generator(i, particleCount, params);
    const clampedR = Math.max(0, r);
    const { x, y, z } = sphericalToCartesian(clampedR, theta, phi);

    const distRatio = Math.min(clampedR / radius, 1);
    const color = lerpColor(preset.inner, preset.outer, distRatio);

    const size = 0.1 + Math.random() * 0.4;
    const angularOffset = Math.random() * Math.PI * 2;
    const radialOffset = (Math.random() - 0.5) * 0.3;
    const verticalOffset = (Math.random() - 0.5) * 0.2;
    const birthPhase = Math.random() * Math.PI * 2;
    const orbitSpeed = 0.8 + Math.random() * 0.4;

    particles.push({
      id: `p_${i.toString().padStart(6, '0')}`,
      x,
      y,
      z,
      baseR: clampedR,
      baseTheta: theta,
      basePhi: phi,
      size,
      color,
      colorHex: colorToHex(color),
      angularOffset,
      radialOffset,
      verticalOffset,
      birthPhase,
      orbitSpeed,
    });
  }

  return particles;
}

export function updateParticles(particles: Particle[], time: number, rotationSpeed: number): Float32Array {
  const count = particles.length;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const p = particles[i];

    const angularSpeed = rotationSpeed * p.orbitSpeed * 0.02;
    const thetaOffset = angularSpeed * time + p.angularOffset;

    const radiusOscillation = Math.sin(time * 0.3 * rotationSpeed + p.birthPhase) * p.radialOffset * 2;
    const currentR = Math.max(0.1, p.baseR + radiusOscillation);

    const phiOscillation = Math.sin(time * 0.15 * rotationSpeed + p.birthPhase * 1.5) * p.verticalOffset * 3;
    const currentPhi = p.basePhi + phiOscillation;

    const currentTheta = p.baseTheta + thetaOffset;

    const pos = sphericalToCartesian(currentR, currentTheta, currentPhi);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    p.x = pos.x;
    p.y = pos.y;
    p.z = pos.z;
  }

  return positions;
}

export function interpolateColors(
  particles: Particle[],
  colorPreset: ColorPreset,
  radius: number
): Float32Array {
  const preset = COLOR_PRESETS[colorPreset];
  const count = particles.length;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const p = particles[i];
    const distRatio = Math.min(p.baseR / radius, 1);
    const c = lerpColor(preset.inner, preset.outer, distRatio);
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
    p.color = c;
    p.colorHex = colorToHex(c);
  }

  return colors;
}

export function getDefaultParams(): DensityParams {
  return {
    particleCount: 5000,
    colorPreset: 'bluePurple',
    rotationSpeed: 0.5,
    radius: 50,
    nebulaType: 'spiral',
    spiralArms: 3,
    armWidth: 0.4,
    concentration: 0.6,
  };
}

export function getPresetParams(type: NebulaType): DensityParams {
  switch (type) {
    case 'spiral':
      return {
        particleCount: 5000,
        colorPreset: 'bluePurple',
        rotationSpeed: 0.8,
        radius: 50,
        nebulaType: 'spiral',
        spiralArms: 3,
        armWidth: 0.4,
        concentration: 0.6,
      };
    case 'elliptical':
      return {
        particleCount: 5000,
        colorPreset: 'redOrange',
        rotationSpeed: 0.3,
        radius: 50,
        nebulaType: 'elliptical',
        eccentricity: 0.6,
        flatness: 0.3,
        concentration: 0.8,
      };
    case 'irregular':
      return {
        particleCount: 5000,
        colorPreset: 'warm',
        rotationSpeed: 0.1,
        radius: 50,
        nebulaType: 'irregular',
        clusterCount: 5,
        clusterSpread: 15,
        concentration: 0.4,
      };
  }
}
