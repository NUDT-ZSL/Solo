import * as THREE from 'three';
import type { EmotionType, SentenceResult } from './emotionParser';
import { getEmotionColor, getEmotionSimilarity } from './emotionParser';

export interface StarObject {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  haloMesh: THREE.Mesh | null;
  light: THREE.PointLight;
  data: SentenceResult;
  baseScale: number;
  currentScale: number;
  targetScale: number;
  scaleAnimating: boolean;
  groupId: number;
  selected: boolean;
  hovered: boolean;
  haloPhase: number;
}

export interface StarSceneBuildResult {
  group: THREE.Group;
  stars: StarObject[];
  lineSegments: THREE.Line;
  dominantEmotion: EmotionType;
  emotionDistribution: { emotion: EmotionType; weight: number }[];
}

const GROUP_CENTERS: Record<EmotionType, THREE.Vector3> = {
  joy:     new THREE.Vector3( 9,  6,  4),
  calm:    new THREE.Vector3( 5, -2,  8),
  anxiety: new THREE.Vector3(-9,  3,  2),
  sadness: new THREE.Vector3(-6, -7, -3),
  anger:   new THREE.Vector3( 2,  8, -9)
};

function forceDirectedLayout(results: SentenceResult[]): THREE.Vector3[] {
  const n = results.length;
  const positions: THREE.Vector3[] = [];
  const minDist = 2.2;

  const emotionCounts: Record<string, number> = {};
  const emotionOffsets: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    const emo = results[i].emotion;
    const count = (emotionCounts[emo] || 0) + 1;
    emotionCounts[emo] = count;

    const center = GROUP_CENTERS[emo].clone();
    const jitter = 3.0;
    let px = center.x + (Math.random() - 0.5) * jitter;
    let py = center.y + (Math.random() - 0.5) * jitter;
    let pz = center.z + (Math.random() - 0.5) * jitter;

    if (count > 1) {
      const idx = (emotionOffsets[emo] || 0) + 1;
      emotionOffsets[emo] = idx;
      const angle = (idx / 8) * Math.PI * 2;
      const radius = 1.2 + Math.floor(idx / 8) * 0.9;
      px = center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.8;
      py = center.y + Math.sin(angle * 0.7) * radius * 0.7 + (Math.random() - 0.5) * 0.8;
      pz = center.z + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.8;
    }

    positions.push(new THREE.Vector3(px, py, pz));
  }

  const iterations = 120;
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const step = 0.08 * alpha + 0.008;

    for (let i = 0; i < n; i++) {
      const emoI = results[i].emotion;
      const center = GROUP_CENTERS[emoI];
      const toCenter = center.clone().sub(positions[i]);
      const centerDist = toCenter.length();
      if (centerDist > 0.01) {
        toCenter.normalize().multiplyScalar(Math.min(centerDist * 0.04, 0.5) * step * 8);
        positions[i].add(toCenter);
      }

      for (let j = i + 1; j < n; j++) {
        const delta = positions[i].clone().sub(positions[j]);
        const dist = delta.length();
        if (dist < 0.001) {
          delta.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
          delta.multiplyScalar(0.5);
        }
        const sim = getEmotionSimilarity(results[i].emotion, results[j].emotion);
        let minD = minDist;
        if (sim < 0.25) minD = 5.5;
        else if (sim < 0.5) minD = 4.0;
        else if (sim > 0.75) minD = 1.8;

        if (dist < minD) {
          const force = ((minD - dist) / minD) * step * 2.2;
          const nd = delta.normalize();
          positions[i].add(nd.clone().multiplyScalar(force));
          positions[j].add(nd.clone().multiplyScalar(-force));
        } else if (sim > 0.7 && dist < 6) {
          const force = ((dist - 3.0) / 3.0) * step * 0.8;
          const nd = delta.normalize();
          positions[i].add(nd.clone().multiplyScalar(-force));
          positions[j].add(nd.clone().multiplyScalar(force));
        }
      }
    }
  }

  const BOUND = 22;
  for (let i = 0; i < n; i++) {
    const p = positions[i];
    const d2 = p.lengthSq();
    if (d2 > BOUND * BOUND) {
      p.normalize().multiplyScalar(BOUND * 0.92);
    }
  }

  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const delta = positions[i].clone().sub(positions[j]);
        const dist = delta.length();
        const minD = minDist + 0.3;
        if (dist < minD && dist > 0.0001) {
          const push = (minD - dist) / 2 + 0.02;
          const nd = delta.normalize();
          positions[i].add(nd.clone().multiplyScalar(push));
          positions[j].add(nd.clone().multiplyScalar(-push));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return positions;
}

