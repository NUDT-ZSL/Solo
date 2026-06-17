import { useState, useCallback } from 'react';
import type { KnowledgePoint, Relation, UserScore, ReviewPathResult } from '../types';

function topologicalSort(points: KnowledgePoint[], relations: Relation[]): string[] {
  const adjacencyMap: Map<string, string[]> = new Map();
  const inDegree: Map<string, number> = new Map();

  points.forEach(p => {
    adjacencyMap.set(p.id, []);
    inDegree.set(p.id, 0);
  });

  relations.forEach(r => {
    const sources = adjacencyMap.get(r.sourceId);
    if (sources) {
      sources.push(r.targetId);
    }
    const deg = inDegree.get(r.targetId);
    if (deg !== undefined) {
      inDegree.set(r.targetId, deg + 1);
    }
  });

  const stack: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) stack.push(id);
  });

  const result: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    const neighbors = adjacencyMap.get(current) || [];
    neighbors.forEach(neighbor => {
      const deg = inDegree.get(neighbor);
      if (deg !== undefined) {
        inDegree.set(neighbor, deg - 1);
        if (deg - 1 === 0) {
          stack.push(neighbor);
        }
      }
    });
  }

  return result;
}

function dfsCollectPath(
  startId: string,
  adjacencyMap: Map<string, string[]>,
  reverseAdjacency: Map<string, string[]>,
  weakPointIds: string[],
  topoOrder: string[],
  maxNodes: number = 5
): string[] {
  const path: string[] = [];
  const visited = new Set<string>();

  function collectPrerequisites(nodeId: string): void {
    if (path.length >= maxNodes) return;
    const prereqs = reverseAdjacency.get(nodeId) || [];
    const sortedPrereqs = prereqs
      .filter(p => weakPointIds.includes(p) && !visited.has(p))
      .sort((a, b) => topoOrder.indexOf(a) - topoOrder.indexOf(b));

    for (const prereq of sortedPrereqs) {
      if (path.length >= maxNodes) break;
      if (!visited.has(prereq)) {
        visited.add(prereq);
        collectPrerequisites(prereq);
        path.push(prereq);
      }
    }
  }

  visited.add(startId);
  collectPrerequisites(startId);
  path.push(startId);

  function collectDependents(nodeId: string): void {
    if (path.length >= maxNodes) return;
    const dependents = adjacencyMap.get(nodeId) || [];
    const sortedDependents = dependents
      .filter(d => weakPointIds.includes(d) && !visited.has(d))
      .sort((a, b) => topoOrder.indexOf(a) - topoOrder.indexOf(b));

    for (const dep of sortedDependents) {
      if (path.length >= maxNodes) break;
      if (!visited.has(dep)) {
        visited.add(dep);
        path.push(dep);
        collectDependents(dep);
      }
    }
  }

  collectDependents(startId);

  return path.slice(0, maxNodes);
}

export function useRecommendPath() {
  const [path, setPath] = useState<string[]>([]);
  const [weakPoints, setWeakPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePath = useCallback((
    points: KnowledgePoint[],
    relations: Relation[],
    scores: UserScore[],
    userId: string
  ): ReviewPathResult => {
    const userScores = scores.filter(s => s.userId === userId);
    const scoreMap: Map<string, number> = new Map();
    userScores.forEach(s => scoreMap.set(s.knowledgePointId, s.score));

    const weakPointList = points
      .filter(p => {
        const score = scoreMap.get(p.id);
        return score !== undefined && score < 60;
      })
      .sort((a, b) => (scoreMap.get(a.id) || 0) - (scoreMap.get(b.id) || 0));

    const weakPointIds = weakPointList.map(p => p.id);

    if (weakPointIds.length === 0) {
      setPath([]);
      setWeakPoints([]);
      return { path: [], weakPoints: [] };
    }

    const topoOrder = topologicalSort(points, relations);

    const adjacencyMap: Map<string, string[]> = new Map();
    relations.forEach(r => {
      if (!adjacencyMap.has(r.sourceId)) {
        adjacencyMap.set(r.sourceId, []);
      }
      adjacencyMap.get(r.sourceId)!.push(r.targetId);
    });

    const reverseAdjacency: Map<string, string[]> = new Map();
    relations.forEach(r => {
      if (!reverseAdjacency.has(r.targetId)) {
        reverseAdjacency.set(r.targetId, []);
      }
      reverseAdjacency.get(r.targetId)!.push(r.sourceId);
    });

    const resultPath = dfsCollectPath(
      weakPointIds[0],
      adjacencyMap,
      reverseAdjacency,
      weakPointIds,
      topoOrder,
      5
    );

    setPath(resultPath);
    setWeakPoints(weakPointIds);

    return { path: resultPath, weakPoints: weakPointIds };
  }, []);

  const fetchAndCalculate = useCallback(async (
    courseId: string,
    userId: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/review-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId, userId }),
      });
      const result: ReviewPathResult = await response.json();
      setPath(result.path);
      setWeakPoints(result.weakPoints);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate path');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPath = useCallback(() => {
    setPath([]);
    setWeakPoints([]);
  }, []);

  const removeFromPath = useCallback((nodeId: string) => {
    setPath(prev => prev.filter(id => id !== nodeId));
  }, []);

  return {
    path,
    weakPoints,
    loading,
    error,
    calculatePath,
    fetchAndCalculate,
    clearPath,
    removeFromPath
  };
}

export default useRecommendPath;
