import { useMemo } from 'react'
import type { KnowledgePoint, Relation } from '../types'

export function useRecommendPath(
  points: KnowledgePoint[],
  relations: Relation[],
  scores: Record<string, number>,
  reviewedIds: string[],
  trigger: number
): string[] {
  return useMemo(() => {
    if (trigger === 0 || points.length === 0) return []

    const pointIds = new Set(points.map(p => p.id))
    const validRelations = relations.filter(
      r => pointIds.has(r.sourceId) && pointIds.has(r.targetId)
    )

    const weakPoints = points
      .filter(p => {
        const s = scores[p.id]
        return s !== undefined && s < 60 && !reviewedIds.includes(p.id)
      })
      .sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0))

    const adj: Record<string, string[]> = {}
    points.forEach(p => (adj[p.id] = []))
    validRelations.forEach(r => {
      if (adj[r.sourceId]) adj[r.sourceId].push(r.targetId)
    })

    const prereqMap: Record<string, string[]> = {}
    points.forEach(p => (prereqMap[p.id] = []))
    validRelations.forEach(r => {
      prereqMap[r.targetId].push(r.sourceId)
    })

    function topologicalSort(): string[] {
      const visited = new Set<string>()
      const temp = new Set<string>()
      const result: string[] = []

      function dfs(nodeId: string): boolean {
        if (temp.has(nodeId)) return false
        if (visited.has(nodeId)) return true
        temp.add(nodeId)
        for (const next of adj[nodeId] || []) {
          if (!dfs(next)) return false
        }
        temp.delete(nodeId)
        visited.add(nodeId)
        result.unshift(nodeId)
        return true
      }

      for (const p of points) {
        if (!visited.has(p.id)) dfs(p.id)
      }
      return result
    }

    if (weakPoints.length === 0) {
      return topologicalSort()
        .filter(id => !reviewedIds.includes(id))
        .slice(0, 5)
    }

    const startPoint = weakPoints[0]
    const visited = new Set<string>()
    const path: string[] = []

    function collectPrereqs(pointId: string): void {
      if (visited.has(pointId) || path.length >= 5) return
      const prereqs = prereqMap[pointId] || []
      const weakPrereqs = prereqs
        .filter(pid => {
          const s = scores[pid]
          return s !== undefined && s < 60 && !reviewedIds.includes(pid)
        })
        .sort((a, b) => (scores[a] || 0) - (scores[b] || 0))

      for (const pid of weakPrereqs) {
        if (path.length >= 5) break
        collectPrereqs(pid)
      }

      if (path.length < 5 && !visited.has(pointId) && !reviewedIds.includes(pointId)) {
        visited.add(pointId)
        path.push(pointId)
      }
    }

    collectPrereqs(startPoint.id)

    if (path.length < 5) {
      const topo = topologicalSort()
      for (const id of topo) {
        if (path.length >= 5) break
        if (!path.includes(id) && !reviewedIds.includes(id)) {
          path.push(id)
        }
      }
    }

    return path.slice(0, 5)
  }, [points, relations, scores, reviewedIds, trigger])
}
