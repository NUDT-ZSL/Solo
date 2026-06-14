export type NodeType = 'dialogue' | 'choice' | 'condition' | 'jump' | 'end';

export interface DialogueNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  text: string;
  characterName: string;
  condition: string;
  optionTexts: string[];
  jumpTargetId: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  fromPort: number;
}

export interface SimulationState {
  currentNodeId: string | null;
  visitedNodeIds: string[];
  visitedConnectionIds: string[];
  isRunning: boolean;
}

export interface ExportData {
  nodes: DialogueNode[];
  connections: Connection[];
}

export const NODE_DEFS: { type: NodeType; label: string; icon: string }[] = [
  { type: 'dialogue', label: '对话节点', icon: '💬' },
  { type: 'choice', label: '选项节点', icon: '🔀' },
  { type: 'condition', label: '条件分支', icon: '⚙️' },
  { type: 'jump', label: '跳转节点', icon: '↪️' },
  { type: 'end', label: '结束节点', icon: '⏹️' },
];

export function getNodePortCount(type: NodeType): number {
  switch (type) {
    case 'dialogue': return 1;
    case 'choice': return 4;
    case 'condition': return 2;
    case 'jump': return 1;
    case 'end': return 0;
  }
}

export function generateId(): string {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}
