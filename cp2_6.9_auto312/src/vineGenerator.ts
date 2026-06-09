import * as THREE from 'three';

export type VineStage = 'sprouting' | 'growing' | 'flowering' | 'fruiting';

export interface VineNode {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  age: number;
  level: number;
  radius: number;
  parentIndex: number;
  hasLeftLeaf: boolean;
  hasRightLeaf: boolean;
  leafPhase: number;
}

export interface Flower {
  nodeIndex: number;
  position: THREE.Vector3;
  bloomProgress: number;
  color: THREE.Color;
  hasFruit: boolean;
  fruitReady: boolean;
  withered: boolean;
}

export interface Vine {
  id: number;
  seedPosition: THREE.Vector3;
  nodes: VineNode[];
  flowers: Flower[];
  totalAge: number;
  stage: VineStage;
  waterCount: number;
  growthRadius: number;
  tipIndices: number[];
  lastBranchingTime: number;
  isSinking: boolean;
  sinkProgress: number;
}

const GROWTH_RADIUS = 20;
const COLLISION_DISTANCE = 0.3;
const NODE_SPACING = 0.25;
const MAX_NODES_PER_VINE = 250;

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomUnitVector(): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  ).normalize();
}

export class VineGenerator {
  private vines: Map<number, Vine> = new Map();
  private nextVineId = 0;
  private lightDirection = new THREE.Vector3(0.3, 1, 0.2).normalize();
  private allNodePositions: THREE.Vector3[] = [];

  createVine(seedPosition: THREE.Vector3): Vine {
    const vine: Vine = {
      id: this.nextVineId++,
      seedPosition: seedPosition.clone(),
      nodes: [],
      flowers: [],
      totalAge: 0,
      stage: 'sprouting',
      waterCount: 0,
      growthRadius: GROWTH_RADIUS,
      tipIndices: [],
      lastBranchingTime: 0,
      isSinking: true,
      sinkProgress: 0
    };

    const baseNode: VineNode = {
      position: seedPosition.clone(),
      direction: new THREE.Vector3(0, 1, 0),
      age: 0,
      level: 0,
      radius: 0.08,
      parentIndex: -1,
      hasLeftLeaf: false,
      hasRightLeaf: false,
      leafPhase: Math.random() * Math.PI * 2
    };
    vine.nodes.push(baseNode);
    vine.tipIndices.push(0);
    this.vines.set(vine.id, vine);
    this.allNodePositions.push(baseNode.position);
    return vine;
  }

  getVine(id: number): Vine | undefined {
    return this.vines.get(id);
  }

  getAllVines(): Vine[] {
    return Array.from(this.vines.values());
  }

  addWater(vineId: number): void {
    const vine = this.vines.get(vineId);
    if (vine) {
      vine.waterCount++;
    }
  }

  private checkCollision(pos: THREE.Vector3, excludeVineId: number): boolean {
    for (const vine of this.vines.values()) {
      if (vine.id === excludeVineId) continue;
      for (const node of vine.nodes) {
        if (pos.distanceTo(node.position) < COLLISION_DISTANCE) {
          return true;
        }
      }
    }
    return false;
  }

  private checkSelfCollision(vine: Vine, pos: THREE.Vector3, currentTipIdx: number): boolean {
    for (let i = 0; i < vine.nodes.length; i++) {
      if (i === currentTipIdx) continue;
      const node = vine.nodes[i];
      if (pos.distanceTo(node.position) < COLLISION_DISTANCE * 0.8) {
        return true;
      }
    }
    return false;
  }

  private isInsideBounds(vine: Vine, pos: THREE.Vector3): boolean {
    const dx = pos.x - vine.seedPosition.x;
    const dy = pos.y - vine.seedPosition.y;
    const dz = pos.z - vine.seedPosition.z;
    if (dy < -0.2) return false;
    const distSq = dx * dx + dy * dy + dz * dz;
    return distSq < vine.growthRadius * vine.growthRadius;
  }

