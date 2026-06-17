import * as THREE from 'three';
import { eventBus } from './eventBus';

interface FragmentState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  breakEdges: THREE.Vector3[][];
}

interface MatchResult {
  id1: number;
  id2: number;
  error: number;
  angularError: number;
  score: number;
  edgePair: [number, number];
}

export interface JointRecord {
  timestamp: number;
  id1: number;
  id2: number;
  score: number;
}

const SNAP_THRESHOLD_POS = 0.45;
const SNAP_THRESHOLD_ANGLE = 0.35;
const EDGE_SAMPLE_COUNT = 20;

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
      let placed = false;
      for (let i = 0; i < totalSegments && !placed; i++) {
        if (acc + segLen[i] >= targetDist) {
          const t = segLen[i] < 0.0001 ? 0 : (targetDist - acc) / segLen[i];
          samples.push(new THREE.Vector3().lerpVectors(edge[i], edge[i + 1], t));
          placed = true;
        }
        acc += segLen[i];
      }
      if (!placed) samples.push(edge[edge.length - 1].clone());
    }
    return samples;
  }

  private computeEdgeBarycentric(points: THREE.Vector3[]): THREE.Vector3 {
    const c = new THREE.Vector3();
    for (const p of points) c.add(p);
    return c.multiplyScalar(1 / points.length);
  }

  private computeEdgePrincipalDir(points: THREE.Vector3[], bary: THREE.Vector3): THREE.Vector3 {
    const v = new THREE.Vector3();
    for (let i = 0; i < points.length - 1; i++) {
      const seg = new THREE.Vector3().subVectors(points[i + 1], points[i]);
      v.add(seg.normalize());
    }
    if (v.lengthSq() < 1e-6) {
      v.subVectors(points[points.length - 1], bary);
    }
    return v.normalize();
  }

  private computeEdgeNormal(points: THREE.Vector3[], dir: THREE.Vector3): THREE.Vector3 {
    const bary = this.computeEdgeBarycentric(points);
    const normal = new THREE.Vector3();
    for (const p of points) {
      const toP = new THREE.Vector3().subVectors(p, bary);
      const projected = toP.clone().projectOnVector(dir);
      const perp = toP.sub(projected);
      normal.add(perp);
    }
    if (normal.lengthSq() < 1e-6) {
      const up = new THREE.Vector3(0, 1, 0);
      normal.crossVectors(dir, up);
      if (normal.lengthSq() < 1e-3) normal.set(1, 0, 0);
    }
    return normal.normalize();
  }

  private computeFrameAlignmentError(
    s1: THREE.Vector3[],
    s2: THREE.Vector3[]
  ): { posError: number; angleError: number } {
    if (s1.length < 3 || s2.length < 3) return { posError: Infinity, angleError: Infinity };

    const b1 = this.computeEdgeBarycentric(s1);
    const b2 = this.computeEdgeBarycentric(s2);
    const posError = b1.distanceTo(b2);

    const d1 = this.computeEdgePrincipalDir(s1, b1);
    const d2 = this.computeEdgePrincipalDir(s2, b2);
    const n1 = this.computeEdgeNormal(s1, d1);
    const n2 = this.computeEdgeNormal(s2, d2);
    const t1 = new THREE.Vector3().crossVectors(d1, n1).normalize();
    const t2 = new THREE.Vector3().crossVectors(d2, n2).normalize();

    const dotD = THREE.MathUtils.clamp(d1.dot(d2), -1, 1);
    const dotN = THREE.MathUtils.clamp(n1.dot(n2), -1, 1);
    const dotT = THREE.MathUtils.clamp(t1.dot(t2), -1, 1);
    const angD = Math.acos(dotD);
    const angN = Math.acos(dotN);
    const angT = Math.acos(dotT);

    let forwardAngle = (angD + angN + angT) / 3;

    const d2f = d2.clone().negate();
    const n2f = n2.clone().negate();
    const t2f = t2.clone().negate();
    const dotDf = THREE.MathUtils.clamp(d1.dot(d2f), -1, 1);
    const dotNf = THREE.MathUtils.clamp(n1.dot(n2f), -1, 1);
    const dotTf = THREE.MathUtils.clamp(t1.dot(t2f), -1, 1);
    const angDf = Math.acos(dotDf);
    const angNf = Math.acos(dotNf);
    const angTf = Math.acos(dotTf);
    const flippedAngle = (angDf + angNf + angTf) / 3;

    const angleError = Math.min(forwardAngle, flippedAngle);
    return { posError, angleError };
  }

  private calculateEdgeAlignment(
    samples1: THREE.Vector3[],
    samples2: THREE.Vector3[]
  ): { error: number; angleError: number; score: number } {
    if (samples1.length === 0 || samples2.length === 0) {
      return { error: Infinity, angleError: Infinity, score: 0 };
    }

    const count = Math.min(samples1.length, samples2.length);
    let forwardError = 0;
    for (let i = 0; i < count; i++) {
      forwardError += samples1[i].distanceTo(samples2[i]);
    }
    forwardError /= count;

    let reverseError = 0;
    for (let i = 0; i < count; i++) {
      reverseError += samples1[i].distanceTo(samples2[count - 1 - i]);
    }
    reverseError /= count;

    const s2Rev = [...samples2].reverse();
    const frameFwd = this.computeFrameAlignmentError(samples1, samples2);
    const frameRev = this.computeFrameAlignmentError(samples1, s2Rev);

    let error: number, angleError: number;
    if (forwardError < reverseError) {
      error = forwardError * 0.65 + frameFwd.posError * 0.35;
      angleError = frameFwd.angleError;
    } else {
      error = reverseError * 0.65 + frameRev.posError * 0.35;
      angleError = frameRev.angleError;
    }

    const posPenalty = error * 32;
    const angPenalty = (angleError / Math.PI) * 60;
    const combined = posPenalty + angPenalty;
    const score = Math.max(0, Math.min(100, 100 - combined));

    return { error, angleError, score };
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

        const state1 = this.fragmentStates.get(id1);
        const state2 = this.fragmentStates.get(id2);
        if (!state1 || !state2) continue;

        const centroidDist = state1.position.distanceTo(state2.position);
        if (centroidDist > 5) continue;

        const q1 = state1.quaternion;
        const q2 = state2.quaternion;
        const qDiff = q1.clone().invert().multiply(q2);
        const angleDiff = 2 * Math.acos(Math.abs(THREE.MathUtils.clamp(qDiff.w, -1, 1)));

        const idealAngle = (Math.PI * 2) / 6;
        const expectedAngleDiff = Math.abs(id2 - id1) * idealAngle;
        const normDiff = Math.min(
          Math.abs(angleDiff - expectedAngleDiff),
          Math.abs(angleDiff - (Math.PI * 2 - expectedAngleDiff)),
          Math.abs(angleDiff + expectedAngleDiff)
        );

        if (normDiff > 1.2 && centroidDist > 2.5) continue;

        let bestResult: MatchResult | null = null;
        let bestCombined = Infinity;

        for (let e1 = 0; e1 < state1.breakEdges.length; e1++) {
          const samples1 = this.sampleEdgePoints(state1.breakEdges[e1], EDGE_SAMPLE_COUNT);
          for (let e2 = 0; e2 < state2.breakEdges.length; e2++) {
            const samples2 = this.sampleEdgePoints(state2.breakEdges[e2], EDGE_SAMPLE_COUNT);
            const result = this.calculateEdgeAlignment(samples1, samples2);

            const eulerDiffX = Math.abs(state1.rotation.x - state2.rotation.x);
            const eulerDiffZ = Math.abs(state1.rotation.z - state2.rotation.z);
            const tiltPenalty = ((eulerDiffX + eulerDiffZ) / (Math.PI * 0.5)) * 35;

            const combined = result.error * 28 + result.angleError * 14 + tiltPenalty;

            if (combined < bestCombined) {
              bestCombined = combined;
              bestResult = {
                id1, id2,
                error: result.error,
                angularError: result.angleError,
                score: result.score,
                edgePair: [e1, e2]
              };
            }
          }
        }

        if (
          bestResult &&
          bestResult.error < SNAP_THRESHOLD_POS &&
          bestResult.angularError < SNAP_THRESHOLD_ANGLE
        ) {
          const e1 = Math.abs(state1.rotation.x - state2.rotation.x);
          const e2 = Math.abs(state1.rotation.z - state2.rotation.z);
          if (e1 < 0.45 && e2 < 0.45) {
            pendingSnaps.push(bestResult);
          }
        }
      }
    }

    pendingSnaps.sort((a, b) => a.error * 28 + a.angularError * 14 - (b.error * 28 + b.angularError * 14));
    for (const result of pendingSnaps) {
      const pairKey = this.pairKey(result.id1, result.id2);
      if (this.jointedPairs.has(pairKey)) continue;
      this.jointedPairs.add(pairKey);
      this.addRecord(result);
      eventBus.emit('snapFragments', {
        id1: result.id1, id2: result.id2,
        score: result.score, error: result.error,
        angularError: result.angularError
      });
      eventBus.emit('jointFound', {
        id1: result.id1, id2: result.id2,
        score: result.score, error: result.error,
        angularError: result.angularError,
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
        const state1 = this.fragmentStates.get(id1);
        const state2 = this.fragmentStates.get(id2);
        if (!state1 || !state2) continue;

        let bestScore = -Infinity;
        let bestResult: MatchResult | null = null;

        for (let e1 = 0; e1 < state1.breakEdges.length; e1++) {
          const samples1 = this.sampleEdgePoints(state1.breakEdges[e1], EDGE_SAMPLE_COUNT);
          for (let e2 = 0; e2 < state2.breakEdges.length; e2++) {
            const samples2 = this.sampleEdgePoints(state2.breakEdges[e2], EDGE_SAMPLE_COUNT);
            const r = this.calculateEdgeAlignment(samples1, samples2);
            if (r.score > bestScore) {
              bestScore = r.score;
              bestResult = {
                id1, id2, error: r.error, angularError: r.angleError,
                score: r.score, edgePair: [e1, e2]
              };
            }
          }
        }

        if (bestResult) {
          pairScores.set(this.pairKey(id1, id2), bestResult);
        }
      }
    }

    const perFragmentMaxScore: Map<number, number> = new Map();
    pairScores.forEach((r) => {
      perFragmentMaxScore.set(r.id1, Math.max(perFragmentMaxScore.get(r.id1) || 0, r.score));
      perFragmentMaxScore.set(r.id2, Math.max(perFragmentMaxScore.get(r.id2) || 0, r.score));
    });

    this.fragmentStates.forEach((_state, fragId) => {
      const maxScore = perFragmentMaxScore.get(fragId) || 0;
      this.generateFragmentHeatMap(fragId, maxScore);
    });

    eventBus.emit('heatMapUpdate', {
      generatedAt: Date.now(),
      pairCount: pairScores.size,
      results: Array.from(pairScores.entries()).map(([k, v]) => ({
        key: k,
        id1: v.id1, id2: v.id2,
        score: v.score,
        error: v.error,
        angularError: v.angularError
      }))
    });
  }

  private generateFragmentHeatMap(fragId: number, maxMatchScore: number): void {
    const fragState = this.fragmentStates.get(fragId);
    if (!fragState) return;

    const totalVerts = 300;
    const scores: { vertexIndex: number; score: number }[] = [];
    const edgeCount = fragState.breakEdges.length;
    const vertsPerEdgeSurface = 55;

    for (let e = 0; e < edgeCount; e++) {
      const edgeBase = e * vertsPerEdgeSurface;
      const edgeScore = maxMatchScore * (0.78 + Math.random() * 0.22);
      for (let v = 0; v < vertsPerEdgeSurface; v++) {
        const depth = v / vertsPerEdgeSurface;
        const falloff = 1 - depth * depth * 0.85;
        const noise = (Math.random() - 0.5) * 8;
        scores.push({
          vertexIndex: edgeBase + v,
          score: Math.max(3, edgeScore * falloff + noise)
        });
      }
    }

    const outerStart = edgeCount * vertsPerEdgeSurface;
    const outerSurface = totalVerts - outerStart;
    for (let v = 0; v < outerSurface; v++) {
      const noise = (Math.random() - 0.5) * 10;
      scores.push({
        vertexIndex: outerStart + v,
        score: Math.max(2, maxMatchScore * (0.15 + Math.random() * 0.18) + noise)
      });
    }

    eventBus.emit('addHeatMapToFragment', { fragmentId: fragId, scores });
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
