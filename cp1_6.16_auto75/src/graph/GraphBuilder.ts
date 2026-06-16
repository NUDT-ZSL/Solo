export interface GraphNode {
  id: string;
  name: string;
  appearanceCount: number;
  firstChapterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  interactionType: string;
  weight: number;
  intimacy: number;
  thickness: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const POSITIVE_WORDS = [
  '爱', '喜欢', '信任', '帮助', '保护', '关心', '温暖', '友好',
  '拥抱', '微笑', '感谢', '支持', '合作', '忠诚', '亲切', '欣赏',
  '温柔', '守护', '陪伴', '珍惜',
];

const NEGATIVE_WORDS = [
  '恨', '讨厌', '背叛', '伤害', '攻击', '愤怒', '冷漠', '敌意',
  '杀', '战争', '欺骗', '怀疑', '恐惧', '威胁', '对抗', '争斗',
  '复仇', '诅咒', '蔑视', '排斥',
];

const INTERACTION_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /["「『].*?对.*?说|.*?道|.*?问|.*?答|.*?喊|.*?叫|.*?低语|.*?喃喃/, type: '对话' },
  { pattern: /战斗|打斗|搏斗|挥剑|拔刀|射击|拳击|攻击|防御/, type: '战斗' },
  { pattern: /合作|一起|共同|联手|携手|并肩|配合|协作/, type: '合作' },
  { pattern: /背叛|欺骗|出卖|暗算|陷害/, type: '背叛' },
  { pattern: /保护|守护|救助|拯救|掩护|挡在/, type: '保护' },
];

function findCharacterMentions(
  content: string,
  characterNames: string[]
): Map<string, number[]> {
  const mentions = new Map<string, number[]>();

  for (const name of characterNames) {
    const positions: number[] = [];
    let idx = content.indexOf(name);
    while (idx !== -1) {
      positions.push(idx);
      idx = content.indexOf(name, idx + name.length);
    }
    if (positions.length > 0) {
      mentions.set(name, positions);
    }
  }

  return mentions;
}

function computeIntimacy(
  cooccurrence: number,
  contextSentiment: number
): number {
  const coocFactor = Math.min(cooccurrence / 10, 1);
  const sentimentFactor = (contextSentiment + 1) / 2;
  return coocFactor * 0.6 + sentimentFactor * 0.4;
}

function getInteractionType(content: string, charA: string, charB: string): string {
  const contextWindow = 200;
  let bestType = '互动';
  let bestMatch = 0;

  for (const { pattern, type } of INTERACTION_PATTERNS) {
    const matches = content.match(new RegExp(pattern.source, 'g'));
    if (matches && matches.length > bestMatch) {
      const idxA = content.indexOf(charA);
      const idxB = content.indexOf(charB);
      if (idxA !== -1 && idxB !== -1) {
        const contextStart = Math.max(0, Math.min(idxA, idxB) - contextWindow);
        const contextEnd = Math.min(content.length, Math.max(idxA, idxB) + contextWindow);
        const context = content.substring(contextStart, contextEnd);
        const contextMatches = context.match(new RegExp(pattern.source, 'g'));
        if (contextMatches && contextMatches.length > bestMatch) {
          bestMatch = contextMatches.length;
          bestType = type;
        }
      }
    }
  }

  return bestType;
}

function computeSentiment(content: string): number {
  let score = 0;
  for (const word of POSITIVE_WORDS) {
    let idx = content.indexOf(word);
    while (idx !== -1) {
      score += 1;
      idx = content.indexOf(word, idx + word.length);
    }
  }
  for (const word of NEGATIVE_WORDS) {
    let idx = content.indexOf(word);
    while (idx !== -1) {
      score -= 1;
      idx = content.indexOf(word, idx + word.length);
    }
  }
  return Math.max(-1, Math.min(1, score / 5));
}

function intimacyToColor(intimacy: number): string {
  const r1 = 0xE7, g1 = 0x4C, b1 = 0x3C;
  const r2 = 0x2E, g2 = 0xCC, b2 = 0x71;

  const t = (intimacy + 1) / 2;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function buildGraph(
  chapters: { id: string; content: string; paragraphs: string[] }[],
  characterNames: string[]
): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  for (const chapter of chapters) {
    const fullContent = chapter.paragraphs.join('\n');
    const mentions = findCharacterMentions(fullContent, characterNames);

    for (const [name, positions] of mentions) {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, {
          id: name,
          name,
          appearanceCount: positions.length,
          firstChapterId: chapter.id,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: Math.min(50, Math.max(20, 20 + positions.length * 3)),
          color: '#3498DB',
        });
      } else {
        const node = nodeMap.get(name)!;
        node.appearanceCount += positions.length;
        node.radius = Math.min(50, Math.max(20, 20 + node.appearanceCount * 3));
      }
    }

    const names = Array.from(mentions.keys());
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const nameA = names[i];
        const nameB = names[j];
        const key = [nameA, nameB].sort().join('::');

        const positionsA = mentions.get(nameA)!;
        const positionsB = mentions.get(nameB)!;

        let cooccurrence = 0;
        const windowSize = 500;
        for (const posA of positionsA) {
          for (const posB of positionsB) {
            if (Math.abs(posA - posB) < windowSize) {
              cooccurrence++;
            }
          }
        }

        if (cooccurrence > 0) {
          const contextStart = Math.max(0, Math.min(...positionsA, ...positionsB) - 100);
          const contextEnd = Math.min(fullContent.length, Math.max(...positionsA, ...positionsB) + 100);
          const context = fullContent.substring(contextStart, contextEnd);
          const sentiment = computeSentiment(context);
          const intimacy = computeIntimacy(cooccurrence, sentiment);
          const interactionType = getInteractionType(fullContent, nameA, nameB);

          if (edgeMap.has(key)) {
            const edge = edgeMap.get(key)!;
            edge.weight += cooccurrence;
            edge.intimacy = (edge.intimacy + intimacy) / 2;
            edge.thickness = Math.min(5, Math.max(1, edge.weight * 0.5));
          } else {
            edgeMap.set(key, {
              source: nameA,
              target: nameB,
              interactionType,
              weight: cooccurrence,
              intimacy,
              thickness: Math.min(5, Math.max(1, cooccurrence * 0.5)),
            });
          }
        }
      }
    }
  }

  const nodes = Array.from(nodeMap.values());
  const spreadRadius = 200;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    node.x = spreadRadius * Math.cos(angle);
    node.y = spreadRadius * Math.sin(angle);
    node.color = intimacyToColor(
      nodes.length > 1
        ? Array.from(edgeMap.values())
            .filter((e) => e.source === node.id || e.target === node.id)
            .reduce((sum, e) => sum + e.intimacy, 0) /
            Array.from(edgeMap.values()).filter(
              (e) => e.source === node.id || e.target === node.id
            ).length || 0
        : 0
    );
  });

  return {
    nodes,
    edges: Array.from(edgeMap.values()),
  };
}

export function applyForceLayout(
  graph: GraphData,
  iterations: number = 100
): GraphData {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  const edges = graph.edges;

  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const damping = 0.9;
  const centerStrength = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    for (const edge of edges) {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attractionStrength * edge.weight;

      source.vx += (dx / dist) * force;
      source.vy += (dy / dist) * force;
      target.vx -= (dx / dist) * force;
      target.vy -= (dy / dist) * force;
    }

    for (const node of nodes) {
      node.vx -= node.x * centerStrength;
      node.vy -= node.y * centerStrength;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return { nodes, edges };
}
