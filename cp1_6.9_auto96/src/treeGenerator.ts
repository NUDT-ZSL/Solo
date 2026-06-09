import { TreeNode, TreeBranch, Vector2 } from './types';
import {
  generateId,
  randomRange,
  clamp,
  lerpVector,
} from './utils';

const HORIZONTAL_SPREAD = 200;
const VERTICAL_STEP = 150;
const MIN_BRANCH_THICKNESS = 2;
const MAX_BRANCH_THICKNESS = 4;
const BRANCH_PROBABILITY = 0.6;
const SHRINK_PROBABILITY = 0.002;
const MAX_NODES = 100;
const MAP_UPDATE_INTERVAL = 100;

export class TreeGenerator {
  nodes: Map<string, TreeNode> = new Map();
  branches: Map<string, TreeBranch> = new Map();
  rootNodeId: string | null = null;
  private lastGeneratedY = 0;
  private lastShrinkCheck = 0;
  private lastMapUpdate = 0;

  generateInitialTree(canvasWidth: number, canvasHeight: number): void {
    this.nodes.clear();
    this.branches.clear();

    const rootY = canvasHeight - 100;
    const rootPos: Vector2 = { x: canvasWidth / 2, y: rootY };

    const rootNode: TreeNode = {
      id: generateId(),
      position: rootPos,
      depth: 0,
      connections: [],
      width: 8,
      explored: false,
      isRoot: true,
    };
    this.rootNodeId = rootNode.id;
    this.nodes.set(rootNode.id, rootNode);
    this.lastGeneratedY = rootY;

    this.generateLevel(rootNode.id, canvasWidth / 2, rootY - VERTICAL_STEP, 1, 3);
  }

  private generateLevel(
    parentId: string,
    baseX: number,
    baseY: number,
    depth: number,
    branchCount: number
  ): void {
    const parent = this.nodes.get(parentId);
    if (!parent) return;

    for (let i = 0; i < branchCount; i++) {
      const offsetAngle = branchCount === 1
        ? 0
        : (i / (branchCount - 1) - 0.5) * 2;

      const offsetX = offsetAngle * HORIZONTAL_SPREAD * randomRange(0.5, 1) + randomRange(-30, 30);
      const nodeX = clamp(baseX + offsetX, 80, 2000);
      const nodeY = baseY + randomRange(-30, 30);

      const childNode: TreeNode = {
        id: generateId(),
        position: { x: nodeX, y: nodeY },
        depth,
        connections: [],
        width: MAX_BRANCH_THICKNESS - depth * 0.3,
        explored: false,
      };

      this.nodes.set(childNode.id, childNode);

      const thickness = Math.max(
        MIN_BRANCH_THICKNESS,
        MAX_BRANCH_THICKNESS - depth * 0.25
      );

      const branch = this.createBranch(parent.id, childNode.id, thickness);
      this.branches.set(branch.id, branch);

      parent.connections.push(childNode.id);
      childNode.connections.push(parent.id);

      this.lastGeneratedY = Math.min(this.lastGeneratedY, nodeY);
    }
  }

  private createBranch(
    fromId: string,
    toId: string,
    thickness: number
  ): TreeBranch {
    const fromNode = this.nodes.get(fromId)!;
    const toNode = this.nodes.get(toId)!;

    const mid = lerpVector(fromNode.position, toNode.position, 0.5);
    const perpX = -(toNode.position.y - fromNode.position.y);
    const perpY = toNode.position.x - fromNode.position.x;
    const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
    const curveOffset = randomRange(-30, 30);

    const curvePoint: Vector2 = {
      x: mid.x + (perpX / perpLen) * curveOffset,
      y: mid.y + (perpY / perpLen) * curveOffset,
    };

    return {
      id: generateId(),
      from: fromId,
      to: toId,
      thickness,
      curvePoints: [fromNode.position, curvePoint, toNode.position],
      shrinkFactor: 1,
      isActive: true,
    };
  }

  update(
    playerY: number,
    cameraY: number,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number
  ): { needsUpdate: boolean } {
    if (currentTime - this.lastMapUpdate < MAP_UPDATE_INTERVAL) {
      return { needsUpdate: false };
    }
    this.lastMapUpdate = currentTime;

    let needsUpdate = false;
    const screenTopY = cameraY;
    const generateThreshold = screenTopY - VERTICAL_STEP * 0.5;

    while (this.lastGeneratedY > generateThreshold && this.nodes.size < MAX_NODES) {
      const tips = this.getHighestUnbranchedNodes();

      if (tips.length === 0) break;

      const newY = this.lastGeneratedY - VERTICAL_STEP;
      let branchedAny = false;

      for (const tipId of tips) {
        const tip = this.nodes.get(tipId);
        if (!tip) continue;

        if (tip.isTip) continue;

        const shouldBranch = Math.random() < BRANCH_PROBABILITY;
        const branchCount = shouldBranch ? (Math.random() < 0.5 ? 2 : 3) : 1;

        const newDepth = tip.depth + 1;
        if (newDepth > 15) continue;

        this.generateLevel(tipId, tip.position.x, newY, newDepth, branchCount);
        branchedAny = true;
      }

      if (!branchedAny) {
        this.lastGeneratedY = newY;
      }
      needsUpdate = true;
    }

    if (currentTime - this.lastShrinkCheck > 2000) {
      this.lastShrinkCheck = currentTime;
      this.tryShrinkRoots(cameraY, canvasHeight);
    }

    this.updateBranchShrink();

    return { needsUpdate };
  }

