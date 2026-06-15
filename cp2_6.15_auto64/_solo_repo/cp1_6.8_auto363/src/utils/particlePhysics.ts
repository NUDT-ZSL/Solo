export const SPIRAL_TURNS = 4;
export const SPIRAL_HEIGHT = 24;
export const SPIRAL_RADIUS = 8;
export const TUBE_RADIUS = 2.0;

export interface ExplosionEffect {
  type: 'explosion';
  ox: number;
  oy: number;
  oz: number;
  startTime: number;
  duration: number;
  strength: number;
  radius: number;
  burstColors: Float32Array;
}

export interface ShockwaveEffect {
  type: 'shockwave';
  ox: number;
  oy: number;
  oz: number;
  startTime: number;
  duration: number;
  strength: number;
  maxRadius: number;
  width: number;
}

export type Effect = ExplosionEffect | ShockwaveEffect;

export interface ParticleData {
  baseTs: Float32Array;
  offsets: Float32Array;
  phases: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
}

export function createParticleData(count: number): ParticleData {
  const baseTs = new Float32Array(count);
  const offsets = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    baseTs[i] = Math.random();
    phases[i] = Math.random() * Math.PI * 2;
    sizes[i] = 1.0 + Math.random() * 2.5;
    alphas[i] = 0.6 + Math.random() * 0.4;

    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetR = Math.pow(Math.random(), 0.6) * TUBE_RADIUS;
    offsets[i * 3] = Math.cos(offsetAngle) * offsetR;
    offsets[i * 3 + 1] = (Math.random() - 0.5) * TUBE_RADIUS * 0.8;
    offsets[i * 3 + 2] = Math.sin(offsetAngle) * offsetR;
  }

  return { baseTs, offsets, phases, sizes, alphas };
}

export function getSpiralBasePosition(t: number): [number, number, number] {
  const angle = t * SPIRAL_TURNS * Math.PI * 2;
  const y = (t - 0.5) * SPIRAL_HEIGHT;
  const r = SPIRAL_RADIUS * (1.0 - t * 0.3);
  return [r * Math.cos(angle), y, r * Math.sin(angle)];
}

export function computePositions(
  positions: Float32Array,
  velocities: Float32Array,
  data: ParticleData,
  time: number,
  flowSpeed: number,
): void {
  const count = data.baseTs.length;
  const rotAngle = time * flowSpeed * 0.08;
  const cosR = Math.cos(rotAngle);
  const sinR = Math.sin(rotAngle);
  const oscSpeed = flowSpeed * 0.4;
  const oscAmp = 0.25;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = ((data.baseTs[i] + time * flowSpeed * 0.008) % 1.0 + 1.0) % 1.0;
    const [bx, by, bz] = getSpiralBasePosition(t);

    const rx = bx * cosR - bz * sinR;
    const rz = bx * sinR + bz * cosR;

    const phase = data.phases[i];
    const ox = Math.sin(time * oscSpeed + phase) * oscAmp;
    const oy = Math.cos(time * oscSpeed * 0.7 + phase * 1.3) * oscAmp * 0.5;
    const oz = Math.sin(time * oscSpeed * 0.9 + phase * 0.7) * oscAmp;

    const offX = data.offsets[i3];
    const offY = data.offsets[i3 + 1];
    const offZ = data.offsets[i3 + 2];

    const tx = rx + ox + offX * cosR - offZ * sinR;
    const ty = by + oy + offY;
    const tz = rz + oz + offX * sinR + offZ * cosR;

    positions[i3] = tx + velocities[i3];
    positions[i3 + 1] = ty + velocities[i3 + 1];
    positions[i3 + 2] = tz + velocities[i3 + 2];

    velocities[i3] *= 0.96;
    velocities[i3 + 1] *= 0.96;
    velocities[i3 + 2] *= 0.96;
  }
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

const THEME_GRADIENTS: Record<string, [number, number, number][]> = {
  stardust: [
    [1.0, 0.92, 0.4],
    [1.0, 0.6, 0.2],
    [0.3, 0.5, 1.0],
    [0.15, 0.3, 0.9],
  ],
  aurora: [
    [0.2, 1.0, 0.5],
    [0.1, 0.8, 0.7],
    [0.4, 0.3, 0.9],
    [0.7, 0.15, 1.0],
  ],
  lava: [
    [1.0, 0.95, 0.3],
    [1.0, 0.55, 0.1],
    [0.9, 0.2, 0.05],
    [0.5, 0.05, 0.02],
  ],
};

export function generateColors(
  count: number,
  theme: string,
  baseTs: Float32Array,
): Float32Array {
  const colors = new Float32Array(count * 3);
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.stardust;

  for (let i = 0; i < count; i++) {
    const t = baseTs[i];
    const segment = t * (gradient.length - 1);
    const idx = Math.min(Math.floor(segment), gradient.length - 2);
    const frac = segment - idx;
    const color = lerpColor(gradient[idx], gradient[idx + 1], frac);

    colors[i * 3] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];
  }

  return colors;
}

export function lerpColors(
  colors: Float32Array,
  targetColors: Float32Array,
  factor: number,
): boolean {
  let done = true;
  const len = colors.length;
  for (let i = 0; i < len; i++) {
    const diff = targetColors[i] - colors[i];
    if (Math.abs(diff) > 0.001) {
      colors[i] += diff * factor;
      done = false;
    } else {
      colors[i] = targetColors[i];
    }
  }
  return done;
}

