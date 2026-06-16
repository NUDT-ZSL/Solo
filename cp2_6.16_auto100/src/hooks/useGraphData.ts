import { useEffect, useCallback } from 'react'
import { useGraphStore } from '@/store/graphStore'
import type { Card, GraphData, LearningProgress, AnswerResult } from '@/lib/types'

export function useGraphData() {
  const {
    setNodes,
    setEdges,
    setCardDetail,
    setProgress,
    selectedNodeId,
  } = useGraphStore()

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/graph')
      const data: GraphData = await res.json()
      const nodesWithPositions = data.nodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / data.nodes.length
        const radius = 250
        return {
          ...node,
          x: 400 + radius * Math.cos(angle) + (Math.random() - 0.5) * 100,
          y: 350 + radius * Math.sin(angle) + (Math.random() - 0.5) * 100,
        }
      })
      setNodes(nodesWithPositions)
      setEdges(data.edges)
    } catch (err) {
      console.error('Failed to fetch graph:', err)
    }
  }, [setNodes, setEdges])

  const fetchCard = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/card/${id}`)
      const card: Card = await res.json()
      setCardDetail(card)
    } catch (err) {
      console.error('Failed to fetch card:', err)
    }
  }, [setCardDetail])

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/progress')
      const progress: LearningProgress = await res.json()
      setProgress(progress)
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    }
  }, [setProgress])

  const submitAnswer = useCallback(async (cardId: string, answer: string): Promise<AnswerResult | null> => {
    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, answer }),
      })
      const result: AnswerResult = await res.json()
      fetchProgress()
      return result
    } catch (err) {
      console.error('Failed to submit answer:', err)
      return null
    }
  }, [fetchProgress])

  useEffect(() => {
    fetchGraph()
    fetchProgress()
  }, [fetchGraph, fetchProgress])

  useEffect(() => {
    if (selectedNodeId) {
      fetchCard(selectedNodeId)
    } else {
      setCardDetail(null)
    }
  }, [selectedNodeId, fetchCard, setCardDetail])

  return { fetchGraph, fetchCard, fetchProgress, submitAnswer }
}
