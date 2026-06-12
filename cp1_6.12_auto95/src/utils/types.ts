export interface NodeData {
  id: string;
  label: string;
  children: NodeData[];
  isTriggered?: boolean;
  triggerCount?: number;
  status?: 'triggered' | 'partial' | 'untriggered';
  depth?: number;
  parentId?: string | null;
  expanded?: boolean;
  x?: number;
  y?: number;
}

export interface DecisionNode {
  id: string;
  name: string;
  depth: number;
  parentId?: string | null;
}

export type DecisionChain = DecisionNode[];

export type NodeStatus = 'triggered' | 'partial' | 'untriggered';

export interface TreeNode extends NodeData {
  children: TreeNode[];
  expanded?: boolean;
}

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
  decisionChain: DecisionChain;
  timestamp: number;
}

export interface CoverageStats {
  totalBranches: number;
  triggeredBranches: number;
  untriggeredBranches: number;
  coveragePercent: number;
}

export interface SimulateResponse extends CoverageStats {
  nodes: NodeResult[];
  edges: EdgeResult[];
}

export interface ReplayRecord {
  id: string;
  timestamp: number;
  decisionChain: DecisionChain;
  summary: string;
  result: SimulateResponse;
}
