export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rect' | 'circle';
  decayTimer?: number;
  maxTimer?: number;
  active: boolean;
}

export interface ResonanceNode {
  x: number;
  y: number;
  targetPitch: number;
  activated: boolean;
  activationRadius: number;
  glowRadius: number;
  pulsePhase: number;
}

export interface Portal {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  rotation: number;
  spiralPhase: number;
}

export interface Level {
  id: number;
  obstacles: Obstacle[];
  nodes: ResonanceNode[];
  portal: Portal;
  playerStart: { x: number; y: number };
}

const EDGE_MARGIN = 80;
const OBJECT_PADDING = 30;
const PLAYER_START_CLEARANCE = 120;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  padding: number
): boolean {
  return (
    ax - padding < bx + bw &&
    ax + aw + padding > bx &&
    ay - padding < by + bh &&
    ay + ah + padding > by
  );
}

function circleRectOverlap(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number,
  padding: number
): boolean {
  const effectiveR = cr + padding;
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < effectiveR * effectiveR;
}

function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  padding: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const minDist = r1 + r2 + padding;
  return dx * dx + dy * dy < minDist * minDist;
}

function obstacleBounds(obs: Obstacle): { x: number; y: number; w: number; h: number } {
  if (obs.type === 'rect') {
    return { x: obs.x, y: obs.y, w: obs.width, h: obs.height };
  }
  return {
    x: obs.x - obs.width,
    y: obs.y - obs.height,
    w: obs.width * 2,
    h: obs.height * 2,
  };
}

function obstacleOverlapsPoint(obs: Obstacle, px: number, py: number, padding: number): boolean {
  if (obs.type === 'rect') {
    return rectsOverlap(obs.x, obs.y, obs.width, obs.height, px, py, 0, 0, padding);
  }
  const dx = obs.x - px;
  const dy = obs.y - py;
  return dx * dx + dy * dy < (obs.width + padding) * (obs.width + padding);
}

function obstacleOverlapsObstacle(a: Obstacle, b: Obstacle, padding: number): boolean {
  const ab = obstacleBounds(a);
  const bb = obstacleBounds(b);

  if (a.type === 'rect' && b.type === 'rect') {
    return rectsOverlap(ab.x, ab.y, ab.w, ab.h, bb.x, bb.y, bb.w, bb.h, padding);
  }

  if (a.type === 'circle' && b.type === 'circle') {
    return circlesOverlap(a.x, a.y, a.width, b.x, b.y, b.width, padding);
  }

  const rectObs = a.type === 'rect' ? a : b;
  const circObs = a.type === 'circle' ? a : b;
  return circleRectOverlap(circObs.x, circObs.y, circObs.width, rectObs.x, rectObs.y, rectObs.width, rectObs.height, padding);
}

function obstacleOverlapsNode(obs: Obstacle, node: ResonanceNode, padding: number): boolean {
  if (obs.type === 'rect') {
    return rectsOverlap(
      obs.x, obs.y, obs.width, obs.height,
      node.x - node.activationRadius, node.y - node.activationRadius,
      node.activationRadius * 2, node.activationRadius * 2,
      padding
    );
  }
  return circleRectOverlap(
    obs.x, obs.y, obs.width,
    node.x - node.activationRadius, node.y - node.activationRadius,
    node.activationRadius * 2, node.activationRadius * 2,
    padding
  );
}

function isInPlayerStartArea(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
  const startX = canvasWidth / 2;
  const startY = canvasHeight - EDGE_MARGIN;
  const dx = x - startX;
  const dy = y - startY;
  return dx * dx + dy * dy < PLAYER_START_CLEARANCE * PLAYER_START_CLEARANCE;
}

function isInPortalArea(x: number, y: number, canvasWidth: number): boolean {
  const portalX = canvasWidth / 2;
  const portalY = EDGE_MARGIN;
  const dx = x - portalX;
  const dy = y - portalY;
  return dx * dx + dy * dy < (40 + OBJECT_PADDING) * (40 + OBJECT_PADDING);
}

