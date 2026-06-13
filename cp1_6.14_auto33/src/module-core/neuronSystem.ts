export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BezierSegment {
  p0: Vec3;
  p1: Vec3;
  p2: Vec3;
  p3: Vec3;
}

export interface Dendrite {
  segments: BezierSegment[];
  taperStart: number;
  taperEnd: number;
}

export interface ColorPalette {
  hex: string;
  lightHex: string;
  name: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  { hex: '#6ee7b7', lightHex: '#a7f3d0', name: '薄荷绿' },
  { hex: '#67e8f9', lightHex: '#a5f3fc', name: '天青色' },
  { hex: '#a78bfa', lightHex: '#c4b5fd', name: '薰衣草紫' },
  { hex: '#f472b6', lightHex: '#f9a8d4', name: '玫瑰粉' }
];

export interface ControlParams {
  triggerRange: number;
  propagationDelay: number;
  particleCount: number;
}

export class Neuron {
  id: number;
  position: Vec3;
  velocity: Vec3;
  somaRadius: number;
  palette: ColorPalette;
  dendrites: Dendrite[];
  isFiring: boolean;
  fireStartTime: number;
  fireDuration: number;
  baseOpacity: number;
  baseBrightness: number;

  constructor(id: number, position: Vec3, palette: ColorPalette, somaRadius: number) {
    this.id = id;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.somaRadius = somaRadius;
    this.palette = palette;
    this.isFiring = false;
    this.fireStartTime = 0;
    this.fireDuration = 400;
    this.baseOpacity = 0.7;
    this.baseBrightness = 1.0;
  }
}

const NEURON_COUNT = 25;
const SPACE_SIZE = 200;
const HALF_SPACE = SPACE_SIZE / 2;
const MIN_DISTANCE = 30;
const MIN_RADIUS = 6;
const MAX_RADIUS = 10;
const MIN_DENDRITES = 6;
const MAX_DENDRITES = 12;
const MIN_SEGMENTS = 3;
const MAX_SEGMENTS = 5;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function generateRandomPosition(existing: Neuron[], minDist: number): Vec3 | null {
  const maxAttempts = 500;
  for (let i = 0; i < maxAttempts; i++) {
    const pos: Vec3 = {
      x: rand(-HALF_SPACE, HALF_SPACE),
      y: rand(-HALF_SPACE, HALF_SPACE),
      z: rand(-HALF_SPACE, HALF_SPACE)
    };
    let valid = true;
    for (const n of existing) {
      if (distance(pos, n.position) < minDist + n.somaRadius) {
        valid = false;
        break;
      }
    }
    if (valid) return pos;
  }
  return null;
}