  private computeGrowthDirection(vine: Vine, node: VineNode): THREE.Vector3 {
    const dir = node.direction.clone().normalize();
    dir.add(this.lightDirection.clone().multiplyScalar(0.3));
    const toCenter = vine.seedPosition.clone().sub(node.position);
    const dist = toCenter.length();
    if (dist > vine.growthRadius * 0.7) {
      toCenter.normalize();
      dir.add(toCenter.multiplyScalar((dist / vine.growthRadius - 0.7) * 2));
    }
    dir.x += (Math.random() - 0.5) * 0.4;
    dir.z += (Math.random() - 0.5) * 0.4;
    dir.y += Math.random() * 0.2;
    if (dir.y < 0.1) dir.y = 0.1;
    return dir.normalize();
  }

  private deflectDirection(dir: THREE.Vector3): THREE.Vector3 {
    const angle = randomRange(5, 10) * Math.PI / 180;
    const axis = randomUnitVector();
    return dir.clone().applyAxisAngle(axis, angle).normalize();
  }

  update(dt: number, timeScale: number): Array<{ position: THREE.Vector3; vineId: number }> {
    const scaledDt = dt * timeScale;
    const boundarySparks: Array<{ position: THREE.Vector3; vineId: number }> = [];

    for (const vine of this.vines.values()) {
      if (vine.isSinking) {
        vine.sinkProgress += scaledDt * 0.5;
        if (vine.sinkProgress >= 1) {
          vine.sinkProgress = 1;
          vine.isSinking = false;
        }
        if (vine.nodes.length > 0) {
          const sinkOffset = -0.1 * vine.sinkProgress;
          vine.nodes[0].position.y = vine.seedPosition.y + sinkOffset;
        }
        continue;
      }

      vine.totalAge += scaledDt;

      if (vine.totalAge < 5) {
        vine.stage = 'sprouting';
      } else if (vine.totalAge < 35) {
        vine.stage = 'growing';
      } else if (vine.stage !== 'fruiting') {
        vine.stage = 'flowering';
      }

      if (vine.stage === 'sprouting') {
        if (vine.tipIndices.length === 1 && vine.totalAge > 0.5) {
          const sproutCount = Math.floor(randomRange(3, 6));
          const baseIdx = vine.tipIndices[0];
          vine.tipIndices = [];
          for (let i = 0; i < sproutCount; i++) {
            const angle = (i / sproutCount) * Math.PI * 2 + Math.random() * 0.5;
            const newDir = new THREE.Vector3(
              Math.cos(angle) * 0.5,
              0.8 + Math.random() * 0.2,
              Math.sin(angle) * 0.5
            ).normalize();
            const newNode: VineNode = {
              position: vine.nodes[baseIdx].position.clone().add(newDir.clone().multiplyScalar(NODE_SPACING)),
              direction: newDir,
              age: 0,
              level: 1,
              radius: 0.04,
              parentIndex: baseIdx,
              hasLeftLeaf: false,
              hasRightLeaf: false,
              leafPhase: Math.random() * Math.PI * 2
            };
            vine.nodes.push(newNode);
            vine.tipIndices.push(vine.nodes.length - 1);
            this.allNodePositions.push(newNode.position);
          }
        }
        const bendSpeed = randomRange(1, 2) * Math.PI / 180;
        for (const tipIdx of vine.tipIndices) {
          const node = vine.nodes[tipIdx];
          const bendAxis = new THREE.Vector3(Math.sin(vine.totalAge * 2 + tipIdx), 0, Math.cos(vine.totalAge * 2 + tipIdx)).normalize();
          node.direction.applyAxisAngle(bendAxis, bendSpeed * scaledDt);
          node.direction.y = Math.max(node.direction.y, 0.3);
          node.direction.normalize();
          node.age += scaledDt;
        }
      }

      if (vine.stage === 'growing' || vine.stage === 'flowering') {
        for (const tipIdx of vine.tipIndices) {
          const node = vine.nodes[tipIdx];
          node.age += scaledDt;

          const growthRate = 0.15 + vine.waterCount * 0.03;
          if (node.age - node.age % (NODE_SPACING / growthRate) < scaledDt) {
            if (vine.nodes.length >= MAX_NODES_PER_VINE) continue;

            const growthDir = this.computeGrowthDirection(vine, node);
            let newPos = node.position.clone().add(growthDir.clone().multiplyScalar(NODE_SPACING));

            let attempts = 0;
            while ((this.checkCollision(newPos, vine.id) || this.checkSelfCollision(vine, newPos, tipIdx)) && attempts < 5) {
              const deflected = this.deflectDirection(growthDir);
              newPos = node.position.clone().add(deflected.clone().multiplyScalar(NODE_SPACING));
              attempts++;
            }

            if (!this.isInsideBounds(vine, newPos)) {
              const sparkPos = node.position.clone().add(growthDir.clone().multiplyScalar(NODE_SPACING * 0.5));
              boundarySparks.push({ position: sparkPos, vineId: vine.id });
              const deflectDir = this.deflectDirection(growthDir.clone().negate());
              newPos = node.position.clone().add(deflectDir.multiplyScalar(NODE_SPACING));
              node.direction.copy(deflectDir);
            } else {
              node.direction.copy(growthDir);
            }

            const colorProgress = Math.min(1, (vine.totalAge - 5) / 30);
            const newRadius = 0.03 + (1 - colorProgress) * 0.03;

            const newNode: VineNode = {
              position: newPos,
              direction: node.direction.clone(),
              age: 0,
              level: node.level,
              radius: newRadius,
              parentIndex: tipIdx,
              hasLeftLeaf: Math.random() < 0.4 && node.level >= 1,
              hasRightLeaf: Math.random() < 0.4 && node.level >= 1,
              leafPhase: Math.random() * Math.PI * 2
            };
            vine.nodes.push(newNode);
            this.allNodePositions.push(newNode.position);

            const tipArrayIdx = vine.tipIndices.indexOf(tipIdx);
            if (tipArrayIdx >= 0) {
              vine.tipIndices[tipArrayIdx] = vine.nodes.length - 1;
            }
          }
        }

        if (vine.stage === 'growing' && vine.totalAge - vine.lastBranchingTime > 2) {
          vine.lastBranchingTime = vine.totalAge;
          const candidates: number[] = [];
          for (let i = 0; i < vine.tipIndices.length; i++) {
            const tip = vine.nodes[vine.tipIndices[i]];
            if (tip.level < 3 && vine.nodes.length < MAX_NODES_PER_VINE - 10) {
              candidates.push(vine.tipIndices[i]);
            }
          }
          if (candidates.length > 0) {
            const branchIdx = candidates[Math.floor(Math.random() * candidates.length)];
            const branchNode = vine.nodes[branchIdx];
            const perp = new THREE.Vector3();
            if (Math.abs(branchNode.direction.x) < 0.9) {
              perp.set(1, 0, 0);
            } else {
              perp.set(0, 0, 1);
            }
            perp.cross(branchNode.direction).normalize();
            const side = Math.random() < 0.5 ? 1 : -1;
            const branchDir = branchNode.direction.clone()
              .multiplyScalar(0.6)
              .add(perp.multiplyScalar(side * 0.6))
              .add(new THREE.Vector3(0, 0.2, 0))
              .normalize();

            const branchStart = branchNode.position.clone();
            let curPos = branchStart.clone();
            let curDir = branchDir.clone();
            const branchLength = Math.floor(randomRange(3, 8));

            for (let i = 0; i < branchLength && vine.nodes.length < MAX_NODES_PER_VINE; i++) {
              curPos = curPos.add(curDir.clone().multiplyScalar(NODE_SPACING * 0.6));
              curDir.x += (Math.random() - 0.5) * 0.3;
              curDir.z += (Math.random() - 0.5) * 0.3;
              curDir.y += Math.random() * 0.15;
              if (curDir.y < 0.05) curDir.y = 0.05;
              curDir.normalize();

              if (!this.isInsideBounds(vine, curPos)) break;
              if (this.checkCollision(curPos, vine.id) || this.checkSelfCollision(vine, curPos, -1)) break;

              const newNode: VineNode = {
                position: curPos.clone(),
                direction: curDir.clone(),
                age: 0,
                level: branchNode.level + 1,
                radius: 0.025,
                parentIndex: vine.nodes.length - 1,
                hasLeftLeaf: Math.random() < 0.5,
                hasRightLeaf: Math.random() < 0.5,
                leafPhase: Math.random() * Math.PI * 2
              };
              vine.nodes.push(newNode);
              this.allNodePositions.push(newNode.position);
              if (i === branchLength - 1) {
                vine.tipIndices.push(vine.nodes.length - 1);
              }
            }
          }
        }
      }

      if (vine.stage === 'flowering') {
        if (vine.flowers.length === 0) {
          const bloomCount = Math.floor(randomRange(3, 6));
          const validTips = vine.tipIndices.filter(idx => {
            const node = vine.nodes[idx];
            return node.position.y > vine.seedPosition.y + 1;
          });
          for (let i = 0; i < Math.min(bloomCount, validTips.length); i++) {
            const tipIdx = validTips[i % validTips.length];
            const color = new THREE.Color();
            color.setHSL(0.95 + Math.random() * 0.08, 0.8, 0.6);
            vine.flowers.push({
              nodeIndex: tipIdx,
              position: vine.nodes[tipIdx].position.clone(),
              bloomProgress: 0,
              color,
              hasFruit: false,
              fruitReady: false,
              withered: false
            });
          }
        }

        for (const flower of vine.flowers) {
          if (flower.nodeIndex >= 0 && flower.nodeIndex < vine.nodes.length) {
            flower.position.copy(vine.nodes[flower.nodeIndex].position);
          }
          if (!flower.hasFruit) {
            flower.bloomProgress = Math.min(1, flower.bloomProgress + scaledDt / 3);
            if (flower.bloomProgress >= 1 && !flower.withered) {
              if (flower.bloomProgress >= 1 + 5 / 3) {
                flower.withered = true;
                flower.hasFruit = true;
              }
            }
          } else if (!flower.fruitReady) {
            flower.fruitReady = true;
          }
        }

        if (vine.flowers.every(f => f.hasFruit)) {
          vine.stage = 'fruiting';
        }
      }
    }

    return boundarySparks;
  }

