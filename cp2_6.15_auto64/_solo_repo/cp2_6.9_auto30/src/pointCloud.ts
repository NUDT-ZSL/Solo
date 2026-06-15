import * as THREE from 'three';

export interface HighlightedPoint {
  index: number;
  position: THREE.Vector3;
  color: THREE.Color;
  timestamp: number;
}

export interface PulseEffect {
  pointIndex: number;
  startTime: number;
  mesh: THREE.Mesh;
}

const PARTICLE_COUNT = 5000;
const MAX_HIGHLIGHTS = 20;
const PULSE_DURATION = 1000;

function generateTempleShape(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  let idx = 0;

  const addRandomPoint = (x: number, y: number, z: number, spread: number) => {
    if (idx >= PARTICLE_COUNT * 3) return;
    positions[idx++] = x + (Math.random() - 0.5) * spread;
    positions[idx++] = y + (Math.random() - 0.5) * spread;
    positions[idx++] = z + (Math.random() - 0.5) * spread;
  };

  for (let i = 0; i < 800 && idx < PARTICLE_COUNT * 3; i++) {
    addRandomPoint((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 12, 0.3);
  }

  for (let step = 1; step <= 3; step++) {
    const y = step * 0.8;
    const shrink = step * 0.8;
    for (let i = 0; i < 400 && idx < PARTICLE_COUNT * 3; i++) {
      addRandomPoint((Math.random() - 0.5) * (20 - shrink), y, (Math.random() - 0.5) * (12 - shrink), 0.25);
    }
  }

  const columnPositions: Array<[number, number]> = [
    [-8, -4.5], [-4, -4.5], [0, -4.5], [4, -4.5], [8, -4.5],
    [-8, 4.5], [-4, 4.5], [0, 4.5], [4, 4.5], [8, 4.5],
    [-8, 0], [8, 0]
  ];

  for (const [cx, cz] of columnPositions) {
    for (let i = 0; i < 180 && idx < PARTICLE_COUNT * 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.4 + Math.random() * 0.3;
      const x = cx + Math.cos(angle) * radius;
      const y = 2.4 + Math.random() * 8;
      const z = cz + Math.sin(angle) * radius;
      addRandomPoint(x, y, z, 0.15);
    }
  }

  for (let i = 0; i < 600 && idx < PARTICLE_COUNT * 3; i++) {
    addRandomPoint((Math.random() - 0.5) * 22, 11, (Math.random() - 0.5) * 14, 0.6);
  }

  for (let i = 0; i < 500 && idx < PARTICLE_COUNT * 3; i++) {
    const t = Math.random();
    const y = 11 + t * 3;
    const w = 22 * (1 - t * 0.5);
    const d = 14 * (1 - t * 0.5);
    addRandomPoint((Math.random() - 0.5) * w, y, (Math.random() - 0.5) * d, 0.35);
  }

  while (idx < PARTICLE_COUNT * 3) {
    addRandomPoint((Math.random() - 0.5) * 25, Math.random() * 14, (Math.random() - 0.5) * 16, 0.8);
  }

  return positions;
}

function generateRandomColors(): Float32Array {
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const palettes = [
    [0.76, 0.70, 0.50],
    [0.82, 0.78, 0.55],
    [0.62, 0.58, 0.42],
    [0.70, 0.60, 0.45],
    [0.55, 0.50, 0.38],
    [0.78, 0.65, 0.40],
    [0.45, 0.40, 0.32]
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const base = palettes[Math.floor(Math.random() * palettes.length)];
    const jitter = (Math.random() - 0.5) * 0.15;
    colors[i * 3] = Math.min(1, Math.max(0, base[0] + jitter));
    colors[i * 3 + 1] = Math.min(1, Math.max(0, base[1] + jitter));
    colors[i * 3 + 2] = Math.min(1, Math.max(0, base[2] + jitter));
  }
  return colors;
}

function generateScatteredPositions(target: Float32Array): Float32Array {
  const scattered = new Float32Array(target.length);
  const centerX = 0, centerY = 5, centerZ = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const tx = target[i * 3];
    const ty = target[i * 3 + 1];
    const tz = target[i * 3 + 2];
    const dirX = tx - centerX + (Math.random() - 0.5) * 5;
    const dirY = ty - centerY + (Math.random() - 0.5) * 5;
    const dirZ = tz - centerZ + (Math.random() - 0.5) * 5;
    const dist = 12 + Math.random() * 8;
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;
    scattered[i * 3] = centerX + (dirX / len) * dist;
    scattered[i * 3 + 1] = centerY + (dirY / len) * dist;
    scattered[i * 3 + 2] = centerZ + (dirZ / len) * dist;
  }
  return scattered;
}

export class PointCloudManager {
  public scene: THREE.Scene;
  public targetPositions: Float32Array;
  public scatteredPositions: Float32Array;
  public baseColors: Float32Array;
  public currentPositions: Float32Array;

  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private highlighted: HighlightedPoint[] = [];
  private pulseEffects: PulseEffect[] = [];
  public onHighlightChange?: (points: HighlightedPoint[]) => void;

