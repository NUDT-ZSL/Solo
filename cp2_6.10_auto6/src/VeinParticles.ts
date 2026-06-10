import * as THREE from 'three';

export enum VeinLevel {
  Main = 0,
  Branch = 1,
  Tip = 2
}

export interface ParticleMeta {
  veinLevel: VeinLevel;
  clusterId: number;
  curveIndex: number;
  t: number;
  speed: number;
  colorPhase: number;
}

export interface ClusterInfo {
  id: number;
  center: THREE.Vector3;
  radius: number;
  baseColor: THREE.Color;
  avgSpeed: number;
  particleIndices: number[];
  hovered: boolean;
  burst: boolean;
  burstStartTime: number;
  merged: boolean;
}

interface VeinCurve {
  curve: THREE.CatmullRomCurve3;
  level: VeinLevel;
  parentId: number;
  clusterId: number;
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

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private meta: ParticleMeta[] = [];
  private clusters: Map<number, ClusterInfo> = new Map();
  private curves: VeinCurve[] = [];
  private originalPositions: Float32Array;
  private burstOffsets: Float32Array;
  private burstDirections: Float32Array;

  private particleCount: number = 0;
  private baseDensity: number = 1.0;
  private speedMultiplier: number = 1.0;
  private colorGradientSpeed: number = 0.5;

  private nextClusterId: number = 0;
  private hoveredClusterId: number = -1;

  private rippleTime: number = -1;
  private rippleOrigin: THREE.Vector3 = new THREE.Vector3();
  private rippleColor: THREE.Color = new THREE.Color();

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

