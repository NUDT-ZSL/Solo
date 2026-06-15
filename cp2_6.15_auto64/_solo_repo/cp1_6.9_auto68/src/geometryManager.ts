import * as THREE from 'three';

export interface GeometryConfig {
  lineCount: number;
  warmColor: string;
  coolColor: string;
  wavePeriod: number;
  hueShiftRange: number;
  distributionRadius: number;
}

export interface GeometryData {
  id: 'cube' | 'sphere' | 'torus';
  group: THREE.Group;
  lines: THREE.Line[];
  haloPoints: THREE.Points;
  originalStarts: THREE.Vector3[];
  originalEnds: THREE.Vector3[];
  normals: THREE.Vector3[];
  hoverProgress: number;
  targetHoverProgress: number;
  boundingMesh: THREE.Mesh;
  curvePointsCache: THREE.Vector3[][] | null;
  curveCacheProgress: number;
  timeOffset: number;
}

const DEFAULT_CONFIG: GeometryConfig = {
  lineCount: 65,
  warmColor: '#FF6B35',
  coolColor: '#2B2D42',
  wavePeriod: 2,
  hueShiftRange: 30,
  distributionRadius: 5
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpColor(
  out: THREE.Color,
  a: THREE.Color,
  b: THREE.Color,
  t: number
): THREE.Color {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
  return out;
}

function hslToRgb(h: number, s: number, l: number, out: THREE.Color): THREE.Color {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  out.r = r + m;
  out.g = g + m;
  out.b = b + m;
  return out;
}

function getHslFromColor(color: THREE.Color): { h: number; s: number; l: number } {
  const r = color.r,
    g = color.g,
    b = color.b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, l };
}

export class GeometryManager {
  private scene: THREE.Scene;
  private config: GeometryConfig;
  private geometries: GeometryData[] = [];
  private lineThickness = 2;
  private rotationSpeed = 0.3;
  private fadeInProgress = 0;
  private warmBase: THREE.Color;
  private coolBase: THREE.Color;

  constructor(scene: THREE.Scene, config?: Partial<GeometryConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.warmBase = new THREE.Color(this.config.warmColor);
    this.coolBase = new THREE.Color(this.config.coolColor);
  }

  init(): void {
    this.createAxesHelper();
    const ids: Array<'cube' | 'sphere' | 'torus'> = ['cube', 'sphere', 'torus'];
    const positions = this.distributeOnSphere(3, this.config.distributionRadius);
    ids.forEach((id, i) => {
      const data = this.buildGeometry(id, positions[i], i);
      this.geometries.push(data);
      this.scene.add(data.group);
    });
  }

