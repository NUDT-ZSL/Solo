import * as THREE from 'three';

export const VeinLevel = {
  Main: 0,
  Branch: 1,
  Tip: 2
} as const;
export type VeinLevelType = typeof VeinLevel[keyof typeof VeinLevel];

export interface ParticleMeta {
  curveIndex: number;
  veinLevel: VeinLevelType;
  clusterId: number;
  t: number;
  speed: number;
  colorPhase: number;
  baseOffset: THREE.Vector3;
}

export interface ClusterInfo {
  id: number;
  center: THREE.Vector3;
  radius: number;
  baseColor: THREE.Color;
  avgSpeed: number;
  veinLevel: VeinLevelType;
  particleStart: number;
  particleCount: number;
  hovered: boolean;
  burst: boolean;
  burstStartTime: number;
  merged: boolean;
}

interface VeinCurve {
  curve: THREE.CatmullRomCurve3;
  level: VeinLevelType;
  clusterId: number;
  parentClusterId: number;
}

const MAIN_COLOR_A = new THREE.Color('#FF8C00');
const MAIN_COLOR_B = new THREE.Color('#DC143C');
const BRANCH_COLOR_A = new THREE.Color('#00CED1');
const BRANCH_COLOR_B = new THREE.Color('#0047AB');
const TIP_COLOR_A = new THREE.Color('#FFD700');
const TIP_COLOR_B = new THREE.Color('#FF6EC7');

const MAX_PARTICLES = 15000;
const BURST_DURATION = 3.0;

export class VeinParticles {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private positionAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;

  private meta: ParticleMeta[] = [];
  private clusters: Map<number, ClusterInfo> = new Map();
  private curves: VeinCurve[] = [];

  private burstDirections: Float32Array = new Float32Array(0);
  private originalPositions: Float32Array = new Float32Array(0);

  private particleCount: number = 0;
  private baseDensity: number = 1.0;
  private speedMultiplier: number = 1.0;
  private colorGradientSpeed: number = 0.5;

  private nextClusterId: number = 0;
  private hoveredClusterId: number = -1;

  private rippleTime: number = -1;
  private rippleOrigin: THREE.Vector3 = new THREE.Vector3();
  private rippleColor: THREE.Color = new THREE.Color();

  private tmpVec = new THREE.Vector3();
  private tmpColor = new THREE.Color();

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = true;

