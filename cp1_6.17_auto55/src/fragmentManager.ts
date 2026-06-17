import * as THREE from 'three';
import { eventBus } from './eventBus';

export interface FragmentData {
  id: number;
  mesh: THREE.Mesh;
  outline: THREE.LineSegments;
  glowMesh: THREE.Mesh;
  heatMapMesh: THREE.Mesh | null;
  heatMapAnimCancel: (() => void) | null;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
  breakEdges: THREE.Vector3[][];
  breakEdgeSurfaceVertices: number[][];
  jointedIds: number[];
  isSelected: boolean;
  isJointed: boolean;
}

const FRAGMENT_COUNT = 6;

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
  int(min: number, max: number): number { return Math.floor(this.range(min, max + 1)); }
}

class PerlinNoise {
  private perm: number[] = [];
  private gradP: { x: number; y: number; z: number }[] = [];

  private static grad3 = [
    { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
    { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
    { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 }
  ];

  constructor(seed: number) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let n: number;
    let q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = p[i]; p[i] = p[n]; p[n] = q;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.gradP[i] = PerlinNoise.grad3[this.perm[i] % 12];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b;
  }

  noise2D(x: number, y: number): number {
    let X = Math.floor(x);
    let Y = Math.floor(y);
    x = x - X;
    y = y - Y;
    X = X & 255;
    Y = Y & 255;

    const n00 = this.dotGridGradient(X, Y, x, y);
    const n01 = this.dotGridGradient(X, Y + 1, x, y - 1);
    const n10 = this.dotGridGradient(X + 1, Y, x - 1, y);
    const n11 = this.dotGridGradient(X + 1, Y + 1, x - 1, y - 1);

    const u = this.fade(x);
    const v = this.fade(y);

    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), v);
  }

  private dotGridGradient(ix: number, iy: number, x: number, y: number): number {
    const g = this.gradP[ix + this.perm[iy]];
    return g.x * x + g.y * y;
  }

  fbm2D(x: number, y: number, octaves: number = 5, lacunarity: number = 2.0, gain: number = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }
}