function generateObstacle(
  canvasWidth: number,
  canvasHeight: number,
  existing: Obstacle[],
  nodes: ResonanceNode[],
  hasDecay: boolean
): Obstacle | null {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const type = Math.random() < 0.5 ? 'rect' : 'circle';

    let obs: Obstacle;
    if (type === 'rect') {
      const width = rand(60, 120);
      const height = rand(20, 40);
      const x = rand(EDGE_MARGIN, canvasWidth - EDGE_MARGIN - width);
      const y = rand(EDGE_MARGIN, canvasHeight - EDGE_MARGIN - height);
      obs = { x, y, width, height, type, active: true };
    } else {
      const radius = rand(15, 35);
      const x = rand(EDGE_MARGIN + radius, canvasWidth - EDGE_MARGIN - radius);
      const y = rand(EDGE_MARGIN + radius, canvasHeight - EDGE_MARGIN - radius);
      obs = { x, y, width: radius, height: radius, type, active: true };
    }

    if (isInPlayerStartArea(obs.x, obs.y, canvasWidth, canvasHeight)) continue;
    if (isInPortalArea(obs.x, obs.y, canvasWidth)) continue;

    let overlaps = false;
    for (const existingObs of existing) {
      if (obstacleOverlapsObstacle(obs, existingObs, OBJECT_PADDING)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    for (const node of nodes) {
      if (obstacleOverlapsNode(obs, node, OBJECT_PADDING)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    if (hasDecay) {
      const maxTimer = rand(5000, 10000);
      obs.decayTimer = maxTimer;
      obs.maxTimer = maxTimer;
    }

    return obs;
  }

  return null;
}

function assignPitch(tier: 'low' | 'mid' | 'high'): number {
  switch (tier) {
    case 'low': return rand(0, 0.33);
    case 'mid': return rand(0.33, 0.66);
    case 'high': return rand(0.66, 1.0);
  }
}

function generateNode(
  canvasWidth: number,
  canvasHeight: number,
  existingNodes: ResonanceNode[],
  obstacles: Obstacle[],
  pitchTier: 'low' | 'mid' | 'high'
): ResonanceNode | null {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = rand(EDGE_MARGIN + 25, canvasWidth - EDGE_MARGIN - 25);
    const y = rand(EDGE_MARGIN + 25, canvasHeight - EDGE_MARGIN - 25);

    if (isInPlayerStartArea(x, y, canvasWidth, canvasHeight)) continue;
    if (isInPortalArea(x, y, canvasWidth)) continue;

    let overlaps = false;
    for (const node of existingNodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const minDist = node.activationRadius + 25 + OBJECT_PADDING;
      if (dx * dx + dy * dy < minDist * minDist) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const node: ResonanceNode = {
      x,
      y,
      targetPitch: assignPitch(pitchTier),
      activated: false,
      activationRadius: 25,
      glowRadius: 0,
      pulsePhase: Math.random(),
    };

    let blocked = false;
    for (const obs of obstacles) {
      if (obstacleOverlapsNode(obs, node, OBJECT_PADDING)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    return node;
  }

  return null;
}

export function generateLevel(id: number, canvasWidth: number, canvasHeight: number): Level {
  const obstacleCount = Math.min(3 + (id - 1), 8);
  const nodeCount = Math.min(2 + Math.floor((id - 1) / 2), 5);
  const decayChance = Math.min(0.1 + (id - 1) * 0.1, 0.7);

  const obstacles: Obstacle[] = [];
  const nodes: ResonanceNode[] = [];

  const pitchTiers: ('low' | 'mid' | 'high')[] = ['low', 'mid', 'high'];
  const nodeTiers: ('low' | 'mid' | 'high')[] = [];

  if (nodeCount >= 3) {
    nodeTiers.push('low', 'mid', 'high');
    for (let i = 3; i < nodeCount; i++) {
      nodeTiers.push(pitchTiers[randInt(0, 2)]);
    }
  } else {
    for (let i = 0; i < nodeCount; i++) {
      nodeTiers.push(pitchTiers[i % 3]);
    }
  }

  for (let i = 0; i < nodeTiers.length; i++) {
    const node = generateNode(canvasWidth, canvasHeight, nodes, obstacles, nodeTiers[i]);
    if (node) nodes.push(node);
  }

  for (let i = 0; i < obstacleCount; i++) {
    const hasDecay = Math.random() < decayChance;
    const obs = generateObstacle(canvasWidth, canvasHeight, obstacles, nodes, hasDecay);
    if (obs) obstacles.push(obs);
  }

  const portal: Portal = {
    x: canvasWidth / 2,
    y: EDGE_MARGIN,
    radius: 40,
    active: false,
    rotation: 0,
    spiralPhase: 0,
  };

  const playerStart = {
    x: canvasWidth / 2,
    y: canvasHeight - EDGE_MARGIN,
  };

  return {
    id,
    obstacles,
    nodes,
    portal,
    playerStart,
  };
}