    this.generateVeinStructure();
    this.buildBuffers();
    this.uploadBuffers();
  }

  private generateVeinStructure(): void {
    this.curves = [];
    this.clusters.clear();
    this.meta = [];
    this.nextClusterId = 0;

    const mainCount = 5 + Math.floor(Math.random() * 4);
    const mainLength = 12 + Math.random() * 6;

    for (let i = 0; i < mainCount; i++) {
      const angle = (i / mainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const elevation = (Math.random() - 0.5) * 0.8;
      const dir = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.sin(elevation) * 0.4,
        Math.sin(angle) * Math.cos(elevation)
      ).normalize();

      const curvePoints = this.generateCurvePoints(
        new THREE.Vector3(0, 0, 0),
        dir,
        mainLength,
        6
      );
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const clusterId = this.nextClusterId++;
      this.curves.push({ curve, level: VeinLevel.Main, parentId: -1, clusterId });

      this.clusters.set(clusterId, {
        id: clusterId,
        center: curve.getPoint(0.5),
        radius: 1.0,
        baseColor: MAIN_COLOR_A.clone().lerp(MAIN_COLOR_B, 0.5),
        avgSpeed: 0.2,
        particleIndices: [],
        hovered: false,
        burst: false,
        burstStartTime: 0,
        merged: false
      });

      const branchCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < branchCount; b++) {
        const branchT = 0.3 + Math.random() * 0.5;
        const branchOrigin = curve.getPoint(branchT);
        const branchTangent = curve.getTangent(branchT);

        const branchAngle = ((b + 1) / (branchCount + 1)) * Math.PI - Math.PI / 2;
        const up = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(branchTangent, up).normalize();
        if (side.length() < 0.01) {
          side.set(1, 0, 0);
        }

        const branchDir = new THREE.Vector3()
          .copy(branchTangent)
          .applyAxisAngle(side, branchAngle * 0.5)
          .add(
            side.clone().multiplyScalar(Math.sin(branchAngle) * 0.6)
          )
          .normalize();

        const branchLength = mainLength * (0.3 + Math.random() * 0.3);
        const branchPoints = this.generateCurvePoints(
          branchOrigin,
          branchDir,
          branchLength,
          4
        );
        const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
        const branchClusterId = this.nextClusterId++;
        this.curves.push({
          curve: branchCurve,
          level: VeinLevel.Branch,
          parentId: clusterId,
          clusterId: branchClusterId
        });

        const tipPositions: THREE.Vector3[] = [];
        const branchCenter = branchCurve.getPoint(0.5);
        tipPositions.push(branchCenter);

        const tipClusterId = this.nextClusterId++;
        this.curves.push({
          curve: branchCurve,
          level: VeinLevel.Tip,
          parentId: branchClusterId,
          clusterId: tipClusterId
        });

        this.clusters.set(branchClusterId, {
          id: branchClusterId,
          center: branchCenter,
          radius: 0.6,
          baseColor: BRANCH_COLOR_A.clone().lerp(BRANCH_COLOR_B, 0.5),
          avgSpeed: 0.35,
          particleIndices: [],
          hovered: false,
          burst: false,
          burstStartTime: 0,
          merged: false
        });

        const tipCenter = branchCurve.getPoint(0.9);
        this.clusters.set(tipClusterId, {
          id: tipClusterId,
          center: tipCenter,
          radius: 0.4,
          baseColor: TIP_COLOR_A.clone().lerp(TIP_COLOR_B, 0.5),
          avgSpeed: 0.45,
          particleIndices: [],
          hovered: false,
          burst: false,
          burstStartTime: 0,
          merged: false
        });
      }
    }

    this.populateParticles(this.baseDensity);
  }

  private generateCurvePoints(
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
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 1.5
      );
      dir.add(perturbation).normalize();
      current = current.clone().add(dir.clone().multiplyScalar(segLen));
      points.push(current.clone());
    }

    return points;
  }

  private populateParticles(density: number): void {
    this.meta = [];
    for (const cluster of this.clusters.values()) {
      cluster.particleIndices = [];
    }

    const mainParticlesPerCurve = Math.floor(180 * density);
    const branchParticlesPerCurve = Math.floor(100 * density);
    const tipParticlesPerCluster = Math.floor(40 * density);

    let count = 0;

    for (const vc of this.curves) {
      let numParticles: number;
      let speed: number;
      let veinLevel: VeinLevel;

      if (vc.level === VeinLevel.Main) {
        numParticles = mainParticlesPerCurve;
        speed = 0.1 + Math.random() * 0.15;
        veinLevel = VeinLevel.Main;
      } else if (vc.level === VeinLevel.Branch) {
        numParticles = branchParticlesPerCurve;
        speed = 0.2 + Math.random() * 0.15;
        veinLevel = VeinLevel.Branch;
      } else {
        numParticles = tipParticlesPerCluster;
        speed = 0.35 + Math.random() * 0.15;
        veinLevel = VeinLevel.Tip;
      }

      if (count + numParticles > MAX_PARTICLES) {
        numParticles = MAX_PARTICLES - count;
        if (numParticles <= 0) break;
      }

      const cluster = this.clusters.get(vc.clusterId);
      if (!cluster) continue;

      for (let i = 0; i < numParticles; i++) {
        const t = Math.random();

        if (vc.level === VeinLevel.Tip) {
          const basePoint = vc.curve.getPoint(0.85 + Math.random() * 0.15);
          const spread = 0.5 + Math.random() * 0.5;
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
          );

          const idx = count + i;
          this.meta.push({
            veinLevel,
            clusterId: vc.clusterId,
            curveIndex: this.curves.indexOf(vc),
            t: 0.85 + Math.random() * 0.15,
            speed: speed * (0.8 + Math.random() * 0.4),
            colorPhase: Math.random() * Math.PI * 2
          });
          cluster.particleIndices.push(idx);
        } else {
          const curveLen = vc.curve.getLength();
          const lateralSpread = vc.level === VeinLevel.Main ? 0.3 : 0.2;
          const point = vc.curve.getPoint(t);
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * lateralSpread,
            (Math.random() - 0.5) * lateralSpread,
            (Math.random() - 0.5) * lateralSpread
          );
          point.add(offset);

          const idx = count + i;
          this.meta.push({
            veinLevel,
            clusterId: vc.clusterId,
            curveIndex: this.curves.indexOf(vc),
            t,
            speed: speed * (0.8 + Math.random() * 0.4),
            colorPhase: Math.random() * Math.PI * 2
          });
          cluster.particleIndices.push(idx);
        }
      }

      count += numParticles;
    }

    this.particleCount = count;
  }

  private buildBuffers(): void {
    const n = this.particleCount;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.sizes = new Float32Array(n);
    this.originalPositions = new Float32Array(n * 3);
    this.burstOffsets = new Float32Array(n * 3);
    this.burstDirections = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const m = this.meta[i];
      const vc = this.curves[m.curveIndex];

      let pos: THREE.Vector3;
      if (m.veinLevel === VeinLevel.Tip) {
        pos = vc.curve.getPoint(m.t);
        const spread = 0.5 + Math.random() * 0.5;
        pos.add(new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        ));
      } else {
        const lateralSpread = m.veinLevel === VeinLevel.Main ? 0.3 : 0.2;
        pos = vc.curve.getPoint(m.t);
        pos.add(new THREE.Vector3(
          (Math.random() - 0.5) * lateralSpread,
          (Math.random() - 0.5) * lateralSpread,
          (Math.random() - 0.5) * lateralSpread
        ));
      }

      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
      this.originalPositions[i * 3] = pos.x;
      this.originalPositions[i * 3 + 1] = pos.y;
      this.originalPositions[i * 3 + 2] = pos.z;

      const color = this.computeColor(m);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      if (m.veinLevel === VeinLevel.Main) {
        this.sizes[i] = 3.0;
      } else if (m.veinLevel === VeinLevel.Branch) {
        this.sizes[i] = 2.0;
      } else {
        this.sizes[i] = 1.5;
      }

      const dir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      this.burstDirections[i * 3] = dir.x;
      this.burstDirections[i * 3 + 1] = dir.y;
      this.burstDirections[i * 3 + 2] = dir.z;
    }
  }

  private uploadBuffers(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  private computeColor(m: ParticleMeta): THREE.Color {
    const t = (Math.sin(m.colorPhase) + 1) * 0.5;
    if (m.veinLevel === VeinLevel.Main) {
      return MAIN_COLOR_A.clone().lerp(MAIN_COLOR_B, t);
    } else if (m.veinLevel === VeinLevel.Branch) {
      return BRANCH_COLOR_A.clone().lerp(BRANCH_COLOR_B, t);
    } else {
      return TIP_COLOR_A.clone().lerp(TIP_COLOR_B, t);
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const n = this.particleCount;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < n; i++) {
      const m = this.meta[i];
      const vc = this.curves[m.curveIndex];

      m.t += m.speed * this.speedMultiplier * deltaTime * 0.05;
      if (m.t > 1.0) m.t -= 1.0;
      if (m.t < 0.0) m.t += 1.0;

      m.colorPhase += deltaTime * this.colorGradientSpeed * 2.0;

      const tangent = vc.curve.getTangent(m.t);
      const lateralSpread = m.veinLevel === VeinLevel.Main ? 0.3 : m.veinLevel === VeinLevel.Branch ? 0.2 : 0.0;

      let posX: number, posY: number, posZ: number;
      if (m.veinLevel === VeinLevel.Tip) {
        const basePoint = vc.curve.getPoint(m.t);
        posX = basePoint.x + this.originalPositions[i * 3] - vc.curve.getPoint(0.9).x;
        posY = basePoint.y + this.originalPositions[i * 3 + 1] - vc.curve.getPoint(0.9).y;
        posZ = basePoint.z + this.originalPositions[i * 3 + 2] - vc.curve.getPoint(0.9).z;
      } else {
        const basePoint = vc.curve.getPoint(m.t);
        posX = basePoint.x;
        posY = basePoint.y;
        posZ = basePoint.z;
      }

      const cluster = this.clusters.get(m.clusterId);
      let burstOffset = 0;
      let brightnessMul = 1.0;

      if (cluster && cluster.burst) {
        const elapsed = elapsedTime - cluster.burstStartTime;
        if (elapsed < BURST_DURATION) {
          const progress = elapsed / BURST_DURATION;
          const burstPower = Math.sin(progress * Math.PI) * 3.0;
          posX += this.burstDirections[i * 3] * burstPower;
          posY += this.burstDirections[i * 3 + 1] * burstPower;
          posZ += this.burstDirections[i * 3 + 2] * burstPower;
        } else {
          cluster.burst = false;
        }
      }

      if (cluster && cluster.hovered) {
        brightnessMul = 1.5;
      }

      this.positions[i * 3] = posX;
      this.positions[i * 3 + 1] = posY;
      this.positions[i * 3 + 2] = posZ;

      const color = this.computeColor(m);
      this.colors[i * 3] = color.r * brightnessMul;
      this.colors[i * 3 + 1] = color.g * brightnessMul;
      this.colors[i * 3 + 2] = color.b * brightnessMul;

      let baseSize: number;
      if (m.veinLevel === VeinLevel.Main) {
        baseSize = 3.0;
      } else if (m.veinLevel === VeinLevel.Branch) {
        baseSize = 2.0;
      } else {
        baseSize = 1.5;
      }

      const distFromCenter = Math.sqrt(posX * posX + posY * posY + posZ * posZ);
      const sizeMul = 1.0 / (1.0 + distFromCenter * 0.02);

      if (cluster && cluster.hovered) {
        baseSize *= 1.8;
      }

      this.sizes[i] = baseSize * sizeMul;
    }

    if (this.rippleTime >= 0) {
      this.rippleTime += deltaTime;
      if (this.rippleTime > 3.0) {
        this.rippleTime = -1;
      } else {
        const rippleRadius = this.rippleTime * 8.0;
        const rippleWidth = 2.0;
        for (let i = 0; i < n; i++) {
          const px = this.positions[i * 3];
          const py = this.positions[i * 3 + 1];
          const pz = this.positions[i * 3 + 2];
          const dist = Math.sqrt(
            (px - this.rippleOrigin.x) ** 2 +
            (py - this.rippleOrigin.y) ** 2 +
            (pz - this.rippleOrigin.z) ** 2
          );
          if (Math.abs(dist - rippleRadius) < rippleWidth) {
            const intensity = 1.0 - Math.abs(dist - rippleRadius) / rippleWidth;
            this.colors[i * 3] = Math.min(1.0, this.colors[i * 3] + this.rippleColor.r * intensity * 0.5);
            this.colors[i * 3 + 1] = Math.min(1.0, this.colors[i * 3 + 1] + this.rippleColor.g * intensity * 0.5);
            this.colors[i * 3 + 2] = Math.min(1.0, this.colors[i * 3 + 2] + this.rippleColor.b * intensity * 0.5);
          }
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  public getClusterAtPosition(worldPos: THREE.Vector3, maxDist: number = 2.0): number {
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
    if (!cluster || cluster.burst) return;

    cluster.burst = true;
    cluster.burstStartTime = elapsedTime;

    for (const idx of cluster.particleIndices) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      this.burstDirections[idx * 3] = dir.x;
      this.burstDirections[idx * 3 + 1] = dir.y;
      this.burstDirections[idx * 3 + 2] = dir.z;
    }
  }

  public mergeClusters(idA: number, idB: number, elapsedTime: number): boolean {
    const a = this.clusters.get(idA);
    const b = this.clusters.get(idB);
    if (!a || !b || a.merged || b.merged) return false;

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

    for (const idx of b.particleIndices) {
      const m = this.meta[idx];
      m.clusterId = idA;
      m.speed = newSpeed * (0.8 + Math.random() * 0.4);
      a.particleIndices.push(idx);
    }

    b.merged = true;
    b.particleIndices = [];

    for (const idx of a.particleIndices) {
      const m = this.meta[idx];
      const offset = newCenter.clone().sub(this.originalPositions[idx] ? new THREE.Vector3(
        this.originalPositions[idx * 3],
        this.originalPositions[idx * 3 + 1],
        this.originalPositions[idx * 3 + 2]
      ) : new THREE.Vector3());
    }

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
    if (Math.abs(val - this.baseDensity) < 0.01) return;
    this.baseDensity = val;
    this.populateParticles(val);
    this.buildBuffers();
    this.uploadBuffers();
  }

  public getClusters(): Map<number, ClusterInfo> {
    return this.clusters;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getPositions(): Float32Array {
    return this.positions;
  }
}
