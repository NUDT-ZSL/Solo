import * as THREE from 'three';
import { SoilModule, Rock } from './soilModule';

export interface GrowthParams {
  growthRate: number;
  maxRootLength: number;
  branchProbability: number;
  waterAttractionStrength: number;
}

export interface RootNode {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
}

export interface RootSegment {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  segments: number;
  isLod: boolean;
}

export class RootSystem {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  public params: GrowthParams = {
    growthRate: 0.2,
    maxRootLength: 8,
    branchProbability: 0.4,
    waterAttractionStrength: 0.5
  };

  private mainRootNodes: RootNode[] = [];
  private mainRootSegments: RootSegment[] = [];
  private mainRootCurrentLength: number = 0;
  private mainRootTip!: RootNode;

  private sideRoots: SideRoot[] = [];
  private lastBranchLength: number = 0;
  private nextBranchTarget: number = 0;

  private soil: SoilModule;
  private isGrowing: boolean = false;

  private readonly mainRadius: number = 0.05;
  private readonly mainColor: THREE.Color = new THREE.Color(0x8B5A2B);

  private totalNodes: number = 0;
  private segmentLength: number = 0.1;
  private mainRootTipPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(soil: SoilModule) {
    this.soil = soil;
    this.nextBranchTarget = this.randomRange(0.5, 2.0);
  }

  public initFromSeed(position: THREE.Vector3): void {
    this.clear();
    const startPos = position.clone();
    startPos.y -= 0.35;
    const dir = new THREE.Vector3(0, -1, 0);
    this.mainRootTip = {
      position: startPos.clone(),
      direction: dir,
      length: 0
    };
    this.mainRootNodes.push({
      position: startPos.clone(), direction: dir.clone(), length: 0 });
    this.mainRootTipPosition.copy(startPos);
    this.isGrowing = true;
    const seedRoot = this.createSegment(
      startPos.clone(),
      startPos.clone().add(dir.clone().multiplyScalar(0.001)),
      this.mainRadius,
      this.mainColor,
      8
    );
    this.mainRootSegments.push(seedRoot);
  }

  public update(deltaTime: number): void {
    if (!this.isGrowing) return;
    const frameRate = 1 / 60;
    const timeScale = deltaTime / frameRate;
    const step = this.params.growthRate * timeScale;
    if (this.mainRootCurrentLength < this.params.maxRootLength) {
      this.growMainRoot(step);
    }
    for (const side of this.sideRoots) {
      this.growSideRoot(side, step * timeScale);
    }
    this.sideRoots = this.sideRoots.filter(s => !s.finished);
    this.totalNodes = Math.floor(this.mainRootCurrentLength / this.segmentLength) +
      this.sideRoots.reduce((sum, s) => sum + Math.floor(s.currentLength / this.segmentLength), 0);
    this.applyLOD();
  }

  private growMainRoot(step: number): void {
    let remaining = step;
    while (remaining > 0.001) {
      const growthDir = this.computeMainRootDirection();
      const nextPos = this.mainRootTip.position.clone().add(growthDir.clone().multiplyScalar(remaining));
      const collision = this.soil.checkRockCollision(nextPos, this.mainRadius * 1.2);
      const inside = this.soil.isInsideSoil(nextPos, this.mainRadius);
      if (collision) {
        const evadeDir = this.evadeRock(this.mainRootTip.position, collision, growthDir);
        if (evadeDir) {
          this.mainRootTip.direction.copy(evadeDir.normalize());
          const safeStep = remaining * 0.5;
          const safePos = this.mainRootTip.position.clone().add(
            this.mainRootTip.direction.clone().multiplyScalar(safeStep));
          if (this.soil.isInsideSoil(safePos, this.mainRadius)) {
            this.extendMainRoot(safePos, safeStep);
            remaining -= safeStep;
          } else {
            this.isGrowing = false;
            break;
          }
        } else {
          this.isGrowing = false;
          break;
        }
      } else if (!inside) {
        this.isGrowing = false;
        break;
      } else {
        this.mainRootTip.direction.copy(growthDir.normalize());
        this.extendMainRoot(nextPos, remaining);
        remaining = 0;
      }
    }
  }

  private computeMainRootDirection(): THREE.Vector3 {
    const baseDir = this.mainRootTip.direction.clone().normalize();
    const downDir = new THREE.Vector3(0, -1, 0);
    const waterPull = this.soil.getWaterAttraction(this.mainRootTip.position);
    let result = baseDir.clone();
    result.lerp(downDir, 0.15);
    if (waterPull.lengthSq() > 0.01) {
      result.lerp(waterPull.normalize(), this.params.waterAttractionStrength * 0.25);
    }
    const noise = new THREE.Vector3(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.15
    );
    result.add(noise);
    return result.normalize();
  }

