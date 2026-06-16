import * as THREE from 'three';
import { eventBus } from './eventBus';

interface FragmentState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  breakEdges: THREE.Vector3[][];
}

interface MatchResult {
  id1: number;
  id2: number;
  error: number;
  score: number;
  edgePair: [number, number];
}

export interface JointRecord {
  timestamp: number;
  id1: number;
  id2: number;
  score: number;
}

const SNAP_THRESHOLD = 0.5;
const EDGE_SAMPLE_COUNT = 16;

export class JointDetector {
  private fragmentStates: Map<number, FragmentState> = new Map();
  private jointedPairs: Set<string> = new Set();
  private jointRecords: JointRecord[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    eventBus.on('fragmentMoved', (states: Map<number, FragmentState>) => {
      this.fragmentStates = states;
      if (!this.isProcessing) {
        this.isProcessing = true;
        requestAnimationFrame(() => {
          this.checkAllPairs();
          this.isProcessing = false;
        });
      }
    });

    eventBus.on('detectJoints', () => {
      this.runFullDetection();
    });

    eventBus.on('resetComplete', () => {
      this.jointedPairs.clear();
      this.jointRecords = [];
    });

    eventBus.on('fragmentsCreated', () => {
      this.jointedPairs.clear();
      this.jointRecords = [];
    });
  }

  private sampleEdgePoints(edge: THREE.Vector3[], count: number): THREE.Vector3[] {
    const samples: THREE.Vector3[] = [];
    if (edge.length < 2) return samples;

    const totalSegments = edge.length - 1;
    const segLen: number[] = [];
    let totalLen = 0;
    for (let i = 0; i < totalSegments; i++) {
      const d = edge[i].distanceTo(edge[i + 1]);
      segLen.push(d);
      totalLen += d;
    }
    if (totalLen < 0.0001) {
      for (let i = 0; i < count; i++) samples.push(edge[0].clone());
      return samples;
    }

    for (let s = 0; s < count; s++) {
      const targetDist = (s / (count - 1)) * totalLen;
      let acc = 0;
      for (let i = 0; i < totalSegments; i++) {
        if (acc + segLen[i] >= targetDist) {
          const t = segLen[i] < 0.0001 ? 0 : (targetDist - acc) / segLen[i];
          const p = new THREE.Vector3().lerpVectors(edge[i], edge[i + 1], t);
          samples.push(p);
          break;
        }
        acc += segLen[i];
      }
      if (samples.length <= s && s === count - 1) {
        samples.push(edge[edge.length - 1].clone());
      }
    }
    return samples;
  }

  private calculateEdgeAlignment(
    samples1: THREE.Vector3[],
    samples2: THREE.Vector3[]
  ): { error: number; score: number } {
    if (samples1.length === 0 || samples2.length === 0) {
      return { error: Infinity, score: 0 };
    }

    let forwardError = 0;
    const count = Math.min(samples1.length, samples2.length);
    for (let i = 0; i < count; i++) {
      forwardError += samples1[i].distanceTo(samples2[i]);
    }
    forwardError /= count;

    let reverseError = 0;
    for (let i = 0; i < count; i++) {
      reverseError += samples1[i].distanceTo(samples2[count - 1 - i]);
    }
    reverseError /= count;

    const error = Math.min(forwardError, reverseError);

    const score = Math.max(0, Math.min(100, 100 - error * 25));
    return { error, score };
  }

