import * as THREE from 'three';

export interface TerrainData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  gridWidth: number;
  gridHeight: number;
  minElevation: number;
  maxElevation: number;
  vertexCount: number;
  rawHeights: Float32Array;
  scaleXZ: number;
  scaleY: number;
}

export interface TerrainObject {
  geometry: THREE.BufferGeometry;
  data: TerrainData;
}

function lerpColor(
  t: number,
  stops: { t: number; r: number; g: number; b: number }[]
): [number, number, number] {
  if (t <= stops[0].t) return [stops[0].r, stops[0].g, stops[0].b];
  if (t >= stops[stops.length - 1].t) return [stops[stops.length - 1].r, stops[stops.length - 1].g, stops[stops.length - 1].b];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const s = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return [
        stops[i].r + s * (stops[i + 1].r - stops[i].r),
        stops[i].g + s * (stops[i + 1].g - stops[i].g),
        stops[i].b + s * (stops[i + 1].b - stops[i].b),
      ];
    }
  }
  return [1, 1, 1];
}

const HEIGHT_COLOR_STOPS = [
  { t: 0.0, r: 0.12, g: 0.38, b: 0.15 },
  { t: 0.3, r: 0.30, g: 0.60, b: 0.20 },
  { t: 0.55, r: 0.70, g: 0.62, b: 0.38 },
  { t: 0.75, r: 0.55, g: 0.40, b: 0.28 },
  { t: 0.9, r: 0.78, g: 0.75, b: 0.70 },
  { t: 1.0, r: 0.98, g: 0.98, b: 1.0 },
];

export async function loadTerrainFromCSV(
  url: string,
  scaleXZ: number = 500,
  scaleY: number = 80,
  lodSkip: number = 1
): Promise<TerrainObject> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load terrain CSV: ${response.statusText}`);
  const text = await response.text();
  const rows = text.trim().split('\n');
  const rawGridHeight = rows.length;
  const rawGridWidth = rows[0].split(',').length;

  const skip = Math.max(1, Math.floor(lodSkip));
  const gridWidth = Math.ceil(rawGridWidth / skip);
  const gridHeight = Math.ceil(rawGridHeight / skip);
  const vertexCount = gridWidth * gridHeight;

  const rawHeights = new Float32Array(vertexCount);
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let z = 0; z < gridHeight; z++) {
    const srcZ = Math.min(z * skip, rawGridHeight - 1);
    const cols = rows[srcZ].split(',');
    for (let x = 0; x < gridWidth; x++) {
      const srcX = Math.min(x * skip, cols.length - 1);
      const h = parseFloat(cols[srcX]) || 0;
      const idx = z * gridWidth + x;
      rawHeights[idx] = h;
      if (h < minElev) minElev = h;
      if (h > maxElev) maxElev = h;
    }
  }

  const elevRange = maxElev - minElev || 1;
  const halfX = scaleXZ / 2;
  const halfZ = scaleXZ / 2;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3);

  for (let z = 0; z < gridHeight; z++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = z * gridWidth + x;
      const h = rawHeights[idx];
      const t = (h - minElev) / elevRange;

      positions[idx * 3] = (x / (gridWidth - 1)) * scaleXZ - halfX;
      positions[idx * 3 + 1] = t * scaleY;
      positions[idx * 3 + 2] = (z / (gridHeight - 1)) * scaleXZ - halfZ;

      uvs[idx * 2] = x / (gridWidth - 1);
      uvs[idx * 2 + 1] = z / (gridHeight - 1);

      const [r, g, b] = lerpColor(t, HEIGHT_COLOR_STOPS);
      colors[idx * 3] = r;
      colors[idx * 3 + 1] = g;
      colors[idx * 3 + 2] = b;
    }
  }

  const indexCount = (gridWidth - 1) * (gridHeight - 1) * 6;
  const indices = new Uint32Array(indexCount);
  let i = 0;
  for (let z = 0; z < gridHeight - 1; z++) {
    for (let x = 0; x < gridWidth - 1; x++) {
      const a = z * gridWidth + x;
      const b = a + 1;
      const c = a + gridWidth;
      const d = c + 1;
      indices[i++] = a;
      indices[i++] = c;
      indices[i++] = b;
      indices[i++] = b;
      indices[i++] = c;
      indices[i++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const normals = new Float32Array(vertexCount * 3);
  normals.set(normalAttr.array as Float32Array);

  const data: TerrainData = {
    positions,
    normals,
    uvs,
    colors,
    indices,
    gridWidth,
    gridHeight,
    minElevation: minElev,
    maxElevation: maxElev,
    vertexCount,
    rawHeights,
    scaleXZ,
    scaleY,
  };

  return { geometry, data };
}

export function getElevationAtUV(data: TerrainData, u: number, v: number): number {
  const x = Math.max(0, Math.min(data.gridWidth - 1, u * (data.gridWidth - 1)));
  const z = Math.max(0, Math.min(data.gridHeight - 1, v * (data.gridHeight - 1)));
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(x0 + 1, data.gridWidth - 1);
  const z1 = Math.min(z0 + 1, data.gridHeight - 1);
  const fx = x - x0;
  const fz = z - z0;

  const h00 = data.rawHeights[z0 * data.gridWidth + x0];
  const h10 = data.rawHeights[z0 * data.gridWidth + x1];
  const h01 = data.rawHeights[z1 * data.gridWidth + x0];
  const h11 = data.rawHeights[z1 * data.gridWidth + x1];

  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;
  return h0 * (1 - fz) + h1 * fz;
}

export function getWorldPositionAtUV(data: TerrainData, u: number, v: number): THREE.Vector3 {
  const elevation = getElevationAtUV(data, u, v);
  const t = (elevation - data.minElevation) / (data.maxElevation - data.minElevation || 1);
  const x = u * data.scaleXZ - data.scaleXZ / 2;
  const z = v * data.scaleXZ - data.scaleXZ / 2;
  const y = t * data.scaleY;
  return new THREE.Vector3(x, y, z);
}