  public reconstructing = false;
  public reconstructProgress = 0;
  public reconstructStartTime = 0;
  public readonly RECONSTRUCT_DURATION = 2000;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.targetPositions = generateTempleShape();
    this.scatteredPositions = generateScatteredPositions(this.targetPositions);
    this.baseColors = generateRandomColors();
    this.currentPositions = new Float32Array(this.scatteredPositions);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.baseColors), 3));

    this.material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  public getHighlightedPoints(): HighlightedPoint[] {
    return [...this.highlighted];
  }

  public highlightPoint(index: number): HighlightedPoint | null {
    if (index < 0 || index >= PARTICLE_COUNT) return null;

    const existing = this.highlighted.find(p => p.index === index);
    if (existing) return existing;

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;

    const position = new THREE.Vector3(
      posAttr.getX(index),
      posAttr.getY(index),
      posAttr.getZ(index)
    );

    const worldPos = position.clone().applyMatrix4(this.points.matrixWorld);

    const point: HighlightedPoint = {
      index,
      position: worldPos,
      color: new THREE.Color(
        this.baseColors[index * 3],
        this.baseColors[index * 3 + 1],
        this.baseColors[index * 3 + 2]
      ),
      timestamp: performance.now()
    };

    this.highlighted.push(point);
    while (this.highlighted.length > MAX_HIGHLIGHTS) {
      const removed = this.highlighted.shift();
      if (removed) this.restorePointColor(removed.index);
    }

    this.applyHighlightColor(index);
    this.addPulseEffect(index, worldPos);
    this.updateColorAttribute();

    if (this.onHighlightChange) {
      this.onHighlightChange(this.getHighlightedPoints());
    }

    return point;
  }

  private applyHighlightColor(index: number): void {
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colAttr.setXYZ(index, 1.0, 0.84, 0.0);
  }

  private restorePointColor(index: number): void {
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colAttr.setXYZ(
      index,
      this.baseColors[index * 3],
      this.baseColors[index * 3 + 1],
      this.baseColors[index * 3 + 2]
    );
  }

  private updateColorAttribute(): void {
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colAttr.needsUpdate = true;
  }

  private addPulseEffect(index: number, worldPos: THREE.Vector3): void {
    const now = performance.now();
    this.pulseEffects = this.pulseEffects.filter(p => now - p.startTime < PULSE_DURATION);

    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(worldPos);
    mesh.lookAt(new THREE.Vector3(0, worldPos.y, 0));
    this.scene.add(mesh);

    this.pulseEffects.push({
      pointIndex: index,
      startTime: now,
      mesh
    });
  }

  public startReconstruction(): void {
    if (this.reconstructing) return;
    this.reconstructing = true;
    this.reconstructStartTime = performance.now();
    this.reconstructProgress = 0;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update(delta: number, camera: THREE.Camera): void {
    const now = performance.now();

    if (this.reconstructing) {
      const elapsed = now - this.reconstructStartTime;
      const rawProgress = Math.min(1, elapsed / this.RECONSTRUCT_DURATION);
      this.reconstructProgress = this.easeInOutCubic(rawProgress);

      const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const t = this.reconstructProgress;
      const curveT = t * t * (3 - 2 * t);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const si = i * 3;
        const sx = this.scatteredPositions[si];
        const sy = this.scatteredPositions[si + 1];
        const sz = this.scatteredPositions[si + 2];
        const tx = this.targetPositions[si];
        const ty = this.targetPositions[si + 1];
        const tz = this.targetPositions[si + 2];

        const midY = Math.max(sy, ty) + 3 * Math.sin(t * Math.PI);

        arr[si] = sx + (tx - sx) * curveT;
        arr[si + 1] = sy + (midY - sy) * curveT + (ty - midY) * curveT * curveT;
        arr[si + 2] = sz + (tz - sz) * curveT;
      }

      for (const hp of this.highlighted) {
        const idx = hp.index * 3;
        hp.position.set(arr[idx], arr[idx + 1], arr[idx + 2]);
        hp.position.applyMatrix4(this.points.matrixWorld);
      }

      posAttr.needsUpdate = true;

      if (rawProgress >= 1) {
        this.reconstructing = false;
      }
    }

    this.pulseEffects = this.pulseEffects.filter(effect => {
      const elapsed = now - effect.startTime;
      if (elapsed >= PULSE_DURATION) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
        return false;
      }

      const progress = elapsed / PULSE_DURATION;
      const scale = 1 + progress * 5;
      effect.mesh.scale.setScalar(scale);
      const mat = effect.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - progress;

      const hp = this.highlighted.find(h => h.index === effect.pointIndex);
      if (hp) {
        effect.mesh.position.copy(hp.position);
      }
      effect.mesh.lookAt(camera.position);

      return true;
    });
  }

  public raycast(raycaster: THREE.Raycaster): number {
    raycaster.params.Points = { threshold: 0.3 };
    const intersects = raycaster.intersectObject(this.points, false);
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      return intersects[0].index;
    }
    return -1;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const effect of this.pulseEffects) {
      this.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      (effect.mesh.material as THREE.Material).dispose();
    }
  }
}