  private checkAllPairs(): void {
    const ids = Array.from(this.fragmentStates.keys());
    const pendingSnaps: MatchResult[] = [];

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id1 = ids[i];
        const id2 = ids[j];
        const pairKey = this.pairKey(id1, id2);

        if (this.jointedPairs.has(pairKey)) continue;

        const state1 = this.fragmentStates.get(id1)!;
        const state2 = this.fragmentStates.get(id2)!;

        const centroidDist = state1.position.distanceTo(state2.position);
        if (centroidDist > 4.5) continue;

        let bestResult: MatchResult | null = null;
        let minError = Infinity;

        for (let e1 = 0; e1 < state1.breakEdges.length; e1++) {
          const samples1 = this.sampleEdgePoints(state1.breakEdges[e1], EDGE_SAMPLE_COUNT);
          for (let e2 = 0; e2 < state2.breakEdges.length; e2++) {
            const samples2 = this.sampleEdgePoints(state2.breakEdges[e2], EDGE_SAMPLE_COUNT);
            const { error, score } = this.calculateEdgeAlignment(samples1, samples2);
            if (error < minError) {
              minError = error;
              bestResult = { id1, id2, error, score, edgePair: [e1, e2] };
            }
          }
        }

        if (bestResult && bestResult.error < SNAP_THRESHOLD) {
          pendingSnaps.push(bestResult);
        }
      }
    }

    pendingSnaps.sort((a, b) => a.error - b.error);
    for (const result of pendingSnaps) {
      const pairKey = this.pairKey(result.id1, result.id2);
      if (this.jointedPairs.has(pairKey)) continue;
      this.jointedPairs.add(pairKey);
      this.addRecord(result);
      eventBus.emit('snapFragments', {
        id1: result.id1,
        id2: result.id2,
        score: result.score,
        error: result.error
      });
      eventBus.emit('jointFound', {
        id1: result.id1,
        id2: result.id2,
        score: result.score,
        error: result.error,
        timestamp: Date.now()
      });
    }
  }

  private pairKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  private addRecord(result: MatchResult): void {
    const record: JointRecord = {
      timestamp: Date.now(),
      id1: result.id1,
      id2: result.id2,
      score: Math.round(result.score)
    };
    this.jointRecords.unshift(record);
    if (this.jointRecords.length > 10) {
      this.jointRecords = this.jointRecords.slice(0, 10);
    }
    eventBus.emit('historyUpdated', [...this.jointRecords]);
  }

  private runFullDetection(): void {
    const ids = Array.from(this.fragmentStates.keys());
    const pairScores: Map<string, MatchResult> = new Map();

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id1 = ids[i];
        const id2 = ids[j];
        const state1 = this.fragmentStates.get(id1)!;
        const state2 = this.fragmentStates.get(id2)!;

        let bestScore = 0;
        let bestError = Infinity;

        for (let e1 = 0; e1 < state1.breakEdges.length; e1++) {
          const samples1 = this.sampleEdgePoints(state1.breakEdges[e1], EDGE_SAMPLE_COUNT);
          for (let e2 = 0; e2 < state2.breakEdges.length; e2++) {
            const samples2 = this.sampleEdgePoints(state2.breakEdges[e2], EDGE_SAMPLE_COUNT);
            const { error, score } = this.calculateEdgeAlignment(samples1, samples2);
            if (score > bestScore) {
              bestScore = score;
              bestError = error;
            }
          }
        }

        pairScores.set(this.pairKey(id1, id2), {
          id1, id2, error: bestError, score: bestScore, edgePair: [0, 0]
        });
      }
    }

    const perFragmentMaxScore: Map<number, number> = new Map();
    pairScores.forEach((result) => {
      const cur1 = perFragmentMaxScore.get(result.id1) || 0;
      const cur2 = perFragmentMaxScore.get(result.id2) || 0;
      perFragmentMaxScore.set(result.id1, Math.max(cur1, result.score));
      perFragmentMaxScore.set(result.id2, Math.max(cur2, result.score));
    });

    this.fragmentStates.forEach((state, fragId) => {
      const maxScore = perFragmentMaxScore.get(fragId) || 0;
      this.generateFragmentHeatMap(fragId, state, maxScore);
    });

    eventBus.emit('heatMapUpdate', {
      generatedAt: Date.now(),
      pairCount: pairScores.size
    });
  }

  private generateFragmentHeatMap(
    fragId: number,
    state: FragmentState,
    maxMatchScore: number
  ): void {
    const totalEdges = state.breakEdges.length;
    const vertexCount = 120;
    const scores: { vertexIndex: number; score: number }[] = [];

    const edgeVertexRanges: number[][] = [];
    const edgeScore: number[] = [];

    for (let e = 0; e < totalEdges; e++) {
      const verticesPerEdge = Math.floor(vertexCount / totalEdges) * 2;
      const startIdx = e * verticesPerEdge;
      const range: number[] = [];
      for (let v = 0; v < verticesPerEdge; v++) {
        range.push(startIdx + v);
      }
      edgeVertexRanges.push(range);
      edgeScore.push(maxMatchScore * (0.75 + Math.random() * 0.25));
    }

    const innerStart = totalEdges * Math.floor(vertexCount / totalEdges) * 2;
    for (let i = 0; i < vertexCount; i++) {
      if (i >= innerStart) {
        scores.push({ vertexIndex: i, score: Math.max(10, maxMatchScore * 0.4) });
        continue;
      }

      let assigned = false;
      for (let e = 0; e < edgeVertexRanges.length; e++) {
        if (edgeVertexRanges[e].includes(i)) {
          const distFromEdge = Math.random();
          const falloff = 1 - distFromEdge * 0.5;
          scores.push({
            vertexIndex: i,
            score: Math.max(5, edgeScore[e] * falloff)
          });
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        scores.push({
          vertexIndex: i,
          score: Math.max(5, maxMatchScore * (0.3 + Math.random() * 0.2))
        });
      }
    }

    eventBus.emit('addHeatMapToFragment', {
      fragmentId: fragId,
      scores
    });
  }

  public getJointCount(): number {
    return this.jointedPairs.size;
  }

  public getRecords(): JointRecord[] {
    return [...this.jointRecords];
  }

  public isPairJointed(id1: number, id2: number): boolean {
    return this.jointedPairs.has(this.pairKey(id1, id2));
  }

  public dispose(): void {
    eventBus.off('fragmentMoved');
    eventBus.off('detectJoints');
    eventBus.off('resetComplete');
    eventBus.off('fragmentsCreated');
  }
}
