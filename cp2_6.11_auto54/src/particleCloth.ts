import * as THREE from 'three';
import { EmotionWord } from './textParser';

export enum ClothMode {
  Cloak = 1,
  Robe = 2,
  Armor = 3,
}

interface BodySegment {
  center: [number, number, number];
  radii: [number, number, number];
  rotation?: [number, number, number];
  weight: number;
  name: string;
}

const MALE_BODY: BodySegment[] = [
  { name: 'head', center: [0, 1.62, 0], radii: [0.095, 0.105, 0.10], weight: 0.05 },
  { name: 'neck', center: [0, 1.49, 0], radii: [0.045, 0.04, 0.04], weight: 0.02 },
  { name: 'chest', center: [0, 1.30, 0], radii: [0.21, 0.16, 0.13], weight: 0.14 },
  { name: 'abdomen', center: [0, 1.08, 0], radii: [0.18, 0.12, 0.12], weight: 0.09 },
  { name: 'hip', center: [0, 0.92, 0], radii: [0.19, 0.08, 0.12], weight: 0.07 },
  { name: 'leftUpperArm', center: [-0.28, 1.28, 0], radii: [0.045, 0.14, 0.045], rotation: [0, 0, 0.12], weight: 0.05 },
  { name: 'rightUpperArm', center: [0.28, 1.28, 0], radii: [0.045, 0.14, 0.045], rotation: [0, 0, -0.12], weight: 0.05 },
  { name: 'leftForearm', center: [-0.32, 1.05, 0.02], radii: [0.038, 0.13, 0.038], rotation: [0, 0, 0.08], weight: 0.04 },
  { name: 'rightForearm', center: [0.32, 1.05, 0.02], radii: [0.038, 0.13, 0.038], rotation: [0, 0, -0.08], weight: 0.04 },
  { name: 'leftHand', center: [-0.36, 0.90, 0.03], radii: [0.03, 0.05, 0.02], weight: 0.015 },
  { name: 'rightHand', center: [0.36, 0.90, 0.03], radii: [0.03, 0.05, 0.02], weight: 0.015 },
  { name: 'leftThigh', center: [-0.09, 0.62, 0], radii: [0.075, 0.22, 0.075], weight: 0.08 },
  { name: 'rightThigh', center: [0.09, 0.62, 0], radii: [0.075, 0.22, 0.075], weight: 0.08 },
  { name: 'leftShin', center: [-0.09, 0.30, 0], radii: [0.052, 0.22, 0.052], weight: 0.06 },
  { name: 'rightShin', center: [0.09, 0.30, 0], radii: [0.052, 0.22, 0.052], weight: 0.06 },
  { name: 'leftFoot', center: [-0.09, 0.035, 0.04], radii: [0.04, 0.03, 0.08], weight: 0.02 },
  { name: 'rightFoot', center: [0.09, 0.035, 0.04], radii: [0.04, 0.03, 0.08], weight: 0.02 },
];

