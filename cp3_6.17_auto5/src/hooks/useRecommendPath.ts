import { useState, useCallback } from 'react';
import { KnowledgePoint, KnowledgeRelation, Assessment, ReviewRecord } from '../types';

function buildGraph(
  points: KnowledgePoint[],
  relations: KnowledgeRelation[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  points.forEach((p) => graph.set(p.id, []));
  relations.forEach((r) => {
    const targets = graph.get(r.sourceId) || [];
    targets.push(r.targetId);
    graph.set(r.sourceId, targets);
  });
  return graph;
}

function reverseGraph(
  points: KnowledgePoint[],
  relations: KnowledgeRelation[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  points.forEach((p) => graph.set(p.id, []));
  relations.forEach((r) => {
    const sources = graph.get(r.targetId) || [];
    sources.push(r.sourceId);
    graph.set(r.targetId, sources);
  });
  return graph;
}

function dfsTopologicalSort(
  startId: string,
  graph: Map<string, string[]>,
  weakPoints: Set<string>,
  maxNodes: number,
  reviewedIds: Set<string>
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId) || result.length >= maxNodes) return;
    visited.add(nodeId);
    
    if (!reviewedIds.has(nodeId)) {
      result.push(nodeId);
    }

    const neighbors = graph.get(nodeId) || [];
    neighbors.sort((a, b) => {
      const aWeak = weakPoints.has(a) ? 1 : 0;
      const bWeak = weakPoints.has(b) ? 1 : 0;
      return bWeak - aWeak;
    });

    for (const neighbor of neighbors) {
      if (result.length >= maxNodes) break;
      dfs(neighbor);
    }
  }

  dfs(startId);
  return result.slice(0, maxNodes);
}

export function useRecommendPath() {
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePath = useCallback(
    async (
      userId: string,
      courseId: string,
      points: KnowledgePoint[],
      relations: KnowledgeRelation[],
      assessments: Assessment[],
      reviews: ReviewRecord[],
      maxNodes: number = 5
    ): Promise<string[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/recommend-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, courseId, maxNodes }),
        });

        if (response.ok) {
          const data = await response.json();
          setPath(data.path);
          setIsLoading(false);
          return data.path;
        }
      } catch (e) {
        console.warn('API call failed, using local calculation', e);
      }

      const coursePoints = points.filter((p) => p.courseId === courseId);
      const courseRelations = relations.filter((r) => r.courseId === courseId);
      const userAssessments = assessments.filter(
        (a) => a.userId === userId && a.courseId === courseId
      );
      const reviewedIds = new Set(reviews.map((r) => r.pointId));

      const weakPoints = new Set<string>();
      userAssessments.forEach((a) => {
        if (a.score < 60) {
          weakPoints.add(a.pointId);
        }
      });

      let resultPath: string[] = [];

      if (weakPoints.size === 0) {
        resultPath = coursePoints
          .filter((p) => !reviewedIds.has(p.id))
          .slice(0, maxNodes)
          .map((p) => p.id);
      } else {
        const forwardGraph = buildGraph(coursePoints, courseRelations);
        const reverseGraphMap = reverseGraph(coursePoints, courseRelations);

        let bestPath: string[] = [];
        let maxWeakCount = -1;

        for (const weakPointId of weakPoints) {
          const prerequisites: string[] = [];
          const visited = new Set<string>();
          
          function collectPrereqs(nodeId: string) {
            if (visited.has(nodeId) || nodeId === weakPointId) return;
            visited.add(nodeId);
            if (!reviewedIds.has(nodeId)) {
              prerequisites.unshift(nodeId);
            }
            const parents = reverseGraphMap.get(nodeId) || [];
            for (const parent of parents) {
              collectPrereqs(parent);
            }
          }
          
          const directParents = reverseGraphMap.get(weakPointId) || [];
          for (const parent of directParents) {
            collectPrereqs(parent);
          }

          const startPoint = prerequisites.length > 0 ? prerequisites[0] : weakPointId;
          const currentPath = dfsTopologicalSort(
            startPoint,
            forwardGraph,
            weakPoints,
            maxNodes,
            reviewedIds
          );

          const weakCount = currentPath.filter((id) => weakPoints.has(id)).length;
          if (weakCount > maxWeakCount || (weakCount === maxWeakCount && currentPath.length > bestPath.length)) {
            maxWeakCount = weakCount;
            bestPath = currentPath;
          }
        }

        resultPath = bestPath;
      }

      setPath(resultPath);
      setIsLoading(false);
      return resultPath;
    },
    []
  );

  const clearPath = useCallback(() => {
    setPath([]);
    setError(null);
  }, []);

  return {
    path,
    isLoading,
    error,
    generatePath,
    clearPath,
    setPath,
  };
}
