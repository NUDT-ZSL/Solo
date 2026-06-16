export type NodeType = 'terminal' | 'firewall' | 'target' | 'encrypted' | 'exit';

export interface Node {
  id: number;
  type: NodeType;
  x: number;
  y: number;
  connections: number[];
  securityLevel: number;
  isHacked: boolean;
  isHidden: boolean;
}

export type ToolType = 'virus' | 'scanner' | 'cloner';

export interface Tool {
  type: ToolType;
  name: string;
  cooldown: number;
  maxCooldown: number;
  lastUsed: number;
}

export interface AIAgent {
  id: number;
  currentNodeId: number;
  targetNodeId: number;
  path: number[];
  perceptionRange: number;
  isMoving: boolean;
  scanCooldown: number;
}

export interface GameState {
  nodes: Node[];
  playerNodeId: number;
  alertLevel: number;
  score: number;
  round: number;
  isEscapeMode: boolean;
  escapeTimeLeft: number;
  isGameOver: boolean;
  isWin: boolean;
  tools: Tool[];
  aiAgents: AIAgent[];
  selectedTool: ToolType | null;
  isStealthActive: boolean;
  stealthCooldown: number;
  stealthDuration: number;
  clonerProgress: number;
  clonerLastClick: number;
  scannerActive: boolean;
  scannerDuration: number;
  illegalPathFlash: boolean;
  lastIllegalTime: number;
  hiddenNodes: Set<number>;
}

export interface MoveResult {
  success: boolean;
  alertIncrease: number;
  message: string;
}

export interface HackResult {
  success: boolean;
  alertIncrease: number;
  isHacked: boolean;
  message: string;
}

export function generateNodeMap(_round: number = 1): Node[] {
  const nodes: Node[] = [];
  const nodeCount = 15;
  const mapWidth = 700;
  const mapHeight = 500;
  const padding = 80;

  for (let i = 0; i < nodeCount; i++) {
    let x: number, y: number;
    let validPosition = false;
    let attempts = 0;

    while (!validPosition && attempts < 200) {
      x = padding + Math.random() * (mapWidth - 2 * padding);
      y = padding + Math.random() * (mapHeight - 2 * padding);
      
      validPosition = true;
      for (const node of nodes) {
        const dist = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        if (dist < 70) {
          validPosition = false;
          break;
        }
      }
      attempts++;
    }

    if (!validPosition) {
      x = padding + (i % 4) * (mapWidth - 2 * padding) / 4 + (mapWidth - 2 * padding) / 8;
      y = padding + Math.floor(i / 4) * (mapHeight - 2 * padding) / 4 + (mapHeight - 2 * padding) / 8;
    }

    let type: NodeType = 'terminal';
    if (i === 0) {
      type = 'encrypted';
    } else if (i === nodeCount - 1) {
      type = 'target';
    } else if (Math.random() < 0.25) {
      type = 'firewall';
    }

    nodes.push({
      id: i,
      type,
      x,
      y,
      connections: [],
      securityLevel: Math.floor(Math.random() * 3) + 1,
      isHacked: type === 'encrypted' || type === 'terminal',
      isHidden: false
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const distances: { id: number; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i !== j) {
        const dist = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2)
        );
        distances.push({ id: j, dist });
      }
    }
    distances.sort((a, b) => a.dist - b.dist);

    if (nodes[i] && nodes[i].connections.length < 4) {
      const neededConnections = Math.max(2, 4 - nodes[i].connections.length);
      let connectionsMade = 0;
      
      for (let j = 0; j < distances.length && connectionsMade < neededConnections; j++) {
        const targetId = distances[j].id;
        if (nodes[targetId] && nodes[targetId].connections.length < 4 && !nodes[i].connections.includes(targetId)) {
          nodes[i].connections.push(targetId);
          nodes[targetId].connections.push(i);
          connectionsMade++;
        }
      }
    }
  }

  const exitCount = 2;
  for (let i = 0; i < exitCount; i++) {
    const edgeNodeIndex = nodes.length + i;
    let x: number, y: number;
    const edge = Math.floor(Math.random() * 4);
    
    switch (edge) {
      case 0:
        x = padding / 2;
        y = padding + Math.random() * (mapHeight - 2 * padding);
        break;
      case 1:
        x = mapWidth - padding / 2;
        y = padding + Math.random() * (mapHeight - 2 * padding);
        break;
      case 2:
        x = padding + Math.random() * (mapWidth - 2 * padding);
        y = padding / 2;
        break;
      default:
        x = padding + Math.random() * (mapWidth - 2 * padding);
        y = mapHeight - padding / 2;
        break;
    }

    const closestDistances: { id: number; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      const dist = Math.sqrt(
        Math.pow(nodes[j].x - x, 2) + Math.pow(nodes[j].y - y, 2)
      );
      closestDistances.push({ id: j, dist });
    }
    closestDistances.sort((a, b) => a.dist - b.dist);

    nodes.push({
      id: edgeNodeIndex,
      type: 'exit',
      x,
      y,
      connections: [],
      securityLevel: 1,
      isHacked: true,
      isHidden: false
    });

    for (let j = 0; j < Math.min(2, closestDistances.length); j++) {
      const targetId = closestDistances[j].id;
      if (nodes[targetId] && nodes[targetId].connections.length < 4 && nodes[edgeNodeIndex]) {
        nodes[edgeNodeIndex].connections.push(targetId);
        nodes[targetId].connections.push(edgeNodeIndex);
      }
    }
  }

  return nodes;
}