  private evadeRock(pos: THREE.Vector3, rock: Rock, currentDir: THREE.Vector3): THREE.Vector3 | null {
    const toRock = new THREE.Vector3().subVectors(rock.mesh.position, pos);
    const dist = toRock.length();
    if (dist < 0.01) return null;
    const away = toRock.clone().multiplyScalar(-1).normalize();
    const tangent = new THREE.Vector3().crossVectors(currentDir, away).normalize();
    if (tangent.lengthSq() < 0.01) {
      const up = new THREE.Vector3(0, 1, 0);
      tangent.crossVectors(currentDir, up).normalize();
    }
    const candidates: THREE.Vector3[] = [];
    for (let i = -2; i <= 2; i++) {
      const angle = i * Math.PI / 4;
      const c = away.clone().applyAxisAngle(tangent, angle);
      candidates.push(c);
      const c2 = away.clone().applyAxisAngle(currentDir.clone().cross(tangent).normalize(), angle);
      candidates.push(c2);
    }
    let best: THREE.Vector3 | null = null;
    let bestScore = -Infinity;
    for (const cand of candidates) {
      const testPos = pos.clone().add(cand.clone().multiplyScalar(0.5));
      const rockDist = testPos.distanceTo(rock.mesh.position);
      const downward = Math.max(0, -cand.y);
      const score = rockDist * 2 + downward * 5 - cand.dot(currentDir) * 2;
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    return best;
  }

  private extendMainRoot(newPos: THREE.Vector3, deltaLen: number): void {
    const from = this.mainRootTip.position.clone();
    const color = this.mainColor.clone();
    const seg = this.createSegment(from, newPos, this.mainRadius, color, 10);
    this.mainRootSegments.push(seg);
    this.mainRootCurrentLength += deltaLen;
    this.mainRootTip.position.copy(newPos);
    this.mainRootTip.length = this.mainRootCurrentLength;
    this.mainRootNodes.push({
      position: newPos.clone(),
      direction: this.mainRootTip.direction.clone(),
      length: this.mainRootCurrentLength
    });
    this.mainRootTipPosition.copy(newPos);
    if (this.mainRootCurrentLength - this.lastBranchLength >= this.nextBranchTarget) {
      this.tryBranch();
    }
  }

  private tryBranch(): void {
    if (Math.random() < this.params.branchProbability) {
      this.createSideRoot();
    }
    this.lastBranchLength = this.mainRootCurrentLength;
    this.nextBranchTarget = this.randomRange(0.5, 2.0);
  }

  private createSideRoot(): void {
    const parentIdx = this.mainRootNodes.length - 1;
    const node = this.mainRootNodes[Math.max(0, parentIdx - 2)];
    if (!node) return;
    const parentDir = node.direction.clone().normalize();
    const angle = this.randomRange(Math.PI / 6, Math.PI / 3);
    const axis = this.randomPerpendicular(parentDir).normalize();
    const sideDir = parentDir.clone().applyAxisAngle(axis, angle).normalize();
    const maxLen = Math.min(this.params.maxRootLength * 0.5, this.mainRootCurrentLength * 0.5);
    const radius = this.randomRange(0.02, 0.04);
    const color1 = new THREE.Color(0xA0522D);
    const color2 = new THREE.Color(0xDEB887);
    const side: SideRoot = {
      nodes: [], segments: [], currentLength: 0, maxLength: maxLen,
      direction: sideDir, tip: node.position.clone(),
      startPos: node.position.clone(), radius,
      color1: color1, color2: color2, finished: false
    };
    side.nodes.push({
      position: node.position.clone(), direction: sideDir.clone(), length: 0 });
    this.sideRoots.push(side);
  }

  private growSideRoot(side: SideRoot, step: number): void {
    if (side.finished || side.currentLength >= side.maxLength) {
      side.finished = true;
      return;
    }
    const tip = side.nodes[side.nodes.length - 1];
    let growthDir = side.direction.clone();
    const waterPull = this.soil.getWaterAttraction(tip.position);
    const inWater = this.soil.isInWaterZone(tip.position);
    const rate = inWater ? step * 1.5 : step;
    if (waterPull.lengthSq() > 0.01) {
      growthDir.lerp(waterPull.normalize(), this.params.waterAttractionStrength * 0.4);
    }
    const noise = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.3
    );
    growthDir.add(noise).normalize();
    const nextPos = tip.position.clone().add(growthDir.clone().multiplyScalar(rate));
    const collision = this.soil.checkRockCollision(nextPos, side.radius * 1.5);
    const inside = this.soil.isInsideSoil(nextPos, side.radius);
    if (collision || !inside) {
      side.finished = true;
      return;
    }
    const t = side.currentLength / Math.max(0.01, side.maxLength);
    const col = side.color1.clone().lerp(side.color2, t);
    const seg = this.createSegment(
      tip.position, nextPos, side.radius * (1 - t * 0.3),
      col, 6
    );
    side.segments.push(seg);
    side.currentLength += rate;
    side.tip.copy(nextPos);
    side.direction.copy(growthDir);
    side.nodes.push({
      position: nextPos.clone(),
      direction: growthDir.clone(),
      length: side.currentLength
    });
  }

