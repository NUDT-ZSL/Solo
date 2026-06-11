export interface SankeyNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
  sourceLinks?: SankeyLink[];
  targetLinks?: SankeyLink[];
}

export interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
  index?: number;
  sy?: number;
  ty?: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface SelectionState {
  type: 'node' | 'link' | null;
  data: SankeyNode | SankeyLink | null;
}

export interface FilterState {
  filteredLinks: number[];
  filteredNodeIds: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface NodeStats {
  id: string;
  label: string;
  totalIn: number;
  totalOut: number;
  upstreamNodes: { id: string; label: string; value: number }[];
  downstreamNodes: { id: string; label: string; value: number }[];
}
