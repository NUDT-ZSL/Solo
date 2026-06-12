export interface Vec2 {
  x: number;
  y: number;
}

export interface LightSegment {
  from: Vec2;
  to: Vec2;
  color: string;
  intensity: number;
}

export interface HitGlow {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface SplitParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  startTime: number;
  duration: number;
}

export interface RayCastResult {
  segments: LightSegment[];
  receivedIntensity: number;
  hitGlows: HitGlow[];
  splitParticles: SplitParticle[];
}

interface Mirror {
  x: number;
  y: number;
  angle: number;
  length: number;
}

interface Prism {
  x: number;
  y: number;
  size: number;
  rotation: number;
  refractiveIndex: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BRIGHTNESS_THRESHOLD = 0.15;
const REFLECTION_LOSS = 0.10;
const REFRACTION_LOSS = 0.20;
const MAX_BOUNCES = 50;

export const WAVELENGTH_COLORS: Record<string, { color: string; refractBias: number }> = {
  white: { color: '#ffffff', refractBias: 0 },
  red: { color: '#ff4444', refractBias: -0.015 },
  green: { color: '#44ff44', refractBias: 0 },
  blue: { color: '#4477ff', refractBias: 0.015 },
};

const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function raySegmentIntersect(
  origin: Vec2,
  dir: Vec2,
  p1: Vec2,
  p2: Vec2
): { t: number; point: Vec2; normal: Vec2 } | null {
  const sx = p2.x - p1.x;
  const sy = p2.y - p1.y;
  const denom = dir.x * sy - dir.y * sx;
  if (Math.abs(denom) < 1e-8) return null;

  const dx = p1.x - origin.x;
  const dy = p1.y - origin.y;
  const t = (dx * sy - dy * sx) / denom;
  const u = (dx * dir.y - dy * dir.x) / denom;

  if (t > 0.0001 && u >= 0 && u <= 1) {
    const point = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
    const normal = normalize({ x: -sy, y: sx });
    if (normal.x * dir.x + normal.y * dir.y > 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }
    return { t, point, normal };
  }
  return null;
}

function rayRectIntersect(
  origin: Vec2,
  dir: Vec2,
  rect: Obstacle
): { t: number; point: Vec2; normal: Vec2 } | null {
  const { x, y, width, height } = rect;
  const edges: Array<[Vec2, Vec2]> = [
    [{ x, y }, { x: x + width, y }],
    [{ x: x + width, y }, { x: x + width, y: y + height }],
    [{ x: x + width, y: y + height }, { x, y: y + height }],
    [{ x, y: y + height }, { x, y }],
  ];
  let best: { t: number; point: Vec2; normal: Vec2 } | null = null;
  for (const [a, b] of edges) {
    const hit = raySegmentIntersect(origin, dir, a, b);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best;
}

function getMirrorEndpoints(m: Mirror): [Vec2, Vec2] {
  const half = m.length / 2;
  const rad = degToRad(m.angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    { x: m.x - cos * half, y: m.y - sin * half },
    { x: m.x + cos * half, y: m.y + sin * half },
  ];
}

function getPrismVertices(p: Prism): [Vec2, Vec2, Vec2] {
  const s = p.size / 2;
  const rad = degToRad(p.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const base = [
    { x: 0, y: -s * 1.1547 },
    { x: s, y: s * 0.5774 },
    { x: -s, y: s * 0.5774 },
  ];
  return base.map((v) => ({
    x: p.x + v.x * cos - v.y * sin,
    y: p.y + v.x * sin + v.y * cos,
  })) as [Vec2, Vec2, Vec2];
}

function rayTriangleIntersect(
  origin: Vec2,
  dir: Vec2,
  tri: [Vec2, Vec2, Vec2]
): { t: number; point: Vec2; normal: Vec2; edgeIndex: number } | null {
  let best: { t: number; point: Vec2; normal: Vec2; edgeIndex: number } | null = null;
  for (let i = 0; i < 3; i++) {
    const a = tri[i];
    const b = tri[(i + 1) % 3];
    const hit = raySegmentIntersect(origin, dir, a, b);
    if (hit && (!best || hit.t < best.t)) {
      best = { ...hit, edgeIndex: i };
    }
  }
  return best;
}

interface Ray {
  origin: Vec2;
  dir: Vec2;
  intensity: number;
  colorKey: keyof typeof WAVELENGTH_COLORS;
  bounces: number;
  insidePrism: boolean;
  currentPrismRefractive: number;
}

export function castRays(
  canvasWidth: number,
  canvasHeight: number,
  lightSource: { x: number; y: number; angle: number },
  receiver: { x: number; y: number },
  mirrors: Mirror[],
  prisms: Prism[],
  obstacles: Obstacle[],
  nowTime: number
): RayCastResult {
  const segments: LightSegment[] = [];
  const hitGlows: HitGlow[] = [];
  const splitParticles: SplitParticle[] = [];
  let receivedIntensity = 0;

  const initialDir = normalize({
    x: Math.cos(degToRad(lightSource.angle)),
    y: Math.sin(degToRad(lightSource.angle)),
  });

  const rays: Ray[] = [
    {
      origin: { x: lightSource.x, y: lightSource.y },
      dir: initialDir,
      intensity: 1.0,
      colorKey: 'white',
      bounces: 0,
      insidePrism: false,
      currentPrismRefractive: 1.0,
    },
  ];

  const receiverRadius = 20;

  while (rays.length > 0) {
    const ray = rays.shift()!;
    if (ray.bounces > MAX_BOUNCES || ray.intensity < BRIGHTNESS_THRESHOLD) continue;

    let closest: {
      t: number;
      point: Vec2;
      normal: Vec2;
      type: 'mirror' | 'prismIn' | 'prismOut' | 'obstacle' | 'receiver';
      data?: unknown;
    } | null = null;

    const maxDist = Math.hypot(canvasWidth, canvasHeight) * 2;
    let rayEnd = {
      x: ray.origin.x + ray.dir.x * maxDist,
      y: ray.origin.y + ray.dir.y * maxDist,
    };

    for (const m of mirrors) {
      const [a, b] = getMirrorEndpoints(m);
      const hit = raySegmentIntersect(ray.origin, ray.dir, a, b);
      if (hit && (!closest || hit.t < closest.t)) {
        closest = { ...hit, type: 'mirror' };
      }
    }

    for (const p of prisms) {
      const tri = getPrismVertices(p);
      const hit = rayTriangleIntersect(ray.origin, ray.dir, tri);
      if (hit && (!closest || hit.t < closest.t)) {
        const isEntering = !ray.insidePrism;
        closest = {
          t: hit.t,
          point: hit.point,
          normal: hit.normal,
          type: isEntering ? 'prismIn' : 'prismOut',
          data: { prism: p, edgeIndex: hit.edgeIndex, tri },
        };
      }
    }

    for (const o of obstacles) {
      const hit = rayRectIntersect(ray.origin, ray.dir, o);
      if (hit && (!closest || hit.t < closest.t)) {
        closest = { ...hit, type: 'obstacle' };
      }
    }

    const toReceiver = { x: receiver.x - ray.origin.x, y: receiver.y - ray.origin.y };
    const proj = toReceiver.x * ray.dir.x + toReceiver.y * ray.dir.y;
    if (proj > 0) {
      const closestPt = {
        x: ray.origin.x + ray.dir.x * proj,
        y: ray.origin.y + ray.dir.y * proj,
      };
      const distToCenter = Math.hypot(closestPt.x - receiver.x, closestPt.y - receiver.y);
      if (distToCenter < receiverRadius) {
        const d2 = receiverRadius * receiverRadius - distToCenter * distToCenter;
        const d = d2 > 0 ? Math.sqrt(d2) : 0;
        const t = proj - d;
        if (t > 0.0001 && (!closest || t < closest.t)) {
          closest = {
            t,
            point: { x: ray.origin.x + ray.dir.x * t, y: ray.origin.y + ray.dir.y * t },
            normal: { x: 0, y: 0 },
            type: 'receiver',
          };
        }
      }
    }

    if (closest) {
      rayEnd = closest.point;
      segments.push({
        from: { ...ray.origin },
        to: { ...rayEnd },
        color: WAVELENGTH_COLORS[ray.colorKey].color,
        intensity: ray.intensity,
      });

      if (closest.type === 'mirror') {
        hitGlows.push({
          x: closest.point.x,
          y: closest.point.y,
          startTime: nowTime,
          duration: 200,
        });
        const dot = ray.dir.x * closest.normal.x + ray.dir.y * closest.normal.y;
        const reflectDir = normalize({
          x: ray.dir.x - 2 * dot * closest.normal.x,
          y: ray.dir.y - 2 * dot * closest.normal.y,
        });
        rays.push({
          origin: { x: closest.point.x + reflectDir.x * 0.5, y: closest.point.y + reflectDir.y * 0.5 },
          dir: reflectDir,
          intensity: ray.intensity * (1 - REFLECTION_LOSS),
          colorKey: ray.colorKey,
          bounces: ray.bounces + 1,
          insidePrism: false,
          currentPrismRefractive: 1.0,
        });
      } else if (closest.type === 'obstacle') {
        hitGlows.push({
          x: closest.point.x,
          y: closest.point.y,
          startTime: nowTime,
          duration: 200,
        });
      } else if (closest.type === 'receiver') {
        receivedIntensity += ray.intensity;
      } else if (closest.type === 'prismIn' || closest.type === 'prismOut') {
        const prismData = closest.data as { prism: Prism; edgeIndex: number; tri: [Vec2, Vec2, Vec2] };
        const prism = prismData.prism;
        const n1 = ray.insidePrism ? prism.refractiveIndex : 1.0;
        const n2 = ray.insidePrism ? 1.0 : prism.refractiveIndex;
        const wasWhite = ray.colorKey === 'white';
        const isEntering = closest.type === 'prismIn';

        const colorKeysToSpawn: Array<keyof typeof WAVELENGTH_COLORS> = [];
        if (wasWhite && !isEntering) {
          colorKeysToSpawn.push('red', 'green', 'blue');
          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 50;
            splitParticles.push({
              x: closest.point.x,
              y: closest.point.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: ['#ff4444', '#44ff44', '#4477ff'][Math.floor(Math.random() * 3)],
              size: 2 + Math.random() * 2,
              startTime: nowTime,
              duration: 500,
            });
          }
        } else {
          colorKeysToSpawn.push(ray.colorKey);
        }

        for (const ck of colorKeysToSpawn) {
          const bias = WAVELENGTH_COLORS[ck].refractBias;
          const effN1 = n1;
          const effN2 = n2 * (1 + bias);
          const ratio = effN1 / effN2;

          const cosI = -(ray.dir.x * closest.normal.x + ray.dir.y * closest.normal.y);
          const sinI2 = 1 - cosI * cosI;
          const sinT2 = ratio * ratio * sinI2;

          let refractDir: Vec2 | null = null;
          if (sinT2 <= 1) {
            const cosT = Math.sqrt(1 - sinT2);
            refractDir = normalize({
              x: ratio * ray.dir.x + (ratio * cosI - cosT) * closest.normal.x,
              y: ratio * ray.dir.y + (ratio * cosI - cosT) * closest.normal.y,
            });
          } else {
            const dot = ray.dir.x * closest.normal.x + ray.dir.y * closest.normal.y;
            refractDir = normalize({
              x: ray.dir.x - 2 * dot * closest.normal.x,
              y: ray.dir.y - 2 * dot * closest.normal.y,
            });
          }

          const newIntensity = ray.intensity * (1 - REFRACTION_LOSS) * (wasWhite && !isEntering ? 1 / 3 : 1);

          rays.push({
            origin: {
              x: closest.point.x + refractDir.x * 0.8,
              y: closest.point.y + refractDir.y * 0.8,
            },
            dir: refractDir,
            intensity: newIntensity,
            colorKey: ck,
            bounces: ray.bounces + 1,
            insidePrism: isEntering,
            currentPrismRefractive: isEntering ? prism.refractiveIndex : 1.0,
          });
        }
      }
    } else {
      segments.push({
        from: { ...ray.origin },
        to: rayEnd,
        color: WAVELENGTH_COLORS[ray.colorKey].color,
        intensity: ray.intensity,
      });
    }
  }

  return { segments, receivedIntensity, hitGlows, splitParticles };
}

export { getMirrorEndpoints, getPrismVertices };
