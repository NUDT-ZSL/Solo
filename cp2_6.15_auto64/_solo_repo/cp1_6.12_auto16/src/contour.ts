import * as THREE from 'three';
import type { TerrainData } from './terrainLoader';

export interface ContourLine {
  points: THREE.Vector3[];
  level: number;
  color: THREE.Color;
}

export interface ContourGenerator {
  group: THREE.Group;
  lines: ContourLine[];
  interval: number;
  enabled: boolean;
  generate: (data: TerrainData, interval: number) => void;
  clear: () => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

function lerpValue(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    lerpValue(a.x, b.x, t),
    lerpValue(a.y, b.y, t),
    lerpValue(a.z, b.z, t)
  );
}

function getContourColor(
  level: number,
  minElev: number,
  maxElev: number
): THREE.Color {
  const t = (level - minElev) / (maxElev - minElev || 1);
  const color = new THREE.Color();
  color.setHSL((1 - t) * 0.66, 1.0, 0.6);
  return color;
}

export function createContourGenerator(scene: THREE.Scene): ContourGenerator {
  const group = new THREE.Group();
  group.name = 'contourGroup';
  group.visible = false;
  scene.add(group);

  const generator: ContourGenerator = {
    group,
    lines: [],
    interval: 50,
    enabled: false,

    generate(data: TerrainData, interval: number) {
      generator.clear();
      generator.interval = interval;

      const minLevel = Math.ceil(data.minElevation / interval) * interval;
      const maxLevel = Math.floor(data.maxElevation / interval) * interval;
      const { gridWidth, gridHeight } = data;
      const halfX = data.scaleXZ / 2;
      const halfZ = data.scaleXZ / 2;

      const allSegments: { level: number; points: THREE.Vector3[] }[] = [];

      for (let level = minLevel; level <= maxLevel; level += interval) {
        const segments: THREE.Vector3[][] = [];

        for (let z = 0; z < gridHeight - 1; z++) {
          for (let x = 0; x < gridWidth - 1; x++) {
            const idx00 = z * gridWidth + x;
            const idx10 = z * gridWidth + x + 1;
            const idx01 = (z + 1) * gridWidth + x;
            const idx11 = (z + 1) * gridWidth + x + 1;

            const h00 = data.rawHeights[idx00];
            const h10 = data.rawHeights[idx10];
            const h01 = data.rawHeights[idx01];
            const h11 = data.rawHeights[idx11];

            let code = 0;
            if (h00 > level) code |= 1;
            if (h10 > level) code |= 2;
            if (h11 > level) code |= 4;
            if (h01 > level) code |= 8;

            if (code === 0 || code === 15) continue;

            const p00 = new THREE.Vector3(
              (x / (gridWidth - 1)) * data.scaleXZ - halfX,
              data.positions[idx00 * 3 + 1],
              (z / (gridHeight - 1)) * data.scaleXZ - halfZ
            );
            const p10 = new THREE.Vector3(
              ((x + 1) / (gridWidth - 1)) * data.scaleXZ - halfX,
              data.positions[idx10 * 3 + 1],
              (z / (gridHeight - 1)) * data.scaleXZ - halfZ
            );
            const p01 = new THREE.Vector3(
              (x / (gridWidth - 1)) * data.scaleXZ - halfX,
              data.positions[idx01 * 3 + 1],
              ((z + 1) / (gridHeight - 1)) * data.scaleXZ - halfZ
            );
            const p11 = new THREE.Vector3(
              ((x + 1) / (gridWidth - 1)) * data.scaleXZ - halfX,
              data.positions[idx11 * 3 + 1],
              ((z + 1) / (gridHeight - 1)) * data.scaleXZ - halfZ
            );

            const tBot = (level - h00) / (h10 - h00 || 1e-6);
            const tRight = (level - h10) / (h11 - h10 || 1e-6);
            const tTop = (level - h01) / (h11 - h01 || 1e-6);
            const tLeft = (level - h00) / (h01 - h00 || 1e-6);

            const edgePts: (THREE.Vector3 | null)[] = [null, null, null, null];

            if (code & 1 || code & 2) {
              if ((h00 - level) * (h10 - level) < 0) {
                edgePts[0] = lerpVec3(p00, p10, tBot);
              }
            }
            if (code & 2 || code & 4) {
              if ((h10 - level) * (h11 - level) < 0) {
                edgePts[1] = lerpVec3(p10, p11, tRight);
              }
            }
            if (code & 4 || code & 8) {
              if ((h11 - level) * (h01 - level) < 0) {
                edgePts[2] = lerpVec3(p11, p01, 1 - tTop);
              }
            }
            if (code & 8 || code & 1) {
              if ((h01 - level) * (h00 - level) < 0) {
                edgePts[3] = lerpVec3(p00, p01, tLeft);
              }
            }

            const connectLines: [number, number][] = [];
            switch (code) {
              case 1: connectLines.push([3, 0]); break;
              case 2: connectLines.push([0, 1]); break;
              case 3: connectLines.push([3, 1]); break;
              case 4: connectLines.push([1, 2]); break;
              case 5: connectLines.push([3, 0], [1, 2]); break;
              case 6: connectLines.push([0, 2]); break;
              case 7: connectLines.push([3, 2]); break;
              case 8: connectLines.push([2, 3]); break;
              case 9: connectLines.push([2, 0]); break;
              case 10: connectLines.push([0, 3], [1, 2]); break;
              case 11: connectLines.push([1, 3]); break;
              case 12: connectLines.push([2, 1]); break;
              case 13: connectLines.push([2, 0]); break;
              case 14: connectLines.push([0, 3]); break;
            }

            for (const [a, b] of connectLines) {
              const pa = edgePts[a];
              const pb = edgePts[b];
              if (pa && pb) {
                segments.push([
                  new THREE.Vector3(pa.x, pa.y + 0.5, pa.z),
                  new THREE.Vector3(pb.x, pb.y + 0.5, pb.z),
                ]);
              }
            }
          }
        }

        const flatPoints: THREE.Vector3[] = [];
        for (const seg of segments) {
          flatPoints.push(seg[0], seg[1]);
        }

        if (flatPoints.length > 0) {
          allSegments.push({ level, points: flatPoints });
        }
      }

      for (const { level, points } of allSegments) {
        if (points.length < 2) continue;

        const color = getContourColor(level, data.minElevation, data.maxElevation);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
        });
        const line = new THREE.LineSegments(lineGeo, lineMat);
        line.renderOrder = 100;
        group.add(line);

        const glowGeo = new THREE.BufferGeometry().setFromPoints(points);
        const glowMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(0.3, 0.5, 1.0),
          transparent: true,
          opacity: 0.2,
        });
        const glowLine = new THREE.LineSegments(glowGeo, glowMat);
        glowLine.renderOrder = 99;
        group.add(glowLine);

        generator.lines.push({ points, level, color });
      }
    },

    clear() {
      while (group.children.length > 0) {
        const child = group.children[0];
        if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
        group.remove(child);
      }
      generator.lines = [];
    },

    setVisible(visible: boolean) {
      generator.enabled = visible;
      group.visible = visible;
    },

    dispose() {
      generator.clear();
    },
  };

  return generator;
}
