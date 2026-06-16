export type NodeType = 'terminal' | 'firewall' | 'target' | 'encrypted' | 'exit';

export interface Node {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  connections: number[];
  securityLevel: number;
  hacked: boolean;
  pulsePhase: number;
}

export interface Edge {
  from: number;
  to: number;
  dataFlowOffset: number;
}

export type ToolType = 'crawler' | 'scanner' | 'cloner';

export interface ToolState {
  type: ToolType;
  cooldown: number;
  selected: boolean;
}

export interface AI {
  id: number;
  currentNode: number;
  targetNode: number;
  path: number[];
  detectRange: number;
  moveProgress: number;
  moveSpeed: number;
  scanTimer: number;
  scanInterval: number;
}

export interface GameState {
  nodes: Node[];
  edges: Edge[];
  playerNode: number;
  score: number;
  alert: number;
  round: number;
  escapeMode: boolean;
  escapeTimer: number;
  gameOver: boolean;
  stealProgress: number;
  stealNodeId: number | null;
  lastStealClick: number;
  tools: Record<ToolType, ToolState>;
  ais: AI[];
  scannerActive: number;
  stealthActive: number;
  stealthCooldown: number;
  invalidPathFlash: number;
  pulseNodes: Map<number, number>;
}

export interface GenerateNodeMapOptions {
  nodeCount: number;
  width: number;
  height: number;
  round: number;
}

