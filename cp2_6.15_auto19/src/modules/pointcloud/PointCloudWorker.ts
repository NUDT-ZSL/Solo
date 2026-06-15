import { PointData, WorkerMessage } from '../../utils/types';

const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'parse') {
    try {
      const arrayBuffer = payload.arrayBuffer as ArrayBuffer;
      const fileName = payload.fileName as string;
      
      ctx.postMessage({
        type: 'progress',
        payload: { progress: 5 }
      });

      const pointData = await parsePLY(arrayBuffer, fileName);
      
      ctx.postMessage({
        type: 'progress',
        payload: { progress: 100 }
      });

      ctx.postMessage({
        type: 'complete',
        payload: { pointData }
      }, [pointData.position.buffer, pointData.color.buffer]);

    } catch (error) {
      ctx.postMessage({
        type: 'error',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }
};

async function parsePLY(arrayBuffer: ArrayBuffer, fileName: string): Promise<PointData> {
  const isASCII = await checkASCIIFormat(arrayBuffer);
  
  ctx.postMessage({
    type: 'progress',
    payload: { progress: 15 }
  });

  let positions: Float32Array;
  let colors: Float32Array;
  let totalPoints: number;

  if (isASCII) {
    const result = parsePLYASCII(arrayBuffer);
    positions = result.positions;
    colors = result.colors;
    totalPoints = result.totalPoints;
  } else {
    const result = parsePLYBinary(arrayBuffer);
    positions = result.positions;
    colors = result.colors;
    totalPoints = result.totalPoints;
  }

  ctx.postMessage({
    type: 'progress',
    payload: { progress: 60 }
  });

  const boundingBox = calculateBoundingBox(positions);
  const lodLevel = determineLODLevel(totalPoints);

  ctx.postMessage({
    type: 'progress',
    payload: { progress: 80 }
  });

  const { sampledPositions, sampledColors, originalIndices } = applyLOD(
    positions,
    colors,
    totalPoints,
    lodLevel
  );

  return {
    position: sampledPositions,
    color: sampledColors,
    originalIndices,
    boundingBox,
    totalPoints,
    lodLevel
  };
}

async function checkASCIIFormat(arrayBuffer: ArrayBuffer): Promise<boolean> {
  const header = new Uint8Array(arrayBuffer, 0, Math.min(200, arrayBuffer.byteLength));
  const headerStr = String.fromCharCode.apply(null, Array.from(header));
  return headerStr.includes('ply') && headerStr.includes('format ascii');
}

function parsePLYASCII(arrayBuffer: ArrayBuffer): {
  positions: Float32Array;
  colors: Float32Array;
  totalPoints: number;
} {
  const text = new TextDecoder('utf-8').decode(arrayBuffer);
  const lines = text.split('\n');
  
  let vertexCount = 0;
  let dataStartIndex = 0;
  let hasColor = false;
  let xIndex = -1, yIndex = -1, zIndex = -1;
  let rIndex = -1, gIndex = -1, bIndex = -1;
  let propertyIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('element vertex')) {
      vertexCount = parseInt(line.split(' ')[2], 10);
    } else if (line.startsWith('property')) {
      const parts = line.split(' ');
      const propName = parts[2];
      
      if (propName === 'x') xIndex = propertyIndex;
      else if (propName === 'y') yIndex = propertyIndex;
      else if (propName === 'z') zIndex = propertyIndex;
      else if (propName === 'red' || propName === 'r') { rIndex = propertyIndex; hasColor = true; }
      else if (propName === 'green' || propName === 'g') { gIndex = propertyIndex; hasColor = true; }
      else if (propName === 'blue' || propName === 'b') { bIndex = propertyIndex; hasColor = true; }
      
      propertyIndex++;
    } else if (line === 'end_header') {
      dataStartIndex = i + 1;
      break;
    }
  }

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  totalPoints = vertexCount;

  let progressInterval = Math.max(1, Math.floor(vertexCount / 20));

  for (let i = 0; i < vertexCount; i++) {
    const lineIndex = dataStartIndex + i;
    if (lineIndex >= lines.length) break;
    
    const parts = lines[lineIndex].trim().split(/\s+/).map(parseFloat);
    
    positions[i * 3] = parts[xIndex];
    positions[i * 3 + 1] = parts[yIndex];
    positions[i * 3 + 2] = parts[zIndex];

    if (hasColor && rIndex >= 0 && gIndex >= 0 && bIndex >= 0) {
      colors[i * 3] = parts[rIndex] / 255;
      colors[i * 3 + 1] = parts[gIndex] / 255;
      colors[i * 3 + 2] = parts[bIndex] / 255;
    } else {
      const height = parts[zIndex];
      const normalizedHeight = (height + 50) / 100;
      colors[i * 3] = Math.max(0, Math.min(1, normalizedHeight));
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = Math.max(0, Math.min(1, 1 - normalizedHeight));
    }

    if (i % progressInterval === 0) {
      ctx.postMessage({
        type: 'progress',
        payload: { progress: 20 + Math.floor((i / vertexCount) * 35) }
      });
    }
  }

  return { positions, colors, totalPoints };
}

