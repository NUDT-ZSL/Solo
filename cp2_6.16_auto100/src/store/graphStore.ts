import { create } from 'zustand'
import type { Card, GraphNode, Connection, AnswerResult, LearningProgress } from '@/lib/types'

interface GraphState {
  nodes: GraphNode[]
  edges: Connection[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  searchQuery: string
  cardDetail: Card | null
  quizMode: boolean
  answerResult: AnswerResult | null
  progress: LearningProgress
  isPanelOpen: boolean
  isMobile: boolean

  setNodes: (nodes: GraphNode[]) => void
  setEdges: (edges: Connection[]) => void
  setSelectedNodeId: (id: string | null) => void
  setHoveredNodeId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setCardDetail: (card: Card | null) => void
  setQuizMode: (mode: boolean) => void
  setAnswerResult: (result: AnswerResult | null) => void
  setProgress: (progress: LearningProgress) => void
  setIsPanelOpen: (open: boolean) => void
  setIsMobile: (mobile: boolean) => void
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  cardDetail: null,
  quizMode: false,
  answerResult: null,
  progress: { totalCards: 0, learnedCards: 0, correctRate: 0 },
  isPanelOpen: false,
  isMobile: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, isPanelOpen: id !== null, quizMode: false, answerResult: null }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCardDetail: (card) => set({ cardDetail: card }),
  setQuizMode: (mode) => set({ quizMode: mode, answerResult: null }),
  setAnswerResult: (result) => set({ answerResult: result }),
  setProgress: (progress) => set({ progress }),
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}))
