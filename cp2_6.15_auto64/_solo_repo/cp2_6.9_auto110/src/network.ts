export const CYBERPUNK_COLORS = [
  '#00FF41',
  '#FF00FF',
  '#00FFFF',
  '#FF6600',
  '#FFFF00'
];

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface NodeData {
  id: number;
  x: number;
  y: number;
  color: string;
  defenseLevel: 1 | 2 | 3;
  currentDefense: number;
  hacked: boolean;
  connections: number[];
  pulsePhase: number;
  shakeTimer: number;
  flashTimer: number;
  disruptTimer: number;
  scanRipples: number[];
  lastInfectionTime: number;
}

export interface Connection {
  from: number;
  to: number;
  flowOffset: number;
  infected: boolean;
  infectionBlinkPhase: number;
}

export interface NetworkState {
  nodes: NodeData[];
  connections: Connection[];
  difficulty: Difficulty;
}

const DIFFICULTY_CONFIG: Record<Difficulty, {
  nodeCount: number;
  minDefense: 1 | 2;
  maxDefense: 2 | 3;
  connectionDensity: number;
}> = {
  easy: { nodeCount: 6, minDefense: 1, maxDefense: 2, connectionDensity: 0.3 },
  normal: { nodeCount: 12, minDefense: 1, maxDefense: 3, connectionDensity: 0.35 },
  hard: { nodeCount: 20, minDefense: 1, maxDefense: 3, connectionDensity: 0.5 }
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const NODE_PADDING = 60;
const MIN_NODE_DISTANCE = 50;
const MAX_NODE_DISTANCE = 120;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function generateNetwork(difficulty: Difficulty): NetworkState {
  const config = DIFFICULTY_CONFIG[difficulty];
  const nodes: NodeData[] = [];

  for (let i = 0; i < config.nodeCount; i++) {
    let x: number, y: number;
    let attempts = 0;
    let found = false;

    while (attempts < 200 && !found) {
      x = randInt(NODE_PADDING, CANVAS_WIDTH - NODE_PADDING);
      y = randInt(NODE_PADDING, CANVAS_HEIGHT - NODE_PADDING);
      found = true;

      for (const node of nodes) {
        if (distance(x, y, node.x, node.y) < MIN_NODE_DISTANCE) {
          found = false;
          break;
        }
      }
      attempts++;
    }

    const defenseLevel = randInt(config.minDefense, config.maxDefense) as 1 | 2 | 3;

    nodes.push({
      id: i,
      x: x!,
      y: y!,
      color: pickRandom(CYBERPUNK_COLORS),
      defenseLevel,
      currentDefense: defenseLevel,
      hacked: false,
      connections: [],
      pulsePhase: Math.random() * Math.PI * 2,
      shakeTimer: 0,
      flashTimer: 0,
      disruptTimer: 0,
      scanRipples: [],
      lastInfectionTime: 0
    });
  }

  const connections: Connection[] = [];
  const connectionSet = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const nearby: { idx: number; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dist = distance(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      if (dist <= MAX_NODE_DISTANCE) {
        nearby.push({ idx: j, dist });
      }
    }

    nearby.sort((a, b) => a.dist - b.dist);

    const connectCount = Math.max(1, Math.floor(nearby.length * config.connectionDensity) + 1);
    for (let k = 0; k < Math.min(connectCount, nearby.length); k++) {
      const j = nearby[k].idx;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!connectionSet.has(key)) {
        connectionSet.add(key);
        nodes[i].connections.push(j);
        nodes[j].connections.push(i);
        connections.push({
          from: i,
          to: j,
          flowOffset: Math.random() * 20,
          infected: false,
          infectionBlinkPhase: 0
        });
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].connections.length === 0) {
      let nearest = -1;
      let nearestDist = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dist = distance(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = j;
        }
      }
      if (nearest !== -1) {
        const key = i < nearest ? `${i}-${nearest}` : `${nearest}-${i}`;
        if (!connectionSet.has(key)) {
          connectionSet.add(key);
          nodes[i].connections.push(nearest);
          nodes[nearest].connections.push(i);
          connections.push({
            from: i,
            to: nearest,
            flowOffset: Math.random() * 20,
            infected: false,
            infectionBlinkPhase: 0
          });
        }
      }
    }
  }

  return { nodes, connections, difficulty };
}

