import { useMemo } from 'react'
import type { KnowledgePoint, Relation, AssessmentRecord } from '../types'

interface UseRecommendPathParams {
  knowledgePoints: KnowledgePoint[]
  relations: Relation[]
  assessments: Record<string, AssessmentRecord>
  trigger?: number
}

export function useRecommendPath({
  knowledgePoints,
  relations,
  assessments,
  trigger = 0
}: UseRecommendPathParams): string[] {
  return useMemo(() => {
    if (knowledgePoints.length === 0 || trigger === 0) return []

    const adjList: Record<string, string[]> = {}
    knowledgePoints.forEach(kp => {
      adjList[kp.id] = []
    })
    relations.forEach(r => {
      if (adjList[r.from]) {
        adjList[r.from].push(r.to)
      }
    })

    const weakPoints = knowledgePoints
      .filter(kp => {
        const score = assessments[kp.id]?.score ?? 0
        return score < 60
      })
      .sort((a, b) => (assessments[a.id]?.score ?? 0) - (assessments[b.id]?.score ?? 0))

    function dfsTopo(nodeId: string, visited: Set<string>, path: string[]): void {
      if (visited.has(nodeId) || path.length >= 5) return
      visited.add(nodeId)
      path.push(nodeId)

      for (const next of adjList[nodeId] || []) {
        if (!visited.has(next) && path.length < 5) {
          dfsTopo(next, visited, path)
        }
      }
    }

    const result: string[] = []
    const visited = new Set<string>()

    for (const wp of weakPoints) {
      if (result.length >= 5) break

      const prerequisites: string[] = []
      const seen = new Set<string>()

      function findPrereqs(nodeId: string): void {
        if (seen.has(nodeId)) return
        seen.add(nodeId)
        for (const r of relations) {
          if (r.to === nodeId && !seen.has(r.from)) {
            findPrereqs(r.from)
            prerequisites.push(r.from)
          }
        }
      }
      findPrereqs(wp.id)

      for (const pre of prerequisites) {
        if (result.length >= 5) break
        if (!visited.has(pre) && (assessments[pre]?.score ?? 0) < 60) {
          dfsTopo(pre, visited, result)
        }
      }

      if (result.length < 5 && !visited.has(wp.id)) {
        dfsTopo(wp.id, visited, result)
      }
    }

    return result.slice(0, 5)
  }, [knowledgePoints, relations, assessments, trigger])
}