  private createAxesHelper(): void {
    const len = 2;
    const makeAxis = (dir: THREE.Vector3, color: number) => {
      const positions = new Float32Array(2 * 3);
      positions[0] = 0;
      positions[1] = 0;
      positions[2] = 0;
      positions[3] = dir.x * len;
      positions[4] = dir.y * len;
      positions[5] = dir.z * len;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 2
      });
      return new THREE.Line(geom, mat);
    };
    const group = new THREE.Group();
    group.add(makeAxis(new THREE.Vector3(1, 0, 0), 0xff3333));
    group.add(makeAxis(new THREE.Vector3(0, 1, 0), 0x33ff55));
    group.add(makeAxis(new THREE.Vector3(0, 0, 1), 0x4466ff));

    const haloGeom = new THREE.BufferGeometry();
    const haloPos = new Float32Array(3 * 3);
    haloGeom.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    const haloMat = new THREE.PointsMaterial({
      size: 0.22,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloColors = new Float32Array(3 * 3);
    const red = new THREE.Color(0xff5555);
    const green = new THREE.Color(0x55ff77);
    const blue = new THREE.Color(0x6688ff);
    haloColors[0] = red.r;
    haloColors[1] = red.g;
    haloColors[2] = red.b;
    haloColors[3] = green.r;
    haloColors[4] = green.g;
    haloColors[5] = green.b;
    haloColors[6] = blue.r;
    haloColors[7] = blue.g;
    haloColors[8] = blue.b;
    haloGeom.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
    (haloGeom.attributes.position as THREE.BufferAttribute).setXYZ(0, len, 0, 0);
    (haloGeom.attributes.position as THREE.BufferAttribute).setXYZ(1, 0, len, 0);
    (haloGeom.attributes.position as THREE.BufferAttribute).setXYZ(2, 0, 0, len);
    haloGeom.attributes.position.needsUpdate = true;
    group.add(new THREE.Points(haloGeom, haloMat));

    this.scene.add(group);
  }

  private distributeOnSphere(count: number, radius: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      pts.push(new THREE.Vector3(x * radius, y * radius, z * radius * 0.8));
    }
    return pts;
  }

  private buildGeometry(
    id: 'cube' | 'sphere' | 'torus',
    center: THREE.Vector3,
    index: number
  ): GeometryData {
    const group = new THREE.Group();
    group.position.copy(center);

    const radius = 1.6;
    let boundingGeom: THREE.BufferGeometry;
    let sampleSurface: (t: number, s: number) => { point: THREE.Vector3; normal: THREE.Vector3 };

    if (id === 'cube') {
      boundingGeom = new THREE.BoxGeometry(radius * 2, radius * 2, radius * 2);
      sampleSurface = (t: number, s: number) => this.sampleCube(radius, t, s);
    } else if (id === 'sphere') {
      boundingGeom = new THREE.SphereGeometry(radius * 1.05, 32, 24);
      sampleSurface = (t: number, s: number) => this.sampleSphere(radius, t, s);
    } else {
      boundingGeom = new THREE.TorusGeometry(radius, radius * 0.45, 16, 48);
      sampleSurface = (t: number, s: number) => this.sampleTorus(radius, radius * 0.45, t, s);
    }

    const boundingMat = new THREE.MeshBasicMaterial({
      visible: false,
      color: 0xffffff
    });
    const boundingMesh = new THREE.Mesh(boundingGeom, boundingMat);
    boundingMesh.userData.geometryId = id;
    group.add(boundingMesh);

    const lines: THREE.Line[] = [];
    const originalStarts: THREE.Vector3[] = [];
    const originalEnds: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];

    const lineCount =
      id === 'cube' ? 56 : id === 'sphere' ? 72 : 64;

    for (let i = 0; i < lineCount; i++) {
      const t1 = (i + 0.2) / lineCount + (Math.random() - 0.5) * 0.008;
      const s1 = Math.random();
      const t2 = t1 + 0.5 + (Math.random() - 0.5) * 0.15;
      const s2 = Math.random();

      const a = sampleSurface(t1, s1);
      const b = sampleSurface(t2, s2);

      originalStarts.push(a.point.clone());
      originalEnds.push(b.point.clone());
      const midNormal = a.normal
        .clone()
        .add(b.normal)
        .multiplyScalar(0.5)
        .normalize();
      normals.push(midNormal);

      const line = this.buildLine(a.point, b.point, i, lineCount, index);
      lines.push(line);
      group.add(line);
    }

    const haloPoints = this.buildHalo(originalStarts, originalEnds, index);
    group.add(haloPoints);

    return {
      id,
      group,
      lines,
      haloPoints,
      originalStarts,
      originalEnds,
      normals,
      hoverProgress: 0,
      targetHoverProgress: 0,
      boundingMesh,
      curvePointsCache: null,
      curveCacheProgress: -1,
      timeOffset: Math.random() * Math.PI * 2
    };
  }

  private buildLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    idx: number,
    total: number,
    geomIndex: number
  ): THREE.Line {
    const segments = 28;
    const positions = new Float32Array((segments + 1) * 3);
    const colors = new Float32Array((segments + 1) * 3);
    const dir = end.clone().sub(start);

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const px = start.x + dir.x * t;
      const py = start.y + dir.y * t;
      const pz = start.z + dir.z * t;
      positions[s * 3] = px;
      positions[s * 3 + 1] = py;
      positions[s * 3 + 2] = pz;

      const hueOffset = (idx / total + geomIndex * 0.33 + t * 0.5) % 1;
      const color = this.lineColorAt(hueOffset, 0, geomIndex);
      colors[s * 3] = color.r;
      colors[s * 3 + 1] = color.g;
      colors[s * 3 + 2] = color.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: this.lineThickness
    });

    return new THREE.Line(geom, mat);
  }

  private buildHalo(
    starts: THREE.Vector3[],
    ends: THREE.Vector3[],
    geomIndex: number
  ): THREE.Points {
    const count = starts.length + ends.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor =
      geomIndex === 0
        ? new THREE.Color('#FF9B6B')
        : geomIndex === 1
        ? new THREE.Color('#7A8CFF')
        : new THREE.Color('#C97BFF');

    for (let i = 0; i < starts.length; i++) {
      const si = i * 2;
      positions[si * 3] = starts[i].x;
      positions[si * 3 + 1] = starts[i].y;
      positions[si * 3 + 2] = starts[i].z;
      colors[si * 3] = baseColor.r;
      colors[si * 3 + 1] = baseColor.g;
      colors[si * 3 + 2] = baseColor.b;
      sizes[si] = 0.18;

      const ei = i * 2 + 1;
      positions[ei * 3] = ends[i].x;
      positions[ei * 3 + 1] = ends[i].y;
      positions[ei * 3 + 2] = ends[i].z;
      colors[ei * 3] = baseColor.r;
      colors[ei * 3 + 1] = baseColor.g;
      colors[ei * 3 + 2] = baseColor.b;
      sizes[ei] = 0.12;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    return new THREE.Points(geom, mat);
  }

  private sampleCube(
    r: number,
    t: number,
    s: number
  ): { point: THREE.Vector3; normal: THREE.Vector3 } {
    const face = Math.floor((t * 6) % 6);
    const u = s * 2 - 1;
    const v = ((t * 6) % 1) * 2 - 1;
    let point = new THREE.Vector3();
    let normal = new THREE.Vector3();
    switch (face) {
      case 0:
        point = new THREE.Vector3(r, u * r, v * r);
        normal = new THREE.Vector3(1, 0, 0);
        break;
      case 1:
        point = new THREE.Vector3(-r, u * r, v * r);
        normal = new THREE.Vector3(-1, 0, 0);
        break;
      case 2:
        point = new THREE.Vector3(u * r, r, v * r);
        normal = new THREE.Vector3(0, 1, 0);
        break;
      case 3:
        point = new THREE.Vector3(u * r, -r, v * r);
        normal = new THREE.Vector3(0, -1, 0);
        break;
      case 4:
        point = new THREE.Vector3(u * r, v * r, r);
        normal = new THREE.Vector3(0, 0, 1);
        break;
      default:
        point = new THREE.Vector3(u * r, v * r, -r);
        normal = new THREE.Vector3(0, 0, -1);
    }
    return { point, normal };
  }

  private sampleSphere(
    r: number,
    t: number,
    s: number
  ): { point: THREE.Vector3; normal: THREE.Vector3 } {
    const phi = t * Math.PI * 2;
    const theta = Math.acos(2 * s - 1);
    const normal = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );
    const point = normal.clone().multiplyScalar(r);
    return { point, normal };
  }

  private sampleTorus(
    R: number,
    r: number,
    t: number,
    s: number
  ): { point: THREE.Vector3; normal: THREE.Vector3 } {
    const u = t * Math.PI * 2;
    const v = s * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);
    const tubeCenter = new THREE.Vector3(cosU * R, 0, sinU * R);
    const radialDir = new THREE.Vector3(cosU * cosV, sinV, sinU * cosV);
    const point = tubeCenter.clone().add(radialDir.clone().multiplyScalar(r));
    const normal = radialDir.clone().normalize();
    return { point, normal };
  }

  private lineColorAt(
    baseHueT: number,
    time: number,
    geomIndex: number
  ): THREE.Color {
    const warmHsl = getHslFromColor(this.warmBase);
    const coolHsl = getHslFromColor(this.coolBase);
    const wave = Math.sin(
      (time / this.config.wavePeriod) * Math.PI * 2 + baseHueT * Math.PI * 4
    );
    const hueShift = wave * (this.config.hueShiftRange / 360);
    const t = (baseHueT + hueShift + 1) % 1;
    const h = warmHsl.h + (coolHsl.h - warmHsl.h) * t + hueShift * 360 * 0.5;
    const s = warmHsl.s + (coolHsl.s - warmHsl.s) * t;
    const l = warmHsl.l + (coolHsl.l - warmHsl.l) * t + 0.08 * wave;
    const out = new THREE.Color();
    hslToRgb(h, s, Math.max(0.32, Math.min(0.82, l)), out);
    void geomIndex;
    return out;
  }

  getGeometries(): GeometryData[] {
    return this.geometries;
  }

  getBoundingMeshes(): THREE.Mesh[] {
    return this.geometries.map((g) => g.boundingMesh);
  }

  setLineThickness(px: number): void {
    this.lineThickness = px;
    for (const geom of this.geometries) {
      for (const line of geom.lines) {
        (line.material as THREE.LineBasicMaterial).linewidth = px;
      }
    }
  }

  setRotationSpeed(radPerSec: number): void {
    this.rotationSpeed = radPerSec;
  }

  setFadeInProgress(t: number): void {
    this.fadeInProgress = t;
    const opacity = easeInOutCubic(t);
    for (const geom of this.geometries) {
      for (const line of geom.lines) {
        (line.material as THREE.LineBasicMaterial).opacity = opacity * 0.92;
      }
      (geom.haloPoints.material as THREE.PointsMaterial).opacity = opacity * 0.6;
    }
  }

  getLineThickness(): number {
    return this.lineThickness;
  }

  getRotationSpeed(): number {
    return this.rotationSpeed;
  }

  private rebuildCurveForLine(
    data: GeometryData,
    lineIdx: number,
    progress: number
  ): THREE.Vector3[] {
    const start = data.originalStarts[lineIdx];
    const end = data.originalEnds[lineIdx];
    const normal = data.normals[lineIdx];

    const turns = 2 + ((lineIdx * 0.31) % 1);
    const segments = 36;
    const pts: THREE.Vector3[] = [];

    const radiateDist = 1.5 * progress;
    const seed = lineIdx * 7.13;
    const tangentA = new THREE.Vector3(
      normal.y - normal.z,
      normal.z - normal.x,
      normal.x - normal.y
    ).normalize();
    const tangentB = new THREE.Vector3().crossVectors(normal, tangentA).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const base = new THREE.Vector3().lerpVectors(start, end, t);
      const outwardT = Math.sin(t * Math.PI);
      const radiateOffset = normal
        .clone()
        .multiplyScalar(outwardT * radiateDist * (0.8 + 0.6 * Math.sin(seed + t * 6)));

      const angle = t * turns * Math.PI * 2 + seed;
      const wrapRadius = progress * (0.35 + 0.2 * Math.sin(seed * 1.7 + t * 3));
      const wrapOffset = new THREE.Vector3()
        .addScaledVector(tangentA, Math.cos(angle) * wrapRadius)
        .addScaledVector(tangentB, Math.sin(angle) * wrapRadius);

      const wave = new THREE.Vector3(
        Math.sin(t * 8 + seed * 0.5) * 0.05 * progress,
        Math.cos(t * 9 + seed * 0.3) * 0.05 * progress,
        Math.sin(t * 7 + seed * 0.7) * 0.05 * progress
      );

      pts.push(base.add(radiateOffset).add(wrapOffset).add(wave));
    }

    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
    const fineCount = 48;
    return curve.getPoints(fineCount);
  }

  ensureCurvesCached(data: GeometryData, progress: number): void {
    const key = Math.round(progress * 20) / 20;
    if (data.curvePointsCache && Math.abs(data.curveCacheProgress - key) < 0.001) {
      return;
    }
    const cache: THREE.Vector3[][] = [];
    for (let i = 0; i < data.lines.length; i++) {
      cache.push(this.rebuildCurveForLine(data, i, progress));
    }
    data.curvePointsCache = cache;
    data.curveCacheProgress = key;
  }

  update(delta: number, time: number, colorSpeedMul: number): void {
    const rotStep = this.rotationSpeed * delta;
    const t = time * colorSpeedMul;

    for (let gi = 0; gi < this.geometries.length; gi++) {
      const g = this.geometries[gi];
      g.group.rotation.y += rotStep * (0.7 + gi * 0.2);
      g.group.rotation.x += rotStep * 0.3 * (gi === 1 ? -1 : 1);

      let displayProgress = g.hoverProgress;
      if (g.targetHoverProgress !== g.hoverProgress) {
        const wrapDur = 1.5;
        const recoverDur = 0.8;
        const forward = g.targetHoverProgress > g.hoverProgress;
        const dt = delta / (forward ? wrapDur : recoverDur);
        g.hoverProgress = Math.max(
          0,
          Math.min(1, g.hoverProgress + (forward ? dt : -dt))
        );
        displayProgress = easeInOutCubic(g.hoverProgress);
      }

      this.ensureCurvesCached(g, displayProgress);
      const cache = g.curvePointsCache!;

      for (let li = 0; li < g.lines.length; li++) {
        const line = g.lines[li];
        const curvePts = cache[li];
        const geom = line.geometry as THREE.BufferGeometry;
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const colorAttr = geom.attributes.color as THREE.BufferAttribute;
        const curveCount = curvePts.length;
        const targetCount = (posAttr.array.length / 3) | 0;
        if (curveCount !== targetCount) {
          const newPos = new Float32Array(curveCount * 3);
          const newCol = new Float32Array(curveCount * 3);
          for (let p = 0; p < curveCount; p++) {
            const v = curvePts[p];
            newPos[p * 3] = v.x;
            newPos[p * 3 + 1] = v.y;
            newPos[p * 3 + 2] = v.z;
            const hueBase = (li / g.lines.length + gi * 0.33 + p / curveCount * 0.5) % 1;
            const col = this.lineColorAt(hueBase, t + g.timeOffset, gi);
            newCol[p * 3] = col.r;
            newCol[p * 3 + 1] = col.g;
            newCol[p * 3 + 2] = col.b;
          }
          geom.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
          geom.setAttribute('color', new THREE.BufferAttribute(newCol, 3));
          posAttr.needsUpdate = true;
          colorAttr.needsUpdate = true;
        } else {
          const posArr = posAttr.array as Float32Array;
          const colArr = colorAttr.array as Float32Array;
          for (let p = 0; p < curveCount; p++) {
            const v = curvePts[p];
            posArr[p * 3] = v.x;
            posArr[p * 3 + 1] = v.y;
            posArr[p * 3 + 2] = v.z;
            const hueBase = (li / g.lines.length + gi * 0.33 + p / curveCount * 0.5) % 1;
            const col = this.lineColorAt(hueBase, t + g.timeOffset, gi);
            colArr[p * 3] = col.r;
            colArr[p * 3 + 1] = col.g;
            colArr[p * 3 + 2] = col.b;
          }
          posAttr.needsUpdate = true;
          colorAttr.needsUpdate = true;
        }

        const mat = line.material as THREE.LineBasicMaterial;
        const pulse =
          1 +
          0.15 *
            Math.sin(t * Math.PI * 2 + (li / g.lines.length) * Math.PI * 4 + g.timeOffset);
        mat.linewidth = this.lineThickness * pulse * (1 + displayProgress * 0.6);

        const haloPos = g.haloPoints.geometry.attributes.position as THREE.BufferAttribute;
        const haloArr = haloPos.array as Float32Array;
        const s = curvePts[0];
        const e = curvePts[curvePts.length - 1];
        haloArr[li * 6] = s.x;
        haloArr[li * 6 + 1] = s.y;
        haloArr[li * 6 + 2] = s.z;
        haloArr[li * 6 + 3] = e.x;
        haloArr[li * 6 + 4] = e.y;
        haloArr[li * 6 + 5] = e.z;
        haloPos.needsUpdate = true;
      }

      const haloMat = g.haloPoints.material as THREE.PointsMaterial;
      haloMat.opacity = Math.min(
        0.9,
        this.fadeInProgress * (0.5 + displayProgress * 0.5)
      );
      haloMat.size = 0.18 * (1 + displayProgress * 0.7);
    }
  }

  setHoverTarget(id: string, hovering: boolean): void {
    const data = this.geometries.find((g) => g.id === id);
    if (data) {
      data.targetHoverProgress = hovering ? 1 : 0;
    }
  }

  clearCurvesCache(): void {
    for (const g of this.geometries) {
      g.curvePointsCache = null;
      g.curveCacheProgress = -1;
    }
  }
}

void lerpColor;