    this.positionAttr = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.colorAttr = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(0), 1);

    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', this.colorAttr);
    this.geometry.setAttribute('size', this.sizeAttr);

    this.generateFractalStructure();
    this.allocateBuffers();
    this.populateParticles(this.baseDensity);
    this.uploadInitialData();

    console.log('[VeinParticles] 粒子总数:', this.particleCount);
    console.log('[VeinParticles] 主脉数:', this.countCurvesByLevel(VeinLevel.Main));
    console.log('[VeinParticles] 分支数:', this.countCurvesByLevel(VeinLevel.Branch));
    console.log('[VeinParticles] 末端簇数:', this.countCurvesByLevel(VeinLevel.Tip));
    console.log('[VeinParticles] 总簇数:', this.clusters.size);
  }

  private countCurvesByLevel(level: VeinLevelType): number {
    return this.curves.filter(c => c.level === level).length;
  }

  private generateFractalStructure(): void {
    this.curves = [];
    this.clusters.clear();
    this.nextClusterId = 0;

    const mainCount = 5 + Math.floor(Math.random() * 4);
    const mainLength = 14 + Math.random() * 6;

    for (let i = 0; i < mainCount; i++) {
      const angle = (i / mainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const elevation = (Math.random() - 0.5) * 0.9;
      const dir = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.sin(elevation) * 0.5,
        Math.sin(angle) * Math.cos(elevation)
      ).normalize();

      const points = this.buildCurvePoints(
        new THREE.Vector3(0, 0, 0),
        dir,
        mainLength,
        7
      );
      const curve = new THREE.CatmullRomCurve3(points);
      const clusterId = this.nextClusterId++;

      const midPoint = curve.getPoint(0.5);
      this.curves.push({ curve, level: VeinLevel.Main, clusterId, parentClusterId: -1 });
      this.clusters.set(clusterId, {
        id: clusterId,
        center: midPoint,
        radius: 1.2,
        baseColor: MAIN_COLOR_A.clone().lerp(MAIN_COLOR_B, 0.5),
        avgSpeed: 0.15,
        veinLevel: VeinLevel.Main,
        particleStart: 0,
        particleCount: 0,
        hovered: false,
        burst: false,
        burstStartTime: 0,
        merged: false
      });

      const branchCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < branchCount; b++) {
        const branchT = 0.35 + (b / branchCount) * 0.35 + (Math.random() - 0.5) * 0.1;
        const branchOrigin = curve.getPoint(branchT);
        const branchTangent = curve.getTangent(branchT).normalize();

        const upApprox = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(branchTangent, upApprox).normalize();
        if (side.length() < 0.01) side.set(1, 0, 0);
        const up = new THREE.Vector3().crossVectors(side, branchTangent).normalize();

        const angleOffset = ((b + 0.5) / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const tiltAmount = 0.4 + Math.random() * 0.3;
        const branchDir = new THREE.Vector3()
          .copy(branchTangent)
          .add(side.clone().multiplyScalar(Math.cos(angleOffset) * tiltAmount))
          .add(up.clone().multiplyScalar(Math.sin(angleOffset) * tiltAmount))
          .normalize();

        const branchLength = mainLength * (0.35 + Math.random() * 0.3);
        const branchPoints = this.buildCurvePoints(branchOrigin, branchDir, branchLength, 5);
        const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
        const branchClusterId = this.nextClusterId++;

        const branchMid = branchCurve.getPoint(0.5);
        this.curves.push({
          curve: branchCurve,
          level: VeinLevel.Branch,
          clusterId: branchClusterId,
          parentClusterId: clusterId
        });
        this.clusters.set(branchClusterId, {
          id: branchClusterId,
          center: branchMid,
          radius: 0.7,
          baseColor: BRANCH_COLOR_A.clone().lerp(BRANCH_COLOR_B, 0.5),
          avgSpeed: 0.28,
          veinLevel: VeinLevel.Branch,
          particleStart: 0,
          particleCount: 0,
          hovered: false,
          burst: false,
          burstStartTime: 0,
          merged: false
        });

        const tipClusterId = this.nextClusterId++;
        const tipCenter = branchCurve.getPoint(0.92);
        this.curves.push({
          curve: branchCurve,
          level: VeinLevel.Tip,
          clusterId: tipClusterId,
          parentClusterId: branchClusterId
        });
        this.clusters.set(tipClusterId, {
          id: tipClusterId,
          center: tipCenter,
          radius: 0.5,
          baseColor: TIP_COLOR_A.clone().lerp(TIP_COLOR_B, 0.5),
          avgSpeed: 0.4,
          veinLevel: VeinLevel.Tip,
          particleStart: 0,
          particleCount: 0,
          hovered: false,
          burst: false,
          burstStartTime: 0,
          merged: false
        });
      }
    }
  }

  private buildCurvePoints(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    segments: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [origin.clone()];
    let current = origin.clone();
    let dir = direction.clone().normalize();

    for (let i = 0; i < segments; i++) {
      const segLen = length / segments;
      const perturbation = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 1.8
      );
      dir.add(perturbation).normalize();
      current = current.clone().add(dir.clone().multiplyScalar(segLen));
      points.push(current.clone());
    }

    return points;
  }

  private allocateBuffers(): void {
    const buf = new Float32Array(MAX_PARTICLES * 3);
    const colBuf = new Float32Array(MAX_PARTICLES * 3);
    const sizeBuf = new Float32Array(MAX_PARTICLES);
    this.burstDirections = new Float32Array(MAX_PARTICLES * 3);
    this.originalPositions = new Float32Array(MAX_PARTICLES * 3);

    this.positionAttr = new THREE.BufferAttribute(buf, 3);
    this.colorAttr = new THREE.BufferAttribute(colBuf, 3);
    this.sizeAttr = new THREE.BufferAttribute(sizeBuf, 1);

    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', this.colorAttr);
    this.geometry.setAttribute('size', this.sizeAttr);
  }

  private populateParticles(density: number): void {
    this.meta = [];
    const mainCount = Math.floor(200 * density);
    const branchCount = Math.floor(110 * density);
    const tipCount = Math.floor(50 * density);

    let total = 0;

    for (const vc of this.curves) {
      const cluster = this.clusters.get(vc.clusterId);
      if (!cluster || cluster.merged) continue;

      let numParticles: number;
      let speedBase: number;

      switch (vc.level) {
        case VeinLevel.Main:
          numParticles = mainCount;
          speedBase = 0.12;
          break;
        case VeinLevel.Branch:
          numParticles = branchCount;
          speedBase = 0.22;
          break;
        case VeinLevel.Tip:
          numParticles = tipCount;
          speedBase = 0.35;
          break;
      }

      if (total + numParticles > MAX_PARTICLES) {
        numParticles = MAX_PARTICLES - total;
        if (numParticles <= 0) break;
      }

      cluster.particleStart = total;
      cluster.particleCount = numParticles;

      for (let i = 0; i < numParticles; i++) {
        const t = Math.random();
        const lateralSpread = vc.level === VeinLevel.Main ? 0.35 : vc.level === VeinLevel.Branch ? 0.2 : 0.5;

        let offset: THREE.Vector3;
        if (vc.level === VeinLevel.Tip) {
          const r = lateralSpread * Math.cbrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          offset = new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
          );
        } else {
          offset = new THREE.Vector3(
            (Math.random() - 0.5) * lateralSpread,
            (Math.random() - 0.5) * lateralSpread,
            (Math.random() - 0.5) * lateralSpread
          );
        }

        const idx = total + i;
        this.meta.push({
          curveIndex: this.curves.indexOf(vc),
          veinLevel: vc.level,
          clusterId: vc.clusterId,
          t,
          speed: speedBase * (0.7 + Math.random() * 0.6),
          colorPhase: Math.random() * Math.PI * 2,
          baseOffset: offset
        });

        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(2 + Math.random() * 3);
        this.burstDirections[idx * 3] = dir.x;
        this.burstDirections[idx * 3 + 1] = dir.y;
        this.burstDirections[idx * 3 + 2] = dir.z;
      }

      total += numParticles;
    }

    this.particleCount = total;
    this.geometry.setDrawRange(0, total);
  }

  private uploadInitialData(): void {
    const n = this.particleCount;
    for (let i = 0; i < n; i++) {
      this.updateParticlePosition(i);
      this.updateParticleColor(i);
      this.updateParticleSize(i);
    }
    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
  }

  private updateParticlePosition(idx: number): void {
    const m = this.meta[idx];
    if (!m) return;

    const vc = this.curves[m.curveIndex];
    if (!vc) return;

    const pos = vc.curve.getPoint(m.t);
    pos.add(m.baseOffset);

    this.originalPositions[idx * 3] = pos.x;
    this.originalPositions[idx * 3 + 1] = pos.y;
    this.originalPositions[idx * 3 + 2] = pos.z;

    this.positionAttr.setXYZ(idx, pos.x, pos.y, pos.z);
  }

  private updateParticleColor(idx: number): void {
    const m = this.meta[idx];
    if (!m) return;

    const t = (Math.sin(m.colorPhase) + 1) * 0.5;
    let color: THREE.Color;

    switch (m.veinLevel) {
      case VeinLevel.Main:
        color = this.tmpColor.copy(MAIN_COLOR_A).lerp(MAIN_COLOR_B, t);
        break;
      case VeinLevel.Branch:
        color = this.tmpColor.copy(BRANCH_COLOR_A).lerp(BRANCH_COLOR_B, t);
        break;
      case VeinLevel.Tip:
      default:
        color = this.tmpColor.copy(TIP_COLOR_A).lerp(TIP_COLOR_B, t);
        break;
    }

    const cluster = this.clusters.get(m.clusterId);
    let brightness = 1.0;
    if (cluster && cluster.hovered) brightness = 1.5;

    this.colorAttr.setXYZ(
      idx,
      Math.min(1, color.r * brightness),
      Math.min(1, color.g * brightness),
      Math.min(1, color.b * brightness)
    );
  }

  private updateParticleSize(idx: number): void {
    const m = this.meta[idx];
    if (!m) return;

    let baseSize: number;
    switch (m.veinLevel) {
      case VeinLevel.Main: baseSize = 3.0; break;
      case VeinLevel.Branch: baseSize = 2.0; break;
      case VeinLevel.Tip: baseSize = 1.5; break;
    }

    const x = this.positionAttr.getX(idx);
    const y = this.positionAttr.getY(idx);
    const z = this.positionAttr.getZ(idx);
    const dist = Math.sqrt(x * x + y * y + z * z);
    const sizeMul = 1.0 / (1.0 + dist * 0.03);

    const cluster = this.clusters.get(m.clusterId);
    if (cluster && cluster.hovered) baseSize *= 1.8;

    this.sizeAttr.setX(idx, baseSize * sizeMul);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const n = this.particleCount;
    const dt = Math.min(deltaTime, 0.05);

    for (let i = 0; i < n; i++) {
      const m = this.meta[i];
      if (!m) continue;

      m.t += m.speed * this.speedMultiplier * dt * 0.3;
      if (m.t > 1.0) m.t -= 1.0;
      if (m.t < 0.0) m.t += 1.0;

      m.colorPhase += dt * this.colorGradientSpeed * 2.0;

      this.updateParticlePosition(i);

      const cluster = this.clusters.get(m.clusterId);
      if (cluster && cluster.burst) {
        const elapsed = elapsedTime - cluster.burstStartTime;
        if (elapsed < BURST_DURATION) {
          const progress = elapsed / BURST_DURATION;
          const envelope = Math.sin(progress * Math.PI);
          const distance = envelope * 4.0;

          const px = this.positionAttr.getX(i);
          const py = this.positionAttr.getY(i);
          const pz = this.positionAttr.getZ(i);

          const bx = this.burstDirections[i * 3];
          const by = this.burstDirections[i * 3 + 1];
          const bz = this.burstDirections[i * 3 + 2];

          const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;

          this.positionAttr.setXYZ(
            i,
            px + (bx / len) * distance,
            py + (by / len) * distance,
            pz + (bz / len) * distance
          );
        } else {
          cluster.burst = false;
        }
      }

      this.updateParticleColor(i);
      this.updateParticleSize(i);
    }

    if (this.rippleTime >= 0) {
      this.rippleTime += dt;
      if (this.rippleTime > 3.0) {
        this.rippleTime = -1;
      } else {
        const rippleRadius = this.rippleTime * 10.0;
        const rippleWidth = 2.5;
        const ri = this.rippleOrigin;
        const rc = this.rippleColor;

        for (let i = 0; i < n; i++) {
          const px = this.positionAttr.getX(i);
          const py = this.positionAttr.getY(i);
          const pz = this.positionAttr.getZ(i);
          const dx = px - ri.x;
          const dy = py - ri.y;
          const dz = pz - ri.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const diff = Math.abs(dist - rippleRadius);

          if (diff < rippleWidth) {
            const intensity = (1.0 - diff / rippleWidth) * 0.7;
            const cr = this.colorAttr.getX(i);
            const cg = this.colorAttr.getY(i);
            const cb = this.colorAttr.getZ(i);
            this.colorAttr.setXYZ(
              i,
              Math.min(1, cr + rc.r * intensity),
              Math.min(1, cg + rc.g * intensity),
              Math.min(1, cb + rc.b * intensity)
            );
          }
        }
      }
    }

    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
  }

  public getClusterAtPosition(worldPos: THREE.Vector3, maxDist: number = 2.5): number {
    let closestId = -1;
    let closestDist = maxDist;

    for (const cluster of this.clusters.values()) {
      if (cluster.merged) continue;
      const dist = cluster.center.distanceTo(worldPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = cluster.id;
      }
    }

    return closestId;
  }

  public setHoveredCluster(clusterId: number): void {
    if (this.hoveredClusterId === clusterId) return;

    if (this.hoveredClusterId >= 0) {
      const prev = this.clusters.get(this.hoveredClusterId);
      if (prev) prev.hovered = false;
    }

    this.hoveredClusterId = clusterId;

    if (clusterId >= 0) {
      const curr = this.clusters.get(clusterId);
      if (curr) curr.hovered = true;
    }
  }

  public triggerBurst(clusterId: number, elapsedTime: number): void {
    const cluster = this.clusters.get(clusterId);
    if (!cluster || cluster.burst || cluster.merged) return;

    cluster.burst = true;
    cluster.burstStartTime = elapsedTime;

    const start = cluster.particleStart;
    const count = cluster.particleCount;
    for (let i = start; i < start + count; i++) {
      if (i >= this.particleCount) break;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(2 + Math.random() * 3);
      this.burstDirections[i * 3] = dir.x;
      this.burstDirections[i * 3 + 1] = dir.y;
      this.burstDirections[i * 3 + 2] = dir.z;
    }
  }

  public mergeClusters(idA: number, idB: number, elapsedTime: number): boolean {
    const a = this.clusters.get(idA);
    const b = this.clusters.get(idB);
    if (!a || !b || a.merged || b.merged) return false;
    if (idA === idB) return false;

    const dist = a.center.distanceTo(b.center);
    if (dist >= 5.0) return false;

    const newCenter = a.center.clone().add(b.center).multiplyScalar(0.5);
    const newRadius = Math.max(a.radius, b.radius) * 2;
    const newColor = a.baseColor.clone().lerp(b.baseColor, 0.5);
    const newSpeed = (a.avgSpeed + b.avgSpeed) * 0.5;

    a.center.copy(newCenter);
    a.radius = newRadius;
    a.baseColor.copy(newColor);
    a.avgSpeed = newSpeed;

    const bStart = b.particleStart;
    const bCount = b.particleCount;
    for (let i = bStart; i < bStart + bCount; i++) {
      if (i >= this.particleCount) break;
      const m = this.meta[i];
      if (m) {
        m.clusterId = idA;
        m.speed = newSpeed * (0.7 + Math.random() * 0.6);
      }
    }

    b.merged = true;

    this.rippleOrigin.copy(newCenter);
    this.rippleColor.copy(newColor);
    this.rippleTime = 0;

    return true;
  }

  public setSpeedMultiplier(val: number): void {
    this.speedMultiplier = val;
  }

  public setColorGradientSpeed(val: number): void {
    this.colorGradientSpeed = val;
  }

  public setDensity(val: number): void {
    if (Math.abs(val - this.baseDensity) < 0.05) return;
    this.baseDensity = val;
    this.populateParticles(val);
    this.uploadInitialData();
  }

  public getClusters(): Map<number, ClusterInfo> {
    return this.clusters;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getCurves(): VeinCurve[] {
    return this.curves;
  }
}
