import * as THREE from 'three';
import type { PathData } from './path';

const TERRAIN_HALF_WIDTH = 0.5;
const MESH_RESOLUTION = 0.1;
const CONTOUR_INTERVAL = 0.2;
const CONTOUR_LINE_WIDTH = 0.005;
const CONTOUR_COLOR = 0x555555;
const TERRAIN_OPACITY = 0.4;

export interface TerrainResult {
  mesh: THREE.Mesh;
  contourLines: THREE.Group;
}

export function buildTerrain(pathData: PathData): TerrainResult {
  const { points } = pathData;
  if (points.length < 2) {
    return {
      mesh: new THREE.Mesh(),
      contourLines: new THREE.Group(),
    };
  }

  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const terrainColors: number[] = [];

  const minEle = pathData.minEle;
  const maxEle = pathData.maxEle;
  const eleRange = maxEle - minEle || 1;

  const verticesPerCross = 2 * Math.ceil(TERRAIN_HALF_WIDTH / MESH_RESOLUTION) + 1;
  const halfSteps = Math.floor(TERRAIN_HALF_WIDTH / MESH_RESOLUTION);
  const lateralPositions: number[] = [];
  for (let s = -halfSteps; s <= halfSteps; s++) {
    lateralPositions.push(s * MESH_RESOLUTION);
  }

  const vertexCount = points.length * lateralPositions.length;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dir = new THREE.Vector3();
    if (i < points.length - 1) {
      dir.subVectors(points[i + 1], p).normalize();
    } else {
      dir.subVectors(p, points[i - 1]).normalize();
    }
    const lateral = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    const edgeFactor = (lateralPosition: number): number => {
      const normalizedDist = Math.abs(lateralPosition) / TERRAIN_HALF_WIDTH;
      return Math.max(0, 1.0 - normalizedDist);
    };

    for (let j = 0; j < lateralPositions.length; j++) {
      const lp = lateralPositions[j];
      const ef = edgeFactor(lp);
      const height = p.y * ef;
      const vx = p.x + lateral.x * lp;
      const vy = height;
      const vz = p.z + lateral.z * lp;
      positions.push(vx, vy, vz);

      const t = (p.y - minEle) / eleRange;
      const green = 0.3 + 0.3 * t;
      const blue = 0.15 + 0.1 * (1 - t);
      terrainColors.push(0.1, green, blue);
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < lateralPositions.length - 1; j++) {
      const a = i * lateralPositions.length + j;
      const b = a + 1;
      const c = (i + 1) * lateralPositions.length + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    transparent: true,
    opacity: TERRAIN_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const contourGroup = buildContourLines(pathData, lateralPositions);

  return { mesh, contourLines: contourGroup };
}

function edgeFactorFor(lateralPosition: number): number {
  const normalizedDist = Math.abs(lateralPosition) / TERRAIN_HALF_WIDTH;
  return Math.max(0, 1.0 - normalizedDist);
}

function buildContourLines(pathData: PathData, lateralPositions: number[]): THREE.Group {
  const group = new THREE.Group();
  const { points, minEle, maxEle } = pathData;

  const contourLevels: number[] = [];
  for (let h = Math.ceil(minEle / CONTOUR_INTERVAL) * CONTOUR_INTERVAL; h <= maxEle; h += CONTOUR_INTERVAL) {
    contourLevels.push(h);
  }

  const halfSteps = Math.floor(TERRAIN_HALF_WIDTH / MESH_RESOLUTION);

  for (const level of contourLevels) {
    const linePoints: THREE.Vector3[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      const dir = new THREE.Vector3();
      dir.subVectors(p1, p0).normalize();
      const lateral = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      for (let s = -halfSteps; s <= halfSteps; s++) {
        const lp = s * MESH_RESOLUTION;
        const ef = edgeFactorFor(lp);
        const h0 = p0.y * ef;
        const h1 = p1.y * ef;

        if ((h0 <= level && h1 >= level) || (h0 >= level && h1 <= level)) {
          const t = h0 === h1 ? 0 : (level - h0) / (h1 - h0);
          const x = p0.x + (p1.x - p0.x) * t + lateral.x * lp;
          const z = p0.z + (p1.z - p0.z) * t + lateral.z * lp;
          linePoints.push(new THREE.Vector3(x, level, z));
        }
      }

      for (let s = -halfSteps; s < halfSteps; s++) {
        const lp0 = s * MESH_RESOLUTION;
        const lp1 = (s + 1) * MESH_RESOLUTION;
        const ef0 = edgeFactorFor(lp0);
        const ef1 = edgeFactorFor(lp1);
        const h0 = p0.y * ef0;
        const h1 = p0.y * ef1;

        if ((h0 <= level && h1 >= level) || (h0 >= level && h1 <= level)) {
          const t = h0 === h1 ? 0 : (level - h0) / (h1 - h0);
          const x = p0.x + lateral.x * (lp0 + (lp1 - lp0) * t);
          const z = p0.z + lateral.z * (lp0 + (lp1 - lp0) * t);
          linePoints.push(new THREE.Vector3(x, level, z));
        }
      }
    }

    if (linePoints.length >= 2) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: CONTOUR_COLOR,
        linewidth: CONTOUR_LINE_WIDTH,
        transparent: true,
        opacity: 0.6,
      });
      group.add(new THREE.LineSegments(lineGeom, lineMat));
    }
  }

  return group;
}