const FEMALE_BODY: BodySegment[] = [
  { name: 'head', center: [0, 1.55, 0], radii: [0.090, 0.100, 0.095], weight: 0.05 },
  { name: 'neck', center: [0, 1.43, 0], radii: [0.038, 0.035, 0.038], weight: 0.02 },
  { name: 'chest', center: [0, 1.25, 0], radii: [0.185, 0.15, 0.12], weight: 0.13 },
  { name: 'abdomen', center: [0, 1.05, 0], radii: [0.155, 0.11, 0.11], weight: 0.08 },
  { name: 'hip', center: [0, 0.90, 0], radii: [0.20, 0.08, 0.13], weight: 0.08 },
  { name: 'leftUpperArm', center: [-0.25, 1.22, 0], radii: [0.040, 0.13, 0.040], rotation: [0, 0, 0.12], weight: 0.05 },
  { name: 'rightUpperArm', center: [0.25, 1.22, 0], radii: [0.040, 0.13, 0.040], rotation: [0, 0, -0.12], weight: 0.05 },
  { name: 'leftForearm', center: [-0.29, 1.00, 0.02], radii: [0.033, 0.12, 0.033], rotation: [0, 0, 0.08], weight: 0.04 },
  { name: 'rightForearm', center: [0.29, 1.00, 0.02], radii: [0.033, 0.12, 0.033], rotation: [0, 0, -0.08], weight: 0.04 },
  { name: 'leftHand', center: [-0.33, 0.86, 0.03], radii: [0.025, 0.045, 0.018], weight: 0.015 },
  { name: 'rightHand', center: [0.33, 0.86, 0.03], radii: [0.025, 0.045, 0.018], weight: 0.015 },
  { name: 'leftThigh', center: [-0.09, 0.60, 0], radii: [0.068, 0.21, 0.068], weight: 0.08 },
  { name: 'rightThigh', center: [0.09, 0.60, 0], radii: [0.068, 0.21, 0.068], weight: 0.08 },
  { name: 'leftShin', center: [-0.09, 0.29, 0], radii: [0.048, 0.21, 0.048], weight: 0.06 },
  { name: 'rightShin', center: [0.09, 0.29, 0], radii: [0.048, 0.21, 0.048], weight: 0.06 },
  { name: 'leftFoot', center: [-0.09, 0.033, 0.035], radii: [0.035, 0.025, 0.07], weight: 0.02 },
  { name: 'rightFoot', center: [0.09, 0.033, 0.035], radii: [0.035, 0.025, 0.07], weight: 0.02 },
];

interface ParticleInfo {
  segmentIndex: number;
  segmentName: string;
  randomSeed: number;
  emotionIndex: number;
}

const SHOULDER_CENTER = new THREE.Vector3(0, 1.35, 0);
const WAIST_Y = 0.92;
const ARMOR_ZONES = new Set([
  'chest', 'abdomen', 'leftUpperArm', 'rightUpperArm',
  'leftForearm', 'rightForearm', 'leftThigh', 'rightThigh',
  'leftShin', 'rightShin',
]);

const vertexShader = `
attribute float aSize;
attribute vec3 aColor;
attribute float aOpacity;

varying vec3 vColor;
varying float vOpacity;

uniform float uScale;

void main() {
  vColor = aColor;
  vOpacity = aOpacity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / (-mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vOpacity;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  float glow = 1.0 - dist * 2.0;
  glow = pow(glow, 1.5);
  gl_FragColor = vec4(vColor * glow, vOpacity * glow);
}
`;

function sampleEllipsoidSurface(
  center: [number, number, number],
  radii: [number, number, number],
  rotation: [number, number, number] | undefined,
  count: number
): { positions: Float32Array; normals: Float32Array } {
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const euler = rotation ? new THREE.Euler(rotation[0], rotation[1], rotation[2]) : null;

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);

    let px = nx * radii[0];
    let py = ny * radii[1];
    let pz = nz * radii[2];

    let nnx = nx / (radii[0] * radii[0]);
    let nny = ny / (radii[1] * radii[1]);
    let nnz = nz / (radii[2] * radii[2]);
    const nLen = Math.sqrt(nnx * nnx + nny * nny + nnz * nnz);
    nnx /= nLen; nny /= nLen; nnz /= nLen;

    if (euler) {
      const v = new THREE.Vector3(px, py, pz).applyEuler(euler);
      px = v.x; py = v.y; pz = v.z;
      const n = new THREE.Vector3(nnx, nny, nnz).applyEuler(euler);
      nnx = n.x; nny = n.y; nnz = n.z;
    }

    positions[i * 3] = px + center[0];
    positions[i * 3 + 1] = py + center[1];
    positions[i * 3 + 2] = pz + center[2];
    normals[i * 3] = nnx;
    normals[i * 3 + 1] = nny;
    normals[i * 3 + 2] = nnz;
  }

  return { positions, normals };
}

