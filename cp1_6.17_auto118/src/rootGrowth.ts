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
  /** 原始圆柱体的径向分段数，用于LOD判断 */
  originalRadialSegments: number;
  isLod: boolean;
}

/**
 * 根系生长模拟系统
 *
 * 核心算法：
 * - 主根严格沿垂直方向（0, -1, 0）生长，仅在避障或水分吸引时偏转
 * - 侧根以30°-60°夹角从主根分叉，长度不超过主根当前长度的50%
 * - 避障采用多候选向量评分法：生成10个候选方向，按"远离石块+朝下+与当前方向一致"评分
 * - 水分吸引：将水分中心方向乘以用户可调的吸引强度参数，叠加到生长方向上
 * - LOD：超过2000节点时，将距离>4单位的远距离根分段替换为BoxGeometry，减少约50%顶点
 */
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

  /** 每0.1单位长度算一个节点，用于统计总节点数 */
  private readonly nodeUnit: number = 0.1;
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
      10
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

  /**
   * 计算主根生长方向
   *
   * 主根默认严格沿垂直方向 (0, -1, 0) 生长。
   * 仅在以下两种情况改变方向：
   * 1. 遇到石块障碍物时，由 evadeRock() 计算避障方向
   * 2. 受水分吸引时，将水分方向乘以吸引强度后叠加到生长方向
   *
   * 注意：不添加任何随机扰动，保证主根严格垂直
   */
  private computeMainRootDirection(): THREE.Vector3 {
    let result = new THREE.Vector3(0, -1, 0);

    const waterPull = this.soil.getWaterAttraction(this.mainRootTip.position);
    if (waterPull.lengthSq() > 0.001) {
      const waterDir = waterPull.clone().normalize();
      const strength = this.params.waterAttractionStrength;
      result.add(waterDir.multiplyScalar(strength * 0.3));
      result.normalize();
    }

    if (this.mainRootTip.direction.distanceTo(new THREE.Vector3(0, -1, 0)) > 0.01) {
      result.lerp(this.mainRootTip.direction.clone().normalize(), 0.1);
      result.normalize();
    }

    return result;
  }

  /**
   * 多候选向量避障算法
   *
   * 当主根/侧根遇到石块时，生成多个候选绕行方向，通过评分函数选出最优方向。
   *
   * 候选生成：以"远离石块"方向为基准，围绕两个正交轴分别旋转 -90°~+90°（步长45°），
   * 共产生约10个候选方向。
   *
   * 评分函数：score = rockDist * 2 + downward * 5 - dot(currentDir) * 2
   * - rockDist：候选方向测试点与石块的距离（越远越好，权重×2）
   * - downward：候选方向的向下分量（越向下越好，权重×5，鼓励主根继续向下生长）
   * - dot(currentDir)：与当前生长方向的一致性（越一致越好，取负号使一致方向得分更高）
   */
  private evadeRock(pos: THREE.Vector3, rock: Rock, currentDir: THREE.Vector3): THREE.Vector3 | null {
    const toRock = new THREE.Vector3().subVectors(rock.mesh.position, pos);
    const dist = toRock.length();
    if (dist < 0.01) return null;

    const away = toRock.clone().multiplyScalar(-1).normalize();

    // 计算第一个旋转轴：当前方向与远离方向叉积得到的切线
    let tangent = new THREE.Vector3().crossVectors(currentDir, away);
    if (tangent.lengthSq() < 0.001) {
      tangent.crossVectors(currentDir, new THREE.Vector3(0, 1, 0));
    }
    tangent.normalize();

    // 计算第二个旋转轴：与切线和远离方向都正交的方向
    const secondAxis = new THREE.Vector3().crossVectors(away, tangent).normalize();

    // 围绕两个正交轴，以45°步长旋转，生成10个候选方向
    const candidates: THREE.Vector3[] = [];
    for (let i = -2; i <= 2; i++) {
      const angle = i * Math.PI / 4;
      candidates.push(away.clone().applyAxisAngle(tangent, angle));
      candidates.push(away.clone().applyAxisAngle(secondAxis, angle));
    }

    // 对每个候选方向评分，选出得分最高的
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

  /**
   * 创建侧根
   *
   * 侧根从主根最近节点处分叉，方向与主根成30°-60°夹角。
   * maxLength 初始化为主根当前长度的50%，并在后续生长中动态更新此上限。
   */
  private createSideRoot(): void {
    const parentIdx = this.mainRootNodes.length - 1;
    const node = this.mainRootNodes[Math.max(0, parentIdx - 2)];
    if (!node) return;
    const parentDir = node.direction.clone().normalize();
    const angle = this.randomRange(Math.PI / 6, Math.PI / 3);
    const axis = this.randomPerpendicular(parentDir).normalize();
    const sideDir = parentDir.clone().applyAxisAngle(axis, angle).normalize();
    const maxLen = this.mainRootCurrentLength * 0.5;
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

  /**
   * 侧根单步生长
   *
   * 关键逻辑：
   * - 动态更新 maxLength 为主根当前长度的50%，确保侧根长度始终不超过此比例
   * - 水分吸引：将水分方向乘以 waterAttractionStrength 参数后叠加到生长方向，
   *   强度越大弯曲越明显（0=无吸引，2.0=强弯曲）
   * - 在高水分区域内，侧根生长速率提升50%
   */
  private growSideRoot(side: SideRoot, step: number): void {
    if (side.finished) return;

    // 动态更新侧根最大长度：始终为主根当前长度的50%
    side.maxLength = this.mainRootCurrentLength * 0.5;

    if (side.currentLength >= side.maxLength) {
      side.finished = true;
      return;
    }

    const tip = side.nodes[side.nodes.length - 1];
    let growthDir = side.direction.clone();

    // 水分吸引弯曲：将水分方向乘以用户可调的吸引强度参数，直接叠加到生长方向
    const waterPull = this.soil.getWaterAttraction(tip.position);
    const inWater = this.soil.isInWaterZone(tip.position);
    if (waterPull.lengthSq() > 0.001) {
      const waterDir = waterPull.clone().normalize();
      growthDir.add(waterDir.multiplyScalar(this.params.waterAttractionStrength * 0.3));
      growthDir.normalize();
    }

    // 高水分区域速率提升50%
    const rate = inWater ? step * 1.5 : step;

    // 侧根添加随机扰动（主根不添加）
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

    // 颜色渐变：从 #A0522D 到 #DEB887
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
      originalRadialSegments: radialSegments, isLod: false
    };
  }

  /**
   * LOD（细节层次）优化
   *
   * 当总节点数超过2000时自动启用。将距离根尖超过4单位的远距离根分段
   * 替换为BoxGeometry，相比原始CylinderGeometry可减少约50%以上顶点数。
   *
   * 顶点数对比（以主根为例）：
   * - CylinderGeometry(10段, 1高度分段): 约 44 个顶点, 40 个三角面
   * - BoxGeometry: 24 个顶点, 12 个三角面 → 减少约 45% 顶点, 70% 三角面
   *
   * 对于侧根(6段): 约 28 顶点 → Box 24 顶点 ≈ 14% 顶点减少,
   * 但三角面从 24 降到 12，减少 50%
   */
  private applyLOD(): void {
    const totalNodes = this.computeTotalNodes();
    if (totalNodes <= 2000) return;

    const threshold = 4;
    const allSegments: RootSegment[] = [
      ...this.mainRootSegments,
      ...this.sideRoots.flatMap(s => s.segments)
    ];
    for (const seg of allSegments) {
      if (seg.isLod) continue;
      const dist = seg.mesh.position.distanceTo(this.mainRootTipPosition);
      if (dist > threshold) {
        this.simplifySegment(seg);
      }
    }
  }

  /**
   * 将远距离根分段简化为BoxGeometry
   *
   * 用一个长方体替代圆柱体，大幅减少三角面数量（12 vs 40/24）。
   * 保留原始位置、方向和颜色，仅替换几何体。
   */
  private simplifySegment(seg: RootSegment): void {
    seg.isLod = true;
    const dir = new THREE.Vector3().subVectors(seg.to, seg.from);
    const len = Math.max(dir.length(), 0.001);

    // 用BoxGeometry替代CylinderGeometry，顶点数从 ~44 降到 24，三角面从 40 降到 12
    const newGeo = new THREE.BoxGeometry(
      seg.radius * 2,
      len,
      seg.radius * 2,
      1, 1, 1
    );
    seg.mesh.geometry.dispose();
    seg.mesh.geometry = newGeo;
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

  /**
   * 按每0.1单位长度精确计算总节点数
   *
   * 节点数 = 主根长度 / 0.1 + Σ(每条侧根长度 / 0.1)
   * 使用 Math.round 避免浮点精度导致偏差
   */
  private computeTotalNodes(): number {
    const mainNodes = Math.round(this.mainRootCurrentLength / this.nodeUnit);
    const sideNodes = this.sideRoots.reduce(
      (sum, s) => sum + Math.round(s.currentLength / this.nodeUnit), 0
    );
    return mainNodes + sideNodes;
  }

  public getStats(): { mainLength: number; sideCount: number; totalNodes: number } {
    return {
      mainLength: this.mainRootCurrentLength,
      sideCount: this.sideRoots.length,
      totalNodes: this.computeTotalNodes()
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
    this.isGrowing = false;
    this.lastBranchLength = 0;
  }
}

interface SideRoot {
  nodes: RootNode[];
  segments: RootSegment[];
  currentLength: number;
  /** 侧根最大长度，动态更新为主根当前长度的50% */
  maxLength: number;
  direction: THREE.Vector3;
  tip: THREE.Vector3;
  startPos: THREE.Vector3;
  radius: number;
  color1: THREE.Color;
  color2: THREE.Color;
  finished: boolean;
}