export function applyCommand(
  state: NetworkState,
  command: string,
  nodeId: number
): { success: boolean; message: string; nodeHacked: boolean } {
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) {
    return { success: false, message: `Node ${nodeId} does not exist`, nodeHacked: false };
  }

  if (node.hacked && command !== 'SCAN') {
    return { success: false, message: `Node ${nodeId} is already compromised`, nodeHacked: false };
  }

  node.shakeTimer = 0.2;
  node.flashTimer = 0.3;

  switch (command) {
    case 'CONNECT': {
      if (node.currentDefense > 0) {
        node.currentDefense--;
      }
      const wasHacked = node.hacked;
      if (node.currentDefense <= 0) {
        node.hacked = true;
        node.color = '#00FF41';
        node.lastInfectionTime = performance.now();
      }
      const msg = node.currentDefense > 0
        ? `CONNECT to node ${nodeId} - Defense remaining: ${node.currentDefense}/${node.defenseLevel}`
        : `NODE ${nodeId} COMPROMISED - Firewall breached`;
      return { success: true, message: msg, nodeHacked: !wasHacked && node.hacked };
    }

    case 'DISRUPT': {
      node.disruptTimer = 1.0;
      if (node.currentDefense > 0) {
        node.currentDefense = Math.max(0, node.currentDefense - 2);
      }
      const wasHacked = node.hacked;
      if (node.currentDefense <= 0) {
        node.hacked = true;
        node.color = '#00FF41';
        node.lastInfectionTime = performance.now();
      }
      const msg = node.currentDefense > 0
        ? `DISRUPT node ${nodeId} - Overloading defenses. Remaining: ${node.currentDefense}/${node.defenseLevel}`
        : `NODE ${nodeId} DESTROYED - Core systems critical failure`;
      return { success: true, message: msg, nodeHacked: !wasHacked && node.hacked };
    }

    case 'SCAN': {
      node.scanRipples.push(0);
      const neighborIds = node.connections.join(', ');
      const defenseInfo = node.hacked
        ? 'COMPROMISED'
        : `Defense: ${node.currentDefense}/${node.defenseLevel}`;
      const msg = `SCAN node ${nodeId} - ${defenseInfo} | Connections: [${neighborIds}]`;
      return { success: true, message: msg, nodeHacked: false };
    }

    default:
      return { success: false, message: `Unknown command: ${command}`, nodeHacked: false };
  }
}

export function updateNetwork(
  state: NetworkState,
  deltaTime: number,
  now: number
): { newlyHacked: number[] } {
  const newlyHacked: number[] = [];

  for (const node of state.nodes) {
    node.pulsePhase += deltaTime * 3;
    if (node.shakeTimer > 0) node.shakeTimer -= deltaTime;
    if (node.flashTimer > 0) node.flashTimer -= deltaTime;
    if (node.disruptTimer > 0) node.disruptTimer -= deltaTime;

    node.scanRipples = node.scanRipples
      .map(r => r + deltaTime * 80)
      .filter(r => r < 100);
  }

  for (const conn of state.connections) {
    conn.flowOffset += deltaTime * 30;
    if (conn.flowOffset > 20) conn.flowOffset = 0;

    if (conn.infected) {
      conn.infectionBlinkPhase += deltaTime * 6;
    }
  }

  for (const node of state.nodes) {
    if (node.hacked && now - node.lastInfectionTime >= 2000) {
      const uninfectedNeighbors = node.connections.filter(id => !state.nodes[id].hacked);
      if (uninfectedNeighbors.length > 0) {
        const targetId = pickRandom(uninfectedNeighbors);
        const target = state.nodes[targetId];
        target.currentDefense = Math.max(0, target.currentDefense - 1);
        if (target.currentDefense <= 0) {
          target.hacked = true;
          target.color = '#00FF41';
          target.lastInfectionTime = now;
          target.shakeTimer = 0.2;
          target.flashTimer = 0.3;
          newlyHacked.push(targetId);

          for (const conn of state.connections) {
            if ((conn.from === node.id && conn.to === targetId) ||
                (conn.from === targetId && conn.to === node.id)) {
              conn.infected = true;
            }
          }
        }
        node.lastInfectionTime = now;
      }
    }
  }

  return { newlyHacked };
}

export function getNodeById(state: NetworkState, id: number): NodeData | undefined {
  return state.nodes.find(n => n.id === id);
}
