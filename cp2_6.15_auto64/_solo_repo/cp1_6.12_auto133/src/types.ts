export interface GraphNode {
  id: string;
  label: string;
  type: 'function' | 'variable' | 'module';
  line: number;
  inDegree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'call' | 'dependency' | 'import';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type Language = 'javascript' | 'python' | 'html';

export interface SnippetData {
  code: string;
  language: Language;
  graphData: GraphData;
  createdAt: string;
}

export interface HistoryEntry {
  code: string;
  language: Language;
  graphData: GraphData;
  timestamp: number;
}

export interface SaveRequest {
  code: string;
  language: Language;
  graphData: GraphData;
}

export interface SaveResponse {
  success: boolean;
  code: string;
}

export interface SnippetResponse {
  success: boolean;
  data: SnippetData | null;
}
