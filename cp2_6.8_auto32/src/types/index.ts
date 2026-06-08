export type NodeType = 'function' | 'variable' | 'branch' | 'loop' | 'call';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  startLine: number;
  endLine: number;
  snippet: string;
  depth?: number;
  complexity?: number;
  parentId?: string;
}

export type LinkType = 'call' | 'data' | 'control';

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
}

export type SuggestionType = 'deep-nesting' | 'long-function' | 'duplicate-call';

export interface RefactorSuggestion {
  id: string;
  type: SuggestionType;
  severity: 'warning' | 'error' | 'info';
  message: string;
  startLine: number;
  endLine: number;
  snippet: string;
}

export interface ParseResult {
  nodes: GraphNode[];
  links: GraphLink[];
  suggestions: RefactorSuggestion[];
  error?: string;
}
