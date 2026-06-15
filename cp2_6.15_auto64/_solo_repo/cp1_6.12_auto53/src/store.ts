import { create } from 'zustand'

export interface FunctionNode {
  id: string
  name: string
  startLine: number
  endLine: number
  statementCount: number
  complexity: 'low' | 'medium' | 'high'
  isEntryPoint: boolean
  isRecursive: boolean
}

export interface CallEdge {
  from: string
  to: string
  isRecursive: boolean
}

interface AppState {
  sourceCode: string
  sourceLines: string[]
  nodes: FunctionNode[]
  edges: CallEdge[]
  selectedNodeId: string | null
  filterEntryPoint: boolean
  filterRecursive: boolean
  splitPosition: number
  fileName: string

  setSourceData: (code: string, lines: string[], fileName: string) => void
  setParseResult: (nodes: FunctionNode[], edges: CallEdge[]) => void
  setSelectedNode: (nodeId: string | null) => void
  toggleFilterEntryPoint: () => void
  toggleFilterRecursive: () => void
  setSplitPosition: (pos: number) => void
}

export const useStore = create<AppState>((set) => ({
  sourceCode: '',
  sourceLines: [],
  nodes: [],
  edges: [],
  selectedNodeId: null,
  filterEntryPoint: false,
  filterRecursive: false,
  splitPosition: 50,
  fileName: '',

  setSourceData: (code, lines, fileName) =>
    set({ sourceCode: code, sourceLines: lines, fileName }),

  setParseResult: (nodes, edges) => set({ nodes, edges }),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  toggleFilterEntryPoint: () =>
    set((s) => ({ filterEntryPoint: !s.filterEntryPoint })),

  toggleFilterRecursive: () =>
    set((s) => ({ filterRecursive: !s.filterRecursive })),

  setSplitPosition: (pos) => set({ splitPosition: pos }),
}))
