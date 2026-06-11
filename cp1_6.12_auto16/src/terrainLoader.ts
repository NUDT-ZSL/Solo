import * as THREE from 'three';

export interface TerrainData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  width: number;
  height: number;
  minElevation: number;
  maxElevation: number;
  vertexCount: number;
  rawHeights: Float32Array;
}

export interface TerrainObject {
  geometry: THREE.BufferGeometry;
  data: TerrainData;
}

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
  const gridHeight = rows.length;
  const gridWidth = rows[0].split(',').length;

  const skip = Math.max(1, lodSkip);
  const effWidth = Math.ceil(gridWidth / skip);
  const effHeight = Math.ceil(gridHeight / skip);
  const vertexCount = effWidth * effHeight;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3);
  const rawHeights = new Float32Array(vertexCount);

  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let gz = 0; gz < effHeight; gz++) {
    const ri = Math.min(gz * skip, gridHeight - 1);
    const cols = rows[ri].split(',');
    for (let gx = 0; gx < effWidth; gx++) {
      const ci = Math.min(gx * skip, cols.length - 1);
      const h = parseFloat(cols[ci]) || 0;
      if (h < minElev) minElev = h;
      if (h > maxElev) maxElev = h;
      const idx = gz * effWidth + gx;
      rawHeights[idx] = h;
    }
  }

  const elevRange = maxElev - minElev || 1;

  for (let gz = 0; gz < effHeight; gz++) {
    for (let gx = 0; gx < effWidth; gx++) {
      const idx = gz * effWidth + gx;
      const h = rawHeights[idx];
      const t = (h - minElev) / elevRange;

      const x = (gx / (effWidth - 1) - 0.5) * scaleXZ;
      const y = t * scaleY;
      const z = (gz / (effHeight - 1) - 0.5) * scaleXZ;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      uvs[idx * 2] = gx / (effWidth - 1);
      uvs[idx * 2 + 1] = gz / (effHeight - 1);

      if (t < 0.3) {
        colors[idx * 3] = 0.15 + t * 0.6;
        colors[idx * 3 + 1] = 0.45 + t * 0.8;
        colors[idx * 3 + 2] = 0.1 + t * 0.2;
      } else if (t < 0.6) {
        const s = (t - 0.3) / 0.3;
        colors[idx * 3] = 0.33 + s * 0.4;
        colors[idx * 3 + 1] = 0.69 - s * 0.1;
        colors[idx * 3 + 2] = 0.16 + s * 0.2;
      } else if (t < 0.85) {
        const s = (t - 0.6) / 0.25;
        colors[idx * 3] = 0.73 + s * 0.15;
        colors[idx * 3 + 1] = 0.59 + s * 0.2;
        colors[idx * 3 + 2] = 0.36 + s * 0.3;
      } else {
        const s = (t - 0.85) / 0.15;
        colors[idx * 3] = 0.88 + s * 0.12;
        colors[idx * 3 + 1] = 0.79 + s * 0.21;
        colors[idx * 3 + 2] = 0.66 + s * 0.34;
      }
    }
  }

  const indexCount = (effWidth - 1) * (effHeight - 1) * 6;
  const indices = new Uint32Array(indexCount);
  let ii = 0;
  for (let gz = 0; gz < effHeight - 1; gz++) {
    for (let gx = 0; gx < effWidth - 1; gx++) {
      const a = gz * effWidth + gx;
      const b = a + 1;
      const c = a + effWidth;
      const d = c + 1;
      indices[ii++] = a;
      indices[ii++] = c;
      indices[ii++] = b;
      indices[ii++] = b;
      indices[ii++] = c;
      indices[ii++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const data: TerrainData = {
    positions,
    normals: new Float32Array(vertexCount * 3),
    uvs,
    colors,
    indices,
    width: effWidth,
    height: effHeight,
    minElevation: minElev,
    maxElevation: maxElev,
    vertexCount,
    rawHeights,
  };

  const normalAttr = geometry.getAttribute('normal');
  if (normalAttr) {
    for (let i = 0; i < vertexCount; i++) {
      data.normals[i * 3] = normalAttr.getX(i);
      data.normals[i * 3 + 1] = normalAttr.getY(i);
      data.normals[i * 3 + 2] = normalAttr.getZ(i);
    }
  }

  return { geometry, data };
}