  private getHighestUnbranchedNodes(): string[] {
    const candidates: { id: string; y: number }[] = [];

    for (const node of this.nodes.values()) {
      const childConnections = node.connections.filter((connId) => {
        const conn = this.nodes.get(connId);
        return conn && conn.position.y < node.position.y;
      });

      if (childConnections.length === 0 && !node.isRoot) {
        candidates.push({ id: node.id, y: node.position.y });
      }
    }

    candidates.sort((a, b) => b.y - a.y);
    return candidates.slice(0, 3).map((c) => c.id);
  }

  private tryShrinkRoots(cameraY: number, canvasHeight: number): void {
    const cutoffY = cameraY + canvasHeight * 1.5;

    const nodesToProcess: string[] = [];
    for (const node of this.nodes.values()) {
      if (node.position.y > cutoffY && !node.isRoot) {
        nodesToProcess.push(node.id);
      }
    }

    for (const branch of this.branches.values()) {
      if (!branch.isActive) continue;

      const fromNode = this.nodes.get(branch.from);
      const toNode = this.nodes.get(branch.to);

      if (!fromNode || !toNode) continue;

      const bothBelow = fromNode.position.y > cutoffY && toNode.position.y > cutoffY;
      if (bothBelow && Math.random() < 0.3) {
        branch.isActive = false;
      }

      if (Math.random() < SHRINK_PROBABILITY && branch.shrinkFactor > 0.3) {
        branch.shrinkFactor = Math.max(0.3, branch.shrinkFactor - 0.05);
        this.updateBranchCurve(branch);
      }
    }
  }

  private updateBranchCurve(branch: TreeBranch): void {
    const fromNode = this.nodes.get(branch.from);
    const toNode = this.nodes.get(branch.to);
    if (!fromNode || !toNode || branch.curvePoints.length < 3) return;

    const originalStart = fromNode.position;
    const originalEnd = toNode.position;
    const originalMid = branch.curvePoints[1];

    const sf = branch.shrinkFactor;
    branch.curvePoints[1] = {
      x: originalStart.x + (originalMid.x - originalStart.x) * sf,
      y: originalStart.y + (originalMid.y - originalStart.y) * sf,
    };
  }

  private updateBranchShrink(): void {
    for (const branch of this.branches.values()) {
      if (branch.shrinkFactor < 1 && Math.random() < 0.01) {
        branch.shrinkFactor = Math.min(1, branch.shrinkFactor + 0.02);
        const fromNode = this.nodes.get(branch.from);
        const toNode = this.nodes.get(branch.to);
        if (!fromNode || !toNode) continue;

        const mid = lerpVector(fromNode.position, toNode.position, 0.5);
        const perpX = -(toNode.position.y - fromNode.position.y);
        const perpY = toNode.position.x - fromNode.position.x;
        const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        const curveOffset = randomRange(-25, 25);

        branch.curvePoints = [
          fromNode.position,
          {
            x: mid.x + (perpX / perpLen) * curveOffset,
            y: mid.y + (perpY / perpLen) * curveOffset,
          },
          toNode.position,
        ];
      }
    }
  }

  markNodeExplored(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node && !node.explored) {
      node.explored = true;
    }
  }

  getExploredNodeCount(): number {
    let count = 0;
    for (const node of this.nodes.values()) {
      if (node.explored) count++;
    }
    return count;
  }

  getNodesArray(): TreeNode[] {
    return Array.from(this.nodes.values());
  }

  getBranchesArray(): TreeBranch[] {
    return Array.from(this.branches.values()).filter((b) => b.isActive);
  }

  getRandomNodePosition(preferUnseen: boolean = true): Vector2 | null {
    const nodes = this.getNodesArray();
    if (nodes.length === 0) return null;

    if (preferUnseen) {
      const unseen = nodes.filter(
        (n) => !n.explored && !n.isRoot && Math.random() < 0.7
      );
      if (unseen.length > 0) {
        const node = unseen[Math.floor(Math.random() * unseen.length)];
        return { ...node.position };
      }
    }

    const candidates = nodes.filter((n) => !n.isRoot && n.depth > 1);
    if (candidates.length === 0) return null;

    const node = candidates[Math.floor(Math.random() * candidates.length)];
    return { ...node.position };
  }

  getNodesOnScreen(cameraY: number, canvasHeight: number): TreeNode[] {
    const top = cameraY - 100;
    const bottom = cameraY + canvasHeight + 100;
    return this.getNodesArray().filter(
      (n) => n.position.y >= top && n.position.y <= bottom
    );
  }
}