export function createExplosion(
  ox: number,
  oy: number,
  oz: number,
  time: number,
  count: number,
): ExplosionEffect {
  const burstColors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const hue = Math.random();
    const [r, g, b] = hslToRgb(hue, 0.9, 0.7);
    burstColors[i * 3] = r;
    burstColors[i * 3 + 1] = g;
    burstColors[i * 3 + 2] = b;
  }

  return {
    type: 'explosion',
    ox, oy, oz,
    startTime: time,
    duration: 1.5,
    strength: 8.0,
    radius: 6.0,
    burstColors,
  };
}

export function createShockwave(
  ox: number,
  oy: number,
  oz: number,
  time: number,
): ShockwaveEffect {
  return {
    type: 'shockwave',
    ox, oy, oz,
    startTime: time,
    duration: 2.0,
    strength: 12.0,
    maxRadius: 15.0,
    width: 2.5,
  };
}

export function processEffects(
  positions: Float32Array,
  velocities: Float32Array,
  colors: Float32Array,
  baseColors: Float32Array,
  effects: Effect[],
  time: number,
): Effect[] {
  const activeEffects: Effect[] = [];

  for (const effect of effects) {
    const elapsed = time - effect.startTime;
    const progress = elapsed / effect.duration;

    if (progress >= 1.0) continue;
    activeEffects.push(effect);

    if (effect.type === 'explosion') {
      processExplosion(positions, velocities, colors, baseColors, effect, elapsed, progress);
    } else if (effect.type === 'shockwave') {
      processShockwave(positions, velocities, effect, elapsed, progress);
    }
  }

  return activeEffects;
}

function processExplosion(
  positions: Float32Array,
  velocities: Float32Array,
  colors: Float32Array,
  baseColors: Float32Array,
  effect: ExplosionEffect,
  elapsed: number,
  progress: number,
): void {
  const count = positions.length / 3;
  const convergePhase = Math.min(elapsed / 0.3, 1.0);
  const burstPhase = Math.max(0, (elapsed - 0.2) / 1.3);
  const colorFade = Math.max(0, 1.0 - progress * 1.5);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const dx = positions[i3] - effect.ox;
    const dy = positions[i3 + 1] - effect.oy;
    const dz = positions[i3 + 2] - effect.oz;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (dist > effect.radius * 2) continue;

    const falloff = 1.0 - Math.min(dist / effect.radius, 1.0);
    const falloffSq = falloff * falloff;

    if (convergePhase < 1.0) {
      const convergeStrength = effect.strength * falloffSq * (1.0 - convergePhase) * 0.5;
      const invDist = dist > 0.01 ? 1.0 / dist : 0;
      velocities[i3] -= dx * invDist * convergeStrength * 0.02;
      velocities[i3 + 1] -= dy * invDist * convergeStrength * 0.02;
      velocities[i3 + 2] -= dz * invDist * convergeStrength * 0.02;
    }

    if (burstPhase > 0 && burstPhase < 1.0) {
      const burstStrength = effect.strength * falloffSq * (1.0 - burstPhase) * 0.04;
      const invDist = dist > 0.01 ? 1.0 / dist : 0;
      velocities[i3] += dx * invDist * burstStrength;
      velocities[i3 + 1] += dy * invDist * burstStrength;
      velocities[i3 + 2] += dz * invDist * burstStrength;
    }

    if (colorFade > 0 && i * 3 < effect.burstColors.length) {
      colors[i3] = baseColors[i3] + (effect.burstColors[i3] - baseColors[i3]) * colorFade * falloff;
      colors[i3 + 1] = baseColors[i3 + 1] + (effect.burstColors[i3 + 1] - baseColors[i3 + 1]) * colorFade * falloff;
      colors[i3 + 2] = baseColors[i3 + 2] + (effect.burstColors[i3 + 2] - baseColors[i3 + 2]) * colorFade * falloff;
    }
  }
}

function processShockwave(
  positions: Float32Array,
  velocities: Float32Array,
  effect: ShockwaveEffect,
  elapsed: number,
  progress: number,
): void {
  const count = positions.length / 3;
  const currentRadius = effect.maxRadius * progress;
  const strength = effect.strength * (1.0 - progress) * (1.0 - progress);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const dx = positions[i3] - effect.ox;
    const dy = positions[i3 + 1] - effect.oy;
    const dz = positions[i3 + 2] - effect.oz;
    const distXZ = Math.sqrt(dx * dx + dz * dz);
    const dist = Math.sqrt(distXZ * distXZ + dy * dy);

    if (dist < 0.01) continue;

    const ringDist = Math.abs(distXZ - currentRadius);
    if (ringDist > effect.width) continue;

    const ringFalloff = 1.0 - ringDist / effect.width;
    const push = strength * ringFalloff * 0.03;

    if (distXZ > 0.01) {
      velocities[i3] += (dx / distXZ) * push;
      velocities[i3 + 2] += (dz / distXZ) * push;
    }
    velocities[i3 + 1] += (dy / dist) * push * 0.3;
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  const sector = Math.floor(h * 6) % 6;
  if (sector === 0) { r = c; g = x; }
  else if (sector === 1) { r = x; g = c; }
  else if (sector === 2) { g = c; b = x; }
  else if (sector === 3) { g = x; b = c; }
  else if (sector === 4) { r = x; b = c; }
  else { r = c; b = x; }

  return [r + m, g + m, b + m];
}