  pickFruit(vineId: number, flowerIdx: number): boolean {
    const vine = this.vines.get(vineId);
    if (!vine) return false;
    const flower = vine.flowers[flowerIdx];
    if (!flower || !flower.fruitReady) return false;
    vine.flowers.splice(flowerIdx, 1);
    return true;
  }

  getFlowerAt(position: THREE.Vector3, threshold: number = 0.5): { vineId: number; flowerIdx: number } | null {
    for (const vine of this.vines.values()) {
      for (let i = 0; i < vine.flowers.length; i++) {
        if (vine.flowers[i].fruitReady && vine.flowers[i].position.distanceTo(position) < threshold) {
          return { vineId: vine.id, flowerIdx: i };
        }
      }
    }
    return null;
  }

  findNearestNode(worldPos: THREE.Vector3, threshold: number = 1): { vineId: number; nodeIdx: number } | null {
    let best: { vineId: number; nodeIdx: number; dist: number } | null = null;
    for (const vine of this.vines.values()) {
      for (let i = 0; i < vine.nodes.length; i++) {
        const d = vine.nodes[i].position.distanceTo(worldPos);
        if (d < threshold && (!best || d < best.dist)) {
          best = { vineId: vine.id, nodeIdx: i, dist: d };
        }
      }
    }
    return best ? { vineId: best.vineId, nodeIdx: best.nodeIdx } : null;
  }
}