function computeTangents(normals: Float32Array, count: number): Float32Array {
  const tangents = new Float32Array(count * 6);
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < count; i++) {
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    const normal = new THREE.Vector3(nx, ny, nz);

    let t1 = new THREE.Vector3().crossVectors(normal, up);
    if (t1.lengthSq() < 0.0001) {
      t1 = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(1, 0, 0));
    }
    t1.normalize();
    const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize();

    tangents[i * 6] = t1.x;
    tangents[i * 6 + 1] = t1.y;
    tangents[i * 6 + 2] = t1.z;
    tangents[i * 6 + 3] = t2.x;
    tangents[i * 6 + 4] = t2.y;
    tangents[i * 6 + 5] = t2.z;
  }

  return tangents;
}

export class ParticleCloth {
  readonly particleCount: number;
  readonly group: THREE.Group;

  private geometry: THREE.BufferGeometry;
  private trailGeometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private trailMaterial: THREE.ShaderMaterial;
  private points: THREE.Points;
  private trailPoints: THREE.Points;

  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private normals: Float32Array;
  private tangents: Float32Array;
  private colors: Float32Array;
  private opacities: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;
  private randomSeeds: Float32Array;
  private particleInfos: ParticleInfo[];

  private trailPositions: Float32Array;
  private trailOpacities: Float32Array;
  private trailColors: Float32Array;
  private trailSizes: Float32Array;
  private prevPositions: Float32Array[];
  private trailFade: number = 0;

  private mode: ClothMode = ClothMode.Cloak;
  private emotions: EmotionWord[] = [];
  private emotionAssignments: Int8Array;
  private bodyBounds: { min: THREE.Vector3; max: THREE.Vector3 };

  private time: number = 0;