export class FragmentManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fragments: Map<number, FragmentData> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedId: number | null = null;
  private isDragging: boolean = false;
  private isRotatingView: boolean = false;
  private previousMouse: THREE.Vector2 = new THREE.Vector2();
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 4;
  private cameraDistance: number = 12;

  private boundHandlers: {
    onMouseDown: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: () => void;
    onWheel: (e: WheelEvent) => void;
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
    onContext: (e: MouseEvent) => void;
  } | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.createFragments();
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private createVaseProfile(): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    const segments = 28;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let radius: number;
      const height = t * 5 - 2.5;
      if (t < 0.08) {
        radius = 0.85 + (1.85 - 0.85) * (t / 0.08);
      } else if (t < 0.32) {
        radius = 1.85 + (2.45 - 1.85) * ((t - 0.08) / 0.24);
      } else if (t < 0.62) {
        const s = (t - 0.32) / 0.3;
        radius = 2.45 - 0.7 * Math.sin(s * Math.PI);
      } else if (t < 0.84) {
        radius = 1.75 - (1.75 - 1.05) * ((t - 0.62) / 0.22);
      } else {
        radius = 1.05 - (1.05 - 0.55) * ((t - 0.84) / 0.16);
      }
      points.push(new THREE.Vector2(radius, height));
    }
    return points;
  }

  private buildFragmentWithJaggedEdges(
    profile: THREE.Vector2[],
    startAngle: number,
    endAngle: number,
    fragmentId: number
  ): {
    geometry: THREE.BufferGeometry;
    breakEdges: THREE.Vector3[][];
    breakEdgeSurfaceVertexIndices: number[][];
  } {
    const rng = new SeededRandom(fragmentId * 1337 + 42);
    const edgeNoise = new PerlinNoise(fragmentId * 92821 + 7);
    const surfaceNoise = new PerlinNoise(fragmentId * 34543 + 13);
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const outerBreakLeft: THREE.Vector3[] = [];
    const outerBreakRight: THREE.Vector3[] = [];
    const breakLeftVertexIdx: number[] = [];
    const breakRightVertexIdx: number[] = [];

    const radialSeg = 20;
    const heightSeg = profile.length - 1;
    const angleSpan = endAngle - startAngle;
    const wallThickness = 0.08;
    const jaggedAmplitude = 0.28;
    const jaggedFreq = 5;

    const leftEdgeOffsetX = new Array(heightSeg + 1).fill(0).map((_, h) => {
      const n = edgeNoise.fbm2D(h * 0.35 + fragmentId * 1.7, fragmentId * 3.1, 5, 2.2, 0.48);
      return n * jaggedAmplitude;
    });
    const rightEdgeOffsetX = new Array(heightSeg + 1).fill(0).map((_, h) => {
      const n = edgeNoise.fbm2D(h * 0.35 + fragmentId * 2.3, fragmentId * 4.7, 5, 2.2, 0.48);
      return n * jaggedAmplitude;
    });
    const surfaceBump = (h: number, r: number): number => {
      const n = surfaceNoise.fbm2D(h * 0.55 + fragmentId * 0.8, r * 0.4 + fragmentId * 1.3, 5, 2.1, 0.52);
      return n * 0.045 + rng.range(-0.005, 0.005);
    };

    for (let h = 0; h <= heightSeg; h++) {
      for (let r = 0; r <= radialSeg; r++) {
        const tAngle = r / radialSeg;
        let localAngle = startAngle + tAngle * angleSpan;

        if (r === 0) localAngle += leftEdgeOffsetX[h] / Math.max(0.5, profile[h].x);
        if (r === radialSeg) localAngle += rightEdgeOffsetX[h] / Math.max(0.5, profile[h].x);

        const bump = surfaceBump(h, r);
        const rad = profile[h].x + bump;
        const y = profile[h].y;
        const x = rad * Math.cos(localAngle);
        const z = rad * Math.sin(localAngle);
        const nx = Math.cos(localAngle);
        const nz = Math.sin(localAngle);

        const idx = positions.length / 3;
        positions.push(x, y, z);
        normals.push(nx, 0, nz);
        uvs.push(r / radialSeg, h / heightSeg);

        if (r === 0) {
          outerBreakLeft.push(new THREE.Vector3(x, y, z));
          breakLeftVertexIdx.push(idx);
        }
        if (r === radialSeg) {
          outerBreakRight.push(new THREE.Vector3(x, y, z));
          breakRightVertexIdx.push(idx);
        }
      }
    }

    const innerOffset = positions.length / 3;
    const innerBreakLeftVertexIdx: number[] = [];
    const innerBreakRightVertexIdx: number[] = [];

    for (let h = 0; h <= heightSeg; h++) {
      for (let r = 0; r <= radialSeg; r++) {
        const tAngle = r / radialSeg;
        let localAngle = startAngle + tAngle * angleSpan;
        if (r === 0) localAngle += leftEdgeOffsetX[h] / Math.max(0.5, profile[h].x);
        if (r === radialSeg) localAngle += rightEdgeOffsetX[h] / Math.max(0.5, profile[h].x);

        const bump = surfaceBump(h, r);
        const rad = profile[h].x * (1 - wallThickness / profile[h].x) + bump * 0.6;
        const y = profile[h].y;
        const x = rad * Math.cos(localAngle);
        const z = rad * Math.sin(localAngle);
        const nx = -Math.cos(localAngle);
        const nz = -Math.sin(localAngle);

        const idx = positions.length / 3;
        positions.push(x, y, z);
        normals.push(nx, 0, nz);
        uvs.push(r / radialSeg, h / heightSeg);

        if (r === 0) innerBreakLeftVertexIdx.push(idx);
        if (r === radialSeg) innerBreakRightVertexIdx.push(idx);
      }
    }

    const rowStride = radialSeg + 1;
    for (let h = 0; h < heightSeg; h++) {
      for (let r = 0; r < radialSeg; r++) {
        const a = h * rowStride + r;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    for (let h = 0; h < heightSeg; h++) {
      for (let r = 0; r < radialSeg; r++) {
        const a = innerOffset + h * rowStride + r;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const buildBreakSurface = (
      outerIdx: number[],
      innerIdx: number[],
      breakNoise: PerlinNoise,
      inward: boolean
    ) => {
      const baseCount = outerIdx.length;
      const jagSegs = 6;
      const surfacePositions: number[] = [];
      const surfaceStart = positions.length / 3;
      const jaggedVertexIndices: number[] = [];

      for (let layer = 0; layer < baseCount; layer++) {
        const ov = outerIdx[layer];
        const iv = innerIdx[layer];
        const ox = positions[ov * 3];
        const oy = positions[ov * 3 + 1];
        const oz = positions[ov * 3 + 2];
        const ix = positions[iv * 3];
        const iy = positions[iv * 3 + 1];
        const iz = positions[iv * 3 + 2];

        for (let s = 0; s <= jagSegs; s++) {
          const t = s / jagSegs;
          let jx = ox + (ix - ox) * t;
          let jy = oy + (iy - oy) * t;
          let jz = oz + (iz - oz) * t;

          if (s > 0 && s < jagSegs) {
            const n1 = breakNoise.fbm2D(layer * 0.45 + s * 0.8, t * 3.2, 4, 2.0, 0.55);
            const n2 = breakNoise.fbm2D(layer * 0.37 + s * 1.1 + 100, t * 2.8 + 50, 4, 2.0, 0.55);
            const midT = 1 - Math.abs(t - 0.5) * 2;
            const bumpMag = 0.12 * midT;
            const yBumpMag = 0.09 * midT;
            jx += n1 * bumpMag * (inward ? 1 : -1);
            jy += n2 * yBumpMag;
            jz += n1 * bumpMag * 0.4 * midT;
          }

          const ang = Math.atan2(oz - iz, ox - ix);
          const nnx = Math.cos(ang + (inward ? Math.PI / 2 : -Math.PI / 2));
          const nnz = Math.sin(ang + (inward ? Math.PI / 2 : -Math.PI / 2));

          jaggedVertexIndices.push(positions.length / 3);
          positions.push(jx, jy, jz);
          normals.push(nnx, 0, nnz);
          uvs.push(layer / baseCount, t);
        }
      }

      const widthStride = jagSegs + 1;
      for (let layer = 0; layer < baseCount - 1; layer++) {
        for (let s = 0; s < jagSegs; s++) {
          const a = (surfaceStart + layer * widthStride + s);
          const b = a + 1;
          const c = a + widthStride;
          const d = c + 1;
          if (inward) {
            indices.push(a, b, c, b, d, c);
          } else {
            indices.push(a, c, b, b, c, d);
          }
        }
      }

      surfacePositions.push(...jaggedVertexIndices);
      return surfacePositions;
    };

    const leftBreakNoise = new PerlinNoise(fragmentId * 7919 + 11);
    const rightBreakNoise = new PerlinNoise(fragmentId * 7919 + 97);
    const leftBreakSurfaceIdx = buildBreakSurface(
      breakLeftVertexIdx, innerBreakLeftVertexIdx, leftBreakNoise, true
    );
    const rightBreakSurfaceIdx = buildBreakSurface(
      breakRightVertexIdx, innerBreakRightVertexIdx, rightBreakNoise, false
    );

    const topCapOffset = positions.length / 3;
    const topRadOuter: { x: number; y: number; z: number }[] = [];
    const topRadInner: { x: number; y: number; z: number }[] = [];
    for (let r = 0; r <= radialSeg; r++) {
      const tAngle = r / radialSeg;
      let localAngle = startAngle + tAngle * angleSpan;
      if (r === 0) localAngle += leftEdgeOffsetX[0] / Math.max(0.5, profile[0].x);
      if (r === radialSeg) localAngle += rightEdgeOffsetX[0] / Math.max(0.5, profile[0].x);
      const bump = surfaceBump(0, r);
      const rOut = profile[0].x + bump;
      const rIn = profile[0].x * (1 - wallThickness / profile[0].x) + bump * 0.6;
      topRadOuter.push({ x: rOut * Math.cos(localAngle), y: profile[0].y, z: rOut * Math.sin(localAngle) });
      topRadInner.push({ x: rIn * Math.cos(localAngle), y: profile[0].y, z: rIn * Math.sin(localAngle) });
    }
    for (let r = 0; r <= radialSeg; r++) {
      const o = topRadOuter[r], i = topRadInner[r];
      positions.push(o.x, o.y, o.z);
      normals.push(0, -1, 0);
      uvs.push(r / radialSeg, 0);
      positions.push(i.x, i.y, i.z);
      normals.push(0, -1, 0);
      uvs.push(r / radialSeg, 1);
    }
    for (let r = 0; r < radialSeg; r++) {
      const a = topCapOffset + r * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    const botCapOffset = positions.length / 3;
    for (let r = 0; r <= radialSeg; r++) {
      const tAngle = r / radialSeg;
      let localAngle = startAngle + tAngle * angleSpan;
      if (r === 0) localAngle += leftEdgeOffsetX[heightSeg] / Math.max(0.5, profile[heightSeg].x);
      if (r === radialSeg) localAngle += rightEdgeOffsetX[heightSeg] / Math.max(0.5, profile[heightSeg].x);
      const bump = surfaceBump(heightSeg, r);
      const rOut = profile[heightSeg].x + bump;
      const rIn = profile[heightSeg].x * (1 - wallThickness / profile[heightSeg].x) + bump * 0.6;
      const y = profile[heightSeg].y;
      positions.push(rOut * Math.cos(localAngle), y, rOut * Math.sin(localAngle));
      normals.push(0, 1, 0);
      uvs.push(r / radialSeg, 0);
      positions.push(rIn * Math.cos(localAngle), y, rIn * Math.sin(localAngle));
      normals.push(0, 1, 0);
      uvs.push(r / radialSeg, 1);
    }
    for (let r = 0; r < radialSeg; r++) {
      const a = botCapOffset + r * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const fullLeftBreak: THREE.Vector3[] = [];
    for (let layer = 0; layer < outerBreakLeft.length; layer++) {
      const ov = outerBreakLeft[layer];
      fullLeftBreak.push(ov.clone());
    }
    for (let layer = outerBreakLeft.length - 1; layer >= 0; layer--) {
      const iv = innerOffset + layer * rowStride;
      fullLeftBreak.push(new THREE.Vector3(
        positions[iv * 3], positions[iv * 3 + 1], positions[iv * 3 + 2]
      ));
    }

    const fullRightBreak: THREE.Vector3[] = [];
    for (let layer = 0; layer < outerBreakRight.length; layer++) {
      fullRightBreak.push(outerBreakRight[layer].clone());
    }
    for (let layer = outerBreakRight.length - 1; layer >= 0; layer--) {
      const iv = innerOffset + layer * rowStride + radialSeg;
      fullRightBreak.push(new THREE.Vector3(
        positions[iv * 3], positions[iv * 3 + 1], positions[iv * 3 + 2]
      ));
    }

    return {
      geometry,
      breakEdges: [fullLeftBreak, fullRightBreak],
      breakEdgeSurfaceVertexIndices: [leftBreakSurfaceIdx, rightBreakSurfaceIdx]
    };
  }

  private createFragments(): void {
    const profile = this.createVaseProfile();
    const totalAngle = Math.PI * 2;
    const anglePerFragment = totalAngle / FRAGMENT_COUNT;
    const baseColors = [0xd4a574, 0xc4956a, 0xb8865a, 0xcf9e6e, 0xbfa076, 0xd1a070];

    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const startAngle = i * anglePerFragment - Math.PI / 2;
      const endAngle = (i + 1) * anglePerFragment - Math.PI / 2;
      const build = this.buildFragmentWithJaggedEdges(profile, startAngle, endAngle, i);
      const { geometry, breakEdges, breakEdgeSurfaceVertexIndices } = build;

      const baseColor = new THREE.Color(baseColors[i % baseColors.length]);
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.88,
        metalness: 0.04,
        side: THREE.DoubleSide,
        flatShading: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const scatterAngle = (i - FRAGMENT_COUNT / 2) * 0.38 + (Math.sin(i * 1.7) * 0.22);
      const scatterRadius = 6.5 + Math.cos(i * 2.3) * 1.5;
      const scatterHeight = Math.sin(i * 1.3) * 1.2 + (Math.random() - 0.5) * 0.4;
      const initPos = new THREE.Vector3(
        Math.cos(scatterAngle) * scatterRadius,
        scatterHeight,
        Math.sin(scatterAngle) * scatterRadius
      );
      const initRot = new THREE.Euler(
        (Math.random() - 0.5) * 0.5 + Math.sin(i * 0.9) * 0.2,
        scatterAngle + Math.PI + (Math.cos(i * 1.4) * 0.5),
        (Math.random() - 0.5) * 0.35 + Math.cos(i * 2.1) * 0.15
      );
      mesh.position.copy(initPos);
      mesh.rotation.copy(initRot);
      mesh.userData.fragmentId = i;
      mesh.userData.breakEdgeVertexIdx = breakEdgeSurfaceVertexIndices;

      const edges = new THREE.EdgesGeometry(geometry, 22);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x8b7355,
        transparent: true,
        opacity: 0.45,
        linewidth: 1
      });
      const outline = new THREE.LineSegments(edges, lineMat);
      mesh.add(outline);

      const glowGeo = geometry.clone();
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.scale.multiplyScalar(1.045);
      mesh.add(glowMesh);

      this.scene.add(mesh);

      this.fragments.set(i, {
        id: i,
        mesh,
        outline,
        glowMesh,
        heatMapMesh: null,
        heatMapAnimCancel: null,
        initialPosition: initPos.clone(),
        initialRotation: initRot.clone(),
        breakEdges,
        breakEdgeSurfaceVertices: breakEdgeSurfaceVertexIndices,
        jointedIds: [],
        isSelected: false,
        isJointed: false
      });
    }
    eventBus.emit('fragmentsCreated', Array.from(this.fragments.keys()));
  }

  public setupEventListeners(): void {
    this.removeEventListeners();
    const canvas = this.renderer.domElement;

    const prevent = (e: Event) => e.preventDefault();
    const onContext = (e: MouseEvent) => prevent(e);
    canvas.addEventListener('contextmenu', onContext);

    const handlers = {
      onMouseDown: this.onMouseDown,
      onMouseMove: this.onMouseMove,
      onMouseUp: this.onMouseUp,
      onWheel: this.onWheel,
      onTouchStart: this.onTouchStart,
      onTouchMove: this.onTouchMove,
      onTouchEnd: this.onTouchEnd,
      onContext
    };
    this.boundHandlers = handlers;

    canvas.addEventListener('mousedown', handlers.onMouseDown);
    canvas.addEventListener('mousemove', handlers.onMouseMove);
    window.addEventListener('mouseup', handlers.onMouseUp);
    canvas.addEventListener('wheel', handlers.onWheel, { passive: false });
    canvas.addEventListener('touchstart', handlers.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handlers.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', handlers.onTouchEnd);

    eventBus.off('snapFragments');
    eventBus.off('requestReset');
    eventBus.off('requestExport');
    eventBus.off('addHeatMapToFragment');

    eventBus.on('snapFragments', (data: any) => this.applySnap(data.id1, data.id2, data));
    eventBus.on('requestReset', () => this.reset());
    eventBus.on('requestExport', () => this.exportState());
    eventBus.on('addHeatMapToFragment', (data: { fragmentId: number; scores: { vertexIndex: number; score: number }[] }) => {
      this.addHeatMap(data.fragmentId, data.scores);
    });
  }

  public removeEventListeners(): void {
    const canvas = this.renderer.domElement;
    if (this.boundHandlers) {
      canvas.removeEventListener('mousedown', this.boundHandlers.onMouseDown);
      canvas.removeEventListener('mousemove', this.boundHandlers.onMouseMove);
      window.removeEventListener('mouseup', this.boundHandlers.onMouseUp);
      canvas.removeEventListener('wheel', this.boundHandlers.onWheel);
      canvas.removeEventListener('touchstart', this.boundHandlers.onTouchStart);
      canvas.removeEventListener('touchmove', this.boundHandlers.onTouchMove);
      canvas.removeEventListener('touchend', this.boundHandlers.onTouchEnd);
      canvas.removeEventListener('contextmenu', this.boundHandlers.onContext);
      this.boundHandlers = null;
    }
  }

  public rebindEvents(): void {
    this.setupEventListeners();
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    this.updateMouse(t.clientX, t.clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.fragments.values()).map((f) => f.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const fragId = hitMesh.userData.fragmentId as number;
      this.selectFragment(fragId);
      this.isDragging = true;
      this.previousMouse.set(t.clientX, t.clientY);
      const frag = this.fragments.get(fragId)!;
      this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), frag.mesh.position);
      const ip = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, ip);
      this.dragOffset.copy(frag.mesh.position).sub(ip);
    } else {
      this.selectFragment(null);
      this.isRotatingView = true;
      this.previousMouse.set(t.clientX, t.clientY);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    this.updateMouse(t.clientX, t.clientY);
    if (this.isRotatingView) {
      const dx = t.clientX - this.previousMouse.x;
      const dy = t.clientY - this.previousMouse.y;
      this.cameraTheta -= dx * 0.01;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraPhi + dy * 0.01));
      this.updateCameraPosition();
      this.previousMouse.set(t.clientX, t.clientY);
    } else if (this.isDragging && this.selectedId !== null) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const ip = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, ip)) {
        const frag = this.fragments.get(this.selectedId)!;
        frag.mesh.position.copy(ip.add(this.dragOffset));
        this.notifyFragmentMoved();
      }
      this.previousMouse.set(t.clientX, t.clientY);
    }
  };

  private onTouchEnd = (_e: TouchEvent): void => {
    this.isDragging = false;
    this.isRotatingView = false;
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.updateMouse(e.clientX, e.clientY);
    if (e.button === 2) {
      this.isRotatingView = true;
      this.previousMouse.set(e.clientX, e.clientY);
      return;
    }
    if (e.button !== 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.fragments.values()).map((f) => f.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const fragId = hitMesh.userData.fragmentId as number;
      this.selectFragment(fragId);
      this.isDragging = true;
      this.previousMouse.set(e.clientX, e.clientY);
      const frag = this.fragments.get(fragId)!;
      this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), frag.mesh.position);
      const ip = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, ip);
      this.dragOffset.copy(frag.mesh.position).sub(ip);
    } else {
      this.selectFragment(null);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMouse(e.clientX, e.clientY);
    if (this.isRotatingView) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.cameraTheta -= dx * 0.01;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraPhi + dy * 0.01));
      this.updateCameraPosition();
      this.previousMouse.set(e.clientX, e.clientY);
      return;
    }
    if (this.isDragging && this.selectedId !== null) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const ip = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, ip)) {
        const frag = this.fragments.get(this.selectedId)!;
        frag.mesh.position.copy(ip.add(this.dragOffset));
        this.notifyFragmentMoved();
      }
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isRotatingView = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.selectedId !== null && !e.ctrlKey && !e.shiftKey) {
      const frag = this.fragments.get(this.selectedId)!;
      const delta = e.deltaY > 0 ? 0.08 : -0.08;
      if (e.shiftKey) {
        frag.mesh.rotation.x += delta;
      } else if (e.altKey) {
        frag.mesh.rotation.z += delta;
      } else {
        frag.mesh.rotation.y += delta;
      }
      this.notifyFragmentMoved();
    } else {
      this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance + e.deltaY * 0.01));
      this.updateCameraPosition();
    }
  };

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z).add(this.cameraTarget);
    this.camera.lookAt(this.cameraTarget);
  }

  private selectFragment(id: number | null): void {
    if (this.selectedId === id) return;
    if (this.selectedId !== null) {
      const prevFrag = this.fragments.get(this.selectedId);
      if (prevFrag) {
        prevFrag.isSelected = false;
        const glowMat = prevFrag.glowMesh.material as THREE.MeshBasicMaterial;
        this.animateGlow(glowMat, 0, 200);
      }
    }
    this.selectedId = id;
    if (id !== null) {
      const frag = this.fragments.get(id);
      if (frag) {
        frag.isSelected = true;
        const glowMat = frag.glowMesh.material as THREE.MeshBasicMaterial;
        this.animateGlow(glowMat, 0.5, 200);
      }
    }
    eventBus.emit('selectionChanged', id);
  }

  private animateGlow(material: THREE.MeshBasicMaterial, targetOpacity: number, duration: number): void {
    const start = material.opacity;
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      material.opacity = start + (targetOpacity - start) * ease;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  private notifyFragmentMoved(): void {
    eventBus.emit('fragmentMoved', this.getFragmentStates());
  }

  public getFragmentStates(): Map<number, { position: THREE.Vector3; rotation: THREE.Euler; quaternion: THREE.Quaternion; breakEdges: THREE.Vector3[][] }> {
    const states = new Map();
    this.fragments.forEach((frag, id) => {
      const quat = new THREE.Quaternion().setFromEuler(frag.mesh.rotation);
      const transformedEdges: THREE.Vector3[][] = frag.breakEdges.map((edgeLoop) =>
        edgeLoop.map((p) => p.clone().applyQuaternion(quat).add(frag.mesh.position))
      );
      states.set(id, {
        position: frag.mesh.position.clone(),
        rotation: frag.mesh.rotation.clone(),
        quaternion: quat.clone(),
        breakEdges: transformedEdges
      });
    });
    return states;
  }

  private applySnap(id1: number, id2: number, data?: any): void {
    const frag1 = this.fragments.get(id1);
    const frag2 = this.fragments.get(id2);
    if (!frag1 || !frag2) return;

    if (!frag1.jointedIds.includes(id2)) frag1.jointedIds.push(id2);
    if (!frag2.jointedIds.includes(id1)) frag2.jointedIds.push(id1);

    const idealAngle = (Math.PI * 2) / FRAGMENT_COUNT;
    const expectedAngularDiff = (id2 - id1) * idealAngle;
    const targetQuat = new THREE.Quaternion().setFromEuler(frag2.mesh.rotation);
    const relQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -expectedAngularDiff, 0));
    const newQuat = relQuat.multiply(targetQuat);
    const newRot = new THREE.Euler().setFromQuaternion(newQuat);

    const frag2QuatInv = new THREE.Quaternion().invert();
    frag2QuatInv.copy(newQuat).invert();
    const localEdgeCentroid = new THREE.Vector3();
    const edgeCount = frag1.breakEdges[0].length;
    for (const p of frag1.breakEdges[1]) localEdgeCentroid.add(p);
    localEdgeCentroid.multiplyScalar(1 / edgeCount);
    const rotated = localEdgeCentroid.clone().applyQuaternion(newQuat);

    const otherEdgeCentroid = new THREE.Vector3();
    const otherEdge = frag2.breakEdges[0];
    for (const p of otherEdge) otherEdgeCentroid.add(p);
    otherEdgeCentroid.multiplyScalar(1 / otherEdge.length);
    const otherRotated = otherEdgeCentroid.clone().applyQuaternion(targetQuat);

    const offset = frag2.mesh.position.clone().add(otherRotated).sub(rotated);
    const tinySep = new THREE.Vector3(
      Math.cos(frag2.mesh.rotation.y + expectedAngularDiff / 2) * 0.015,
      0,
      Math.sin(frag2.mesh.rotation.y + expectedAngularDiff / 2) * 0.015
    );

    frag1.mesh.position.copy(offset).add(tinySep);
    frag1.mesh.rotation.copy(newRot);

    frag1.isJointed = true;
    frag2.isJointed = true;

    const outMat1 = frag1.outline.material as THREE.LineBasicMaterial;
    const outMat2 = frag2.outline.material as THREE.LineBasicMaterial;
    outMat1.color.set(0x00ff88);
    outMat2.color.set(0x00ff88);
    outMat1.opacity = 1;
    outMat2.opacity = 1;
    this.startPulse(frag1.outline);
    this.startPulse(frag2.outline);

    const midPoint = frag1.mesh.position.clone().lerp(frag2.mesh.position, 0.5);
    eventBus.emit('particleBurst', { position: midPoint });
    eventBus.emit('jointSnapSuccess', { id1, id2, position: midPoint });

    this.notifyFragmentMoved();
  }

  private startPulse(line: THREE.LineSegments): void {
    const startTime = performance.now();
    const pulse = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const phase = elapsed * (1 / 0.6) * Math.PI * 2;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.5 + 0.5 * Math.sin(phase);
      if (elapsed < 5) requestAnimationFrame(pulse);
      else mat.opacity = 0.6;
    };
    pulse();
  }

  public reset(): void {
    this.fragments.forEach((frag) => {
      frag.mesh.position.copy(frag.initialPosition);
      frag.mesh.rotation.copy(frag.initialRotation);
      frag.jointedIds = [];
      frag.isSelected = false;
      frag.isJointed = false;
      const outMat = frag.outline.material as THREE.LineBasicMaterial;
      outMat.color.set(0x8b7355);
      outMat.opacity = 0.45;
      const glowMat = frag.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0;
      if (frag.heatMapMesh) {
        frag.mesh.remove(frag.heatMapMesh);
        (frag.heatMapMesh.geometry as THREE.BufferGeometry).dispose();
        (frag.heatMapMesh.material as THREE.Material).dispose();
        frag.heatMapMesh = null;
      }
    });
    this.selectedId = null;
    eventBus.emit('resetComplete');
    this.notifyFragmentMoved();
  }

  public exportState(): void {
    const exportData: Record<number, any> = {};
    this.fragments.forEach((frag, id) => {
      const q = new THREE.Quaternion().setFromEuler(frag.mesh.rotation);
      exportData[id] = {
        id,
        position: { x: frag.mesh.position.x, y: frag.mesh.position.y, z: frag.mesh.position.z },
        euler: { x: frag.mesh.rotation.x, y: frag.mesh.rotation.y, z: frag.mesh.rotation.z },
        quaternion: { x: q.x, y: q.y, z: q.z, w: q.w },
        jointedIds: [...frag.jointedIds],
        isJointed: frag.isJointed
      };
    });
    console.log('Fragment Export Data:', JSON.stringify(exportData, null, 2));
    eventBus.emit('exportComplete', exportData);
  }

  public getFragmentCount(): number {
    return this.fragments.size;
  }
  public getJointedCount(): number {
    let c = 0;
    this.fragments.forEach((f) => { if (f.jointedIds.length > 0) c++; });
    return c;
  }
  public getFragments(): Map<number, FragmentData> {
    return this.fragments;
  }

  public scoreToColor(score: number): [number, number, number] {
    const s = Math.max(0, Math.min(100, score));
    if (s < 31) {
      const t = s / 31;
      return [1.0, t * 0.45, 0.08 + t * 0.02];
    } else if (s < 71) {
      const t = (s - 31) / 40;
      return [1.0 - t * 0.55, 0.45 + t * 0.5, 0.1];
    } else {
      const t = (s - 71) / 29;
      return [0.45 - t * 0.35, 1.0, 0.15 + t * 0.45];
    }
  }

  private disposeHeatMap(frag: FragmentData): void {
    if (frag.heatMapAnimCancel) {
      frag.heatMapAnimCancel();
      frag.heatMapAnimCancel = null;
    }
    if (frag.heatMapMesh) {
      const m = frag.heatMapMesh;
      if (m.parent) m.parent.remove(m);
      const g = m.geometry as THREE.BufferGeometry;
      if (g) g.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) {
        mat.forEach(mt => mt.dispose());
      } else if (mat) {
        mat.dispose();
      }
      frag.heatMapMesh = null;
    }
  }

  public addHeatMap(id: number, scores: { vertexIndex: number; score: number }[]): void {
    const frag = this.fragments.get(id);
    if (!frag) return;

    this.disposeHeatMap(frag);

    const baseGeo = frag.mesh.geometry as THREE.BufferGeometry;
    const posAttr = baseGeo.getAttribute('position') as THREE.BufferAttribute;
    const totalVerts = posAttr.count;

    const scoreArr = new Float32Array(totalVerts);
    const scoreMap = new Map<number, number>();
    for (const s of scores) scoreMap.set(s.vertexIndex, s.score);

    const breakEdgeIdxSet = new Set<number>();
    for (const arr of frag.breakEdgeSurfaceVertices) {
      for (const v of arr) breakEdgeIdxSet.add(v);
    }

    const maxScore = scores.reduce((mx, s) => Math.max(mx, s.score), 0);
    for (let i = 0; i < totalVerts; i++) {
      if (scoreMap.has(i)) {
        scoreArr[i] = scoreMap.get(i)!;
      } else if (breakEdgeIdxSet.has(i)) {
        scoreArr[i] = Math.max(20, maxScore * (0.85 + Math.random() * 0.15));
      } else {
        let nearestEdgeDist = Infinity;
        const px = posAttr.getX(i), py = posAttr.getY(i), pz = posAttr.getZ(i);
        for (const edge of frag.breakEdges) {
          for (const p of edge) {
            const dx = px - p.x, dy = py - p.y, dz = pz - p.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < nearestEdgeDist) nearestEdgeDist = d2;
          }
        }
        nearestEdgeDist = Math.sqrt(nearestEdgeDist);
        const falloff = Math.max(0, 1 - nearestEdgeDist / 2.2);
        scoreArr[i] = Math.max(5, maxScore * (0.18 + falloff * 0.75) * (0.92 + Math.random() * 0.08));
      }
    }

    const colors = new Float32Array(totalVerts * 3);
    for (let i = 0; i < totalVerts; i++) {
      const [r, g, b] = this.scoreToColor(scoreArr[i]);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    const heatGeo = new THREE.BufferGeometry();
    heatGeo.setAttribute('position', posAttr.clone());
    heatGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (baseGeo.index) heatGeo.setIndex(baseGeo.index.clone());

    const heatMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const heatMesh = new THREE.Mesh(heatGeo, heatMat);
    heatMesh.scale.multiplyScalar(1.015);
    frag.mesh.add(heatMesh);
    frag.heatMapMesh = heatMesh;

    let cancelled = false;
    let rafId: number | null = null;
    let stayTimer: number | null = null;

    const cancel = () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (stayTimer !== null) {
        clearTimeout(stayTimer);
        stayTimer = null;
      }
    };

    frag.heatMapAnimCancel = cancel;

    const fadeInStart = performance.now();
    const fadeIn = () => {
      if (cancelled) return;
      const t = Math.min(1, (performance.now() - fadeInStart) / 500);
      const ease = 1 - Math.pow(1 - t, 2);
      heatMat.opacity = ease * 0.72;
      if (t < 1) {
        rafId = requestAnimationFrame(fadeIn);
      } else {
        stayTimer = window.setTimeout(() => {
          if (cancelled) return;
          const fadeStart = performance.now();
          const fadeOut = () => {
            if (cancelled) return;
            const u = Math.min(1, (performance.now() - fadeStart) / 1000);
            const ease2 = u * u;
            heatMat.opacity = 0.72 * (1 - ease2);
            if (u < 1) {
              rafId = requestAnimationFrame(fadeOut);
            } else {
              this.disposeHeatMap(frag);
            }
          };
          rafId = requestAnimationFrame(fadeOut);
        }, 5000);
      }
    };
    rafId = requestAnimationFrame(fadeIn);
  }

  public dispose(): void {
    this.removeEventListeners();
    eventBus.off('snapFragments');
    eventBus.off('requestReset');
    eventBus.off('requestExport');
    eventBus.off('addHeatMapToFragment');
    this.fragments.forEach(frag => this.disposeHeatMap(frag));
  }
}
