interface ClimateRecord {
  lat: number;
  lon: number;
  value: number;
}

interface WorkerInput {
  records: ClimateRecord[];
  variable: 'temperature' | 'pressure' | 'precipitation';
  particleCount: number;
}

interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  velocities: Float32Array;
  latlons: Float32Array;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 1, b: 1 };
}

function lerpColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: color1.r + (color2.r - color1.r) * t,
    g: color1.g + (color2.g - color1.g) * t,
    b: color1.b + (color2.b - color1.b) * t,
  };
}

function getColorForValue(
  value: number,
  min: number,
  max: number,
  variable: string
): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  switch (variable) {
    case 'temperature': {
      const cold = hexToRgb('#3399ff');
      const warm = hexToRgb('#ff3333');
      return lerpColor(cold, warm, t);
    }
    case 'pressure': {
      const low = hexToRgb('#22c55e');
      const high = hexToRgb('#a855f7');
      return lerpColor(low, high, t);
    }
    case 'precipitation': {
      const dry = hexToRgb('#0c4a6e');
      const wet = hexToRgb('#7dd3fc');
      return lerpColor(dry, wet, t);
    }
    default:
      return { r: 1, g: 1, b: 1 };
  }
}

function latLonToCartesian(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function buildGrid(records: ClimateRecord[]): Map<string, number> {
  const grid = new Map<string, number>();
  for (const record of records) {
    grid.set(`${record.lat}_${record.lon}`, record.value);
  }
  return grid;
}

function interpolateFromGrid(
  grid: Map<string, number>,
  lat: number,
  lon: number
): number {
  const latStep = 10;
  const lonStep = 10;
  
  const lat0 = Math.floor(lat / latStep) * latStep;
  const lat1 = Math.min(90, lat0 + latStep);
  const lon0 = Math.floor(lon / lonStep) * lonStep;
  const lon1 = Math.min(180, lon0 + lonStep);
  
  const v00 = grid.get(`${lat0}_${lon0}`) ?? 0;
  const v01 = grid.get(`${lat0}_${lon1}`) ?? v00;
  const v10 = grid.get(`${lat1}_${lon0}`) ?? v00;
  const v11 = grid.get(`${lat1}_${lon1}`) ?? v00;
  
  const tLat = (lat - lat0) / latStep;
  const tLon = (lon - lon0) / lonStep;
  
  const v0 = v00 + (v01 - v00) * tLon;
  const v1 = v10 + (v11 - v10) * tLon;
  
  return v0 + (v1 - v0) * tLat;
}

function getValueRange(variable: string): { min: number; max: number } {
  switch (variable) {
    case 'temperature':
      return { min: -40, max: 40 };
    case 'pressure':
      return { min: 980, max: 1040 };
    case 'precipitation':
      return { min: 0, max: 500 };
    default:
      return { min: 0, max: 100 };
  }
}

function processData(input: WorkerInput): ParticleData {
  const { records, variable, particleCount } = input;
  const grid = buildGrid(records);
  const { min, max } = getValueRange(variable);
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const velocities = new Float32Array(particleCount * 3);
  const latlons = new Float32Array(particleCount * 2);
  
  const radius = 2.0;
  
  for (let i = 0; i < particleCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const lat = Math.acos(2 * v - 1) * (180 / Math.PI) - 90;
    const lon = u * 360 - 180;
    
    const value = interpolateFromGrid(grid, lat, lon);
    const color = getColorForValue(value, min, max, variable);
    
    const [x, y, z] = latLonToCartesian(lat, lon, radius + 0.01);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    sizes[i] = 1 + Math.random() * 2;
    
    const latSpeed = (Math.random() - 0.5) * 0.02;
    const lonSpeed = (Math.random() - 0.5) * 0.02;
    velocities[i * 3] = latSpeed;
    velocities[i * 3 + 1] = lonSpeed;
    velocities[i * 3 + 2] = 0;
    
    latlons[i * 2] = lat;
    latlons[i * 2 + 1] = lon;
  }
  
  return { positions, colors, sizes, velocities, latlons };
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  try {
    const result = processData(e.data);
    self.postMessage(result, [
      result.positions.buffer,
      result.colors.buffer,
      result.sizes.buffer,
      result.velocities.buffer,
      result.latlons.buffer,
    ]);
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};

export {};