function parsePLYBinary(arrayBuffer: ArrayBuffer): {
  positions: Float32Array;
  colors: Float32Array;
  totalPoints: number;
} {
  const uint8Array = new Uint8Array(arrayBuffer);
  let headerEnd = 0;
  
  for (let i = 0; i < uint8Array.length - 10; i++) {
    if (uint8Array[i] === 0x65 && uint8Array[i + 1] === 0x6e && 
        uint8Array[i + 2] === 0x64 && uint8Array[i + 3] === 0x5f &&
        uint8Array[i + 4] === 0x68 && uint8Array[i + 5] === 0x65 &&
        uint8Array[i + 6] === 0x61 && uint8Array[i + 7] === 0x64 &&
        uint8Array[i + 8] === 0x65 && uint8Array[i + 9] === 0x72 &&
        uint8Array[i + 10] === 0x0a) {
      headerEnd = i + 11;
      break;
    }
  }

  const headerText = new TextDecoder('utf-8').decode(arrayBuffer.slice(0, headerEnd));
  const headerLines = headerText.split('\n');
  
  let vertexCount = 0;
  let isLittleEndian = true;
  let hasColor = false;
  let hasX = false, hasY = false, hasZ = false;
  let hasR = false, hasG = false, hasB = false;

  for (const line of headerLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('format binary_little_endian')) {
      isLittleEndian = true;
    } else if (trimmed.startsWith('format binary_big_endian')) {
      isLittleEndian = false;
    } else if (trimmed.startsWith('element vertex')) {
      vertexCount = parseInt(trimmed.split(' ')[2], 10);
    } else if (trimmed.startsWith('property')) {
      const parts = trimmed.split(' ');
      const propName = parts[2];
      if (propName === 'x') hasX = true;
      else if (propName === 'y') hasY = true;
      else if (propName === 'z') hasZ = true;
      else if (propName === 'red' || propName === 'r') hasR = true;
      else if (propName === 'green' || propName === 'g') hasG = true;
      else if (propName === 'blue' || propName === 'b') hasB = true;
    }
  }

  hasColor = hasR && hasG && hasB;

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const totalPoints = vertexCount;

  const stride = (hasX && hasY && hasZ ? 12 : 0) + (hasColor ? 3 : 0);
  const dataView = new DataView(arrayBuffer, headerEnd);
  
  let progressInterval = Math.max(1, Math.floor(vertexCount / 20));
  let offset = 0;

  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = dataView.getFloat32(offset, isLittleEndian);
    positions[i * 3 + 1] = dataView.getFloat32(offset + 4, isLittleEndian);
    positions[i * 3 + 2] = dataView.getFloat32(offset + 8, isLittleEndian);
    offset += 12;

    if (hasColor) {
      colors[i * 3] = dataView.getUint8(offset) / 255;
      colors[i * 3 + 1] = dataView.getUint8(offset + 1) / 255;
      colors[i * 3 + 2] = dataView.getUint8(offset + 2) / 255;
      offset += 3;
    } else {
      const height = positions[i * 3 + 2];
      const normalizedHeight = (height + 50) / 100;
      colors[i * 3] = Math.max(0, Math.min(1, normalizedHeight));
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = Math.max(0, Math.min(1, 1 - normalizedHeight));
    }

    if (i % progressInterval === 0) {
      ctx.postMessage({
        type: 'progress',
        payload: { progress: 20 + Math.floor((i / vertexCount) * 35) }
      });
    }
  }

  return { positions, colors, totalPoints };
}

function calculateBoundingBox(positions: Float32Array): PointData['boundingBox'] {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxX = Math.max(maxX, positions[i]);
    maxY = Math.max(maxY, positions[i + 1]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  const radius = Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [centerX, centerY, centerZ],
    radius
  };
}

function determineLODLevel(totalPoints: number): number {
  if (totalPoints <= 100000) return 0;
  if (totalPoints <= 500000) return 1;
  if (totalPoints <= 1000000) return 2;
  return 3;
}

function applyLOD(
  positions: Float32Array,
  colors: Float32Array,
  totalPoints: number,
  lodLevel: number
): {
  sampledPositions: Float32Array;
  sampledColors: Float32Array;
  originalIndices?: Uint32Array;
} {
  if (lodLevel === 0) {
    return {
      sampledPositions: positions,
      sampledColors: colors
    };
  }

  const step = Math.pow(2, lodLevel);
  const sampledCount = Math.ceil(totalPoints / step);
  
  const sampledPositions = new Float32Array(sampledCount * 3);
  const sampledColors = new Float32Array(sampledCount * 3);
  const originalIndices = new Uint32Array(sampledCount);

  for (let i = 0, j = 0; i < totalPoints; i += step, j++) {
    sampledPositions[j * 3] = positions[i * 3];
    sampledPositions[j * 3 + 1] = positions[i * 3 + 1];
    sampledPositions[j * 3 + 2] = positions[i * 3 + 2];
    
    sampledColors[j * 3] = colors[i * 3];
    sampledColors[j * 3 + 1] = colors[i * 3 + 1];
    sampledColors[j * 3 + 2] = colors[i * 3 + 2];
    
    originalIndices[j] = i;
  }

  return {
    sampledPositions,
    sampledColors,
    originalIndices
  };
}

export {};
