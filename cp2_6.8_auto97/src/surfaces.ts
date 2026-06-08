import * as THREE from 'three';

export type SurfaceType = 'mobius' | 'klein' | 'roman' | 'custom';

export interface SurfaceParamsMap {
  mobius: { radius: number; twist: number; resolution: number };
  klein: { radius: number; tube: number; resolution: number };
  roman: { size: number; resolution: number; distortion: number };
  custom: { a: number; b: number; c: number };
}

export const DEFAULT_PARAMS: SurfaceParamsMap = {
  mobius: { radius: 2, twist: 0.5, resolution: 80 },
  klein: { radius: 2, tube: 0.8, resolution: 64 },
  roman: { size: 1.5, resolution: 80, distortion: 1.0 },
  custom: { a: 2, b: 2, c: 1.5 },
};

const GRADIENT_COLORS = [
  new THREE.Color('#FF6B6B'),
  new THREE.Color('#4ECDC4'),
  new THREE.Color('#45B7D1'),
];

function lerpColor(t: number): THREE.Color {
  const tt = ((t % 1) + 1) % 1;
  const scaled = tt * (GRADIENT_COLORS.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const c1 = GRADIENT_COLORS[i];
  const c2 = GRADIENT_COLORS[Math.min(i + 1, GRADIENT_COLORS.length - 1)];
  return c1.clone().lerp(c2, f);
}

function computeVertexCount(type: SurfaceType, params: SurfaceParamsMap[SurfaceType]): { uSeg: number; vSeg: number } {
  if (type === 'mobius') {
    const p = params as SurfaceParamsMap['mobius'];
    return { uSeg: Math.max(p.resolution, 60), vSeg: Math.max(Math.floor(p.resolution / 4), 15) };
  }
  if (type === 'klein') {
    const p = params as SurfaceParamsMap['klein'];
    return { uSeg: Math.max(p.resolution, 50), vSeg: Math.max(p.resolution, 50) };
  }
  if (type === 'roman') {
    const p = params as SurfaceParamsMap['roman'];
    return { uSeg: Math.max(p.resolution, 60), vSeg: Math.max(p.resolution, 60) };
  }
  return { uSeg: 100, vSeg: 60 };
}

function sampleMobius(u: number, v: number, radius: number, twist: number): THREE.Vector3 {
  const t = u * Math.PI * 2;
  const s = (v - 0.5) * 2;
  const phi = t * twist;
  const cosT = Math.cos(t);
  const sinT = Math.sin(t);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const r = radius + s * 0.5 * cosPhi;
  return new THREE.Vector3(r * cosT, r * sinT, s * 0.5 * sinPhi);
}

function sampleKlein(u: number, v: number, radius: number, tube: number): THREE.Vector3 {
  const t = u * Math.PI * 2;
  const s = v * Math.PI * 2;
  const cosT = Math.cos(t);
  const sinT = Math.sin(t);
  const cosS = Math.cos(s);
  const sinS = Math.sin(s);

  let x: number, y: number, z: number;
  if (t < Math.PI) {
    x = 3 * cosT * (1 + sinT) + radius * cosT * cosS;
    z = -8 * sinT - radius * sinT * cosS;
  } else {
    x = 3 * cosT * (1 + sinT) + radius * cosS * (1 + Math.PI - t);
    z = -8 * sinT;
  }
  y = radius * sinS;
  return new THREE.Vector3(x * 0.35, y * 0.5, z * 0.35);
}

function sampleRoman(u: number, v: number, size: number, distortion: number): THREE.Vector3 {
  const theta = u * Math.PI;
  const phi = v * Math.PI * 2;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  const x = size * sinT * sinT * cosP * sinP * distortion;
  const y = size * sinT * cosT * sinP * distortion;
  const z = size * sinT * sinT * cosP * cosP * distortion;
  return new THREE.Vector3(x, y, z).multiplyScalar(2);
}

function sampleCustom(u: number, v: number, a: number, b: number, c: number): THREE.Vector3 {
  const t = u * Math.PI * 2;
  const s = v * Math.PI * 2;
  const x = a * Math.cos(t) * (3 + Math.cos(s));
  const y = b * Math.sin(t) * (3 + Math.cos(s));
  const z = c * Math.sin(s);
  return new THREE.Vector3(x * 0.5, y * 0.5, z * 0.5);
}

function sampleSurface(
  type: SurfaceType,
  u: number,
  v: number,
  params: SurfaceParamsMap[SurfaceType]
): THREE.Vector3 {
  switch (type) {
    case 'mobius': {
      const p = params as SurfaceParamsMap['mobius'];
      return sampleMobius(u, v, p.radius, p.twist);
    }
    case 'klein': {
      const p = params as SurfaceParamsMap['klein'];
      return sampleKlein(u, v, p.radius, p.tube);
    }
    case 'roman': {
      const p = params as SurfaceParamsMap['roman'];
      return sampleRoman(u, v, p.size, p.distortion);
    }
    case 'custom': {
      const p = params as SurfaceParamsMap['custom'];
      return sampleCustom(u, v, p.a, p.b, p.c);
    }
  }
}

export function createSurfaceGeometry(
  type: SurfaceType,
  params: SurfaceParamsMap[SurfaceType]
): THREE.BufferGeometry {
  const { uSeg, vSeg } = computeVertexCount(type, params);
  const geometry = new THREE.BufferGeometry();
  const vertexCount = (uSeg + 1) * (vSeg + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  const points: THREE.Vector3[][] = [];
  for (let i = 0; i <= uSeg; i++) {
    points[i] = [];
    for (let j = 0; j <= vSeg; j++) {
      const u = i / uSeg;
      const v = j / vSeg;
      const p = sampleSurface(type, u, v, params);
      points[i][j] = p;
    }
  }

  let idx = 0;
  for (let i = 0; i <= uSeg; i++) {
    for (let j = 0; j <= vSeg; j++) {
      const p = points[i][j];
      positions[idx * 3] = p.x;
      positions[idx * 3 + 1] = p.y;
      positions[idx * 3 + 2] = p.z;

      const colorT = (i / uSeg + j / vSeg) * 0.5;
      const col = lerpColor(colorT);
      colors[idx * 3] = col.r;
      colors[idx * 3 + 1] = col.g;
      colors[idx * 3 + 2] = col.b;

      idx++;
    }
  }

  for (let i = 0; i < uSeg; i++) {
    for (let j = 0; j < vSeg; j++) {
      const a = i * (vSeg + 1) + j;
      const b = a + vSeg + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function updateSurfaceGeometry(
  geometry: THREE.BufferGeometry,
  type: SurfaceType,
  params: SurfaceParamsMap[SurfaceType],
  colorOffset: number = 0
): void {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  const positions = posAttr.array as Float32Array;
  const colors = colAttr.array as Float32Array;

  const { uSeg, vSeg } = computeVertexCount(type, params);

  const points: THREE.Vector3[][] = [];
  for (let i = 0; i <= uSeg; i++) {
    points[i] = [];
    for (let j = 0; j <= vSeg; j++) {
      const u = i / uSeg;
      const v = j / vSeg;
      points[i][j] = sampleSurface(type, u, v, params);
    }
  }

  let idx = 0;
  for (let i = 0; i <= uSeg; i++) {
    for (let j = 0; j <= vSeg; j++) {
      const p = points[i][j];
      positions[idx * 3] = p.x;
      positions[idx * 3 + 1] = p.y;
      positions[idx * 3 + 2] = p.z;

      const colorT = ((i / uSeg + j / vSeg) * 0.5 + colorOffset) % 1;
      const col = lerpColor(colorT);
      colors[idx * 3] = col.r;
      colors[idx * 3 + 1] = col.g;
      colors[idx * 3 + 2] = col.b;

      idx++;
    }
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}
