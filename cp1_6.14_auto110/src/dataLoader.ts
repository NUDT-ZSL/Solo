export interface Epoch {
  name: string;
  time: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ContinentKeyframe {
  time: number;
  vertices: number[][];
}

export interface ContinentData {
  id: string;
  name: string;
  color: string;
  keyframes: ContinentKeyframe[];
}

export interface BoundaryKeyframe {
  time: number;
  segments: number[][];
}

export interface PlateBoundaryData {
  id: string;
  type: "convergent" | "divergent" | "transform";
  plateA: string;
  plateB: string;
  description: string;
  segments: number[][];
  keyframes: BoundaryKeyframe[];
}

export interface ConfigData {
  epochs: Epoch[];
  continents: ContinentData[];
  plateBoundaries: PlateBoundaryData[];
}

export function latLngToVec3(lng: number, lat: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

export function loadConfig(): Promise<ConfigData> {
  return fetch("/config.json").then((res) => res.json());
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function findKeyframePair<T extends { time: number }>(keyframes: T[], time: number): [T, T, number] {
  if (keyframes.length === 0) {
    throw new Error("No keyframes");
  }
  if (keyframes.length === 1) {
    return [keyframes[0], keyframes[0], 0];
  }
  let left = keyframes[0];
  let right = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      left = keyframes[i];
      right = keyframes[i + 1];
      break;
    }
  }
  if (time < keyframes[0].time) {
    left = keyframes[0];
    right = keyframes[0];
  }
  if (time > keyframes[keyframes.length - 1].time) {
    left = keyframes[keyframes.length - 1];
    right = keyframes[keyframes.length - 1];
  }
  const total = right.time - left.time;
  const t = total === 0 ? 0 : (time - left.time) / total;
  const smoothT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return [left, right, smoothT];
}

export function interpolateContinent(continent: ContinentData, time: number): Float32Array {
  const sorted = [...continent.keyframes].sort((a, b) => a.time - b.time);
  const [left, right, t] = findKeyframePair(sorted, time);

  const maxLen = Math.max(left.vertices.length, right.vertices.length);
  const positions: number[] = [];

  for (let i = 0; i < maxLen; i++) {
    const lv = left.vertices[i] || left.vertices[left.vertices.length - 1];
    const rv = right.vertices[i] || right.vertices[right.vertices.length - 1];
    const lng = lerp(lv[0], rv[0], t);
    const lat = lerp(lv[1], rv[1], t);
    const [x, y, z] = latLngToVec3(lng, lat, 2.005);
    positions.push(x, y, z);
  }

  return new Float32Array(positions);
}

export function interpolateBoundary(boundary: PlateBoundaryData, time: number): Float32Array {
  const kfs = boundary.keyframes && boundary.keyframes.length > 0 ? boundary.keyframes : [{ time: 0, segments: boundary.segments }];
  const sorted = [...kfs].sort((a, b) => a.time - b.time);
  const [left, right, t] = findKeyframePair(sorted, time);

  const maxLen = Math.max(left.segments.length, right.segments.length);
  const positions: number[] = [];

  for (let i = 0; i < maxLen; i++) {
    const lv = left.segments[i] || left.segments[left.segments.length - 1];
    const rv = right.segments[i] || right.segments[right.segments.length - 1];
    const lng = lerp(lv[0], rv[0], t);
    const lat = lerp(lv[1], rv[1], t);
    const [x, y, z] = latLngToVec3(lng, lat, 2.01);
    positions.push(x, y, z);
  }

  return new Float32Array(positions);
}

export function getCurrentEpoch(epochs: Epoch[], time: number): Epoch {
  const sorted = [...epochs].sort((a, b) => a.time - b.time);
  let result = sorted[0];
  for (const e of sorted) {
    if (time >= e.time) {
      result = e;
    }
  }
  return result;
}

export function continentCentroid(data: ContinentData, time: number): [number, number, number] {
  const verts = interpolateContinent(data, time);
  let cx = 0, cy = 0, cz = 0;
  const count = verts.length / 3;
  for (let i = 0; i < count; i++) {
    cx += verts[i * 3];
    cy += verts[i * 3 + 1];
    cz += verts[i * 3 + 2];
  }
  return [cx / count, cy / count, cz / count];
}