export class PathChecker {
  private nodes: Node[];

  constructor(nodes: Node[]) {
    this.nodes = nodes;
  }

  public isValidMove(fromNodeId: number, toNodeId: number): boolean {
    const fromNode = this.nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return false;
    
    return fromNode.connections.includes(toNodeId);
  }

  public getNeighbors(nodeId: number): number[] {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.connections : [];
  }

  public findPath(startId: number, endId: number): number[] {
    const visited = new Set<number>();
    const queue: { current: number; path: number[] }[] = [{ current: startId, path: [startId] }];

    while (queue.length > 0) {
      const { current, path } = queue.shift()!;

      if (current === endId) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ current: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return [];
  }

  public getNodesWithinRange(nodeId: number, range: number): number[] {
    const result: number[] = [];
    const visited = new Set<number>();
    const queue: { id: number; depth: number }[] = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (visited.has(id)) continue;
      visited.add(id);
      
      if (depth <= range) {
        result.push(id);
        const neighbors = this.getNeighbors(id);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push({ id: neighbor, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }
}

export class ToolEffectCalculator {
  private nodes: Node[];

  constructor(nodes: Node[]) {
    this.nodes = nodes;
  }

  public calculateVirusSuccessRate(nodeId: number): number {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    const baseSuccessRate = 0.6;
    const connectionPenalty = (node.connections.length - 1) * 0.05;
    
    return Math.max(0.1, baseSuccessRate - connectionPenalty);
  }

  public calculateVirusHackTime(nodeId: number): number {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    return (node.securityLevel + 1) * 1000;
  }

  public calculateAlertIncrease(toolType: ToolType, success: boolean): number {
    switch (toolType) {
      case 'virus':
        return success ? 10 : 20;
      case 'scanner':
        return 5;
      case 'cloner':
        return 15;
      default:
        return 0;
    }
  }

  public getToolCooldown(_toolType: ToolType): number {
    return 5000;
  }
}

export class AIPatrolPlanner {
  private nodes: Node[];
  private pathChecker: PathChecker;

  constructor(nodes: Node[]) {
    this.nodes = nodes;
    this.pathChecker = new PathChecker(nodes);
  }

  public getNextTarget(currentNodeId: number, playerNodeId: number, isStealthActive: boolean): number {
    const nonExitNodes = this.nodes.filter(n => n.type !== 'exit');
    const availableNodes = nonExitNodes.filter(n => n.id !== currentNodeId);
    
    if (isStealthActive) {
      const randomIndex = Math.floor(Math.random() * availableNodes.length);
      return availableNodes[randomIndex].id;
    }

    let closestNodeId = availableNodes[0].id;
    let minDistance = Infinity;

    for (const node of availableNodes) {
      const path = this.pathChecker.findPath(currentNodeId, node.id);
      const playerPath = this.pathChecker.findPath(node.id, playerNodeId);
      
      if (path.length > 0 && playerPath.length > 0) {
        const distance = playerPath.length;
        if (distance < minDistance) {
          minDistance = distance;
          closestNodeId = node.id;
        }
      }
    }

    return closestNodeId;
  }

  public getPathToTarget(currentNodeId: number, targetNodeId: number): number[] {
    return this.pathChecker.findPath(currentNodeId, targetNodeId);
  }

  public scanForPlayer(aiNodeId: number, playerNodeId: number, range: number): boolean {
    const nodesInRange = this.pathChecker.getNodesWithinRange(aiNodeId, range);
    return nodesInRange.includes(playerNodeId);
  }

  public getNodesInScanRange(aiNodeId: number, range: number): number[] {
    return this.pathChecker.getNodesWithinRange(aiNodeId, range);
  }
}

export function createInitialState(round: number = 1): GameState {
  const nodes = generateNodeMap(round);
  const encryptedNode = nodes.find(n => n.type === 'encrypted')!;
  
  const tools: Tool[] = [
    {
      type: 'virus',
      name: '爬虫病毒',
      cooldown: 0,
      maxCooldown: 5000,
      lastUsed: 0
    },
    {
      type: 'scanner',
      name: '端口扫描器',
      cooldown: 0,
      maxCooldown: 5000,
      lastUsed: 0
    },
    {
      type: 'cloner',
      name: '数据克隆器',
      cooldown: 0,
      maxCooldown: 5000,
      lastUsed: 0
    }
  ];

  const aiCount = 2 + Math.floor((round - 1) / 1);
  const nonExitNodes = nodes.filter(n => n.type !== 'exit' && n.type !== 'encrypted');
  const aiAgents: AIAgent[] = [];
  
  for (let i = 0; i < Math.min(aiCount, nonExitNodes.length - 1); i++) {
    const availableNodes = nonExitNodes.filter(n => 
      n.id !== encryptedNode.id && !aiAgents.some(a => a.currentNodeId === n.id)
    );
    const startNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
    
    aiAgents.push({
      id: i,
      currentNodeId: startNode.id,
      targetNodeId: startNode.id,
      path: [],
      perceptionRange: 3,
      isMoving: false,
      scanCooldown: 5000
    });
  }

  return {
    nodes,
    playerNodeId: encryptedNode.id,
    alertLevel: 0,
    score: 0,
    round,
    isEscapeMode: false,
    escapeTimeLeft: 30000,
    isGameOver: false,
    isWin: false,
    tools,
    aiAgents,
    selectedTool: null,
    isStealthActive: false,
    stealthCooldown: 0,
    stealthDuration: 0,
    clonerProgress: 0,
    clonerLastClick: 0,
    scannerActive: false,
    scannerDuration: 0,
    illegalPathFlash: false,
    lastIllegalTime: 0,
    hiddenNodes: new Set<number>()
  };
}

export function processPlayerMove(
  state: GameState,
  targetNodeId: number,
  currentTime: number
): { state: GameState; result: MoveResult } {
  const newState = { ...state };
  const pathChecker = new PathChecker(state.nodes);
  
  if (!pathChecker.isValidMove(state.playerNodeId, targetNodeId)) {
    newState.illegalPathFlash = true;
    newState.lastIllegalTime = currentTime;
    
    return {
      state: newState,
      result: { success: false, alertIncrease: 0, message: '非法路径！' }
    };
  }

  const targetNode = state.nodes.find(n => n.id === targetNodeId);
  
  if (targetNode?.type === 'firewall' && !targetNode.isHacked) {
    return {
      state: newState,
      result: { success: false, alertIncrease: 0, message: '需要破解防火墙！' }
    };
  }

  newState.playerNodeId = targetNodeId;
  newState.clonerProgress = 0;
  newState.clonerLastClick = 0;

  if (targetNode?.type === 'exit' && state.isEscapeMode) {
    newState.isWin = true;
    newState.score += 1000 * state.round;
    return {
      state: newState,
      result: { success: true, alertIncrease: 0, message: '逃离成功！' }
    };
  }

  return {
    state: newState,
    result: { success: true, alertIncrease: 0, message: '移动成功' }
  };
}

export function processToolUse(
  state: GameState,
  toolType: ToolType,
  currentTime: number
): { state: GameState; result: HackResult } {
  const newState = { ...state };
  const tool = state.tools.find(t => t.type === toolType);
  
  if (!tool) {
    return {
      state: newState,
      result: { success: false, alertIncrease: 0, isHacked: false, message: '工具不存在' }
    };
  }

  if (tool.cooldown > 0) {
    return {
      state: newState,
      result: { success: false, alertIncrease: 0, isHacked: false, message: '工具冷却中' }
    };
  }

  const calculator = new ToolEffectCalculator(state.nodes);
  const currentNode = state.nodes.find(n => n.id === state.playerNodeId);

  switch (toolType) {
    case 'virus': {
      if (currentNode?.type !== 'firewall' || currentNode.isHacked) {
        return {
          state: newState,
          result: { success: false, alertIncrease: 0, isHacked: false, message: '当前节点无法使用爬虫病毒' }
        };
      }

      const successRate = calculator.calculateVirusSuccessRate(state.playerNodeId);
      const success = Math.random() < successRate;
      const alertIncrease = calculator.calculateAlertIncrease('virus', success);

      newState.alertLevel = Math.min(100, state.alertLevel + alertIncrease);

      if (success) {
        newState.nodes = state.nodes.map(n =>
          n.id === state.playerNodeId ? { ...n, isHacked: true } : n
        );
      }

      newState.tools = state.tools.map(t =>
        t.type === 'virus'
          ? { ...t, cooldown: t.maxCooldown, lastUsed: currentTime }
          : t
      );

      return {
        state: newState,
        result: {
          success: true,
          alertIncrease,
          isHacked: success,
          message: success ? '破解成功！' : '破解失败！'
        }
      };
    }

    case 'scanner': {
      const alertIncrease = calculator.calculateAlertIncrease('scanner', true);
      newState.alertLevel = Math.min(100, state.alertLevel + alertIncrease);
      newState.scannerActive = true;
      newState.scannerDuration = 4000;

      const pathChecker = new PathChecker(state.nodes);
      const hiddenNodes = new Set<number>();
      for (const agent of state.aiAgents) {
        const nodesInRange = pathChecker.getNodesWithinRange(state.playerNodeId, 3);
        if (nodesInRange.includes(agent.currentNodeId)) {
          hiddenNodes.add(agent.currentNodeId);
        }
      }
      newState.hiddenNodes = hiddenNodes;

      newState.tools = state.tools.map(t =>
        t.type === 'scanner'
          ? { ...t, cooldown: t.maxCooldown, lastUsed: currentTime }
          : t
      );

      return {
        state: newState,
        result: { success: true, alertIncrease, isHacked: false, message: '扫描完成！' }
      };
    }

    case 'cloner': {
      if (currentNode?.type !== 'target') {
        return {
          state: newState,
          result: { success: false, alertIncrease: 0, isHacked: false, message: '只能在目标节点使用' }
        };
      }

      const timeSinceLastClick = currentTime - state.clonerLastClick;
      
      if (state.clonerLastClick > 0 && timeSinceLastClick > 1000) {
        newState.clonerProgress = 0;
      }

      newState.clonerProgress = state.clonerProgress + 1;
      newState.clonerLastClick = currentTime;

      if (newState.clonerProgress >= 3) {
        const alertIncrease = calculator.calculateAlertIncrease('cloner', true);
        newState.alertLevel = Math.min(100, state.alertLevel + alertIncrease);
        newState.clonerProgress = 0;
        newState.isEscapeMode = true;
        newState.escapeTimeLeft = 30000;
        newState.score += 500 * state.round;

        newState.tools = state.tools.map(t =>
          t.type === 'cloner'
            ? { ...t, cooldown: t.maxCooldown, lastUsed: currentTime }
            : t
        );

        return {
          state: newState,
          result: { success: true, alertIncrease, isHacked: false, message: '数据窃取成功！快逃！' }
        };
      } else {
        return {
          state: newState,
          result: { success: true, alertIncrease: 0, isHacked: false, message: `进度 ${newState.clonerProgress}/3` }
        };
      }
    }

    default:
      return {
        state: newState,
        result: { success: false, alertIncrease: 0, isHacked: false, message: '未知工具' }
      };
  }
}

export function processAIActions(
  state: GameState,
  deltaTime: number,
  _currentTime: number
): GameState {
  let newState = { ...state };
  const planner = new AIPatrolPlanner(state.nodes);

  const actualPerceptionRange = state.isStealthActive ? 1 : 3;

  newState.aiAgents = state.aiAgents.map(agent => {
    let newAgent = { ...agent };
    newAgent.scanCooldown -= deltaTime;

    if (newAgent.scanCooldown <= 0) {
      newAgent.scanCooldown = 5000;
      
      const detected = planner.scanForPlayer(
        newAgent.currentNodeId,
        state.playerNodeId,
        actualPerceptionRange
      );

      if (detected && !state.isEscapeMode) {
        const alertIncrease = 10 + Math.floor(Math.random() * 21);
        newState.alertLevel = Math.min(100, newState.alertLevel + alertIncrease);
        
        if (newState.alertLevel >= 100 && !newState.isEscapeMode) {
          newState.isEscapeMode = true;
          newState.escapeTimeLeft = 30000;
        }
      }
    }

    if (newAgent.path.length === 0 || !newAgent.isMoving) {
      const targetId = planner.getNextTarget(
        newAgent.currentNodeId,
        state.playerNodeId,
        state.isStealthActive
      );
      const path = planner.getPathToTarget(newAgent.currentNodeId, targetId);
      
      if (path.length > 1) {
        newAgent.path = path.slice(1);
        newAgent.targetNodeId = targetId;
        newAgent.isMoving = true;
      }
    }

    return newAgent;
  });

  newState.aiAgents = newState.aiAgents.map(agent => {
    if (agent.isMoving && agent.path.length > 0) {
      const moveProgress = deltaTime / 1000;
      if (moveProgress >= 1) {
        const nextNode = agent.path[0];
        return {
          ...agent,
          currentNodeId: nextNode,
          path: agent.path.slice(1),
          isMoving: agent.path.length > 1
        };
      }
    }
    return agent;
  });

  return newState;
}

export function updateGameState(
  state: GameState,
  deltaTime: number,
  currentTime: number
): GameState {
  let newState = { ...state };

  newState.tools = state.tools.map(tool => ({
    ...tool,
    cooldown: Math.max(0, tool.cooldown - deltaTime)
  }));

  if (newState.illegalPathFlash && currentTime - newState.lastIllegalTime > 200) {
    newState.illegalPathFlash = false;
  }

  if (newState.scannerActive) {
    newState.scannerDuration -= deltaTime;
    if (newState.scannerDuration <= 0) {
      newState.scannerActive = false;
      newState.hiddenNodes = new Set<number>();
    }
  }

  if (newState.isStealthActive) {
    newState.stealthDuration -= deltaTime;
    if (newState.stealthDuration <= 0) {
      newState.isStealthActive = false;
    }
  }

  if (newState.stealthCooldown > 0) {
    newState.stealthCooldown = Math.max(0, newState.stealthCooldown - deltaTime);
  }

  if (newState.isEscapeMode && !newState.isWin && !newState.isGameOver) {
    newState.escapeTimeLeft -= deltaTime;
    if (newState.escapeTimeLeft <= 0) {
      newState.isGameOver = true;
    }
  }

  newState = processAIActions(newState, deltaTime, currentTime);

  return newState;
}

export function activateStealth(state: GameState, _currentTime: number): GameState {
  if (state.stealthCooldown > 0 || state.isStealthActive) {
    return state;
  }

  return {
    ...state,
    isStealthActive: true,
    stealthDuration: 3000,
    stealthCooldown: 15000
  };
}
