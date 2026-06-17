import type { Pipeline, CollisionPoint, Point3D, PipelineType } from '@/data/types';
import { PIPELINE_CONFIGS, SAFE_DISTANCE } from '@/data/types';

interface CylinderSegment {
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

export interface SegmentDistanceResult {
  centerDistance: number;
  surfaceDistance: number;
  closest1: Point3D;
  closest2: Point3D;
}

export function cylinderSegmentDistance(
  s1Start: Point3D,
  s1End: Point3D,
  r1: number,
  s2Start: Point3D,
  s2End: Point3D,
  r2: number
): SegmentDistanceResult {
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
  const EPS = 1e-10;

  if (denom < EPS) {
    s = 0.0;
    t = b > c ? d / (b || 1) : e / (c || 1);
  } else {
    s = (b * e - c * d) / denom;
    t = (a * e - b * d) / denom;
  }

  s = Math.max(0, Math.min(1, s));
  t = Math.max(0, Math.min(1, t));

  if (denom < EPS) {
    if (s <= 0.0) {
      s = 0.0;
      t = Math.max(0, Math.min(1, e / (c || 1)));
    } else if (s >= 1.0) {
      s = 1.0;
      t = Math.max(0, Math.min(1, (e + b) / (c || 1)));
    } else {
      t = Math.max(0, Math.min(1, (b * s + e) / (c || 1)));
    }
  } else {
    if (s < 0.0) {
      s = 0.0;
      t = Math.max(0.0, Math.min(1.0, e / (c || 1)));
    } else if (s > 1.0) {
      s = 1.0;
      t = Math.max(0.0, Math.min(1.0, (e + b) / (c || 1)));
    }
    if (t < 0.0) {
      t = 0.0;
      s = Math.max(0.0, Math.min(1.0, -d / (a || 1)));
    } else if (t > 1.0) {
      t = 1.0;
      s = Math.max(0.0, Math.min(1.0, (b - d) / (a || 1)));
    }
  }

  const closest1 = add(s1Start, scale(u, s));
  const closest2 = add(s2Start, scale(v, t));
  const centerDist = distance(closest1, closest2);
  const surfaceDist = Math.max(0, centerDist - r1 - r2);

  return {
    centerDistance: centerDist,
    surfaceDistance: surfaceDist,
    closest1,
    closest2,
  };
}

export function segmentToAllPipelinesMinSurfaceDistance(
  segStart: Point3D,
  segEnd: Point3D,
  currentRadius: number,
  pipelines: Pipeline[],
  excludeId?: string
): { minSurfaceDist: number; minCenterDist: number } {
  let minSurfaceDist = Infinity;
  let minCenterDist = Infinity;

  for (const pipeline of pipelines) {
    if (excludeId && pipeline.id === excludeId) continue;
    const pRadius = PIPELINE_CONFIGS[pipeline.type].radius;
    for (const segment of pipeline.segments) {
      const result = cylinderSegmentDistance(
        segStart,
        segEnd,
        currentRadius,
        segment.start,
        segment.end,
        pRadius
      );
      const centerThreshold = SAFE_DISTANCE + currentRadius + pRadius;
      if (result.centerDistance < centerThreshold) {
        return {
          minSurfaceDist: result.surfaceDistance,
          minCenterDist: result.centerDistance,
        };
      }
      if (result.surfaceDistance < minSurfaceDist) {
        minSurfaceDist = result.surfaceDistance;
        minCenterDist = result.centerDistance;
      }
    }
  }
  return { minSurfaceDist, minCenterDist };
}

export function detectCollisions(pipelines: Pipeline[]): CollisionPoint[] {
  const collisions: CollisionPoint[] = [];
  const segments: CylinderSegment[] = [];

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

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];

      if (s1.pipelineId === s2.pipelineId) continue;

      const result = cylinderSegmentDistance(
        s1.start,
        s1.end,
        s1.radius,
        s2.start,
        s2.end,
        s2.radius
      );

      const centerThreshold = SAFE_DISTANCE + s1.radius + s2.radius;
      if (result.centerDistance >= centerThreshold) continue;

      const midPoint: Point3D = {
        x: (result.closest1.x + result.closest2.x) / 2,
        y: (result.closest1.y + result.closest2.y) / 2,
        z: (result.closest1.z + result.closest2.z) / 2,
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
        distance: result.centerDistance,
      });
    }
  }

  const deduped: CollisionPoint[] = [];
  const used = new Map<string, CollisionPoint>();
  for (const c of collisions) {
    const key = [c.pipelineA, c.pipelineB].sort().join('_');
    const existing = used.get(key);
    if (!existing || c.distance < existing.distance) {
      if (existing) {
        const idx = deduped.findIndex((d) => d.id === existing.id);
        if (idx >= 0) deduped.splice(idx, 1);
      }
      used.set(key, c);
      deduped.push(c);
    }
  }

  return deduped;
}
