import { useMemo } from 'react';
import type { KnowledgePoint, Relation } from '../types';

interface UseRecommendPathParams {
  knowledgePoints: KnowledgePoint[];
  relations: Relation[];
  scores: Record<string, number>;
  reviewedIds: string[];
  maxNodes?: number;
}

export function useRecommendPath({
  knowledgePoints,
  relations,
  scores,
  reviewedIds,
  maxNodes = 5,
}: UseRecommendPathParams): string[] {
  return useMemo(() => {
    if (knowledgePoints.length === 0) return [];

    const idSet = new Set(knowledgePoints.map((k) => k.id));
    const adjList: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    knowledgePoints.forEach((kp) => {
      adjList[kp.id] = [];
      inDegree[kp.id] = 0;
    });

    relations.forEach((r) => {
      if (idSet.has(r.sourceId) && idSet.has(r.targetId)) {
        adjList[r.sourceId].push(r.targetId);
        inDegree[r.targetId] = (inDegree[r.targetId] || 0) + 1;
      }
    });

    const topoOrder: string[] = [];
    const visited = new Set<string>();
    const tempMark = new Set<string>();

    function dfs(node: string): boolean {
      if (tempMark.has(node)) return false;
      if (visited.has(node)) return true;
      tempMark.add(node);
      for (const next of adjList[node] || []) {
        if (!dfs(next)) return false;
      }
      tempMark.delete(node);
      visited.add(node);
      topoOrder.unshift(node);
      return true;
    }

    for (const id of knowledgePoints.map((k) => k.id)) {
      if (!visited.has(id)) {
        if (!dfs(id)) break;
      }
    }

    const weakIds = knowledgePoints
      .filter((kp) => {
        const s = scores[kp.id];
        return s !== undefined && s < 60 && !reviewedIds.includes(kp.id);
      })
      .sort((a, b) => {
        const sa = scores[a.id] ?? 100;
        const sb = scores[b.id] ?? 100;
        if (sa !== sb) return sa - sb;
        return 0;
      })
      .map((k) => k.id);

    if (weakIds.length === 0) {
      const unpick = knowledgePoints
        .filter((k) => !reviewedIds.includes(k.id))
        .map((k) => k.id);
      return topoOrder.filter((id) => unpick.includes(id)).slice(0, maxNodes);
    }

    const startId = weakIds[0];
    const startIdx = Math.max(0, topoOrder.indexOf(startId));

    const result: string[] = [];
    const used = new Set<string>();

    for (let i = startIdx; i < topoOrder.length && result.length < maxNodes; i++) {
      const id = topoOrder[i];
      if (!used.has(id) && !reviewedIds.includes(id)) {
        result.push(id);
        used.add(id);
      }
    }

    let j = startIdx - 1;
    while (result.length < maxNodes && j >= 0) {
      const id = topoOrder[j];
      if (!used.has(id) && !reviewedIds.includes(id)) {
        result.unshift(id);
        used.add(id);
      }
      j--;
    }

    if (result.length < maxNodes) {
      for (const id of topoOrder) {
        if (result.length >= maxNodes) break;
        if (!used.has(id) && !reviewedIds.includes(id)) {
          result.push(id);
          used.add(id);
        }
      }
    }

    const weakSet = new Set(weakIds);
    const reordered: string[] = [];
    const reUsed = new Set<string>();

    const first = result.find((id) => weakSet.has(id));
    if (first) {
      const fi = result.indexOf(first);
      for (let k = fi; k < result.length; k++) {
        if (!reUsed.has(result[k])) {
          reordered.push(result[k]);
          reUsed.add(result[k]);
        }
      }
      for (let k = 0; k < fi; k++) {
        if (!reUsed.has(result[k])) {
          reordered.push(result[k]);
          reUsed.add(result[k]);
        }
      }
    } else {
      reordered.push(...result);
    }

    return reordered.slice(0, maxNodes);
  }, [knowledgePoints, relations, scores, reviewedIds, maxNodes]);
}

export default useRecommendPath;
