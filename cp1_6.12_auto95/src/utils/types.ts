export interface DecisionNode {
  id: string;
  name: string;
  depth: number;
  parentId?: string | null;
  x?: number;
  y?: number;
}

export interface TreeNode extends DecisionNode {
  children: TreeNode[];
  expanded?: boolean;
}

export type NodeStatus = 'triggered' | 'partial' | 'untriggered';

export interface NodeResult {
  id: string;
  name: string;
  status: NodeStatus;
  triggerCount: number;
  path: string[];
}

export interface EdgeResult {
  source: string;
  target: string;
  triggered: boolean;
}

export interface SimulateRequest {
  decisionChain: DecisionNode[];
  timestamp: number;
}

export interface SimulateResponse {
  nodes: NodeResult[];
  totalBranches: number;
  triggeredBranches: number;
  untriggeredBranches: number;
  coveragePercent: number;
  edges: EdgeResult[];
}

export interface ReplayRecord {
  id: string;
  timestamp: number;
  decisionChain: DecisionNode[];
  summary: string;
  result: SimulateResponse;
}
