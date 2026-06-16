import {
  MaterialType,
  MATERIALS,
  VertexData,
  ErosionStats,
  MeshUpdateData,
  EROSION_THRESHOLD,
  MAX_DISPLACEMENT,
  CUBE_SIZE,
  VERTEX_COUNT_TARGET,
  GRID_SPACING
} from '../types';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0.5, 0.5, 0.5];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
}

function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t
  ];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-8) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

const DARK_TARGET_COLOR: [number, number, number] = [
  0x4a / 255,
  0x37 / 255,
  0x28 / 255
];

export class ErosionEngine {
  private vertices: VertexData[] = [];
  private initialVertexCount: number = 0;
  private material: MaterialType = 'sand';
  private windDirection: number = 0;
  private windSpeed: number = 5;
  private gridCellVertexCount: Map<string, number> = new Map();
  private gridCellRemovedCount: Map<string, number> = new Map();
  private worker: Worker | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      const workerCode = `
        self.onmessage = function(e) {
          const { vertices, windDir, windSpeed, materialHardness, darkColor } = e.data;
          const rad = windDir * Math.PI / 180;
          const windVec = [Math.cos(rad), 0, Math.sin(rad)];
          const wLen = Math.sqrt(windVec[0]*windVec[0] + windVec[1]*windVec[1] + windVec[2]*windVec[2]);
          windVec[0] /= wLen; windVec[1] /= wLen; windVec[2] /= wLen;
          
          const result = { updatedVertices: [], removedIds: [], maxDepth: 0 };
          
          for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            if (!v.alive) {
              result.updatedVertices.push({ ...v, color: v.color });
              continue;
            }
            const nLen = Math.sqrt(v.normal[0]*v.normal[0] + v.normal[1]*v.normal[1] + v.normal[2]*v.normal[2]);
            const nx = v.normal[0] / (nLen || 1);
            const ny = v.normal[1] / (nLen || 1);
            const nz = v.normal[2] / (nLen || 1);
            const exposure = Math.max(0, windVec[0]*nx + windVec[1]*ny + windVec[2]*nz);
            const rate = exposure * materialHardness * windSpeed * 0.02;
            
            let newPos = [...v.position];
            let newDisp = v.displacement;
            let alive = true;
            
            if (rate > 0.008) {
              const disp = 0.01 + Math.random() * 0.04;
              newPos[0] = v.position[0] + nx * disp;
              newPos[1] = v.position[1] + ny * disp;
              newPos[2] = v.position[2] + nz * disp;
              newDisp = v.displacement + disp;
              if (newDisp > 0.5) {
                alive = false;
                result.removedIds.push(v.id);
              }
              if (newDisp > result.maxDepth) result.maxDepth = newDisp;
            }
            
            const t = Math.min(1, newDisp / 0.5);
            const baseColor = v.color || [0.8, 0.7, 0.5];
            const newColor = [
              baseColor[0] + (darkColor[0] - baseColor[0]) * t,
              baseColor[1] + (darkColor[1] - baseColor[1]) * t,
              baseColor[2] + (darkColor[2] - baseColor[2]) * t
            ];
            
            result.updatedVertices.push({
              ...v,
              position: newPos,
              displacement: newDisp,
              alive,
              color: newColor
            });
          }
          self.postMessage(result);
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    } catch {
      this.worker = null;
    }
  }

  init(material: MaterialType) {
    this.material = material;
    this.vertices = this.generateCubeVertices();
    this.initialVertexCount = this.vertices.length;
    this.buildGridCellStats();
  }

  private generateCubeVertices(): VertexData[] {
    const vertices: VertexData[] = [];
    const half = CUBE_SIZE / 2;
    const approxPerFace = Math.ceil(VERTEX_COUNT_TARGET / 6);
    const perSide = Math.ceil(Math.sqrt(approxPerFace));
    const step = CUBE_SIZE / (perSide - 1);
    let id = 0;

    const addFace = (
      uAxis: [number, number, number],
      vAxis: [number, number, number],
      normal: [number, number, number],
      origin: [number, number, number]
    ) => {
      for (let i = 0; i < perSide; i++) {
        for (let j = 0; j < perSide; j++) {
          const u = (i / (perSide - 1) - 0.5) * CUBE_SIZE;
          const v = (j / (perSide - 1) - 0.5) * CUBE_SIZE;
          const pos: [number, number, number] = [
            origin[0] + uAxis[0] * u + vAxis[0] * v + normal[0] * half,
            origin[1] + uAxis[1] * u + vAxis[1] * v + normal[1] * half,
            origin[2] + uAxis[2] * u + vAxis[2] * v + normal[2] * half
          ];
          const matColor = hexToRgb(MATERIALS[this.material].color);
          const jitter = 0.02;
          const jitteredPos: [number, number, number] = [
            pos[0] + (Math.random() - 0.5) * jitter,
            pos[1] + (Math.random() - 0.5) * jitter,
            pos[2] + (Math.random() - 0.5) * jitter
          ];
          vertices.push({
            id: id++,
            position: jitteredPos,
            originalPosition: [...jitteredPos],
            normal: [...normal],
            displacement: 0,
            color: [...matColor],
            alive: true
          });
        }
      }
    };

    addFace([1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]);
    addFace([1, 0, 0], [0, 1, 0], [0, 0, -1], [0, 0, 0]);
    addFace([0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 0, 0]);
    addFace([0, 0, 1], [0, 1, 0], [-1, 0, 0], [0, 0, 0]);
    addFace([1, 0, 0], [0, 0, 1], [0, 1, 0], [0, 0, 0]);
    addFace([1, 0, 0], [0, 0, 1], [0, -1, 0], [0, 0, 0]);

    return vertices;
  }

  private buildGridCellStats() {
    this.gridCellVertexCount.clear();
    this.gridCellRemovedCount.clear();
    for (const v of this.vertices) {
      const key = this.getGridCellKey(v.position);
      this.gridCellVertexCount.set(key, (this.gridCellVertexCount.get(key) || 0) + 1);
    }
  }

  private getGridCellKey(pos: [number, number, number]): string {
    const half = CUBE_SIZE / 2;
    const gx = Math.floor((pos[0] + half) / GRID_SPACING);
    const gy = Math.floor((pos[1] + half) / GRID_SPACING);
    const gz = Math.floor((pos[2] + half) / GRID_SPACING);
    return `${gx},${gy},${gz}`;
  }

  setWind(direction: number, speed: number) {
    this.windDirection = direction;
    this.windSpeed = speed;
  }

  setMaterial(material: MaterialType) {
    this.material = material;
  }

  simulateStep(): Promise<void> {
    return new Promise((resolve) => {
      const hardness = MATERIALS[this.material].hardness;

      if (this.worker) {
        const transferData = this.vertices.map((v) => ({
          id: v.id,
          position: v.position,
          originalPosition: v.originalPosition,
          normal: v.normal,
          displacement: v.displacement,
          color: v.color,
          alive: v.alive
        }));

        this.worker.onmessage = (e: MessageEvent) => {
          const result = e.data;
          for (let i = 0; i < this.vertices.length; i++) {
            const updated = result.updatedVertices[i];
            this.vertices[i].position = updated.position as [number, number, number];
            this.vertices[i].displacement = updated.displacement;
            this.vertices[i].alive = updated.alive;
            this.vertices[i].color = updated.color as [number, number, number];
          }
          for (const removedId of result.removedIds as number[]) {
            const v = this.vertices.find((vv) => vv.id === removedId);
            if (v) {
              const key = this.getGridCellKey(v.originalPosition);
              this.gridCellRemovedCount.set(key, (this.gridCellRemovedCount.get(key) || 0) + 1);
            }
          }
          resolve();
        };

        this.worker.postMessage({
          vertices: transferData,
          windDir: this.windDirection,
          windSpeed: this.windSpeed,
          materialHardness: hardness,
          darkColor: DARK_TARGET_COLOR
        });
      } else {
        this.simulateStepFallback();
        resolve();
      }
    });
  }

  private simulateStepFallback() {
    const rad = (this.windDirection * Math.PI) / 180;
    const windVec = normalize([Math.cos(rad), 0, Math.sin(rad)]);
    const hardness = MATERIALS[this.material].hardness;
    const matColor = hexToRgb(MATERIALS[this.material].color);

    for (const v of this.vertices) {
      if (!v.alive) continue;
      const n = normalize(v.normal);
      const exposure = Math.max(0, dot(n, windVec));
      const rate = exposure * hardness * this.windSpeed * 0.02;

      if (rate > EROSION_THRESHOLD) {
        const disp = 0.01 + Math.random() * 0.04;
        v.position = [
          v.position[0] + n[0] * disp,
          v.position[1] + n[1] * disp,
          v.position[2] + n[2] * disp
        ];
        v.displacement += disp;

        if (v.displacement > MAX_DISPLACEMENT) {
          v.alive = false;
          const key = this.getGridCellKey(v.originalPosition);
          this.gridCellRemovedCount.set(key, (this.gridCellRemovedCount.get(key) || 0) + 1);
        }
      }

      const t = Math.min(1, v.displacement / MAX_DISPLACEMENT);
      v.color = lerpColor(matColor, DARK_TARGET_COLOR, t);
    }
  }

  getErosionStats(): ErosionStats {
    let maxDepth = 0;
    let maxPos: [number, number, number] = [0, 0, 0];
    const removed = this.vertices.filter((v) => !v.alive).length;
    for (const v of this.vertices) {
      if (v.displacement > maxDepth) {
        maxDepth = v.displacement;
        maxPos = v.position;
      }
    }
    return {
      totalVertices: this.vertices.length,
      removedVertices: removed,
      maxErosionDepth: parseFloat(maxDepth.toFixed(3)),
      erosionProgress: parseFloat(
        ((removed / this.initialVertexCount) * 100).toFixed(2)
      ),
      maxErosionPosition: maxPos
    };
  }

  getGridCellErosionRatio(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [key, total] of this.gridCellVertexCount.entries()) {
      const removed = this.gridCellRemovedCount.get(key) || 0;
      result.set(key, total > 0 ? removed / total : 0);
    }
    return result;
  }

  getMeshUpdateData(): MeshUpdateData {
    const aliveVertices = this.vertices.filter((v) => v.alive);
    const positions = new Float32Array(aliveVertices.length * 3);
    const normals = new Float32Array(aliveVertices.length * 3);
    const colors = new Float32Array(aliveVertices.length * 3);
    const indices: number[] = [];

    for (let i = 0; i < aliveVertices.length; i++) {
      positions[i * 3] = aliveVertices[i].position[0];
      positions[i * 3 + 1] = aliveVertices[i].position[1];
      positions[i * 3 + 2] = aliveVertices[i].position[2];
      normals[i * 3] = aliveVertices[i].normal[0];
      normals[i * 3 + 1] = aliveVertices[i].normal[1];
      normals[i * 3 + 2] = aliveVertices[i].normal[2];
      colors[i * 3] = aliveVertices[i].color[0];
      colors[i * 3 + 1] = aliveVertices[i].color[1];
      colors[i * 3 + 2] = aliveVertices[i].color[2];
    }

    const approx = Math.ceil(Math.sqrt(aliveVertices.length / 6));
    for (let face = 0; face < 6; face++) {
      const faceStart = face * approx * approx;
      for (let i = 0; i < approx - 1; i++) {
        for (let j = 0; j < approx - 1; j++) {
          const idx = faceStart + i * approx + j;
          if (
            idx + approx + 1 < aliveVertices.length &&
            idx % aliveVertices.length < aliveVertices.length
          ) {
            indices.push(idx, idx + 1, idx + approx);
            indices.push(idx + 1, idx + approx + 1, idx + approx);
          }
        }
      }
    }

    return {
      positions,
      normals,
      colors,
      indices: new Uint32Array(indices),
      gridCellErosionRatio: this.getGridCellErosionRatio()
    };
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