export function generateNodeMap(options: GenerateNodeMapOptions): { nodes: Node[]; edges: Edge[] } {
  const { nodeCount, width, height, round } = options;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const padding = 80;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const jitterX = (Math.random() - 0.5) * 60;
    const jitterY = (Math.random() - 0.5) * 60;
    const x = padding + (col / 4) * innerWidth + jitterX;
    const y = padding + (row / 2.5) * innerHeight + jitterY;

    nodes.push({
      id: i,
      x,
      y,
      type: 'terminal',
      connections: [],
      securityLevel: Math.random() * 0.3 + 0.1,
      hacked: false,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  const encryptedId = 0;
  nodes[encryptedId].type = 'encrypted';
  nodes[encryptedId].hacked = true;

  const targetId = nodeCount - 1;
  nodes[targetId].type = 'target';

  const firewallCount = Math.min(4 + round, 8);
  const availableForFirewall = nodes.filter((n, i) => i !== encryptedId && i !== targetId);
  for (let i = 0; i < firewallCount && i < availableForFirewall.length; i++) {
    availableForFirewall[i].type = 'firewall';
    availableForFirewall[i].securityLevel = 0.5 + Math.random() * 0.5;
  }

  for (let i = 0; i < nodeCount; i++) {
    const distances: { id: number; dist: number }[] = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      distances.push({ id: j, dist: Math.sqrt(dx * dx + dy * dy) });
    }
    distances.sort((a, b) => a.dist - b.dist);

    const connectCount = Math.min(2 + Math.floor(Math.random() * 3), 4);
    for (let k = 0; k < connectCount && k < distances.length; k++) {
      const targetNodeId = distances[k].id;
      if (!nodes[i].connections.includes(targetNodeId)) {
        nodes[i].connections.push(targetNodeId);
      }
      if (!nodes[targetNodeId].connections.includes(i)) {
        nodes[targetNodeId].connections.push(i);
      }
    }
  }

  for (let i = 0; i < nodeCount; i++) {
    for (const connId of nodes[i].connections) {
      if (connId > i) {
        edges.push({
          from: i,
          to: connId,
          dataFlowOffset: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  const exitCount = 2;
  const existingIds = new Set(nodes.map((n) => n.id));
  for (let e = 0; e < exitCount; e++) {
    const side = Math.floor(Math.random() * 4);
    let ex = 0, ey = 0;
    switch (side) {
      case 0: ex = 40 + Math.random() * (width - 80); ey = 30; break;
      case 1: ex = width - 30; ey = 40 + Math.random() * (height - 80); break;
      case 2: ex = 40 + Math.random() * (width - 80); ey = height - 30; break;
      case 3: ex = 30; ey = 40 + Math.random() * (height - 80); break;
    }
    const exitId = nodeCount + e;
    const closestNode = nodes.reduce((best, n) => {
      const dx = n.x - ex, dy = n.y - ey;
      const bd = best.x - ex, bdy = best.y - ey;
      return dx * dx + dy * dy < bd * bd + bdy * bdy ? n : best;
    });
    nodes.push({
      id: exitId,
      x: ex,
      y: ey,
      type: 'exit',
      connections: [closestNode.id],
      securityLevel: 0,
      hacked: true,
      pulsePhase: Math.random() * Math.PI * 2,
    });
    if (!closestNode.connections.includes(exitId)) {
      closestNode.connections.push(exitId);
    }
    edges.push({ from: closestNode.id, to: exitId, dataFlowOffset: Math.random() * Math.PI * 2 });
  }

  return { nodes, edges };
}

export class PathChecker {
  static isPathValid(nodes: Node[], fromId: number, toId: number): boolean {
    const from = nodes[fromId];
    if (!from) return false;
    return from.connections.includes(toId);
  }
}

export interface ToolEffectResult {
  success: boolean;
  alertDelta: number;
  hackTime: number;
  message?: string;
}

export class ToolEffectCalculator {
  static calculateCrawler(nodes: Node[], targetId: number): ToolEffectResult {
    const target = nodes[targetId];
    if (!target || target.type !== 'firewall') {
      return { success: false, alertDelta: 5, hackTime: 0, message: '目标不是防火墙节点' };
    }
    const excessConnections = Math.max(0, target.connections.length - 2);
    const successRate = Math.max(0.1, 0.6 - excessConnections * 0.05);
    const success = Math.random() < successRate;
    return {
      success,
      alertDelta: success ? 5 + Math.floor(Math.random() * 10) : 15 + Math.floor(Math.random() * 15),
      hackTime: 1.5,
      message: success ? '破解成功' : '破解失败，警报上升',
    };
  }

  static calculateScanner(): ToolEffectResult {
    return { success: true, alertDelta: 2, hackTime: 0, message: '扫描完成' };
  }

  static calculateCloner(currentClicks: number): ToolEffectResult {
    const alertDelta = 3;
    return {
      success: currentClicks >= 2,
      alertDelta,
      hackTime: 0,
      message: currentClicks >= 2 ? '数据克隆完成' : `克隆进度 ${currentClicks + 1}/3`,
    };
  }
}

export class AIPatrolPlanner {
  static findNextNode(nodes: Node[], currentId: number, playerNode: number, detectRange: number): number {
    const current = nodes[currentId];
    if (!current || current.connections.length === 0) return currentId;

    const distToPlayer = (nid: number): number => {
      const n = nodes[nid];
      const p = nodes[playerNode];
      if (!n || !p) return Infinity;
      return Math.sqrt((n.x - p.x) ** 2 + (n.y - p.y) ** 2);
    };

    const playerDist = distToPlayer(currentId);
    if (playerDist < detectRange * 100) {
      let best = current.connections[0];
      let bestDist = distToPlayer(best);
      for (const cid of current.connections) {
        const d = distToPlayer(cid);
        if (d < bestDist) { bestDist = d; best = cid; }
      }
      return best;
    }

    return current.connections[Math.floor(Math.random() * current.connections.length)];
  }

  static isPlayerDetected(nodes: Node[], ai: AI, playerNode: number, stealthActive: boolean): boolean {
    const range = stealthActive ? 1 : ai.detectRange;
    return this.areNodesWithinRange(nodes, ai.currentNode, playerNode, range);
  }

  static areNodesWithinRange(nodes: Node[], startId: number, targetId: number, range: number): boolean {
    if (startId === targetId) return true;
    if (range <= 0) return false;
    const visited = new Set<number>([startId]);
    let frontier: number[] = [startId];
    for (let step = 0; step < range; step++) {
      const next: number[] = [];
      for (const nid of frontier) {
        const n = nodes[nid];
        if (!n) continue;
        for (const cid of n.connections) {
          if (cid === targetId) return true;
          if (!visited.has(cid)) {
            visited.add(cid);
            next.push(cid);
          }
        }
      }
      frontier = next;
    }
    return false;
  }
}

export class GameEngine {
  state: GameState;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.state = this.createInitialState(1);
  }

  private createInitialState(round: number): GameState {
    const { nodes, edges } = generateNodeMap({ nodeCount: 15, width: this.width, height: this.height, round });
    const playerNode = nodes.find((n) => n.type === 'encrypted')?.id ?? 0;

    const aiCount = 1 + round;
    const ais: AI[] = [];
    const usedNodes = new Set<number>([playerNode]);
    for (let i = 0; i < aiCount; i++) {
      let startNode = Math.floor(Math.random() * nodes.length);
      while (usedNodes.has(startNode) && usedNodes.size < nodes.length) {
        startNode = (startNode + 1) % nodes.length;
      }
      usedNodes.add(startNode);
      ais.push({
        id: i,
        currentNode: startNode,
        targetNode: startNode,
        path: [],
        detectRange: 3,
        moveProgress: 0,
        moveSpeed: 0.002,
        scanTimer: 0,
        scanInterval: 5,
      });
    }

    return {
      nodes,
      edges,
      playerNode,
      score: this.state?.score ?? 0,
      alert: 0,
      round,
      escapeMode: false,
      escapeTimer: 30,
      gameOver: false,
      stealProgress: 0,
      stealNodeId: null,
      lastStealClick: 0,
      tools: {
        crawler: { type: 'crawler', cooldown: 0, selected: false },
        scanner: { type: 'scanner', cooldown: 0, selected: false },
        cloner: { type: 'cloner', cooldown: 0, selected: false },
      },
      ais,
      scannerActive: 0,
      stealthActive: 0,
      stealthCooldown: 0,
      invalidPathFlash: 0,
      pulseNodes: new Map<number, number>(),
    };
  }

  movePlayer(toId: number): boolean {
    if (this.state.gameOver) return false;
    if (!PathChecker.isPathValid(this.state.nodes, this.state.playerNode, toId)) {
      this.state.invalidPathFlash = 0.2;
      return false;
    }
    const target = this.state.nodes[toId];
    if (target.type === 'firewall' && !target.hacked) {
      this.state.invalidPathFlash = 0.2;
      return false;
    }
    this.state.playerNode = toId;
    this.state.stealProgress = 0;
    this.state.stealNodeId = null;
    this.state.pulseNodes.set(toId, 0.3);

    if (this.state.escapeMode && target.type === 'exit') {
      this.state.score += 1000 + this.state.round * 500;
      const nextRound = this.state.round + 1;
      const prevScore = this.state.score;
      this.state = this.createInitialState(nextRound);
      this.state.score = prevScore;
    }
    return true;
  }

  selectTool(type: ToolType): void {
    for (const key of Object.keys(this.state.tools) as ToolType[]) {
      this.state.tools[key].selected = key === type && this.state.tools[key].cooldown <= 0;
    }
  }

  useTool(targetId: number): ToolEffectResult | null {
    if (this.state.gameOver) return null;
    const selectedTool = (Object.keys(this.state.tools) as ToolType[]).find((k) => this.state.tools[k].selected);
    if (!selectedTool) return null;
    const tool = this.state.tools[selectedTool];
    if (tool.cooldown > 0) return null;

    let result: ToolEffectResult;

    if (selectedTool === 'crawler') {
      result = ToolEffectCalculator.calculateCrawler(this.state.nodes, targetId);
      if (result.success) {
        this.state.nodes[targetId].hacked = true;
      }
    } else if (selectedTool === 'scanner') {
      result = ToolEffectCalculator.calculateScanner();
      this.state.scannerActive = 4;
    } else if (selectedTool === 'cloner') {
      const target = this.state.nodes[targetId];
      if (!target || target.type !== 'target' || this.state.playerNode !== targetId) {
        return { success: false, alertDelta: 0, hackTime: 0, message: '需在目标节点使用' };
      }
      const now = performance.now();
      if (this.state.stealNodeId !== targetId) {
        this.state.stealProgress = 0;
        this.state.stealNodeId = targetId;
      } else if (now - this.state.lastStealClick > 1500) {
        this.state.stealProgress = 0;
      }
      this.state.lastStealClick = now;
      this.state.stealProgress++;
      result = ToolEffectCalculator.calculateCloner(this.state.stealProgress - 1);
      if (result.success) {
        this.state.score += 500;
        this.state.stealProgress = 0;
      }
    } else {
      return null;
    }

    tool.cooldown = 5;
    tool.selected = false;
    this.state.alert = Math.min(100, this.state.alert + result.alertDelta);
    if (this.state.alert >= 100 && !this.state.escapeMode) {
      this.state.escapeMode = true;
      this.state.escapeTimer = 30;
    }
    return result;
  }

  activateStealth(): void {
    if (this.state.stealthCooldown <= 0 && !this.state.gameOver) {
      this.state.stealthActive = 3;
      this.state.stealthCooldown = 15;
    }
  }

  update(dt: number): void {
    if (this.state.gameOver) return;

    if (this.state.invalidPathFlash > 0) this.state.invalidPathFlash = Math.max(0, this.state.invalidPathFlash - dt);
    if (this.state.scannerActive > 0) this.state.scannerActive = Math.max(0, this.state.scannerActive - dt);
    if (this.state.stealthActive > 0) this.state.stealthActive = Math.max(0, this.state.stealthActive - dt);
    if (this.state.stealthCooldown > 0) this.state.stealthCooldown = Math.max(0, this.state.stealthCooldown - dt);

    for (const key of Object.keys(this.state.tools) as ToolType[]) {
      if (this.state.tools[key].cooldown > 0) {
        this.state.tools[key].cooldown = Math.max(0, this.state.tools[key].cooldown - dt);
      }
    }

    if (this.state.escapeMode) {
      this.state.escapeTimer -= dt;
      if (this.state.escapeTimer <= 0) {
        this.state.gameOver = true;
      }
    }

    for (const nid of Array.from(this.state.pulseNodes.keys())) {
      const val = this.state.pulseNodes.get(nid)! - dt;
      if (val <= 0) this.state.pulseNodes.delete(nid);
      else this.state.pulseNodes.set(nid, val);
    }

    for (const ai of this.state.ais) {
      if (ai.moveProgress < 1 && ai.currentNode !== ai.targetNode) {
        ai.moveProgress = Math.min(1, ai.moveProgress + ai.moveSpeed * dt * 1000);
        if (ai.moveProgress >= 1) {
          ai.currentNode = ai.targetNode;
          ai.moveProgress = 0;
        }
      }
      if (ai.currentNode === ai.targetNode) {
        ai.targetNode = AIPatrolPlanner.findNextNode(this.state.nodes, ai.currentNode, this.state.playerNode, ai.detectRange);
        ai.moveProgress = 0;
      }

      ai.scanTimer += dt;
      if (ai.scanTimer >= ai.scanInterval) {
        ai.scanTimer = 0;
        if (AIPatrolPlanner.isPlayerDetected(this.state.nodes, ai, this.state.playerNode, this.state.stealthActive > 0)) {
          this.state.alert = Math.min(100, this.state.alert + 10 + Math.floor(Math.random() * 21));
          if (this.state.alert >= 100 && !this.state.escapeMode) {
            this.state.escapeMode = true;
            this.state.escapeTimer = 30;
          }
        }
      }
    }
  }
}