export function buildStarScene(results: SentenceResult[]): StarSceneBuildResult {
  const group = new THREE.Group();
  const stars: StarObject[] = [];

  const positions = results.length > 0 ? forceDirectedLayout(results) : [];

  const starGeo = new THREE.SphereGeometry(1, 40, 40);
  const glowGeo = new THREE.SphereGeometry(1, 32, 32);
  const haloGeo = new THREE.RingGeometry(1, 1.08, 64);

  const baseSizeMin = 0.5;
  const baseSizeMax = 2.0;
  const charMin = 2;
  const charMax = 60;

  const emotionDistAccum: Record<EmotionType, number> = {
    joy: 0, sadness: 0, anger: 0, calm: 0, anxiety: 0
  };
  let totalWeight = 0;

  for (let i = 0; i < results.length; i++) {
    const data = results[i];
    const pos = positions[i];
    const colHex = getEmotionColor(data.emotion);
    const color = new THREE.Color(colHex);

    const t = Math.max(0, Math.min(1, (data.charCount - charMin) / Math.max(1, charMax - charMin)));
    const baseSize = baseSizeMin + t * (baseSizeMax - baseSizeMin);
    const intensityBoost = 0.85 + data.intensity * 0.4;
    const scaledSize = baseSize * intensityBoost;

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.1 + data.intensity * 1.1,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.98
    });
    const mesh = new THREE.Mesh(starGeo, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(scaledSize);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    (mesh as unknown as { userData: { starIdx: number } }).userData = { starIdx: i };

    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.18 + data.intensity * 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.scale.setScalar(scaledSize * 1.9);
    mesh.add(glowMesh);

    const light = new THREE.PointLight(color, 0.6 + data.intensity * 0.9, scaledSize * 12 + 6, 1.8);
    light.position.set(0, 0, 0);
    mesh.add(light);

    for (const mix of data.mixedEmotions) {
      emotionDistAccum[mix.emotion] += mix.weight;
      totalWeight += mix.weight;
    }

    group.add(mesh);
    stars.push({
      mesh,
      glowMesh,
      haloMesh: null,
      light,
      data,
      baseScale: scaledSize,
      currentScale: scaledSize,
      targetScale: scaledSize,
      scaleAnimating: false,
      groupId: 0,
      selected: false,
      hovered: false,
      haloPhase: Math.random() * Math.PI * 2
    });

    void haloGeo;
  }

  const emotionDistribution: { emotion: EmotionType; weight: number }[] = [];
  if (totalWeight > 0) {
    for (const k of Object.keys(emotionDistAccum) as EmotionType[]) {
      const w = emotionDistAccum[k] / totalWeight;
      if (w > 0.03) emotionDistribution.push({ emotion: k, weight: w });
    }
    emotionDistribution.sort((a, b) => b.weight - a.weight);
  }
  const dominantEmotion: EmotionType = emotionDistribution[0]?.emotion ?? 'calm';

  const linePositions: number[] = [];
  const lineColors: number[] = [];
  const usedPairs: Set<string> = new Set();

  for (let i = 0; i < stars.length; i++) {
    const candidates: { j: number; sim: number; dist: number }[] = [];
    for (let j = 0; j < stars.length; j++) {
      if (i === j) continue;
      const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (usedPairs.has(pairKey)) continue;
      const sim = getEmotionSimilarity(stars[i].data.emotion, stars[j].data.emotion);
      const dist = stars[i].mesh.position.distanceTo(stars[j].mesh.position);
      if (sim >= 0.80 && dist < 11) {
        candidates.push({ j, sim, dist });
      }
    }
    candidates.sort((a, b) => b.sim - a.sim);
    const maxConn = 2;
    for (let k = 0; k < Math.min(maxConn, candidates.length); k++) {
      const c = candidates[k];
      const pairKey = i < c.j ? `${i}-${c.j}` : `${c.j}-${i}`;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const pi = stars[i].mesh.position;
      const pj = stars[c.j].mesh.position;
      const ci = new THREE.Color(getEmotionColor(stars[i].data.emotion));
      const cj = new THREE.Color(getEmotionColor(stars[c.j].data.emotion));
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const t1 = s / steps;
        const t2 = (s + 1) / steps;
        linePositions.push(
          pi.x + (pj.x - pi.x) * t1, pi.y + (pj.y - pi.y) * t1, pi.z + (pj.z - pi.z) * t1,
          pi.x + (pj.x - pi.x) * t2, pi.y + (pj.y - pi.y) * t2, pi.z + (pj.z - pi.z) * t2
        );
        const cr = ci.r + (cj.r - ci.r) * ((t1 + t2) / 2);
        const cg = ci.g + (cj.g - ci.g) * ((t1 + t2) / 2);
        const cb = ci.b + (cj.b - ci.b) * ((t1 + t2) / 2);
        const op = 0.25 + c.sim * 0.35;
        lineColors.push(cr * op, cg * op, cb * op, cr * op, cg * op, cb * op);
      }
    }
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    linewidth: 1
  });
  const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lineSegments);

  return { group, stars, lineSegments, dominantEmotion, emotionDistribution };
}

export function createHalo(star: StarObject, scene: THREE.Scene): void {
  if (star.haloMesh) return;
  const color = new THREE.Color(getEmotionColor(star.data.emotion));
  const haloRadius = star.baseScale * 1.55;
  const ringInner = haloRadius * 0.94;
  const ringOuter = haloRadius;
  const segCount = 80;
  const haloGeo = new THREE.RingGeometry(ringInner, ringOuter, segCount);
  const haloMat = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.copy(star.mesh.position);
  halo.lookAt(new THREE.Vector3(0, 0, 0));
  scene.add(halo);
  star.haloMesh = halo;
}

export function removeHalo(star: StarObject, scene: THREE.Scene): void {
  if (!star.haloMesh) return;
  scene.remove(star.haloMesh);
  star.haloMesh.geometry.dispose();
  (star.haloMesh.material as THREE.Material).dispose();
  star.haloMesh = null;
}