  constructor(particleCount: number, gender: 'male' | 'female' = 'male') {
    this.particleCount = particleCount;
    this.group = new THREE.Group();
    this.emotionAssignments = new Int8Array(particleCount).fill(-1);

    const bodyDef = gender === 'male' ? MALE_BODY : FEMALE_BODY;
    const totalWeight = bodyDef.reduce((s, seg) => s + seg.weight, 0);

    const allPositions: number[] = [];
    const allNormals: number[] = [];
    const allInfos: ParticleInfo[] = [];

    for (let si = 0; si < bodyDef.length; si++) {
      const seg = bodyDef[si];
      const count = Math.max(1, Math.round(particleCount * seg.weight / totalWeight));
      const { positions, normals } = sampleEllipsoidSurface(seg.center, seg.radii, seg.rotation, count);

      for (let i = 0; i < count; i++) {
        const offset = 0.003 + Math.random() * 0.005;
        allPositions.push(
          positions[i * 3] + normals[i * 3] * offset,
          positions[i * 3 + 1] + normals[i * 3 + 1] * offset,
          positions[i * 3 + 2] + normals[i * 3 + 2] * offset
        );
        allNormals.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
        allInfos.push({
          segmentIndex: si,
          segmentName: seg.name,
          randomSeed: Math.random(),
          emotionIndex: -1,
        });
      }
    }

    while (allPositions.length / 3 < particleCount) {
      const seg = bodyDef[Math.floor(Math.random() * bodyDef.length)];
      const { positions, normals } = sampleEllipsoidSurface(seg.center, seg.radii, seg.rotation, 1);
      const offset = 0.003 + Math.random() * 0.005;
      allPositions.push(
        positions[0] + normals[0] * offset,
        positions[1] + normals[1] * offset,
        positions[2] + normals[2] * offset
      );
      allNormals.push(normals[0], normals[1], normals[2]);
      allInfos.push({
        segmentIndex: bodyDef.indexOf(seg),
        segmentName: seg.name,
        randomSeed: Math.random(),
        emotionIndex: -1,
      });
    }

    const actualCount = Math.min(particleCount, allPositions.length / 3);
    this.basePositions = new Float32Array(allPositions.slice(0, actualCount * 3));
    this.currentPositions = new Float32Array(this.basePositions);
    this.normals = new Float32Array(allNormals.slice(0, actualCount * 3));
    this.tangents = computeTangents(this.normals, actualCount);
    this.particleInfos = allInfos.slice(0, actualCount);

    this.randomSeeds = new Float32Array(actualCount);
    this.baseSizes = new Float32Array(actualCount);
    this.sizes = new Float32Array(actualCount);
    this.colors = new Float32Array(actualCount * 3);
    this.opacities = new Float32Array(actualCount);

    this.bodyBounds = {
      min: new THREE.Vector3(Infinity, Infinity, Infinity),
      max: new THREE.Vector3(-Infinity, -Infinity, -Infinity),
    };

    for (let i = 0; i < actualCount; i++) {
      this.randomSeeds[i] = Math.random();
      this.baseSizes[i] = 0.012 + Math.random() * 0.010;
      this.sizes[i] = this.baseSizes[i];
      this.opacities[i] = 0.6 + Math.random() * 0.4;

      const y = this.basePositions[i * 3 + 1];
      const normalizedY = y / 1.75;
      const t = normalizedY;
      this.colors[i * 3] = 0.4 + t * 0.6;
      this.colors[i * 3 + 1] = 0.99 - t * 0.7;
      this.colors[i * 3 + 2] = 0.95 - t * 0.55;

      const px = this.basePositions[i * 3];
      const py = this.basePositions[i * 3 + 1];
      const pz = this.basePositions[i * 3 + 2];
      this.bodyBounds.min.min(new THREE.Vector3(px, py, pz));
      this.bodyBounds.max.max(new THREE.Vector3(px, py, pz));
    }

    this.prevPositions = [];
    for (let f = 0; f < 6; f++) {
      this.prevPositions.push(new Float32Array(this.basePositions));
    }

    this.trailPositions = new Float32Array(actualCount * 3);
    this.trailOpacities = new Float32Array(actualCount);
    this.trailColors = new Float32Array(actualCount * 3);
    this.trailSizes = new Float32Array(actualCount);
    for (let i = 0; i < actualCount; i++) {
      this.trailOpacities[i] = 0;
      this.trailSizes[i] = this.baseSizes[i] * 1.5;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('aColor', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.trailSizes, 1));
    this.trailGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.trailOpacities, 1));

    const fov = 60;
    const scale = (typeof window !== 'undefined' ? window.innerHeight : 1000) / (2 * Math.tan(fov * Math.PI / 360));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uScale: { value: scale } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uScale: { value: scale } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trailPoints.visible = false;

    this.group.add(this.points);
    this.group.add(this.trailPoints);
  }

  getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    return this.bodyBounds;
  }

  setMode(mode: ClothMode): void {
    this.mode = mode;
  }

  getMode(): ClothMode {
    return this.mode;
  }

  applyEmotion(emotions: EmotionWord[]): void {
    this.emotions = emotions;
    this.emotionAssignments.fill(-1);

    for (let ei = 0; ei < emotions.length; ei++) {
      const emotion = emotions[ei];
      const particlesPerWord = Math.min(5, Math.max(2, Math.floor(2 + emotion.intensity * 3)));
      let assigned = 0;
      let attempts = 0;
      while (assigned < particlesPerWord && attempts < this.particleCount * 2) {
        const idx = Math.floor(Math.random() * this.particleCount);
        if (this.emotionAssignments[idx] === -1) {
          this.emotionAssignments[idx] = ei;
          this.particleInfos[idx].emotionIndex = ei;
          assigned++;
        }
        attempts++;
      }
    }

    this.updateEmotionColors();
  }

  private updateEmotionColors(): void {
    const posColor = new THREE.Color('#FF6B6B');
    const posColor2 = new THREE.Color('#FFD93D');
    const negColor = new THREE.Color('#6BCB77');
    const negColor2 = new THREE.Color('#4D96FF');
    const neuColor = new THREE.Color('#E0E0E0');

    for (let i = 0; i < this.particleCount; i++) {
      const ei = this.emotionAssignments[i];
      if (ei >= 0 && ei < this.emotions.length) {
        const emotion = this.emotions[ei];
        const intensity = emotion.intensity;
        let color: THREE.Color;
        if (emotion.sentiment === 'positive') {
          color = posColor.clone().lerp(posColor2, intensity);
        } else if (emotion.sentiment === 'negative') {
          color = negColor.clone().lerp(negColor2, intensity);
        } else {
          color = neuColor.clone();
        }
        this.colors[i * 3] = color.r;
        this.colors[i * 3 + 1] = color.g;
        this.colors[i * 3 + 2] = color.b;
      }
    }
  }

  update(deltaTime: number, rotationDeltaMag: number): void {
    this.time += deltaTime;

    for (let i = 0; i < this.particleCount; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];
      const nx = this.normals[i * 3];
      const ny = this.normals[i * 3 + 1];
      const nz = this.normals[i * 3 + 2];
      const t1x = this.tangents[i * 6];
      const t1y = this.tangents[i * 6 + 1];
      const t1z = this.tangents[i * 6 + 2];
      const t2x = this.tangents[i * 6 + 3];
      const t2y = this.tangents[i * 6 + 4];
      const t2z = this.tangents[i * 6 + 5];
      const seed = this.randomSeeds[i];
      const info = this.particleInfos[i];

      let offX = 0, offY = 0, offZ = 0;
      let targetOpacity = 0.6 + seed * 0.4;
      let targetSize = this.baseSizes[i];

      switch (this.mode) {
        case ClothMode.Cloak:
          ({ offX, offY, offZ, targetOpacity } = this.computeCloakOffset(
            bx, by, bz, nx, ny, nz, seed, info.segmentName, this.time
          ));
          break;
        case ClothMode.Robe:
          ({ offX, offY, offZ, targetOpacity } = this.computeRobeOffset(
            bx, by, bz, nx, ny, nz, t1x, t1y, t1z, t2x, t2y, t2z, seed, this.time
          ));
          break;
        case ClothMode.Armor:
          ({ offX, offY, offZ, targetOpacity, targetSize } = this.computeArmorOffset(
            bx, by, bz, nx, ny, nz, seed, info.segmentName, this.time, this.baseSizes[i]
          ));
          break;
      }

      const ei = this.emotionAssignments[i];
      if (ei >= 0 && ei < this.emotions.length) {
        const emotion = this.emotions[ei];
        const emotionOff = this.computeEmotionOffset(
          nx, ny, nz, t1x, t1y, t1z, t2x, t2y, t2z, seed, emotion, this.time
        );
        offX += emotionOff.ox;
        offY += emotionOff.oy;
        offZ += emotionOff.oz;
      }

      const targetX = bx + offX;
      const targetY = by + offY;
      const targetZ = bz + offZ;

      const lerp = Math.min(1, deltaTime * 5);
      this.currentPositions[i * 3] += (targetX - this.currentPositions[i * 3]) * lerp;
      this.currentPositions[i * 3 + 1] += (targetY - this.currentPositions[i * 3 + 1]) * lerp;
      this.currentPositions[i * 3 + 2] += (targetZ - this.currentPositions[i * 3 + 2]) * lerp;
      this.opacities[i] += (targetOpacity - this.opacities[i]) * lerp;
      this.sizes[i] += (targetSize - this.sizes[i]) * lerp;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;

    this.updateTrail(rotationDeltaMag, deltaTime);
  }

  private computeCloakOffset(
    bx: number, by: number, bz: number,
    nx: number, ny: number, nz: number,
    seed: number, segmentName: string, time: number
  ): { offX: number; offY: number; offZ: number; targetOpacity: number } {
    const dx = bx - SHOULDER_CENTER.x;
    const dy = by - SHOULDER_CENTER.y;
    const dz = bz - SHOULDER_CENTER.z;
    const distToShoulder = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dirX = distToShoulder > 0.001 ? dx / distToShoulder : nx;
    const dirY = distToShoulder > 0.001 ? dy / distToShoulder : ny;
    const dirZ = distToShoulder > 0.001 ? dz / distToShoulder : nz;

    const isNearShoulder = ['chest', 'leftUpperArm', 'rightUpperArm', 'neck'].includes(segmentName) && distToShoulder < 0.35;

    if (isNearShoulder) {
      const R = 0.075 + seed * 0.075;
      const phase = time * 1.5 + seed * Math.PI * 2;
      const expansion = (Math.sin(phase) + 1) * 0.5;
      const offX = dirX * R * expansion;
      const offY = dirY * R * expansion + R * 0.3 * expansion * Math.sin(phase * 0.7);
      const offZ = dirZ * R * expansion;
      const targetOpacity = 1.0 - expansion * 0.4;
      return { offX, offY, offZ, targetOpacity };
    } else {
      const ripplePhase = time * 2.0 - distToShoulder * 5.0;
      const rippleAmp = Math.max(0, 0.02 * (1.0 - distToShoulder * 0.8));
      const offX = nx * Math.sin(ripplePhase) * rippleAmp;
      const offY = ny * Math.sin(ripplePhase) * rippleAmp;
      const offZ = nz * Math.sin(ripplePhase) * rippleAmp;
      return { offX, offY, offZ, targetOpacity: 0.6 + seed * 0.4 };
    }
  }

  private computeRobeOffset(
    bx: number, by: number, bz: number,
    nx: number, ny: number, nz: number,
    t1x: number, t1y: number, t1z: number,
    t2x: number, t2y: number, t2z: number,
    seed: number, time: number
  ): { offX: number; offY: number; offZ: number; targetOpacity: number } {
    const T = 3.0 + seed * 2.0;
    const omega = Math.PI * 2 / T;
    const theta = omega * time + seed * Math.PI * 2;
    const r = 0.03;
    const isBelowWaist = by < WAIST_Y;

    if (isBelowWaist) {
      const yRatio = (WAIST_Y - by) / WAIST_Y;
      const droopY = -0.05 * yRatio * yRatio;
      const side = bx > 0 ? 1 : -1;
      const spiralX = Math.cos(theta * side) * r * (1 + yRatio);
      const spiralY = Math.sin(theta * side * 0.5) * r * 0.5;
      const spiralZ = Math.sin(theta * side) * r * (1 + yRatio);
      const flareFactor = yRatio * yRatio * 0.15;
      const hDist = Math.sqrt(bx * bx + bz * bz);
      const flareDirX = hDist > 0.001 ? bx / hDist : 0;
      const flareDirZ = hDist > 0.001 ? bz / hDist : 0;
      const flare = flareFactor * (1 + Math.sin(theta * 0.5) * 0.3);
      return {
        offX: spiralX + flareDirX * flare,
        offY: droopY + spiralY,
        offZ: spiralZ + flareDirZ * flare,
        targetOpacity: 0.7 + seed * 0.3,
      };
    } else {
      const side = bx > 0 ? 1 : -1;
      return {
        offX: Math.cos(theta * side) * r * 0.5,
        offY: Math.sin(theta) * r * 0.3,
        offZ: Math.sin(theta * side) * r * 0.5,
        targetOpacity: 0.6 + seed * 0.4,
      };
    }
  }

  private computeArmorOffset(
    bx: number, by: number, bz: number,
    nx: number, ny: number, nz: number,
    seed: number, segmentName: string, time: number, baseSize: number
  ): { offX: number; offY: number; offZ: number; targetOpacity: number; targetSize: number } {
    if (ARMOR_ZONES.has(segmentName)) {
      const shrink = 0.3 + Math.sin(time * 2.0 + seed * 6.28) * 0.1;
      const jitterX = Math.sin(time * 8 + seed * 100) * 0.002;
      const jitterY = Math.cos(time * 7 + seed * 200) * 0.002;
      const jitterZ = Math.sin(time * 9 + seed * 300) * 0.002;
      return {
        offX: -nx * shrink * 0.01 + jitterX,
        offY: -ny * shrink * 0.01 + jitterY,
        offZ: -nz * shrink * 0.01 + jitterZ,
        targetOpacity: 0.9 + Math.sin(time * 3) * 0.1,
        targetSize: baseSize * 1.3,
      };
    } else {
      const fieldThick = 0.025 + seed * 0.025;
      const pulsePhase = time * 1.5 + seed * Math.PI * 2;
      return {
        offX: nx * (fieldThick + Math.sin(pulsePhase) * 0.01),
        offY: ny * (fieldThick + Math.sin(pulsePhase) * 0.01),
        offZ: nz * (fieldThick + Math.sin(pulsePhase) * 0.01),
        targetOpacity: 0.15 + Math.sin(pulsePhase) * 0.1,
        targetSize: baseSize * 2.0,
      };
    }
  }

  private computeEmotionOffset(
    nx: number, ny: number, nz: number,
    t1x: number, t1y: number, t1z: number,
    t2x: number, t2y: number, t2z: number,
    seed: number, emotion: EmotionWord, time: number
  ): { ox: number; oy: number; oz: number } {
    const v = 0.5 + emotion.intensity * 1.5;
    const kappa = emotion.intensity * Math.PI;
    const f = 0.5 + emotion.rhythm * 2.0;
    const phase = time * v + seed * Math.PI * 2;
    const angle = kappa * phase;
    const flowScale = 0.02;
    const ox = (t1x * Math.cos(angle) + t2x * Math.sin(angle)) * flowScale;
    const oy = (t1y * Math.cos(angle) + t2y * Math.sin(angle)) * flowScale;
    const oz = (t1z * Math.cos(angle) + t2z * Math.sin(angle)) * flowScale;
    const pulse = Math.sin(time * f * Math.PI * 2) * 0.005 * emotion.intensity;
    return { ox: ox + nx * pulse, oy: oy + ny * pulse, oz: oz + nz * pulse };
  }

  private updateTrail(rotationDeltaMag: number, deltaTime: number): void {
    this.prevPositions.push(new Float32Array(this.currentPositions));
    if (this.prevPositions.length > 6) {
      this.prevPositions.shift();
    }

    if (rotationDeltaMag > 0.002) {
      this.trailFade = 1.0;
    } else {
      this.trailFade *= Math.pow(0.05, deltaTime);
      if (this.trailFade < 0.01) {
        this.trailPoints.visible = false;
        return;
      }
    }

    if (this.prevPositions.length < 4) return;

    const prevFrame = this.prevPositions[this.prevPositions.length - 4];
    this.trailPoints.visible = true;

    for (let i = 0; i < this.particleCount; i++) {
      this.trailPositions[i * 3] = prevFrame[i * 3];
      this.trailPositions[i * 3 + 1] = prevFrame[i * 3 + 1];
      this.trailPositions[i * 3 + 2] = prevFrame[i * 3 + 2];
      this.trailColors[i * 3] = this.colors[i * 3];
      this.trailColors[i * 3 + 1] = this.colors[i * 3 + 1];
      this.trailColors[i * 3 + 2] = this.colors[i * 3 + 2];
      this.trailOpacities[i] = this.opacities[i] * this.trailFade * 0.4;
      this.trailSizes[i] = this.sizes[i] * 1.5;
    }

    (this.trailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  updateScale(viewportHeight: number, fov: number): void {
    const scale = viewportHeight / (2 * Math.tan(fov * Math.PI / 360));
    this.material.uniforms.uScale.value = scale;
    this.trailMaterial.uniforms.uScale.value = scale;
  }

  getSnapshot(): { positions: Float32Array; colors: Float32Array; opacities: Float32Array } {
    return {
      positions: new Float32Array(this.currentPositions),
      colors: new Float32Array(this.colors),
      opacities: new Float32Array(this.opacities),
    };
  }

  setPositions(positions: Float32Array): void {
    this.currentPositions.set(positions);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  setColors(colors: Float32Array): void {
    this.colors.set(colors);
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
  }

  setOpacities(opacities: Float32Array): void {
    this.opacities.set(opacities);
    (this.geometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}
