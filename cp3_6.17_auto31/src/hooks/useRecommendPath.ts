import { useMemo } from 'react';
import type { KnowledgePoint, Relation, AssessmentScore, ReviewedNode } from '../types';

interface UseRecommendPathParams {
  knowledgePoints: KnowledgePoint[];
  relations: Relation[];
  scores: AssessmentScore[];
  reviewedNodes: ReviewedNode[];
  maxNodes?: number;
}

export function useRecommendPath({
  knowledgePoints,
  relations,
  scores,
  reviewedNodes,
  maxNodes = 5,
}: UseRecommendPathParams): string[] {
  return useMemo(() => {
    if (knowledgePoints.length === 0) return [];

    const scoreMap = new Map<string, number>();
    scores.forEach(s => scoreMap.set(s.knowledgePointId, s.score));

    const reviewedIds = new Set(reviewedNodes.map(r => r.knowledgePointId));

    const weakPoints = knowledgePoints.filter(kp => {
      const score = scoreMap.get(kp.id) ?? 0;
      return score < 60 && !reviewedIds.has(kp.id);
    });

    if (weakPoints.length === 0) return [];

    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    knowledgePoints.forEach(kp => {
      adjList.set(kp.id, []);
      inDegree.set(kp.id, 0);
    });
    relations.forEach(r => {
      adjList.get(r.sourceId)?.push(r.targetId);
      inDegree.set(r.targetId, (inDegree.get(r.targetId) ?? 0) + 1);
    });

    const reverseAdj = new Map<string, string[]>();
    knowledgePoints.forEach(kp => reverseAdj.set(kp.id, []));
    relations.forEach(r => reverseAdj.get(r.targetId)?.push(r.sourceId));

    const sorted = weakPoints.slice().sort((a, b) => {
      const sa = scoreMap.get(a.id) ?? 0;
      const sb = scoreMap.get(b.id) ?? 0;
      return sa - sb;
    });

    const visited = new Set<string>();
    const result: string[] = [];

    function collectPrerequisites(kpId: string): string[] {
      const prereqs: string[] = [];
      const stack = [...(reverseAdj.get(kpId) ?? [])];
      const localVisited = new Set<string>();
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (localVisited.has(curr) || visited.has(curr)) continue;
        localVisited.add(curr);
        prereqs.push(curr);
        for (const p of reverseAdj.get(curr) ?? []) {
          if (!localVisited.has(p) && !visited.has(p)) {
            stack.push(p);
          }
        }
      }
      return prereqs.reverse();
    }

    for (const wp of sorted) {
      if (visited.has(wp.id)) continue;
      const prereqs = collectPrerequisites(wp.id);
      const prereqsFiltered = prereqs.filter(p => {
        if (visited.has(p)) return false;
        const s = scoreMap.get(p) ?? 100;
        return s < 60 || !reviewedIds.has(p);
      });
      for (const p of prereqsFiltered) {
        if (result.length >= maxNodes) break;
        if (!visited.has(p)) {
          result.push(p);
          visited.add(p);
        }
      }
      if (result.length >= maxNodes) break;
      if (!visited.has(wp.id)) {
        result.push(wp.id);
        visited.add(wp.id);
      }
      if (result.length >= maxNodes) break;
    }

    const kpIdSet = new Set(knowledgePoints.map(kp => kp.id));
    const inTopo = new Set<string>();
    const ordered: string[] = [];
    const tempInDeg = new Map(inDegree);
    const queue: string[] = [];
    const resultSet = new Set(result);
    for (const id of result) {
      if ((tempInDeg.get(id) ?? 0) === 0) queue.push(id);
    }
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (inTopo.has(curr) || !resultSet.has(curr)) continue;
      ordered.push(curr);
      inTopo.add(curr);
      for (const neighbor of adjList.get(curr) ?? []) {
        if (!resultSet.has(neighbor)) continue;
        tempInDeg.set(neighbor, (tempInDeg.get(neighbor) ?? 1) - 1);
        if (tempInDeg.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    for (const id of result) {
      if (!inTopo.has(id)) ordered.push(id);
    }

    return ordered.slice(0, maxNodes).filter(id => kpIdSet.has(id));
  }, [knowledgePoints, relations, scores, reviewedNodes, maxNodes]);
}
