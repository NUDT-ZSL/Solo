import type { Pipeline, CollisionPoint, Point3D, PipelineType } from '@/store/types';
import { PIPELINE_CONFIGS, SAFE_DISTANCE } from '@/store/types';

interface Segment {
  start: Point3D;
  end: Point3D;
  pipelineId: string;
  pipelineType: PipelineType;
  pipelineDepth: number;
  radius: number;
}

let collisionIdCounter = 0;
const genCollisionId = () => `col_${++collisionIdCounter}_${Date.now().toString(36)}`;

function sub(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(a: Point3D, s: number): Point3D {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function dot(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(a: Point3D): number {
  return Math.sqrt(dot(a, a));
}

function distance(a: Point3D, b: Point3D): number {
  return length(sub(a, b));
}

function segmentDistance(
  s1Start: Point3D,
  s1End: Point3D,
  s2Start: Point3D,
  s2End: Point3D
): { distance: number; closest1: Point3D; closest2: Point3D } {
  const u = sub(s1End, s1Start);
  const v = sub(s2End, s2Start);
  const w = sub(s1Start, s2Start);
  const a = dot(u, u);
  const b = dot(u, v);
  const c = dot(v, v);
  const d = dot(u, w);
  const e = dot(v, w);
  const denom = a * c - b * b;

  let s: number, t: number;

  if (denom < 1e-10) {
    s = 0.0;
    t = (b > c ? d / b : e / c);
  } else {
    s = (b * e - c * d) / denom;
    t = (a * e - b * d) / denom;
  }

  s = Math.max(0, Math.min(1, s));
  t = Math.max(0, Math.min(1, t));

  if (denom < 1e-10) {
    if (s <= 0.0) { s = 0.0; t = Math.max(0, Math.min(1, e / c)); }
    else if (s >= 1.0) { s = 1.0; t = Math.max(0, Math.min(1, (e + b) / c)); }
    else { t = Math.max(0, Math.min(1, (b * s + e) / c)); }
  } else {
    if (s < 0.0) { s = 0.0; t = Math.max(0.0, Math.min(1.0, e / c)); }
    else if (s > 1.0) { s = 1.0; t = Math.max(0.0, Math.min(1.0, (e + b) / c)); }
    if (t < 0.0) {
      t = 0.0;
      s = Math.max(0.0, Math.min(1.0, -d / a));
    } else if (t > 1.0) {
      t = 1.0;
      s = Math.max(0.0, Math.min(1.0, (b - d) / a));
    }
  }

  const closest1 = add(s1Start, scale(u, s));
  const closest2 = add(s2Start, scale(v, t));
  const dist = distance(closest1, closest2);

  return { distance: dist, closest1, closest2 };
}

export function segmentToAllPipelinesMinDistance(
  segStart: Point3D,
  segEnd: Point3D,
  pipelines: Pipeline[],
  excludeId?: string
): number {
  let minDist = Infinity;

  for (const pipeline of pipelines) {
    if (excludeId && pipeline.id === excludeId) continue;
    for (const segment of pipeline.segments) {
      const { distance: dist } = segmentDistance(
        segStart,
        segEnd,
        segment.start,
        segment.end
      );
      const threshold = SAFE_DISTANCE + PIPELINE_CONFIGS[pipeline.type].radius;
      if (dist < threshold) {
        return dist;
      }
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }
  return minDist;
}

export function detectCollisions(pipelines: Pipeline[]): CollisionPoint[] {
  const collisions: CollisionPoint[] = [];
  const segments: Segment[] = [];

  for (const pipeline of pipelines) {
    const radius = PIPELINE_CONFIGS[pipeline.type].radius;
    for (const seg of pipeline.segments) {
      segments.push({
        start: seg.start,
        end: seg.end,
        pipelineId: pipeline.id,
        pipelineType: pipeline.type,
        pipelineDepth: pipeline.depth,
        radius,
      });
    }
  }

  const seenPairs = new Set<string>();

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];

      if (s1.pipelineId === s2.pipelineId) continue;

      const pairKey = [s1.pipelineId, s2.pipelineId].sort().join('_');
      const combinedKey = `${pairKey}_${i}_${j}`;
      if (seenPairs.has(combinedKey)) continue;
      seenPairs.add(combinedKey);

      const { distance: dist, closest1, closest2 } = segmentDistance(
        s1.start,
        s1.end,
        s2.start,
        s2.end
      );

      const threshold = SAFE_DISTANCE + s1.radius + s2.radius;
      if (dist >= threshold) continue;

      const midPoint: Point3D = {
        x: (closest1.x + closest2.x) / 2,
        y: (closest1.y + closest2.y) / 2,
        z: (closest1.z + closest2.z) / 2,
      };

      const depthDiff = Math.abs(s1.pipelineDepth - s2.pipelineDepth);
      const collisionType: 'horizontal' | 'vertical' =
        depthDiff < 0.15 ? 'horizontal' : 'vertical';

      collisions.push({
        id: genCollisionId(),
        position: midPoint,
        pipelineA: s1.pipelineId,
        pipelineB: s2.pipelineId,
        typeA: s1.pipelineType,
        typeB: s2.pipelineType,
        collisionType,
        resolved: false,
        distance: dist,
      });
    }
  }

  const deduped: CollisionPoint[] = [];
  const used = new Set<string>();
  for (const c of collisions) {
    const key = [c.pipelineA, c.pipelineB].sort().join('_');
    if (used.has(key)) continue;
    used.add(key);
    deduped.push(c);
  }

  return deduped;
}