  private createSegment(
    from: THREE.Vector3,
    to: THREE.Vector3,
    radius: number,
    color: THREE.Color,
    radialSegments: number = 8
  ): RootSegment {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = Math.max(dir.length(), 0.001);
    const geo = new THREE.CylinderGeometry(radius, radius * 0.95, len, radialSegments, 1);
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 15
    });
    const mesh = new THREE.Mesh(geo, mat);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    mesh.castShadow = true;
    this.rootGroup.add(mesh);
    return {
      mesh, from: from.clone(), to: to.clone(), radius,
      segments: radialSegments, isLod: false
    };
  }

  private applyLOD(): void {
    const threshold = 4;
    const allSegments: RootSegment[] = [
      ...this.mainRootSegments,
      ...this.sideRoots.flatMap(s => s.segments)
    ];
    if (this.totalNodes > 2000) {
      for (const seg of allSegments) {
        if (seg.isLod) continue;
        const dist = seg.mesh.position.distanceTo(this.mainRootTipPosition);
        if (dist > threshold) {
          this.simplifySegment(seg);
        }
      }
    }
  }

  private simplifySegment(seg: RootSegment): void {
    seg.isLod = true;
    const newSegs = Math.max(3, Math.ceil(seg.segments / 2));
    if (newSegs >= seg.segments) return;
    const dir = new THREE.Vector3().subVectors(seg.to, seg.from);
    const len = Math.max(dir.length(), 0.001);
    seg.mesh.geometry.dispose();
    const newGeo = new THREE.CylinderGeometry(seg.radius, seg.radius * 0.95, len, newSegs, 1);
    seg.mesh.geometry = newGeo;
    seg.segments = newSegs;
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private randomPerpendicular(v: THREE.Vector3): THREE.Vector3 {
    const a = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    const perp = new THREE.Vector3().crossVectors(v, a);
    if (perp.lengthSq() < 0.01) {
      perp.set(1, 0, 0);
      perp.cross(v);
    }
    return perp.normalize();
  }

  public getStats(): { mainLength: number; sideCount: number; totalNodes: number } {
    return {
      mainLength: this.mainRootCurrentLength,
      sideCount: this.sideRoots.length,
      totalNodes: Math.floor(this.mainRootCurrentLength / this.segmentLength) +
        this.sideRoots.reduce((sum, s) => sum + Math.floor(s.currentLength / this.segmentLength), 0)
    };
  }

  public setParams(params: Partial<GrowthParams>): void {
    Object.assign(this.params, params);
  }

  public clear(): void {
    const dispose = (seg: RootSegment) => {
      seg.mesh.geometry.dispose();
      const mat = seg.mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else mat.dispose();
      this.rootGroup.remove(seg.mesh);
    };
    this.mainRootSegments.forEach(dispose);
    this.sideRoots.forEach(s => s.segments.forEach(dispose));
    this.mainRootSegments = [];
    this.mainRootNodes = [];
    this.mainRootCurrentLength = 0;
    this.sideRoots = [];
    this.totalNodes = 0;
    this.isGrowing = false;
    this.lastBranchLength = 0;
  }
}

interface SideRoot {
  nodes: RootNode[];
  segments: RootSegment[];
  currentLength: number;
  maxLength: number;
  direction: THREE.Vector3;
  tip: THREE.Vector3;
  startPos: THREE.Vector3;
  radius: number;
  color1: THREE.Color;
  color2: THREE.Color;
  finished: boolean;
}
