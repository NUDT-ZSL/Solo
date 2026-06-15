import type { PosType, WordData, GraphNode, GraphEdge, GraphData } from './types';

const API_BASE = 'http://localhost:8000';

export class StarGraphEngine {
  async fetchAssociations(word: string): Promise<WordData> {
    const res = await fetch(`${API_BASE}/api/word/associations?word=${encodeURIComponent(word)}`);
    return res.json();
  }

  async fetchRandom(): Promise<WordData> {
    const res = await fetch(`${API_BASE}/api/word/random`);
    return res.json();
  }

  async searchWord(query: string): Promise<WordData[]> {
    const res = await fetch(`${API_BASE}/api/word/search?q=${encodeURIComponent(query)}`);
    return res.json();
  }

  buildGraph(centerWord: string, associationData: WordData): GraphData {
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const orbitRadius = Math.min(canvasWidth, canvasHeight) * 0.3;

    const centerNode: GraphNode = {
      id: centerWord,
      word: centerWord,
      pos: associationData.pos,
      x: cx,
      y: cy,
      radius: 40,
      isCenter: true,
      definition: associationData.definition,
      examples: associationData.examples,
      glowIntensity: 0,
      targetGlow: 0,
    };

    const nodes: GraphNode[] = [centerNode];
    const edges: GraphEdge[] = [];
    const associations = associationData.associations;
    const count = associations.length;

    for (let i = 0; i < count; i++) {
      const assoc = associations[i];
      const angle = (2 * Math.PI * i) / count;
      const nodeRadius = 20 + assoc.strength * 15;

      nodes.push({
        id: assoc.word,
        word: assoc.word,
        pos: assoc.pos,
        x: cx + orbitRadius * Math.cos(angle),
        y: cy + orbitRadius * Math.sin(angle),
        radius: nodeRadius,
        isCenter: false,
        definition: '',
        examples: [],
        glowIntensity: 0,
        targetGlow: 0,
      });

      edges.push({
        source: centerWord,
        target: assoc.word,
        strength: assoc.strength,
      });
    }

    return { nodes, edges, centerWord };
  }

  getNodeColor(pos: PosType): string {
    const colors: Record<PosType, string> = {
      noun: '#4a9eff',
      verb: '#ff8c42',
      adj: '#4ade80',
      other: '#a78bfa',
    };
    return colors[pos];
  }
}