function randomDirection(): Vec3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.sin(phi) * Math.sin(theta),
    z: Math.cos(phi)
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 1, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVec(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function generateDendrite(somaRadius: number, dir: Vec3): Dendrite {
  const segments: BezierSegment[] = [];
  const segCount = randInt(MIN_SEGMENTS, MAX_SEGMENTS);
  const segLength = rand(12, 22);

  let currentPoint: Vec3 = {
    x: dir.x * somaRadius,
    y: dir.y * somaRadius,
    z: dir.z * somaRadius
  };
  let currentDir = { ...dir };

  for (let i = 0; i < segCount; i++) {
    const p0 = { ...currentPoint };
    const progress = (i + 1) / segCount;

    const bend: Vec3 = {
      x: rand(-0.4, 0.4),
      y: rand(-0.4, 0.4),
      z: rand(-0.4, 0.4)
    };
    currentDir = normalize(addVec(currentDir, bend));

    const len = segLength * (1 - progress * 0.3);
    const p3 = addVec(p0, scaleVec(currentDir, len));

    const cp1Offset = scaleVec(currentDir, len * 0.3);
    const cp1: Vec3 = {
      x: p0.x + cp1Offset.x + rand(-len * 0.15, len * 0.15),
      y: p0.y + cp1Offset.y + rand(-len * 0.15, len * 0.15),
      z: p0.z + cp1Offset.z + rand(-len * 0.15, len * 0.15)
    };
    const cp2Offset = scaleVec(currentDir, len * 0.7);
    const cp2: Vec3 = {
      x: p3.x - cp2Offset.x + rand(-len * 0.15, len * 0.15),
      y: p3.y - cp2Offset.y + rand(-len * 0.15, len * 0.15),
      z: p3.z - cp2Offset.z + rand(-len * 0.15, len * 0.15)
    };

    segments.push({ p0, p1: cp1, p2: cp2, p3 });
    currentPoint = { ...p3 };
  }

  return {
    segments,
    taperStart: somaRadius * 0.35,
    taperEnd: somaRadius * 0.08
  };
}

export function generateNeurons(count: number = NEURON_COUNT): Neuron[] {
  const neurons: Neuron[] = [];

  for (let i = 0; i < count; i++) {
    const palette = COLOR_PALETTES[randInt(0, COLOR_PALETTES.length - 1)];
    const radius = rand(MIN_RADIUS, MAX_RADIUS);
    let position = generateRandomPosition(neurons, MIN_DISTANCE);

    if (!position) {
      position = {
        x: rand(-HALF_SPACE, HALF_SPACE),
        y: rand(-HALF_SPACE, HALF_SPACE),
        z: rand(-HALF_SPACE, HALF_SPACE)
      };
    }

    const neuron = new Neuron(i, position, palette, radius);
    neuron.velocity = {
      x: rand(-0.02, 0.02),
      y: rand(-0.02, 0.02),
      z: rand(-0.02, 0.02)
    };

    const dendriteCount = randInt(MIN_DENDRITES, MAX_DENDRITES);
    const usedDirections: Vec3[] = [];
    for (let d = 0; d < dendriteCount; d++) {
      let dir: Vec3;
      let attempts = 0;
      do {
        dir = randomDirection();
        attempts++;
      } while (
        attempts < 30 &&
        usedDirections.some(
          (ud) => dir.x * ud.x + dir.y * ud.y + dir.z * ud.z > 0.55
        )
      );
      usedDirections.push(dir);
      neuron.dendrites ??= [];
      neuron.dendrites.push(generateDendrite(radius, dir));
    }
    if (!neuron.dendrites) neuron.dendrites = [];

    neurons.push(neuron);
  }

  return neurons;
}

export function updateNeuronPositions(
  neurons: Neuron[],
  deltaTime: number
): void {
  const dt = deltaTime / 16.67;
  const spaceMargin = 4;

  for (const neuron of neurons) {
    neuron.velocity.x += (Math.random() - 0.5) * 0.01 * dt;
    neuron.velocity.y += (Math.random() - 0.5) * 0.01 * dt;
    neuron.velocity.z += (Math.random() - 0.5) * 0.01 * dt;

    const maxSpeed = 0.03;
    const speed = Math.sqrt(
      neuron.velocity.x ** 2 + neuron.velocity.y ** 2 + neuron.velocity.z ** 2
    );
    if (speed > maxSpeed) {
      const s = maxSpeed / speed;
      neuron.velocity.x *= s;
      neuron.velocity.y *= s;
      neuron.velocity.z *= s;
    }

    neuron.position.x += neuron.velocity.x * dt;
    neuron.position.y += neuron.velocity.y * dt;
    neuron.position.z += neuron.velocity.z * dt;

    if (neuron.position.x > HALF_SPACE - spaceMargin) {
      neuron.position.x = HALF_SPACE - spaceMargin;
      neuron.velocity.x *= -1;
    } else if (neuron.position.x < -HALF_SPACE + spaceMargin) {
      neuron.position.x = -HALF_SPACE + spaceMargin;
      neuron.velocity.x *= -1;
    }
    if (neuron.position.y > HALF_SPACE - spaceMargin) {
      neuron.position.y = HALF_SPACE - spaceMargin;
      neuron.velocity.y *= -1;
    } else if (neuron.position.y < -HALF_SPACE + spaceMargin) {
      neuron.position.y = -HALF_SPACE + spaceMargin;
      neuron.velocity.y *= -1;
    }
    if (neuron.position.z > HALF_SPACE - spaceMargin) {
      neuron.position.z = HALF_SPACE - spaceMargin;
      neuron.velocity.z *= -1;
    } else if (neuron.position.z < -HALF_SPACE + spaceMargin) {
      neuron.position.z = -HALF_SPACE + spaceMargin;
      neuron.velocity.z *= -1;
    }
  }

  for (let i = 0; i < neurons.length; i++) {
    for (let j = i + 1; j < neurons.length; j++) {
      const a = neurons[i];
      const b = neurons[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dz = b.position.z - a.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = MIN_DISTANCE * 0.85;
      if (dist < minDist && dist > 0) {
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        a.position.x -= nx * overlap;
        a.position.y -= ny * overlap;
        a.position.z -= nz * overlap;
        b.position.x += nx * overlap;
        b.position.y += ny * overlap;
        b.position.z += nz * overlap;
        const tmpvx = a.velocity.x;
        const tmpvy = a.velocity.y;
        const tmpvz = a.velocity.z;
        a.velocity.x = b.velocity.x * 0.5;
        a.velocity.y = b.velocity.y * 0.5;
        a.velocity.z = b.velocity.z * 0.5;
        b.velocity.x = tmpvx * 0.5;
        b.velocity.y = tmpvy * 0.5;
        b.velocity.z = tmpvz * 0.5;
      }
    }
  }
}

export function getNeighborsWithinRange(
  neurons: Neuron[],
  source: Neuron,
  range: number
): Neuron[] {
  const result: Neuron[] = [];
  const rangeSq = range * range;
  for (const n of neurons) {
    if (n.id === source.id) continue;
    const dx = n.position.x - source.position.x;
    const dy = n.position.y - source.position.y;
    const dz = n.position.z - source.position.z;
    if (dx * dx + dy * dy + dz * dz <= rangeSq) {
      result.push(n);
    }
  }
  result.sort((a, b) => {
    const da =
      (a.position.x - source.position.x) ** 2 +
      (a.position.y - source.position.y) ** 2 +
      (a.position.z - source.position.z) ** 2;
    const db =
      (b.position.x - source.position.x) ** 2 +
      (b.position.y - source.position.y) ** 2 +
      (b.position.z - source.position.z) ** 2;
    return da - db;
  });
  return result;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
}

export function distanceVec3(a: Vec3, b: Vec3): number {
  return distance(a, b);
}
