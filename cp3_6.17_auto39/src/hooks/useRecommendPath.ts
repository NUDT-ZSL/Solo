import { useState, useCallback } from 'react';
import { KnowledgePoint, Relation } from '../types';

export function useRecommendPath(
  points: KnowledgePoint[],
  relations: Relation[],
  scores: Map<string, number>
) {
  const [path, setPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const computePath = useCallback((maxNodes: number = 5) => {
    setLoading(true);
    
    const pointMap = new Map<string, KnowledgePoint>();
    points.forEach(p => pointMap.set(p.id, p));

    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const reverseAdj = new Map<string, string[]>();
    
    points.forEach(p => {
      inDegree.set(p.id, 0);
      adjacency.set(p.id, []);
      reverseAdj.set(p.id, []);
    });

    relations.forEach(r => {
      if (pointMap.has(r.sourceId) && pointMap.has(r.targetId)) {
        inDegree.set(r.targetId, (inDegree.get(r.targetId) || 0) + 1);
        adjacency.get(r.sourceId)!.push(r.targetId);
        reverseAdj.get(r.targetId)!.push(r.sourceId);
      }
    });

    const weakPoints = points.filter(p => {
      const score = scores.get(p.id);
      return score !== undefined && score < 60;
    });

    if (weakPoints.length === 0) {
      const sorted = [...points].sort((a, b) => {
        const sa = scores.get(a.id) ?? 100;
        const sb = scores.get(b.id) ?? 100;
        return sa - sb;
      });
      if (sorted.length > 0) {
        weakPoints.push(sorted[0]);
      }
    }

    if (weakPoints.length === 0) {
      setPath([]);
      setLoading(false);
      return;
    }

    const tempInDegree = new Map(inDegree);
    const topoOrder: string[] = [];
    const queue: string[] = [];

    tempInDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    while (queue.length > 0) {
      queue.sort((a, b) => {
        const sa = scores.get(a) ?? 100;
        const sb = scores.get(b) ?? 100;
        return sa - sb;
      });
      
      const current = queue.shift()!;
      topoOrder.push(current);
      
      const children = adjacency.get(current) || [];
      children.forEach(child => {
        const deg = tempInDegree.get(child)! - 1;
        tempInDegree.set(child, deg);
        if (deg === 0) queue.push(child);
      });
    }

    let startIdx = 0;
    let minScore = Infinity;
    topoOrder.forEach((id, idx) => {
      const score = scores.get(id) ?? 100;
      if (score < minScore) {
        minScore = score;
        startIdx = idx;
      }
    });

    const resultPath: string[] = [];
    const startId = topoOrder[startIdx];
    
    if (!startId) {
      setPath([]);
      setLoading(false);
      return;
    }

    let current = startId;
    while (resultPath.length < maxNodes) {
      resultPath.push(current);
      const children = adjacency.get(current) || [];
      if (children.length === 0) break;
      
      let bestChild = children[0];
      let bestScore = scores.get(bestChild) ?? 100;
      
      children.forEach(child => {
        const score = scores.get(child) ?? 100;
        if (score < bestScore && !resultPath.includes(child)) {
          bestScore = score;
          bestChild = child;
        }
      });
      
      if (resultPath.includes(bestChild)) break;
      current = bestChild;
    }

    while (resultPath.length < maxNodes) {
      const first = resultPath[0];
      const preds = reverseAdj.get(first) || [];
      const availablePreds = preds.filter(p => !resultPath.includes(p));
      
      if (availablePreds.length === 0) break;
      
      let bestPred = availablePreds[0];
      let bestScore = scores.get(bestPred) ?? 100;
      
      availablePreds.forEach(pred => {
        const score = scores.get(pred) ?? 100;
        if (score < bestScore) {
          bestScore = score;
          bestPred = pred;
        }
      });
      
      resultPath.unshift(bestPred);
    }

    setPath(resultPath.slice(0, maxNodes));
    setLoading(false);
  }, [points, relations, scores]);

  const clearPath = useCallback(() => {
    setPath([]);
  }, []);

  const removeFromPath = useCallback((pointId: string) => {
    setPath(prev => prev.filter(id => id !== pointId));
  }, []);

  return { path, loading, computePath, clearPath, removeFromPath };
}
