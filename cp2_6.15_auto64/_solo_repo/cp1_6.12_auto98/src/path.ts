import * as THREE from 'three';

export interface TrackPoint {
  lat: number;
  lng: number;
  ele: number;
}

export interface PathData {
  points: THREE.Vector3[];
  colors: Float32Array;
  distances: number[];
  totalDistance: number;
  totalAscent: number;
  elevations: number[];
  minEle: number;
  maxEle: number;
}

const MAX_POINTS = 200;
const INTERPOLATION_STEP = 0.5;

export function parseCSV(text: string): TrackPoint[] {
  const lines = text.trim().split('\n');
  const points: TrackPoint[] = [];
  let startIdx = 0;
  if (lines.length > 0) {
    const firstLine = lines[0].toLowerCase().trim();
    if (firstLine.includes('lat') || firstLine.includes('lng') || firstLine.includes('ele')) {
      startIdx = 1;
    }
  }
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const ele = parseFloat(parts[2]);
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(ele)) {
        points.push({ lat, lng, ele });
      }
    }
  }
  return points;
}

export function parseManualInput(text: string): TrackPoint[] {
  const lines = text.trim().split('\n');
  const points: TrackPoint[] = [];
  for (const line of lines) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const ele = parseFloat(parts[2]);
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(ele)) {
        points.push({ lat, lng, ele });
      }
    }
  }
  return points;
}

export function downsamplePoints(points: TrackPoint[], maxCount: number): TrackPoint[] {
  if (points.length <= maxCount) return points;
  const result: TrackPoint[] = [];
  const step = (points.length - 1) / (maxCount - 1);
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.min(Math.round(i * step), points.length - 1);
    result.push(points[idx]);
  }
  return result;
}

function toLocalCoordinates(points: TrackPoint[]): THREE.Vector3[] {
  if (points.length === 0) return [];
  const originLat = points[0].lat;
  const originLng = points[0].lng;
  const latScale = 111320;
  const lngScale = 111320 * Math.cos((originLat * Math.PI) / 180);
  return points.map((p) => {
    const x = (p.lng - originLng) * lngScale;
    const z = (p.lat - originLat) * latScale;
    const y = p.ele;
    return new THREE.Vector3(x, y, z);
  });
}

function altitudeColor(t: number): THREE.Color {
  const color = new THREE.Color();
  if (t < 0.25) {
    const s = t / 0.25;
    color.setRGB(0, s, 1 - s);
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    color.setRGB(s, 1, 0);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    color.setRGB(1, 1 - s, 0);
  } else {
    const s = (t - 0.75) / 0.25;
    color.setRGB(1, 0, 0);
  }
  return color;
}

export function buildPathData(rawPoints: TrackPoint[]): PathData {
  const points = downsamplePoints(rawPoints, MAX_POINTS);
  const localPoints = toLocalCoordinates(points);

  if (localPoints.length < 2) {
    return {
      points: localPoints,
      colors: new Float32Array(0),
      distances: [0],
      totalDistance: 0,
      totalAscent: 0,
      elevations: points.map((p) => p.ele),
      minEle: 0,
      maxEle: 0,
    };
  }

  const curve = new THREE.CatmullRomCurve3(localPoints, false, 'catmullrom', 0.5);
  const totalLength = curve.getLength();
  const numSegments = Math.max(2, Math.ceil(totalLength / INTERPOLATION_STEP));
  const sampledPoints = curve.getSpacedPoints(numSegments);

  const minEle = Math.min(...sampledPoints.map((p) => p.y));
  const maxEle = Math.max(...sampledPoints.map((p) => p.y));
  const eleRange = maxEle - minEle || 1;

  const colors = new Float32Array(sampledPoints.length * 3);
  for (let i = 0; i < sampledPoints.length; i++) {
    const t = (sampledPoints[i].y - minEle) / eleRange;
    const c = altitudeColor(t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const distances: number[] = [0];
  let totalDist = 0;
  for (let i = 1; i < sampledPoints.length; i++) {
    const dx = sampledPoints[i].x - sampledPoints[i - 1].x;
    const dy = sampledPoints[i].y - sampledPoints[i - 1].y;
    const dz = sampledPoints[i].z - sampledPoints[i - 1].z;
    totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
    distances.push(totalDist);
  }

  let totalAscent = 0;
  const elevations: number[] = [];
  for (let i = 0; i < sampledPoints.length; i++) {
    elevations.push(sampledPoints[i].y);
    if (i > 0) {
      const diff = sampledPoints[i].y - sampledPoints[i - 1].y;
      if (diff > 0) totalAscent += diff;
    }
  }

  return {
    points: sampledPoints,
    colors,
    distances,
    totalDistance: totalDist,
    totalAscent,
    elevations,
    minEle,
    maxEle,
  };
}
